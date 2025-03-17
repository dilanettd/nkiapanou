import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import {
  IProductReview,
  IProduct,
} from '../../../../core/models2/product.model';
import { ProductService } from '../../../../core/services/product/product.service';
import { ReviewService } from '../../../../core/services/review/review.service';

@Component({
  selector: 'nkiapanou-reviews',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnInit {
  private reviewService = inject(ReviewService);
  private productService = inject(ProductService);
  private formBuilder = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Display properties
  reviews: IProductReview[] = [];
  products: IProduct[] = [];
  loading = true;
  totalItems = 0;
  pageSize = 10;
  currentPage = 1;
  selectedReview: IProductReview | null = null;
  isDetailModalOpen = false;

  // Filter properties
  filterForm!: FormGroup;
  sortOptions = [
    { value: 'created_at-desc', label: "Date (récent d'abord)" },
    { value: 'created_at-asc', label: "Date (ancien d'abord)" },
    { value: 'rating-desc', label: "Note (meilleure d'abord)" },
    { value: 'rating-asc', label: "Note (moins bonne d'abord)" },
    { value: 'product-asc', label: 'Produit (A-Z)' },
    { value: 'product-desc', label: 'Produit (Z-A)' },
    { value: 'user-asc', label: 'Utilisateur (A-Z)' },
    { value: 'user-desc', label: 'Utilisateur (Z-A)' },
  ];

  statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'published', label: 'Publié' },
    { value: 'pending', label: 'En attente' },
    { value: 'rejected', label: 'Rejeté' },
  ];

  ratingOptions = [
    { value: '', label: 'Toutes les notes' },
    { value: '5', label: '5 étoiles' },
    { value: '4', label: '4 étoiles' },
    { value: '3', label: '3 étoiles' },
    { value: '2', label: '2 étoiles' },
    { value: '1', label: '1 étoile' },
  ];

  ngOnInit(): void {
    this.initFilterForm();
    this.loadProducts();
    this.loadReviews();
  }

  private initFilterForm(): void {
    this.filterForm = this.formBuilder.group({
      search: [''],
      sort: ['created_at-desc'],
      status: ['all'],
      product_id: [''],
      rating: [''],
    });

    // Subscribe to form value changes to apply filters
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage = 1; // Reset to first page when filters change
      this.loadReviews();
    });
  }

  loadProducts(): void {
    this.productService.getProducts({ limit: 100 }).subscribe((response) => {
      if (response.status === 'success') {
        this.products = response.data.products;
      }
    });
  }

  loadReviews(): void {
    this.loading = true;

    // Get filter values
    const { search, sort, status, product_id, rating } = this.filterForm.value;

    // Parse sort value
    let sortBy: string | undefined;
    let sortDirection: 'asc' | 'desc' | undefined;

    if (sort) {
      const [field, direction] = sort.split('-');
      sortBy = field;
      sortDirection = direction as 'asc' | 'desc';
    }

    // Build params
    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      search: search || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
      status: status || undefined,
      product_id: product_id ? parseInt(product_id, 10) : undefined,
      rating: rating ? parseInt(rating, 10) : undefined,
    };

    this.reviewService.getReviews(params).subscribe(
      (response) => {
        if (response.status === 'success') {
          this.reviews = response.data.reviews;
          this.totalItems = response.data.total;
        } else {
          this.toastr.error('Erreur lors du chargement des avis', 'Erreur');
        }
        this.loading = false;
      },
      (error) => {
        this.toastr.error('Erreur de connexion au serveur', 'Erreur');
        this.loading = false;
      }
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadReviews();
  }

  changePageSize(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.pageSize = parseInt(selectElement.value, 10);
    this.currentPage = 1; // Reset to first page when changing page size
    this.loadReviews();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get pages(): number[] {
    const pageCount = this.totalPages;

    // Show maximum 5 page buttons
    if (pageCount <= 5) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    // Complex pagination logic for many pages
    if (this.currentPage <= 3) {
      return [1, 2, 3, 4, 5, -1, pageCount];
    } else if (this.currentPage >= pageCount - 2) {
      return [
        1,
        -1,
        pageCount - 4,
        pageCount - 3,
        pageCount - 2,
        pageCount - 1,
        pageCount,
      ];
    } else {
      return [
        1,
        -1,
        this.currentPage - 1,
        this.currentPage,
        this.currentPage + 1,
        -1,
        pageCount,
      ];
    }
  }

  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      sort: 'created_at-desc',
      status: 'all',
      product_id: '',
      rating: '',
    });
  }

  getProductName(productId: number): string {
    const product = this.products.find((p) => p.id === productId);
    return product ? product.name : `Produit #${productId}`;
  }

  getStatusLabel(status: string | undefined): string {
    return this.reviewService.getStatusLabel(status);
  }

  getStatusClass(status: string | undefined): string {
    return this.reviewService.getStatusClass(status);
  }

  getRatingColor(rating: number): string {
    return this.reviewService.getRatingColor(rating);
  }

  getUserInitials(name: string | undefined): string {
    return this.reviewService.getUserInitials(name);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // Actions sur les avis
  updateReviewStatus(
    review: IProductReview,
    status: 'published' | 'pending' | 'rejected'
  ): void {
    this.reviewService.updateReviewStatus(review.id, status).subscribe(
      (updatedReview) => {
        if (updatedReview) {
          // Mise à jour de l'avis dans la liste
          const index = this.reviews.findIndex((r) => r.id === review.id);
          if (index !== -1) {
            this.reviews[index] = updatedReview;
          }

          // Si on est en train de voir le détail de cet avis, mettre à jour également
          if (this.selectedReview && this.selectedReview.id === review.id) {
            this.selectedReview = updatedReview;
          }

          this.toastr.success(`Statut de l'avis mis à jour`, 'Succès');
        } else {
          this.toastr.error(
            `Erreur lors de la mise à jour du statut`,
            'Erreur'
          );
        }
      },
      (error) => {
        this.toastr.error('Erreur de connexion au serveur', 'Erreur');
      }
    );
  }

  deleteReview(review: IProductReview): void {
    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer cet avis ? Cette action est irréversible.`
      )
    ) {
      this.reviewService.deleteReview(review.id).subscribe(
        (response) => {
          if (response.success) {
            // Fermer la modal si elle est ouverte sur cet avis
            if (this.selectedReview && this.selectedReview.id === review.id) {
              this.closeDetailModal();
            }

            // Recharger les avis
            this.loadReviews();
            this.toastr.success('Avis supprimé avec succès', 'Succès');
          } else {
            this.toastr.error(
              "Erreur lors de la suppression de l'avis",
              'Erreur'
            );
          }
        },
        (error) => {
          this.toastr.error('Erreur de connexion au serveur', 'Erreur');
        }
      );
    }
  }

  // Gestion de la modal de détail
  openDetailModal(review: IProductReview): void {
    this.selectedReview = review;
    this.isDetailModalOpen = true;
  }

  closeDetailModal(): void {
    this.selectedReview = null;
    this.isDetailModalOpen = false;
  }

  // Génération de l'URL d'avatar
  getAvatarUrl(review: IProductReview): string {
    return (
      review.user?.profile_image ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        review.user?.name || 'User'
      )}&background=ebc435&color=111111&size=128`
    );
  }

  // Génération du texte des étoiles
  getRatingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  truncateComment(comment: string, maxLength: number = 100): string {
    if (comment.length <= maxLength) {
      return comment;
    }
    return comment.substring(0, maxLength) + '...';
  }
}
