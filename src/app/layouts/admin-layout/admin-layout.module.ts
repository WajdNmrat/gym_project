// src/app/layouts/admin-layout/admin-layout.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MachinesComponent } from './pages/machines/machines.component';

// المسارات
import { AdminLayoutRoutes } from './admin-layout.routing';

// الصفحات
import { DashboardComponent } from '../../pages/dashboard/dashboard.component';
import { UserProfileComponent } from '../../pages/user-profile/user-profile.component';
import { TablesComponent } from '../../pages/tables/tables.component';
import { IconsComponent } from '../../pages/icons/icons.component';
import { MapsComponent } from '../../pages/maps/maps.component';
import { UsersComponent } from '../../pages/users/users.component';
import { MembersComponent } from './pages/members/members.component'; // ✅ بدل المسار هون
import { TrainersComponent } from './pages/trainers/trainers.component';
import { PlansComponent } from './pages/plans/plans.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { AttendanceComponent } from './pages/attendance/attendance.component';
import { ContactUsComponent } from '../../pages/contact-us/contact-us.component';


// shared components
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
        ContactUsComponent,

    DashboardComponent,
    UserProfileComponent,
    TablesComponent,
    IconsComponent,
    MapsComponent,
    UsersComponent,
    MembersComponent,
    TrainersComponent,
    PlansComponent,
    PaymentsComponent,
    AttendanceComponent,
        MachinesComponent,              // ⬅️ تأكد مضاف

  ],
  imports: [
    CommonModule,
    RouterModule.forChild(AdminLayoutRoutes),
    FormsModule,
    ReactiveFormsModule, // ✅ مهم للنماذج التفاعلية
    NgbModule,
    SharedModule // ✅ يحتوي على جدول GenericTable جاهز
  ]
})
export class AdminLayoutModule {}
