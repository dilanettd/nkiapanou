import {
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap, catchError, map, of } from 'rxjs';
import { IProduct, IProductReview } from '../../core/models/product.model';
import { AuthService } from '../../core/services/auth/auth.service';
import { CartService } from '../../core/services/cart/cart.service';
import { ProductService } from '../../core/services/product/product.service';
import { WishlistService } from '../../core/services/wishlist/wishlist.service';
import { ReviewService } from '../../core/services/review/review.service';
import { ProductCardComponent } from '../product-list/shared/component/product-card/product-card.component';
import { ToastrService } from 'ngx-toastr';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginModalComponent } from '../../shared/components/login-modal/login-modal.component';
import { RoundedAvatarComponent } from '../../shared/components/rounded-avatar/rounded-avatar.component';

interface ShareOption {
  name: string;
  icon: string;
  color: string;
  url: string;
}

@Component({
  selector: 'nkiapanou-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ProductCardComponent,
    RoundedAvatarComponent,
  ],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private productService = inject(ProductService);
  private wishlistService = inject(WishlistService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private reviewService = inject(ReviewService);
  modalService = inject(NgbModal);

  // Référence à l'élément de scroll de la galerie
  @ViewChild('galleryScroll') galleryScrollRef!: ElementRef;

  private destroy$ = new Subject<void>();

  // Données du produit
  product: IProduct | null = null;
  relatedProducts: IProduct[] = [];
  isLoading = true;
  errorMessage = '';

  // Gestion de l'état
  isInWishlist = false;
  quantity = 1;
  activeImageIndex = 0;
  isReviewFormVisible = false;

  // Variables pour le défilement de la galerie
  galleryScrollPosition = 0;
  galleryMaxScroll = 0;

  // Nouvel avis
  newReview = {
    rating: 5,
    comment: '',
  };

  // Options de partage social
  shareOptions: ShareOption[] = [];

  // Authentification
  isAuthenticated = false;

  // Tabs
  activeTab = 'description';

  ngOnInit(): void {
    // S'abonner aux changements d'état d'authentification via l'Observable
    this.authService
      .isAuthenticated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated) => {
        this.isAuthenticated = isAuthenticated;
      });

    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          this.isLoading = true;

          // Récupérer le paramètre de la route (peut être un ID ou un slug)
          const productParam = params['idOrSlug'];

          // Détecter si c'est un ID numérique ou un slug
          const isNumeric = /^\d+$/.test(productParam);

          if (isNumeric) {
            // C'est un ID numérique
            const productId = +productParam;
            return this.productService.getProductById(productId);
          } else {
            // C'est un slug
            return this.productService.getProductBySlug(productParam);
          }
        }),
        catchError((error) => {
          this.errorMessage = 'Impossible de charger le produit.';
          this.isLoading = false;
          this.toastr.error('Erreur lors du chargement du produit', 'Erreur');
          return of(null);
        })
      )
      .subscribe((product) => {
        if (product) {
          this.product = product;
          this.setupShareOptions();

          // Vérifier si le produit est dans la wishlist
          this.checkIfInWishlist();

          // Charger les produits associés
          this.loadRelatedProducts();

          // Charger les avis depuis le ReviewService
          if (product.id) {
            this.loadProductReviews(product.id);
          }

          // Calculer la taille maximale de défilement après un court délai
          setTimeout(() => this.calculateGalleryMaxScroll(), 300);
        } else if (!this.errorMessage) {
          this.errorMessage = 'Produit non trouvé.';
          this.toastr.error('Produit non trouvé', 'Erreur');
        }
        this.isLoading = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge les avis du produit via le ReviewService
   */
  private loadProductReviews(productId: number): void {
    this.reviewService
      .getProductReviews(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((reviews) => {
        if (this.product) {
          this.product.reviews = reviews;
        }
      });
  }

  /**
   * Formate un prix en nombre à deux décimales
   */
  formatPrice(price: any): string {
    // Convertir en nombre si c'est une chaîne
    const numPrice =
      typeof price === 'string' ? parseFloat(price) : Number(price);

    // Vérifier si c'est un nombre valide
    if (isNaN(numPrice)) {
      return '0.00';
    }

    // Formater à deux décimales
    return numPrice.toFixed(2);
  }

  /**
   * Calcule le pourcentage de réduction
   */
  calculateDiscountPercentage(): string {
    if (!this.product || !this.product.discount_price) {
      return '0';
    }

    const originalPrice =
      typeof this.product.price === 'string'
        ? parseFloat(this.product.price)
        : Number(this.product.price);

    const discountPrice =
      typeof this.product.discount_price === 'string'
        ? parseFloat(this.product.discount_price)
        : Number(this.product.discount_price);

    if (isNaN(originalPrice) || isNaN(discountPrice) || originalPrice === 0) {
      return '0';
    }

    const percentage = ((originalPrice - discountPrice) / originalPrice) * 100;
    return percentage.toFixed(0);
  }

  /**
   * Obtient une image placeholder avec le nom du produit
   */
  getPlaceholderImage(productName: string = 'Produit'): string {
    // Utiliser le service pour obtenir l'image placeholder
    return this.productService.getPlaceholderImage(productName);
  }

  /**
   * Calcule la taille maximale de défilement pour la galerie
   */
  calculateGalleryMaxScroll(): void {
    if (this.galleryScrollRef && this.galleryScrollRef.nativeElement) {
      const element = this.galleryScrollRef.nativeElement;
      this.galleryMaxScroll = element.scrollWidth - element.clientWidth;
    }
  }

  /**
   * Fait défiler la galerie vers la gauche
   */
  scrollGalleryLeft(): void {
    if (this.galleryScrollRef && this.galleryScrollRef.nativeElement) {
      const element = this.galleryScrollRef.nativeElement;
      const scrollAmount = 80; // La largeur approximative d'une vignette
      element.scrollLeft -= scrollAmount;

      // Mettre à jour la position actuelle
      setTimeout(() => {
        this.galleryScrollPosition = element.scrollLeft;
      }, 100);
    }
  }

  /**
   * Fait défiler la galerie vers la droite
   */
  scrollGalleryRight(): void {
    if (this.galleryScrollRef && this.galleryScrollRef.nativeElement) {
      const element = this.galleryScrollRef.nativeElement;
      const scrollAmount = 80; // La largeur approximative d'une vignette
      element.scrollLeft += scrollAmount;

      // Mettre à jour la position actuelle
      setTimeout(() => {
        this.galleryScrollPosition = element.scrollLeft;
      }, 100);
    }
  }

  /**
   * Configure les options de partage social
   */
  private setupShareOptions(): void {
    if (!this.product) return;

    const url = window.location.href;
    const title = this.product.name;
    const description = this.product.description || '';
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);

    this.shareOptions = [
      {
        name: 'WhatsApp',
        icon: 'lni lni-whatsapp',
        color: 'bg-green-500',
        url: `https://wa.me/?text=${encodedTitle}%20-%20${encodedDescription}%20${encodedUrl}`,
      },
      {
        name: 'Facebook',
        icon: 'lni lni-facebook',
        color: 'bg-blue-600',
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        name: 'Twitter',
        icon: 'lni lni-twitter',
        color: 'bg-blue-400',
        url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      },
      {
        name: 'Telegram',
        icon: 'lni lni-telegram',
        color: 'bg-blue-500',
        url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      },
      {
        name: 'LinkedIn',
        icon: 'lni lni-linkedin',
        color: 'bg-blue-700',
        url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      },
      {
        name: 'Email',
        icon: 'lni lni-envelope',
        color: 'bg-gray-600',
        url: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`,
      },
    ];
  }

  /**
   * Vérifie si le produit est dans la wishlist
   */
  private checkIfInWishlist(): void {
    if (!this.product) return;

    this.wishlistService
      .isInWishlist(this.product.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((isInWishlist) => {
        this.isInWishlist = isInWishlist;
      });
  }

  /**
   * Charge les produits de la même catégorie
   */
  private loadRelatedProducts(): void {
    if (!this.product || !this.product.category_id) return;

    this.productService
      .getProducts({
        category_id: this.product.category_id,
        limit: 4,
      })
      .pipe(
        takeUntil(this.destroy$),
        map((response) => {
          // Filtrer pour exclure le produit actuel
          return response.data.products.filter(
            (p) => p.id !== this.product?.id
          );
        })
      )
      .subscribe((products) => {
        this.relatedProducts = products.slice(0, 4); // Limiter à 4 produits max
      });
  }

  /**
   * Change l'image active
   */
  setActiveImage(index: number): void {
    this.activeImageIndex = index;
  }

  /**
   * Change l'onglet actif
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  /**
   * Ajoute ou retire le produit de la wishlist
   */
  toggleWishlist(): void {
    if (!this.product) return;

    // Vérification réactive de l'authentification
    if (!this.isAuthenticated) {
      this.toastr.warning('Veuillez vous connecter pour ajouter aux favoris');
      this.modalService.open(LoginModalComponent);
      return;
    }

    if (this.isInWishlist) {
      this.wishlistService
        .removeFromWishlist(this.product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.isInWishlist = false;
          this.toastr.success('Produit retiré des favoris', 'Succès');
        });
    } else {
      this.wishlistService
        .addToWishlist(this.product)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.isInWishlist = true;
          this.toastr.success('Produit ajouté aux favoris', 'Succès');
        });
    }
  }

  /**
   * Ajoute le produit au panier
   */
  addToCart(): void {
    if (!this.product) return;

    // Vérifier si le produit est en stock
    if (this.product.quantity <= 0 || this.product.status !== 'active') {
      this.toastr.error('Ce produit est épuisé', 'Produit indisponible');
      return;
    }

    this.cartService
      .addToCart(this.product.id, this.quantity)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.toastr.success(
          `${this.product?.name} ajouté au panier`,
          'Produit ajouté'
        );
      });
  }

  /**
   * Procède au paiement (aller à la page panier)
   */
  proceedToCheckout(): void {
    if (!this.product) return;

    // Vérifier si le produit est en stock
    if (this.product.quantity <= 0 || this.product.status !== 'active') {
      this.toastr.error('Ce produit est épuisé', 'Produit indisponible');
      return;
    }

    this.addToCart();
    this.router.navigate(['/cart']);
    this.toastr.info('Redirection vers le panier...', 'Produit ajouté');
  }

  /**
   * Partage le produit sur un réseau social
   */
  shareProduct(option: ShareOption): void {
    window.open(option.url, '_blank');
    this.toastr.info(`Partage sur ${option.name}`, 'Partage');
  }

  /**
   * Montre le formulaire d'ajout d'avis
   */
  showReviewForm(): void {
    // Vérification réactive de l'authentification
    if (!this.isAuthenticated) {
      this.toastr.warning('Veuillez vous connecter pour laisser un avis');
      this.modalService.open(LoginModalComponent);
      return;
    }

    this.isReviewFormVisible = true;
    this.newReview = {
      rating: 5,
      comment: '',
    };
  }

  /**
   * Soumet un nouvel avis
   */
  submitReview(): void {
    if (!this.product) return;

    // Vérification réactive de l'authentification
    if (!this.isAuthenticated) {
      this.toastr.warning('Veuillez vous connecter pour laisser un avis');
      this.modalService.open(LoginModalComponent);
      return;
    }

    this.reviewService
      .addReview(this.product.id, this.newReview.rating, this.newReview.comment)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // S'assurer que le tableau de reviews existe
          if (!this.product!.reviews) {
            this.product!.reviews = [];
          }

          // Ajouter la review retournée par le backend au début du tableau
          if (response && response.data) {
            this.product!.reviews.unshift(response.data);
          }

          // Fermer le formulaire et afficher un message de succès
          this.isReviewFormVisible = false;
          this.toastr.success(
            'Votre avis a été publié',
            'Merci pour votre avis!'
          );

          // Réinitialiser le formulaire
          this.newReview = {
            rating: 5,
            comment: '',
          };
        },
        error: (error) => {
          // Gestion simple des erreurs
          this.toastr.error("Erreur lors de l'ajout de l'avis", 'Erreur');
        },
      });
  }

  /**
   * Calcule la note moyenne des avis
   */
  getAverageRating(): number {
    if (
      !this.product ||
      !this.product.reviews ||
      this.product.reviews.length === 0
    ) {
      return 0;
    }

    const total = this.product.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    return total / this.product.reviews.length;
  }

  /**
   * Incrémente la quantité
   */
  incrementQuantity(): void {
    if (this.product && this.quantity < this.product.quantity) {
      this.quantity++;
    }
  }

  /**
   * Décrémente la quantité
   */
  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  /**
   * Formate la date pour l'affichage
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Vérifie si un produit est dans la wishlist
   */
  isProductInWishlist(productId: number): boolean {
    let result = false;
    this.wishlistService.isInWishlist(productId).subscribe((isInWishlist) => {
      result = isInWishlist;
    });
    return result;
  }

  /**
   * Ajoute un produit à la wishlist (pour les produits associés)
   */
  addToWishlist(product: IProduct): void {
    // Vérification réactive de l'authentification
    if (!this.isAuthenticated) {
      this.toastr.warning('Veuillez vous connecter pour ajouter aux favoris');
      this.modalService.open(LoginModalComponent);
      return;
    }

    this.wishlistService.addToWishlist(product).subscribe(() => {
      this.toastr.success('Produit ajouté aux favoris', 'Succès');
    });
  }

  /**
   * Retire un produit de la wishlist (pour les produits associés)
   */
  removeFromWishlist(productId: number): void {
    // Vérification réactive de l'authentification
    if (!this.isAuthenticated) {
      this.toastr.warning('Veuillez vous connecter pour modifier vos favoris');
      this.modalService.open(LoginModalComponent);
      return;
    }

    this.wishlistService.removeFromWishlist(productId).subscribe(() => {
      this.toastr.success('Produit retiré des favoris', 'Succès');
    });
  }

  /**
   * Calcule le pourcentage de chaque note (pour les barres de distribution)
   */
  calculateRatingPercentage(rating: number): number {
    if (
      !this.product ||
      !this.product.reviews ||
      this.product.reviews.length === 0
    ) {
      return 0;
    }

    const count = this.countReviewsByRating(rating);
    const total = this.product.reviews.length;

    return (count / total) * 100;
  }

  /**
   * Compte le nombre d'avis pour chaque note (1-5)
   */
  countReviewsByRating(rating: number): number {
    if (!this.product || !this.product.reviews) {
      return 0;
    }

    return this.product.reviews.filter((review) => review.rating === rating)
      .length;
  }
}
