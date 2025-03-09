import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'account-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './account-confirmation.component.html',
  styleUrl: './account-confirmation.component.scss',
})
export class AccountConfirmationComponent {
  message: string = '';
  isSuccess: boolean = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParams['token'];

    if (token) {
      this.authService.verifyAccountEmail(token).subscribe({
        next: (res) => {
          this.message = 'Your account has been successfully verified!';
          this.toastr.success(this.message);
          this.isSuccess = true;

          setTimeout(() => {
            this.router.navigate(['/']);
          }, 3000);
        },
        error: (err) => {
          this.message = 'Email verification failed or link expired.';
          this.toastr.error(this.message);
          this.isSuccess = false;
        },
      });
    } else {
      this.message = 'Invalid verification link.';
      this.toastr.error(this.message);
      this.isSuccess = false;
    }
  }
}
