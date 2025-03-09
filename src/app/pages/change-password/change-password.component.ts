import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { CustomValidators } from '../../shared/components/register-modal/Customvalidator';
import { ButtonSpinnerComponent } from '../../shared/components/button-spinner/button-spinner.component';

@Component({
  selector: 'change-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonSpinnerComponent,
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent implements OnInit {
  resetPasswordForm!: FormGroup;
  isLoading: boolean = false;
  errorMessage: string = '';
  email: string = '';
  token: string = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.resetPassword();
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'];
      this.token = params['token'];
    });

    if (!this.email || !this.token) {
      this.toastr.error('Invalid email or token.');
      this.router.navigate(['/']);
      return;
    }
  }

  resetPassword() {
    this.resetPasswordForm = this.fb.group(
      {
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
        confirmPassword: ['', Validators.required],
      },
      {
        validator: CustomValidators.mustMatch('password', 'confirmPassword'),
      }
    );
  }

  onSubmit() {
    this.errorMessage = '';
    if (this.resetPasswordForm.valid) {
      this.isLoading = true;
      const { password } = this.resetPasswordForm.value;
      this.authService
        .resetPassword(this.email, password, this.token)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.toastr.success('Password reset successful!');
            this.router.navigate(['/']);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage =
              err.error?.message || 'An error occurred during password reset.';
            this.toastr.error(this.errorMessage);
          },
        });
    } else {
      this.isLoading = false;
      this.validateAllFormFields(this.resetPasswordForm);
    }
  }

  validateAllFormFields(formGroup: UntypedFormGroup) {
    Object.keys(formGroup.controls).forEach((field) => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  get f() {
    return this.resetPasswordForm.controls;
  }
}
