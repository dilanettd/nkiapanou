import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { WishlistService } from '../../../../core/services/wishlist/wishlist.service';
import { IProduct } from '../../../../core/models2/product.model';

@Component({
  selector: 'nkiapanou-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.scss',
})
export class WishlistComponent {
  wishlistItems: IProduct[] = [];
  loading: boolean = true;

  private wishlistService = inject(WishlistService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  ngOnInit(): void {
    this.loadWishlist();
  }

  /**
   * Charge la liste de souhaits
   */
  loadWishlist(): void {
    this.loading = true;

    this.wishlistService.getWishlist().subscribe({
      next: (products) => {
        this.wishlistItems = products;
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error('Erreur lors du chargement de la liste de souhaits');
        this.loading = false;
        console.error('Error loading wishlist:', error);
      },
    });
  }

  /**
   * Supprime un produit de la liste de souhaits
   */
  removeFromWishlist(productId: number, event: Event): void {
    // Empêcher la propagation pour éviter la navigation
    event.stopPropagation();

    this.wishlistService.removeFromWishlist(productId).subscribe({
      next: (products) => {
        this.wishlistItems = products;
        this.toastr.success('Produit retiré de la liste de souhaits');
      },
      error: (error) => {
        this.toastr.error('Erreur lors de la suppression du produit');
        console.error('Error removing from wishlist:', error);
      },
    });
  }

  /**
   * Vide complètement la liste de souhaits
   */
  clearWishlist(): void {
    if (this.wishlistItems.length === 0) return;

    if (confirm('Êtes-vous sûr de vouloir vider votre liste de souhaits ?')) {
      this.wishlistService.clearWishlist().subscribe({
        next: () => {
          this.wishlistItems = [];
          this.toastr.success('Liste de souhaits vidée avec succès');
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors de la suppression de la liste de souhaits'
          );
          console.error('Error clearing wishlist:', error);
        },
      });
    }
  }

  /**
   * Navigue vers la page de détails du produit
   */
  navigateToProduct(productId: number): void {
    this.router.navigate(['/product', productId]);
  }

  /**
   * Calcule le pourcentage de réduction
   */
  calculateDiscountPercentage(
    price: number,
    discountPrice?: number
  ): number | null {
    if (!discountPrice) return null;
    return Math.round(((price - discountPrice) / price) * 100);
  }
}
