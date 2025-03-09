import { Component } from '@angular/core';
import { IMomoTransaction } from '../../../../core/models/order-model';
import { OrderService } from '../../../../core/services/order/order.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nkiapanou-transactions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent {
  txn: IMomoTransaction[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  private subscriptions: Subscription = new Subscription();
  logo: string =
    'https://upload.wikimedia.org/wikipedia/fr/thumb/e/e9/Mtn-logo-svg.svg/1200px-Mtn-logo-svg.svg.png';

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.fetchUserOrders();
  }

  fetchUserOrders(): void {
    this.isLoading = true;
    this.subscriptions.add(
      this.orderService.getUserMomoTransactions().subscribe({
        next: (data) => {
          this.txn = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Unable to fetch orders. Please try again.';
          this.isLoading = false;
        },
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
