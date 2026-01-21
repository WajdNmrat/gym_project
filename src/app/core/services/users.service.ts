// src/app/core/services/users.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment as env } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { User } from '../models/api.models';

type Role = 'admin' | 'trainer' | 'trainee';

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private base = `${env.apiUrl}/users/`;

  constructor(private http: HttpClient) {}

  /**
   * قائمة المستخدمين مع فِلترة وترتيب متوافقين مع DRF + django-filter
   * ملاحظات:
   * - trainer__isnull اختياري؛ لو فعلته بالباك بيشتغل، وإلا السيرفر يتجاهله بلا مشاكل.
   */
  list(opts?: {
    is_active?: boolean;          // يطابق حقل الباك
    role?: Role;                  // فلترة حسب الدور
    trainer?: number;             // فلترة المتدرّبين تبع مدرّب معيّن (id)
    trainer_isnull?: boolean;     // يمرر trainer__isnull=true|false (اختياري)
    ordering?: 'asc' | 'desc';    // يرتّب حسب username
    search?: string;              // بحث على first/last/username/email
    page?: number;
    page_size?: number;           // يشتغل إذا فعّلت page_size_query_param بالباك
  }): Observable<Paginated<User>> {
    let params = new HttpParams();

    if (opts?.is_active !== undefined) params = params.set('is_active', String(opts.is_active));
    if (opts?.role) params = params.set('role', opts.role);
    if (opts?.trainer !== undefined) params = params.set('trainer', String(opts.trainer));

    // دعم trainer__isnull لو فعّلته بالباك (لن يسبب خطأ إن لم يُدعم)
    if (opts?.trainer_isnull !== undefined) {
      params = params.set('trainer__isnull', String(opts.trainer_isnull));
    }

    if (opts?.ordering) {
      params = params.set('ordering', opts.ordering === 'asc' ? 'username' : '-username');
    }
    if (opts?.search) params = params.set('search', opts.search);
    if (opts?.page) params = params.set('page', String(opts.page));
    if (opts?.page_size) params = params.set('page_size', String(opts.page_size));

    return this.http.get<Paginated<User>>(this.base, { params });
  }

  /** جلب مستخدم واحد */
  get(id: number) {
    return this.http.get<User>(`${this.base}${id}/`);
  }

  /** إنشاء مستخدم جديد (أدمن/مدرّب/متدرّب حسب الـpayload) */
  create(payload: Partial<User> & { password: string }) {
    return this.http.post<User>(this.base, payload);
  }

  /** تحديث كامل (PUT) */
  update(id: number, payload: Partial<User>) {
    return this.http.put<User>(`${this.base}${id}/`, payload);
  }

  /** تحديث جزئي (PATCH) — مفيد لتعديل trainer مثلاً */
  patch(id: number, payload: Partial<User>) {
    return this.http.patch<User>(`${this.base}${id}/`, payload);
  }

  /** حذف مستخدم */
  remove(id: number) {
    return this.http.delete<void>(`${this.base}${id}/`);
  }

  /** تفعيل/تعطيل مستخدم (أكشنات مخصّصة بالباك) */
  activate(id: number) {
    return this.http.post<User>(`${this.base}${id}/activate/`, {});
  }

  deactivate(id: number) {
    return this.http.post<User>(`${this.base}${id}/deactivate/`, {});
  }

  /**
   * (اختياري) لائحة المتدرّبين غير المربوطين بأي مدرّب.
   * يعمل مباشرة إذا كان الباك يساند trainer__isnull. إن لم يدعم، ممكن تفلترهم بالواجهة.
   */
  listUnassignedTrainees(): Observable<Paginated<User>> {
    const params = new HttpParams()
      .set('role', 'trainee')
      .set('page_size', '1000')
      .set('trainer__isnull', 'true'); // يعمل فقط إذا مُفعّل في الباك
    return this.http.get<Paginated<User>>(this.base, { params });
  }

  /**
   * لائحة اختيار خاصة بالمدرّب:
   * - متدرّبيه الحاليين
   * - + المتدرّبين غير المربوطين بأي مدرّب ولا يملكون أي خطة
   * (تتطلب الأكشن backend: GET /api/users/trainee-choices/)
   */
  traineeChoices(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}trainee-choices/`);
  }
}
