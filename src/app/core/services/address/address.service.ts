import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { IUserAddress } from '../../models2/user.model';
import { handleHttpError } from '../errors';

interface ApiResponse<T> {
  status: string;
  message?: string;
  data?: T;
  errors?: any;
}

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;

  /**
   * Gets all addresses for the user
   */
  getUserAddresses(): Observable<IUserAddress[]> {
    return this.http
      .get<ApiResponse<IUserAddress[]>>(`${this.apiUrl}/user/addresses`)
      .pipe(
        map((response) => response.data || []),
        catchError(handleHttpError)
      );
  }

  /**
   * Gets a specific address by ID
   */
  getAddressById(addressId: number): Observable<IUserAddress | undefined> {
    return this.http
      .get<ApiResponse<IUserAddress>>(
        `${this.apiUrl}/user/addresses/${addressId}`
      )
      .pipe(
        map((response) => response.data),
        catchError(handleHttpError)
      );
  }

  /**
   * Adds a new address
   */
  addAddress(
    addressData: Omit<
      IUserAddress,
      'id' | 'user_id' | 'created_at' | 'updated_at'
    >
  ): Observable<IUserAddress> {
    return this.http
      .post<ApiResponse<IUserAddress>>(
        `${this.apiUrl}/user/addresses`,
        addressData
      )
      .pipe(
        map((response) => response.data as IUserAddress),
        catchError(handleHttpError)
      );
  }

  /**
   * Updates an existing address
   */
  updateAddress(
    addressId: number,
    addressData: Partial<IUserAddress>
  ): Observable<IUserAddress> {
    return this.http
      .put<ApiResponse<IUserAddress>>(
        `${this.apiUrl}/user/addresses/${addressId}`,
        addressData
      )
      .pipe(
        map((response) => response.data as IUserAddress),
        catchError(handleHttpError)
      );
  }

  /**
   * Deletes an address
   */
  deleteAddress(addressId: number): Observable<boolean> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/user/addresses/${addressId}`)
      .pipe(
        map((response) => response.status === 'success'),
        catchError(handleHttpError)
      );
  }

  /**
   * Sets an address as default
   */
  setDefaultAddress(addressId: number): Observable<IUserAddress> {
    return this.http
      .put<ApiResponse<IUserAddress>>(
        `${this.apiUrl}/user/addresses/${addressId}/default`,
        {}
      )
      .pipe(
        map((response) => response.data as IUserAddress),
        catchError(handleHttpError)
      );
  }

  /**
   * Gets all addresses of a specific type (shipping or billing)
   */
  getAddressesByType(type: 'shipping' | 'billing'): Observable<IUserAddress[]> {
    return this.http
      .get<ApiResponse<IUserAddress[]>>(
        `${this.apiUrl}/user/addresses/type/${type}`
      )
      .pipe(
        map((response) => response.data || []),
        catchError(handleHttpError)
      );
  }

  /**
   * Gets the default address of a specific type
   */
  getDefaultAddressByType(
    type: 'shipping' | 'billing'
  ): Observable<IUserAddress | undefined> {
    return this.http
      .get<ApiResponse<IUserAddress>>(
        `${this.apiUrl}/user/addresses/type/${type}/default`
      )
      .pipe(
        map((response) => response.data),
        catchError(handleHttpError)
      );
  }
}
