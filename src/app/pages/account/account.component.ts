import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  Router,
  RouterModule,
  RouterOutlet,
  NavigationEnd,
} from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { CommonModule } from '@angular/common';
import {
  filter,
  takeUntil,
  finalize,
  catchError,
  distinctUntilChanged,
} from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IUser } from '../../core/models2/user.model';

interface LoadingStates {
  initial: boolean;
  profile: boolean;
  logout: boolean;
}

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

  isLoading: LoadingStates = {
    initial: true,
    profile: false,
    logout: false,
  };

  isAuthenticated: boolean = false;

  private destroy$ = new Subject<void>();

  private authService = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  constructor() {}

  ngOnInit(): void {
    this.authService
      .isAuthenticated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuth) => {
        this.isAuthenticated = isAuth;

        if (!isAuth && this.user) {
          this.toastr.error('Session expirée');
          this.router.navigate(['/login']);
        }
      });

    this.getUserData();
    this.subscribeToUserChanges();
    this.updateActiveLink();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateActiveLink();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  subscribeToUserChanges(): void {
    this.authService
      .getUser()
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => {
          if (!prev && !curr) return true;
          if (!prev || !curr) return false;

          return JSON.stringify(prev) === JSON.stringify(curr);
        })
      )
      .subscribe((user) => {
        if (user) {
          this.user = user;
          console.log(
            'AccountComponent: User data updated from external change'
          );
        }
      });
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

  private resetAllLoadingStates(): void {
    this.isLoading.initial = false;
    this.isLoading.profile = false;
    this.isLoading.logout = false;
  }

  getUserData(): void {
    this.isLoading.initial = true;

    this.authService
      .isAuthenticated()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (!this.isAuthenticated) {
            this.resetAllLoadingStates();
          }
        })
      )
      .subscribe({
        next: (isAuth) => {
          if (!isAuth) {
            this.toastr.error('Accès refusé - Veuillez vous connecter');
            this.router.navigate(['/login']);
            this.isLoading.initial = false;
            return;
          }

          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            this.user = currentUser;

            this.isLoading.initial = false;

            this.isLoading.profile = true;

            this.authService
              .getUser()
              .pipe(
                takeUntil(this.destroy$),
                catchError((err) => {
                  this.toastr.error(
                    'Erreur lors de la récupération des données utilisateur'
                  );
                  console.error('Error fetching user data:', err);
                  this.isLoading.profile = false;
                  return of(null);
                }),
                finalize(() => {
                  this.isLoading.profile = false;
                })
              )
              .subscribe({
                next: (userData) => {
                  if (userData) {
                    this.user = userData;
                  }
                },
              });
          } else {
            this.toastr.error(
              'Impossible de récupérer les données utilisateur'
            );
            this.router.navigate(['/login']);
            this.resetAllLoadingStates();
          }
        },
        error: (err) => {
          console.error('Authentication check error:', err);
          this.toastr.error("Erreur de vérification d'authentification");
          this.router.navigate(['/login']);
          this.resetAllLoadingStates();
        },
      });
  }

  navigateTo(page: string): void {
    this.activeLink = page;
    this.router.navigate(['/account', page]);
  }

  logout(): void {
    this.isLoading.logout = true;

    this.authService
      .logout()
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.toastr.error('Erreur de déconnexion');
          console.error('Error during logout:', err);
          this.isLoading.logout = false;
          return of(null);
        }),
        finalize(() => {
          this.isLoading.logout = false;
        })
      )
      .subscribe({
        next: (result) => {
          if (result !== null) {
            this.toastr.success('Déconnexion réussie');
            this.router.navigate(['/']);
          }
        },
      });
  }

  get isAnyLoading(): boolean {
    return (
      this.isLoading.initial || this.isLoading.profile || this.isLoading.logout
    );
  }
}
