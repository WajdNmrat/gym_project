// src/app/app.routing.ts
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { AuthGuard } from './core/auth/auth.guard';

const routes: Routes = [
  // ✅ أول ما يفتح الموقع يحوّله على صفحة login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // ✅ مسارات تسجيل الدخول والتصديق (عام - بدون حماية)
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./layouts/auth-layout/auth-layout.module')
            .then(m => m.AuthLayoutModule)
      }
    ]
  },

  // ✅ مسارات لوحة التحكم (Dashboard) محمية بالـ AuthGuard
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],   // ✅ حماية هنا فقط
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./layouts/admin-layout/admin-layout.module')
            .then(m => m.AdminLayoutModule)
      }
    ]
  },

  // ✅ أي مسار غلط يرجعه على dashboard بعد تسجيل الدخول
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { useHash: true })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
