// src/app/pages/trainee-dashboard/trainee-dashboard.component.ts
import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild
} from '@angular/core';
import { Subscription } from 'rxjs';
import { PlansService } from '../../core/services/plans.service';
import { UsersService } from '../../core/services/users.service';
import { MachinesService } from '../../core/services/machines.service';
import { Plan, Machine } from '../../core/models/api.models';

type Role = 'admin' | 'trainer' | 'trainee';
declare const Chart: any; // Chart.js v2

@Component({
  selector: 'app-trainee-dashboard',
  templateUrl: './trainee-dashboard.component.html',
  styleUrls: ['./trainee-dashboard.component.scss']
})
export class TraineeDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  role: Role = 'trainee';

  /** المتدرّب المعروض حالياً على اللوحة (للمدرّب/الأدمن؛ المتدرّب = نفسه) */
  currentTraineeId: number | null = null;

  /** ID المستخدم الحالي إن كان Trainee */
  myUserId: number | null = null;

  /** إدخال البحث بالـID (للأدمن/المدرّب) */
  searchTraineeId: number | null = null;

  loading = false;
  subs: Subscription[] = [];

  // ===== KPIs =====
  kpis = {
    totalPlans: 0,
    activePlans: 0,
    avgDaysPerWeek: 0,
    avgDuration: 0
  };

  /** بيانات المدرّب للعرض والربط */
  trainerName: string = '-';
  trainerId: number | null = null;

  // ===== Charts =====
  doughnutData = { active: 0, inactive: 0 };
  barData: { label: string; value: number }[] = [];

  @ViewChild('doughnutRef') doughnutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barRef')      barRef!: ElementRef<HTMLCanvasElement>;
  doughnutChart: any;
  barChart: any;

  // ===== الأجهزة =====
  machines: Machine[] = [];
  machineNameById = new Map<number, string>();

  // ===== الخطط =====
  recentPlans: Plan[] = [];
  /** خطط اليوم فقط (سنضيف لها machines_names) */
  todayPlans: Array<Plan & { machines_names?: string }> = [];
  /** تسمية اليوم للواجهة (عربي) */
  todayLabel = this.getTodayLabel();

  constructor(
    private plansApi: PlansService,
    private usersApi: UsersService,
    private machinesApi: MachinesService
  ) {
    const r = (localStorage.getItem('gym_role') || '').toLowerCase();
    if (r === 'admin' || r === 'trainer' || r === 'trainee') this.role = r as Role;

    const rawId = localStorage.getItem('gym_user_id');
    const parsed = rawId != null ? parseInt(rawId, 10) : NaN;
    this.myUserId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

    // المتدرّب يعرض نفسه تلقائياً
    if (this.role === 'trainee') this.currentTraineeId = this.myUserId;
  }

  // ===== Lifecycle =====
  ngOnInit(): void {
    // أولاً حمّل الأجهزة لبناء خريطة الأسماء، بعدها حدّث باقي البيانات
    this.loadAllMachines(() => this.refreshAll());
  }

  ngAfterViewInit(): void {
    if (!this.loading) this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.subs.forEach(s => s.unsubscribe());
  }

  // ===== تغيير المتدرّب المعروض (بحث بالأID) =====
  applyTraineeId(): void {
    const id = Number(this.searchTraineeId);
    if (!Number.isFinite(id) || id <= 0) return;
    this.currentTraineeId = id;
    this.refreshAll();
  }

  // ===== الأجهزة =====
  private loadAllMachines(done?: () => void): void {
    const sub = this.machinesApi.list({ page: 1, page_size: 2000 }).subscribe({
      next: (res) => {
        this.machines = res?.results || [];
        this.machineNameById.clear();
        for (const m of this.machines) this.machineNameById.set(m.id, m.name);
        done?.();
      },
      error: () => { done?.(); }
    });
    this.subs.push(sub);
  }

  // ===== تحميل/تحديث كل شيء =====
  private refreshAll(): void {
    if (!this.currentTraineeId) {
      // تنظيف العرض لو مفيش اختيار
      this.kpis = { totalPlans: 0, activePlans: 0, avgDaysPerWeek: 0, avgDuration: 0 };
      this.doughnutData = { active: 0, inactive: 0 };
      this.barData = [];
      this.recentPlans = [];
      this.todayPlans = [];
      this.trainerName = '-';
      this.trainerId = null;
      this.destroyCharts();
      this.renderCharts();
      return;
    }

    this.loadData(this.currentTraineeId);
    this.loadTrainerInfo(this.currentTraineeId);
  }

  /** يجلب trainer_username و trainer(id) لمتدرّب معيّن */
  private loadTrainerInfo(userId: number): void {
    const sub = this.usersApi.get(userId).subscribe({
      next: (me: any) => {
        this.trainerName = me?.trainer_username || '-';
        this.trainerId = (typeof me?.trainer === 'number' && me.trainer > 0) ? me.trainer : null;
      },
      error: () => {
        this.trainerName = '-';
        this.trainerId = null;
      }
    });
    this.subs.push(sub);
  }

  private loadData(userId: number): void {
    this.loading = true;

    const sub = this.plansApi.list({ user: userId, page: 1, page_size: 1000 }).subscribe({
      next: (resp) => {
        const plans: Plan[] = resp?.results || [];

        // KPIs
        const activePlans = plans.filter(p => p.is_active).length;
        const avgDays = this.avg(plans, 'days_per_week');
        const avgDur  = this.avg(plans, 'duration_minutes');

        this.kpis = {
          totalPlans: plans.length,
          activePlans,
          avgDaysPerWeek: Math.round(avgDays),
          avgDuration: Math.round(avgDur)
        };

        // Charts
        this.doughnutData = {
          active: activePlans,
          inactive: Math.max(0, plans.length - activePlans)
        };
        this.barData = this.groupBy(plans, 'days_per_week');

        // آخر 5 خطط
        this.recentPlans = [...plans]
          .sort((a, b) => (b.id || 0) - (a.id || 0))
          .slice(0, 5);

        // خطة اليوم + حقول أسماء الأجهزة
        const today = plans.filter(p => this.isPlanForToday(p));
        this.todayPlans = today.map(p => ({
          ...p,
          machines_names: this.prettyMachineNames((p as any).machines)
        }));

        this.loading = false;
        this.renderCharts();
      },
      error: () => {
        this.loading = false;
      }
    });

    this.subs.push(sub);
  }

  /** حوّل IDs الأجهزة إلى أسماء مفصولة بفواصل عربية */
  private prettyMachineNames(ids: number[] | undefined): string {
    if (!ids || !ids.length) return '-';
    const names = ids.map(id => this.machineNameById.get(id) || `#${id}`);
    return names.join('، ');
  }

  // ================= Helpers =================
  /** تجميع عددي للبار */
  private groupBy(items: Plan[], key: keyof Plan): { label: string; value: number }[] {
    const m = new Map<string, number>();
    items.forEach(it => {
      const k = String(it[key] ?? '');
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => Number(a.label) - Number(b.label));
  }

  private avg(items: Plan[], key: keyof Plan): number {
    if (!items.length) return 0;
    const sum = items.reduce((acc, it) => acc + Number(it[key] || 0), 0);
    return sum / items.length;
  }

  // ---------- خطة اليوم ----------
  /** اسم اليوم الحالي بالعربي لعرضه في الواجهة */
  private getTodayLabel(): string {
    const ar = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    return ar[new Date().getDay()];
  }

  /** هل الخطة مخصّصة لليوم الحالي؟ يدعم عدة صيغ للحقل في الـAPI */
  private isPlanForToday(p: Plan): boolean {
    const dayIdx = new Date().getDay(); // 0..6  (الأحد..السبت)
    const arNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    const arAlt   = ['الاحد','الاثنين','الثلاثاء','الاربعاء','الخميس','الجمعة','السبت'];
    const enNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

    const todayAR = arNames[dayIdx];
    const todayARAlt = arAlt[dayIdx];
    const todayEN = enNames[dayIdx];

    const norm = (s: string) =>
      (s || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[إأآ]/g, 'ا');

    const anyP: any = p as any;
    const rawDays: unknown =
      anyP.days ?? anyP.day ?? anyP.weekday ?? anyP.days_of_week ?? anyP.weekdays;

    if (typeof rawDays === 'number') return rawDays === dayIdx;

    if (Array.isArray(rawDays)) {
      const arr = rawDays.map(x => String(x));
      const hasIdx = arr.some(x => /^\d+$/.test(x) && Number(x) === dayIdx);
      if (hasIdx) return true;
      const set = new Set(arr.map(x => norm(x)));
      return set.has(norm(todayAR)) || set.has(norm(todayARAlt)) || set.has(todayEN);
    }

    if (typeof rawDays === 'string') {
      const list = rawDays.split(/[,\|؛;]+/).map(x => norm(x));
      const set = new Set(list);
      return set.has(norm(todayAR)) || set.has(norm(todayARAlt)) || set.has(todayEN);
    }

    return false;
  }

  // ================= Charts =================
  private renderCharts(): void {
    if (!this.doughnutRef || !this.barRef || this.loading) return;

    this.destroyCharts();

    // Doughnut
    const dctx = this.doughnutRef.nativeElement.getContext('2d');
    if (dctx) {
      this.doughnutChart = new Chart(dctx, {
        type: 'doughnut',
        data: {
          labels: ['Active', 'Inactive'],
          datasets: [{
            data: [this.doughnutData.active, this.doughnutData.inactive],
            backgroundColor: ['#2dce89', '#e9ecef'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          cutoutPercentage: 65,
          legend: {
            display: true,
            position: 'bottom',
            labels: { fontSize: 13, fontColor: '#333' }
          },
          tooltips: { enabled: true }
        }
      });
    }

    // Bar
    const bctx = this.barRef.nativeElement.getContext('2d');
    const labels = this.barData.map(x => x.label);
    const values = this.barData.map(x => x.value);

    if (bctx) {
      this.barChart = new Chart(bctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'عدد الخطط',
            data: values,
            backgroundColor: '#5e72e4'
          }]
        },
        options: {
          responsive: true,
          legend: { display: false },
          scales: {
            yAxes: [{
              ticks: { beginAtZero: true, precision: 0, fontSize: 13, fontColor: '#444' },
              gridLines: { color: '#ddd' }
            }],
            xAxes: [{
              ticks: { fontSize: 13, fontColor: '#222' },
              gridLines: { display: false }
            }]
          }
        }
      });
    }
  }

  private destroyCharts(): void {
    if (this.doughnutChart) { this.doughnutChart.destroy(); this.doughnutChart = null; }
    if (this.barChart) { this.barChart.destroy(); this.barChart = null; }
  }
}
