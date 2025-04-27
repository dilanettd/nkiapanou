import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  IShippingFormula,
  IShippingCalculationRequest,
  IShippingCalculationResult,
} from '../../models/order.model';

@Injectable({
  providedIn: 'root',
})
export class ShippingService {
  private apiUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  /**
   * Get shipping formula for a specific country
   * @param countryCode Two-letter country code
   */
  getShippingFormulaByCountry(
    countryCode: string
  ): Observable<{ status: string; data: IShippingFormula }> {
    return this.http.get<{ status: string; data: IShippingFormula }>(
      `${this.apiUrl}/shipping/countries/${countryCode}`
    );
  }

  /**
   * Calculate shipping cost for a cart
   * @param request Shipping calculation request
   */
  calculateShipping(
    request: IShippingCalculationRequest
  ): Observable<{ status: string; data: IShippingCalculationResult }> {
    return this.http.post<{ status: string; data: IShippingCalculationResult }>(
      `${this.apiUrl}/shipping/calculate`,
      request
    );
  }

  /**
   * Get all shipping formulas (admin only)
   */
  getAllShippingFormulas(): Observable<{
    status: string;
    data: IShippingFormula[];
  }> {
    return this.http.get<{ status: string; data: IShippingFormula[] }>(
      `${this.apiUrl}/admin/shipping`
    );
  }

  /**
   * Get a specific shipping formula by ID (admin only)
   * @param id Shipping formula ID
   */
  getShippingFormula(
    id: number
  ): Observable<{ status: string; data: IShippingFormula }> {
    return this.http.get<{ status: string; data: IShippingFormula }>(
      `${this.apiUrl}/admin/shipping/${id}`
    );
  }

  /**
   * Create a new shipping formula (admin only)
   * @param formula Shipping formula data
   */
  createShippingFormula(
    formula: Partial<IShippingFormula>
  ): Observable<{ status: string; data: IShippingFormula }> {
    return this.http.post<{ status: string; data: IShippingFormula }>(
      `${this.apiUrl}/admin/shipping`,
      formula
    );
  }

  /**
   * Update an existing shipping formula (admin only)
   * @param id Shipping formula ID
   * @param formula Updated shipping formula data
   */
  updateShippingFormula(
    id: number,
    formula: Partial<IShippingFormula>
  ): Observable<{ status: string; data: IShippingFormula }> {
    return this.http.put<{ status: string; data: IShippingFormula }>(
      `${this.apiUrl}/admin/shipping/${id}`,
      formula
    );
  }

  /**
   * Delete a shipping formula (admin only)
   * @param id Shipping formula ID
   */
  deleteShippingFormula(
    id: number
  ): Observable<{ status: string; message: string }> {
    return this.http.delete<{ status: string; message: string }>(
      `${this.apiUrl}/admin/shipping/${id}`
    );
  }

  /**
   * Get list of countries for dropdown
   * This could be expanded with a proper countries API or static list
   */
  getCountries(): Observable<{ code: string; name: string }[]> {
    // In a real app, this could be an API call or a static list
    // For simplicity, returning a limited list of countries here
    return new Observable((observer) => {
      observer.next([
        { code: 'FR', name: 'France' },
        { code: 'DE', name: 'Allemagne' },
        { code: 'IT', name: 'Italie' },
        { code: 'ES', name: 'Espagne' },
        { code: 'BE', name: 'Belgique' },
        { code: 'CH', name: 'Suisse' },
        { code: 'GB', name: 'Royaume-Uni' },
        { code: 'US', name: 'États-Unis' },
        { code: 'CA', name: 'Canada' },
        { code: 'SN', name: 'Sénégal' },
        { code: 'CI', name: "Côte d'Ivoire" },
        { code: 'CM', name: 'Cameroun' },
        { code: 'MA', name: 'Maroc' },
        { code: 'DZ', name: 'Algérie' },
        { code: 'TN', name: 'Tunisie' },
      ]);
      observer.complete();
    });
  }
}
