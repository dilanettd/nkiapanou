// dashboard-admin.component.ts
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { MaxValuePipe } from '../../../../core/pipes/max-value.pipe';
import {
  CategoryPerformance,
  DashboardService,
  DashboardSummary,
  ProductPerformance,
  SalesData,
} from '../../../../core/services/dashboard/dashboard.service';
import { OrderService } from '../../../../core/services/order/order.service';
import { ProductService } from '../../../../core/services/product/product.service';
import { ReviewService } from '../../../../core/services/review/review.service';
import { UserService } from '../../../../core/services/user/user.service';

Chart.register(...registerables);

// Interface pour les données des séries temporelles
interface TimeSeriesData {
  period: string;
  value: number;
}

// Interfaces pour garantir la sécurité des types
interface SafeProductPerformance extends ProductPerformance {
  id?: number;
  name: string;
  sku: string;
  sold: number;
  revenue: number;
  stock: number;
}

interface SafeCategoryPerformance extends CategoryPerformance {
  id?: number;
  name: string;
  sold: number;
  revenue: number;
}

@Component({
  selector: 'nkiapanou-dashboard-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, MaxValuePipe],
  templateUrl: './dashboard-admin.component.html',
  styleUrl: './dashboard-admin.component.scss',
})
export class DashboardAdminComponent implements OnInit, AfterViewInit {
  @ViewChild('salesChart') salesChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('usersChart') usersChartCanvas!: ElementRef<HTMLCanvasElement>;

  private dashboardService = inject(DashboardService);
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private userService = inject(UserService);
  private reviewService = inject(ReviewService);

  // Chart instances
  salesChart: Chart | null = null;
  ordersChart: Chart | null = null;
  usersChart: Chart | null = null;

  // Dashboard data
  loading = true;
  summary: DashboardSummary | null = null;
  salesByDay: SalesData[] = [];
  salesByMonth: SalesData[] = [];
  ordersByDay: TimeSeriesData[] = [];
  ordersByMonth: TimeSeriesData[] = [];
  usersByDay: TimeSeriesData[] = [];
  usersByMonth: TimeSeriesData[] = [];
  topProducts: SafeProductPerformance[] = [];
  topCategories: SafeCategoryPerformance[] = [];

  // Dates pour affichage des périodes
  currentMonth = '';
  previousMonth = '';
  currentYear = '';

  // Chart view
  chartView: 'daily' | 'monthly' = 'monthly';

  ngOnInit(): void {
    this.initializeDates();
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Les graphiques seront initialisés une fois les données chargées
  }

  /**
   * Initialise les libellés de date pour les comparaisons
   */
  private initializeDates(): void {
    const now = new Date();

    // Mois actuel
    this.currentMonth = new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
    }).format(now);

    // Mois précédent
    const prevMonth = new Date(now);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    this.previousMonth = new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
    }).format(prevMonth);

    // Année actuelle
    this.currentYear = now.getFullYear().toString();
  }

  /**
   * Charge toutes les données du tableau de bord
   */
  loadDashboardData(): void {
    this.loading = true;

    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.summary = data.summary;

        // Validation et conversion des données SalesData
        this.salesByDay = this.validateArray<SalesData>(data.salesByDay);
        this.salesByMonth = this.validateArray<SalesData>(data.salesByMonth);

        // Conversion des séries temporelles
        this.ordersByDay = this.validateArray<TimeSeriesData>(data.ordersByDay);
        this.ordersByMonth = this.validateArray<TimeSeriesData>(
          data.ordersByMonth
        );
        this.usersByDay = this.validateArray<TimeSeriesData>(data.usersByDay);
        this.usersByMonth = this.validateArray<TimeSeriesData>(
          data.usersByMonth
        );

        // Traitement des topProducts
        this.topProducts = this.processProductData(data.topProducts);

        // Traitement des topCategories
        this.topCategories = this.processCategoryData(data.topCategories);

        this.loading = false;

        // Initialiser les graphiques après le chargement des données
        setTimeout(() => {
          this.initCharts();
        }, 0);
      },
      error: (error) => {
        console.error(
          'Erreur lors du chargement des données du tableau de bord',
          error
        );
        this.loading = false;
        // Initialiser des données vides en cas d'erreur
        this.topProducts = [];
        this.topCategories = [];
      },
    });
  }

  /**
   * Valide et convertit un tableau provenant de l'API
   */
  private validateArray<T>(data: any): T[] {
    if (Array.isArray(data)) {
      return data as T[];
    }
    return [];
  }

  /**
   * Traite les données de produits pour garantir un format cohérent
   */
  private processProductData(data: any): SafeProductPerformance[] {
    if (Array.isArray(data)) {
      return data
        .filter(
          (product): product is object =>
            product !== null && product !== undefined
        )
        .map((product) => this.createSafeProduct(product));
    } else if (data && typeof data === 'object') {
      return Object.values(data)
        .filter(
          (product): product is object =>
            product !== null && product !== undefined
        )
        .map((product) => this.createSafeProduct(product));
    }
    return [];
  }

  /**
   * Traite les données de catégories pour garantir un format cohérent
   */
  private processCategoryData(data: any): SafeCategoryPerformance[] {
    if (Array.isArray(data)) {
      return data
        .filter(
          (category): category is object =>
            category !== null && category !== undefined
        )
        .map((category) => this.createSafeCategory(category));
    } else if (data && typeof data === 'object') {
      return Object.values(data)
        .filter(
          (category): category is object =>
            category !== null && category !== undefined
        )
        .map((category) => this.createSafeCategory(category));
    }
    return [];
  }

  /**
   * Crée un objet produit sécurisé à partir des données brutes
   */
  private createSafeProduct(rawProduct: object): SafeProductPerformance {
    const product = rawProduct as Partial<SafeProductPerformance>;
    return {
      id: product.id ?? undefined,
      name: product.name ?? 'Sans nom',
      sku: product.sku ?? 'N/A',
      sold: product.sold ?? 0,
      revenue: product.revenue ?? 0,
      stock: product.stock ?? 0,
    };
  }

  /**
   * Crée un objet catégorie sécurisé à partir des données brutes
   */
  private createSafeCategory(rawCategory: object): SafeCategoryPerformance {
    const category = rawCategory as Partial<SafeCategoryPerformance>;
    return {
      id: category.id ?? undefined,
      name: category.name ?? 'Catégorie sans nom',
      sold: category.sold ?? 0,
      revenue: category.revenue ?? 0,
    };
  }

  /**
   * Initialise les graphiques Chart.js
   */
  initCharts(): void {
    this.initSalesChart();
    this.initOrdersChart();
    this.initUsersChart();
  }

  /**
   * Initialise le graphique des ventes
   */
  initSalesChart(): void {
    if (!this.salesChartCanvas) return;

    const ctx = this.salesChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data =
      this.chartView === 'daily' ? this.salesByDay : this.salesByMonth;

    // Détruire le graphique existant s'il y en a un
    if (this.salesChart) {
      this.salesChart.destroy();
    }

    this.salesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((item) => item.period),
        datasets: [
          {
            label: 'Ventes',
            data: data.map((item) => item.amount),
            backgroundColor: 'rgba(235, 196, 53, 0.7)',
            borderColor: 'rgba(235, 196, 53, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return this.formatPrice(value);
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return this.formatPrice(value as number);
              },
            },
          },
        },
      },
    });
  }

  /**
   * Initialise le graphique des commandes
   */
  initOrdersChart(): void {
    if (!this.ordersChartCanvas) return;

    const ctx = this.ordersChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data =
      this.chartView === 'daily' ? this.ordersByDay : this.ordersByMonth;

    // Détruire le graphique existant s'il y en a un
    if (this.ordersChart) {
      this.ordersChart.destroy();
    }

    this.ordersChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((item) => item.period),
        datasets: [
          {
            label: 'Commandes',
            data: data.map((item) => item.value),
            backgroundColor: 'rgba(108, 132, 175, 0.2)',
            borderColor: 'rgba(108, 132, 175, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });
  }

  /**
   * Initialise le graphique des utilisateurs
   */
  initUsersChart(): void {
    if (!this.usersChartCanvas) return;

    const ctx = this.usersChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data =
      this.chartView === 'daily' ? this.usersByDay : this.usersByMonth;

    // Détruire le graphique existant s'il y en a un
    if (this.usersChart) {
      this.usersChart.destroy();
    }

    this.usersChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((item) => item.period),
        datasets: [
          {
            label: 'Nouveaux utilisateurs',
            data: data.map((item) => item.value),
            backgroundColor: 'rgba(223, 196, 91, 0.2)',
            borderColor: 'rgba(223, 196, 91, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });
  }

  /**
   * Change la vue des graphiques (journalière ou mensuelle)
   */
  changeChartView(view: 'daily' | 'monthly'): void {
    this.chartView = view;
    this.initCharts();
  }

  /**
   * Formate un montant en euros
   */
  formatPrice(price: number): string {
    return this.dashboardService.formatPrice(price);
  }

  /**
   * Formate un pourcentage
   */
  formatPercent(value: number): string {
    return this.dashboardService.formatPercent(value);
  }

  /**
   * Retourne la classe CSS pour une variation positive ou négative
   */
  getChangeClass(value: number): string {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  }

  /**
   * Retourne l'icône pour une variation positive ou négative
   */
  getChangeIcon(value: number): string {
    return value >= 0 ? 'trending-up' : 'trending-down';
  }

  /**
   * Calcule le total des ventes pour la période courante (7 derniers jours)
   */
  getCurrentPeriodSales(): number {
    return this.salesByDay.reduce((total, day) => total + day.amount, 0);
  }

  /**
   * Pour simuler une variation par rapport à la période précédente
   */
  getPreviousPeriodSales(): number {
    // Simulation: entre 80% et 110% des ventes actuelles
    const currentSales = this.getCurrentPeriodSales();
    const factor = 0.8 + Math.random() * 0.3;
    return currentSales * factor;
  }

  /**
   * Calcule le pourcentage de variation entre la période actuelle et précédente
   */
  getSalesChange(): number {
    const current = this.getCurrentPeriodSales();
    const previous = this.getPreviousPeriodSales();
    return this.dashboardService.calculateChange(current, previous);
  }

  /**
   * Formate des variations en pourcentage avec signe + ou -
   */
  formatChange(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return sign + value.toFixed(1) + '%';
  }

  /**
   * Génère une couleur selon le niveau de stock
   */
  getStockLevelClass(stock: number): string {
    if (stock <= 5) return 'text-red-600';
    if (stock <= 10) return 'text-yellow-600';
    return 'text-green-600';
  }

  /**
   * Calcule le total des commandes pour la période
   */
  getTotalOrders(): number {
    return this.ordersByDay.reduce((total, day) => total + day.value, 0);
  }

  /**
   * Calcule le total des nouveaux utilisateurs pour la période
   */
  getTotalNewUsers(): number {
    return this.usersByDay.reduce((total, day) => total + day.value, 0);
  }
}
