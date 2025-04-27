import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { INewsletterSubscriber } from '../../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class NewsletterService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;

  /**
   * Souscrit un nouvel utilisateur à la newsletter
   */
  subscribe(
    email: string,
    name?: string
  ): Observable<{ status: string; message: string }> {
    return this.http
      .post<{ success: boolean; message: string; data: INewsletterSubscriber }>(
        `${this.apiUrl}/newsletter/subscribe`,
        { email, name }
      )
      .pipe(
        map((response) => ({
          status: response.success ? 'success' : 'error',
          message:
            response.message ||
            'Vous êtes maintenant inscrit à notre newsletter !',
        })),
        catchError((error) => {
          console.error('Error subscribing to newsletter', error);
          return of({
            status: 'error',
            message:
              error.error?.message ||
              "Une erreur est survenue lors de l'inscription à la newsletter.",
          });
        })
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
   * Désabonne un utilisateur de la newsletter
   */
  unsubscribe(email: string): Observable<{ status: string; message: string }> {
    return this.http
      .post<{ success: boolean; message: string; data: INewsletterSubscriber }>(
        `${this.apiUrl}/newsletter/unsubscribe`,
        { email }
      )
      .pipe(
        map((response) => ({
          status: response.success ? 'success' : 'error',
          message:
            response.message ||
            'Vous avez été désinscrit de notre newsletter avec succès.',
        })),
        catchError((error) => {
          console.error('Error unsubscribing from newsletter', error);
          return of({
            status: 'error',
            message:
              error.error?.message ||
              'Une erreur est survenue lors de la désinscription.',
          });
        })
      );
  }

  /**
   * Vérifie si un email est déjà inscrit
   * Note: Cette méthode nécessite l'ajout d'un endpoint côté serveur
   */
  checkSubscription(
    email: string
  ): Observable<{ status: string; subscribed: boolean }> {
    return this.http
      .post<{ success: boolean; data: { status: string } }>(
        `${this.apiUrl}/newsletter/check`,
        { email }
      )
      .pipe(
        map((response) => ({
          status: response.success ? 'success' : 'error',
          subscribed: response.data?.status === 'active',
        })),
        catchError((error) => {
          console.error('Error checking newsletter subscription', error);
          return of({ status: 'error', subscribed: false });
        })
      );
  }

  /**
   * Récupère la liste des abonnés actifs (pour l'administration)
   */
  getActiveSubscribers(): Observable<INewsletterSubscriber[]> {
    return this.http
      .get<{ success: boolean; data: INewsletterSubscriber[] }>(
        `${this.apiUrl}/newsletter/active`
      )
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error('Error fetching active subscribers', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère la liste des utilisateurs désabonnés (pour l'administration)
   */
  getUnsubscribedUsers(): Observable<INewsletterSubscriber[]> {
    return this.http
      .get<{ success: boolean; data: INewsletterSubscriber[] }>(
        `${this.apiUrl}/newsletter/unsubscribed`
      )
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error('Error fetching unsubscribed users', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère tous les abonnés (pour l'administration)
   */
  getAllSubscribers(): Observable<INewsletterSubscriber[]> {
    return this.http
      .get<{ success: boolean; data: INewsletterSubscriber[] }>(
        `${this.apiUrl}/newsletter-subscribers`
      )
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error('Error fetching all subscribers', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère un abonné par ID (pour l'administration)
   */
  getSubscriberById(id: number): Observable<INewsletterSubscriber | null> {
    return this.http
      .get<{ success: boolean; data: INewsletterSubscriber }>(
        `${this.apiUrl}/newsletter-subscribers/${id}`
      )
      .pipe(
        map((response) => response.data),
        catchError((error) => {
          console.error(`Error fetching subscriber with ID ${id}`, error);
          return of(null);
        })
      );
  }

  /**
   * Met à jour un abonné (pour l'administration)
   */
  updateSubscriber(
    id: number,
    data: Partial<INewsletterSubscriber>
  ): Observable<{ status: string; message: string }> {
    return this.http
      .put<{ success: boolean; message: string }>(
        `${this.apiUrl}/newsletter-subscribers/${id}`,
        data
      )
      .pipe(
        map((response) => ({
          status: response.success ? 'success' : 'error',
          message: response.message || 'Abonné mis à jour avec succès.',
        })),
        catchError((error) => {
          console.error(`Error updating subscriber with ID ${id}`, error);
          return of({
            status: 'error',
            message:
              error.error?.message ||
              'Une erreur est survenue lors de la mise à jour.',
          });
        })
      );
  }

  /**
   * Supprime un abonné (pour l'administration)
   */
  deleteSubscriber(
    id: number
  ): Observable<{ status: string; message: string }> {
    return this.http
      .delete<{ success: boolean; message: string }>(
        `${this.apiUrl}/newsletter-subscribers/${id}`
      )
      .pipe(
        map((response) => ({
          status: response.success ? 'success' : 'error',
          message: response.message || 'Abonné supprimé avec succès.',
        })),
        catchError((error) => {
          console.error(`Error deleting subscriber with ID ${id}`, error);
          return of({
            status: 'error',
            message:
              error.error?.message ||
              'Une erreur est survenue lors de la suppression.',
          });
        })
      );
  }
}
