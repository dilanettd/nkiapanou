import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { IUser } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user/user.service';

@Component({
  selector: 'nkiapanou-users-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './users-admin.component.html',
  styleUrl: './users-admin.component.scss',
})
export class UsersAdminComponent implements OnInit {
  private userService = inject(UserService);
  private formBuilder = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Display properties
  users: IUser[] = [];
  loading = true;
  totalItems = 0;
  pageSize = 10;
  currentPage = 1;
  displayedColumns: string[] = [
    'id',
    'avatar',
    'name',
    'email',
    'created_at',
    'status',
    'actions',
  ];

  // Filter properties
  filterForm!: FormGroup;
  sortOptions = [
    { value: 'name-asc', label: 'Nom (A-Z)' },
    { value: 'name-desc', label: 'Nom (Z-A)' },
    { value: 'email-asc', label: 'Email (A-Z)' },
    { value: 'email-desc', label: 'Email (Z-A)' },
    { value: 'created_at-desc', label: "Date de création (récent d'abord)" },
    { value: 'created_at-asc', label: "Date de création (ancien d'abord)" },
  ];

  ngOnInit(): void {
    this.initFilterForm();
    this.loadUsers();
  }

  private initFilterForm(): void {
    this.filterForm = this.formBuilder.group({
      search: [''],
      sort: ['created_at-desc'],
      admin: [''],
      is_social: [''],
    });

    // Subscribe to form value changes to apply filters
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage = 1; // Reset to first page when filters change
      this.loadUsers();
    });
  }

  loadUsers(): void {
    this.loading = true;

    // Get filter values
    const { search, sort, admin, is_social } = this.filterForm.value;

    // Parse sort value
    let sortBy: string | undefined;
    let sortDirection: 'asc' | 'desc' | undefined;

    if (sort) {
      const [field, direction] = sort.split('-');
      sortBy = field;
      sortDirection = direction as 'asc' | 'desc';
    }

    // Build params
    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      search: search || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
      admin: admin !== '' ? admin === 'true' : undefined,
      is_social: is_social !== '' ? is_social === 'true' : undefined,
    };

    this.userService.getUsers(params).subscribe(
      (response) => {
        if (response.status === 'success') {
          this.users = response.data.users;
          this.totalItems = response.data.total;
        } else {
          this.toastr.error(
            'Erreur lors du chargement des utilisateurs',
            'Erreur'
          );
        }
        this.loading = false;
      },
      (error) => {
        this.toastr.error('Erreur de connexion au serveur', 'Erreur');
        this.loading = false;
      }
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  changePageSize(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.pageSize = parseInt(selectElement.value, 10);
    this.currentPage = 1; // Reset to first page when changing page size
    this.loadUsers();
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get pages(): number[] {
    const pageCount = this.totalPages;

    // Show maximum 5 page buttons
    if (pageCount <= 5) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    // Complex pagination logic for many pages
    if (this.currentPage <= 3) {
      return [1, 2, 3, 4, 5, -1, pageCount];
    } else if (this.currentPage >= pageCount - 2) {
      return [
        1,
        -1,
        pageCount - 4,
        pageCount - 3,
        pageCount - 2,
        pageCount - 1,
        pageCount,
      ];
    } else {
      return [
        1,
        -1,
        this.currentPage - 1,
        this.currentPage,
        this.currentPage + 1,
        -1,
        pageCount,
      ];
    }
  }

  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      sort: 'created_at-desc',
      admin: '',
      is_social: '',
    });
  }

  getAvatarUrl(user: IUser): string {
    if (user.profile_image) {
      return user.profile_image;
    }
    return this.userService.getAvatarPlaceholder(user.name);
  }

  getInitials(name: string): string {
    return this.userService.getInitials(name);
  }

  getUserStatusLabel(user: IUser): string {
    if (user.admin) {
      return user.admin_role === 'super_admin' ? 'Super Admin' : 'Admin';
    }
    if (user.is_social) {
      return `Compte ${
        user.social_type === 'facebook' ? 'Facebook' : 'Google'
      }`;
    }
    return 'Utilisateur';
  }

  getUserStatusClass(user: IUser): string {
    if (user.admin) {
      return 'status-admin';
    }
    if (user.is_social) {
      return 'status-social';
    }
    return 'status-user';
  }

  convertSocialAccount(user: IUser): void {
    if (
      confirm(
        `Êtes-vous sûr de vouloir convertir le compte social de ${user.name} en compte par email ?`
      )
    ) {
      this.userService.convertSocialAccount(user.id!).subscribe(
        (response) => {
          if (response.status === 'success') {
            this.toastr.success('Compte converti avec succès', 'Succès');
            // Update user in the list
            const index = this.users.findIndex((u) => u.id === user.id);
            if (index !== -1) {
              this.users[index] = response.data;
            }
          } else {
            this.toastr.error(
              'Erreur lors de la conversion du compte',
              'Erreur'
            );
          }
        },
        (error) => {
          this.toastr.error('Erreur de connexion au serveur', 'Erreur');
        }
      );
    }
  }

  toggleAdminStatus(user: IUser): void {
    const makeAdmin = !user.admin;
    const action = makeAdmin ? 'promouvoir' : 'rétrograder';

    if (
      confirm(
        `Êtes-vous sûr de vouloir ${action} ${user.name} ${
          makeAdmin ? 'en administrateur' : "au statut d'utilisateur normal"
        } ?`
      )
    ) {
      this.userService.toggleAdminStatus(user.id!, makeAdmin).subscribe(
        (response) => {
          if (response.status === 'success') {
            this.toastr.success(
              `Utilisateur ${
                makeAdmin ? 'promu administrateur' : 'rétrogradé'
              } avec succès`,
              'Succès'
            );
            // Update user in the list
            const index = this.users.findIndex((u) => u.id === user.id);
            if (index !== -1) {
              this.users[index] = response.data;
            }
          } else {
            this.toastr.error(
              `Erreur lors de la modification du statut`,
              'Erreur'
            );
          }
        },
        (error) => {
          this.toastr.error('Erreur de connexion au serveur', 'Erreur');
        }
      );
    }
  }

  deleteUser(user: IUser): void {
    if (
      confirm(
        `Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.name} ? Cette action est irréversible.`
      )
    ) {
      this.userService.deleteUser(user.id!).subscribe(
        (response) => {
          if (response.status === 'success') {
            this.toastr.success('Utilisateur supprimé avec succès', 'Succès');
            // Remove user from the list or reload
            this.loadUsers();
          } else {
            this.toastr.error(
              "Erreur lors de la suppression de l'utilisateur",
              'Erreur'
            );
          }
        },
        (error) => {
          this.toastr.error('Erreur de connexion au serveur', 'Erreur');
        }
      );
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
