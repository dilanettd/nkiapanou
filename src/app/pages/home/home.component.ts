import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { CarouselComponent } from '../../shared/components/carousel/carousel/carousel.component';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { finalize, catchError, of, Observable } from 'rxjs';
import { ICategory } from '../../core/models2/category.model';
import { IProduct, IProductReview } from '../../core/models2/product.model';
import { CategoryService } from '../../core/services/category/category.service';
import { ProductService } from '../../core/services/product/product.service';
import { ReviewService } from '../../core/services/review/review.service';
import { NewsletterService } from '../../core/services/testimonial/newsletter.service';
import { TestimonialCarouselComponent } from './shared/components/testimonial-carousel/testimonial-carousel.component';
import { WishlistService } from '../../core/services/wishlist/wishlist.service';
import { CartService } from '../../core/services/cart/cart.service';

@Component({
  selector: 'nkiapanou-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TestimonialCarouselComponent,
    CarouselComponent,
  ],
  templateUrl: './home.component.html',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '500ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
})
export class HomeComponent implements OnInit {
  // Produits tendance
  trendingProducts: IProduct[] = [];

  // Catégories
  categories: ICategory[] = [];
  productCategories: ICategory[] = [];
  selectedCategory: string = '';
  selectedCategoryId: number | null = null;

  // Produits par catégorie
  productsByCategory: IProduct[] = [];

  // Témoignages clients
  customerReviews: IProductReview[] = [];

  // Newsletter
  newsletterForm: FormGroup;
  isSubmitting: boolean = false;

  // Indicateurs de chargement
  isLoadingTrending: boolean = false;
  isLoadingCategories: boolean = false;
  isLoadingCategoryProducts: boolean = false;
  isLoadingReviews: boolean = false;

  constructor(
    public productService: ProductService,
    private categoryService: CategoryService,
    private reviewService: ReviewService,
    private newsletterService: NewsletterService,
    private wishlistService: WishlistService,
    private cartService: CartService,
    private formBuilder: FormBuilder,
    private toastr: ToastrService
  ) {
    // Initialisation du formulaire de newsletter
    this.newsletterForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadTrendingProducts();
    this.loadCustomerReviews();
  }

  /**
   * Chargement des catégories
   */
  loadCategories(): void {
    this.isLoadingCategories = true;
    this.categoryService
      .getCategories()
      .pipe(
        finalize(() => (this.isLoadingCategories = false)),
        catchError((error) => {
          this.toastr.error('Erreur lors du chargement des catégories');
          // Retourner une réponse avec une structure cohérente, même en cas d'erreur
          return of({ data: { categories: [] } });
        })
      )
      .subscribe((res) => {
        // Accès sécurisé à la propriété 'data'
        const categories = res.data.categories || [];
        this.categories = categories;
        this.productCategories = categories;

        // Sélectionner la première catégorie par défaut
        if (categories.length > 0) {
          this.selectedCategory = categories[0].slug;
          this.loadProductsByCategory(categories[0].id);
        }
      });
  }

  /**
   * Chargement des produits tendance (featured = true, limité à 8)
   */
  loadTrendingProducts(): void {
    this.isLoadingTrending = true;
    this.productService
      .getProducts({
        page: 1,
        limit: 8,
        sort_by: 'created_at',
        sort_direction: 'desc',
      })
      .pipe(
        finalize(() => (this.isLoadingTrending = false)),
        catchError((error) => {
          this.toastr.error('Erreur lors du chargement des produits tendance');
          return of({
            status: 'error',
            data: {
              products: [],
              current_page: 1,
              per_page: 8,
              total: 0,
              last_page: 1,
            },
          });
        })
      )
      .subscribe((response) => {
        if (response.status === 'success') {
          // Filtrer pour ne garder que les produits mis en avant (featured)
          this.trendingProducts = response.data.products
            .filter((product) => product.featured)
            .slice(0, 8);
        }
      });
  }

  /**
   * Chargement des produits par catégorie
   */
  loadProductsByCategory(categoryId: number): void {
    this.isLoadingCategoryProducts = true;
    this.productService
      .getProducts({
        page: 1,
        limit: 100,
        category_id: categoryId,
      })
      .pipe(
        finalize(() => (this.isLoadingCategoryProducts = false)),
        catchError((error) => {
          this.toastr.error(
            'Erreur lors du chargement des produits par catégorie'
          );
          return of({
            status: 'error',
            data: {
              products: [],
              current_page: 1,
              per_page: 100,
              total: 0,
              last_page: 1,
            },
          });
        })
      )
      .subscribe((response) => {
        if (response.status === 'success') {
          this.productsByCategory = response.data.products.slice(0, 8);
        }
      });
  }

  /**
   * Sélection d'une catégorie
   */
  selectCategory(id: any): void {
    this.selectedCategory = id;
    const category = this.categories.find((cat) => cat.id === id);
    if (category) {
      this.loadProductsByCategory(category.id);
    }
  }

  /**
   * Récupération des produits par catégorie sélectionnée
   */
  getProductsByCategory(): IProduct[] {
    return this.productsByCategory;
  }

  /**
   * Chargement des témoignages clients
   */
  loadCustomerReviews(): void {
    this.isLoadingReviews = true;
    this.reviewService
      .getTopReviews(8)
      .pipe(
        finalize(() => (this.isLoadingReviews = false)),
        catchError((error) => {
          this.toastr.error('Erreur lors du chargement des témoignages');
          return of([]);
        })
      )
      .subscribe((reviews) => {
        this.customerReviews = reviews;
      });
  }

  /**
   * Soumission du formulaire de newsletter
   */
  onSubmitNewsletter(): void {
    if (this.newsletterForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const email = this.newsletterForm.get('email')?.value;
    const name = this.newsletterForm.get('name')?.value || undefined;

    this.newsletterService
      .subscribe(email, name)
      .pipe(
        finalize(() => (this.isSubmitting = false)),
        catchError((error) => {
          if (error.status === 422 && error.error?.errors?.email) {
            this.toastr.info(
              'Cette adresse email est déjà inscrite à notre newsletter.'
            );

            return of(null);
          }

          this.toastr.error("Erreur lors de l'inscription à la newsletter");
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response && response.status === 'success') {
          this.toastr.success(
            response.message ||
              'Merci pour votre inscription à notre newsletter !'
          );
          this.newsletterForm.reset();
        } else if (
          response &&
          response.status === 'error' &&
          response.message
        ) {
          this.toastr.error(response.message);
        }
      });
  }

  /**
   * Retourne la classe CSS pour les étoiles des avis
   */
  getStarClass(rating: number, index: number): string {
    return index < rating ? 'lni lni-star-filled' : 'lni lni-star';
  }

  /**
   * Vérifie si un produit est dans la liste des favoris
   */
  isInWishlist(productId: number): Observable<boolean> {
    return this.wishlistService.isInWishlist(productId);
  }

  /**
   * Ajoute ou retire un produit des favoris
   */
  toggleWishlist(product: IProduct, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.isInWishlist(product.id).subscribe((isInWishlist) => {
      if (isInWishlist) {
        this.wishlistService.removeFromWishlist(product.id).subscribe(() => {
          this.toastr.success(`${product.name} a été retiré de vos favoris`);
        });
      } else {
        this.wishlistService.addToWishlist(product).subscribe(() => {
          this.toastr.success(`${product.name} a été ajouté à vos favoris`);
        });
      }
    });
  }

  /**
   * Ajoute un produit au panier
   */
  addToCart(product: IProduct, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.cartService.addToCart(product.id, 1).subscribe(() => {
      this.toastr.success(`${product.name} a été ajouté au panier`);
    });
  }
}
