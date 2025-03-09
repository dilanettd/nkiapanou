import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  IOrder,
  IMomoTransaction,
  IMomoPayment,
} from '../../models/order-model';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  apiUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  // Create a new order
  createOrder(order: Partial<IOrder>): Observable<IOrder> {
    return this.http.post<IOrder>(`${this.apiUrl}/order`, order);
  }

  // Get all orders for the authenticated user
  getUserOrders(): Observable<IOrder[]> {
    return this.http.get<IOrder[]>(`${this.apiUrl}/orders/user`);
  }

  // Get all orders for the authenticated seller
  getSellerOrders(): Observable<IOrder[]> {
    return this.http.get<IOrder[]>(`${this.apiUrl}/orders/seller`);
  }

  // Create a new MoM
  createMomoTransaction(
    transaction: Partial<IMomoTransaction>
  ): Observable<IMomoTransaction> {
    return this.http.post<IMomoTransaction>(
      `${this.apiUrl}/momo-transaction`,
      transaction
    );
  }

  // Create a new payment for an order
  createOrderPayment(transaction: IMomoPayment): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/momo-transaction`, transaction);
  }

  // Get all MoMo transactions for the authenticated user
  getUserMomoTransactions(): Observable<IMomoTransaction[]> {
    return this.http.get<IMomoTransaction[]>(
      `${this.apiUrl}/momo-transactions/user`
    );
  }
}
