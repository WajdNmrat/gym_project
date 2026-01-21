// src/app/core/auth/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { switchMap, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

type Tokens = { access: string; refresh: string };
type Me = { id: number; role?: string; username?: string; email?: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private accessKey = 'gym_access';
  private refreshKey = 'gym_refresh';
  private roleKey    = 'gym_role';
  private userIdKey  = 'gym_user_id';
  private usernameKey = 'gym_username';

  constructor(private http: HttpClient, private router: Router) {}

  /** تسجيل الدخول: خزّن التوكنات ثم اجلب بياناتي واحفظ id/role/username */
  login(username: string, password: string): Observable<Me> {
    return this.http
      .post<Tokens>(`${environment.apiUrl}/auth/login/`, { username, password })
      .pipe(
        tap(tokens => {
          localStorage.setItem(this.accessKey, tokens.access);
          localStorage.setItem(this.refreshKey, tokens.refresh);
          this.extractRoleFromToken(tokens.access); // قد يحدد role/user_id لو موجود
        }),
        switchMap(() => this.http.get<Me>(`${environment.apiUrl}/users/me/`)),
        tap(me => {
          if (me?.id) localStorage.setItem(this.userIdKey, String(me.id));
          if (me?.role) localStorage.setItem(this.roleKey, String(me.role).toLowerCase());
          // ✅ خزّن اسم المستخدم دائمًا (ولو مش موجود خُذ email أو "User")
          const uname = (me?.username || me?.email || 'User').toString();
          localStorage.setItem(this.usernameKey, uname);
        })
      );
  }

  /** إنشاء مستخدم جديد */
  register(username: string, password: string, role: string) {
    return this.http.post(
      `${environment.apiUrl}/users/`,
      { username, password, role, is_active: true }
    );
  }

  /** تسجيل خروج وتنظيف التخزين */
  logout(): void {
    localStorage.removeItem(this.accessKey);
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem(this.userIdKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.usernameKey);
    this.router.navigateByUrl('/login');
  }

  /** هل المستخدم مسجّل دخول؟ */
  isLoggedIn(): boolean {
    return !!this.accessToken;
  }

  /** فحص الدور */
  hasRole(role: string): boolean {
    return (localStorage.getItem(this.roleKey) || '').toLowerCase() === role.toLowerCase();
  }

  /** قراءة التوكن */
  get accessToken(): string | null {
    return localStorage.getItem(this.accessKey);
  }

  /** (اختياري) استخراج الدور من JWT إذا السيرفر يحطّه بالـclaims */
  private extractRoleFromToken(token: string) {
    try {
      const payload: any = jwtDecode(token);
      if (payload?.role) {
        localStorage.setItem(this.roleKey, String(payload.role).toLowerCase());
      }
      if (payload?.user_id && !localStorage.getItem(this.userIdKey)) {
        localStorage.setItem(this.userIdKey, String(payload.user_id));
      }
      if (payload?.username && !localStorage.getItem(this.usernameKey)) {
        localStorage.setItem(this.usernameKey, String(payload.username));
      }
    } catch {}
  }
}
