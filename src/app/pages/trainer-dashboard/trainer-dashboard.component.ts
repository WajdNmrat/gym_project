// src/app/pages/trainer-dashboard/trainer-dashboard.component.ts
import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild
} from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { UsersService } from '../../core/services/users.service';
import { PlansService } from '../../core/services/plans.service';
import { User, Plan } from '../../core/models/api.models';

type Role = 'admin' | 'trainer' | 'trainee';
declare const Chart: any; // Chart.js v2 محمّل من index.html

@Component({
  selector: 'app-trainer-dashboard',
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: ['./trainer-dashboard.component.scss']
})
export class TrainerDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  // ===== الهوية والدور =====
  role: Role = (() => {
    const r = (localStorage.getItem('gym_role') || '').toLowerCase();
    return (r === 'admin' || r === 'trainer' || r === 'trainee') ? (r as Role) : 'trainer';
  })();

  myUserId: number | null = (() => {
    const raw = localStorage.getItem('gym_user_id');
    const n = raw != null ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  // ===== KPIs =====
  kpis = {
    totalTrainees: 0,
    activeTrainees: 0,
    myPlans: 0,
    todaySessions: 0 // Placeholder
  };

  // ===== Charts =====
  @ViewChild('doughnutRef') doughnutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barRef')      barRef!:      ElementRef<HTMLCanvasElement>;
  doughnutChart: any;
  barChart: any;

  // ===== جدول المتدرّبين =====
  trainees: User[] = [];
  viewRows: Array<User & { last_activity?: string; plan_count?: number }> = [];

  // فلترة بالعائلة (للأدمن فقط – بالـHTML محطوط *ngIf)
  familyFilter = '';

  // مواعيد الاشتراكات
  subs: Subscription[] = [];
  loading = false;

  constructor(
    private usersApi: UsersService,
    private plansApi: PlansService
  ) {}

  // ===== Lifecycle =====
  ngOnInit(): void { this.loadData(); }

  ngAfterViewInit(): void {
    if (!this.loading) this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.subs.forEach(s => s.unsubscribe());
  }

  // ===== تحميل البيانات =====
  private loadData(): void {
    if (!this.myUserId && this.role === 'trainer') return;
    this.loading = true;

    // جلب المتدرّبين: للأدمن كل المتدرّبين، للمدرّب متدرّبيه فقط
    const trainees$ = (this.role === 'admin')
      ? this.usersApi.list({ role: 'trainee', page: 1, page_size: 1000, ordering: 'asc' })
      : this.usersApi.list({ role: 'trainee', trainer: this.myUserId!, page: 1, page_size: 1000, ordering: 'asc' });

    // جلب الخطط (الـAPI بالباك أصلاً بيفلتر حسب الدور)
    const plans$ = this.plansApi.list({ page: 1, page_size: 1000, ordering: 'asc' });

    const sub = forkJoin([trainees$, plans$]).subscribe({
      next: ([u, p]) => {
        const traineesAll: User[] = (u?.results || []).filter(x => x.role === 'trainee');
        const plansAll:   Plan[]  = p?.results || [];

        // KPIs
        const activeTrainees = traineesAll.filter(t => t.is_active).length;

        // خطط المتدرّبين الظاهرين في هذه اللوحة:
        const traineeIds = new Set(traineesAll.map(t => t.id));
        const plansForThese = plansAll.filter(pl => traineeIds.has(pl.user));

        this.kpis = {
          totalTrainees: traineesAll.length,
          activeTrainees,
          myPlans: plansForThese.length,
          todaySessions: 0
        };

        // بناء صفوف الجدول
        this.trainees = traineesAll;
        const planCountByUser = this.countBy(plansForThese, 'user');

        this.viewRows = traineesAll.map(t => ({
          ...t,
          plan_count: planCountByUser.get(String(t.id)) || 0,
          last_activity: '-' // اربطها لاحقًا لما تتوفر داتا
        }));

        // رسومات
        this.renderCharts();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });

    this.subs.push(sub);
  }

  // ===== فلترة بالعائلة (للأدمن) =====
  // دالة مساعدة لتطبيع النص العربي (إزالة مسافات وتوحيد همزات)
  private norm(s: string): string {
    return (s || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[إأآ]/g, 'ا');
  }

  // Getter يُطَبِّق الفلترة عند كل تغيير
  get filteredRows(): Array<User & { last_activity?: string; plan_count?: number }> {
    if (this.role !== 'admin') return this.viewRows;

    const q = this.norm(this.familyFilter);
    if (!q) return this.viewRows;

    return this.viewRows.filter(t => this.norm(t.last_name || '').includes(q));
  }

  onFamilyFilterChange(): void {
    // ولا اشي هون، الـGetter كافي. منخليها بس عشان تربط مع (ngModelChange) لو حابب توسّع لاحقًا.
  }

  clearFamilyFilter(): void {
    this.familyFilter = '';
  }

  // ===== Helpers =====
  private countBy<T>(items: T[], key: keyof T): Map<string, number> {
    const m = new Map<string, number>();
    items.forEach((it: any) => {
      const k = String(it[key] ?? '');
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }

  // ===== Charts (Chart.js v2) =====
  private renderCharts(): void {
    if (!this.doughnutRef || !this.barRef) return;
    this.destroyCharts();

    // Doughnut: Active vs Inactive
    const inactive = Math.max(0, this.kpis.totalTrainees - this.kpis.activeTrainees);
    const dctx = this.doughnutRef.nativeElement.getContext('2d');
    if (dctx) {
      this.doughnutChart = new Chart(dctx, {
        type: 'doughnut',
        data: {
          labels: ['Active', 'Inactive'],
          datasets: [{
            data: [this.kpis.activeTrainees, inactive],
            backgroundColor: ['#2dce89', '#e9ecef'],
            hoverBackgroundColor: ['#28b97b', '#dfe3e7'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutoutPercentage: 70,
          legend: {
            display: true,
            position: 'bottom',
            labels: { fontSize: 13, fontColor: '#344767' }
          },
          animation: { animateRotate: true, animateScale: true }
        }
      });
    }

    // Bar: Plans per Trainee (Top 8)
    const labels: string[] = [];
    const values: number[] = [];
    this.viewRows.slice(0, 8).forEach(t => {
      labels.push(t.username || `#${t.id}`);
      values.push(t.plan_count || 0);
    });

    const bctx = this.barRef.nativeElement.getContext('2d');
    if (bctx) {
      this.barChart = new Chart(bctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'عدد الخطط',
            data: values,
            backgroundColor: '#5e72e4',
            hoverBackgroundColor: '#4a5fd6'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          legend: { display: false },
          scales: {
            yAxes: [{
              ticks: { beginAtZero: true, precision: 0, fontSize: 13, fontColor: '#444' },
              gridLines: { color: 'rgba(0,0,0,.06)' }
            }],
            xAxes: [{
              ticks: { fontSize: 13, fontColor: '#222' },
              gridLines: { display: false }
            }]
          },
          animation: { duration: 500 }
        }
      });
    }
  }

  private destroyCharts(): void {
    if (this.doughnutChart) { this.doughnutChart.destroy(); this.doughnutChart = null; }
    if (this.barChart) { this.barChart.destroy(); this.barChart = null; }
  }
}
