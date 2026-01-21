import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../../core/services/users.service';

type RoleOpt = 'trainee' | 'trainer' | 'admin';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    // ✅ خليه 8 عشان يطابق شروط أغلب الباك
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['trainee' as RoleOpt, [Validators.required]]
  });

  loading = false;
  termsAccepted = true;
  errorMsg = '';
  successMsg = '';

  constructor(
    private fb: FormBuilder,
    private usersApi: UsersService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  private formatServerErrors(errBody: any): string {
    // يحوّل أخطاء DRF لرسالة مفهومة
    if (!errBody || typeof errBody !== 'object') return 'Registration failed.';
    if (typeof errBody.detail === 'string') return errBody.detail;

    const parts: string[] = [];
    for (const key of Object.keys(errBody)) {
      const val = errBody[key];
      if (Array.isArray(val)) {
        parts.push(`${key}: ${val.join(', ')}`);
      } else if (typeof val === 'string') {
        parts.push(`${key}: ${val}`);
      }
    }
    return parts.length ? parts.join('\n') : 'Registration failed.';
  }

  submit(): void {
    // الزر دايمًا مفعّل؛ بنبعت اللي موجود
    const { name, email, password, role } = this.form.value as {
      name: string; email: string; password: string; role: RoleOpt;
    };

    const payload: any = {
      username: (name || '').trim(),   // الاسم حنستعمله كـ username زي ما طلبت
      email: (email || '').trim(),
      password,
      role: role || 'trainee',
      is_active: true                   // مفيد لو الـSerializer يتوقعه
    };

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.usersApi.create(payload).subscribe({
      next: _res => {
        this.loading = false;
        this.successMsg = '✅ Account created successfully!';
        alert(this.successMsg);
        this.form.reset({
          name: '',
          email: '',
          password: '',
          role: 'trainee'
        });
        this.router.navigate(['/login']);
      },
      error: err => {
        this.loading = false;
        const serverMsg =
          this.formatServerErrors(err?.error) ||
          err?.message ||
          '❌ Registration failed.';
        this.errorMsg = serverMsg;
        alert('❌ ' + serverMsg);
        // للمساعدة، اطبع بالكونسول كامل الرد
        // console.error(err);
      }
    });
  }
}
