import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil, timer } from 'rxjs';
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
export class StripePaymentComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('paymentElement') paymentElementRef!: ElementRef;

  private stripeService = inject(StripeService);
  private orderService = inject(OrderService);
  private cartService = inject(CartService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  private destroy$ = new Subject<void>();

  // Component states
  isLoading = true;
  isProcessing = false;
  isCardReady = false;
  error: string | null = null;
  showFallbackOption = false; // For displaying alternative options

  // Stripe variables
  stripe: any;
  elements: any;
  paymentElement: any;
  clientSecret: string | null = null;
  paymentIntentId: string | null = null;

  // Order ID
  orderId: number | null = null;
  orderTotal: number = 0;

  // Monitor loading attempts
  private loadAttempts = 0;
  private maxLoadAttempts = 3;

  constructor() {}

  ngOnInit(): void {
    // Get order parameters from route
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.orderId = params['order_id']
          ? parseInt(params['order_id'], 10)
          : null;
        this.orderTotal = params['amount'] ? parseFloat(params['amount']) : 0;

        if (!this.orderId || !this.orderTotal) {
          this.error = 'Missing or invalid order data';
          this.isLoading = false;
          return;
        }

        // Initialize payment after route parameters are loaded
        // But don't mount elements yet - we'll do that in AfterViewInit
        this.initStripePayment();
      });
  }

  ngAfterViewInit(): void {
    // If we already have the clientSecret from ngOnInit, set up elements now
    if (this.clientSecret) {
      // Give the DOM a little time to stabilize
      timer(100).subscribe(() => {
        this.setupStripeElements();
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize Stripe payment
   */
  async initStripePayment(): Promise<void> {
    if (this.loadAttempts >= this.maxLoadAttempts) {
      this.fallbackToDirectPayment();
      return;
    }

    this.loadAttempts++;
    this.isLoading = false;
    this.error = null;

    try {
      // Initialize Stripe instance with maximum delay
      const stripePromise = this.stripeService.initStripe();

      // Add timeout to avoid blocking indefinitely
      const stripe = await Promise.race([
        stripePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Stripe loading timed out')), 10000)
        ),
      ]);

      // Create a PaymentIntent
      if (this.orderId && this.orderTotal) {
        this.stripeService
          .createPaymentIntent(this.orderId, this.orderTotal)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success && response.clientSecret) {
                this.clientSecret = response.clientSecret;

                // Extract PaymentIntent ID from clientSecret
                // Format: pi_xxxx_secret_yyyy
                const parts = this.clientSecret.split('_secret_');
                if (parts.length > 0) {
                  this.paymentIntentId = parts[0];
                }

                // If view is already initialized, we can mount the elements
                if (this.paymentElementRef) {
                  timer(100).subscribe(() => {
                    this.setupStripeElements();
                  });
                }
                // Otherwise, elements will be mounted in ngAfterViewInit
              } else {
                this.error = 'Could not create payment intent';
                this.isLoading = false;
                this.showFallbackOption = true;
              }
            },
            error: (err) => {
              console.error('Error creating PaymentIntent:', err);
              this.error = 'An error occurred while preparing the payment';
              this.isLoading = false;
              this.showFallbackOption = true;
            },
          });
      }
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      this.error =
        'Could not initialize payment system. Please check your connection or try again later.';
      this.isLoading = false;
      this.showFallbackOption = true;

      // Reset Stripe for a new attempt
      this.stripeService.resetStripe();
    }
  }

  /**
   * Set up Stripe elements
   */
  setupStripeElements(): void {
    if (!this.clientSecret) return;

    // Verify the element exists in the DOM
    if (!document.getElementById('payment-element')) {
      console.error('Payment element not found in DOM');
      this.error = 'Could not load payment form';
      this.isLoading = false;
      this.showFallbackOption = true;
      return;
    }

    try {
      const stripe = this.stripeService.getStripe();
      const elements = stripe.elements({ clientSecret: this.clientSecret });

      // Create and mount the payment element
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

      // Mount with safety checks
      try {
        paymentElement.mount('#payment-element');

        // Listen for events
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
      } catch (err) {
        console.error('Error mounting payment element:', err);
        this.error = 'Could not load payment form';
        this.isLoading = false;
        this.showFallbackOption = true;
      }
    } catch (error) {
      console.error('Error setting up Stripe elements:', error);
      this.error = 'Could not configure payment form';
      this.isLoading = false;
      this.showFallbackOption = true;
    }
  }

  /**
   * Submit payment to Stripe
   */
  async submitPayment(): Promise<void> {
    if (!this.stripe || !this.elements || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.error = null;

    try {
      // Build return URL (success and cancel)
      const returnUrl = `${window.location.origin}/payment/confirmation`;

      // Validate and send payment
      const result = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: returnUrl,
          payment_method_data: {
            billing_details: {
              // You can add additional details here if needed
            },
          },
        },
        redirect: 'if_required',
      });

      if (result.error) {
        // Display error to client
        this.error = this.stripeService.getErrorMessage(result.error);
        this.isProcessing = false;
      } else if (
        result.paymentIntent &&
        result.paymentIntent.status === 'succeeded'
      ) {
        // Payment succeeded without redirection
        await this.handleSuccessfulPayment(result.paymentIntent.id);
      }
      // If 3D Secure is required, redirection will be automatic
    } catch (error) {
      console.error('Error processing payment:', error);
      this.error = 'An error occurred while processing payment';
      this.isProcessing = false;
    }
  }

  /**
   * Handle successful payment
   */
  async handleSuccessfulPayment(paymentIntentId: string): Promise<void> {
    // Confirm payment with our backend
    this.stripeService
      .confirmPayment(paymentIntentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Clear cart
            this.cartService.clearCart().subscribe();

            // Redirect to confirmation page
            this.router.navigate(['/payment/confirmation'], {
              queryParams: {
                order_id: this.orderId,
                status: 'success',
                payment_intent: paymentIntentId,
                payment_method: 'stripe',
              },
            });
          } else {
            this.toastr.error(response.message || 'Error confirming payment');
            this.isProcessing = false;
          }
        },
        error: (err) => {
          console.error('Error confirming payment:', err);
          this.error = 'Could not confirm payment with our server';
          this.isProcessing = false;
        },
      });
  }

  /**
   * In case of Stripe failure, fallback to another method
   */
  fallbackToDirectPayment(): void {
    this.isLoading = false;
    this.error =
      'The Stripe payment system could not be loaded. Please choose another payment option or try again later.';
    this.showFallbackOption = true;
  }

  /**
   * Redirect to an alternative payment method
   */
  useFallbackPayment(): void {
    // Redirect to PayPal or alternative payment page
    this.router.navigate(['/payment/paypal'], {
      queryParams: {
        order_id: this.orderId,
        amount: this.orderTotal,
      },
    });
  }

  /**
   * Try again to load Stripe
   */
  retryStripePayment(): void {
    this.stripeService.resetStripe();
    this.showFallbackOption = false;
    this.error = null;
    this.initStripePayment();
  }

  /**
   * Cancel payment and return to cart page
   */
  cancelPayment(): void {
    if (this.isProcessing) {
      return;
    }

    this.router.navigate(['/cart']);
  }
}
