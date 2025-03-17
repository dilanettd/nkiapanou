import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Order } from '../../models2/order.model';
import { handleHttpError } from '../errors';

interface OrdersResponse {
  status: string;
  data: {
    orders: Order[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

interface OrderResponse {
  status: string;
  data: Order;
}

@Injectable({
  providedIn: 'root',
})
export class PurchaseService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;

  /**
   * Récupère la liste des commandes de l'utilisateur
   */
  getUserOrders(): Observable<Order[]> {
    return this.http.get<OrdersResponse>(`${this.apiUrl}/orders`).pipe(
      map((response) =>
        response.status === 'success' ? response.data.orders : []
      ),
      catchError((error) => {
        console.error('Error fetching user orders:', error);
        return handleHttpError(error);
      })
    );
  }

  /**
   * Récupère les détails d'une commande spécifique
   */
  getOrderDetails(orderId: number): Observable<Order | undefined> {
    return this.http
      .get<OrderResponse>(`${this.apiUrl}/orders/${orderId}`)
      .pipe(
        map((response) =>
          response.status === 'success' ? response.data : undefined
        ),
        catchError((error) => {
          console.error(
            `Error fetching order details for ID ${orderId}:`,
            error
          );
          return handleHttpError(error);
        })
      );
  }

  /**
   * Crée une nouvelle commande
   */
  createOrder(orderData: any): Observable<Order> {
    return this.http
      .post<OrderResponse>(`${this.apiUrl}/orders`, orderData)
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            return response.data;
          }
          throw new Error('Failed to create order');
        }),
        catchError((error) => {
          console.error('Error creating order:', error);
          return handleHttpError(error);
        })
      );
  }

  /**
   * Annule une commande
   */
  cancelOrder(orderId: number): Observable<Order | undefined> {
    return this.http
      .patch<OrderResponse>(`${this.apiUrl}/orders/${orderId}/cancel`, {})
      .pipe(
        map((response) =>
          response.status === 'success' ? response.data : undefined
        ),
        catchError((error) => {
          console.error(`Error cancelling order ${orderId}:`, error);
          return handleHttpError(error);
        })
      );
  }

  /**
   * Obtient l'historique des commandes avec pagination
   */
  getOrdersHistory(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Observable<OrdersResponse> {
    let params: any = { page, limit };

    if (status && status !== 'all') {
      params.status = status;
    }

    return this.http
      .get<OrdersResponse>(`${this.apiUrl}/orders`, { params })
      .pipe(
        catchError((error) => {
          console.error('Error fetching orders history:', error);
          return handleHttpError(error);
        })
      );
  }
}
