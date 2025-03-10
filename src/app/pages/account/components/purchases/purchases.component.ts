import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Order } from '../../../../core/models2/order.model';
import { PurchaseService } from '../../../../core/services/purchase/purchase.service';

@Component({
  selector: 'nkiapanou-purchases',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './purchases.component.html',
  styleUrl: './purchases.component.scss',
})
export class PurchasesComponent {
  orders: Order[] = [];
  loading: boolean = true;
  selectedOrder: Order | null = null;
  showDetails: boolean = false;

  private purchaseService = inject(PurchaseService);
  private toastr = inject(ToastrService);

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
        this.toastr.error('Erreur lors du chargement des commandes');
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
          this.toastr.error('Commande introuvable');
        }
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error(
          'Erreur lors du chargement des détails de la commande'
        );
        this.loading = false;
        console.error('Error loading order details:', error);
      },
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedOrder = null;
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
        return 'Carte bancaire (Stripe)';
      case 'paypal':
        return 'PayPal';
      default:
        return method;
    }
  }

  formatDate(dateString: string): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }
}
