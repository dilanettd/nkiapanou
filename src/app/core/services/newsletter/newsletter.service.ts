import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  INewsletterSubscriberResponse,
  INewsletterSubscriber,
  INewsletterSubscriberCreate,
  INewsletterSubscriberUpdate,
} from '../../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class NewsletterService {
  private apiUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  /**
   * Get all newsletter subscribers with pagination and filtering
   * @param filters Optional filters
   */
  getSubscribers(filters?: {
    search?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }): Observable<INewsletterSubscriberResponse> {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach((key) => {
        const k = key as keyof typeof filters;
        const value = filters[k];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<INewsletterSubscriberResponse>(
      `${this.apiUrl}/admin/newsletter/subscribers`,
      { params }
    );
  }

  /**
   * Get a specific subscriber by ID
   * @param id Subscriber ID
   */
  getSubscriber(
    id: number
  ): Observable<{ status: string; data: INewsletterSubscriber }> {
    return this.http.get<{ status: string; data: INewsletterSubscriber }>(
      `${this.apiUrl}/admin/newsletter/subscribers/${id}`
    );
  }

  /**
   * Add a new newsletter subscriber
   * @param subscriber Subscriber data
   */
  addSubscriber(
    subscriber: INewsletterSubscriberCreate
  ): Observable<{ status: string; data: INewsletterSubscriber }> {
    return this.http.post<{ status: string; data: INewsletterSubscriber }>(
      `${this.apiUrl}/admin/newsletter/subscribers`,
      subscriber
    );
  }

  /**
   * Update an existing subscriber
   * @param id Subscriber ID
   * @param data Updated subscriber data
   */
  updateSubscriber(
    id: number,
    data: INewsletterSubscriberUpdate
  ): Observable<{ status: string; data: INewsletterSubscriber }> {
    return this.http.put<{ status: string; data: INewsletterSubscriber }>(
      `${this.apiUrl}/admin/newsletter/subscribers/${id}`,
      data
    );
  }

  /**
   * Delete a subscriber
   * @param id Subscriber ID
   */
  deleteSubscriber(
    id: number
  ): Observable<{ status: string; message: string }> {
    return this.http.delete<{ status: string; message: string }>(
      `${this.apiUrl}/admin/newsletter/subscribers/${id}`
    );
  }

  /**
   * Export selected subscribers to CSV
   * @param ids Array of subscriber IDs to export
   * @param emailsOnly If true, export only emails without other data
   * @param activeOnly If true, export only active subscribers
   */
  exportSubscribers(
    ids: number[],
    emailsOnly: boolean = false,
    activeOnly: boolean = true
  ): Observable<any> {
    const headers = new HttpHeaders({
      Accept: 'text/csv',
    });

    return this.http.post(
      `${this.apiUrl}/admin/newsletter/export`,
      {
        ids,
        format: emailsOnly ? 'emails_only' : 'full',
        active_only: activeOnly,
      },
      {
        headers,
        responseType: 'blob',
      }
    );
  }

  /**
   * Export all subscribers to CSV
   * @param emailsOnly If true, export only emails without other data
   * @param activeOnly If true, export only active subscribers
   * @param status Filter by status (active, unsubscribed, all)
   */
  exportAllSubscribers(
    emailsOnly: boolean = false,
    activeOnly: boolean = true,
    status?: string
  ): Observable<any> {
    const headers = new HttpHeaders({
      Accept: 'text/csv',
    });

    let params = new HttpParams()
      .set('format', emailsOnly ? 'emails_only' : 'full')
      .set('active_only', activeOnly.toString());

    if (status && status !== 'all') {
      params = params.set('status', status);
    }

    return this.http.get(`${this.apiUrl}/admin/newsletter/export-all`, {
      headers,
      params,
      responseType: 'blob',
    });
  }

  /**
   * Subscribe to newsletter (public endpoint)
   * @param email Email address
   * @param name Optional name
   */
  subscribe(
    email: string,
    name?: string
  ): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(
      `${this.apiUrl}/newsletter/subscribe`,
      {
        email,
        name,
      }
    );
  }

  /**
   * Unsubscribe from newsletter (public endpoint)
   * @param email Email address
   */
  unsubscribe(email: string): Observable<{ status: string; message: string }> {
    return this.http.post<{ status: string; message: string }>(
      `${this.apiUrl}/newsletter/unsubscribe`,
      {
        email,
      }
    );
  }
}
