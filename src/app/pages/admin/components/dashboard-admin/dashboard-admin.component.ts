// dashboard-admin.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { IDashboardCard } from '../../../../core/models/dashboard.model';
import { DashboardService } from '../../../../core/services/dashboard/dashboard.service';

@Component({
  selector: 'nkiapanou-dashboard-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-admin.component.html',
  styleUrl: './dashboard-admin.component.scss',
})
export class DashboardAdminComponent {
  dashboardService = inject(DashboardService);
  dashboardCards: IDashboardCard[] = [];
  isLoading: boolean = true;

  ngOnInit(): void {
    this.dashboardService.getDashboardStats().subscribe({
      next: (data) => {
        this.dashboardCards = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.isLoading = false;
      },
    });
  }
}
