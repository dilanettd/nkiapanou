import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { OrderService } from '../../../../core/services/order/order.service';
import { IOrder } from '../../../../core/models/order-model';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { LoginModalComponent } from '../../../../shared/components/login-modal/login-modal.component';
import { PaymentValidationComponent } from '../../../product-detail/components/payment-validation/payment-validation.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'nkiapanou-purchases',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './purchases.component.html',
  styleUrl: './purchases.component.scss',
})
export class PurchasesComponent {
  orders: IOrder[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private modalService: NgbModal,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchUserOrders();
  }

  fetchUserOrders(): void {
    this.isLoading = true;
    this.orderService.getUserOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Unable to fetch orders. Please try again.';
        this.isLoading = false;
      },
    });
  }

  openPaymentModal(order_payment: any) {
    if (this.authService.isAuthenticate()) {
      const modalRef = this.modalService.open(PaymentValidationComponent);
      modalRef.componentInstance.order_payment = order_payment;
    } else {
      this.toastr.error('You must be logged in to pay');
      this.modalService.open(LoginModalComponent);
    }
  }
}
