import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { IOrder } from '../../../../core/models/order.model';
import { OrderService } from '../../../../core/services/order/order.service';

@Component({
  selector: 'nkiapanou-orders-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './orders-admin.component.html',
  styleUrl: './orders-admin.component.scss',
})
export class OrdersAdminComponent implements OnInit {
  private orderService = inject(OrderService);
  private formBuilder = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Display properties
  orders: IOrder[] = [];
  loading = true;
  totalItems = 0;
  pageSize = 10;
  currentPage = 1;
  selectedOrder: IOrder | null = null;
  isDetailModalOpen = false;
  isTrackingModalOpen = false;
  trackingNumber = '';

  // Filter properties
  filterForm!: FormGroup;
  sortOptions = [
    { value: 'created_at-desc', label: "Date (récent d'abord)" },
    { value: 'created_at-asc', label: "Date (ancien d'abord)" },
    { value: 'total_amount-desc', label: "Montant (élevé d'abord)" },
    { value: 'total_amount-asc', label: "Montant (faible d'abord)" },
    { value: 'order_number-asc', label: 'Numéro de commande (A-Z)' },
    { value: 'order_number-desc', label: 'Numéro de commande (Z-A)' },
  ];

  statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'pending', label: 'En attente' },
    { value: 'processing', label: 'En traitement' },
    { value: 'shipped', label: 'Expédiée' },
    { value: 'delivered', label: 'Livrée' },
    { value: 'cancelled', label: 'Annulée' },
  ];

  paymentStatusOptions = [
    { value: 'all', label: 'Tous les statuts de paiement' },
    { value: 'paid', label: 'Payée' },
    { value: 'pending', label: 'En attente' },
    { value: 'failed', label: 'Échoué' },
    { value: 'refunded', label: 'Remboursée' },
  ];

  ngOnInit(): void {
    this.initFilterForm();
    this.loadOrders();
  }

  private initFilterForm(): void {
    this.filterForm = this.formBuilder.group({
      search: [''],
      sort: ['created_at-desc'],
      status: ['all'],
      payment_status: ['all'],
      start_date: [''],
      end_date: [''],
    });

    // Subscribe to form value changes to apply filters
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage = 1; // Reset to first page when filters change
      this.loadOrders();
    });
  }

  loadOrders(): void {
    this.loading = true;

    // Get filter values
    const { search, sort, status, payment_status, start_date, end_date } =
      this.filterForm.value;

    // Parse sort value
    let sortBy: string | undefined;
    let sortDirection: 'asc' | 'desc' | undefined;

    if (sort) {
      const [field, direction] = sort.split('-');
      sortBy = field;
      sortDirection = direction as 'asc' | 'desc';
    }

    // Build params
    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      search: search || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
      status: status === 'all' ? undefined : status,
      payment_status: payment_status === 'all' ? undefined : payment_status,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
    };

    this.orderService.getOrders(params).subscribe(
      (response) => {
        if (response.status === 'success') {
          this.orders = response.data.orders;
          this.totalItems = response.data.total;
        } else {
          this.toastr.error(
            'Erreur lors du chargement des commandes',
            'Erreur'
          );
        }
        this.loading = false;
      },
      (error) => {
        this.toastr.error('Erreur de connexion au serveur', 'Erreur');
        this.loading = false;
      }
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadOrders();
  }

  changePageSize(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.pageSize = parseInt(selectElement.value, 10);
    this.currentPage = 1; // Reset to first page when changing page size
    this.loadOrders();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get pages(): number[] {
    const pageCount = this.totalPages;

    // Show maximum 5 page buttons
    if (pageCount <= 5) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    // Complex pagination logic for many pages
    if (this.currentPage <= 3) {
      return [1, 2, 3, 4, 5, -1, pageCount];
    } else if (this.currentPage >= pageCount - 2) {
      return [
        1,
        -1,
        pageCount - 4,
        pageCount - 3,
        pageCount - 2,
        pageCount - 1,
        pageCount,
      ];
    } else {
      return [
        1,
        -1,
        this.currentPage - 1,
        this.currentPage,
        this.currentPage + 1,
        -1,
        pageCount,
      ];
    }
  }

  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      sort: 'created_at-desc',
      status: 'all',
      payment_status: 'all',
      start_date: '',
      end_date: '',
    });
  }

  // Actions sur les commandes
  updateOrderStatus(
    order: IOrder,
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  ): void {
    this.orderService.updateOrderStatus(order.id, status).subscribe(
      (updatedOrder) => {
        if (updatedOrder) {
          // Mise à jour de la commande dans la liste
          const index = this.orders.findIndex((o) => o.id === order.id);
          if (index !== -1) {
            this.orders[index] = updatedOrder;
          }

          // Si on est en train de voir le détail de cette commande, mettre à jour également
          if (this.selectedOrder && this.selectedOrder.id === order.id) {
            this.selectedOrder = updatedOrder;
          }

          this.toastr.success(`Statut de la commande mis à jour`, 'Succès');
        } else {
          this.toastr.error(
            `Erreur lors de la mise à jour du statut`,
            'Erreur'
          );
        }
      },
      (error) => {
        this.toastr.error('Erreur de connexion au serveur', 'Erreur');
      }
    );
  }

  updatePaymentStatus(
    order: IOrder,
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  ): void {
    this.orderService.updatePaymentStatus(order.id, paymentStatus).subscribe(
      (updatedOrder) => {
        if (updatedOrder) {
          // Mise à jour de la commande dans la liste
          const index = this.orders.findIndex((o) => o.id === order.id);
          if (index !== -1) {
            this.orders[index] = updatedOrder;
          }

          // Si on est en train de voir le détail de cette commande, mettre à jour également
          if (this.selectedOrder && this.selectedOrder.id === order.id) {
            this.selectedOrder = updatedOrder;
          }

          this.toastr.success(`Statut de paiement mis à jour`, 'Succès');
        } else {
          this.toastr.error(
            `Erreur lors de la mise à jour du statut de paiement`,
            'Erreur'
          );
        }
      },
      (error) => {
        this.toastr.error('Erreur de connexion au serveur', 'Erreur');
      }
    );
  }

  // Gestion du numéro de suivi
  openTrackingModal(order: IOrder): void {
    this.selectedOrder = order;
    this.trackingNumber = order.tracking_number || '';
    this.isTrackingModalOpen = true;
  }

  closeTrackingModal(): void {
    this.isTrackingModalOpen = false;
    this.trackingNumber = '';
    // Pas besoin de réinitialiser selectedOrder car on pourrait vouloir continuer à voir les détails
  }

  saveTrackingNumber(): void {
    if (!this.selectedOrder) {
      this.toastr.error('Aucune commande sélectionnée', 'Erreur');
      return;
    }

    this.orderService
      .updateTrackingNumber(this.selectedOrder.id, this.trackingNumber)
      .subscribe(
        (updatedOrder) => {
          if (updatedOrder) {
            // Mise à jour de la commande dans la liste
            const index = this.orders.findIndex(
              (o) => o.id === this.selectedOrder!.id
            );
            if (index !== -1) {
              this.orders[index] = updatedOrder;
            }

            // Mettre à jour la commande sélectionnée
            this.selectedOrder = updatedOrder;

            this.toastr.success(`Numéro de suivi mis à jour`, 'Succès');
            this.closeTrackingModal();
          } else {
            this.toastr.error(
              `Erreur lors de la mise à jour du numéro de suivi`,
              'Erreur'
            );
          }
        },
        (error) => {
          this.toastr.error('Erreur de connexion au serveur', 'Erreur');
        }
      );
  }

  // Gestion de la modal de détail
  openDetailModal(order: IOrder): void {
    this.selectedOrder = order;
    this.isDetailModalOpen = true;
  }

  closeDetailModal(): void {
    this.selectedOrder = null;
    this.isDetailModalOpen = false;
  }

  // Méthodes utilitaires
  getTotalItems(order: IOrder): number {
    return this.orderService.getTotalItems(order);
  }

  getOrderStatusClass(status: string | undefined): string {
    return this.orderService.getOrderStatusClass(status);
  }

  getPaymentStatusClass(status: string | undefined): string {
    return this.orderService.getPaymentStatusClass(status);
  }

  getOrderStatusLabel(status: string | undefined): string {
    return this.orderService.getOrderStatusLabel(status);
  }

  getPaymentStatusLabel(status: string | undefined): string {
    return this.orderService.getPaymentStatusLabel(status);
  }

  getPaymentMethodLabel(method: string | undefined): string {
    return this.orderService.getPaymentMethodLabel(method);
  }

  formatPrice(price: number): string {
    return this.orderService.formatPrice(price);
  }

  formatDate(dateString: string): string {
    return this.orderService.formatDate(dateString);
  }
}
