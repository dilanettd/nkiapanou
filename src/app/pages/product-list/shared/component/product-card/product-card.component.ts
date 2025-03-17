import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { IProduct } from '../../../../../core/models2/product.model';
import { WishlistService } from '../../../../../core/services/wishlist/wishlist.service';
import { CartService } from '../../../../../core/services/cart/cart.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'nkiapanou-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  @Input() product!: IProduct;
  @Input() isInWishlist = false;

  @Output() addToWishlistEvent = new EventEmitter<number>();
  @Output() removeFromWishlistEvent = new EventEmitter<number>();
  @Output() addToCartEvent = new EventEmitter<number>();

  get discountPercentage(): number {
    if (!this.product.discount_price) {
      return 0;
    }
    return Math.round(
      ((this.product.price - this.product.discount_price) /
        this.product.price) *
        100
    );
  }

  get primaryImage(): string {
    if (
      !this.product ||
      !this.product.images ||
      this.product.images.length === 0
    ) {
      return 'assets/images/placeholder.jpg';
    }

    const primaryImage = this.product.images.find((img) => img.is_primary);
    return (
      primaryImage?.image_path ||
      this.product.images[0]?.image_path ||
      'assets/images/placeholder.jpg'
    );
  }

  toggleWishlist(): void {
    if (this.isInWishlist) {
      this.removeFromWishlistEvent.emit(this.product.id);
    } else {
      this.addToWishlistEvent.emit(this.product.id);
    }
  }

  addToCart(): void {
    this.addToCartEvent.emit(this.product.id);
  }
}
