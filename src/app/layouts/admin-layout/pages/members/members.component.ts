import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { MembersService, User } from '../../../../core/services/members.service';

@Component({
  selector: 'app-members',
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.scss']
})
export class MembersComponent implements OnInit {
  loading = false;
  data: User[] = [];

  // فلترة بالـID
  idFilter: number | null = null;

  cols = [
    { key: 'id',         label: 'بطاقة تعريف' },
    { key: 'username',   label: 'اسم المستخدم' },
    { key: 'role',       label: 'دور' },
    { key: 'is_active',  label: 'نشط' },
  ];

  form = this.fb.group({
    id:        [null as number | null],
    username:  ['', Validators.required],
    password:  ['', Validators.required], // مطلوبة فقط عند الإضافة
    is_active: [true]
  });

  constructor(private fb: FormBuilder, private api: MembersService) {}

  ngOnInit(): void {
    this.load();
  }

  // مريح للتعامل مع الحالة
  get editing(): boolean {
    return !!this.form.value.id;
  }

  get f(): { [key: string]: AbstractControl } {
    return this.form.controls as any;
  }

  // تحميل القائمة:
  // - إن كان idFilter موجود → نجيب مستخدم واحد بـ GET /users/{id}/ ونعرِضه فقط إن كان trainee
  // - غير هيك → نجيب كل المتدرّبين (role=trainee)
  load(): void {
    this.loading = true;

    const id = Number(this.idFilter);
    if (Number.isFinite(id) && id > 0) {
      this.api.get(id).subscribe({
        next: (u: User) => {
          this.data = (u && u.role === 'trainee') ? [u] : [];
          this.loading = false;
        },
        error: () => {
          this.data = [];
          this.loading = false;
        }
      });
      return;
    }

    // بدون فلتر ID: رجّع قائمة المتدرّبين
    this.api.list({ role: 'trainee', page: 1, page_size: 1000 }).subscribe({
      next: (res) => {
        this.data = res.results;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyIdFilter(): void {
    this.load();
  }

  clearIdFilter(): void {
    this.idFilter = null;
    this.load();
  }

  // تهيئة Validators لكلمة السر حسب حالة الإضافة/التعديل
  private setPasswordValidatorsForMode(edit: boolean): void {
    if (edit) {
      this.f['password'].clearValidators(); // اختيارية في التعديل
    } else {
      this.f['password'].setValidators([Validators.required]); // مطلوبة في الإضافة
    }
    this.f['password'].updateValueAndValidity({ emitEvent: false });
  }

  submit(): void {
    if (this.editing) {
      // في التعديل: password اختيارية
      this.setPasswordValidatorsForMode(true);
    } else {
      // في الإضافة: password مطلوبة
      this.setPasswordValidatorsForMode(false);
    }

    if (this.form.invalid) return;

    const v = this.form.value;

    if (this.editing) {
      // لا نبعت كلمة السر إذا كانت فاضية
      const payload: Partial<User> = {
        username: v.username || '',
        is_active: !!v.is_active
      };
      this.api.update(v.id!, payload).subscribe({
        next: () => this.afterSave(),
        error: () => {/* ممكن تعرض توست */ }
      });
    } else {
      // إضافة جديدة: نرسل الدور trainee صراحةً + كلمة السر
      const payload: any = {
        username:  v.username || '',
        password:  v.password || '',
        is_active: !!v.is_active,
        role:      'trainee'
      };
      this.api.create(payload).subscribe({
        next: () => this.afterSave(),
        error: () => {/* ممكن تعرض توست */ }
      });
    }
  }

  afterSave(): void {
    // أعد Validators لكلمة السر إلى الحالة الافتراضية (مطلوبة للإضافة القادمة)
    this.form.reset({ id: null, username: '', password: '', is_active: true });
    this.setPasswordValidatorsForMode(false);
    this.load();
  }

  edit(row: User): void {
    this.form.patchValue({
      id: row.id,
      username: row.username,
      password: '', // ما بنعرضها
      is_active: row.is_active
    });
    // كلمة السر اختيارية في وضع التعديل
    this.setPasswordValidatorsForMode(true);
  }

  remove(row: User): void {
    if (!confirm('حذف هذا المشترك؟')) return;
    this.api.remove(row.id).subscribe(() => this.load());
  }
}
