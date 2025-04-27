import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  inject,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { LoginModalComponent } from '../../../shared/components/login-modal/login-modal.component';
import { RegisterModalComponent } from '../../../shared/components/register-modal/register-modal.component';
import { AuthService } from '../../services/auth/auth.service';
import { CartService } from '../../services/cart/cart.service';
import { CategoryService } from '../../services/category/category.service';
import { ICategory } from '../../models/category.model';
import { WishlistService } from '../../services/wishlist/wishlist.service';
import { CookieService } from '../../services/cookie/cookie.service';

@Component({
  selector: 'nkiapanou-header',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isMobileMenuOpen = false;
  isLanguageDropdownOpen = false;
  isAuthDropdownOpen = false;
  isAuthenticated = false;
  userName = '';
  currentLanguage = 'English';
  isMobileSearchOpen = false;

  searchTerm = '';
  selectedCategory = 'all';

  cartItemCount = 0;
  wishlistItemCount = 0;

  categories: ICategory[] = [];

  modalService = inject(NgbModal);
  authService = inject(AuthService);
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  categoryService = inject(CategoryService);
  router = inject(Router);
  cookieService = inject(CookieService);

  constructor() {
    // Utilisation des effets pour la réactivité des signals
    effect(() => {
      this.isAuthenticated = this.authService.authStatus();

      if (this.isAuthenticated && this.authService.currentUser()) {
        this.userName = this.authService.currentUser()?.name || '';
      } else {
        this.userName = '';
      }
    });
  }

  ngOnInit(): void {
    this.cookieService.showConsentBannerIfNeeded();
    // S'abonner à l'Observable d'authentification
    this.authService
      .isAuthenticated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated) => {
        this.isAuthenticated = isAuthenticated;

        // Mettre à jour le nom d'utilisateur lorsque l'état d'authentification change
        if (isAuthenticated) {
          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            this.userName = currentUser.name;
          }
        } else {
          this.userName = '';
        }
      });

    // Récupérer la langue sauvegardée
    const savedLanguage = localStorage.getItem('currentLanguage');
    if (savedLanguage) {
      this.currentLanguage = savedLanguage;
    }

    // S'abonner au nombre d'articles dans le panier
    this.cartService
      .getCartItemCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.cartItemCount = count;
      });

    // S'abonner aux articles de la wishlist
    this.wishlistService.wishlist$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.wishlistItemCount = items.length;
      });

    // Charger les catégories
    this.loadCategories();
  }

  ngOnDestroy(): void {
    // Nettoyer les abonnements pour éviter les fuites mémoire
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.categoryService
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.categories = res.data.categories;
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-dropdown]')) {
      this.isLanguageDropdownOpen = false;
      this.isAuthDropdownOpen = false;
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleMobileSearch() {
    this.isMobileSearchOpen = !this.isMobileSearchOpen;
    if (this.isMobileSearchOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  toggleLanguageDropdown(): void {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
    if (this.isLanguageDropdownOpen) {
      this.isAuthDropdownOpen = false;
    }
  }

  toggleAuthDropdown(): void {
    this.isAuthDropdownOpen = !this.isAuthDropdownOpen;
    if (this.isAuthDropdownOpen) {
      this.isLanguageDropdownOpen = false;
    }
  }

  selectLanguage(language: string, event: Event): void {
    event.preventDefault();
    this.currentLanguage = language;
    localStorage.setItem('currentLanguage', language);
    this.isLanguageDropdownOpen = false;
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.closeAuthDropdown();
          // Redirection à la page d'accueil après déconnexion
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('Erreur lors de la déconnexion:', error);
        },
      });
  }

  closeAuthDropdown(): void {
    this.isAuthDropdownOpen = false;
  }

  openLoginModal(): void {
    this.modalService.open(LoginModalComponent);
    this.closeAuthDropdown();
  }

  openSignupModal(): void {
    this.modalService.open(RegisterModalComponent);
    this.closeAuthDropdown();
  }

  performSearch(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    const queryParams: any = {};

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      queryParams.search = this.searchTerm.trim();
    }

    if (this.selectedCategory && this.selectedCategory !== 'all') {
      queryParams.category = this.selectedCategory;
    }

    this.router.navigate(['/products'], { queryParams });

    this.isMobileSearchOpen = false;
  }

  onSearchKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.performSearch();
    }
  }

  navigateToCategory(categoryId: number): void {
    this.router.navigate(['/products'], {
      queryParams: { category: categoryId },
    });
    this.isMobileMenuOpen = false;
  }
}
