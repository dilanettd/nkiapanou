import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { IUser } from '../../../../core/models/auth.state.model';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../core/services/user/user.service';
import { ToastrService } from 'ngx-toastr';
import { ISeller, IUpdateShop } from '../../../../core/models/seller.model';
import { SellerService } from '../../../../core/services/seller/seller.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ButtonSpinnerComponent } from '../../../../shared/components/button-spinner/button-spinner.component';

@Component({
  selector: 'nkiapanou-profile',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    NgbModule,
    ButtonSpinnerComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  imageUrl: string | ArrayBuffer | null = 'assets/images/avatars/avatar.jpg';
  profileUrl: string | ArrayBuffer | null = 'assets/images/avatars/avatar.jpg';
  logoUrl: string | ArrayBuffer | null = 'assets/images/avatars/avatar.jpg';
  coverPhotoUrl: string | ArrayBuffer | null =
    'assets/images/avatars/avatar.jpg';
  profileForm!: FormGroup;
  shopForm!: FormGroup;
  isLoading: boolean = false;
  me: IUser | null | undefined;
  selectedProfileFile!: File;
  selectedLogoFile!: File;
  selectedCoverFile!: File;
  panels: { id: string; isOpen: boolean }[] = [
    { id: 'vendeur', isOpen: false },
  ];

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private sellerService = inject(SellerService);
  private userService = inject(UserService);
  private toastr = inject(ToastrService);
  private subscriptions: Subscription = new Subscription();
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.profileFormInit();
    this.shopFormInit();

    const userSubscription = this.authService
      .getUser()
      .subscribe((user: IUser | null) => {
        this.me = user;
        if (user?.profile_url) this.profileUrl = user.profile_url;

        if (this.me) {
          this.profileForm.patchValue({
            email: this.me.email,
            phone: this.me.phone,
            name: this.me.name,
          });
        }
      });
    this.subscriptions.add(userSubscription);

    if (this.me?.role === 'seller') {
      const seller = this.me.seller;
      this.logoUrl = seller.shop.logo_url ? seller.shop.logo_url : this.logoUrl;
      this.coverPhotoUrl = seller.shop.cover_photo_url
        ? seller.shop.cover_photo_url
        : this.coverPhotoUrl;
      if (seller) {
        this.shopForm.patchValue({
          name: seller.shop.name,
          contact_number: seller.shop.contact_number,
          location: seller.shop.location,
          website_url: seller.shop.website_url,
          visit_count: seller.shop.visit_count,
          rating: seller.shop.rating,
          description: seller.shop.description,
        });
      }
    }
    this.route.fragment.subscribe((fragment) => {
      if (fragment) {
        const element = document.getElementById(fragment);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }

  togglePanel(panelId: string): void {
    const panel = this.panels.find((p) => p.id === panelId);
    if (panel) {
      panel.isOpen = !panel.isOpen;
    }
  }

  isPanelOpen(panelId: string): boolean {
    const panel = this.panels.find((p) => p.id === panelId);
    return panel ? panel.isOpen : false;
  }

  profileFormInit() {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.minLength(9)]],
      name: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  shopFormInit() {
    this.shopForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      contact_number: ['', [Validators.required, Validators.minLength(9)]],
      location: ['', Validators.required],
      website_url: [''],
      visit_count: [{ value: '', disabled: true }],
      rating: [{ value: '', disabled: true }],
      description: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  changeProfileImage(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedProfileFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  changeLogo(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedLogoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  changeCoverPhoto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedCoverFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.coverPhotoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfileImage() {
    if (this.selectedProfileFile) {
      this.isLoading = true;
      const saveProfileSubscription = this.userService
        .updateProfilePicture(this.selectedProfileFile)
        .subscribe({
          next: (me) => {
            this.toastr.success('Image de profil mise à jour avec succès !');
            this.authService.setUser(me);
            if (me.profile_url) this.profileUrl = me.profile_url;
            this.isLoading = false;
          },
          error: (err) => {
            this.isLoading = false;
            const errorMessage =
              err.error?.message ||
              "Une erreur s'est produite lors de la mise à jour de l'image de profil.";
            this.toastr.error(errorMessage);
          },
        });
      this.subscriptions.add(saveProfileSubscription);
    } else {
      this.toastr.warning('Veuillez sélectionner une image à télécharger.');
    }
  }

  saveLogoImage() {
    if (this.selectedLogoFile) {
      this.isLoading = true;
      const saveLogoSubscription = this.sellerService
        .updateLogo(this.selectedLogoFile)
        .subscribe({
          next: (me) => {
            this.toastr.success('Logo mis à jour avec succès !');
            this.isLoading = false;
            this.authService.setUser(me);
          },
          error: (err) => {
            this.isLoading = false;
            if (err.status === 404) {
              this.toastr.error(
                "Veuillez d'abord renseigner les informations de la boutique."
              );
            } else {
              const errorMessage =
                err.error?.message ||
                "Une erreur s'est produite lors de la mise à jour de l'image de couverture.";
              this.toastr.error(errorMessage);
            }
          },
        });
      this.subscriptions.add(saveLogoSubscription);
    } else {
      this.toastr.warning('Veuillez sélectionner un logo à télécharger.');
    }
  }

  saveCoverImage() {
    if (this.selectedCoverFile) {
      this.isLoading = true;
      const saveCoverSubscription = this.sellerService
        .updateCoverImage(this.selectedCoverFile)
        .subscribe({
          next: (me) => {
            this.toastr.success(
              'Image de couverture mise à jour avec succès !'
            );
            this.isLoading = false;
            this.authService.setUser(me);
          },
          error: (err) => {
            this.isLoading = false;
            if (err.status === 404) {
              this.toastr.error(
                "Veuillez d'abord renseigner les informations de la boutique."
              );
            } else {
              const errorMessage =
                err.error?.message ||
                "Une erreur s'est produite lors de la mise à jour de l'image de couverture.";
              this.toastr.error(errorMessage);
            }
          },
        });
      this.subscriptions.add(saveCoverSubscription);
    } else {
      this.toastr.warning(
        'Veuillez sélectionner une image de couverture à télécharger.'
      );
    }
  }

  onUpdateProfile() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      const { email, phone, name } = this.profileForm.value;
      const userUpdateData = { email, phone, name };

      const updateProfileSubscription = this.userService
        .updateProfile(userUpdateData)
        .subscribe({
          next: (me: IUser) => {
            this.toastr.success('Profil mis à jour avec succès !');
            this.authService.setUser(me);
            this.isLoading = false;
          },
          error: (err) => {
            this.isLoading = false;
            const errorMessage =
              err.error?.message ||
              'Une erreur est survenue lors de la mise à jour du profil.';
            this.toastr.error(errorMessage);
          },
        });
      this.subscriptions.add(updateProfileSubscription);
    } else {
      this.validateAllFormFields(this.profileForm);
    }
  }

  onUpdateShopDetails() {
    if (this.shopForm.valid) {
      this.isLoading = true;
      const { name, contact_number, location, website_url, description } =
        this.shopForm.value;
      const shopUpdateData: IUpdateShop = {
        name,
        contact_number,
        location,
        website_url,
        description,
      };

      const updateShopSubscription = this.sellerService
        .updateShopDetails(shopUpdateData)
        .subscribe({
          next: (me) => {
            this.toastr.success(
              'Informations de la boutique mises à jour avec succès !'
            );
            this.authService.setUser(me);
            this.isLoading = false;
          },
          error: (err) => {
            this.isLoading = false;
            const errorMessage =
              err.error?.message ||
              "Une erreur s'est produite lors de la mise à jour de la boutique.";
            this.toastr.error(errorMessage);
          },
        });
      this.subscriptions.add(updateShopSubscription);
    } else {
      this.validateAllFormFields(this.shopForm);
    }
  }

  validateAllFormFields(formGroup: UntypedFormGroup) {
    Object.keys(formGroup.controls).forEach((field) => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  get f() {
    return this.profileForm.controls;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
