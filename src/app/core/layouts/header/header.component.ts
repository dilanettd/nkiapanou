import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterModule } from '@angular/router';

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
  isUserLoggedIn = false;
  currentLanguage = 'English';
  isMobileSearchOpen = false;

  constructor() {}

  ngOnInit(): void {}

  // Fermer les dropdowns lorsqu'on clique ailleurs sur la page
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Vérifier si le clic est en dehors des dropdowns
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
      this.isMobileMenuOpen = false; // Ferme le menu si la recherche est ouverte
    }
  }

  toggleLanguageDropdown(): void {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
    // Fermer l'autre dropdown si ouvert
    if (this.isLanguageDropdownOpen) {
      this.isAuthDropdownOpen = false;
    }
  }

  toggleAuthDropdown(): void {
    this.isAuthDropdownOpen = !this.isAuthDropdownOpen;
    // Fermer l'autre dropdown si ouvert
    if (this.isAuthDropdownOpen) {
      this.isLanguageDropdownOpen = false;
    }
  }

  selectLanguage(language: string, event: Event): void {
    event.preventDefault();
    this.currentLanguage = language;
    // Enregistrer la langue sélectionnée
    localStorage.setItem('currentLanguage', language);
    // Fermer le dropdown
    this.isLanguageDropdownOpen = false;

    // Ici, vous pourriez implémenter la logique pour changer la langue de l'application
    // Par exemple, en utilisant un service de traduction comme ngx-translate
  }

  logout(event: Event): void {}

  closeAuthDropdown(): void {
    this.isAuthDropdownOpen = false;
  }
}
