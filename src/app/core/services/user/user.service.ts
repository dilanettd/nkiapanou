import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { handleHttpError } from '../errors';
import { AuthService } from '../auth/auth.service';
import { IUser } from '../../models/user.model';

// Interface for updating the profile
export interface IUpdateProfile {
  name?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

export interface UserSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  admin?: boolean;
  is_social?: boolean;
}

export interface UsersResponse {
  status: string;
  data: {
    users: IUser[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface SingleUserResponse {
  status: string;
  data: IUser;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.API_URL;
  private usersSubject = new BehaviorSubject<IUser[]>([]);

  public users$ = this.usersSubject.asObservable();

  /**
   * Retrieves the complete profile of the user
   */
  getProfile(): Observable<{ status: string; user: IUser }> {
    return this.http
      .get<{ status: string; user: IUser }>(`${this.apiUrl}/profile`)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Updates the user's profile
   */
  updateProfile(
    userData: IUpdateProfile
  ): Observable<{ status: string; user: IUser }> {
    return this.http
      .put<{ status: string; user: IUser }>(`${this.apiUrl}/profile`, userData)
      .pipe(
        tap((response) => {
          if (response.status === 'success' && response.user) {
            this.authService.setUser(response.user);
          }
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Changes the user's password
   */
  changePassword(
    currentPassword: string,
    newPassword: string
  ): Observable<{ status: string; message: string }> {
    return this.http
      .put<{ status: string; message: string }>(
        `${this.apiUrl}/change-password`,
        {
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: newPassword,
        }
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Update profile image
   */
  updateProfileImage(imageFile: File): Observable<{
    status: string;
    message: string;
    profile_image: string;
    user: IUser;
  }> {
    const formData = new FormData();
    formData.append('profile_image', imageFile);

    return this.http
      .post<{
        status: string;
        message: string;
        profile_image: string;
        user: IUser;
      }>(`${this.apiUrl}/profile/image`, formData)
      .pipe(
        tap((response) => {
          if (response.status === 'success' && response.user) {
            this.authService.setUser(response.user);
          }
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: {
    newsletter_subscription?: boolean;
    preferred_categories?: string[];
    preferred_payment_method?: string;
    language?: string;
  }): Observable<{ status: string; message: string; preferences: any }> {
    return this.http
      .put<{ status: string; message: string; preferences: any }>(
        `${this.apiUrl}/preferences`,
        preferences
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Get user addresses
   */
  getAddresses(): Observable<{ status: string; addresses: any[] }> {
    return this.http
      .get<{ status: string; addresses: any[] }>(`${this.apiUrl}/addresses`)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Add a new address
   */
  addAddress(
    addressData: any
  ): Observable<{ status: string; message: string; address: any }> {
    return this.http
      .post<{ status: string; message: string; address: any }>(
        `${this.apiUrl}/addresses`,
        addressData
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Update an existing address
   */
  updateAddress(
    id: number,
    addressData: any
  ): Observable<{ status: string; message: string; address: any }> {
    return this.http
      .put<{ status: string; message: string; address: any }>(
        `${this.apiUrl}/addresses/${id}`,
        addressData
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Delete an address
   */
  deleteAddress(id: number): Observable<{ status: string; message: string }> {
    return this.http
      .delete<{ status: string; message: string }>(
        `${this.apiUrl}/addresses/${id}`
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Set an address as default
   */
  setDefaultAddress(
    id: number
  ): Observable<{ status: string; message: string; address: any }> {
    return this.http
      .put<{ status: string; message: string; address: any }>(
        `${this.apiUrl}/addresses/${id}/default`,
        {}
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Get all users (admin only)
   */
  getUsers(params: UserSearchParams = {}): Observable<UsersResponse> {
    return this.http
      .get<UsersResponse>(`${this.apiUrl}/users`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            this.usersSubject.next(response.data.users);
          }
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Get a user by ID (admin only)
   */
  getUserById(id: number): Observable<SingleUserResponse> {
    return this.http
      .get<SingleUserResponse>(`${this.apiUrl}/users/${id}`)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Delete a user (admin only)
   */
  deleteUser(id: number): Observable<{ status: string; message: string }> {
    return this.http
      .delete<{ status: string; message: string }>(`${this.apiUrl}/users/${id}`)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Convert a social account to a regular account
   */
  convertSocialAccount(
    id: number
  ): Observable<{ status: string; data: IUser }> {
    return this.http
      .post<{ status: string; data: IUser }>(
        `${this.apiUrl}/users/${id}/convert-social`,
        {}
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Send contact form message
   */
  sendContactMessage(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }): Observable<{ status: string; message: string }> {
    return this.http
      .post<{ status: string; message: string }>(`${this.apiUrl}/contact`, data)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Toggle admin status for a user
   */
  toggleAdminStatus(
    id: number,
    makeAdmin: boolean
  ): Observable<{ status: string; data: IUser }> {
    return this.http
      .patch<{ status: string; data: IUser }>(
        `${this.apiUrl}/users/${id}/admin-status`,
        { admin: makeAdmin }
      )
      .pipe(catchError(handleHttpError));
  }

  private buildParams(params: UserSearchParams): HttpParams {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }

    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    if (params.search !== undefined && params.search.trim() !== '') {
      httpParams = httpParams.set('search', params.search);
    }

    if (params.sort_by !== undefined) {
      httpParams = httpParams.set('sort_by', params.sort_by);
    }

    if (params.sort_direction !== undefined) {
      httpParams = httpParams.set('sort_direction', params.sort_direction);
    }

    if (params.admin !== undefined) {
      httpParams = httpParams.set('admin', params.admin.toString());
    }

    if (params.is_social !== undefined) {
      httpParams = httpParams.set('is_social', params.is_social.toString());
    }

    return httpParams;
  }

  // Helper method to generate initials from name
  getInitials(name: string): string {
    if (!name) return 'U';

    const nameParts = name.split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }

    return (
      nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
    ).toUpperCase();
  }

  // Helper method to generate a placeholder avatar
  getAvatarPlaceholder(name: string): string {
    const initials = this.getInitials(name);
    const colors = ['#ebc435', '#6c84af', '#dfc45b', '#333333']; // Using your theme colors
    const colorIndex = Math.abs(
      name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
        colors.length
    );

    return `https://placehold.co/200/${colors[colorIndex].replace('#', '')}/${
      colorIndex > 2 ? 'ffffff' : '333333'
    }?text=${initials}`;
  }
}
