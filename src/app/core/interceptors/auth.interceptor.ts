import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpEvent,
  HttpErrorResponse,
  HttpHandlerFn,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, switchMap } from 'rxjs/operators';

import { AuthService } from '../services/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);

  const access_token = authService.getTokens().access_token;
  const refresh_token = authService.getTokens().refresh_token;

  if (access_token) {
    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${access_token}`,
      },
    });
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && refresh_token) {
        return authService.refreshToken().pipe(
          switchMap((response: any) => {
            authService.setTokens(response);
            request = request.clone({
              setHeaders: {
                Authorization: `Bearer ${response.access_token}`,
              },
            });
            return next(request).pipe(retry(5));
          }),
          catchError(() => {
            return throwError(error);
          })
        );
      } else {
        return throwError(error);
      }
    })
  );
};
