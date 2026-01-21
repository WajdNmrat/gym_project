// src/app/layouts/admin-layout/pages/plans/plans.component.ts
import { Component, OnInit, TemplateRef } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { UsersService } from '../../../../core/services/users.service';
import { PlansService } from '../../../../core/services/plans.service';
import { MachinesService } from '../../../../core/services/machines.service';
import { Machine, Plan, User } from '../../../../core/models/api.models';

type Role = 'admin' | 'trainer' | 'trainee';

@Component({
  selector: 'app-plans',
  templateUrl: './plans.component.html',
  styleUrls: ['./plans.component.scss']
})
export class PlansComponent implements OnInit {

  role: Role = (() => {
    const r = (localStorage.getItem('gym_role') || '').toLowerCase();
    return (r === 'admin' || r === 'trainer' || r === 'trainee') ? (r as Role) : 'trainee';
  })();

  trainees: User[] = [];
  selectedTraineeId: number | null = null;

  loadingTrainees = false;
  loadingPlans = false;
  loadingMachines = false;
  saving = false;

  plans: Plan[] = [];
  viewPlans: Array<Plan & { machines_names?: string }> = [];

  machines: Machine[] = [];
  machineNameById = new Map<number, string>();

  modalRef?: NgbModalRef;
  editMode = false;
  editingId: number | null = null;

  q = '';

  weekDays = [
    { value: 0, label: 'الأحد' },
    { value: 1, label: 'الإثنين' },
    { value: 2, label: 'الثلاثاء' },
    { value: 3, label: 'الأربعاء' },
    { value: 4, label: 'الخميس' },
    { value: 5, label: 'الجمعة' },
    { value: 6, label: 'السبت' }
  ];

  form = {
    title: '',
    days_per_week: 3,
    sets: 3,
    reps: 10,
    duration_minutes: 45,
    description: '',
    machines: new Set<number>(),
    days: new Set<number>()   // الأيام المختارة
  };

  cols = [
    { key: 'title',            label: 'عنوان الخطة' },
    { key: 'days_per_week',    label: 'أيام/أسبوع' },
    { key: 'sets',             label: 'Sets' },
    { key: 'reps',             label: 'Reps' },
    { key: 'duration_minutes', label: 'المدة (دقائق)' },
    { key: 'machines_names',   label: 'الأجهزة' }
  ];

  constructor(
    private users: UsersService,
    private plansApi: PlansService,
    private machinesApi: MachinesService,
    private modal: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadAllMachines();
    this.loadTrainees();
    // ⭐ إفتراضيًا: اعرض كل الخطط طالما لم يُختر متدرّب
    this.fetchAllPlans();
  }

  /* ============ Machines ============ */
  loadAllMachines() {
    this.loadingMachines = true;
    this.machinesApi.list({ page: 1, page_size: 2000 }).subscribe({
      next: res => {
        this.machines = res.results || [];
        this.machineNameById.clear();
        for (const m of this.machines) this.machineNameById.set(m.id, m.name);
        this.loadingMachines = false;
        if (this.plans.length) this.rebuildViewPlans();
      },
      error: () => { this.loadingMachines = false; }
    });
  }

  /* ============ Trainees ============ */
  loadTrainees() {
    this.loadingTrainees = true;

    if (this.role === 'trainer') {
      this.users.traineeChoices().subscribe({
        next: list => {
          this.trainees = list || [];
          this.loadingTrainees = false;

          if (this.selectedTraineeId && !this.trainees.some(t => t.id === this.selectedTraineeId)) {
            this.selectedTraineeId = null;
            this.fetchAllPlans(); // حدّث العرض الكلي
          }
        },
        error: () => { this.loadingTrainees = false; }
      });
      return;
    }

    // admin: جميع المتدرّبين
    this.users.list({ role: 'trainee', page: 1, page_size: 1000, ordering: 'asc' }).subscribe({
      next: res => { this.trainees = res.results || []; this.loadingTrainees = false; },
      error: () => this.loadingTrainees = false
    });
  }

  /* ============ Plans ============ */
  // ✅ جلب كل الخطط (لكل المتدرّبين)
  fetchAllPlans() {
    this.loadingPlans = true;
    this.plansApi.list({ page: 1, page_size: 1000 }).subscribe({
      next: res => {
        this.plans = res.results || [];
        this.loadingPlans = false;
        this.q = '';
        this.rebuildViewPlans();
      },
      error: () => { this.loadingPlans = false; }
    });
  }

  // ✅ جلب خطط متدرّب معيّن
  fetchPlansForTrainee(traineeId: number) {
    this.loadingPlans = true;
    this.plansApi.list({ user: traineeId, page: 1, page_size: 1000 }).subscribe({
      next: res => {
        this.plans = res.results || [];
        this.loadingPlans = false;
        this.q = '';
        this.rebuildViewPlans();
      },
      error: () => { this.loadingPlans = false; }
    });
  }

  onSelectTrainee() {
    if (!this.selectedTraineeId) {
      // رجّع العرض الكلي عند خيار "-- اختر --"
      this.fetchAllPlans();
      return;
    }
    this.fetchPlansForTrainee(this.selectedTraineeId);
  }

  rebuildViewPlans() {
    const names = (ids: number[] = []) =>
      ids.map(id => this.machineNameById.get(id) || `#${id}`).join(', ');

    const base = this.plans.map(p => ({ ...p, machines_names: names(p.machines) }));

    const q = this.q.trim().toLowerCase();
    this.viewPlans = !q ? base : base.filter(p => (p.title || '').toLowerCase().includes(q));
  }

  onSearchChange() {
    this.rebuildViewPlans();
  }

  /* ============ Modal: Add/Edit ============ */
  openAdd(modalTpl: TemplateRef<any>) {
    if (!this.selectedTraineeId) return; // الإضافة تتطلب متدرّب محدد
    this.editMode = false;
    this.editingId = null;
    this.resetForm();
    this.modalRef = this.modal.open(modalTpl, { centered: true, size: 'lg' });
  }

  openEdit(row: Plan, modalTpl: TemplateRef<any>) {
    if (!this.selectedTraineeId) return;
    this.editMode = true;
    this.editingId = row.id;
    this.resetForm();

    this.form.title = row.title;
    this.form.days_per_week = row.days_per_week;
    this.form.sets = row.sets;
    this.form.reps = row.reps;
    this.form.duration_minutes = row.duration_minutes;
    this.form.description = (row as any).description || '';

    (row.machines || []).forEach(id => this.form.machines.add(id));
    (row.days_of_week || []).forEach(d => this.form.days.add(d));

    this.modalRef = this.modal.open(modalTpl, { centered: true, size: 'lg' });
  }

  toggleMachine(id: number, checked: boolean) {
    if (checked) this.form.machines.add(id);
    else this.form.machines.delete(id);
  }

  toggleDay(dayValue: number, checked: boolean) {
    if (checked) this.form.days.add(dayValue);
    else this.form.days.delete(dayValue);
  }

  private isValidForm(): boolean {
    const t = this.form.title.trim();
    if (!t) return false;
    const dpw = Number(this.form.days_per_week);
    const sets = Number(this.form.sets);
    const reps = Number(this.form.reps);
    const dur  = Number(this.form.duration_minutes);
    return (dpw >= 1 && dpw <= 7 && sets >= 1 && reps >= 1 && dur >= 1);
  }

  savePlan() {
    if (!this.selectedTraineeId) return;
    if (!this.isValidForm()) return;
    if (this.saving) return;
    this.saving = true;

    const payload: Omit<Plan, 'id'> & { description?: string; days_of_week?: number[] } = {
      user: this.selectedTraineeId,
      title: this.form.title.trim(),
      days_per_week: Number(this.form.days_per_week),
      sets: Number(this.form.sets),
      reps: Number(this.form.reps),
      duration_minutes: Number(this.form.duration_minutes),
      machines: Array.from(this.form.machines),
      is_active: true,
      description: this.form.description?.trim() || '',
      days_of_week: Array.from(this.form.days).sort((a, b) => a - b)
    };

    const req = this.editMode && this.editingId
      ? this.plansApi.update(this.editingId, payload)
      : this.plansApi.create(payload);

    req.subscribe({
      next: _ => {
        this.modalRef?.close();
        this.fetchPlansForTrainee(this.selectedTraineeId!);
        if (this.role === 'trainer') this.loadTrainees();
        this.saving = false;
      },
      error: _ => { this.saving = false; }
    });
  }

  removePlan(row: Plan) {
    if (!confirm('حذف الخطة؟')) return;
    this.plansApi.remove(row.id).subscribe(() => {
      if (this.selectedTraineeId) this.fetchPlansForTrainee(this.selectedTraineeId);
    });
  }

  private resetForm() {
    this.form = {
      title: '',
      days_per_week: 3,
      sets: 3,
      reps: 10,
      duration_minutes: 45,
      description: '',
      machines: new Set<number>(),
      days: new Set<number>()
    };
  }
}
