// src/app/layouts/admin-layout/pages/trainers/trainer-details.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService } from '../../../../core/services/users.service';
import { User } from '../../../../core/models/api.models';

type ActiveFilter = 'all' | 'active' | 'inactive';
type NameOrder = 'asc' | 'desc';

@Component({
  selector: 'app-trainer-details',
  templateUrl: './trainer-details.component.html',
  styleUrls: ['./trainer-details.component.scss']
})
export class TrainerDetailsComponent implements OnInit {
  trainer?: User;
  trainees: Partial<User>[] = [];
  loading = false;

  order: NameOrder = 'asc';
  activeFilter: ActiveFilter = 'all';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private users: UsersService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.fetchTrainer(id);
  }

  private fetchTrainer(id: number) {
    this.loading = true;

    // ما عنا get-by-id بالخدمة؛ منجيب لستة ونلاقيه
    this.users.list({ page: 1, page_size: 1000 }).subscribe({
      next: res => {
        this.trainer = (res.results || []).find(u => u.id === id && u.role === 'trainer');
        this.loadTrainees();
      },
      error: () => { this.loading = false; }
    });
  }

  loadTrainees() {
    if (!this.trainer) { this.loading = false; return; }

    const opts: any = {
      trainer: this.trainer.id,
      ordering: this.order,
      page: 1, page_size: 1000
    };
    if (this.activeFilter === 'active')   opts.active = true;
    if (this.activeFilter === 'inactive') opts.active = false;

    this.users.list(opts).subscribe({
      next: res => {
        const data = (res.results || []).filter(u => u.role === 'trainee');
        this.trainees = data.map(u => ({
          id: u.id,
          username: u.username,
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          is_active: u.is_active
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleOrder() {
    this.order = this.order === 'asc' ? 'desc' : 'asc';
    this.loadTrainees();
  }
  applyFilter() { this.loadTrainees(); }

  toggleActive(row: Partial<User>) {
    if (!row.id) return;
    this.users.update(row.id, { is_active: !row.is_active }).subscribe(() => {
      row.is_active = !row.is_active;
    });
  }

  editUser(row: Partial<User>) {
    // منعيد استخدام شاشة users الموجودة
    this.router.navigate(['/users']);
  }
}
