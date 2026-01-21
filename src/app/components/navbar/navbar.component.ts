// src/app/components/navbar/navbar.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  public role = 'trainee';
  public username = '';
  private handler = () => this.refreshName();

  constructor(
    private router: Router,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.role = (localStorage.getItem('gym_role') || 'trainee').toLowerCase();
    this.refreshName();
    // يحدّث الاسم بعد حفظ الـProfile (باقية زي ما هي)
    window.addEventListener('profile:saved', this.handler as EventListener);
  }

  ngOnDestroy() {
    window.removeEventListener('profile:saved', this.handler as EventListener);
  }

  private refreshName() {
    // ✅ اقرأ المفتاحين لدعم الحالتين (قديم وجديد)
    this.username =
      localStorage.getItem('gym_username') ||   // ما يتم حفظه بعد الـlogin
      localStorage.getItem('gym_user') ||       // توافق مع حفظ من صفحة الـProfile
      '';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
