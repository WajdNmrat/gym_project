// src/app/core/services/machines.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment as env } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Machine } from '../models/api.models';

type ListOpts = {
  id?: number | number[];
  is_active?: boolean;
  search?: string;
  ordering?: 'code' | '-code' | 'name' | '-name' | 'id' | '-id';
  page?: number;
  page_size?: number;
};

@Injectable({ providedIn: 'root' })
export class MachinesService {
  private base = `${env.apiUrl}/machines/`;
  constructor(private http: HttpClient) {}

  list(opts: ListOpts = {}): Observable<{ results: Machine[]; count: number }> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 1))
      .set('page_size', String(opts.page_size ?? 20));

    if (opts.id !== undefined) {
      if (Array.isArray(opts.id)) params = params.set('id__in', opts.id.join(','));
      else params = params.set('id', String(opts.id));
    }
    if (opts.is_active !== undefined) params = params.set('is_active', String(opts.is_active));
    if (opts.search) params = params.set('search', opts.search);
    if (opts.ordering) params = params.set('ordering', opts.ordering);

    return this.http.get<{ results: Machine[]; count: number }>(this.base, { params });
  }

  create(payload: Partial<Machine>) {
    return this.http.post<Machine>(this.base, payload);
  }

  update(id: number, payload: Partial<Machine>) {
    return this.http.put<Machine>(this.base + id + '/', payload);
  }

  patch(id: number, payload: Partial<Machine>) {
    return this.http.patch<Machine>(this.base + id + '/', payload);
  }

  remove(id: number) {
    return this.http.delete<void>(this.base + id + '/');
  }
}
