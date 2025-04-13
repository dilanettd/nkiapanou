import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { LocalStorageService } from 'ngx-webstorage';
import { handleHttpError } from '../errors';
import { ICartItem, Cart } from '../../models2/order.model';
import { ProductService } from '../product/product.service';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private http = inject(HttpClient);
  private storage = inject(LocalStorageService);
  private productService = inject(ProductService);

  private apiUrl = environment.API_URL;
  private storageKey = 'user_cart';

  // BehaviorSubject to track cart changes
  private cartItemsSubject = new BehaviorSubject<ICartItem[]>([]);

  // BehaviorSubject to track cart subtotal
  private cartSubtotalSubject = new BehaviorSubject<number>(0);

  // BehaviorSubject pour suivre les opérations de synchronisation
  private syncInProgressSubject = new BehaviorSubject<boolean>(false);

  // Observables that components can subscribe to
  public cartItems$ = this.cartItemsSubject.asObservable();
  public cartSubtotal$ = this.cartSubtotalSubject.asObservable();
  public syncInProgress$ = this.syncInProgressSubject.asObservable();

  constructor() {
    this.loadCartFromStorage();
  }

  /**
   * Loads the cart from local storage
   */
  private loadCartFromStorage(): void {
    const storedCart = this.storage.retrieve(this.storageKey);
    if (storedCart) {
      this.cartItemsSubject.next(storedCart);
      this.calculateCartSubtotal();
    }
  }

  /**
   * Checks if the user is authenticated
   */
  private isUserAuthenticated(): boolean {
    return !!this.storage.retrieve('authToken');
  }

  /**
   * Gets the cart from the server or local storage
   */
  getCart(): Observable<ICartItem[]> {
    const currentCart = this.cartItemsSubject.getValue();

    if (!this.isUserAuthenticated()) {
      return of(currentCart);
    }
    return this.http
      .get<{
        status: string;
        data: { cart: Cart; cart_items: ICartItem[]; subtotal: number };
      }>(`${this.apiUrl}/cart`)
      .pipe(
        map((response) => {
          if (response.status === 'success' && response.data.cart_items) {
            const cartItems = response.data.cart_items;
            this.cartItemsSubject.next(cartItems);
            this.storage.store(this.storageKey, cartItems);
            this.cartSubtotalSubject.next(response.data.subtotal || 0);
            return cartItems;
          }
          return currentCart;
        }),
        catchError((error) => {
          // En cas d'erreur, on ne perturbe pas l'expérience utilisateur, on utilise les données locales
          console.error('Error fetching cart from server:', error);
          return of(currentCart);
        })
      );
  }

  /**
   * Adds a product to the cart
   */
  addToCart(productId: number, quantity: number = 1): Observable<ICartItem[]> {
    const currentCart = this.cartItemsSubject.getValue();
    const existingItem = currentCart.find(
      (item) => item.product_id === productId
    );

    if (existingItem) {
      return this.updateCartItemQuantity(
        existingItem.id,
        existingItem.quantity + quantity
      );
    }

    // Toujours récupérer les détails du produit pour avoir un panier complet en local
    return this.productService.getProductById(productId).pipe(
      map((product) => {
        if (!product) {
          throw new Error('Product not found');
        }

        const newItem: ICartItem = {
          id: Math.floor(Math.random() * 1000000), // Generate temp ID
          cart_id: 0,
          product_id: productId,
          quantity: quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          product: product,
        };

        const updatedCart = [...currentCart, newItem];
        this.cartItemsSubject.next(updatedCart);
        this.storage.store(this.storageKey, updatedCart);
        this.calculateCartSubtotal();

        // Si l'utilisateur est authentifié, on synchronise également avec le serveur
        if (this.isUserAuthenticated()) {
          this.sendAddToCartRequest(productId, quantity).subscribe(
            (serverItem) => {
              // Mettre à jour l'ID local avec l'ID du serveur pour les futures opérations
              if (serverItem) {
                const cartItems = this.cartItemsSubject.getValue();
                const itemIndex = cartItems.findIndex(
                  (item) =>
                    item.product_id === productId && item.id === newItem.id
                );

                if (itemIndex !== -1) {
                  cartItems[itemIndex].id = serverItem.id;
                  cartItems[itemIndex].cart_id = serverItem.cart_id;
                  this.cartItemsSubject.next([...cartItems]);
                  this.storage.store(this.storageKey, cartItems);
                }
              }
            },
            (error) => {
              console.error('Error syncing cart with server:', error);
              // On garde quand même l'article en local
            }
          );
        }

        return updatedCart;
      }),
      catchError((error) => {
        console.error('Error adding product to cart:', error);
        return of(currentCart);
      })
    );
  }

  /**
   * Send add to cart request to server
   * Private helper method that doesn't affect the local cart
   */
  private sendAddToCartRequest(
    productId: number,
    quantity: number
  ): Observable<ICartItem | null> {
    return this.http
      .post<{ status: string; message: string; data: ICartItem }>(
        `${this.apiUrl}/cart`,
        {
          product_id: productId,
          quantity: quantity,
        }
      )
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            return response.data;
          }
          return null;
        }),
        catchError((error) => {
          console.error('Server error when adding to cart:', error);
          return of(null);
        })
      );
  }

  /**
   * Updates the quantity of a cart item
   */
  updateCartItemQuantity(
    itemId: number,
    quantity: number
  ): Observable<ICartItem[]> {
    const currentCart = this.cartItemsSubject.getValue();
    const itemIndex = currentCart.findIndex((item) => item.id === itemId);

    if (itemIndex === -1) {
      return of(currentCart);
    }

    // If quantity is 0 or less, remove the item
    if (quantity <= 0) {
      return this.removeFromCart(itemId);
    }

    // Toujours mettre à jour le panier local pour une interface réactive
    const updatedCart = [...currentCart];
    updatedCart[itemIndex] = {
      ...updatedCart[itemIndex],
      quantity: quantity,
      updated_at: new Date().toISOString(),
    };

    this.cartItemsSubject.next(updatedCart);
    this.storage.store(this.storageKey, updatedCart);
    this.calculateCartSubtotal();

    // Si l'utilisateur est authentifié, synchroniser avec le serveur
    if (this.isUserAuthenticated()) {
      this.http
        .put<{ status: string; message: string; data: ICartItem }>(
          `${this.apiUrl}/cart/${itemId}`,
          {
            quantity: quantity,
          }
        )
        .pipe(
          catchError((error) => {
            console.error('Error updating cart item on server:', error);
            return throwError(error);
          })
        )
        .subscribe(
          (response) => {
            if (response.status === 'success') {
              // Mettre à jour avec les données du serveur si nécessaire
              const cartItems = this.cartItemsSubject.getValue();
              const itemIndex = cartItems.findIndex(
                (item) => item.id === itemId
              );

              if (itemIndex !== -1) {
                cartItems[itemIndex] = response.data;
                this.cartItemsSubject.next([...cartItems]);
                this.storage.store(this.storageKey, cartItems);
                this.calculateCartSubtotal();
              }
            }
          },
          (error) => {
            // En cas d'erreur, on garde les changements locaux
            console.error('Failed to update cart on server:', error);
          }
        );
    }

    return of(updatedCart);
  }

  /**
   * Removes an item from the cart
   */
  removeFromCart(itemId: number): Observable<ICartItem[]> {
    const currentCart = this.cartItemsSubject.getValue();

    // Toujours mettre à jour le panier local immédiatement
    const updatedCart = currentCart.filter((item) => item.id !== itemId);
    this.cartItemsSubject.next(updatedCart);
    this.storage.store(this.storageKey, updatedCart);
    this.calculateCartSubtotal();

    // Si l'utilisateur est authentifié, synchroniser avec le serveur
    if (this.isUserAuthenticated()) {
      this.http
        .delete<{ status: string; message: string }>(
          `${this.apiUrl}/cart/remove/${itemId}`
        )
        .pipe(
          catchError((error) => {
            console.error('Error removing cart item on server:', error);
            return throwError(error);
          })
        )
        .subscribe(
          () => {
            // La mise à jour locale a déjà été effectuée
          },
          (error) => {
            // En cas d'erreur, on ne revient pas en arrière, on garde l'état local
            console.error('Failed to remove cart item on server:', error);
          }
        );
    }

    return of(updatedCart);
  }

  /**
   * Clears the entire cart
   */
  clearCart(): Observable<ICartItem[]> {
    // Toujours vider le panier local immédiatement
    this.cartItemsSubject.next([]);
    this.storage.store(this.storageKey, []);
    this.cartSubtotalSubject.next(0);

    // Si l'utilisateur est authentifié, synchroniser avec le serveur
    if (this.isUserAuthenticated()) {
      this.http
        .delete<{ status: string; message: string }>(
          `${this.apiUrl}/cart/clear`
        )
        .pipe(
          catchError((error) => {
            console.error('Error clearing cart on server:', error);
            return throwError(error);
          })
        )
        .subscribe(
          () => {
            // La mise à jour locale a déjà été effectuée
          },
          (error) => {
            // En cas d'erreur, on ne revient pas en arrière
            console.error('Failed to clear cart on server:', error);
          }
        );
    }

    return of([]);
  }

  /**
   * Synchronizes the local cart with the server
   * Called after login to merge local cart with server cart
   */
  syncCartWithServer(): Observable<ICartItem[]> {
    if (!this.isUserAuthenticated()) {
      return of(this.cartItemsSubject.getValue());
    }

    this.syncInProgressSubject.next(true);

    const localCart = this.cartItemsSubject.getValue();

    // Si le panier local est vide, récupérer simplement le panier du serveur
    if (localCart.length === 0) {
      return this.http
        .get<{
          status: string;
          data: { cart: Cart; cart_items: ICartItem[]; subtotal: number };
        }>(`${this.apiUrl}/cart`)
        .pipe(
          map((response) => {
            if (response.status === 'success' && response.data.cart_items) {
              const cartItems = response.data.cart_items;
              this.cartItemsSubject.next(cartItems);
              this.storage.store(this.storageKey, cartItems);
              this.cartSubtotalSubject.next(response.data.subtotal || 0);
              return cartItems;
            }
            return [];
          }),
          catchError((error) => {
            console.error(
              'Error fetching cart from server during sync:',
              error
            );
            return of(localCart);
          }),
          finalize(() => {
            this.syncInProgressSubject.next(false);
          })
        );
    }

    // Si nous avons des éléments locaux, nous devons gérer la fusion après la connexion
    // D'abord, récupérer le panier existant du serveur
    return this.http
      .get<{
        status: string;
        data: { cart: Cart; cart_items: ICartItem[]; subtotal: number };
      }>(`${this.apiUrl}/cart`)
      .pipe(
        map((response) => {
          if (response.status === 'success' && response.data.cart_items) {
            // Fusionner avec le panier local
            this.mergeCartsAndSync(localCart, response.data.cart_items);
            return this.cartItemsSubject.getValue();
          }
          return localCart;
        }),
        catchError((error) => {
          console.error('Error during cart synchronization:', error);
          return of(localCart);
        }),
        finalize(() => {
          this.syncInProgressSubject.next(false);
        })
      );
  }

  /**
   * Merge local cart with server cart and sync with server
   */
  private mergeCartsAndSync(
    localCart: ICartItem[],
    serverCart: ICartItem[]
  ): void {
    // 1. Identifier les articles locaux absents du serveur ou avec des quantités différentes
    const itemsToSync = localCart.filter((localItem) => {
      const serverItem = serverCart.find(
        (item) => item.product_id === localItem.product_id
      );
      return !serverItem || serverItem.quantity !== localItem.quantity;
    });

    // 2. Créer un panier fusionné
    const mergedCart: ICartItem[] = [...serverCart];

    // 3. Synchroniser chaque élément local avec le serveur
    itemsToSync.forEach((localItem) => {
      const serverItemIndex = mergedCart.findIndex(
        (item) => item.product_id === localItem.product_id
      );

      if (serverItemIndex === -1) {
        // L'article n'existe pas sur le serveur, l'ajouter
        this.sendAddToCartRequest(
          localItem.product_id,
          localItem.quantity
        ).subscribe((newItem) => {
          if (newItem) {
            mergedCart.push(newItem);
            this.updateLocalCart(mergedCart);
          }
        });
      } else {
        // L'article existe mais avec une quantité différente, le mettre à jour
        const newQuantity = Math.max(
          localItem.quantity,
          mergedCart[serverItemIndex].quantity
        );
        this.http
          .put<{ status: string; data: ICartItem }>(
            `${this.apiUrl}/cart/${mergedCart[serverItemIndex].id}`,
            { quantity: newQuantity }
          )
          .subscribe(
            (response) => {
              if (response.status === 'success') {
                mergedCart[serverItemIndex] = response.data;
                this.updateLocalCart(mergedCart);
              }
            },
            (error) =>
              console.error('Error updating cart item during sync:', error)
          );
      }
    });

    // 4. Mettre à jour immédiatement le panier local avec les articles du serveur
    this.updateLocalCart(mergedCart);
  }

  /**
   * Update local cart state and storage
   */
  private updateLocalCart(cartItems: ICartItem[]): void {
    this.cartItemsSubject.next([...cartItems]);
    this.storage.store(this.storageKey, cartItems);
    this.calculateCartSubtotal();
  }

  /**
   * Gets the total number of items in cart
   */
  getCartItemCount(): Observable<number> {
    return this.cartItems$.pipe(
      map((items) => items.reduce((total, item) => total + item.quantity, 0))
    );
  }

  /**
   * Gets the cart subtotal
   */
  getCartTotal(): Observable<number> {
    return this.cartSubtotal$;
  }

  /**
   * Calculates and updates the cart subtotal based on current items
   * @private
   */
  private calculateCartSubtotal(): void {
    const items = this.cartItemsSubject.getValue();
    let subtotal = 0;

    items.forEach((item) => {
      if (item.product) {
        const price = item.product.discount_price || item.product.price;
        subtotal += price * item.quantity;
      }
    });

    this.cartSubtotalSubject.next(subtotal);
  }
}
