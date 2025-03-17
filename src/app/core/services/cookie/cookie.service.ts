import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CookieConsentComponent } from '../../../shared/components/cookie-consent/cookie-consent.component';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class CookieService {
  private modalService = inject(NgbModal);
  private router = inject(Router);

  /**
   * Vérifie si l'utilisateur a déjà donné son consentement pour les cookies
   */
  public hasConsent(): boolean {
    return !!localStorage.getItem('cookieConsent');
  }

  /**
   * Récupère le niveau de consentement ('all', 'essential' ou null)
   */
  public getConsentLevel(): string | null {
    return localStorage.getItem('cookieConsent');
  }

  /**
   * Supprime le consentement (utilisé pour forcer la réapparition de la bannière)
   */
  public removeConsent(): void {
    localStorage.removeItem('cookieConsent');
  }

  /**
   * Vérifie si l'utilisateur a accepté tous les cookies
   */
  public hasFullConsent(): boolean {
    return localStorage.getItem('cookieConsent') === 'all';
  }

  /**
   * Vérifie si l'URL courante contient le terme 'admin'
   */
  private isAdminPage(): boolean {
    const currentUrl = this.router.url;
    return currentUrl.includes('admin');
  }

  /**
   * Affiche la bannière de consentement des cookies si l'utilisateur n'a pas déjà consenti
   * et si l'utilisateur n'est pas sur une page admin
   * Retourne true si la bannière est affichée, false sinon
   */
  public showConsentBannerIfNeeded(): boolean {
    // Ne pas afficher la bannière si:
    // 1. L'utilisateur a déjà donné son consentement, OU
    // 2. L'utilisateur est sur une page admin
    if (this.hasConsent() || this.isAdminPage()) {
      return false;
    }

    const modalRef = this.modalService.open(CookieConsentComponent);

    return true;
  }
}
