import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TrainerDashboardComponent } from './pages/trainer-dashboard/trainer-dashboard.component';
import { AppComponent } from './app.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { JwtInterceptor } from './core/auth/jwt.interceptor';
import { ComponentsModule } from './components/components.module';
import { AppRoutingModule } from './app.routing';
import { TraineeDashboardComponent } from './pages/trainee-dashboard/trainee-dashboard.component';

@NgModule({
  declarations: [
    TrainerDashboardComponent,
    AppComponent,
    AdminLayoutComponent,
        TraineeDashboardComponent
,
    AuthLayoutComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    NgbModule,
    ComponentsModule,
    AppRoutingModule  // ✅ خليه آخر اشي
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
