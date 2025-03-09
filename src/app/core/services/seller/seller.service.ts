import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { handleHttpError } from '../errors';
import { IShop, IUpdateShop } from '../../models/seller.model';

@Injectable({
  providedIn: 'root',
})
export class SellerService {
  apiUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  updateShopDetails(shop: IUpdateShop): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/shop/details`, shop)
      .pipe(catchError(handleHttpError));
  }

  getSellerDetails(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/seller`)
      .pipe(catchError(handleHttpError));
  }

  updateLogo(logo: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', logo);

    return this.http
      .post(`${this.apiUrl}/shop/logo`, formData)
      .pipe(catchError(handleHttpError));
  }

  updateCoverImage(coverImage: File): Observable<any> {
    const formData = new FormData();
    formData.append('cover_image', coverImage);

    return this.http
      .post(`${this.apiUrl}/shop/cover-image`, formData)
      .pipe(catchError(handleHttpError));
  }

  getTopRatedShops(): Observable<IShop[]> {
    return this.http
      .get<IShop[]>(`${this.apiUrl}/shops/top-rated`)
      .pipe(catchError(handleHttpError));
  }

  getShopById(shopId: string): Observable<IShop> {
    return this.http
      .get<IShop>(`${this.apiUrl}/shop/${shopId}`)
      .pipe(catchError(handleHttpError));
  }
}
