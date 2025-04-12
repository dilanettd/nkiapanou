import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { OrderService } from '../../../../core/services/order/order.service';
import { StripeService } from '../../../../core/services/stripe/stripe.service';

@Component({
  selector: 'nkiapanou-payment-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],

  templateUrl: './payment-confirmation.component.html',
  styleUrl: './payment-confirmation.component.scss',
})
export class PaymentConfirmationComponent implements OnInit, OnDestroy {
  private stripeService = inject(StripeService);
  // private paypalService = inject(PaypalService); // À ajouter plus tard
  public orderService = inject(OrderService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  private destroy$ = new Subject<void>();

  // États du composant
  isLoading = true;
  status: 'success' | 'failure' | 'pending' | 'unknown' = 'unknown';

  // Données de la commande
  orderId: number | null = null;
  orderDetails: any = null;
  paymentIntentId: string | null = null;
  paymentMethod: 'stripe' | 'paypal' | null = null;

  // Messages d'erreur/succès
  message: string = '';

  constructor() {}

  ngOnInit(): void {
    // Récupérer les paramètres de la requête pour déterminer la méthode de paiement
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.paymentMethod = params['payment_method'] || null;

        // Si la méthode de paiement est spécifiée, vérifier le statut approprié
        if (this.paymentMethod === 'stripe') {
          // Initialiser Stripe pour vérifier le status du paiement
          this.stripeService
            .initStripe()
            .then(() => this.checkPaymentStatus())
            .catch((err) => {
              console.error("Erreur d'initialisation de Stripe:", err);
              this.isLoading = false;
              this.status = 'unknown';
              this.message = 'Impossible de vérifier le statut du paiement';
            });
        } else if (this.paymentMethod === 'paypal') {
          // Vérifier le statut du paiement PayPal
          // this.checkPaypalPaymentStatus();
          // Temporaire jusqu'à l'implémentation complète de PayPal
          this.orderId = params['order_id']
            ? parseInt(params['order_id'], 10)
            : null;
          this.status = params['status'] || 'unknown';
          this.message = params['message'] || 'Paiement PayPal traité.';
          this.isLoading = false;
          this.loadOrderDetails();
        } else {
          // Méthode non spécifiée, vérifier les deux
          this.checkGenericPaymentStatus();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Vérifie le statut du paiement Stripe
   */
  checkPaymentStatus(): void {
    // Récupérer les paramètres de la requête
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        // 1. Vérifier si nous revenons d'une redirection Stripe après un paiement 3D Secure
        const clientSecret = params['payment_intent_client_secret'];
        const redirectStatus = params['redirect_status'];

        // 2. Ou si c'est une confirmation directe (cas où le 3D Secure n'est pas requis)
        this.orderId = params['order_id']
          ? parseInt(params['order_id'], 10)
          : null;
        this.paymentIntentId = params['payment_intent'] || null;
        const directStatus = params['status'];

        // Cas 1: Redirection Stripe avec client secret (3D Secure)
        if (clientSecret && redirectStatus) {
          this.handleRedirectStatus(clientSecret, redirectStatus);
        }
        // Cas 2: Confirmation directe (succès immédiat sans 3D Secure)
        else if (
          this.orderId &&
          this.paymentIntentId &&
          directStatus === 'success'
        ) {
          this.confirmDirectPayment();
        }
        // Aucune information suffisante
        else {
          this.isLoading = false;
          this.status = 'unknown';
          this.message = 'Informations de paiement manquantes ou incomplètes';
        }
      });
  }

  /**
   * Vérifie le statut générique du paiement (quand la méthode n'est pas spécifiée)
   */
  checkGenericPaymentStatus(): void {
    // Récupérer les paramètres de la requête
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        // Récupérer l'ID de la commande
        this.orderId = params['order_id']
          ? parseInt(params['order_id'], 10)
          : null;
        const status = params['status'] || 'unknown';

        // Vérifier si nous avons un payment_intent_client_secret pour Stripe
        const clientSecret = params['payment_intent_client_secret'];

        if (clientSecret) {
          // C'est un paiement Stripe, utiliser la logique Stripe
          this.paymentMethod = 'stripe';
          this.stripeService
            .initStripe()
            .then(() => this.checkPaymentStatus())
            .catch((err) => {
              console.error("Erreur d'initialisation de Stripe:", err);
              this.setGenericStatus(status);
            });
        }
        // Vérifier si nous avons des paramètres PayPal
        else if (params['paymentId'] || params['token']) {
          // C'est un paiement PayPal
          this.paymentMethod = 'paypal';
          // this.checkPaypalPaymentStatus();
          // Temporaire jusqu'à l'implémentation complète de PayPal
          this.setGenericStatus(status);
        } else {
          // Aucune information spécifique, définir simplement le statut général
          this.setGenericStatus(status);
        }
      });
  }

  /**
   * Définit un statut générique à partir des paramètres de la requête
   */
  setGenericStatus(status: string): void {
    switch (status) {
      case 'success':
        this.status = 'success';
        this.message = 'Paiement réussi !';
        break;
      case 'failure':
        this.status = 'failure';
        this.message = 'Le paiement a échoué.';
        break;
      case 'pending':
        this.status = 'pending';
        this.message = 'Votre paiement est en cours de traitement.';
        break;
      default:
        this.status = 'unknown';
        this.message = 'Impossible de déterminer le statut du paiement.';
    }

    this.isLoading = false;
    if (this.orderId) {
      this.loadOrderDetails();
    }
  }

  /**
   * Gère le statut après redirection 3D Secure
   */
  handleRedirectStatus(clientSecret: string, redirectStatus: string): void {
    this.stripeService
      .checkPaymentStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.paymentIntent) {
            // Récupérer les informations du PaymentIntent
            const paymentIntent = result.paymentIntent;
            this.paymentIntentId = paymentIntent.id;

            // Récupérer l'ID de commande depuis les métadonnées du PaymentIntent
            if (paymentIntent.metadata && paymentIntent.metadata.order_id) {
              this.orderId = parseInt(paymentIntent.metadata.order_id, 10);
            }

            // Vérifier le statut du paiement
            if (paymentIntent.status === 'succeeded') {
              this.status = 'success';
              this.message = 'Paiement réussi !';

              // Confirmer le paiement avec notre serveur
              this.confirmPaymentWithServer(paymentIntent.id);
            } else if (paymentIntent.status === 'processing') {
              this.status = 'pending';
              this.message = 'Votre paiement est en cours de traitement.';
            } else {
              this.status = 'failure';
              this.message = 'Le paiement a échoué.';
            }
          } else {
            this.status = 'unknown';
            this.message =
              'Impossible de récupérer les informations du paiement.';
          }

          this.isLoading = false;
          this.loadOrderDetails();
        },
        error: (error) => {
          console.error(
            'Erreur lors de la vérification du statut du paiement:',
            error
          );
          this.status = 'unknown';
          this.message =
            'Une erreur est survenue lors de la vérification du paiement.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Confirme un paiement réussi directement (sans redirection 3D Secure)
   */
  confirmDirectPayment(): void {
    if (!this.paymentIntentId) {
      this.status = 'unknown';
      this.isLoading = false;
      return;
    }

    this.status = 'success';
    this.message = 'Paiement réussi !';
    this.loadOrderDetails();
    this.isLoading = false;
  }

  /**
   * Confirme le paiement avec notre serveur
   */
  confirmPaymentWithServer(paymentIntentId: string): void {
    this.stripeService
      .confirmPayment(paymentIntentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            console.warn(
              'Avertissement: La confirmation de paiement sur le serveur a échoué:',
              response.message
            );
          }
        },
        error: (error) => {
          console.error(
            'Erreur lors de la confirmation du paiement sur le serveur:',
            error
          );
        },
      });
  }

  /**
   * Charge les détails de la commande
   */
  loadOrderDetails(): void {
    if (!this.orderId) return;

    this.orderService
      .getOrderById(this.orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          if (order) {
            this.orderDetails = order;
          }
        },
        error: (error) => {
          console.error(
            'Erreur lors du chargement des détails de la commande:',
            error
          );
        },
      });
  }

  /**
   * Formate un prix en euros
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }

  /**
   * Retourne à la page d'accueil ou au compte
   */
  goToHome(): void {
    this.router.navigate(['/']);
  }

  /**
   * Navigue vers les détails de la commande
   */
  goToOrderDetails(): void {
    if (this.orderId) {
      this.router.navigate(['/account/orders', this.orderId]);
    }
  }
}
