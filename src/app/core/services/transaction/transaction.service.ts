import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ITransaction,
  IRefundRequest,
  ITransactionStatistics,
} from '../../models2/order.model';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private apiUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  /**
   * Get transactions for current user
   * @param page Page number
   * @param perPage Items per page
   * @param status Optional status filter
   */
  getUserTransactions(
    page: number = 1,
    perPage: number = 10,
    status?: string
  ): Observable<{
    status: string;
    data: {
      transactions: ITransaction[];
      pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
      };
    };
  }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<any>(`${this.apiUrl}/transactions/user`, { params });
  }

  /**
   * Get transactions for a specific order
   * @param orderId Order ID
   */
  getOrderTransactions(
    orderId: number
  ): Observable<{ status: string; data: ITransaction[] }> {
    return this.http.get<{ status: string; data: ITransaction[] }>(
      `${this.apiUrl}/orders/${orderId}/transactions`
    );
  }

  getAllTransactions(
    page: number = 1,
    perPage: number = 15,
    filters?: {
      order_id?: number;
      status?: string;
      payment_method?: string;
      transaction_type?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Observable<{
    status: string;
    data: {
      transactions: ITransaction[];
      pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
      };
    };
  }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    if (filters) {
      // Solution: utiliser type casting pour indiquer à TypeScript que la clé est bien une propriété de filters
      Object.keys(filters).forEach((key) => {
        const k = key as keyof typeof filters;
        const value = filters[k];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<any>(`${this.apiUrl}/admin/transactions`, { params });
  }

  /**
   * Get a specific transaction
   * @param id Transaction ID
   */
  getTransaction(
    id: number
  ): Observable<{ status: string; data: ITransaction }> {
    return this.http.get<{ status: string; data: ITransaction }>(
      `${this.apiUrl}/admin/transactions/${id}`
    );
  }

  /**
   * Create a new transaction
   * @param transaction Transaction data
   */
  createTransaction(
    transaction: Partial<ITransaction>
  ): Observable<{ status: string; data: ITransaction }> {
    return this.http.post<{ status: string; data: ITransaction }>(
      `${this.apiUrl}/admin/transactions`,
      transaction
    );
  }

  /**
   * Update a transaction (limited fields)
   * @param id Transaction ID
   * @param data Update data (status, notes, payment_response)
   */
  updateTransaction(
    id: number,
    data: {
      status?: string;
      notes?: string;
      payment_response?: any;
    }
  ): Observable<{ status: string; data: ITransaction }> {
    return this.http.put<{ status: string; data: ITransaction }>(
      `${this.apiUrl}/admin/transactions/${id}`,
      data
    );
  }

  /**
   * Process a refund
   * @param refundData Refund request data
   */
  processRefund(
    refundData: IRefundRequest
  ): Observable<{ status: string; data: ITransaction }> {
    return this.http.post<{ status: string; data: ITransaction }>(
      `${this.apiUrl}/admin/transactions/refund`,
      refundData
    );
  }

  /**
   * Get transaction statistics
   * @param startDate Start date for statistics
   * @param endDate End date for statistics
   */
  getStatistics(
    startDate?: string,
    endDate?: string
  ): Observable<{ status: string; data: ITransactionStatistics }> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('start_date', startDate);
    }

    if (endDate) {
      params = params.set('end_date', endDate);
    }

    return this.http.get<{ status: string; data: ITransactionStatistics }>(
      `${this.apiUrl}/admin/transaction/statistics`,
      { params }
    );
  }
}
