import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, forkJoin, Observable, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { IProduct, IProductImage } from '../../models2/product.model';
import { WishlistService } from '../wishlist/wishlist.service';
import { handleHttpError } from '../errors';

export interface ProductSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  min_price?: number;
  max_price?: number;
  status?: 'active' | 'inactive' | 'out_of_stock' | 'all';
  featured?: boolean;
}

export interface ProductsResponse {
  status: string;
  data: {
    products: IProduct[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface ProductImageData {
  url: string;
  isPrimary: boolean;
}

export interface SingleProductResponse {
  status: string;
  data: IProduct;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private http = inject(HttpClient);
  private wishlistService = inject(WishlistService);

  private apiUrl = environment.API_URL;
  private productsSubject = new BehaviorSubject<IProduct[]>([]);

  public products$ = this.productsSubject.asObservable();

  constructor() {}

  /**
   * Récupère les produits selon les critères de recherche
   */
  getProducts(params: ProductSearchParams = {}): Observable<ProductsResponse> {
    return this.http
      .get<ProductsResponse>(`${this.apiUrl}/products`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            this.productsSubject.next(response.data.products);
          }
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Récupère un produit par son ID
   */
  getProductById(id: number): Observable<IProduct | null> {
    return this.http
      .get<SingleProductResponse>(`${this.apiUrl}/products/${id}`)
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
   * Récupère un produit par son slug
   */
  getProductBySlug(slug: string): Observable<IProduct | null> {
    return this.http
      .get<SingleProductResponse>(`${this.apiUrl}/products/slug/${slug}`)
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
   * Crée un nouveau produit
   */
  createProduct(
    productData: Partial<IProduct>,
    productImages: ProductImageData[] = []
  ): Observable<SingleProductResponse> {
    return this.http
      .post<SingleProductResponse>(`${this.apiUrl}/products`, productData)
      .pipe(
        switchMap((response) => {
          if (response.status === 'success' && productImages.length > 0) {
            const productId = response.data.id;
            const imageRequests = productImages.map((img) =>
              this.addProductImage(productId, img.url, img.isPrimary)
            );

            return forkJoin(imageRequests).pipe(
              map(() => response),
              catchError((error) => {
                console.error(
                  "Erreur lors de l'ajout des images au produit:",
                  error
                );
                return of(response);
              })
            );
          }

          return of(response);
        }),
        catchError(handleHttpError)
      );
  }

  /**
   * Met à jour un produit existant
   */
  updateProduct(
    id: number,
    productData: Partial<IProduct>
  ): Observable<SingleProductResponse> {
    return this.http
      .put<SingleProductResponse>(`${this.apiUrl}/products/${id}`, productData)
      .pipe(catchError(handleHttpError));
  }

  /**
   * Supprime un produit
   */
  deleteProduct(id: number): Observable<{ status: string; message: string }> {
    return this.http
      .delete<{ status: string; message: string }>(
        `${this.apiUrl}/products/${id}`
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Change le statut d'un produit (active/inactive/out_of_stock)
   */
  updateProductStatus(
    id: number,
    status: 'active' | 'inactive' | 'out_of_stock'
  ): Observable<SingleProductResponse> {
    return this.http
      .patch<SingleProductResponse>(`${this.apiUrl}/products/${id}/status`, {
        status,
      })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Change la valeur featured d'un produit
   */
  toggleProductFeatured(id: number): Observable<SingleProductResponse> {
    return this.http
      .patch<SingleProductResponse>(
        `${this.apiUrl}/products/${id}/featured`,
        {}
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Télécharge une image de produit
   */
  uploadProductImage(file: File): Observable<{ status: string; url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<{ status: string; url: string }>(
        `${this.apiUrl}/upload/product`,
        formData
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Ajoute une image à un produit
   */
  addProductImage(
    productId: number,
    imageUrl: string,
    isPrimary: boolean = false
  ): Observable<IProductImage> {
    return this.http
      .post<{ status: string; data: IProductImage }>(
        `${this.apiUrl}/products/${productId}/images`,
        {
          image_path: imageUrl,
          is_primary: isPrimary,
        }
      )
      .pipe(
        map((response) => response.data),
        catchError(handleHttpError)
      );
  }

  /**
   * Définit une image comme image principale du produit
   */
  setProductImageAsPrimary(
    productId: number,
    imageId: number
  ): Observable<{ status: string; message: string }> {
    return this.http
      .patch<{ status: string; message: string }>(
        `${this.apiUrl}/products/${productId}/images/${imageId}/primary`,
        {}
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Met à jour une image de produit
   */
  updateProductImage(
    productId: number,
    imageId: number,
    isPrimary: boolean
  ): Observable<{ status: string; message: string }> {
    return this.http
      .patch<{ status: string; message: string }>(
        `${this.apiUrl}/products/${productId}/images/${imageId}`,
        { is_primary: isPrimary }
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Supprime une image de produit
   */
  deleteProductImage(
    productId: number,
    imageId: number
  ): Observable<{ status: string; message: string }> {
    return this.http
      .delete<{ status: string; message: string }>(
        `${this.apiUrl}/products/${productId}/images/${imageId}`
      )
      .pipe(catchError(handleHttpError));
  }

  /**
   * Ajoute un produit au panier
   */
  addToCart(productId: number, quantity: number = 1): Observable<any> {
    // Cette méthode devrait faire appel au CartService
    return this.http
      .post<any>(`${this.apiUrl}/cart/add`, { product_id: productId, quantity })
      .pipe(catchError(handleHttpError));
  }

  /**
   * Obtient une image placeholder pour un produit
   */
  getPlaceholderImage(productName: string = 'Produit'): string {
    return `https://placehold.co/600x600/eeede5/333333?text=${encodeURIComponent(
      productName
    )}`;
  }

  /**
   * Construit les paramètres de requête HTTP à partir des paramètres de recherche
   * @private
   */
  private buildParams(params: ProductSearchParams): HttpParams {
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

    if (params.category_id !== undefined) {
      httpParams = httpParams.set('category_id', params.category_id.toString());
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
