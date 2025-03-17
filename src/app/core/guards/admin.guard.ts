import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { inject } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

export const adminGuard: CanActivateFn = (route, state) => {
  const localStorage = inject(LocalStorageService);
  const authService = inject(AuthService);
  const toastr = inject(ToastrService);
  const router = inject(Router);

  if (!authService.isAuthenticatedValue()) {
    toastr.error('Veuillez vous connecter pour accéder à cette page.');
    router.navigate(['/admin/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  const user = localStorage.retrieve('currentUser');

  if (!user) {
    toastr.error('Session expirée. Veuillez vous reconnecter.');
    authService.logout().subscribe(() => {
      router.navigate(['/admin/login']);
    });
    return false;
  }

  if (
    user.admin === true ||
    (user.admin_role &&
      ['admin', 'superadmin', 'editor'].includes(user.admin_role))
  ) {
    return true;
  }

  toastr.error('Accès refusé. Réservé aux administrateurs.');
  router.navigate(['/']);
  return false;
};
