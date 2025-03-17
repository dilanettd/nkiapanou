import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { IProductReview } from '../../models2/product.model';
import { handleHttpError } from '../errors';

export interface ReviewSearchParams {
  page?: number;
  limit?: number;
  product_id?: number;
  user_id?: number;
  rating?: number;
  status?: 'published' | 'pending' | 'rejected' | 'all';
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  search?: string;
}

export interface ReviewsResponse {
  status: string;
  data: {
    reviews: IProductReview[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;

  private reviewsSubject = new BehaviorSubject<IProductReview[]>([]);
  public reviews$ = this.reviewsSubject.asObservable();

  constructor() {}

  /**
   * Récupère les avis pour l'administration avec filtres et pagination
   */
  getReviews(params: ReviewSearchParams = {}): Observable<ReviewsResponse> {
    return this.http
      .get<ReviewsResponse>(`${this.apiUrl}/admin/reviews`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            this.reviewsSubject.next(response.data.reviews);
          }
        }),
        catchError((error) => {
          handleHttpError(error);
          return [
            {
              status: 'error',
              data: {
                reviews: [],
                current_page: 1,
                per_page: 10,
                total: 0,
                last_page: 1,
              },
            },
          ];
        })
      );
  }

  /**
   * Ajoute un avis à un produit
   */
  addReview(
    productId: number,
    rating: number,
    comment: string
  ): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/reviews`, {
        rating,
        comment,
        product_id: productId,
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Récupère un avis spécifique par son ID
   */
  getReviewById(id: number): Observable<IProductReview | null> {
    return this.http
      .get<{ status: string; data: IProductReview }>(
        `${this.apiUrl}/admin/reviews/${id}`
      )
      .pipe(
        map((response) =>
          response.status === 'success' ? response.data : null
        ),
        catchError((error) => {
          handleHttpError(error);
          return [];
        })
      );
  }

  /**
   * Récupère les avis pour un produit spécifique (version publique)
   */
  getProductReviews(productId: number): Observable<IProductReview[]> {
    return this.http
      .get<{ status: string; data: IProductReview[] }>(
        `${this.apiUrl}/products/${productId}/reviews`
      )
      .pipe(
        map((response) => (response.status === 'success' ? response.data : [])),
        catchError((error) => {
          handleHttpError(error);
          return [];
        })
      );
  }

  /**
   * Récupère les meilleurs avis (les mieux notés)
   */
  getTopReviews(limit: number = 8): Observable<IProductReview[]> {
    return this.http
      .get<{ status: string; data: IProductReview[] }>(
        `${this.apiUrl}/reviews/top?limit=${limit}`
      )
      .pipe(
        map((response) => (response.status === 'success' ? response.data : [])),
        catchError((error) => {
          handleHttpError(error);
          return [];
        })
      );
  }

  /**
   * Récupère les avis d'un utilisateur
   */
  getUserReviews(userId?: number): Observable<IProductReview[]> {
    const url = userId
      ? `${this.apiUrl}/users/${userId}/reviews`
      : `${this.apiUrl}/user/reviews`;

    return this.http.get<{ status: string; data: IProductReview[] }>(url).pipe(
      map((response) => (response.status === 'success' ? response.data : [])),
      catchError((error) => {
        handleHttpError(error);
        return [];
      })
    );
  }

  /**
   * Soumet un nouvel avis
   */
  submitReview(
    reviewData: Partial<IProductReview>
  ): Observable<IProductReview | null> {
    return this.http
      .post<{ status: string; data: IProductReview }>(
        `${this.apiUrl}/reviews`,
        reviewData
      )
      .pipe(
        map((response) =>
          response.status === 'success' ? response.data : null
        ),
        catchError((error) => {
          handleHttpError(error);
          return [];
        })
      );
  }

  /**
   * Met à jour le statut d'un avis
   */
  updateReviewStatus(
    id: number,
    status: 'published' | 'pending' | 'rejected'
  ): Observable<IProductReview | null> {
    return this.http
      .patch<{ status: string; data: IProductReview }>(
        `${this.apiUrl}/admin/reviews/${id}/status`,
        { status }
      )
      .pipe(
        map((response) =>
          response.status === 'success' ? response.data : null
        ),
        catchError((error) => {
          handleHttpError(error);
          return [];
        })
      );
  }

  /**
   * Supprime un avis
   */
  deleteReview(id: number): Observable<{ success: boolean }> {
    return this.http
      .delete<{ status: string; message: string }>(
        `${this.apiUrl}/reviews/${id}`
      )
      .pipe(
        map((response) => ({ success: response.status === 'success' })),
        catchError((error) => {
          handleHttpError(error);
          return [{ success: false }];
        })
      );
  }

  /**
   * Construire les paramètres pour les requêtes HTTP
   */
  private buildParams(params: ReviewSearchParams): HttpParams {
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

    if (params.user_id !== undefined) {
      httpParams = httpParams.set('user_id', params.user_id.toString());
    }

    if (params.rating !== undefined) {
      httpParams = httpParams.set('rating', params.rating.toString());
    }

    if (params.status !== undefined && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }

    if (params.sort_by !== undefined) {
      httpParams = httpParams.set('sort_by', params.sort_by);
    }

    if (params.sort_direction !== undefined) {
      httpParams = httpParams.set('sort_direction', params.sort_direction);
    }

    if (params.search !== undefined && params.search.trim() !== '') {
      httpParams = httpParams.set('search', params.search);
    }

    return httpParams;
  }

  /**
   * Obtient une couleur correspondant à la note
   */
  getRatingColor(rating: number): string {
    if (rating >= 4.5) return 'bg-green-600';
    if (rating >= 3.5) return 'bg-green-500';
    if (rating >= 2.5) return 'bg-yellow-500';
    if (rating >= 1.5) return 'bg-orange-500';
    return 'bg-red-500';
  }

  /**
   * Obtient un texte correspondant au statut
   */
  getStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'published':
        return 'Publié';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Rejeté';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Obtient une classe CSS correspondant au statut
   */
  getStatusClass(status: string | undefined): string {
    switch (status) {
      case 'published':
        return 'status-published';
      case 'pending':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }

  /**
   * Génère des initiales à partir du nom d'un utilisateur
   */
  getUserInitials(name: string | undefined): string {
    if (!name) return 'U';

    const nameParts = name.split(' ');
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    }

    return (
      nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
    ).toUpperCase();
  }
}
