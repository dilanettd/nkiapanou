import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { loadStripe } from '@stripe/stripe-js';

// Types pour les réponses de l'API Stripe
export interface PaymentIntentResponse {
  success: boolean;
  clientSecret?: string;
  message?: string;
}

export interface PaymentConfirmationResponse {
  success: boolean;
  message: string;
  order?: any;
}

@Injectable({
  providedIn: 'root',
})
export class StripeService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;

  // Variable pour stocker l'instance Stripe
  private stripeInstance: any;
  private stripePromise: Promise<any> | null = null;

  constructor() {}

  /**
   * Initialise l'instance Stripe avec la clé publique
   * Doit être appelé au démarrage de l'application ou avant toute opération Stripe
   */
  initStripe(): Promise<any> {
    // Si nous avons déjà une promesse en cours, la renvoyer
    if (this.stripePromise) {
      return this.stripePromise;
    }

    // Créer une nouvelle promesse pour charger Stripe
    this.stripePromise = new Promise((resolve, reject) => {
      try {
        // Utiliser la bibliothèque officielle pour charger Stripe
        loadStripe(environment.STRIPE_PUBLIC_KEY)
          .then((stripe) => {
            if (!stripe) {
              reject(
                new Error("Impossible de charger Stripe. L'instance est null.")
              );
              return;
            }
            this.stripeInstance = stripe;
            resolve(stripe);
          })
          .catch((err) => {
            console.error(
              'Erreur lors du chargement de Stripe via loadStripe:',
              err
            );
            reject(err);
          });
      } catch (error) {
        console.error(
          "Erreur critique lors de l'initialisation de Stripe:",
          error
        );
        reject(error);
      }
    });

    return this.stripePromise;
  }

  /**
   * Retourne l'instance Stripe
   */
  getStripe(): any {
    if (!this.stripeInstance) {
      throw new Error(
        "Stripe n'a pas été initialisé. Appelez initStripe() d'abord."
      );
    }
    return this.stripeInstance;
  }

  /**
   * Vérifier si Stripe est initialisé
   */
  isInitialized(): boolean {
    return !!this.stripeInstance;
  }

  /**
   * Réinitialiser l'instance Stripe (utile en cas d'échec)
   */
  resetStripe(): void {
    this.stripeInstance = null;
    this.stripePromise = null;
  }

  /**
   * Crée un PaymentIntent pour traiter un paiement
   * @param orderId ID de la commande
   * @param amount Montant en euros (ex: 45.99)
   * @param currency Code de la devise (par défaut EUR)
   */
  createPaymentIntent(
    orderId: number,
    amount: number,
    currency: string = 'EUR'
  ): Observable<PaymentIntentResponse> {
    return this.http
      .post<PaymentIntentResponse>(
        `${this.apiUrl}/stripe/create-payment-intent`,
        {
          order_id: orderId,
          amount: amount,
          currency: currency,
        }
      )
      .pipe(
        catchError((error) => {
          console.error('Erreur lors de la création du PaymentIntent:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Confirme un paiement après son traitement par Stripe
   * @param paymentIntentId ID du PaymentIntent
   */
  confirmPayment(
    paymentIntentId: string
  ): Observable<PaymentConfirmationResponse> {
    return this.http
      .post<PaymentConfirmationResponse>(
        `${this.apiUrl}/stripe/confirm-payment`,
        {
          payment_intent_id: paymentIntentId,
        }
      )
      .pipe(
        catchError((error) => {
          console.error('Erreur lors de la confirmation du paiement:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Configure et affiche les éléments de carte de Stripe
   * @param clientSecret Secret du PaymentIntent
   * @param elementId ID de l'élément DOM où afficher le formulaire de carte
   */
  setupCardElement(clientSecret: string, elementId: string): any {
    try {
      const stripe = this.getStripe();
      const elements = stripe.elements({ clientSecret });

      // Crée l'élément de paiement et le monte dans le DOM
      const paymentElement = elements.create('payment');
      paymentElement.mount(`#${elementId}`);

      return {
        stripe,
        elements,
        paymentElement,
      };
    } catch (error) {
      console.error(
        "Erreur lors de la configuration de l'élément de carte:",
        error
      );
      throw error;
    }
  }

  /**
   * Confirme le paiement avec Stripe
   * @param stripe Instance Stripe
   * @param elements Éléments Stripe
   * @param returnUrl URL de redirection après paiement
   */
  async confirmCardPayment(
    stripe: any,
    elements: any,
    returnUrl: string
  ): Promise<{ error?: any; paymentIntent?: any }> {
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        console.error('Erreur de paiement:', result.error);
        return { error: result.error };
      }

      return { paymentIntent: result.paymentIntent };
    } catch (err) {
      console.error('Exception lors du paiement:', err);
      return { error: err };
    }
  }

  /**
   * Vérifie l'état du paiement après redirection
   * Utile lorsque l'authentification 3D Secure est requise
   */
  checkPaymentStatus(): Observable<any> {
    const stripe = this.getStripe();
    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      return throwError(() => new Error('Pas de paiement en cours'));
    }

    return new Observable((observer) => {
      stripe
        .retrievePaymentIntent(clientSecret)
        .then((result: any) => {
          observer.next(result);
          observer.complete();
        })
        .catch((error: any) => {
          observer.error(error);
        });
    });
  }

  /**
   * Analyse les erreurs Stripe et retourne un message utilisateur approprié
   * @param error Objet d'erreur Stripe
   */
  getErrorMessage(error: any): string {
    if (!error) {
      return "Une erreur inconnue s'est produite";
    }

    switch (error.type) {
      case 'card_error':
        return `Erreur de carte: ${error.message}`;
      case 'validation_error':
        return `Erreur de validation: ${error.message}`;
      case 'invalid_request_error':
        return 'La requête est invalide';
      case 'authentication_error':
        return "Échec de l'authentification auprès de Stripe";
      case 'rate_limit_error':
        return 'Trop de requêtes envoyées à Stripe';
      case 'api_error':
        return 'Erreur du service Stripe';
      default:
        return (
          error.message ||
          "Une erreur s'est produite lors du traitement du paiement"
        );
    }
  }

  /**
   * Détermine si l'authentification 3D Secure est nécessaire
   */
  requires3DSecure(paymentIntent: any): boolean {
    return (
      paymentIntent.status === 'requires_action' &&
      paymentIntent.next_action?.type === 'use_stripe_sdk'
    );
  }

  /**
   * Obtient un texte correspondant au statut du paiement Stripe
   */
  getPaymentStatusText(status: string): string {
    switch (status) {
      case 'requires_payment_method':
        return 'En attente de la méthode de paiement';
      case 'requires_confirmation':
        return 'En attente de confirmation';
      case 'requires_action':
        return 'Authentification requise';
      case 'processing':
        return 'Traitement en cours';
      case 'requires_capture':
        return 'En attente de capture';
      case 'canceled':
        return 'Annulé';
      case 'succeeded':
        return 'Réussi';
      default:
        return 'Statut inconnu';
    }
  }
}
