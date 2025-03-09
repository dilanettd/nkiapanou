import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { OrderService } from '../../../../core/services/order/order.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'nkiapanou-confirm-order',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './confirm-order.component.html',
})
export class ConfirmOrderComponent implements OnInit, OnDestroy {
  @Input({ required: true }) totalAmount!: number;
  @Input({ required: true }) productId!: number;
  @Input({ required: true }) quantity!: number;
  @Input({ required: true }) price!: number;

  isSubmitted: boolean = false;
  orderForm: FormGroup;
  private subscriptions: Subscription = new Subscription();

  get installmentAmount(): number {
    const count = this.orderForm.value.installment_count || 1;
    return Math.ceil(this.totalAmount / count);
  }

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private activeModal: NgbModal,
    private toastr: ToastrService,
    private modalService: NgbModal
  ) {
    this.orderForm = this.fb.group({
      installment_count: [1, [Validators.required, Validators.min(1)]],
      payment_frequency: ['daily', Validators.required],
      reminder_type: ['email', Validators.required],
    });
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.orderForm.get('quantity')?.valueChanges.subscribe(() => {
        this.updateTotalAmount();
      })
    );

    this.subscriptions.add(
      this.orderForm.get('payment_frequency')?.valueChanges.subscribe(() => {
        this.updateInstallmentCount();
      })
    );

    // this.updateInstallmentCount();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  updateInstallmentCount(): void {
    const frequency = this.orderForm.value.payment_frequency;
    const quantity = this.orderForm.value.quantity;
    let maxInstallments = 1;

    switch (frequency) {
      case 'daily':
        maxInstallments = Math.min(quantity, 30);
        break;
      case 'weekly':
        maxInstallments = Math.min(quantity, 4);
        break;
      case 'monthly':
        maxInstallments = Math.min(quantity, 1);
        break;
    }

    if (this.orderForm.value.installment_count > maxInstallments) {
      this.orderForm.patchValue({ installment_count: maxInstallments });
    }
  }

  updateTotalAmount(): void {
    const quantity = this.orderForm.value.quantity || 1;
    this.totalAmount = this.price * quantity;
  }

  closeModal(): void {
    this.activeModal.dismissAll();
  }

  openSuccessModal() {
    const modalRef = this.modalService.open(ConfirmModalComponent);
    modalRef.componentInstance.title = 'Good Job!';
    modalRef.componentInstance.description =
      'Your order has been successfully created! Would you like to go to the purchase page ?';
    modalRef.componentInstance.confirmLink = '/account/purchases';
  }

  confirmOrder(): void {
    if (this.orderForm.valid) {
      this.isSubmitted = true;
      const orderData = {
        ...this.orderForm.value,
        quantity: this.quantity,
        product_id: this.productId,
        total_amount: this.totalAmount,
        installment_amount: this.installmentAmount,
      };
      this.subscriptions.add(
        this.orderService.createOrder(orderData).subscribe({
          next: () => {
            this.isSubmitted = false;
            this.closeModal();
            this.toastr.success('Your order has been successfully registered');
            this.openSuccessModal();
          },
          error: (err) => {
            this.toastr.error('Something unexpected happened');
          },
        })
      );
    }
  }
}
