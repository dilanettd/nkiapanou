import { Component, inject, Input } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'nkiapanou-confirm-modal',
  standalone: true,
  imports: [],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.scss',
})
export class ConfirmModalComponent {
  private modalService = inject(NgbModal);
  private router = inject(Router);
  @Input() title!: string;
  @Input() description!: string;
  @Input() confirmLink!: string;

  closeModal() {
    this.modalService.dismissAll();
  }

  confirmAction(): void {
    this.router.navigateByUrl(this.confirmLink);
  }
}
