import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  AbstractControl,
  Validators,
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CustomValidators } from './Customvalidator';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonSpinnerComponent } from '../button-spinner/button-spinner.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'nkiapanou-register-modal',
  standalone: true,
  imports: [
    CommonModule,
    ButtonSpinnerComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './register-modal.component.html',
  styleUrl: './register-modal.component.scss',
})
export class RegisterModalComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private modalService = inject(NgbModal);

  registerSubscribe?: Subscription;
  registrationForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  ngOnInit() {
    this.createForm();
  }

  createForm() {
    this.registrationForm = this.fb.group(
      {
        userName: ['', [Validators.required]],
        email: [
          '',
          [
            Validators.required,
            CustomValidators.patternValidator(
              /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
              { hasEmail: true }
            ),
          ],
        ],
        password: [
          null,
          [
            Validators.minLength(8),
            Validators.required,
            CustomValidators.patternValidator(/\d/, { hasNumber: true }),
            CustomValidators.patternValidator(/[A-Z]/, {
              hasCapitalCase: true,
            }),
            CustomValidators.patternValidator(/[a-z]/, {
              hasSmallCase: true,
            }),
            CustomValidators.patternValidator(/[#?!@$%^_\-&*~(){}\[\]|\\]/, {
              hasSpecialCharacters: true,
            }),
          ],
        ],
        policy: ['', Validators.required],
        confirmPassword: ['', Validators.required],
      },
      {
        validator: CustomValidators.mustMatch('password', 'confirmPassword'),
      }
    );
  }

  private getDefaultLanguage(): string {
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    const supportedLanguages = ['fr', 'en', 'es', 'de', 'it'];
    return supportedLanguages.includes(browserLang) ? browserLang : 'en';
  }

  onSubmit() {
    this.errorMessage = '';
    if (this.registrationForm.valid) {
      this.isLoading = true;
      const { userName, email, password } = this.registrationForm.value;
      const language = this.getDefaultLanguage();

      // Utiliser la méthode register de l'AuthService avec le paramètre de langue
      this.registerSubscribe = this.authService
        .register(userName, email, password, language)
        .subscribe({
          next: (response) => {
            this.isLoading = false;

            if (response.status === 'success') {
              this.toastr.success(
                'Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte.'
              );
              this.modalService.dismissAll();
            } else {
              this.errorMessage =
                response.message ||
                "Une erreur est survenue pendant l'inscription.";
              this.toastr.error(this.errorMessage);
            }
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage =
              err.error?.message ||
              "Une erreur est survenue pendant l'inscription.";
            this.toastr.error(this.errorMessage);
          },
        });
    } else {
      this.isLoading = false;
      this.validateAllFormFields(this.registrationForm);
    }
  }

  /**
   * Gère la connexion via les réseaux sociaux
   * @param provider Le fournisseur ('facebook' ou 'google')
   */
  socialLogin(provider: 'facebook' | 'google') {
    this.isLoading = true;
    this.errorMessage = '';

    let socialLoginObservable;

    if (provider === 'facebook') {
      socialLoginObservable = this.authService.loginWithFacebook();
    } else {
      socialLoginObservable = this.authService.loginWithGoogle();
    }

    this.registerSubscribe = socialLoginObservable.subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.status === 'success' && response.user) {
          this.toastr.success(`Connexion ${provider} réussie`);
          this.modalService.dismissAll();
        } else {
          this.errorMessage = response.message || 'Erreur de connexion sociale';
          this.toastr.error(this.errorMessage);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err.message || `Erreur lors de la connexion ${provider}`;
        this.toastr.error(this.errorMessage);
      },
    });
  }

  validateAllFormFields(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((field) => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  get f() {
    return this.registrationForm.controls;
  }

  closeModal() {
    this.modalService.dismissAll();
  }

  ngOnDestroy(): void {
    if (this.registerSubscribe) {
      this.registerSubscribe.unsubscribe();
    }
  }
}
