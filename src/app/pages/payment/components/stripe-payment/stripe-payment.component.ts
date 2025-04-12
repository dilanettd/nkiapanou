import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { CartService } from '../../../../core/services/cart/cart.service';
import { OrderService } from '../../../../core/services/order/order.service';
import { StripeService } from '../../../../core/services/stripe/stripe.service';

@Component({
  selector: 'nkiapanou-stripe-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stripe-payment.component.html',
  styleUrl: './stripe-payment.component.scss',
})
export class StripePaymentComponent implements OnInit, OnDestroy {
  private stripeService = inject(StripeService);
  private orderService = inject(OrderService);
  private cartService = inject(CartService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  private destroy$ = new Subject<void>();

  // États du composant
  isLoading = true;
  isProcessing = false;
  isCardReady = false;
  error: string | null = null;
  showFallbackOption = false; // Pour afficher les options alternatives

  // Variables pour Stripe
  stripe: any;
  elements: any;
  paymentElement: any;
  clientSecret: string | null = null;
  paymentIntentId: string | null = null;

  // ID de la commande
  orderId: number | null = null;
  orderTotal: number = 0;

  // Surveillez les tentatives de chargement
  private loadAttempts = 0;
  private maxLoadAttempts = 3;

  constructor() {}

  ngOnInit(): void {
    // Récupérer les paramètres de la commande depuis la route
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.orderId = params['order_id']
          ? parseInt(params['order_id'], 10)
          : null;
        this.orderTotal = params['amount'] ? parseFloat(params['amount']) : 0;

        if (!this.orderId || !this.orderTotal) {
          this.error = 'Données de commande manquantes ou invalides';
          this.isLoading = false;
          return;
        }

        this.initStripePayment();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialise le paiement Stripe
   */
  async initStripePayment(): Promise<void> {
    if (this.loadAttempts >= this.maxLoadAttempts) {
      this.fallbackToDirectPayment();
      return;
    }

    this.loadAttempts++;
    this.isLoading = true;
    this.error = null;

    try {
      // Initialiser l'instance Stripe avec un délai maximum
      const stripePromise = this.stripeService.initStripe();

      // Ajouter un timeout pour ne pas bloquer indéfiniment
      const stripe = await Promise.race([
        stripePromise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Chargement de Stripe a expiré')),
            10000
          )
        ),
      ]);

      // Créer un PaymentIntent
      if (this.orderId && this.orderTotal) {
        this.stripeService
          .createPaymentIntent(this.orderId, this.orderTotal)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success && response.clientSecret) {
                this.clientSecret = response.clientSecret;

                // Extraire l'ID du PaymentIntent du clientSecret
                // Format: pi_xxxx_secret_yyyy
                const parts = this.clientSecret.split('_secret_');
                if (parts.length > 0) {
                  this.paymentIntentId = parts[0];
                }

                this.setupStripeElements();
              } else {
                this.error = "Impossible de créer l'intention de paiement";
                this.isLoading = false;
                this.showFallbackOption = true;
              }
            },
            error: (err) => {
              console.error(
                'Erreur lors de la création du PaymentIntent:',
                err
              );
              this.error =
                'Une erreur est survenue lors de la préparation du paiement';
              this.isLoading = false;
              this.showFallbackOption = true;
            },
          });
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation de Stripe:", error);
      this.error =
        "Impossible d'initialiser le système de paiement. Veuillez vérifier votre connexion ou réessayer ultérieurement.";
      this.isLoading = false;
      this.showFallbackOption = true;

      // Réinitialiser Stripe pour une nouvelle tentative
      this.stripeService.resetStripe();
    }
  }

  /**
   * Configure les éléments de carte Stripe
   */
  setupStripeElements(): void {
    if (!this.clientSecret) return;

    try {
      const stripe = this.stripeService.getStripe();
      const elements = stripe.elements({ clientSecret: this.clientSecret });

      // Créer et monter l'élément de paiement
      const paymentElement = elements.create('payment', {
        layout: 'tabs',
        defaultValues: {
          billingDetails: {
            name: '',
            email: '',
          },
        },
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#ebc435',
            colorBackground: '#ffffff',
            colorText: '#333333',
            colorDanger: '#e53e3e',
            fontFamily: 'Lato, sans-serif',
            spacingUnit: '4px',
            borderRadius: '4px',
          },
        },
      });

      // Vérifier si l'élément est monté avec succès
      const mountPromise = new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          try {
            paymentElement.mount('#payment-element');
            resolve();
          } catch (err) {
            reject(err);
          }
        }, 100);
      });

      mountPromise
        .then(() => {
          // Écouter les événements
          paymentElement.on('ready', () => {
            this.isCardReady = true;
            this.isLoading = false;
          });

          paymentElement.on('change', (event: any) => {
            this.error = event.error ? event.error.message : null;
          });

          this.stripe = stripe;
          this.elements = elements;
          this.paymentElement = paymentElement;
        })
        .catch((err) => {
          console.error(
            "Erreur lors du montage de l'élément de paiement:",
            err
          );
          this.error = 'Impossible de charger le formulaire de paiement';
          this.isLoading = false;
          this.showFallbackOption = true;
        });
    } catch (error) {
      console.error(
        'Erreur lors de la configuration des éléments Stripe:',
        error
      );
      this.error = 'Impossible de configurer le formulaire de paiement';
      this.isLoading = false;
      this.showFallbackOption = true;
    }
  }

  /**
   * Soumet le paiement à Stripe
   */
  async submitPayment(): Promise<void> {
    if (!this.stripe || !this.elements || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.error = null;

    try {
      // Construire l'URL de retour (succès et annulation)
      const returnUrl = `${window.location.origin}/payment/confirmation`;

      // Valider et envoyer le paiement
      const result = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: {
              // Vous pouvez ajouter des détails supplémentaires ici si nécessaire
            },
          },
        },
        redirect: 'if_required',
      });

      if (result.error) {
        // Afficher l'erreur au client
        this.error = this.stripeService.getErrorMessage(result.error);
        this.isProcessing = false;
      } else if (
        result.paymentIntent &&
        result.paymentIntent.status === 'succeeded'
      ) {
        // Paiement réussi sans redirection
        await this.handleSuccessfulPayment(result.paymentIntent.id);
      }
      // Si 3D Secure est nécessaire, la redirection sera automatique
    } catch (error) {
      console.error('Erreur lors du traitement du paiement:', error);
      this.error = 'Une erreur est survenue lors du traitement du paiement';
      this.isProcessing = false;
    }
  }

  /**
   * Gérer un paiement réussi
   */
  async handleSuccessfulPayment(paymentIntentId: string): Promise<void> {
    // Confirmer le paiement avec notre backend
    this.stripeService
      .confirmPayment(paymentIntentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Vider le panier
            this.cartService.clearCart().subscribe();

            // Rediriger vers la page de confirmation
            this.router.navigate(['/payment/confirmation'], {
              queryParams: {
                order_id: this.orderId,
                status: 'success',
                payment_intent: paymentIntentId,
                payment_method: 'stripe',
              },
            });
          } else {
            this.toastr.error(
              response.message || 'Erreur de confirmation du paiement'
            );
            this.isProcessing = false;
          }
        },
        error: (err) => {
          console.error('Erreur lors de la confirmation du paiement:', err);
          this.error = 'Impossible de confirmer le paiement avec notre serveur';
          this.isProcessing = false;
        },
      });
  }

  /**
   * En cas d'échec de Stripe, fallback vers une autre méthode
   */
  fallbackToDirectPayment(): void {
    this.isLoading = false;
    this.error =
      "Le système de paiement Stripe n'a pas pu être chargé. Veuillez choisir une autre option de paiement ou réessayer plus tard.";
    this.showFallbackOption = true;
  }

  /**
   * Rediriger vers une méthode de paiement alternative
   */
  useFallbackPayment(): void {
    // Rediriger vers PayPal ou une page de paiement alternative
    this.router.navigate(['/payment/paypal'], {
      queryParams: {
        order_id: this.orderId,
        amount: this.orderTotal,
      },
    });
  }

  /**
   * Essayer à nouveau de charger Stripe
   */
  retryStripePayment(): void {
    this.stripeService.resetStripe();
    this.showFallbackOption = false;
    this.error = null;
    this.initStripePayment();
  }

  /**
   * Annuler le paiement et retourner à la page du panier
   */
  cancelPayment(): void {
    if (this.isProcessing) {
      return;
    }

    this.router.navigate(['/cart']);
  }
}
