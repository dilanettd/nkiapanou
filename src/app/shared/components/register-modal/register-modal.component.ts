import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../../core/services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CustomValidators } from './Customvalidator';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonSpinnerComponent } from '../button-spinner/button-spinner.component';

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
export class RegisterModalComponent {
  registrationForm!: FormGroup;
  isLoading: boolean = false;
  errorMessage: string = '';
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private modalService = inject(NgbModal);

  constructor() {
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

  onSubmit() {
    this.errorMessage = '';
    if (this.registrationForm.valid) {
      this.isLoading = true;
      const { userName, email, password } = this.registrationForm.value;
      this.authService.register(userName, email, password).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastr.success('Registration successful!');
          this.modalService.dismissAll();
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage =
            err.error?.message || 'An error occurred during registration.';
          this.toastr.error(this.errorMessage);
        },
      });
    } else {
      this.isLoading = false;
      this.validateAllFormFields(this.registrationForm);
    }
  }

  signInWithFB() {}

  signInWithGoogle() {}

  validateAllFormFields(formGroup: UntypedFormGroup) {
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
}
