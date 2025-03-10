import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnInit, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginModalComponent } from '../../../shared/components/login-modal/login-modal.component';
import { RegisterModalComponent } from '../../../shared/components/register-modal/register-modal.component';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'nkiapanou-header',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  isMobileMenuOpen = false;
  isLanguageDropdownOpen = false;
  isAuthDropdownOpen = false;
  isAuthenticated = false;
  userName = '';
  currentLanguage = 'English';
  isMobileSearchOpen = false;
  modalService = inject(NgbModal);
  authService = inject(AuthService);

  constructor() {
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
    this.isAuthenticated = this.authService.isAuthenticated();

    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userName = currentUser.name;
    }

    const savedLanguage = localStorage.getItem('currentLanguage');
    if (savedLanguage) {
      this.currentLanguage = savedLanguage;
    }
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
    this.authService.logout().subscribe({
      next: (response) => {
        this.closeAuthDropdown();
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
  }

  openSignupModal(): void {
    this.modalService.open(RegisterModalComponent);
  }
}
