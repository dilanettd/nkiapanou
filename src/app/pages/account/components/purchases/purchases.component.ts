import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { IOrder } from '../../../../core/models2/order.model';
import { PurchaseService } from '../../../../core/services/purchase/purchase.service';
import { CartService } from '../../../../core/services/cart/cart.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'nkiapanou-purchases',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './purchases.component.html',
  styleUrl: './purchases.component.scss',
})
export class PurchasesComponent {
  orders: IOrder[] = [];
  loading: boolean = true;
  selectedOrder: IOrder | null = null;
  showDetails: boolean = false;

  private purchaseService = inject(PurchaseService);
  private toastr = inject(ToastrService);
  private router = inject(Router);
  private cartService = inject(CartService);

  ngOnInit(): void {
    this.loadUserOrders();
  }

  loadUserOrders(): void {
    this.loading = true;

    this.purchaseService.getUserOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error('Error loading orders');
        this.loading = false;
        console.error('Error loading orders:', error);
      },
    });
  }

  viewOrderDetails(orderId: number): void {
    this.loading = true;

    this.purchaseService.getOrderDetails(orderId).subscribe({
      next: (order) => {
        if (order) {
          this.selectedOrder = order;
          this.showDetails = true;
        } else {
          this.toastr.error(' IOrder not found');
        }
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error('Error loading order details');
        this.loading = false;
        console.error('Error loading order details:', error);
      },
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedOrder = null;
  }

  /**
   * Pay now functionality for orders with pending or failed payment status
   */
  payNow(order: IOrder): void {
    // Show confirmation alert about replacing cart
    if (
      confirm('This will replace any items in your current cart. Continue?')
    ) {
      this.loading = true;

      // First clear the cart, then load the order items
      this.cartService
        .clearCart()
        .pipe(
          switchMap(() => {
            // After clearing, load order items into cart
            return this.cartService.loadOrderToCart(order.id);
          })
        )
        .subscribe({
          next: (result) => {
            this.loading = false;
            if (result.success) {
              this.toastr.success('Order load into cart');
              // Redirect to cart page
              this.router.navigate(['/cart']);
            } else {
              this.toastr.error(result.message || 'Failed to load order');
            }
          },
          error: (error) => {
            this.loading = false;
            console.error('Error processing payment:', error);
            this.toastr.error('Error processing payment');
          },
        });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getPaymentMethodLabel(method: string): string {
    switch (method) {
      case 'stripe':
        return 'Credit Card (Stripe)';
      case 'paypal':
        return 'PayPal';
      default:
        return method;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  getPaymentStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'paid':
        return 'Paid';
      case 'failed':
        return 'Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  }
}
