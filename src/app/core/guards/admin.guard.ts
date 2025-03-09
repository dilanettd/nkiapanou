import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { inject } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

export const adminGuard: CanActivateFn = (route, state) => {
  const localStorage = inject(LocalStorageService);
  const toastr = inject(ToastrService);
  const router = inject(Router);
  const user = localStorage.retrieve('me');

  if (user.is_admin) {
    return true;
  }

  toastr.error('Access denied. Admins only.');
  router.navigate(['/admin/login']);
  return false;
};
