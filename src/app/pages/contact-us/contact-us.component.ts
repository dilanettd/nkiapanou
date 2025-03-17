import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../core/services/user/user.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'nkiapanou-contact-us',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.scss',
})
export class ContactUsComponent implements OnInit {
  contactForm!: FormGroup;
  isSubmitting = false;

  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private toastr = inject(ToastrService);

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      subject: ['', [Validators.required]],
      message: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  isFieldInvalid(field: string): boolean {
    const formControl = this.contactForm.get(field);
    return (
      (formControl?.invalid && (formControl?.dirty || formControl?.touched)) ??
      false
    );
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.markFormGroupTouched(this.contactForm);
      this.toastr.warning(
        'Veuillez corriger les erreurs dans le formulaire',
        'Formulaire invalide'
      );
      return;
    }

    this.isSubmitting = true;

    // Prepare form data
    const formData = this.contactForm.value;

    // Utiliser le userService pour envoyer le message
    this.userService.sendContactMessage(formData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.toastr.success(
          'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.',
          'Message envoyé'
        );
        this.contactForm.reset();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.toastr.error(
          "Une erreur est survenue lors de l'envoi de votre message. Veuillez réessayer plus tard.",
          'Erreur'
        );
        console.error('Contact form submission error:', error);
      },
    });
  }

  // Nous utilisons maintenant directement userService.sendContactMessage

  // Utility method to mark all controls as touched
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
