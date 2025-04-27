import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ICategory } from '../../models/category.model';
import { environment } from '../../../../environments/environment';
import { handleHttpError } from '../errors';

export interface CategorySearchParams {
  page?: number;
  limit?: number;
  search?: string;
  parent_id?: number | string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  status?: 'active' | 'inactive' | 'all';
  parent_only?: boolean;
}

export interface CategoryResponse {
  status: string;
  data: {
    categories: ICategory[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface SingleCategoryResponse {
  status: string;
  data: ICategory;
}

export interface CategoriesListResponse {
  status: string;
  data: ICategory[];
}

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;

  constructor() {}

  /**
   * Récupère les catégories selon les critères de recherche
   */
  getCategories(
    params: CategorySearchParams = {}
  ): Observable<CategoryResponse> {
    return this.http
      .get<CategoryResponse>(`${this.apiUrl}/categories`, {
        params: this.buildParams(params),
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Récupère uniquement les catégories parentes (pour les menus)
   */
  getParentCategories(): Observable<ICategory[]> {
    return this.http
      .get<CategoriesListResponse>(`${this.apiUrl}/categories/parents`)
      .pipe(
        map((response) => (response.status === 'success' ? response.data : [])),
        catchError((error) => {
          handleHttpError(error);
          return [];
        })
      );
  }

  /**
   * Récupère toutes les catégories organisées hiérarchiquement
   */
  getAllCategories(): Observable<ICategory[]> {
    return this.http
      .get<CategoriesListResponse>(`${this.apiUrl}/categories/all`)
      .pipe(
        map((response) => (response.status === 'success' ? response.data : [])),
        catchError((error) => {
          handleHttpError(error);
          return [];
        })
      );
  }

  /**
   * Récupère une catégorie par son ID
   */
  getCategoryById(id: number): Observable<ICategory | null> {
    return this.http
      .get<SingleCategoryResponse>(`${this.apiUrl}/categories/${id}`)
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
   * Récupère une catégorie par son slug
   */
  getCategoryBySlug(slug: string): Observable<ICategory | null> {
    return this.http
      .get<SingleCategoryResponse>(`${this.apiUrl}/categories/slug/${slug}`)
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
   * Récupère les produits d'une catégorie
   */
  getCategoryProducts(categoryId: number, params: any = {}): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/categories/${categoryId}/products`, {
        params: this.buildProductParams(params),
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Récupère tous les produits d'une catégorie, y compris ceux des sous-catégories
   */
  getAllCategoryProducts(
    categoryId: number,
    params: any = {}
  ): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/categories/${categoryId}/all-products`, {
        params: this.buildProductParams(params),
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Crée une nouvelle catégorie
   */
  createCategory(
    categoryData: Partial<ICategory>
  ): Observable<SingleCategoryResponse> {
    return this.http
      .post<SingleCategoryResponse>(`${this.apiUrl}/categories`, categoryData)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Met à jour une catégorie existante
   */
  updateCategory(
    id: number,
    categoryData: Partial<ICategory>
  ): Observable<SingleCategoryResponse> {
    return this.http
      .put<SingleCategoryResponse>(
        `${this.apiUrl}/categories/${id}`,
        categoryData
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Supprime une catégorie
   */
  deleteCategory(id: number): Observable<{ status: string; message: string }> {
    return this.http
      .delete<{ status: string; message: string }>(
        `${this.apiUrl}/categories/${id}`
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Change le statut d'une catégorie (active/inactive)
   */
  updateCategoryStatus(
    id: number,
    status: 'active' | 'inactive'
  ): Observable<SingleCategoryResponse> {
    return this.http
      .patch<SingleCategoryResponse>(`${this.apiUrl}/categories/${id}/status`, {
        status,
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Bascule le statut d'une catégorie (active/inactive)
   */
  toggleCategoryStatus(id: number): Observable<SingleCategoryResponse> {
    return this.http
      .patch<SingleCategoryResponse>(
        `${this.apiUrl}/categories/${id}/status/toggle`,
        {}
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Télécharge une image pour une catégorie
   */
  uploadCategoryImage(file: File): Observable<{ status: string; url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<{ status: string; url: string }>(
        `${this.apiUrl}/upload/category`,
        formData
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Obtient une image placeholder pour une catégorie
   */
  getPlaceholderImage(categoryName: string = 'Catégorie'): string {
    return `https://placehold.co/600x400/eeede5/333333?text=${encodeURIComponent(
      categoryName
    )}`;
  }

  /**
   * Construit les paramètres de requête HTTP à partir des paramètres de recherche
   * @private
   */
  private buildParams(params: CategorySearchParams): HttpParams {
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

    if (params.parent_id !== undefined) {
      httpParams = httpParams.set('parent_id', params.parent_id.toString());
    }

    if (params.sort_by !== undefined) {
      httpParams = httpParams.set('sort_by', params.sort_by);
    }

    if (params.sort_direction !== undefined) {
      httpParams = httpParams.set('sort_direction', params.sort_direction);
    }

    if (params.status !== undefined) {
      httpParams = httpParams.set('status', params.status);
    }

    if (params.parent_only !== undefined) {
      httpParams = httpParams.set('parent_only', params.parent_only.toString());
    }

    return httpParams;
  }

  /**
   * Construit les paramètres de requête HTTP pour les produits
   * @private
   */
  private buildProductParams(params: any): HttpParams {
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

    if (params.min_price !== undefined) {
      httpParams = httpParams.set('min_price', params.min_price.toString());
    }

    if (params.max_price !== undefined) {
      httpParams = httpParams.set('max_price', params.max_price.toString());
    }

    if (params.status !== undefined) {
      httpParams = httpParams.set('status', params.status);
    }

    if (params.featured !== undefined) {
      httpParams = httpParams.set('featured', params.featured.toString());
    }

    return httpParams;
  }
}
