import { Component } from '@angular/core';
import { IOrder } from '../../../../core/models/order-model';
import { OrderService } from '../../../../core/services/order/order.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nkiapanou-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class OrdersComponent {
  orders: IOrder[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.fetchSellerOrders();
  }

  fetchSellerOrders(): void {
    this.isLoading = true;
    this.orderService.getSellerOrders().subscribe({
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
}
