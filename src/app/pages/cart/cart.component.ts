import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, takeUntil, lastValueFrom, finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ICartItem } from '../../core/models/order.model';
import { IProduct } from '../../core/models/product.model';
import { IUserAddress } from '../../core/models/user.model';
import { CartService } from '../../core/services/cart/cart.service';
import { ProductService } from '../../core/services/product/product.service';
import { UserService } from '../../core/services/user/user.service';
import { ShippingService } from '../../core/services/shipping/shipping.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { OrderService } from '../../core/services/order/order.service';
import { FilteredByPipe } from '../../core/pipes/filtered-by.pipe';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginModalComponent } from '../../shared/components/login-modal/login-modal.component';

interface CartItemWithProduct extends ICartItem {
  productDetails?: IProduct;
  subtotal: number;
}

@Component({
  selector: 'nkiapanou-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    FilteredByPipe,
  ],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  private userService = inject(UserService);
  private shippingService = inject(ShippingService);
  private authService = inject(AuthService);
  private orderService = inject(OrderService);
  private formBuilder = inject(FormBuilder);
  private location = inject(Location);
  private toastr = inject(ToastrService);
  private modalService = inject(NgbModal);
  private router = inject(Router);

  private destroy$ = new Subject<void>();

  // Panier
  cartItems: CartItemWithProduct[] = [];
  isLoading = true;
  cartSubtotal = 0;
  shippingCost = 0;
  taxAmount = 0;
  cartTotal = 0;
  isSyncing = false;
  isProcessingOrder = false;

  // Adresses
  userAddresses: IUserAddress[] = [];
  loadingAddresses = false;
  shippingAddressForm: FormGroup;
  selectedShippingAddressId: number | null = null;
  showAddressForm = false;
  editingAddressType: 'shipping' | null = null;
  isCalculatingShipping = false;

  // Méthode de paiement
  selectedPaymentMethod: 'stripe' | 'paypal' = 'stripe';

  // Pays disponibles pour le dropdown
  countries: { code: string; name: string }[] = [];

  // États du composant
  isAuthenticated = false;

  constructor() {
    // Initialiser le formulaire d'adresse
    this.shippingAddressForm = this.formBuilder.group({
      recipient_name: ['', [Validators.required]],
      address_line1: ['', [Validators.required]],
      address_line2: [''],
      city: ['', [Validators.required]],
      state_province: [''],
      postal_code: ['', [Validators.required]],
      country: ['', [Validators.required]],
      phone_number: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    // S'abonner au statut de synchronisation du panier
    this.cartService.syncInProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isSyncing) => {
        this.isSyncing = isSyncing;
      });

    // Charger les pays disponibles
    this.shippingService
      .getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        this.countries = countries;
      });

    this.loadCartItems();
    this.authService
      .isAuthenticated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuth) => {
        this.isAuthenticated = isAuth;
        if (isAuth) {
          this.loadUserAddresses();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sélectionne une méthode de paiement
   */
  selectPaymentMethod(method: 'stripe' | 'paypal'): void {
    this.selectedPaymentMethod = method;
  }

  /**
   * Trouver le nom du pays à partir du code
   */
  getCountryName(countryCode: string): string {
    const country = this.countries.find((c) => c.code === countryCode);
    return country ? country.name : countryCode;
  }

  /**
   * Vérifie si l'utilisateur peut finaliser la commande
   */
  canCheckout(): boolean {
    // L'utilisateur peut finaliser la commande s'il a un panier avec des articles,
    // une adresse de livraison sélectionnée, et que les frais de livraison ont été calculés
    return (
      this.cartItems.length > 0 &&
      !!this.selectedShippingAddressId &&
      !this.isCalculatingShipping &&
      !this.isProcessingOrder
    );
  }

  /**
   * Finaliser la commande
   */
  checkout(): void {
    // Vérifier si l'utilisateur est authentifié
    if (!this.isAuthenticated) {
      // Afficher le modal de login si l'utilisateur n'est pas authentifié
      this.openLoginModal();
      this.toastr.info('Connexion requise');
      return;
    }

    if (!this.canCheckout()) {
      // Si l'adresse n'est pas sélectionnée, afficher un message
      if (!this.selectedShippingAddressId) {
        this.toastr.warning('Adresse de livraison requise');
        return;
      }
      return;
    }

    // Désactiver le bouton de commande
    this.isProcessingOrder = true;

    // Récupérer l'adresse de livraison sélectionnée
    const shippingAddress = this.userAddresses.find(
      (addr) => addr.id === this.selectedShippingAddressId
    );

    if (!shippingAddress) {
      this.toastr.error('Adresse de livraison invalide');
      this.isProcessingOrder = false;
      return;
    }

    // Rechercher une adresse de facturation par défaut
    let billingAddressId = null;
    const defaultBillingAddress = this.userAddresses.find(
      (addr) => addr.address_type === 'billing' && addr.is_default
    );

    if (defaultBillingAddress) {
      billingAddressId = defaultBillingAddress.id;
    }

    // Calculer les totaux pour l'affichage et la création de commande
    const orderItems = this.cartItems.map((item) => {
      // Déterminer le prix (prix avec remise ou prix normal)
      const price = item.productDetails
        ? item.productDetails.discount_price || item.productDetails.price
        : 0;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        price: price,
        // Calculer le sous-total pour chaque article
        subtotal: price * item.quantity,
      };
    });

    // Créer l'objet de commande
    const orderData = {
      shipping_address_id: this.selectedShippingAddressId,
      billing_address_id: billingAddressId,
      payment_method: this.selectedPaymentMethod,
      shipping_method: 'standard',
      notes: '',
      shipping_fee: this.shippingCost,
      tax_amount: this.taxAmount,
      discount_amount: 0,
      total_amount: this.roundPrice(this.cartTotal),
      items: orderItems,
    };

    // Envoyer la commande au serveur
    this.orderService.createOrder(orderData).subscribe({
      next: (response) => {
        if (response.status === 'success' && response.data) {
          const orderId = response.data.id;

          // Rediriger vers la page de paiement en fonction de la méthode choisie
          if (this.selectedPaymentMethod === 'stripe') {
            this.router.navigate(['/payment/stripe'], {
              queryParams: {
                order_id: orderId,
                amount: this.cartTotal,
              },
            });
          } else if (this.selectedPaymentMethod === 'paypal') {
            this.router.navigate(['/payment/paypal'], {
              queryParams: {
                order_id: orderId,
                amount: this.cartTotal,
              },
            });
          }
        } else {
          this.toastr.error(
            'Une erreur est survenue lors de la création de la commande'
          );
          this.isProcessingOrder = false;
        }
      },
      error: (error) => {
        console.error('Error creating order:', error);

        // Afficher un message d'erreur plus spécifique si disponible
        if (error.error && error.error.message) {
          this.toastr.error(error.error.message);
        } else {
          this.toastr.error(
            'Une erreur est survenue lors de la création de la commande'
          );
        }

        this.isProcessingOrder = false;
      },
    });
  }

  openLoginModal(): void {
    this.modalService.open(LoginModalComponent);
  }

  /**
   * Charge les éléments du panier
   */
  loadCartItems(): void {
    this.isLoading = true;

    // Récupérer les articles du panier
    this.cartService.getCart().subscribe(() => {
      // S'abonner aux changements du panier
      this.cartService.cartItems$
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (items) => {
          // Reset cart
          this.cartItems = [];
          this.cartSubtotal = 0;

          if (!items || items.length === 0) {
            this.isLoading = false;
            return;
          }

          // Pour chaque élément du panier, utiliser les détails du produit déjà présents ou les récupérer
          for (const item of items) {
            try {
              let productData: IProduct | undefined;

              if (item.product) {
                productData = item.product;
              } else {
                const fetchedProduct = await lastValueFrom(
                  this.productService.getProductById(item.product_id)
                );
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

                this.cartSubtotal += subtotal;
              } else {
                this.cartItems.push({
                  ...item,
                  productDetails: undefined,
                  subtotal: 0,
                });
              }
            } catch (error) {
              console.error(`Error loading product ${item.product_id}:`, error);
              this.cartItems.push({
                ...item,
                productDetails: undefined,
                subtotal: 0,
              });
            }
          }

          this.isLoading = false;
          this.calculateTotals();
        });
    });

    // S'abonner au total du panier
    this.cartService.cartSubtotal$
      .pipe(takeUntil(this.destroy$))
      .subscribe((total) => {
        if (total > 0) {
          this.cartSubtotal = total;
          this.calculateTotals();
        }
      });
  }

  /**
   * Charger les adresses de l'utilisateur et calculer automatiquement les frais de livraison
   */
  loadUserAddresses(): void {
    this.loadingAddresses = true;
    this.userService
      .getAddresses()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingAddresses = false))
      )
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.userAddresses = response.addresses || [];

            // Rechercher l'adresse de livraison par défaut
            const defaultShipping = this.userAddresses.find(
              (a) => a.address_type === 'shipping' && a.is_default
            );

            if (defaultShipping) {
              this.selectedShippingAddressId = defaultShipping.id;
              this.populateAddressForm(defaultShipping);

              // Calculer les frais de livraison si une adresse de livraison est sélectionnée
              this.calculateShippingCost(defaultShipping.country);
            } else if (this.userAddresses.length > 0) {
              // Si pas d'adresse par défaut mais des adresses existent, utiliser la première
              const firstShippingAddress = this.userAddresses.find(
                (a) => a.address_type === 'shipping'
              );

              if (firstShippingAddress) {
                this.selectedShippingAddressId = firstShippingAddress.id;
                this.populateAddressForm(firstShippingAddress);
                this.calculateShippingCost(firstShippingAddress.country);
              }
            }
          }
        },
        error: (error) => {
          console.error('Error loading addresses:', error);
          this.toastr.error('Impossible de charger vos adresses', 'Erreur');
        },
      });
  }

  /**
   * Remplir le formulaire avec une adresse existante
   */
  populateAddressForm(address: IUserAddress): void {
    this.shippingAddressForm.patchValue({
      recipient_name: address.recipient_name,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state_province: address.state_province || '',
      postal_code: address.postal_code,
      country: address.country,
      phone_number: address.phone_number,
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

    // Mettre à jour la quantité localement
    const itemIndex = this.cartItems.findIndex((i) => i.id === itemId);
    if (itemIndex !== -1) {
      const item = this.cartItems[itemIndex];
      const price = item.productDetails
        ? item.productDetails.discount_price || item.productDetails.price
        : 0;

      this.cartItems[itemIndex] = {
        ...item,
        quantity: numQuantity,
        subtotal: price * numQuantity,
      };

      this.calculateTotals();
    }

    // Effectuer la mise à jour via le service
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

    // Supprimer l'élément localement
    this.cartItems = this.cartItems.filter((item) => item.id !== itemId);
    this.calculateTotals();

    // Effectuer la suppression via le service
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
      this.cartItems = [];
      this.cartSubtotal = 0;
      this.shippingCost = 0;
      this.taxAmount = 0;
      this.cartTotal = 0;

      this.cartService.clearCart().pipe(takeUntil(this.destroy$)).subscribe();
    }
  }

  /**
   * Calculer les totaux du panier
   */
  calculateTotals(): void {
    // Calculer le sous-total (montant TTC)
    this.cartSubtotal = this.cartItems.reduce(
      (total, item) => total + item.subtotal,
      0
    );

    // Calculer la TVA (20%) qui est déjà incluse dans le prix
    // Prix HT = Prix TTC / 1.2
    // TVA = Prix TTC - Prix HT = Prix TTC - (Prix TTC / 1.2) = Prix TTC * (1 - 1/1.2) = Prix TTC * 0.1667
    this.taxAmount = this.cartSubtotal * 0.1667;
    this.cartTotal = this.cartSubtotal + this.shippingCost;
  }

  /**
   * Calculer les frais de livraison en fonction du pays
   */
  calculateShippingCost(countryCode: string): void {
    if (!countryCode || !this.cartItems.length) {
      return;
    }

    this.isCalculatingShipping = true;

    // Récupérer l'ID du panier actuel
    const cartId = this.cartItems.length > 0 ? this.cartItems[0].cart_id : 0;

    this.shippingService
      .calculateShipping({
        cart_id: cartId,
        country_code: countryCode,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isCalculatingShipping = false))
      )
      .subscribe({
        next: (response) => {
          if (response.status === 'success' && response.data) {
            this.shippingCost = response.data.shipping_cost;

            this.calculateTotals();
          }
        },
        error: (error) => {
          console.error('Error calculating shipping:', error);
          this.toastr.error(
            'Impossible de calculer les frais de livraison',
            'Erreur'
          );
          this.shippingCost = 0;
          this.calculateTotals();
        },
      });
  }

  /**
   * Sélectionner une adresse existante
   */
  selectAddress(addressId: number, type: 'shipping'): void {
    // Si c'est déjà l'adresse sélectionnée, on ne fait rien pour éviter des calculs inutiles
    if (this.selectedShippingAddressId === addressId) {
      return;
    }

    this.selectedShippingAddressId = addressId;

    const address = this.userAddresses.find((a) => a.id === addressId);
    if (address) {
      this.populateAddressForm(address);
      this.calculateShippingCost(address.country);
    }
  }

  /**
   * Gérer le changement du pays de livraison
   */
  onShippingCountryChange(event: any): void {
    const countryCode = event.target.value;
    if (countryCode) {
      this.calculateShippingCost(countryCode);
    }
  }

  /**
   * Afficher le formulaire d'adresse pour ajouter/modifier
   */
  showAddressFormAction(type: 'shipping'): void {
    this.editingAddressType = type;
    this.showAddressForm = true;
  }

  /**
   * Masquer le formulaire d'adresse
   */
  hideAddressForm(): void {
    this.showAddressForm = false;
    this.editingAddressType = null;
  }

  /**
   * Soumettre le formulaire d'adresse
   */
  submitAddressForm(): void {
    if (!this.editingAddressType) return;

    const form = this.shippingAddressForm;

    if (form.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(form.controls).forEach((key) => {
        form.get(key)?.markAsTouched();
      });
      return;
    }

    const addressData = {
      ...form.value,
      address_type: 'shipping',
      is_default: true, // Définir comme adresse par défaut
    };

    // Si une adresse est sélectionnée, mettre à jour cette adresse
    if (this.selectedShippingAddressId && this.isAuthenticated) {
      this.userService
        .updateAddress(this.selectedShippingAddressId, addressData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.status === 'success') {
              this.toastr.success('Adresse mise à jour avec succès', 'Succès');
              this.loadUserAddresses();
              this.hideAddressForm();
              // Les frais de livraison seront calculés automatiquement lors du rechargement des adresses
            }
          },
          error: (error) => {
            console.error('Error updating address:', error);
            this.toastr.error(
              "Impossible de mettre à jour l'adresse",
              'Erreur'
            );
          },
        });
    }
    // Sinon, ajouter une nouvelle adresse
    else if (this.isAuthenticated) {
      this.userService
        .addAddress(addressData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.status === 'success') {
              this.toastr.success('Adresse ajoutée avec succès', 'Succès');
              this.selectedShippingAddressId = response.address.id;
              this.loadUserAddresses();
              this.hideAddressForm();
              // Les frais de livraison seront calculés automatiquement lors du rechargement des adresses
            }
          },
          error: (error) => {
            console.error('Error adding address:', error);
            this.toastr.error("Impossible d'ajouter l'adresse", 'Erreur');
          },
        });
    }
    // Si l'utilisateur n'est pas connecté, stocker localement
    else {
      // Dans une application réelle, vous pourriez stocker ces informations dans localStorage
      // Pour cette démo, nous allons simplement simuler le comportement
      this.hideAddressForm();

      // Simuler un ID pour l'adresse
      const tempId = Date.now();
      this.selectedShippingAddressId = tempId;

      // Ajouter temporairement à la liste d'adresses
      this.userAddresses = [
        {
          id: tempId,
          ...addressData,
          is_default: true,
        },
      ];

      // Calculer les frais de livraison avec la nouvelle adresse
      this.calculateShippingCost(addressData.country);

      this.toastr.info(
        "Vous n'êtes pas connecté. Les informations seront temporaires.",
        'Information'
      );
    }
  }

  /**
   * Afficher le prix formaté
   */
  formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined) {
      return '0.00 €';
    }

    const priceStr = String(Math.round(price * 100) / 100);
    const parts = priceStr.split('.');
    const decimal = parts.length > 1 ? parts[1] : '0';
    const formattedDecimal = decimal.padEnd(2, '0').substring(0, 2);

    return `${parts[0]}.${formattedDecimal} €`;
  }

  /**
   * Retourne le prix arrondi à deux décimales sous forme de number
   */
  roundPrice(price: number | null | undefined): number {
    if (price === null || price === undefined) {
      return 0;
    }

    return Math.round(price * 100) / 100;
  }

  /**
   * Retourne à la page précédente
   */
  goBack(): void {
    this.location.back();
  }
}
