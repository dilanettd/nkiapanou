import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from 'ngx-webstorage';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { handleHttpError } from '../errors';
import { IAuthResponse } from '../../models2/auth.model';
import { IUser } from '../../models2/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(LocalStorageService);

  private apiUrl = environment.API_URL;

  public authStatus = signal<boolean>(false);
  public currentUser = signal<IUser | null>(null);

  constructor() {
    this.loadStoredUserData();

    this.storage.observe('currentUser').subscribe((user) => {
      if (user) {
        this.currentUser.set(user);
        this.authStatus.set(true);
      } else {
        this.currentUser.set(null);
        this.authStatus.set(false);
      }
    });

    this.storage.observe('authToken').subscribe((token) => {
      this.authStatus.set(!!token);
    });
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
        catchError(handleHttpError)
      );
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
        catchError(handleHttpError)
      );
  }

  /**
   * Logout current user
   */
  logout(): Observable<IAuthResponse> {
    // Call API only if user is authenticated
    if (this.isAuthenticated()) {
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
      return new Observable((observer) => {
        observer.next({ status: 'success', message: 'Logout successful' });
        observer.complete();
      });
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
    this.storage.store('currentUser', user);
    this.storage.store('authToken', token);
    // Storage observers will update signals
  }

  /**
   * Clear user data from local storage
   */
  private clearUserData(): void {
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
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.storage.retrieve('authToken');
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
