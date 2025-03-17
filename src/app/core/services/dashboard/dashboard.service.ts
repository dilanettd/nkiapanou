import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { OrderService } from '../order/order.service';
import { ProductService } from '../product/product.service';
import { UserService } from '../user/user.service';
import { ReviewService } from '../review/review.service';

export interface DashboardSummary {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  pendingOrders: number;
  lowStockProducts: number;
  recentReviews: number;
}

export interface SalesData {
  period: string;
  amount: number;
}

export interface TimeSeriesData {
  period: string;
  value: number;
}

export interface ProductPerformance {
  id?: number;
  name: string;
  sku: string;
  sold: number;
  revenue: number;
  stock: number;
}

export interface CategoryPerformance {
  id?: number;
  name: string;
  sold: number;
  revenue: number;
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  private apiUrl = environment.API_URL;

  constructor() {}

  /**
   * Récupère toutes les données pour le tableau de bord
   */
  getDashboardData(): Observable<{
    summary: DashboardSummary;
    salesByDay: SalesData[];
    salesByMonth: SalesData[];
    ordersByDay: TimeSeriesData[];
    ordersByMonth: TimeSeriesData[];
    usersByDay: TimeSeriesData[];
    usersByMonth: TimeSeriesData[];
    topProducts: ProductPerformance[];
    topCategories: CategoryPerformance[];
  }> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/admin/dashboard`)
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            return response.data;
          }
          throw new Error('Failed to fetch dashboard data');
        }),
        catchError((error) => {
          console.error('Error fetching dashboard data:', error);
          // Retourne des données vides en cas d'erreur
          return of({
            summary: {
              totalSales: 0,
              totalOrders: 0,
              totalCustomers: 0,
              totalProducts: 0,
              averageOrderValue: 0,
              pendingOrders: 0,
              lowStockProducts: 0,
              recentReviews: 0,
            },
            salesByDay: [],
            salesByMonth: [],
            ordersByDay: [],
            ordersByMonth: [],
            usersByDay: [],
            usersByMonth: [],
            topProducts: [],
            topCategories: [],
          });
        })
      );
  }

  /**
   * Récupère le résumé des statistiques du tableau de bord
   */
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http
      .get<ApiResponse<DashboardSummary>>(
        `${this.apiUrl}/admin/dashboard/summary`
      )
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            return response.data;
          }
          throw new Error('Failed to fetch dashboard summary');
        }),
        catchError((error) => {
          console.error('Error fetching dashboard summary:', error);
          // Retourne des données vides en cas d'erreur
          return of({
            totalSales: 0,
            totalOrders: 0,
            totalCustomers: 0,
            totalProducts: 0,
            averageOrderValue: 0,
            pendingOrders: 0,
            lowStockProducts: 0,
            recentReviews: 0,
          });
        })
      );
  }

  /**
   * Récupère les données de ventes par jour sur les 7 derniers jours
   */
  getSalesByDay(): Observable<SalesData[]> {
    return this.http
      .get<ApiResponse<SalesData[]>>(
        `${this.apiUrl}/admin/dashboard/sales/daily`
      )
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            return response.data;
          }
          throw new Error('Failed to fetch daily sales data');
        }),
        catchError((error) => {
          console.error('Error fetching daily sales data:', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère les données de ventes par mois sur les 6 derniers mois
   */
  getSalesByMonth(): Observable<SalesData[]> {
    return this.http
      .get<ApiResponse<SalesData[]>>(
        `${this.apiUrl}/admin/dashboard/sales/monthly`
      )
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            return response.data;
          }
          throw new Error('Failed to fetch monthly sales data');
        }),
        catchError((error) => {
          console.error('Error fetching monthly sales data:', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère les produits les plus vendus
   */
  getTopProducts(): Observable<ProductPerformance[]> {
    return this.http
      .get<ApiResponse<ProductPerformance[]>>(
        `${this.apiUrl}/admin/dashboard/products/top`
      )
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            return response.data;
          }
          throw new Error('Failed to fetch top products');
        }),
        catchError((error) => {
          console.error('Error fetching top products:', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère les catégories les plus performantes
   */
  getTopCategories(): Observable<CategoryPerformance[]> {
    return this.http
      .get<ApiResponse<CategoryPerformance[]>>(
        `${this.apiUrl}/admin/dashboard/categories/top`
      )
      .pipe(
        map((response) => {
          if (response.status === 'success') {
            return response.data;
          }
          throw new Error('Failed to fetch top categories');
        }),
        catchError((error) => {
          console.error('Error fetching top categories:', error);
          return of([]);
        })
      );
  }

  /**
   * Récupère les données de commandes par jour et par mois (non fourni par l'API)
   * Ces données sont dérivées des données de ventes
   */
  private getOrdersByDay(): Observable<TimeSeriesData[]> {
    // Ces données sont maintenant incluses dans la réponse principale de l'API
    return of([]);
  }

  private getOrdersByMonth(): Observable<TimeSeriesData[]> {
    // Ces données sont maintenant incluses dans la réponse principale de l'API
    return of([]);
  }

  /**
   * Récupère les données d'utilisateurs par jour et par mois (non fourni par l'API)
   * Ces données sont dérivées d'autres sources
   */
  private getUsersByDay(): Observable<TimeSeriesData[]> {
    // Ces données sont maintenant incluses dans la réponse principale de l'API
    return of([]);
  }

  private getUsersByMonth(): Observable<TimeSeriesData[]> {
    // Ces données sont maintenant incluses dans la réponse principale de l'API
    return of([]);
  }

  /**
   * Formate un montant en euros
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }

  /**
   * Formate un pourcentage
   */
  formatPercent(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value / 100);
  }

  /**
   * Calcule le pourcentage de variation entre deux valeurs
   */
  calculateChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
}
