// src/app/pages/login/login.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  password = '';
  remember = false;
  loading = false;
  errorMsg = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    if (!this.username || !this.password) {
      this.errorMsg = 'فضلاً أدخل اسم المستخدم وكلمة المرور';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.loading = false;

        // ✅ حفظ اسم المستخدم دائمًا بعد تسجيل الدخول
        localStorage.setItem('gym_username', this.username);

        // ✅ قراءة الدور من الـ localStorage
        const role = (localStorage.getItem('gym_role') || '').toLowerCase();

        // ✅ توجيه المستخدم حسب الدور
        if (role === 'admin') {
          this.router.navigateByUrl('/dashboard');
        } else if (role === 'trainer') {
          this.router.navigateByUrl('/trainer-dashboard');
        } else if (role === 'trainee') {
          this.router.navigateByUrl('/trainee-dashboard');
        } else {
          // في حال الدور غير معروف، رجّعه للوحة العامة
          this.router.navigateByUrl('/dashboard');
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.detail || 'بيانات الدخول غير صحيحة';
      }
    });
  }
}
