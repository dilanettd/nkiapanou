import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from 'ngx-webstorage';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, tap, map, shareReplay, finalize } from 'rxjs/operators';
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
   * Charge la wishlist depuis le stockage local (cache)
   */
  private loadWishlistFromStorage(): void {
    const storedWishlist = this.storage.retrieve(this.storageKey);
    if (storedWishlist) {
      this.wishlistSubject.next(storedWishlist);
    }
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  private isUserAuthenticated(): boolean {
    // Vérifier si un token d'authentification existe
    return !!this.storage.retrieve('authToken');
  }

  /**
   * Récupère la wishlist depuis le serveur ou le stockage local
   */
  getWishlist(): Observable<IProduct[]> {
    // Toujours retourner la liste locale d'abord pour une UI réactive
    const currentWishlist = this.wishlistSubject.getValue();

    // Si l'utilisateur n'est pas authentifié, retourner la liste locale
    if (!this.isUserAuthenticated()) {
      return of(currentWishlist);
    }

    // Sinon, récupérer la liste depuis le serveur
    return this.http
      .get<{ status: string; data: IWishlistItem[] }>(`${this.apiUrl}/wishlist`)
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            // Extraire les produits des items de la wishlist
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
   */
  isInWishlist(productId: number): Observable<boolean> {
    // Vérifier le cache d'abord
    if (this.wishlistCheckCache.has(productId)) {
      return this.wishlistCheckCache.get(productId)!;
    }

    // Vérifier dans la liste locale
    const result = this.wishlist$.pipe(
      map((products) => products.some((product) => product.id === productId)),
      shareReplay(1)
    );

    this.wishlistCheckCache.set(productId, result);

    // Si l'utilisateur est authentifié, faire une vérification côté serveur aussi
    // mais ne pas bloquer l'UI en attendant la réponse
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
          // Mettre à jour la liste locale si nécessaire
          const isInLocalWishlist = this.wishlistSubject
            .getValue()
            .some((p) => p.id === productId);

          if (response.in_wishlist && !isInLocalWishlist) {
            // Le produit est sur le serveur mais pas en local, l'ajouter localement
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
            // Le produit est en local mais pas sur le serveur, le supprimer localement
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
   * Ajoute un produit à la wishlist
   */
  addToWishlist(product: IProduct): Observable<IProduct[]> {
    // Toujours mettre à jour la liste locale immédiatement
    const currentList = this.wishlistSubject.getValue();

    // Vérifier si le produit existe déjà
    if (!currentList.some((p) => p.id === product.id)) {
      const updatedList = [...currentList, product];
      this.wishlistSubject.next(updatedList);
      this.storage.store(this.storageKey, updatedList);
      this.clearProductFromCache(product.id);
    }

    // Si l'utilisateur est authentifié, synchroniser avec le serveur
    if (this.isUserAuthenticated()) {
      this.http
        .post<{ status: string; message: string; data: IWishlistItem }>(
          `${this.apiUrl}/wishlist`,
          { product_id: product.id }
        )
        .pipe(
          catchError((error) => {
            console.error('Error adding to wishlist on server:', error);
            return throwError(error);
          })
        )
        .subscribe(
          () => {
            // L'ajout local a déjà été effectué
          },
          (error) => {
            console.error('Failed to add to wishlist on server:', error);
            // On conserve l'élément en local malgré l'erreur
          }
        );
    }

    return of(this.wishlistSubject.getValue());
  }

  /**
   * Retire un produit de la wishlist
   */
  removeFromWishlist(productId: number): Observable<IProduct[]> {
    // Toujours mettre à jour la liste locale immédiatement
    const currentList = this.wishlistSubject.getValue();
    const updatedList = currentList.filter(
      (product) => product.id !== productId
    );

    this.wishlistSubject.next(updatedList);
    this.storage.store(this.storageKey, updatedList);
    this.clearProductFromCache(productId);

    // Si l'utilisateur est authentifié, synchroniser avec le serveur
    if (this.isUserAuthenticated()) {
      this.http
        .delete<{ status: string; message: string }>(
          `${this.apiUrl}/wishlist/${productId}`
        )
        .pipe(
          catchError((error) => {
            console.error('Error removing from wishlist on server:', error);
            return throwError(error);
          })
        )
        .subscribe(
          () => {
            // La suppression locale a déjà été effectuée
          },
          (error) => {
            console.error('Failed to remove from wishlist on server:', error);
            // On garde la suppression locale malgré l'erreur
          }
        );
    }

    return of(this.wishlistSubject.getValue());
  }

  /**
   * Vide la wishlist entière
   */
  clearWishlist(): Observable<IProduct[]> {
    // Toujours vider la liste locale immédiatement
    this.wishlistSubject.next([]);
    this.storage.store(this.storageKey, []);
    this.clearCheckCache();

    // Si l'utilisateur est authentifié, synchroniser avec le serveur
    if (this.isUserAuthenticated()) {
      this.http
        .delete<{ status: string; message: string }>(`${this.apiUrl}/wishlist`)
        .pipe(
          catchError((error) => {
            console.error('Error clearing wishlist on server:', error);
            return throwError(error);
          })
        )
        .subscribe(
          () => {
            // La suppression locale a déjà été effectuée
          },
          (error) => {
            console.error('Failed to clear wishlist on server:', error);
            // On garde la liste vide localement malgré l'erreur
          }
        );
    }

    return of([]);
  }

  /**
   * Synchronise la wishlist locale avec le serveur
   * Utile quand un utilisateur se connecte avec des items dans le stockage local
   */
  syncWishlistWithServer(): Observable<IProduct[]> {
    // Si l'utilisateur n'est pas authentifié, on retourne simplement la liste locale
    if (!this.isUserAuthenticated()) {
      return of(this.wishlistSubject.getValue());
    }

    this.syncInProgressSubject.next(true);
    this.clearCheckCache();

    const localWishlist = this.wishlistSubject.getValue();

    // Si la liste locale est vide, récupérer simplement la liste du serveur
    if (localWishlist.length === 0) {
      return this.getWishlist().pipe(
        finalize(() => {
          this.syncInProgressSubject.next(false);
        })
      );
    }

    // Si nous avons des éléments locaux, nous devons les synchroniser avec le serveur
    return this.http
      .get<{ status: string; data: IWishlistItem[] }>(`${this.apiUrl}/wishlist`)
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            // Extraire les IDs des produits du serveur
            const serverProductIds = response.data
              .filter((item) => item.product)
              .map((item) => item.product!.id);

            // Synchroniser les éléments locaux avec le serveur
            this.syncLocalWithServer(localWishlist, serverProductIds);

            // Extraire les produits complets pour la liste locale
            const serverProducts = response.data
              .filter((item) => item.product)
              .map((item) => item.product as IProduct);

            // Fusionner avec les produits locaux qui pourraient ne pas encore être sur le serveur
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
   * Synchronise les éléments locaux avec le serveur
   */
  private syncLocalWithServer(
    localProducts: IProduct[],
    serverProductIds: number[]
  ): void {
    // Trouver les produits qui sont en local mais pas sur le serveur
    const productsToAdd = localProducts.filter(
      (product) => !serverProductIds.includes(product.id)
    );

    // Ajouter chaque produit manquant au serveur
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
   * Fusionne les listes locales et serveur
   */
  private mergeWishlists(
    localProducts: IProduct[],
    serverProducts: IProduct[]
  ): IProduct[] {
    // Créer un Map pour éliminer les doublons par ID
    const productMap = new Map<number, IProduct>();

    // D'abord ajouter les produits du serveur
    serverProducts.forEach((product) => {
      productMap.set(product.id, product);
    });

    // Ensuite ajouter les produits locaux qui ne sont pas déjà dans la map
    localProducts.forEach((product) => {
      if (!productMap.has(product.id)) {
        productMap.set(product.id, product);
      }
    });

    // Convertir la Map en tableau
    return Array.from(productMap.values());
  }

  /**
   * Vide le cache de vérification pour un produit spécifique
   */
  private clearProductFromCache(productId: number): void {
    this.wishlistCheckCache.delete(productId);
  }

  /**
   * Vide tout le cache de vérification
   */
  private clearCheckCache(): void {
    this.wishlistCheckCache.clear();
  }
}
