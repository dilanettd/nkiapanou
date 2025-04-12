import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { handleHttpError } from '../errors';

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  is_read?: boolean;
}

export interface ContactMessagesResponse {
  status: string;
  data: {
    contacts: ContactMessage[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface SingleContactResponse {
  status: string;
  data: ContactMessage;
}

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;
  private contactMessagesSubject = new BehaviorSubject<ContactMessage[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);

  public contactMessages$ = this.contactMessagesSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  private unreadMessagesSubject = new BehaviorSubject<ContactMessage[]>([]);
  public unreadMessages$ = this.unreadMessagesSubject.asObservable();

  /**
   * Send a contact form message
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
   * Get unread contact messages for notifications (admin only)
   * Limit to a small number for notifications
   */
  getUnreadMessages(limit: number = 5): Observable<ContactMessagesResponse> {
    const params = {
      limit,
      is_read: false,
      sort_by: 'created_at',
      sort_direction: 'desc' as 'asc' | 'desc',
    };

    return this.http
      .get<ContactMessagesResponse>(`${this.apiUrl}/admin/contacts`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            this.unreadMessagesSubject.next(response.data.contacts);
            this.unreadCountSubject.next(response.data.total);
          }
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Get all contact messages (admin only)
   */
  getContactMessages(
    params: ContactSearchParams = {}
  ): Observable<ContactMessagesResponse> {
    return this.http
      .get<ContactMessagesResponse>(`${this.apiUrl}/admin/contacts`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            this.contactMessagesSubject.next(response.data.contacts);
          }
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Get a specific contact message by ID (admin only)
   */
  getContactMessage(id: number): Observable<SingleContactResponse> {
    return this.http
      .get<SingleContactResponse>(`${this.apiUrl}/admin/contacts/${id}`)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Mark a contact message as read (admin only)
   */
  markAsRead(
    id: number
  ): Observable<{ status: string; message: string; contact: ContactMessage }> {
    return this.http
      .patch<{ status: string; message: string; contact: ContactMessage }>(
        `${this.apiUrl}/admin/contacts/${id}/read`,
        {}
      )
      .pipe(
        tap(() => this.refreshContactMessages()),
        catchError(handleHttpError)
      );
  }

  /**
   * Mark multiple contact messages as read (admin only)
   */
  markMultipleAsRead(
    ids: number[]
  ): Observable<{ status: string; message: string }> {
    return this.http
      .post<{ status: string; message: string }>(
        `${this.apiUrl}/admin/contacts/mark-read`,
        { ids }
      )
      .pipe(
        tap(() => this.refreshContactMessages()),
        catchError(handleHttpError)
      );
  }

  /**
   * Delete a contact message (admin only)
   */
  deleteContactMessage(
    id: number
  ): Observable<{ status: string; message: string }> {
    return this.http
      .delete<{ status: string; message: string }>(
        `${this.apiUrl}/admin/contacts/${id}`
      )
      .pipe(
        tap(() => this.refreshContactMessages()),
        catchError(handleHttpError)
      );
  }

  /**
   * Get the count of unread contact messages (admin only)
   */
  getUnreadCount(): Observable<{
    status: string;
    data: { unread_count: number };
  }> {
    return this.http
      .get<{ status: string; data: { unread_count: number } }>(
        `${this.apiUrl}/admin/contacts/unread/count`
      )
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            this.unreadCountSubject.next(response.data.unread_count);
          }
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Refresh the contact messages list with the current filters
   */
  private refreshContactMessages() {
    // Get current params from wherever you store them in your application
    // For simplicity, we're just getting all messages
    this.getContactMessages().subscribe();
    // Also refresh the unread count
    this.getUnreadCount().subscribe();
  }

  /**
   * Build HTTP parameters for API requests
   */
  private buildParams(params: ContactSearchParams): HttpParams {
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

    if (params.is_read !== undefined) {
      httpParams = httpParams.set('is_read', params.is_read.toString());
    }

    return httpParams;
  }
}
