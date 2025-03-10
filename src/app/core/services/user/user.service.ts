import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { handleHttpError } from '../errors';
import { AuthService } from '../auth/auth.service';
import { IUser } from '../../models2/user.model';

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

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.API_URL;

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
}
