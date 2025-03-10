import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from 'ngx-webstorage';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
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

  // BehaviorSubject to track wishlist changes
  private wishlistSubject = new BehaviorSubject<IProduct[]>([]);

  // Observable that components can subscribe to
  public wishlist$ = this.wishlistSubject.asObservable();

  constructor() {
    this.loadWishlistFromServer();
  }

  /**
   * Loads the wishlist from the server
   */
  private loadWishlistFromServer(): void {
    // Do nothing if user is not authenticated
    if (!this.isUserAuthenticated()) {
      return;
    }

    this.http
      .get<{ status: string; data: IWishlistItem[] }>(`${this.apiUrl}/wishlist`)
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            // Extract products from wishlist items
            const products = response.data
              .filter((item) => item.product) // Filter out items without product
              .map((item) => item.product as IProduct);

            this.wishlistSubject.next(products);
            // Update localStorage as cache
            this.storage.store(this.storageKey, products);
          }
        }),
        catchError(handleHttpError)
      )
      .subscribe();
  }

  /**
   * Checks if the user is authenticated
   */
  private isUserAuthenticated(): boolean {
    // Check if an authentication token exists
    return !!this.storage.retrieve('authToken');
  }

  /**
   * Gets the wishlist from the server
   */
  getWishlist(): Observable<IProduct[]> {
    // Return local list if user is not authenticated
    if (!this.isUserAuthenticated()) {
      return this.wishlist$;
    }

    // Get the list from the server
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
            return products;
          }
          return [];
        }),
        catchError((error) => {
          handleHttpError(error);
          return this.wishlist$;
        })
      );
  }

  /**
   * Checks if a product is in the wishlist
   */
  isInWishlist(productId: number): Observable<boolean> {
    // Check in local list if user is not authenticated
    if (!this.isUserAuthenticated()) {
      return this.wishlist$.pipe(
        map((products) => products.some((product) => product.id === productId))
      );
    }

    // Check via API
    return this.http
      .get<{ status: string; in_wishlist: boolean }>(
        `${this.apiUrl}/wishlist/check/${productId}`
      )
      .pipe(
        map((response) => response.in_wishlist),
        catchError((error) => {
          handleHttpError(error);
          // Fallback to local check
          return this.wishlist$.pipe(
            map((products) =>
              products.some((product) => product.id === productId)
            )
          );
        })
      );
  }

  /**
   * Adds a product to the wishlist
   */
  addToWishlist(productId: number): Observable<IProduct[]> {
    // Can't add if user is not authenticated
    if (!this.isUserAuthenticated()) {
      return of(this.wishlistSubject.getValue());
    }

    return this.http
      .post<{ status: string; message: string; data: IWishlistItem }>(
        `${this.apiUrl}/wishlist`,
        { product_id: productId }
      )
      .pipe(
        tap((response) => {
          if (response.status === 'success' && response.data.product) {
            // Update local list
            const currentList = this.wishlistSubject.getValue();
            const product = response.data.product;

            // Check if product is already in the list
            if (!currentList.some((p) => p.id === product.id)) {
              const updatedList = [...currentList, product];
              this.wishlistSubject.next(updatedList);
              this.storage.store(this.storageKey, updatedList);
            }
          }
        }),
        map(() => this.wishlistSubject.getValue()),
        catchError(handleHttpError)
      );
  }

  /**
   * Removes a product from the wishlist
   */
  removeFromWishlist(productId: number): Observable<IProduct[]> {
    // Can't remove if user is not authenticated
    if (!this.isUserAuthenticated()) {
      return of(this.wishlistSubject.getValue());
    }

    return this.http
      .delete<{ status: string; message: string }>(
        `${this.apiUrl}/wishlist/${productId}`
      )
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            // Update local list
            const currentList = this.wishlistSubject.getValue();
            const updatedList = currentList.filter(
              (product) => product.id !== productId
            );
            this.wishlistSubject.next(updatedList);
            this.storage.store(this.storageKey, updatedList);
          }
        }),
        map(() => this.wishlistSubject.getValue()),
        catchError(handleHttpError)
      );
  }

  /**
   * Clears the entire wishlist
   */
  clearWishlist(): Observable<IProduct[]> {
    // Can't clear if user is not authenticated
    if (!this.isUserAuthenticated()) {
      return of(this.wishlistSubject.getValue());
    }

    return this.http
      .delete<{ status: string; message: string }>(`${this.apiUrl}/wishlist`)
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            // Clear local list
            this.wishlistSubject.next([]);
            this.storage.store(this.storageKey, []);
          }
        }),
        map(() => this.wishlistSubject.getValue()),
        catchError(handleHttpError)
      );
  }

  /**
   * Synchronizes the local wishlist with the server
   * Useful when a user logs in with items in local storage
   */
  syncWishlistWithServer(): Observable<IProduct[]> {
    // Can't sync if user is not authenticated
    if (!this.isUserAuthenticated()) {
      return of(this.wishlistSubject.getValue());
    }

    // Get the list from the server
    return this.getWishlist();
  }
}
