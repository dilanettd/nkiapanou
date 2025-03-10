import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { IUser } from '../../../../core/models2/user.model';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { UserService } from '../../../../core/services/user/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  user: IUser | null = null;
  loading: boolean = false;
  updating: boolean = false;

  // Formulaires
  profileForm: FormGroup;
  passwordForm: FormGroup;

  // État de l'édition
  isEditingProfile: boolean = false;
  isChangingPassword: boolean = false;

  // Injection des services
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  constructor() {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone_number: [''],
      address: [''],
      city: [''],
      postal_code: [''],
      country: [''],
    });

    this.passwordForm = this.fb.group(
      {
        current_password: ['', [Validators.required, Validators.minLength(8)]],
        new_password: ['', [Validators.required, Validators.minLength(8)]],
        confirm_password: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.loading = true;

    const storedUser = this.authService.getCurrentUser();

    if (storedUser) {
      this.user = storedUser;
      this.populateForm();
      this.loading = false;
    }

    // Ensuite faire une requête pour obtenir les données à jour
    this.userService.getProfile().subscribe({
      next: (response) => {
        this.user = response.user;
        this.populateForm();
        this.authService.setUser(response.user);
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Erreur lors du chargement du profil');
        this.loading = false;
      },
    });
  }

  populateForm(): void {
    if (this.user) {
      this.profileForm.patchValue({
        name: this.user.name || '',
        email: this.user.email || '',
        phone_number: this.user.phone_number || '',
        address: this.user.address || '',
        city: this.user.city || '',
        postal_code: this.user.postal_code || '',
        country: this.user.country || '',
      });
    }
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: any } | null {
    const newPassword = group.get('new_password')?.value;
    const confirmPassword = group.get('confirm_password')?.value;

    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  toggleEditProfile(): void {
    this.isEditingProfile = !this.isEditingProfile;
    if (!this.isEditingProfile) {
      this.populateForm();
    }
  }

  toggleChangePassword(): void {
    this.isChangingPassword = !this.isChangingPassword;
    if (!this.isChangingPassword) {
      this.passwordForm.reset();
    }
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toastr.warning('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    this.updating = true;

    this.userService.updateProfile(this.profileForm.value).subscribe({
      next: (response) => {
        this.user = response.user;
        this.toastr.success('Votre profil a été mis à jour avec succès');
        this.isEditingProfile = false;
        this.updating = false;
      },
      error: () => {
        this.toastr.error('Erreur lors de la mise à jour du profil');
        this.updating = false;
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.toastr.warning(
        'Veuillez corriger les erreurs dans le formulaire',
        'Attention'
      );
      return;
    }

    this.updating = true;

    const { current_password, new_password } = this.passwordForm.value;

    this.userService.changePassword(current_password, new_password).subscribe({
      next: () => {
        this.toastr.success('Votre mot de passe a été modifié avec succès');
        this.isChangingPassword = false;
        this.passwordForm.reset();
        this.updating = false;
      },
      error: () => {
        this.toastr.error('Erreur lors du changement de mot de passe');
        this.updating = false;
      },
    });
  }
}
