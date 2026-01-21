// src/app/layouts/admin-layout/pages/trainers/trainers.component.ts
import { Component, OnInit } from '@angular/core';
import { UsersService } from '../../../../core/services/users.service';
import { User } from '../../../../core/models/api.models';
import { Router } from '@angular/router';

type ActiveFilter = 'all' | 'active' | 'inactive';
type NameOrder = 'asc' | 'desc';

@Component({
  selector: 'app-trainers',
  templateUrl: './trainers.component.html',
  styleUrls: ['./trainers.component.scss']
})
export class TrainersComponent implements OnInit {
  cols = [
    { key: 'username',   label: 'اسم المستخدم' },
    { key: 'first_name', label: 'الاسم الأول' },
    { key: 'last_name',  label: 'العائلة' },
    { key: 'is_active',  label: 'نشِط' }
  ];

  rows: Partial<User>[] = [];
  filteredRows: Partial<User>[] = [];
  loading = false;

  activeFilter: ActiveFilter = 'all';
  order: NameOrder = 'asc';

  // نص الفلترة بالعائلة
  familyQ = '';

  constructor(private api: UsersService, private router: Router) {}

  ngOnInit(): void { this.load(); }

  // تحميل من السيرفر ثم تطبيق الفلاتر المحلية
  load(): void {
    this.loading = true;

    this.api.list({ page: 1, page_size: 1000, ordering: this.order }).subscribe({
      next: (res) => {
        let data = (res.results || []).filter(u => u.role === 'trainer');

        if (this.activeFilter === 'active')   data = data.filter(u => u.is_active);
        if (this.activeFilter === 'inactive') data = data.filter(u => !u.is_active);

        this.rows = data.map(u => ({
          id: u.id,
          username: u.username,
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          is_active: u.is_active
        }));

        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleOrder(): void {
    this.order = this.order === 'asc' ? 'desc' : 'asc';
    this.load();
  }

  openDetails(row: any): void {
    this.router.navigate(['/trainers', row.id]);
  }

  edit(row: any): void {
    this.router.navigate(['/users']);
  }

  remove(row: any): void {
    if (!confirm('Delete trainer?')) return;
    this.api.remove(row.id).subscribe(() => this.load());
  }

  // ===== فلترة بالعائلة محليًا =====
  private norm(s: string): string {
    return (s || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[إأآ]/g, 'ا');
  }

  applyFilters(): void {
    const q = this.norm(this.familyQ);
    if (!q) {
      this.filteredRows = this.rows.slice();
      return;
    }
    this.filteredRows = this.rows.filter(r => this.norm(r.last_name || '').includes(q));
  }

  clearFamilyFilter(): void {
    if (!this.familyQ) return;
    this.familyQ = '';
    this.applyFilters();
  }
}
