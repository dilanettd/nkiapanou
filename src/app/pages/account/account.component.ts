import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  Router,
  RouterModule,
  RouterOutlet,
  NavigationEnd,
} from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IUser } from '../../core/models2/user.model';

@Component({
  selector: 'nkiapanou-account',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent implements OnInit, OnDestroy {
  user: IUser | null = null;
  activeLink: string = 'profile';
  loading: boolean = true;

  private userSubscription: Subscription | null = null;
  private routerSubscription: Subscription | null = null;

  private authService = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  constructor() {}

  ngOnInit(): void {
    this.getUserData();
    this.updateActiveLink();

    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateActiveLink();
      });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }

    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  updateActiveLink(): void {
    const urlSegments = this.router.url.split('/');
    const currentPath = urlSegments[urlSegments.length - 1];

    if (currentPath && currentPath !== 'account') {
      this.activeLink = currentPath;
    } else if (urlSegments.includes('profile')) {
      this.activeLink = 'profile';
    }
  }

  getUserData(): void {
    this.loading = true;

    const currentUser = this.authService.getCurrentUser();

    if (currentUser) {
      this.user = currentUser;

      if (!this.authService.isAuthenticated()) {
        this.toastr.error('Session expirée');
        this.router.navigate(['/login']);
        return;
      }

      this.userSubscription = this.authService
        .getUser()
        .subscribe((userData) => {
          if (userData) {
            this.user = userData;
          }
        });

      this.loading = false;
    } else {
      this.toastr.error('Accès refusé');
      this.router.navigate(['/login']);
    }
  }

  navigateTo(page: string): void {
    this.activeLink = page;
    this.router.navigate(['/account', page]);
  }

  logout(): void {
    this.loading = true;

    this.authService.logout().subscribe({
      next: () => {
        this.toastr.success('Déconnexion réussie');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.toastr.error('Erreur de déconnexion');
        this.loading = false;
        console.error('Error during logout:', err);
      },
    });
  }
}
