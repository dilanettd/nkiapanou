import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../../core/services/user/user.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ButtonSpinnerComponent } from '../button-spinner/button-spinner.component';

@Component({
  selector: 'nkiapanou-review-shop',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, ButtonSpinnerComponent],
  templateUrl: './review-shop.component.html',
  styleUrl: './review-shop.component.scss',
})
export class ReviewShopComponent implements OnDestroy {
  @Input({ required: true }) shopId!: number;
  @Output() reviewSubmitted = new EventEmitter<void>();

  reviewForm!: FormGroup;
  isSubmitted: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private userService: UserService,
    private toastr: ToastrService
  ) {
    this.reviewForm = this.fb.group({
      rating: [1, Validators.required],
      review: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  closeModal() {
    this.modalService.dismissAll();
  }

  submitReview() {
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.isSubmitted = true;
    const reviewData = this.reviewForm.value;

    if (this.shopId) {
      reviewData.shop_id = this.shopId;

      const reviewSub = this.userService.reviewShop(reviewData).subscribe({
        next: () => {
          this.toastr.success('Your review has been successfully submitted.');
          this.reviewSubmitted.emit();
          this.isSubmitted = false;
          this.closeModal();
        },
        error: () => {
          this.toastr.error('An error occurred. Please try again.');
          this.isSubmitted = false;
        },
      });

      this.subscription.add(reviewSub);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
