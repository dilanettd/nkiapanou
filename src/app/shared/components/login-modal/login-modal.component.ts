import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { ButtonSpinnerComponent } from '../button-spinner/button-spinner.component';

@Component({
  selector: 'nkiapanou-login-modal',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, ButtonSpinnerComponent],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss'],
})
export class LoginModalComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private activeModal = inject(NgbModal);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);

  loginForm!: FormGroup;
  forgotPasswordForm!: FormGroup;
  errorMessage: string | null = null;
  isSubmitted = false;
  isForgotPassword = false;
  loginSubscribe?: Subscription;

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false],
    });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  showForgotPasswordForm() {
    this.isForgotPassword = true;
  }

  goBackToLogin() {
    this.isForgotPassword = false;
    this.errorMessage = null;
  }

  closeModal() {
    this.activeModal.dismissAll();
  }

  socialLogin(provider: 'facebook' | 'google') {
    this.isSubmitted = true;
    this.errorMessage = null;

    let socialLoginObservable;

    if (provider === 'facebook') {
      socialLoginObservable = this.authService.loginWithFacebook();
    } else {
      socialLoginObservable = this.authService.loginWithGoogle();
    }

    this.loginSubscribe = socialLoginObservable.subscribe({
      next: (response: any) => {
        this.isSubmitted = false;

        if (response.status === 'success' && response.user) {
          this.toastr.success(`Connexion ${provider} réussie`);
          this.activeModal.dismissAll();
        } else {
          this.errorMessage = response.message || 'Erreur de connexion sociale';
        }
      },
      error: (err: any) => {
        this.isSubmitted = false;
        this.errorMessage =
          err.message || `Erreur lors de la connexion ${provider}`;
      },
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isSubmitted = true;
      const { email, password } = this.loginForm.value;

      this.loginSubscribe = this.authService.login(email, password).subscribe({
        next: (response) => {
          this.isSubmitted = false;

          if (response.status === 'success' && response.user) {
            this.toastr.success('Connexion réussie');
            this.activeModal.dismissAll();
          } else {
            this.errorMessage = response.message || 'Erreur de connexion';
          }
        },
        error: (err) => {
          this.isSubmitted = false;
          if (err.status == 401) {
            this.errorMessage = 'Email ou mot de passe incorrect';
          } else if (err.status == 403) {
            this.errorMessage = 'Votre compte a été bloqué';
          } else {
            this.errorMessage =
              err.message || 'Une erreur inattendue est survenue';
          }
        },
      });
    }
  }

  onResetPasswordSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.isSubmitted = true;
      const { email } = this.forgotPasswordForm.value;

      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          this.isSubmitted = false;
          if (response.status === 'success') {
            this.toastr.success('Email de réinitialisation envoyé.');
            setTimeout(() => {
              this.goBackToLogin();
            }, 3000);
          } else {
            this.errorMessage =
              response.message || "Échec de l'envoi de l'email.";
          }
        },
        error: (err) => {
          this.isSubmitted = false;
          this.errorMessage =
            err.message || "Échec de l'envoi de l'email de réinitialisation.";
        },
      });
    }
  }

  ngOnDestroy(): void {
    if (this.loginSubscribe) {
      this.loginSubscribe.unsubscribe();
    }
  }
}
