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
import { NgxImageCompressService } from 'ngx-image-compress';
import { IUser } from '../../../../core/models/user.model';
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

  // Pour l'image de profil
  isEditingImage: boolean = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  imageError: string | null = null;
  compressing: boolean = false;

  // Injection des services
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);
  private imageCompress = inject(NgxImageCompressService);

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

  // Méthodes pour gérer l'image de profil
  toggleEditImage(): void {
    this.isEditingImage = !this.isEditingImage;
    if (!this.isEditingImage) {
      this.resetImageForm();
    }
  }

  resetImageForm(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.imageError = null;
    this.compressing = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validation du type de fichier
      if (!file.type.includes('image/')) {
        this.imageError = "Le fichier sélectionné n'est pas une image valide";
        return;
      }

      // Validation de la taille du fichier (5Mo max avant compression)
      if (file.size > 5 * 1024 * 1024) {
        this.imageError = "L'image ne doit pas dépasser 5 Mo";
        return;
      }

      this.selectedFile = file;
      this.imageError = null;

      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
        this.compressImage();
      };
      reader.readAsDataURL(file);
    }
  }

  compressImage(): void {
    if (!this.imagePreview) return;

    this.compressing = true;

    // Compression avec qualité 50% pour les images volumineuses, 70% pour les autres
    const initialQuality =
      this.selectedFile && this.selectedFile.size > 1024 * 1024 ? 50 : 70;
    const maxWidth = 1200;
    const maxHeight = 1200;

    this.imageCompress
      .compressFile(
        this.imagePreview,
        -1,
        100,
        initialQuality,
        maxWidth,
        maxHeight
      )
      .then((result) => {
        this.imagePreview = result;

        // Convertir l'image base64 compressée en File
        this.dataURItoFile(result).then((compressedFile) => {
          this.selectedFile = compressedFile;
          console.log(`Image compressée: ${compressedFile.size / 1024} Ko`);

          // Si l'image est encore trop grande, compresser davantage
          if (compressedFile.size > 2 * 1024 * 1024) {
            this.compressImageFurther();
          } else {
            this.compressing = false;
          }
        });
      })
      .catch((error) => {
        console.error("Erreur lors de la compression de l'image:", error);
        this.imageError = "Erreur lors de la compression de l'image";
        this.compressing = false;
      });
  }

  compressImageFurther(): void {
    if (!this.imagePreview) return;

    // Compression supplémentaire avec qualité réduite
    this.imageCompress
      .compressFile(this.imagePreview, -1, 100, 30, 800, 800)
      .then((result) => {
        this.imagePreview = result;

        // Convertir l'image base64 compressée en File
        this.dataURItoFile(result).then((compressedFile) => {
          this.selectedFile = compressedFile;
          console.log(`Image recompressée: ${compressedFile.size / 1024} Ko`);
          this.compressing = false;
        });
      })
      .catch((error) => {
        console.error('Erreur lors de la compression supplémentaire:', error);
        this.compressing = false;
      });
  }

  async dataURItoFile(dataURI: string): Promise<File> {
    // Extraire le type MIME et les données
    const arr = dataURI.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    // Créer un fichier avec un nom généré et le type MIME extrait
    const fileName = `profile_${new Date().getTime()}.${mime.split('/')[1]}`;
    return new File([u8arr], fileName, { type: mime });
  }

  uploadProfileImage(): void {
    if (!this.selectedFile || this.compressing) {
      return;
    }

    this.updating = true;

    this.userService.updateProfileImage(this.selectedFile).subscribe({
      next: (response) => {
        if (response.status === 'success') {
          this.user = response.user;
          this.toastr.success('Photo de profil mise à jour avec succès');
          this.isEditingImage = false;
          this.resetImageForm();
        }
        this.updating = false;
      },
      error: (error) => {
        this.toastr.error(
          'Erreur lors de la mise à jour de la photo de profil'
        );
        console.error('Error updating profile image:', error);
        this.updating = false;
      },
    });
  }

  // Méthodes utilitaires pour les avatars
  getUserInitials(name: string): string {
    return this.userService.getInitials(name);
  }

  getAvatarBackground(name: string): string {
    const colors = ['#ebc435', '#6c84af', '#dfc45b', '#333333'];
    const colorIndex = Math.abs(
      name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
        colors.length
    );
    return colors[colorIndex];
  }
}
