import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Location, CommonModule } from '@angular/common';

import { Subject, takeUntil, lastValueFrom } from 'rxjs';
import { ICartItem } from '../../core/models2/order.model';
import { IProduct } from '../../core/models2/product.model';
import { CartService } from '../../core/services/cart/cart.service';
import { ProductService } from '../../core/services/product/product.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface CartItemWithProduct extends ICartItem {
  productDetails?: IProduct;
  subtotal: number;
}

@Component({
  selector: 'nkiapanou-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  private location = inject(Location);

  private destroy$ = new Subject<void>();

  cartItems: CartItemWithProduct[] = [];
  isLoading = true;
  cartTotal = 0;
  isSyncing = false;

  ngOnInit(): void {
    // S'abonner au statut de synchronisation
    this.cartService.syncInProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isSyncing) => {
        this.isSyncing = isSyncing;
      });

    this.loadCartItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge les éléments du panier
   */
  loadCartItems(): void {
    this.isLoading = true;

    // Récupérer les articles du panier, ce qui synchronisera automatiquement avec le serveur si l'utilisateur est connecté
    this.cartService.getCart().subscribe(() => {
      // Maintenant on s'abonne aux changements du panier
      this.cartService.cartItems$
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (items) => {
          // Reset cart
          this.cartItems = [];
          this.cartTotal = 0;

          if (!items || items.length === 0) {
            this.isLoading = false;
            return;
          }

          // Pour chaque élément du panier, utiliser les détails du produit déjà présents ou les récupérer si nécessaire
          for (const item of items) {
            try {
              // Variable temporaire pour gérer le typage correctement
              let productData: IProduct | undefined;

              // Si le produit est déjà inclus dans l'élément du panier, l'utiliser
              if (item.product) {
                productData = item.product;
              } else {
                // Sinon, le récupérer depuis le service
                // Utiliser lastValueFrom au lieu de toPromise() qui est déprécié
                const fetchedProduct = await lastValueFrom(
                  this.productService.getProductById(item.product_id)
                );
                // Vérifier explicitement si le produit n'est pas null ou undefined
                if (fetchedProduct) {
                  productData = fetchedProduct;
                }
              }

              if (productData) {
                const price = productData.discount_price || productData.price;
                const subtotal = price * item.quantity;

                this.cartItems.push({
                  ...item,
                  productDetails: productData,
                  subtotal: subtotal,
                });

                this.cartTotal += subtotal;
              } else {
                // Si le produit n'existe pas, l'ajouter quand même mais sans détails
                this.cartItems.push({
                  ...item,
                  productDetails: undefined,
                  subtotal: 0,
                });
              }
            } catch (error) {
              console.error(`Error loading product ${item.product_id}:`, error);
              // Ajouter l'article même en cas d'erreur
              this.cartItems.push({
                ...item,
                productDetails: undefined,
                subtotal: 0,
              });
            }
          }

          this.isLoading = false;
        });
    });

    // S'abonner au total du panier
    this.cartService.cartSubtotal$
      .pipe(takeUntil(this.destroy$))
      .subscribe((total) => {
        // Si le total du service est disponible, l'utiliser directement
        if (total > 0) {
          this.cartTotal = total;
        }
      });
  }

  /**
   * Met à jour la quantité d'un article
   */
  updateQuantity(itemId: number, quantity: number): void {
    if (!itemId || !quantity || quantity < 1) {
      return;
    }

    // Convertir en nombre si c'est une chaîne
    const numQuantity =
      typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;

    // Vérifier les limites
    const item = this.cartItems.find((i) => i.id === itemId);
    if (item && item.productDetails) {
      const maxQty = item.productDetails.quantity || 99;
      if (numQuantity > maxQty) {
        return;
      }
    }

    // Mettre à jour la quantité localement pour une réactivité immédiate
    const itemIndex = this.cartItems.findIndex((i) => i.id === itemId);
    if (itemIndex !== -1) {
      const item = this.cartItems[itemIndex];
      const price = item.productDetails
        ? item.productDetails.discount_price || item.productDetails.price
        : 0;

      // Mettre à jour l'élément dans la liste locale
      this.cartItems[itemIndex] = {
        ...item,
        quantity: numQuantity,
        subtotal: price * numQuantity,
      };

      // Recalculer le total du panier
      this.recalculateCartTotal();
    }

    // Puis effectuer la mise à jour via le service
    this.cartService
      .updateCartItemQuantity(itemId, numQuantity)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  /**
   * Supprime un article du panier
   */
  removeItem(itemId: number): void {
    if (!itemId) return;

    // Supprimer l'élément localement pour une réactivité immédiate
    this.cartItems = this.cartItems.filter((item) => item.id !== itemId);
    this.recalculateCartTotal();

    // Puis effectuer la suppression via le service
    this.cartService
      .removeFromCart(itemId)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  /**
   * Vide le panier
   */
  clearCart(): void {
    if (confirm('Êtes-vous sûr de vouloir vider votre panier ?')) {
      // Vider le panier localement pour une réactivité immédiate
      this.cartItems = [];
      this.cartTotal = 0;

      // Puis effectuer le vidage via le service
      this.cartService.clearCart().pipe(takeUntil(this.destroy$)).subscribe();
    }
  }

  /**
   * Recalcule le total du panier
   */
  private recalculateCartTotal(): void {
    this.cartTotal = this.cartItems.reduce(
      (total, item) => total + item.subtotal,
      0
    );
  }

  /**
   * Afficher le prix formaté
   */
  formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined) {
      return '0.00 €';
    }

    // Transformer le nombre en chaîne avec un point décimal
    const priceStr = String(Math.round(price * 100) / 100);

    // Ajouter les décimales si nécessaire
    const parts = priceStr.split('.');
    const decimal = parts.length > 1 ? parts[1] : '0';
    const formattedDecimal = decimal.padEnd(2, '0').substring(0, 2);

    return `${parts[0]}.${formattedDecimal} €`;
  }

  /**
   * Retourne à la page précédente
   */
  goBack(): void {
    this.location.back();
  }
}
