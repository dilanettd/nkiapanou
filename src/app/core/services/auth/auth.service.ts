import { Injectable, Injector, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { tap, catchError, finalize, switchMap, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { handleHttpError } from '../errors';
import { IAuthResponse } from '../../models2/auth.model';
import { IUser } from '../../models2/user.model';
import { CartService } from '../cart/cart.service';
import { WishlistService } from '../wishlist/wishlist.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(LocalStorageService);
  // Services injectés de manière lazy pour éviter les dépendances circulaires
  private cartService?: CartService;
  private wishlistService?: WishlistService;

  private apiUrl = environment.API_URL;

  public authStatus = signal<boolean>(false);
  public currentUser = signal<IUser | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  // Pour suivre le processus de synchronisation
  public isSynchronizing = signal<boolean>(false);

  constructor(private injector: Injector) {
    // Initialiser l'état d'authentification avec la valeur du localStorage
    const token = this.storage.retrieve('authToken');
    const initialAuthState = !!token;

    // Définir les valeurs initiales
    this.authStatus.set(initialAuthState);
    this.isAuthenticatedSubject.next(initialAuthState);

    // Charger les données utilisateur si présentes
    this.loadStoredUserData();

    this.storage.observe('currentUser').subscribe((user) => {
      if (user) {
        this.currentUser.set(user);
        this.authStatus.set(true);
        this.isAuthenticatedSubject.next(true);
      } else {
        this.currentUser.set(null);
        this.authStatus.set(false);
        this.isAuthenticatedSubject.next(false);
      }
    });

    this.storage.observe('authToken').subscribe((token) => {
      const isAuth = !!token;
      this.authStatus.set(isAuth);
      this.isAuthenticatedSubject.next(isAuth);
    });
  }

  // Méthodes d'injection lazy pour éviter les dépendances circulaires
  private getCartService(): CartService {
    if (!this.cartService) {
      this.cartService = this.injector.get(CartService);
    }
    return this.cartService;
  }

  private getWishlistService(): WishlistService {
    if (!this.wishlistService) {
      this.wishlistService = this.injector.get(WishlistService);
    }
    return this.wishlistService;
  }

  /**
   * Load user data stored in local storage
   */
  private loadStoredUserData(): void {
    const user = this.storage.retrieve('currentUser');
    const token = this.storage.retrieve('authToken');

    if (user && token) {
      this.currentUser.set(user);
      this.authStatus.set(true);
      this.isAuthenticatedSubject.next(true);
    }
  }

  /**
   * Register a new user
   */
  register(
    name: string,
    email: string,
    password: string,
    language: string = 'fr'
  ): Observable<IAuthResponse> {
    return this.http
      .post<IAuthResponse>(`${this.apiUrl}/register`, {
        name,
        email,
        password,
        language,
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Login a user with email and password
   */
  login(email: string, password: string): Observable<IAuthResponse> {
    return this.http
      .post<IAuthResponse>(`${this.apiUrl}/login`, {
        email,
        password,
      })
      .pipe(
        tap((response) => {
          if (
            response.status === 'success' &&
            response.user &&
            response.token
          ) {
            this.storeUserData(response.user, response.token);
          }
        }),
        switchMap((response) => {
          if (response.status === 'success') {
            return this.synchronizeUserData().pipe(map(() => response));
          }
          return of(response);
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Synchronize cart and wishlist data after login
   */
  synchronizeUserData(): Observable<any> {
    this.isSynchronizing.set(true);

    const cartService = this.getCartService();
    const wishlistService = this.getWishlistService();

    // Utiliser forkJoin pour exécuter les deux synchronisations en parallèle
    return forkJoin([
      cartService.syncCartWithServer(),
      wishlistService.syncWishlistWithServer(),
    ]).pipe(
      finalize(() => {
        this.isSynchronizing.set(false);
      })
    );
  }

  /**
   * Get all admins with pagination
   */
  getAdmins(page: number = 1): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/admins?page=${page}`)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Get a specific admin by ID
   */
  getAdmin(id: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/admins/${id}`)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Create a new admin from existing user
   */
  createAdmin(
    userId: number,
    role: string,
    status: boolean = true
  ): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/admins`, {
        user_id: userId,
        role,
        status,
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Create a new user and admin simultaneously
   */
  createAdminWithUser(
    name: string,
    email: string,
    password: string,
    role: string,
    status: boolean = true
  ): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/admins/create-with-user`, {
        name,
        email,
        password,
        role,
        status,
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Update an admin's role or status
   */
  updateAdmin(
    id: number,
    data: { role?: string; status?: boolean }
  ): Observable<any> {
    return this.http
      .put<any>(`${this.apiUrl}/admins/${id}`, data)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Delete an admin
   */
  deleteAdmin(id: number): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/admins/${id}`)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Toggle admin status (active/inactive)
   */
  toggleAdminStatus(id: number): Observable<any> {
    return this.http
      .patch<any>(`${this.apiUrl}/admins/${id}/toggle-status`, {})
      .pipe(catchError(handleHttpError));
  }

  /**
   * Login or register with a social account (Facebook or Google)
   */
  socialLogin(
    name: string,
    email: string,
    socialId: string,
    socialType: 'facebook' | 'google',
    language: string = 'fr'
  ): Observable<IAuthResponse> {
    return this.http
      .post<IAuthResponse>(`${this.apiUrl}/social-login`, {
        name,
        email,
        social_id: socialId,
        social_type: socialType,
        language,
      })
      .pipe(
        tap((response) => {
          if (
            response.status === 'success' &&
            response.user &&
            response.token
          ) {
            this.storeUserData(response.user, response.token);
          }
        }),
        switchMap((response) => {
          if (response.status === 'success') {
            return this.synchronizeUserData().pipe(map(() => response));
          }
          return of(response);
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Logout current user
   */
  logout(): Observable<IAuthResponse> {
    // Call API only if user is authenticated
    if (this.isAuthenticatedValue()) {
      return this.http.post<IAuthResponse>(`${this.apiUrl}/logout`, {}).pipe(
        tap(() => {
          this.clearUserData();
        }),
        catchError((error) => {
          // Even if the API call fails, clear local data
          this.clearUserData();
          return handleHttpError(error);
        })
      );
    } else {
      // If no user is logged in, simply clear local data
      this.clearUserData();
      return of({ status: 'success', message: 'Logout successful' });
    }
  }

  /**
   * Admin login
   */
  loginAdmin(email: string, password: string): Observable<IAuthResponse> {
    return this.http
      .post<IAuthResponse>(`${this.apiUrl}/admin/login`, {
        email,
        password,
      })
      .pipe(
        tap((response) => {
          if (
            response.status === 'success' &&
            response.user &&
            response.token
          ) {
            this.storeUserData(response.user, response.token);
          }
        }),
        switchMap((response) => {
          if (response.status === 'success') {
            return this.synchronizeUserData().pipe(map(() => response));
          }
          return of(response);
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Resend verification email
   */
  resendVerification(email: string): Observable<IAuthResponse> {
    return this.http
      .post<IAuthResponse>(`${this.apiUrl}/resend-verification`, {
        email,
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Verify email with token
   */
  verifyEmail(token: string): Observable<IAuthResponse> {
    return this.http
      .post<IAuthResponse>(`${this.apiUrl}/email/verify`, {
        token,
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Request password reset
   */
  forgotPassword(email: string): Observable<IAuthResponse> {
    return this.http
      .post<IAuthResponse>(`${this.apiUrl}/forgot-password`, {
        email,
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Reset password with token
   */
  resetPassword(
    email: string,
    password: string,
    token: string
  ): Observable<IAuthResponse> {
    return this.http
      .post<IAuthResponse>(`${this.apiUrl}/reset-password`, {
        token,
        email,
        password,
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Store user data in local storage
   */
  private storeUserData(user: IUser, token: string): void {
    // Mettre à jour l'état directement en plus des observateurs de stockage
    this.currentUser.set(user);
    this.authStatus.set(true);
    this.isAuthenticatedSubject.next(true);

    // Puis stocker dans le localStorage
    this.storage.store('currentUser', user);
    this.storage.store('authToken', token);
  }

  /**
   * Clear user data from local storage
   */
  private clearUserData(): void {
    // Mettre à jour l'état directement avant de supprimer du stockage
    this.currentUser.set(null);
    this.authStatus.set(false);
    this.isAuthenticatedSubject.next(false);

    // Puis supprimer du stockage
    this.storage.clear('currentUser');
    this.storage.clear('authToken');
  }

  /**
   * Get current authentication token
   */
  getToken(): string | null {
    return this.storage.retrieve('authToken');
  }

  /**
   * Set authentication token
   * @param token The authentication token to store
   */
  setToken(token: string): void {
    this.storage.store('authToken', token);
    this.authStatus.set(true);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Get an observable of the authentication state
   * @returns Observable<boolean> that emits when the auth state changes
   */
  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  /**
   * Get the current authentication state as a value
   * @returns boolean indicating if the user is authenticated
   */
  isAuthenticatedValue(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get current user
   */
  getCurrentUser(): IUser | null {
    return this.storage.retrieve('currentUser');
  }

  /**
   * Update user data after profile changes
   */
  setUser(user: IUser): void {
    this.storage.store('currentUser', user);
    this.currentUser.set(user);
  }

  /**
   * Get current user as an Observable that emits when the user changes
   * @returns Observable of user data that updates when the store changes
   */
  getUser(): Observable<IUser | null> {
    return this.storage.observe('currentUser');
  }
}
