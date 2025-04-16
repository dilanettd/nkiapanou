import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil } from 'rxjs';
import { CartService } from '../../../../core/services/cart/cart.service';
import { OrderService } from '../../../../core/services/order/order.service';
import { PaypalService } from '../../../../core/services/paypal/paypal.service';

declare var paypal: any;

@Component({
  selector: 'nkiapanou-paypal-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paypal-payment.component.html',
  styleUrl: './paypal-payment.component.scss',
})
export class PaypalPaymentComponent implements OnInit, OnDestroy {
  private paypalService = inject(PaypalService);
  private orderService = inject(OrderService);
  private cartService = inject(CartService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  private destroy$ = new Subject<void>();

  // Component states
  isLoading = true;
  isProcessing = false;
  isPayPalReady = false;
  error: string | null = null;
  showFallbackOption = false;

  // Order data
  orderId: number | null = null;
  orderTotal: number = 0;
  currencyCode: string = 'EUR';

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

        this.initPayPalPayment();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize PayPal payment
   */
  initPayPalPayment(): void {
    this.isLoading = true;
    this.error = null;

    // Load PayPal SDK
    this.paypalService
      .loadPayPalScript()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.renderPayPalButton();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading PayPal SDK:', error);
          this.error = 'Failed to load PayPal. Please try again later.';
          this.isLoading = false;
          this.showFallbackOption = true;
        },
      });
  }

  /**
   * Render PayPal payment button
   */
  renderPayPalButton(): void {
    if (!this.orderId || !this.orderTotal) {
      this.error = 'Order information is missing';
      return;
    }

    const self = this;
    const paypalButtonContainer = document.getElementById(
      'paypal-button-container'
    );

    if (!paypalButtonContainer) {
      console.error('PayPal button container not found');
      this.error = 'Error initializing PayPal';
      return;
    }

    // Clear any existing buttons
    paypalButtonContainer.innerHTML = '';

    // Format the amount properly for PayPal
    const amount = this.orderTotal.toFixed(2);

    // Render the PayPal button
    paypal
      .Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay',
        },

        // Set up the transaction
        createOrder: (data: any, actions: any) => {
          self.isProcessing = true;

          // Create a PayPal order
          return this.paypalService
            .createOrder(this.orderId!, this.orderTotal)
            .toPromise()
            .then((response: any) => {
              if (response && response.success && response.paypalOrderId) {
                return response.paypalOrderId;
              } else {
                throw new Error('Failed to create PayPal order');
              }
            })
            .catch((error) => {
              console.error('Error creating PayPal order:', error);
              self.error = 'Failed to create payment. Please try again.';
              self.isProcessing = false;
              throw error;
            });
        },

        // Handle the approval
        onApprove: (data: any, actions: any) => {
          self.isProcessing = true;

          // Capture the funds from the transaction
          return this.paypalService
            .capturePayment(data.orderID)
            .toPromise()
            .then((response: any) => {
              if (response && response.success) {
                // Clear cart
                this.cartService.clearCart().subscribe();

                // Navigate to confirmation page
                this.router.navigate(['/payment/confirmation'], {
                  queryParams: {
                    order_id: this.orderId,
                    status: 'success',
                    payment_id: data.orderID,
                    payment_method: 'paypal',
                  },
                });
              } else {
                throw new Error('Payment capture failed');
              }
            })
            .catch((error) => {
              console.error('Error capturing payment:', error);
              self.error =
                'Payment processing failed. Please contact customer support.';
              self.isProcessing = false;

              // Navigate to confirmation page with error
              this.router.navigate(['/payment/confirmation'], {
                queryParams: {
                  order_id: this.orderId,
                  status: 'failure',
                  payment_method: 'paypal',
                  message: 'Failed to process payment',
                },
              });
            });
        },

        // Handle cancellation
        onCancel: (data: any) => {
          self.isProcessing = false;
          self.toastr.info('Payment was cancelled');

          // Update order status if needed
          this.updateOrderStatus('cancelled');
        },

        // Handle errors
        onError: (err: any) => {
          console.error('PayPal error:', err);
          self.error = 'An error occurred during the payment process';
          self.isProcessing = false;

          // Navigate to confirmation page with error
          this.router.navigate(['/payment/confirmation'], {
            queryParams: {
              order_id: this.orderId,
              status: 'failure',
              payment_method: 'paypal',
              message: 'Payment processing error',
            },
          });
        },
      })
      .render('#paypal-button-container');

    this.isPayPalReady = true;
  }

  /**
   * Update order status
   */
  updateOrderStatus(status: any): void {
    if (!this.orderId) return;

    this.orderService
      .updateOrderStatus(this.orderId, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error updating order status:', error);
        },
      });
  }

  /**
   * Use alternative payment method (Stripe) as fallback
   */
  useFallbackPayment(): void {
    this.router.navigate(['/payment/stripe'], {
      queryParams: {
        order_id: this.orderId,
        amount: this.orderTotal,
      },
    });
  }

  /**
   * Try PayPal payment again
   */
  retryPayPalPayment(): void {
    this.error = null;
    this.showFallbackOption = false;
    this.initPayPalPayment();
  }

  /**
   * Cancel payment and return to cart
   */
  cancelPayment(): void {
    if (this.isProcessing) {
      return;
    }

    this.router.navigate(['/cart']);
  }
}
