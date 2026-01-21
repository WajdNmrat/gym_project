// src/app/pages/user-profile/user-profile.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../../core/services/users.service';
import { User } from '../../core/models/api.models';

type ProfileExtras = {
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  about?: string;
};

type EditableUser = Pick<User, 'username' | 'email' | 'first_name' | 'last_name'>;
type Role = 'admin' | 'trainer' | 'trainee';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {

  // هوية المُشاهد (من التخزين المحلي)
  viewerId: number | null = null;
  viewerRole: Role = 'trainee';

  // الهوية المطلوب عرضها على الصفحة (قد تأتي من ?id=.. أو تكون نفس المستخدم)
  viewedUserId: number | null = null;

  // نموذج الواجهة
  form: EditableUser = {
    username: '',
    email: '',
    first_name: '',
    last_name: ''
  };

  // نسخة أصلية للمقارنة
  private initialForm: EditableUser = {
    username: '',
    email: '',
    first_name: '',
    last_name: ''
  };

  // حقول محلية لكل مستخدم
  extras: ProfileExtras = {
    address: '',
    city: '',
    country: '',
    postal_code: '',
    about: ''
  };

  loading = false;
  saving  = false;

  constructor(
    private users: UsersService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // حمّل هوية وصلاحية المُشاهد
    const rawViewerId = localStorage.getItem('gym_user_id');
    const parsed = rawViewerId != null ? parseInt(rawViewerId, 10) : NaN;
    this.viewerId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

    const r = (localStorage.getItem('gym_role') || '').toLowerCase();
    if (r === 'admin' || r === 'trainer' || r === 'trainee') {
      this.viewerRole = r as Role;
    }

    // إن وُجد ?id=.. نستعمله للعرض، وإلا نعرض نفس المستخدم
    const qpId = Number(this.route.snapshot.queryParamMap.get('id') || '');
    this.viewedUserId = Number.isFinite(qpId) && qpId > 0 ? qpId : this.viewerId;

    this.loadProfile();
  }

  /** اسم مفتاح التخزين المحلي حسب المستخدم المعروض */
  private get extrasStorageKey(): string {
    return this.viewedUserId ? `profile_extras_${this.viewedUserId}` : 'profile_extras';
  }

  /** هل يُسمح بالحفظ؟ صاحب الحساب أو أدمن فقط */
  private get canEdit(): boolean {
    if (!this.viewedUserId) return false;
    if (this.viewerRole === 'admin') return true;
    return this.viewerId === this.viewedUserId;
  }

  private loadProfile(): void {
    this.loading = true;

    if (this.viewedUserId) {
      this.users.get(this.viewedUserId).subscribe({
        next: (u: User) => {
          this.form.username   = (u?.username ?? '').toString();
          this.form.email      = (u?.email ?? '').toString();
          this.form.first_name = (u?.first_name ?? '').toString();
          this.form.last_name  = (u?.last_name ?? '').toString();

          this.initialForm = { ...this.form };
          this.loading = false;
        },
        error: (e) => {
          this.loading = false;
          // في حال عدم السماح (403) أو خطأ آخر — نبقي الصفحة لكن بدون داتا من الباك
          console.warn('Failed to load user profile:', e);
          alert('تعذّر تحميل الملف أو غير مسموح بالوصول.');
        }
      });
    } else {
      this.loading = false;
    }

    // حمّل/رحّل الـ extras المحلي
    try {
      const namespaced = localStorage.getItem(this.extrasStorageKey);
      const legacy = localStorage.getItem('profile_extras'); // مفتاح قديم مشترك

      if (namespaced) {
        this.extras = { ...this.extras, ...(JSON.parse(namespaced) as ProfileExtras) };
      } else if (legacy) {
        this.extras = { ...this.extras, ...(JSON.parse(legacy) as ProfileExtras) };
        localStorage.setItem(this.extrasStorageKey, JSON.stringify(this.extras));
        localStorage.removeItem('profile_extras');
      }
    } catch {
      // تجاهل JSON مكسور
    }
  }

  // ابنِ Payload يحتوي فقط الحقول التي تغيّرت + trimming
  private buildChangedPayload(): Partial<EditableUser> {
    const payload: Partial<EditableUser> = {};
    const current: EditableUser = {
      username: (this.form.username || '').trim(),
      email: (this.form.email || '').trim(),
      first_name: (this.form.first_name || '').trim(),
      last_name: (this.form.last_name || '').trim()
    };

    (Object.keys(current) as (keyof EditableUser)[]).forEach((k) => {
      const prev = (this.initialForm[k] || '').trim();
      const now  = (current[k] || '').trim();
      if (now !== prev) payload[k] = now;
    });

    return payload;
  }

  // حوّل أخطاء DRF لرسالة مفهومة
  private parseDrfErrors(err: any): string {
    if (err?.error && typeof err.error === 'object') {
      const lines: string[] = [];
      for (const key of Object.keys(err.error)) {
        const val = err.error[key];
        const msgs = Array.isArray(val) ? val.join('، ') : (typeof val === 'string' ? val : JSON.stringify(val));
        const label = key === 'non_field_errors' ? 'Error' : key;
        lines.push(`${label}: ${msgs}`);
      }
      if (lines.length) return lines.join('\n');
    }
    return 'Bad Request (400) — تحقق من القيم المُدخلة.';
  }

  save(): void {
    if (this.saving) return;

    if (!this.canEdit) {
      alert('غير مسموح تعديل هذا الملف.');
      return;
    }

    // فحص صيغة البريد
    if (this.form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.form.email)) {
      alert('صيغة البريد الإلكتروني غير صحيحة.');
      return;
    }

    this.saving = true;

    const finish = (ok: boolean, msg?: string) => {
      this.saving = false;
      if (ok) {
        // خزّن الـextras محليًا لهذا المستخدم المعروض
        localStorage.setItem(this.extrasStorageKey, JSON.stringify(this.extras || {}));

        // حدّث اسم المستخدم في النافبار لو تغيّر (للمُشاهد نفسه)
        if (this.viewerId && this.viewedUserId === this.viewerId) {
          const uname = (this.form.username || '').trim();
          if (uname) localStorage.setItem('gym_user', uname);
          window.dispatchEvent(new CustomEvent('profile:saved'));
        }

        // حدّث الـ snapshot
        this.initialForm = { ...this.form };

        alert('تم حفظ الملف الشخصي بنجاح ✅');
      } else {
        alert(msg || 'تعذّر الحفظ. جرّب مرة ثانية.');
      }
    };

    if (!this.viewedUserId) {
      finish(true);
      return;
    }

    const payload = this.buildChangedPayload();

    // إذا ما في تغييرات، إحفظ فقط المحلي
    if (!Object.keys(payload).length) {
      finish(true);
      return;
    }

    this.users.patch(this.viewedUserId, payload).subscribe({
      next: () => finish(true),
      error: (e) => {
        const msg = this.parseDrfErrors(e);
        finish(false, msg);
      }
    });
  }
}
