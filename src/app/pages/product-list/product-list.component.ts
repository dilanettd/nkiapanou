import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import {
  tap,
  switchMap,
  takeUntil,
  Subject,
  BehaviorSubject,
  combineLatest,
  map,
} from 'rxjs';
import { IProduct } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart/cart.service';
import {
  ProductService,
  ProductSearchParams,
} from '../../core/services/product/product.service';
import { WishlistService } from '../../core/services/wishlist/wishlist.service';
import { ProductCardComponent } from './shared/component/product-card/product-card.component';
import { CategoryService } from '../../core/services/category/category.service';

@Component({
  selector: 'nkiapanou-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProductCardComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private wishlistService = inject(WishlistService);
  private cartService = inject(CartService);
  private categoryService = inject(CategoryService);

  // Pour la gestion des souscriptions
  private destroy$ = new Subject<void>();
  private refresh$ = new BehaviorSubject<void>(undefined);

  products: IProduct[] = [];
  isLoading = true;

  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalProducts = 0;
  productsPerPage = 8;

  // Titre et description de la page
  pageTitle = 'Nos Produits Africains';
  pageDescription =
    "Découvrez notre sélection de produits authentiques d'Afrique";

  // Paramètres de recherche et de filtrage
  currentCategoryId: number | null = null;
  currentCategoryName = '';
  searchTerm = '';

  // Cache pour éviter les requêtes inutiles
  private wishlistCache = new Map<number, boolean>();

  ngOnInit(): void {
    // Combinaison des observables pour éviter les requêtes en cascade
    combineLatest([this.route.queryParams, this.refresh$])
      .pipe(
        takeUntil(this.destroy$),
        map(([params]) => {
          // Extraire les paramètres de l'URL
          this.currentPage = params['page'] ? parseInt(params['page']) : 1;
          this.searchTerm = params['search'] || '';

          // Si une catégorie est spécifiée, mettre à jour le titre et la description
          if (params['category']) {
            this.currentCategoryId = parseInt(params['category']);
            // Ne pas charger la catégorie ici, ça créerait une requête en cascade
            return params;
          } else {
            this.currentCategoryId = null;
            this.currentCategoryName = '';
            this.pageTitle = 'Nos Produits Africains';
            this.pageDescription =
              "Découvrez notre sélection de produits authentiques d'Afrique";
            return params;
          }
        }),
        switchMap((params) => {
          this.isLoading = true;

          // Préparer les paramètres de recherche
          const searchParams: ProductSearchParams = {
            page: this.currentPage,
            limit: this.productsPerPage,
            search: this.searchTerm,
          };

          if (this.currentCategoryId) {
            searchParams.category_id = this.currentCategoryId;

            // Charger les informations de catégorie en parallèle
            this.categoryService
              .getCategoryById(this.currentCategoryId)
              .pipe(takeUntil(this.destroy$))
              .subscribe((category) => {
                if (category) {
                  this.currentCategoryName = category.name;
                  this.pageTitle = category.name;
                  this.pageDescription =
                    category.description ||
                    'Découvrez notre sélection de produits dans cette catégorie';
                }
              });
          }

          return this.productService.getProducts(searchParams);
        })
      )
      .subscribe((response) => {
        this.products = response.data.products;
        this.currentPage = response.data.current_page;
        this.totalProducts = response.data.total;
        this.totalPages = response.data.last_page;
        this.isLoading = false;
      });
  }

  ngOnDestroy(): void {
    // Nettoyer toutes les souscriptions
    this.destroy$.next();
    this.destroy$.complete();
    this.wishlistCache.clear();
  }

  /**
   * Change la page courante
   */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page },
      queryParamsHandling: 'merge', // Conserver les autres paramètres
    });
  }

  /**
   * Vérifie si un produit est dans la wishlist avec cache
   */
  isInWishlist(productId: number): boolean {
    // Vérifier le cache d'abord
    if (this.wishlistCache.has(productId)) {
      return this.wishlistCache.get(productId) || false;
    }

    // Si pas en cache, récupérer et stocker
    this.wishlistService
      .isInWishlist(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((isInWishlist) => {
        this.wishlistCache.set(productId, isInWishlist);
      });

    // En attendant la réponse, supposer que non
    return false;
  }

  /**
   * Ajoute un produit à la wishlist
   */
  addToWishlist(product: IProduct): void {
    this.wishlistService
      .addToWishlist(product)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Mettre à jour le cache
        this.wishlistCache.set(product.id, true);
      });
  }

  /**
   * Retire un produit de la wishlist
   */
  removeFromWishlist(productId: number): void {
    this.wishlistService
      .removeFromWishlist(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Mettre à jour le cache
        this.wishlistCache.set(productId, false);
      });
  }

  /**
   * Ajoute un produit au panier
   */
  addToCart(productId: number): void {
    this.cartService
      .addToCart(productId, 1)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  /**
   * Suivi des produits dans ngFor
   */
  trackByFn(index: number, product: IProduct): number {
    return product.id;
  }
}
