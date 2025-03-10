import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { MockDataService } from '../mock/mock-data.service';
import { Order } from '../../models2/order.model';
import { handleHttpError } from '../errors';

@Injectable({
  providedIn: 'root',
})
export class PurchaseService {
  private http = inject(HttpClient);
  private mockDataService = inject(MockDataService);
  private apiUrl = environment.API_URL;

  // Utilisé pour déterminer si on utilise des données mockées ou réelles
  private useMockData = true;

  /**
   * Récupère la liste des commandes de l'utilisateur
   */
  getUserOrders(): Observable<Order[]> {
    if (this.useMockData) {
      return this.mockDataService.getUserOrders(1);
    } else {
      return this.http
        .get<Order[]>(`${this.apiUrl}/orders`)
        .pipe(catchError(handleHttpError));
    }
  }

  /**
   * Récupère les détails d'une commande spécifique
   */
  getOrderDetails(orderId: number): Observable<Order | undefined> {
    if (this.useMockData) {
      return this.mockDataService.getOrderById(orderId);
    } else {
      return this.http
        .get<Order>(`${this.apiUrl}/orders/${orderId}`)
        .pipe(catchError(handleHttpError));
    }
  }
}
