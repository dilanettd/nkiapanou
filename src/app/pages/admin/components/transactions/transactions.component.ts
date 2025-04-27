import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import {
  ITransaction,
  ITransactionStatistics,
  PAYMENT_METHODS,
  TRANSACTION_STATUS,
  TRANSACTION_TYPES,
} from '../../../../core/models/order.model';
import { TransactionService } from '../../../../core/services/transaction/transaction.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nkiapanou-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent implements OnInit {
  transactions: ITransaction[] = [];
  statistics: ITransactionStatistics | null = null;
  loading = false;
  loadingStats = false;
  filterForm: FormGroup;
  processingRefund = false;
  refundForm: FormGroup;
  selectedTransaction: ITransaction | null = null;
  showRefundModal = false;
  currentPage = 1;
  totalPages = 1;
  totalTransactions = 0;
  perPage = 10;

  // Constantes pour les sélecteurs de statut, type, et méthode de paiement
  paymentMethods = Object.entries(PAYMENT_METHODS).map(([key, value]) => ({
    label: this.formatLabel(key),
    value,
  }));
  statuses = Object.entries(TRANSACTION_STATUS).map(([key, value]) => ({
    label: this.formatLabel(key),
    value,
  }));
  transactionTypes = Object.entries(TRANSACTION_TYPES).map(([key, value]) => ({
    label: this.formatLabel(key),
    value,
  }));

  readonly TRANSACTION_STATUS = TRANSACTION_STATUS;
  readonly TRANSACTION_TYPES = TRANSACTION_TYPES;
  readonly PAYMENT_METHODS = PAYMENT_METHODS;

  constructor(
    private transactionService: TransactionService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filterForm = this.createFilterForm();
    this.refundForm = this.createRefundForm();
  }

  ngOnInit(): void {
    this.loadTransactions();
    this.loadStatistics();
  }

  createFilterForm(): FormGroup {
    return this.fb.group({
      order_id: [''],
      status: [''],
      payment_method: [''],
      transaction_type: [''],
      date_from: [''],
      date_to: [''],
    });
  }

  createRefundForm(): FormGroup {
    return this.fb.group({
      parent_transaction_id: [''],
      amount: [0],
      reason: [''],
    });
  }

  formatLabel(key: string): string {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  loadTransactions(): void {
    this.loading = true;

    const filters = {
      ...this.filterForm.value,
      // Ne pas envoyer de valeurs vides
      order_id: this.filterForm.value.order_id || undefined,
      status: this.filterForm.value.status || undefined,
      payment_method: this.filterForm.value.payment_method || undefined,
      transaction_type: this.filterForm.value.transaction_type || undefined,
      date_from: this.filterForm.value.date_from || undefined,
      date_to: this.filterForm.value.date_to || undefined,
    };

    this.transactionService
      .getAllTransactions(this.currentPage, this.perPage, filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.transactions = response.data.transactions;
          this.currentPage = response.data.pagination.current_page;
          this.totalPages = response.data.pagination.last_page;
          this.totalTransactions = response.data.pagination.total;
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors du chargement des transactions',
            'Erreur'
          );
          console.error('Error loading transactions:', error);
        },
      });
  }

  loadStatistics(): void {
    this.loadingStats = true;

    const dateFrom = this.filterForm.value.date_from || undefined;
    const dateTo = this.filterForm.value.date_to || undefined;

    this.transactionService
      .getStatistics(dateFrom, dateTo)
      .pipe(finalize(() => (this.loadingStats = false)))
      .subscribe({
        next: (response) => {
          this.statistics = response.data;
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors du chargement des statistiques',
            'Erreur'
          );
          console.error('Error loading statistics:', error);
        },
      });
  }

  applyFilters(): void {
    this.currentPage = 1; // Revenir à la première page
    this.loadTransactions();
    this.loadStatistics();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.currentPage = 1;
    this.loadTransactions();
    this.loadStatistics();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.loadTransactions();
  }

  openRefundModal(transaction: ITransaction): void {
    if (
      transaction.transaction_type !== TRANSACTION_TYPES.PAYMENT ||
      transaction.status !== TRANSACTION_STATUS.COMPLETED
    ) {
      this.toastr.warning(
        'Seules les transactions de paiement complétées peuvent être remboursées',
        'Information'
      );
      return;
    }

    // Calculer le montant déjà remboursé
    const refundedAmount = this.getRefundedAmount(transaction);
    const availableForRefund = transaction.amount - refundedAmount;

    if (availableForRefund <= 0) {
      this.toastr.warning(
        'Cette transaction a déjà été entièrement remboursée',
        'Information'
      );
      return;
    }

    this.selectedTransaction = transaction;
    this.refundForm.patchValue({
      parent_transaction_id: transaction.id,
      amount: availableForRefund, // Par défaut, propose un remboursement total
      reason: '',
    });
    this.showRefundModal = true;
  }

  closeRefundModal(): void {
    this.showRefundModal = false;
    this.selectedTransaction = null;
  }

  processRefund(): void {
    if (this.refundForm.invalid || !this.selectedTransaction) {
      return;
    }

    const refundData = this.refundForm.value;
    const availableForRefund =
      this.selectedTransaction.amount -
      this.getRefundedAmount(this.selectedTransaction);

    if (refundData.amount <= 0 || refundData.amount > availableForRefund) {
      this.toastr.error(
        `Le montant doit être positif et ne pas dépasser ${availableForRefund.toFixed(
          2
        )}`,
        'Erreur'
      );
      return;
    }

    this.processingRefund = true;
    this.transactionService
      .processRefund(refundData)
      .pipe(finalize(() => (this.processingRefund = false)))
      .subscribe({
        next: (response) => {
          this.toastr.success('Remboursement initié avec succès', 'Succès');
          this.closeRefundModal();
          this.loadTransactions();
          this.loadStatistics();
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors du traitement du remboursement',
            'Erreur'
          );
          console.error('Error processing refund:', error);
        },
      });
  }

  getRefundedAmount(transaction: ITransaction): number {
    // Cette fonction calculerait le montant déjà remboursé pour cette transaction
    // Normalement, vous devriez avoir cette information depuis le backend
    // Ici, c'est une simulation basée sur les transactions que nous avons
    const refunds = this.transactions.filter(
      (t) =>
        t.parent_transaction_id === transaction.id &&
        (t.transaction_type === TRANSACTION_TYPES.REFUND ||
          t.transaction_type === TRANSACTION_TYPES.PARTIAL_REFUND) &&
        t.status === TRANSACTION_STATUS.COMPLETED
    );

    return refunds.reduce((sum, refund) => sum + refund.amount, 0);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case TRANSACTION_STATUS.COMPLETED:
        return 'bg-green-100 text-green-800';
      case TRANSACTION_STATUS.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case TRANSACTION_STATUS.FAILED:
        return 'bg-red-100 text-red-800';
      case TRANSACTION_STATUS.REFUNDED:
      case TRANSACTION_STATUS.PARTIALLY_REFUNDED:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getTypeClass(type: string): string {
    switch (type) {
      case TRANSACTION_TYPES.PAYMENT:
        return 'bg-indigo-100 text-indigo-800';
      case TRANSACTION_TYPES.REFUND:
        return 'bg-blue-100 text-blue-800';
      case TRANSACTION_TYPES.PARTIAL_REFUND:
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatAmount(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}
