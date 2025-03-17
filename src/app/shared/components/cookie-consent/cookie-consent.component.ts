import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'nkiapanou-cookie-consent',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-consent.component.html',
  styleUrl: './cookie-consent.component.scss',
})
export class CookieConsentComponent implements OnInit {
  private activeModal = inject(NgbActiveModal);

  ngOnInit(): void {
    // Rien à initialiser pour le moment
  }

  /**
   * Accepte uniquement les cookies essentiels
   */
  acceptEssentialOnly(): void {
    localStorage.setItem('cookieConsent', 'essential');
    this.activeModal.close('essential');
  }

  /**
   * Accepte tous les types de cookies
   */
  acceptAll(): void {
    localStorage.setItem('cookieConsent', 'all');
    this.activeModal.close('all');
  }

  /**
   * Ferme la modal sans accepter (l'utilisateur verra à nouveau la modal lors de sa prochaine visite)
   */
  close(): void {
    this.activeModal.dismiss('dismiss');
  }
}
