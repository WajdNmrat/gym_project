// src/app/core/auth/jwt.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpClient
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment as env } from '../../../environments/environment';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshToken$ = new BehaviorSubject<string | null>(null);

  // المسارات اللي ما بنضيفلها Authorization وما بنحاول نعمل فيها refresh
  private readonly excludedAuthPaths = [
    `${env.apiUrl}/auth/login/`,
    `${env.apiUrl}/auth/refresh/`
  ];

  constructor(private auth: AuthService, private http: HttpClient) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let request = req;

    // لا تُضيف Authorization على مسارات المصادقة نفسها
    if (!this.isExcluded(req.url)) {
      const token = localStorage.getItem('gym_access');
      if (token) request = this.addAuthHeader(req, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // لو 401 ومش على مسارات auth و في refresh token → جرّب نعمل refresh مرّة واحدة
        if (
          error.status === 401 &&
          !this.isExcluded(req.url) &&
          localStorage.getItem('gym_refresh')
        ) {
          return this.handle401AndRefresh(request, next);
        }

        // غير هيك: مرّر الخطأ كالمعتاد
        return throwError(() => error);
      })
    );
  }

  // ================== Helpers ==================

  private isExcluded(url: string): boolean {
    return this.excludedAuthPaths.some(u => url.startsWith(u));
  }

  private addAuthHeader(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private handle401AndRefresh(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      // ابدأ محاولة التجديد
      this.isRefreshing = true;
      this.refreshToken$.next(null);

      const refresh = localStorage.getItem('gym_refresh')!;

      // نستخدم HttpClient مباشرة لمسار /auth/refresh/
      return this.http.post<{ access: string }>(`${env.apiUrl}/auth/refresh/`, { refresh }).pipe(
        switchMap(res => {
          const newAccess = res?.access;
          if (!newAccess) throw new Error('No access token returned from refresh');

          // خزّن التوكن الجديد وابلغ المشتركين
          localStorage.setItem('gym_access', newAccess);
          this.isRefreshing = false;
          this.refreshToken$.next(newAccess);

          // أعد إرسال الطلب الأصلي مع الهيدر الجديد
          return next.handle(this.addAuthHeader(req, newAccess));
        }),
        catchError(err => {
          // فشل التجديد → خروج
          this.isRefreshing = false;
          this.auth.logout();
          window.location.href = '/login';
          return throwError(() => err);
        })
      );
    } else {
      // إذا في تجديد جارٍ بالفعل → استنّى لحد ما ينزل التوكن الجديد، وبعدين أعد الطلب
      return this.refreshToken$.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next.handle(this.addAuthHeader(req, token!)))
      );
    }
  }
}
