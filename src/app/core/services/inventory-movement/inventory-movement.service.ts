import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { IInventoryMovement } from '../../models/inventory-movement.model';
import { handleHttpError } from '../errors';

export interface InventoryMovementSearchParams {
  page?: number;
  limit?: number;
  product_id?: number;
  reference_type?: 'order' | 'manual' | 'return' | 'adjustment' | 'initial';
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface InventoryMovementsResponse {
  status: string;
  data: {
    movements: IInventoryMovement[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface InventorySummary {
  recent_movements: IInventoryMovement[];
  low_stock_products: any[];
  out_of_stock_products: any[];
  movements_by_type: { [key: string]: number };
}

@Injectable({
  providedIn: 'root',
})
export class InventoryMovementService {
  private http = inject(HttpClient);

  private apiUrl = environment.API_URL;
  private movementsSubject = new BehaviorSubject<IInventoryMovement[]>([]);

  public movements$ = this.movementsSubject.asObservable();

  constructor() {}

  /**
   * Récupère les mouvements d'inventaire avec filtres et pagination
   */
  getInventoryMovements(
    params: InventoryMovementSearchParams = {}
  ): Observable<InventoryMovementsResponse> {
    return this.http
      .get<InventoryMovementsResponse>(`${this.apiUrl}/inventory/movements`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            this.movementsSubject.next(response.data.movements);
          }
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Crée un nouveau mouvement d'inventaire
   */
  createInventoryMovement(
    movementData: Partial<IInventoryMovement>
  ): Observable<{ status: string; data: IInventoryMovement }> {
    return this.http
      .post<{ status: string; data: IInventoryMovement }>(
        `${this.apiUrl}/inventory/movements`,
        movementData
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Récupère un mouvement d'inventaire spécifique
   */
  getInventoryMovement(
    id: number
  ): Observable<{ status: string; data: IInventoryMovement }> {
    return this.http
      .get<{ status: string; data: IInventoryMovement }>(
        `${this.apiUrl}/inventory/movements/${id}`
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Récupère l'historique des mouvements pour un produit spécifique
   */
  getProductHistory(productId: number): Observable<{
    status: string;
    data: { product: any; movements: IInventoryMovement[] };
  }> {
    return this.http
      .get<{
        status: string;
        data: { product: any; movements: IInventoryMovement[] };
      }>(`${this.apiUrl}/inventory/products/${productId}/history`)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Récupère une synthèse des mouvements d'inventaire pour le tableau de bord
   */
  getInventorySummary(): Observable<{
    status: string;
    data: InventorySummary;
  }> {
    return this.http
      .get<{ status: string; data: InventorySummary }>(
        `${this.apiUrl}/inventory/summary`
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Construit les paramètres pour les requêtes HTTP
   */
  private buildParams(params: InventoryMovementSearchParams): HttpParams {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }

    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    if (params.product_id !== undefined) {
      httpParams = httpParams.set('product_id', params.product_id.toString());
    }

    if (params.reference_type !== undefined) {
      httpParams = httpParams.set('reference_type', params.reference_type);
    }

    if (params.start_date !== undefined) {
      httpParams = httpParams.set('start_date', params.start_date);
    }

    if (params.end_date !== undefined) {
      httpParams = httpParams.set('end_date', params.end_date);
    }

    if (params.sort_by !== undefined) {
      httpParams = httpParams.set('sort_by', params.sort_by);
    }

    if (params.sort_direction !== undefined) {
      httpParams = httpParams.set('sort_direction', params.sort_direction);
    }

    return httpParams;
  }

  /**
   * Obtient un libellé pour le type de référence
   */
  getReferenceTypeLabel(type: string): string {
    switch (type) {
      case 'order':
        return 'Commande';
      case 'manual':
        return 'Manuel';
      case 'return':
        return 'Retour';
      case 'adjustment':
        return 'Ajustement';
      case 'initial':
        return 'Initial';
      default:
        return type;
    }
  }

  /**
   * Obtient une classe CSS pour le mouvement d'inventaire en fonction de la quantité
   */
  getMovementClass(quantity: number): string {
    if (quantity > 0) {
      return 'movement-positive';
    } else if (quantity < 0) {
      return 'movement-negative';
    }
    return '';
  }
}
