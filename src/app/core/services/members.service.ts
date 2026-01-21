// src/app/core/services/members.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment as env } from '../../../environments/environment';

// نفس الشكل اللي بتحتاجه الـcomponents
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'trainer' | 'trainee';
  is_active: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  trainer?: number | null;
}

type ListOpts = {
  role?: 'admin' | 'trainer' | 'trainee';
  is_active?: boolean;
  search?: string;
  ordering?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
};

@Injectable({ providedIn: 'root' })
export class MembersService {
  private base = `${env.apiUrl}/users/`;

  constructor(private http: HttpClient) {}

  /** لائحة المستخدمين (بتقدر تمرّر role=trainee لعرض المتدرّبين فقط) */
  list(opts?: ListOpts): Observable<{ results: User[]; count: number }> {
    let params = new HttpParams();

    if (opts?.role)       params = params.set('role', opts.role);
    if (opts?.is_active !== undefined)
                          params = params.set('is_active', String(opts.is_active));
    if (opts?.search)     params = params.set('search', opts.search);
    if (opts?.ordering)   params = params.set('ordering', opts.ordering === 'asc' ? 'username' : '-username');
    if (opts?.page)       params = params.set('page', String(opts.page));
    if (opts?.page_size)  params = params.set('page_size', String(opts.page_size));

    return this.http.get<{ results: User[]; count: number }>(this.base, { params });
  }

  /** إحضار مستخدم واحد بالـID */
  get(id: number): Observable<User> {
    return this.http.get<User>(this.base + id + '/');
  }

  /** إنشاء مستخدم جديد (افتراضيًا role=trainee إذا ما انبعت) */
  create(payload: {
    username: string;
    password: string;
    is_active: boolean;
    role?: 'admin' | 'trainer' | 'trainee';
  }): Observable<User> {
    const body = {
      username: payload.username,
      password: payload.password,
      is_active: payload.is_active,
      role: payload.role ?? 'trainee',
    };
    return this.http.post<User>(this.base, body);
  }

  /** تحديث (نستخدم PATCH عشان نرسل فقط المتغيّرات) */
  update(id: number, payload: Partial<User> & { password?: string }): Observable<User> {
    return this.http.patch<User>(this.base + id + '/', payload);
  }

  /** حذف */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(this.base + id + '/');
  }
}
