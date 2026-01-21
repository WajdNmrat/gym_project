import { Routes } from '@angular/router';

import { DashboardComponent } from '../../pages/dashboard/dashboard.component';
import { IconsComponent } from '../../pages/icons/icons.component';
import { MapsComponent } from '../../pages/maps/maps.component';
import { UserProfileComponent } from '../../pages/user-profile/user-profile.component';

// صفحاتك الحالية…
import { MembersComponent } from './pages/members/members.component';
import { TrainersComponent } from './pages/trainers/trainers.component';
import { PlansComponent } from './pages/plans/plans.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { AttendanceComponent } from './pages/attendance/attendance.component';
import { UsersComponent } from '../../pages/users/users.component';
import { MachinesComponent } from './pages/machines/machines.component';

// ✅ استورد الكمبوننت الجديد
import { TrainerDashboardComponent } from '../../pages/trainer-dashboard/trainer-dashboard.component';
import { TraineeDashboardComponent } from '../../pages/trainee-dashboard/trainee-dashboard.component';

import { AuthGuard } from '../../core/auth/auth.guard';
import { RoleGuard } from '../../core/auth/role.guard';
import { ContactUsComponent } from '../../pages/contact-us/contact-us.component';

export const AdminLayoutRoutes: Routes = [
  // Dashboard الأدمن العادي
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin'] }

  },
  {
   path: 'machines',
  component: MachinesComponent,
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: ['admin'] }
  },
  {
    path: 'trainee-dashboard',
    component: TraineeDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['trainee'] }
  },
  // ✅ Dashboard المدرّب (جديد)
  {
    path: 'trainer-dashboard',
    component: TrainerDashboardComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['trainer'] }
  },

  // باقي المسارات…
  {
    path: 'user-profile',
    component: UserProfileComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'members',
    component: MembersComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'trainers',
    component: TrainersComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'plans',
    component: PlansComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'trainer'] }
  },
  {
    path: 'attendance',
    component: AttendanceComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'trainer'] }
  },
  {
    path: 'payments',
    component: PaymentsComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'trainer'] }
  },
  {
    path: 'icons',
    component: IconsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'maps',
    component: MapsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'contact-us',
    component: ContactUsComponent,
    canActivate: [AuthGuard] // ✅ متاح لكل الأدوار بعد تسجيل الدخول
  },
];
