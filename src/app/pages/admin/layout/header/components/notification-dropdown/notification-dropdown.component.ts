import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { ContactService } from '../../../../../../core/services/contact/contact.service';

@Component({
  selector: 'notification-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule],
  animations: [
    trigger('menuAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate(
          '200ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '150ms ease-in',
          style({ opacity: 0, transform: 'translateY(-10px)' })
        ),
      ]),
    ]),
  ],
  templateUrl: './notification-dropdown.component.html',
  styleUrl: './notification-dropdown.component.scss',
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;

  private contactService = inject(ContactService);
  private router = inject(Router);

  isOpen = false;
  messages: any[] = [];
  unreadCount = 0;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Charger les messages non lus au démarrage et toutes les 60 secondes
    this.subscriptions.push(
      interval(60000)
        .pipe(
          startWith(0),
          switchMap(() =>
            this.contactService.getContactMessages({
              limit: 5,
              is_read: false,
              sort_by: 'created_at',
              sort_direction: 'desc',
            })
          )
        )
        .subscribe((response) => {
          if (response.status === 'success') {
            this.messages = response.data.contacts;
            this.unreadCount = response.data.total;
          }
        })
    );
  }

  ngOnDestroy(): void {
    // Se désabonner pour éviter les fuites mémoire
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Tronquer un message pour l'affichage dans les notifications
   */
  truncateMessage(message: string, length: number = 30): string {
    if (message.length <= length) return message;
    return message.substring(0, length) + '...';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Fermer le menu si on clique en dehors
    if (
      this.isOpen &&
      this.dropdownContainer &&
      !this.dropdownContainer.nativeElement.contains(event.target as Node)
    ) {
      this.isOpen = false;
    }
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  handleMessageClick(message: any): void {
    this.isOpen = false;

    // Marquer le message comme lu
    this.contactService.markAsRead(message.id).subscribe({
      next: () => {
        // Rediriger vers la page de messages
        this.router.navigate(['/admin/messages', message.id]);
      },
      error: (error) => {
        console.error('Erreur lors du marquage du message comme lu', error);
      },
    });
  }

  viewAllMessages(): void {
    this.isOpen = false;
    this.router.navigate(['/admin/messages']);
  }

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor(
      (now.getTime() - messageTime.getTime()) / 1000
    );

    if (diffInSeconds < 60) {
      return "à l'instant";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `il y a ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `il y a ${hours} ${hours === 1 ? 'heure' : 'heures'}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `il y a ${days} ${days === 1 ? 'jour' : 'jours'}`;
    }
  }
}
