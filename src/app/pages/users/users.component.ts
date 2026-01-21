// src/app/pages/users/users.component.ts
import { Component, OnInit } from '@angular/core';
import { UsersService } from '../../core/services/users.service';
import { User, Role } from '../../core/models/api.models';
import { FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
goToDetails($event: any) {
throw new Error('Method not implemented.');
}
  cols = [
    { key: 'id',        label: 'ID' },
    { key: 'username',  label: 'Username' },
    { key: 'role',      label: 'Role' },
    { key: 'is_active', label: 'Active' },
  ];
  data: User[] = [];
  loading = false;

  // فورم: نخلي password بدون required افتراضياً
  form = this.fb.group({
    id:        [null as number | null],
    username:  ['', Validators.required],
    password:  [''], // required فقط عند الإضافة (منتحكّم فيه ديناميكياً بالsubmit)
    role:      ['trainee', Validators.required],
    is_active: [true]
  });

  constructor(private api: UsersService, private fb: FormBuilder) {}

  ngOnInit() {
    this.load();
  }

  get f(): { [k: string]: AbstractControl } { return this.form.controls; }

  load() {
    this.loading = true;
    this.api.list()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => { this.data = res.results; },
        error: () => { /* ممكن تحط نوتيفيكيشن */ }
      });
  }

  edit(row: User) {
    this.form.patchValue({
      id: row.id,
      username: row.username,
      role: row.role,
      is_active: row.is_active,
      password: '' // ما بنطلب باسورد بالتحديث
    });
  }

  remove(row: User) {
    if (!confirm('Delete user?')) return;
    this.loading = true;
    this.api.remove(row.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(() => this.load());
  }

  submit() {
    if (this.form.invalid) return;

    const v = this.form.value;
    const role = (v.role as unknown) as Role;

    // لو "إضافة" (id=null) تأكد إن password موجود
    const creating = !v.id;
    if (creating && !v.password) {
      // خليه شرط واضح بدل Required دائم بالفورم
      alert('Password is required for creating a new user.');
      return;
    }

    this.loading = true;

    if (v.id) {
      // تحديث (بدون باسورد ما لم ترسله إنت وتدعمه بالباك)
      const payload: Partial<User> = {
        username: v.username || '',
        role,
        is_active: !!v.is_active
      };
      this.api.update(v.id, payload)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(() => {
          this.load();
          this.resetForm();
        });
    } else {
      // إنشاء
      const payload = {
        username:  v.username || '',
        password:  v.password || '',
        role,
        is_active: !!v.is_active
      };
      this.api.create(payload as any)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe(() => {
          this.load();
          this.resetForm();
        });
    }
  }

  private resetForm() {
    this.form.reset({
      id: null,
      username: '',
      password: '',
      role: 'trainee',
      is_active: true
    });
  }
}
