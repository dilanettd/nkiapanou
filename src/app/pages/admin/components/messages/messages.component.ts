import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ContactService,
  ContactMessage,
  ContactSearchParams,
} from '../../../../core/services/contact/contact.service';

@Component({
  selector: 'nkiapanou-messages',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
})
export class MessagesComponent implements OnInit, OnDestroy {
  private contactService = inject(ContactService);
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  messages: ContactMessage[] = [];
  selectedMessage: ContactMessage | null = null;
  filterForm!: FormGroup;

  loading = false;
  submitting = false;
  totalMessages = 0;
  currentPage = 1;
  totalPages = 1;
  pageSize = 10;

  selectedIds: number[] = [];
  selectAll = false;

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Initialiser le formulaire de filtrage
    this.filterForm = this.formBuilder.group({
      search: [''],
      is_read: ['all'], // 'all', 'true', 'false'
    });

    // Vérifier s'il y a un ID de message dans l'URL
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.loadMessageDetails(Number(params['id']));
      }
    });

    // Charger les messages
    this.loadMessages();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Charger la liste des messages avec pagination et filtrage
   */
  loadMessages(page: number = 1): void {
    this.loading = true;
    this.currentPage = page;

    // Construire les paramètres de recherche
    const params: ContactSearchParams = {
      page: this.currentPage,
      limit: this.pageSize,
      sort_by: 'created_at',
      sort_direction: 'desc',
    };

    // Ajouter les filtres si présents
    const searchValue = this.filterForm.get('search')?.value;
    if (searchValue) {
      params.search = searchValue;
    }

    const isReadValue = this.filterForm.get('is_read')?.value;
    if (isReadValue !== 'all') {
      params.is_read = isReadValue === 'true';
    }

    this.subscriptions.push(
      this.contactService.getContactMessages(params).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.messages = response.data.contacts;
            this.totalMessages = response.data.total;
            this.totalPages = response.data.last_page;
            this.selectedIds = [];
            this.selectAll = false;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des messages', error);
          this.loading = false;
        },
      })
    );
  }

  /**
   * Charger les détails d'un message spécifique
   */
  loadMessageDetails(id: number): void {
    this.loading = true;

    this.subscriptions.push(
      this.contactService.getContactMessage(id).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.selectedMessage = response.data;

            // Si le message n'est pas encore lu, le marquer comme lu
            if (!this.selectedMessage.is_read) {
              this.markMessageAsRead(this.selectedMessage.id);
            }
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement du message', error);
          this.loading = false;
          // Rediriger vers la liste si le message n'existe pas
          this.router.navigate(['/admin/messages']);
        },
      })
    );
  }

  /**
   * Marquer un message comme lu
   */
  markMessageAsRead(id: number): void {
    this.subscriptions.push(
      this.contactService.markAsRead(id).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            // Mettre à jour le message dans la liste
            const messageIndex = this.messages.findIndex((m) => m.id === id);
            if (messageIndex !== -1) {
              this.messages[messageIndex] = response.contact;
            }

            // Mettre à jour le message sélectionné si c'est celui-ci
            if (this.selectedMessage && this.selectedMessage.id === id) {
              this.selectedMessage = response.contact;
            }
          }
        },
        error: (error) => {
          console.error('Erreur lors du marquage du message comme lu', error);
        },
      })
    );
  }

  /**
   * Marquer plusieurs messages comme lus
   */
  markSelectedAsRead(): void {
    if (this.selectedIds.length === 0) return;

    this.submitting = true;

    this.subscriptions.push(
      this.contactService.markMultipleAsRead(this.selectedIds).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            // Recharger les messages pour avoir les statuts à jour
            this.loadMessages(this.currentPage);
          }
          this.submitting = false;
        },
        error: (error) => {
          console.error(
            'Erreur lors du marquage des messages comme lus',
            error
          );
          this.submitting = false;
        },
      })
    );
  }

  /**
   * Supprimer un message
   */
  deleteMessage(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;

    this.submitting = true;

    this.subscriptions.push(
      this.contactService.deleteContactMessage(id).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            // Si c'est le message sélectionné, le désélectionner
            if (this.selectedMessage && this.selectedMessage.id === id) {
              this.selectedMessage = null;
              // Rediriger vers la liste
              this.router.navigate(['/admin/messages']);
            }

            // Recharger les messages
            this.loadMessages(this.currentPage);
          }
          this.submitting = false;
        },
        error: (error) => {
          console.error('Erreur lors de la suppression du message', error);
          this.submitting = false;
        },
      })
    );
  }

  /**
   * Appliquer les filtres
   */
  applyFilters(): void {
    this.loadMessages(1); // Retourner à la première page
  }

  /**
   * Réinitialiser les filtres
   */
  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      is_read: 'all',
    });
    this.loadMessages(1);
  }

  /**
   * Changer de page
   */
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.loadMessages(page);
  }

  /**
   * Sélectionner/désélectionner tous les messages
   */
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;

    if (this.selectAll) {
      this.selectedIds = this.messages.map((m) => m.id);
    } else {
      this.selectedIds = [];
    }
  }

  /**
   * Vérifier si un message est sélectionné
   */
  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  /**
   * Sélectionner/désélectionner un message
   */
  toggleSelectMessage(id: number): void {
    const index = this.selectedIds.indexOf(id);

    if (index === -1) {
      this.selectedIds.push(id);
    } else {
      this.selectedIds.splice(index, 1);
    }

    // Mettre à jour l'état de sélection globale
    this.selectAll = this.selectedIds.length === this.messages.length;
  }

  /**
   * Afficher les détails d'un message
   */
  viewMessage(message: ContactMessage): void {
    this.router.navigate(['/admin/messages', message.id]);
  }

  /**
   * Fermer les détails du message
   */
  closeDetails(): void {
    this.selectedMessage = null;
    this.router.navigate(['/admin/messages']);
  }

  /**
   * Obtenir une couleur de badge selon le statut de lecture
   */
  getReadStatusClass(isRead: boolean): string {
    return isRead
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-100 text-yellow-800';
  }

  /**
   * Formater un numéro de téléphone pour l'affichage
   */
  formatPhoneNumber(phone: string | null | undefined): string {
    if (!phone) return 'Non renseigné';
    return phone;
  }
}
