import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaypalService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL;
  private paypalScriptLoaded = false;
  private paypalClientId = environment.PAYPAL_CLIENT_ID || 'sb'; // Sandbox client ID by default

  constructor() {}

  /**
   * Load PayPal SDK script
   */
  loadPayPalScript(): Observable<any> {
    // If script is already loaded, return success
    if (this.paypalScriptLoaded) {
      return of(true);
    }

    // Otherwise, load the script
    return from(
      new Promise<boolean>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${this.paypalClientId}&currency=EUR`;
        script.onload = () => {
          this.paypalScriptLoaded = true;
          resolve(true);
        };
        script.onerror = (error) => {
          reject(error);
        };
        document.body.appendChild(script);
      })
    ).pipe(
      catchError((error) => {
        console.error('Error loading PayPal script:', error);
        return throwError(() => new Error('Failed to load PayPal SDK'));
      })
    );
  }

  /**
   * Create a PayPal order
   */
  createOrder(orderId: number, amount: number): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/paypal/create-order`, {
        order_id: orderId,
        amount: amount,
        currency: 'EUR',
      })
      .pipe(
        tap((response) => console.log('PayPal order created:', response)),
        catchError((error) => {
          console.error('Error creating PayPal order:', error);
          return throwError(() => new Error('Failed to create PayPal order'));
        })
      );
  }

  /**
   * Capture payment after approval
   */
  capturePayment(paypalOrderId: string): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/paypal/capture-payment`, {
        paypal_order_id: paypalOrderId,
      })
      .pipe(
        tap((response) => console.log('PayPal payment captured:', response)),
        catchError((error) => {
          console.error('Error capturing PayPal payment:', error);
          return throwError(
            () => new Error('Failed to capture PayPal payment')
          );
        })
      );
  }

  /**
   * Handle PayPal webhook event
   */
  handleWebhook(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/paypal/webhooks`, payload).pipe(
      tap((response) => console.log('PayPal webhook processed:', response)),
      catchError((error) => {
        console.error('Error processing PayPal webhook:', error);
        return throwError(() => new Error('Failed to process PayPal webhook'));
      })
    );
  }
}
