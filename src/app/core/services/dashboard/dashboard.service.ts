import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IDashboardCard } from '../../models/dashboard.model';
import { handleHttpError } from '../errors';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  apiUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  public getDashboardStats(): Observable<IDashboardCard[]> {
    return this.http
      .get<IDashboardCard[]>(`${this.apiUrl}/dashboard-stats`)
      .pipe(catchError(handleHttpError));
  }
}
