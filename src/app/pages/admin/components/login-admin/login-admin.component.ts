import { Component, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IUser } from '../../../../core/models/auth.state.model';

@Component({
  selector: 'login-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login-admin.component.html',
  styleUrls: ['./login-admin.component.scss'],
})
export class LoginAdminComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  private subscriptions: Subscription = new Subscription();

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  isLoading = false;
  errorMessage: string | null = null;

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;

      const { email, password } = this.loginForm.value;

      const loginSubscription = this.authService
        .loginAdmin(email, password)
        .subscribe({
          next: (tokens) => {
            this.authService.setTokens(tokens);

            const userSubscription = this.authService
              .getAuthenticatedUser()
              .subscribe({
                next: (me: IUser) => {
                  this.authService.setUser(me);
                  this.toastr.success('You are successfully logged in.');
                  this.router.navigate(['/admin/dashboard']);
                },
                error: () => {
                  this.errorMessage = 'Failed to retrieve user data.';
                },
              });

            this.subscriptions.add(userSubscription);
          },
          error: (error) => {
            this.errorMessage =
              error.error.message || 'An error occurred during login.';
            this.isLoading = false;
          },
          complete: () => {
            this.isLoading = false;
          },
        });

      this.subscriptions.add(loginSubscription);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
