import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { INewsletterSubscriber } from '../../../../core/models2/user.model';
import { NewsletterService } from '../../../../core/services/newsletter/newsletter.service';

@Component({
  selector: 'nkiapanou-newsletter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './newsletter.component.html',
  styleUrl: './newsletter.component.scss',
})
export class NewsletterComponent implements OnInit {
  subscribers: INewsletterSubscriber[] = [];
  loading = false;
  submitting = false;
  filterForm: FormGroup;
  addSubscriberForm: FormGroup;
  showAddForm = false;
  totalSubscribers = 0;
  currentPage = 1;
  totalPages = 1;
  perPage = 20;
  selectedSubscribers: number[] = [];
  selectAll = false;
  exportLoading = false;

  // Options d'exportation
  emailsOnlyExport = true; // Par défaut, exporter uniquement les emails
  activeOnlyExport = true; // Par défaut, exporter uniquement les abonnés actifs

  constructor(
    private newsletterService: NewsletterService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filterForm = this.createFilterForm();
    this.addSubscriberForm = this.createAddSubscriberForm();
  }

  ngOnInit(): void {
    this.loadSubscribers();
  }

  createFilterForm(): FormGroup {
    return this.fb.group({
      search: [''],
      status: ['all'],
    });
  }

  createAddSubscriberForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      name: [''],
      status: ['active'],
    });
  }

  loadSubscribers(): void {
    this.loading = true;
    const filters = {
      search: this.filterForm.value.search || undefined,
      status:
        this.filterForm.value.status !== 'all'
          ? this.filterForm.value.status
          : undefined,
      page: this.currentPage,
      per_page: this.perPage,
    };

    this.newsletterService
      .getSubscribers(filters)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.subscribers = response.data.subscribers;
          this.currentPage = response.data.pagination.current_page;
          this.totalPages = response.data.pagination.last_page;
          this.totalSubscribers = response.data.pagination.total;
          this.selectedSubscribers = [];
          this.selectAll = false;
        },
        error: (error) => {
          this.toastr.error('Erreur lors du chargement des abonnés', 'Erreur');
          console.error('Error loading subscribers:', error);
        },
      });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadSubscribers();
  }

  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      status: 'all',
    });
    this.currentPage = 1;
    this.loadSubscribers();
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.addSubscriberForm.reset({
        email: '',
        name: '',
        status: 'active',
      });
    }
  }

  addSubscriber(): void {
    if (this.addSubscriberForm.invalid) {
      Object.keys(this.addSubscriberForm.controls).forEach((key) => {
        const control = this.addSubscriberForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    this.newsletterService
      .addSubscriber(this.addSubscriberForm.value)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Abonné ajouté avec succès', 'Succès');
          this.toggleAddForm();
          this.loadSubscribers();
        },
        error: (error) => {
          if (error.status === 422 && error.error.errors?.email) {
            this.toastr.error('Cette adresse email est déjà abonnée', 'Erreur');
          } else {
            this.toastr.error("Erreur lors de l'ajout de l'abonné", 'Erreur');
          }
          console.error('Error adding subscriber:', error);
        },
      });
  }

  toggleSubscriberStatus(subscriber: INewsletterSubscriber): void {
    const newStatus =
      subscriber.status === 'active' ? 'unsubscribed' : 'active';

    this.newsletterService
      .updateSubscriber(subscriber.id, { status: newStatus })
      .subscribe({
        next: () => {
          this.toastr.success(`Statut mis à jour avec succès`, 'Succès');
          subscriber.status = newStatus;
        },
        error: (error) => {
          this.toastr.error(
            'Erreur lors de la mise à jour du statut',
            'Erreur'
          );
          console.error('Error updating subscriber status:', error);
        },
      });
  }

  deleteSubscriber(subscriber: INewsletterSubscriber): void {
    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer l'abonné ${subscriber.email} ?`
      )
    ) {
      this.newsletterService.deleteSubscriber(subscriber.id).subscribe({
        next: () => {
          this.toastr.success('Abonné supprimé avec succès', 'Succès');
          this.loadSubscribers();
        },
        error: (error) => {
          this.toastr.error(
            "Erreur lors de la suppression de l'abonné",
            'Erreur'
          );
          console.error('Error deleting subscriber:', error);
        },
      });
    }
  }

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.selectedSubscribers = this.subscribers.map((s) => s.id);
    } else {
      this.selectedSubscribers = [];
    }
  }

  toggleSelectSubscriber(id: number): void {
    const index = this.selectedSubscribers.indexOf(id);
    if (index === -1) {
      this.selectedSubscribers.push(id);
    } else {
      this.selectedSubscribers.splice(index, 1);
    }

    // Update selectAll state
    this.selectAll =
      this.selectedSubscribers.length === this.subscribers.length &&
      this.subscribers.length > 0;
  }

  isSelected(id: number): boolean {
    return this.selectedSubscribers.includes(id);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }
    this.currentPage = page;
    this.loadSubscribers();
  }

  exportSelectedToCsv(): void {
    if (this.selectedSubscribers.length === 0) {
      this.toastr.warning(
        'Veuillez sélectionner au moins un abonné',
        'Attention'
      );
      return;
    }

    this.exportLoading = true;
    this.newsletterService
      .exportSubscribers(
        this.selectedSubscribers,
        this.emailsOnlyExport,
        this.activeOnlyExport
      )
      .pipe(finalize(() => (this.exportLoading = false)))
      .subscribe({
        next: (response) => {
          // Créer un blob à partir des données
          const blob = new Blob([response], { type: 'text/csv' });

          // Créer une URL pour le blob
          const url = window.URL.createObjectURL(blob);

          // Créer un élément d'ancrage pour télécharger le fichier
          const a = document.createElement('a');
          a.href = url;
          const filePrefix = this.emailsOnlyExport ? 'emails' : 'subscribers';
          a.download = `newsletter-${filePrefix}-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();

          // Nettoyer
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          this.toastr.success('Exportation réussie', 'Succès');
        },
        error: (error) => {
          this.toastr.error("Erreur lors de l'exportation", 'Erreur');
          console.error('Error exporting subscribers:', error);
        },
      });
  }

  exportAllToCsv(): void {
    this.exportLoading = true;
    const currentStatus =
      this.filterForm.get('status')?.value !== 'all'
        ? this.filterForm.get('status')?.value
        : undefined;

    this.newsletterService
      .exportAllSubscribers(
        this.emailsOnlyExport,
        this.activeOnlyExport,
        currentStatus
      )
      .pipe(finalize(() => (this.exportLoading = false)))
      .subscribe({
        next: (response) => {
          // Créer un blob à partir des données
          const blob = new Blob([response], { type: 'text/csv' });

          // Créer une URL pour le blob
          const url = window.URL.createObjectURL(blob);

          // Créer un élément d'ancrage pour télécharger le fichier
          const a = document.createElement('a');
          a.href = url;
          const filePrefix = this.emailsOnlyExport ? 'emails' : 'subscribers';
          const statusPrefix = currentStatus ? `-${currentStatus}` : '-all';
          a.download = `newsletter-${filePrefix}${statusPrefix}-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();

          // Nettoyer
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          this.toastr.success('Exportation réussie', 'Succès');
        },
        error: (error) => {
          this.toastr.error("Erreur lors de l'exportation", 'Erreur');
          console.error('Error exporting all subscribers:', error);
        },
      });
  }

  getStatusClass(status: string): string {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  }
}
