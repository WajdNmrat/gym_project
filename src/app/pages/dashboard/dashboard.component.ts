import {
  AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild
} from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { UsersService } from '../../core/services/users.service';
import { PlansService } from '../../core/services/plans.service';
import { MachinesService } from '../../core/services/machines.service';
import { User, Plan } from '../../core/models/api.models';

type Role = 'admin' | 'trainer' | 'trainee';

/* Chart.js v2 مُحمّل من index.html */
declare const Chart: any;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  role: Role = (localStorage.getItem('gym_role') as Role) || 'trainee';
  myUserId: number | null = Number(localStorage.getItem('gym_user_id')) || null;

  // KPIs
  kpis = {
    title1: '', value1: 0,
    title2: '', value2: 0,
    title3: '', value3: 0,
    title4: '', value4: 0
  };

  // Summary وبيانات الرسوم
  summary = { users: 0, trainers: 0, machines: 0 };
  doughnutData = { active: 0, inactive: 0 };
  barData: { label: string; value: number }[] = [];

  loading = false;

  @ViewChild('summaryRef')  summaryRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutRef') doughnutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barRef')      barRef!:      ElementRef<HTMLCanvasElement>;

  summaryChart: any;
  doughnutChart: any;
  barChart: any;

  subs: Subscription[] = [];

  constructor(
    private usersApi: UsersService,
    private plansApi: PlansService,
    private machinesApi: MachinesService
  ) {}

  ngOnInit(): void { this.loadByRole(); }

  ngAfterViewInit(): void { if (!this.loading) this.renderCharts(); }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.subs.forEach(s => s.unsubscribe());
  }

  /* ===== تحميل البيانات حسب الدور (بدون تغيير على API) ===== */
  private loadByRole() {
    this.loading = true;

    if (this.role === 'admin') {
      const users$    = this.usersApi.list({ page: 1, page_size: 1000, ordering: 'asc' });
      const plans$    = this.plansApi.list({ page: 1, page_size: 1000, ordering: 'asc' });
      const machines$ = this.machinesApi.list({ page: 1, page_size: 1000 });

      const sub = forkJoin([users$, plans$, machines$]).subscribe({
        next: ([u, p, m]) => {
          const users    = u.results || [];
          const plans    = p.results || [];
          const machines = m.results || [];

          const activeUsers = users.filter(x => x.is_active).length;
          const trainers    = users.filter(x => x.role === 'trainer').length;
          const activePlans = plans.filter(x => x.is_active).length;

          this.kpis = {
            title1: 'إجمالي المستخدمين', value1: u.count || users.length,
            title2: 'نشِطون',             value2: activeUsers,
            title3: 'المدرّبون',           value3: trainers,
            title4: 'خطط فعّالة',          value4: activePlans
          };

          this.summary = {
            users: u.count || users.length,
            trainers,
            machines: m.count || machines.length
          };

          this.doughnutData = { active: activeUsers, inactive: (u.count || users.length) - activeUsers };
          this.barData = this.groupBy(plans, 'days_per_week');

          this.loading = false;
          this.renderCharts();
        },
        error: () => { this.loading = false; }
      });
      this.subs.push(sub);

    } else if (this.role === 'trainer') {
      if (!this.myUserId) { this.loading = false; return; }

      const trainees$ = this.usersApi.list({ page: 1, page_size: 1000, trainer: this.myUserId, ordering: 'asc' });
      const plans$    = this.plansApi.list({ page: 1, page_size: 1000, ordering: 'asc' });
      const users$    = this.usersApi.list({ page: 1, page_size: 1000 });
      const machines$ = this.machinesApi.list({ page: 1, page_size: 1000 });

      const sub = forkJoin([trainees$, plans$, users$, machines$]).subscribe({
        next: ([uTrainees, p, uAll, m]) => {
          const trainees          = (uTrainees.results || []).filter(x => x.role === 'trainee');
          const activeTrainees    = trainees.filter(x => x.is_active).length;
          const plansAll          = p.results || [];
          const plansOfMyTrainees = plansAll.filter(pl => trainees.some(t => t.id === pl.user));

          this.kpis = {
            title1: 'إجمالي متدرّبي', value1: trainees.length,
            title2: 'نشِطون',         value2: activeTrainees,
            title3: 'خطط متدرّبي',     value3: plansOfMyTrainees.length,
            title4: 'غير نشِطين',     value4: trainees.length - activeTrainees
          };

          const allUsers = uAll.results || [];
          const trainers = allUsers.filter(x => x.role === 'trainer').length;
          this.summary = {
            users: uAll.count || allUsers.length,
            trainers,
            machines: m.count || (m.results || []).length
          };

          this.doughnutData = { active: activeTrainees, inactive: trainees.length - activeTrainees };
          this.barData = this.groupBy(plansOfMyTrainees, 'days_per_week');

          this.loading = false;
          this.renderCharts();
        },
        error: () => { this.loading = false; }
      });
      this.subs.push(sub);

    } else { // trainee
      if (!this.myUserId) { this.loading = false; return; }

      const plans$    = this.plansApi.list({ page: 1, page_size: 1000, user: this.myUserId });
      const users$    = this.usersApi.list({ page: 1, page_size: 1000 });
      const machines$ = this.machinesApi.list({ page: 1, page_size: 1000 });

      const sub = forkJoin([plans$, users$, machines$]).subscribe({
        next: ([p, u, m]) => {
          const plans       = p.results || [];
          const activePlans = plans.filter(x => x.is_active).length;

          this.kpis = {
            title1: 'كل خططي',                value1: plans.length,
            title2: 'خطط فعّالة',             value2: activePlans,
            title3: 'أيام/أسبوع (متوسط)',      value3: Math.round(this.avg(plans, 'days_per_week')),
            title4: 'مدة (دقائق/خطة)',        value4: Math.round(this.avg(plans, 'duration_minutes'))
          };

          const allUsers = u.results || [];
          const trainers = allUsers.filter(x => x.role === 'trainer').length;
          this.summary = {
            users: u.count || allUsers.length,
            trainers,
            machines: m.count || (m.results || []).length
          };

          this.doughnutData = { active: activePlans, inactive: plans.length - activePlans };
          this.barData = this.groupBy(plans, 'days_per_week');

          this.loading = false;
          this.renderCharts();
        },
        error: () => { this.loading = false; }
      });
      this.subs.push(sub);
    }
  }

  /* ===== Helpers ===== */
  private groupBy(items: Plan[], key: keyof Plan): { label: string; value: number }[] {
    const map = new Map<string, number>();
    items.forEach(it => {
      const k = String(it[key] ?? '');
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => Number(a.label) - Number(b.label));
  }

  private avg(items: Plan[], key: keyof Plan): number {
    if (!items.length) return 0;
    const sum = items.reduce((acc, it) => acc + Number(it[key] || 0), 0);
    return sum / items.length;
  }

  /* ===== Charts (تحسين الشكل فقط) ===== */
  private renderCharts() {
    if (!this.summaryRef || !this.doughnutRef || !this.barRef) return;
    this.destroyCharts();

    // 1) Summary bar (بتدرّج لكل عمود)
    const sctx = this.summaryRef.nativeElement.getContext('2d');

    const gUsers    = sctx.createLinearGradient(0, 0, 0, 320);
    gUsers.addColorStop(0, '#5e72e4'); gUsers.addColorStop(1, '#8da2fb');

    const gTrainers = sctx.createLinearGradient(0, 0, 0, 320);
    gTrainers.addColorStop(0, '#11cdef'); gTrainers.addColorStop(1, '#69e5ff');

    const gMachines = sctx.createLinearGradient(0, 0, 0, 320);
    gMachines.addColorStop(0, '#2dce89'); gMachines.addColorStop(1, '#7ee0b8');

    this.summaryChart = new Chart(sctx, {
      type: 'bar',
      data: {
        labels: ['Users', 'Trainers', 'Machines'],
        datasets: [{
          label: 'Count',
          data: [this.summary.users, this.summary.trainers, this.summary.machines],
          backgroundColor: [gUsers, gTrainers, gMachines]
        }]
      },
      options: {
        maintainAspectRatio: false,
        legend: { labels: { fontSize: 13 } },
        scales: {
          yAxes: [{
            ticks: { beginAtZero: true, precision: 0, fontColor: '#4a5568' },
            gridLines: { color: 'rgba(0,0,0,.07)' }
          }],
          xAxes: [{
            ticks: { fontColor: '#2d3748' },
            gridLines: { display: false }
          }]
        },
        title: {
          display: true,
          text: 'ملخص عام (Users / Trainers / Machines)',
          fontSize: 16,
          fontColor: '#111'
        }
      }
    });

    // 2) Doughnut (Active vs Inactive) مع نسبة بالوسط
    const dctx = this.doughnutRef.nativeElement.getContext('2d');
    const total = this.doughnutData.active + this.doughnutData.inactive;
    const pct = total ? Math.round((this.doughnutData.active / total) * 100) : 0;

    const centerText = {
      beforeDraw: (chart: any) => {
        const { width, height, ctx } = chart.chart;
        ctx.restore();
        const size = (height / 114).toFixed(2);
        ctx.font = `${Number(size) * 1.7}em sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#2d3748';
        const text = `${pct}%`;
        const textX = Math.round((width - ctx.measureText(text).width) / 2);
        const textY = height / 2;
        ctx.fillText(text, textX, textY);
        ctx.save();
      }
    };

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
        maintainAspectRatio: false,
        cutoutPercentage: 68,
        legend: { display: true, position: 'bottom', labels: { fontSize: 12 } },
        tooltips: { enabled: true }
      },
      plugins: [centerText]
    });

    // 3) Plans-by-days bar بزوايا دائرية وتدرّج
    const bctx = this.barRef.nativeElement.getContext('2d');
    const labels = this.barData.map(x => x.label);
    const values = this.barData.map(x => x.value);

    const gBar = bctx.createLinearGradient(0, 0, 0, 320);
    gBar.addColorStop(0, '#fb6340');
    gBar.addColorStop(1, '#ff9f6e');

    const roundedBar = {
      beforeDatasetsDraw: (chart: any) => {
        const ctx = chart.chart.ctx;
        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar: any) => {
            const m = bar._model;
            const radius = 8;
            const left = m.x - m.width / 2;
            const right = m.x + m.width / 2;
            const top = m.y;
            const bottom = m.base;

            ctx.save();
            ctx.fillStyle = gBar;
            ctx.beginPath();
            const r = Math.min(radius, (right - left) / 2, (bottom - top));
            ctx.moveTo(left, bottom);
            ctx.lineTo(left, top + r);
            ctx.quadraticCurveTo(left, top, left + r, top);
            ctx.lineTo(right - r, top);
            ctx.quadraticCurveTo(right, top, right, top + r);
            ctx.lineTo(right, bottom);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          });
        });
        chart.stop();
      }
    };

    this.barChart = new Chart(bctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'عدد الخطط', data: values, backgroundColor: gBar }]
      },
      options: {
        maintainAspectRatio: false,
        legend: { display: false },
        scales: {
          yAxes: [{
            ticks: { beginAtZero: true, precision: 0, fontColor: '#4a5568' },
            gridLines: { color: 'rgba(0,0,0,.07)' }
          }],
          xAxes: [{
            ticks: { fontColor: '#2d3748' },
            gridLines: { display: false }
          }]
        },
        title: { display: true, text: 'توزيع الخطط حسب أيام/أسبوع', fontSize: 16, fontColor: '#111' }
      },
      plugins: [roundedBar]
    });
  }

  private destroyCharts() {
    if (this.summaryChart)  { this.summaryChart.destroy();  this.summaryChart = null; }
    if (this.doughnutChart) { this.doughnutChart.destroy(); this.doughnutChart = null; }
    if (this.barChart)      { this.barChart.destroy();      this.barChart = null; }
  }
}
