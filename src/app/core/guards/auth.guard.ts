import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginModalComponent } from '../../shared/components/login-modal/login-modal.component';
import { ToastrService } from 'ngx-toastr';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const modalService = inject(NgbModal);
  const toastr = inject(ToastrService);

  if (authService.isAuthenticate()) {
    return true;
  } else {
    toastr.error('You must be logged in to access this section.');

    modalService.open(LoginModalComponent);

    return false;
  }
};
