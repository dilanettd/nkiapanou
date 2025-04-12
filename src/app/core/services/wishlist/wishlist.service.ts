import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from 'ngx-webstorage';
import {
  Observable,
  BehaviorSubject,
  of,
  throwError,
  firstValueFrom,
} from 'rxjs';
import {
  catchError,
  tap,
  map,
  shareReplay,
  finalize,
  take,
  switchMap,
} from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { IProduct } from '../../models2/product.model';
import { IUser, IWishlistItem } from '../../models2/user.model';
import { handleHttpError } from '../errors';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private http = inject(HttpClient);
  private storage = inject(LocalStorageService);

  private storageKey = 'user_wishlist';
  private apiUrl = environment.API_URL;

  // BehaviorSubject pour suivre les changements de la wishlist
  private wishlistSubject = new BehaviorSubject<IProduct[]>([]);

  // BehaviorSubject pour suivre la synchronisation
  private syncInProgressSubject = new BehaviorSubject<boolean>(false);

  // Observable que les composants peuvent souscrire
  public wishlist$ = this.wishlistSubject.asObservable();
  public syncInProgress$ = this.syncInProgressSubject.asObservable();

  // Cache pour les opérations isInWishlist
  private wishlistCheckCache = new Map<number, Observable<boolean>>();

  constructor() {
    this.loadWishlistFromStorage();
  }

  /**
   * Loads the wishlist from local storage (cache)
   */
  private loadWishlistFromStorage(): void {
    const storedWishlist = this.storage.retrieve(this.storageKey);
    if (storedWishlist) {
      this.wishlistSubject.next(storedWishlist);
    }
  }

  /**
   * Checks if the user is authenticated
   */
  private isUserAuthenticated(): boolean {
    // Check if an authentication token exists
    return !!this.storage.retrieve('authToken');
  }

  /**
   * Gets the wishlist from the server or local storage
   */
  getWishlist(): Observable<IProduct[]> {
    // Always return the local list first for a responsive UI
    const currentWishlist = this.wishlistSubject.getValue();

    // If the user is not authenticated, return the local list
    if (!this.isUserAuthenticated()) {
      return of(currentWishlist);
    }

    // Otherwise, retrieve the list from the server
    return this.http
      .get<{ status: string; data: IWishlistItem[] }>(`${this.apiUrl}/wishlist`)
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            // Extract products from wishlist items
            const products = response.data
              .filter((item) => item.product)
              .map((item) => item.product as IProduct);

            this.wishlistSubject.next(products);
            this.storage.store(this.storageKey, products);
            this.clearCheckCache();
            return products;
          }
          return currentWishlist;
        }),
        catchError((error) => {
          console.error('Error fetching wishlist from server:', error);
          return of(currentWishlist);
        })
      );
  }

  /**
   * Vérifie si un produit est dans la wishlist
   * @returns Observable qui émet true si le produit est dans la wishlist, false sinon
   */
  isInWishlist(productId: number): Observable<boolean> {
    // Check cache first
    if (this.wishlistCheckCache.has(productId)) {
      return this.wishlistCheckCache.get(productId)!;
    }

    // Check in the local list
    const result = this.wishlist$.pipe(
      take(1), // Take only the first value to avoid multiple emissions
      map((products) => products.some((product) => product.id === productId)),
      shareReplay(1)
    );

    this.wishlistCheckCache.set(productId, result);

    // If the user is authenticated, also do a server-side check
    if (this.isUserAuthenticated()) {
      this.http
        .get<{ status: string; in_wishlist: boolean }>(
          `${this.apiUrl}/wishlist/check/${productId}`
        )
        .pipe(
          catchError((error) => {
            console.error('Error checking wishlist item on server:', error);
            return throwError(error);
          })
        )
        .subscribe((response) => {
          // Update the local list if necessary
          const isInLocalWishlist = this.wishlistSubject
            .getValue()
            .some((p) => p.id === productId);

          if (response.in_wishlist && !isInLocalWishlist) {
            // Product is on the server but not locally, add it locally
            this.http
              .get<IProduct>(`${this.apiUrl}/products/${productId}`)
              .subscribe((product) => {
                if (product) {
                  const currentList = this.wishlistSubject.getValue();
                  this.wishlistSubject.next([...currentList, product]);
                  this.storage.store(this.storageKey, [
                    ...currentList,
                    product,
                  ]);
                  this.clearProductFromCache(productId);
                }
              });
          } else if (!response.in_wishlist && isInLocalWishlist) {
            // Product is locally but not on the server, remove it locally
            const currentList = this.wishlistSubject.getValue();
            const updatedList = currentList.filter((p) => p.id !== productId);
            this.wishlistSubject.next(updatedList);
            this.storage.store(this.storageKey, updatedList);
            this.clearProductFromCache(productId);
          }
        });
    }

    return result;
  }

  /**
   * Checks synchronously if a product is in the wishlist
   * @returns Promise that resolves to true if the product is in the wishlist, false otherwise
   */
  async isInWishlistSync(productId: number): Promise<boolean> {
    return firstValueFrom(this.isInWishlist(productId));
  }

  /**
   * Adds a product to the wishlist if it's not already there
   */
  addToWishlist(product: IProduct): Observable<IProduct[]> {
    // First check if the product already exists in the wishlist
    return this.isInWishlist(product.id).pipe(
      take(1),
      switchMap((isInWishlist: boolean) => {
        // If already in the wishlist, simply return the current list
        if (isInWishlist) {
          console.log(
            `Product ${product.id} already in wishlist, skipping add operation`
          );
          return of(this.wishlistSubject.getValue());
        }

        // If not in the wishlist, add it
        // Always update the local list immediately
        const currentList = this.wishlistSubject.getValue();
        const updatedList = [...currentList, product];
        this.wishlistSubject.next(updatedList);
        this.storage.store(this.storageKey, updatedList);
        this.clearProductFromCache(product.id);

        // If the user is authenticated, synchronize with the server
        if (this.isUserAuthenticated()) {
          return this.http
            .post<{ status: string; message: string; data: IWishlistItem }>(
              `${this.apiUrl}/wishlist`,
              { product_id: product.id }
            )
            .pipe(
              map(() => updatedList),
              catchError((error) => {
                console.error('Error adding to wishlist on server:', error);
                return of(updatedList); // Still return the updated list
              })
            );
        }

        return of(updatedList);
      })
    );
  }

  /**
   * Removes a product from the wishlist if it's present
   */
  removeFromWishlist(productId: number): Observable<IProduct[]> {
    // First check if the product exists in the wishlist
    return this.isInWishlist(productId).pipe(
      take(1),
      switchMap((isInWishlist: boolean) => {
        // If not in the wishlist, simply return the current list
        if (!isInWishlist) {
          console.log(
            `Product ${productId} not in wishlist, skipping remove operation`
          );
          return of(this.wishlistSubject.getValue());
        }

        // If in the wishlist, remove it
        // Always update the local list immediately
        const currentList = this.wishlistSubject.getValue();
        const updatedList = currentList.filter(
          (product) => product.id !== productId
        );

        this.wishlistSubject.next(updatedList);
        this.storage.store(this.storageKey, updatedList);
        this.clearProductFromCache(productId);

        // If the user is authenticated, synchronize with the server
        if (this.isUserAuthenticated()) {
          return this.http
            .delete<{ status: string; message: string }>(
              `${this.apiUrl}/wishlist/${productId}`
            )
            .pipe(
              map(() => updatedList),
              catchError((error) => {
                console.error('Error removing from wishlist on server:', error);
                return of(updatedList); // Still return the updated list
              })
            );
        }

        return of(updatedList);
      })
    );
  }

  /**
   * Clears the entire wishlist
   */
  clearWishlist(): Observable<IProduct[]> {
    // Always clear the local list immediately
    this.wishlistSubject.next([]);
    this.storage.store(this.storageKey, []);
    this.clearCheckCache();

    // If the user is authenticated, synchronize with the server
    if (this.isUserAuthenticated()) {
      return this.http
        .delete<{ status: string; message: string }>(`${this.apiUrl}/wishlist`)
        .pipe(
          map(() => []),
          catchError((error) => {
            console.error('Error clearing wishlist on server:', error);
            return of([]); // Still return the empty list
          })
        );
    }

    return of([]);
  }

  /**
   * Synchronizes the local wishlist with the server
   * Useful when a user logs in with items in local storage
   */
  syncWishlistWithServer(): Observable<IProduct[]> {
    // If the user is not authenticated, simply return the local list
    if (!this.isUserAuthenticated()) {
      return of(this.wishlistSubject.getValue());
    }

    this.syncInProgressSubject.next(true);
    this.clearCheckCache();

    const localWishlist = this.wishlistSubject.getValue();

    // If the local list is empty, simply get the list from the server
    if (localWishlist.length === 0) {
      return this.getWishlist().pipe(
        finalize(() => {
          this.syncInProgressSubject.next(false);
        })
      );
    }

    // If we have local items, we need to synchronize them with the server
    return this.http
      .get<{ status: string; data: IWishlistItem[] }>(`${this.apiUrl}/wishlist`)
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            // Extract product IDs from the server
            const serverProductIds = response.data
              .filter((item) => item.product)
              .map((item) => item.product!.id);

            // Synchronize local items with the server
            this.syncLocalWithServer(localWishlist, serverProductIds);

            // Extract complete products for the local list
            const serverProducts = response.data
              .filter((item) => item.product)
              .map((item) => item.product as IProduct);

            // Merge with local products that might not yet be on the server
            const mergedProducts = this.mergeWishlists(
              localWishlist,
              serverProducts
            );

            this.wishlistSubject.next(mergedProducts);
            this.storage.store(this.storageKey, mergedProducts);

            return mergedProducts;
          }
          return localWishlist;
        }),
        catchError((error) => {
          console.error('Error syncing wishlist with server:', error);
          return of(localWishlist);
        }),
        finalize(() => {
          this.syncInProgressSubject.next(false);
        })
      );
  }

  /**
   * Synchronizes local items with the server
   */
  private syncLocalWithServer(
    localProducts: IProduct[],
    serverProductIds: number[]
  ): void {
    // Find products that are local but not on the server
    const productsToAdd = localProducts.filter(
      (product) => !serverProductIds.includes(product.id)
    );

    // Add each missing product to the server
    productsToAdd.forEach((product) => {
      this.http
        .post<{ status: string; message: string }>(`${this.apiUrl}/wishlist`, {
          product_id: product.id,
        })
        .subscribe(
          () => {
            console.log(`Product ${product.id} synced to server wishlist`);
          },
          (error) => {
            console.error(
              `Failed to sync product ${product.id} to server:`,
              error
            );
          }
        );
    });
  }

  /**
   * Merges local and server lists
   */
  private mergeWishlists(
    localProducts: IProduct[],
    serverProducts: IProduct[]
  ): IProduct[] {
    // Create a Map to eliminate duplicates by ID
    const productMap = new Map<number, IProduct>();

    // First add server products
    serverProducts.forEach((product) => {
      productMap.set(product.id, product);
    });

    // Then add local products that aren't already in the map
    localProducts.forEach((product) => {
      if (!productMap.has(product.id)) {
        productMap.set(product.id, product);
      }
    });

    // Convert the Map to an array
    return Array.from(productMap.values());
  }

  /**
   * Clears the check cache for a specific product
   */
  private clearProductFromCache(productId: number): void {
    this.wishlistCheckCache.delete(productId);
  }

  /**
   * Clears the entire check cache
   */
  private clearCheckCache(): void {
    this.wishlistCheckCache.clear();
  }
}
