import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Order, IOrderItem } from '../../models2/order.model';
import { ProductService } from '../product/product.service';

export interface OrderSearchParams {
  page?: number;
  limit?: number;
  user_id?: number;
  status?:
    | 'pending'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'all';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'all';
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface OrdersResponse {
  status: string;
  data: {
    orders: Order[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface SingleOrderResponse {
  status: string;
  data: Order;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private productService = inject(ProductService);

  private apiUrl = environment.API_URL;
  private ordersSubject = new BehaviorSubject<Order[]>([]);

  public orders$ = this.ordersSubject.asObservable();

  constructor() {}

  /**
   * Récupère les commandes avec filtres et pagination
   */
  getOrders(params: OrderSearchParams = {}): Observable<OrdersResponse> {
    return this.http
      .get<OrdersResponse>(`${this.apiUrl}/admin/orders`, {
        params: this.buildParams(params),
      })
      .pipe(
        tap((response) => {
          if (response.status === 'success') {
            this.ordersSubject.next(response.data.orders);
          }
        }),
        catchError((error) => {
          console.error('Error fetching orders:', error);
          throw error;
        })
      );
  }

  /**
   * Récupère une commande par son ID
   */
  getOrderById(id: number): Observable<Order | null> {
    return this.http
      .get<SingleOrderResponse>(`${this.apiUrl}/admin/orders/${id}`)
      .pipe(
        map((response) =>
          response.status === 'success' ? response.data : null
        ),
        catchError((error) => {
          console.error(`Error fetching order ${id}:`, error);
          return [];
        })
      );
  }

  /**
   * Met à jour le statut d'une commande
   */
  updateOrderStatus(
    id: number,
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  ): Observable<Order | null> {
    return this.http
      .patch<SingleOrderResponse>(`${this.apiUrl}/admin/orders/${id}/status`, {
        status,
      })
      .pipe(
        map((response) =>
          response.status === 'success' ? response.data : null
        ),
        catchError((error) => {
          console.error(`Error updating order status ${id}:`, error);
          return [];
        })
      );
  }

  /**
   * Met à jour le statut de paiement d'une commande
   */
  updatePaymentStatus(
    id: number,
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  ): Observable<Order | null> {
    return this.http
      .patch<SingleOrderResponse>(
        `${this.apiUrl}/admin/orders/${id}/payment-status`,
        { payment_status: paymentStatus }
      )
      .pipe(
        map((response) =>
          response.status === 'success' ? response.data : null
        ),
        catchError((error) => {
          console.error(`Error updating payment status ${id}:`, error);
          return [];
        })
      );
  }

  /**
   * Met à jour le numéro de suivi d'une commande
   */
  updateTrackingNumber(
    id: number,
    trackingNumber: string
  ): Observable<Order | null> {
    return this.http
      .patch<SingleOrderResponse>(
        `${this.apiUrl}/admin/orders/${id}/tracking`,
        { tracking_number: trackingNumber }
      )
      .pipe(
        map((response) =>
          response.status === 'success' ? response.data : null
        ),
        catchError((error) => {
          console.error(`Error updating tracking number ${id}:`, error);
          return [];
        })
      );
  }

  /**
   * Construit les paramètres pour les requêtes HTTP
   */
  private buildParams(params: OrderSearchParams): HttpParams {
    let httpParams = new HttpParams();

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }

    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    if (params.user_id !== undefined) {
      httpParams = httpParams.set('user_id', params.user_id.toString());
    }

    if (params.status !== undefined && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }

    if (
      params.payment_status !== undefined &&
      params.payment_status !== 'all'
    ) {
      httpParams = httpParams.set('payment_status', params.payment_status);
    }

    if (params.start_date !== undefined) {
      httpParams = httpParams.set('start_date', params.start_date);
    }

    if (params.end_date !== undefined) {
      httpParams = httpParams.set('end_date', params.end_date);
    }

    if (params.search !== undefined && params.search.trim() !== '') {
      httpParams = httpParams.set('search', params.search);
    }

    if (params.sort_by !== undefined) {
      httpParams = httpParams.set('sort_by', params.sort_by);
    }

    if (params.sort_direction !== undefined) {
      httpParams = httpParams.set('sort_direction', params.sort_direction);
    }

    return httpParams;
  }

  /**
   * Calcule le nombre total d'articles dans une commande
   */
  getTotalItems(order: Order): number {
    if (!order.items || order.items.length === 0) {
      return 0;
    }

    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Obtient une classe CSS correspondant au statut de la commande
   */
  getOrderStatusClass(status: string | undefined): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  /**
   * Obtient une classe CSS correspondant au statut de paiement
   */
  getPaymentStatusClass(status: string | undefined): string {
    switch (status) {
      case 'paid':
        return 'status-paid';
      case 'pending':
        return 'status-payment-pending';
      case 'failed':
        return 'status-failed';
      case 'refunded':
        return 'status-refunded';
      default:
        return '';
    }
  }

  /**
   * Obtient un texte correspondant au statut de la commande
   */
  getOrderStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'processing':
        return 'En traitement';
      case 'shipped':
        return 'Expédiée';
      case 'delivered':
        return 'Livrée';
      case 'cancelled':
        return 'Annulée';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Obtient un texte correspondant au statut de paiement
   */
  getPaymentStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échoué';
      case 'refunded':
        return 'Remboursée';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Obtient un texte correspondant à la méthode de paiement
   */
  getPaymentMethodLabel(method: string | undefined): string {
    switch (method) {
      case 'stripe':
        return 'Carte bancaire (Stripe)';
      case 'paypal':
        return 'PayPal';
      default:
        return 'Inconnu';
    }
  }

  /**
   * Crée une nouvelle commande
   * @param object orderData Les données de la commande
   */
  createOrder(orderData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/orders`, orderData).pipe(
      catchError((error) => {
        console.error('Error creating order:', error);
        throw error;
      })
    );
  }

  /**
   * Récupère l'historique des commandes de l'utilisateur connecté
   */
  getOrdersHistory(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/orders/history`).pipe(
      catchError((error) => {
        console.error('Error fetching order history:', error);
        throw error;
      })
    );
  }

  /**
   * Annule une commande
   * @param id L'ID de la commande à annuler
   */
  cancelOrder(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/orders/${id}/cancel`, {}).pipe(
      catchError((error) => {
        console.error(`Error cancelling order ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Récupère les commandes de l'utilisateur connecté
   * @param params Paramètres de recherche et pagination
   */
  getUserOrders(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();

    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }

    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    if (params.status && params.status !== 'all') {
      httpParams = httpParams.set('status', params.status);
    }

    return this.http
      .get<any>(`${this.apiUrl}/orders`, { params: httpParams })
      .pipe(
        catchError((error) => {
          console.error('Error fetching user orders:', error);
          throw error;
        })
      );
  }

  /**
   * Formate l'adresse complète
   * @param address L'objet adresse
   */
  formatAddress(address: any): string {
    if (!address) return '';

    const parts = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.state_province,
      address.postal_code,
      address.country,
    ];

    return parts.filter((part) => part).join(', ');
  }

  /**
   * Vérifie si l'utilisateur peut annuler une commande
   * Les commandes peuvent généralement être annulées si elles sont en statut 'pending' ou 'processing'
   * @param order La commande à vérifier
   */
  canCancelOrder(order: Order): boolean {
    return ['pending', 'processing'].includes(order.status || '');
  }

  /**
   * Calcule le total d'une commande
   * @param orderItems Les articles de la commande
   */
  calculateOrderTotal(orderItems: IOrderItem[]): number {
    if (!orderItems || orderItems.length === 0) {
      return 0;
    }

    return orderItems.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }

  /**
   * Formatte l'objet commande pour l'envoi à l'API
   * @param cartItems Articles du panier
   * @param shippingAddress Adresse de livraison
   * @param billingAddress Adresse de facturation
   * @param paymentMethod Méthode de paiement
   * @param additionalData Données additionnelles
   */
  formatOrderData(
    cartItems: any[],
    shippingAddress: any,
    billingAddress: any = null,
    paymentMethod: string = 'stripe',
    additionalData: any = {}
  ): any {
    // Si l'adresse de facturation n'est pas fournie, utiliser l'adresse de livraison
    const billing = billingAddress || shippingAddress;

    return {
      payment_method: paymentMethod,
      payment_id: additionalData.payment_id || null,
      billing_address: billing.address_line1,
      billing_city: billing.city,
      billing_postal_code: billing.postal_code,
      billing_country: billing.country,
      shipping_address: shippingAddress.address_line1,
      shipping_city: shippingAddress.city,
      shipping_postal_code: shippingAddress.postal_code,
      shipping_country: shippingAddress.country,
      notes: additionalData.notes || '',
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      shipping_fee: additionalData.shipping_fee || 0,
      tax_amount: additionalData.tax_amount || 0,
      discount_amount: additionalData.discount_amount || 0,
    };
  }

  /**
   * Formate un prix en euros
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }

  /**
   * Formate une date
   */
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
}
