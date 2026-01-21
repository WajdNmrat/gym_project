// src/app/core/services/plans.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment as env } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Plan } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class PlansService {
  private base = `${env.apiUrl}/plans/`;
  constructor(private http: HttpClient) {}

  list(opts?: {
    user?: number;                 // ✅ اسم صحيح حسب الباك
    is_active?: boolean;           // ✅ مطابق للباك
    search?: string;
    ordering?: 'asc'|'desc';
    page?: number;
    page_size?: number;
  }): Observable<{results: Plan[], count: number}> {

    let params = new HttpParams();

    if (opts?.user !== undefined)
      params = params.set('user', String(opts.user)); // ✅ تعديل صحيح

    if (opts?.is_active !== undefined)
      params = params.set('is_active', String(opts.is_active)); // ✅ تعديل

    if (opts?.search)
      params = params.set('search', opts.search);

    if (opts?.ordering)
      params = params.set('ordering', opts.ordering === 'asc' ? 'title' : '-title');

    if (opts?.page)
      params = params.set('page', String(opts.page));

    if (opts?.page_size)
      params = params.set('page_size', String(opts.page_size));

    return this.http.get<{results: Plan[], count: number}>(this.base, { params });
  }

  create(payload: Partial<Plan>) {
    return this.http.post<Plan>(this.base, payload);
  }

  update(id: number, payload: Partial<Plan>) {
    return this.http.put<Plan>(this.base + id + '/', payload);
  }

  remove(id: number) {
    return this.http.delete<void>(this.base + id + '/');
  }
}
