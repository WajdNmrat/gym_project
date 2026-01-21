import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

declare interface RouteInfo {
  path: string;
  title: string;
  icon: string;
  class: string;
  roles?: string[]; // فلترة حسب الدور
}

export const ROUTES: RouteInfo[] = [
  { path: '/dashboard',          title: 'Dashboard',      icon: 'ni-tv-2 text-primary',     class: '', roles: ['admin'] },
  { path: '/trainer-dashboard',  title: 'لوحة المدرّب',   icon: 'ni-badge text-purple',     class: '', roles: ['trainer'] },
  { path: '/trainee-dashboard',  title: 'لوحة المتدرّب',  icon: 'ni-hat-3 text-info',       class: '', roles: ['trainee'] },

  { path: '/members',            title: 'المشتركين',      icon: 'ni-single-02 text-green',  class: '', roles: ['admin'] },
  { path: '/trainers',           title: 'المدربين',       icon: 'ni-badge text-purple',     class: '', roles: ['admin'] },
  { path: '/plans',              title: 'الخطط',          icon: 'ni-collection text-info',  class: '', roles: ['admin','trainer'] },
  { path: '/user-profile',       title: 'الملف الشخصي',   icon: 'ni-single-02 text-yellow', class: '' },
  { path: '/maps',               title: 'الخرائط',        icon: 'ni-pin-3 text-orange',     class: '' },
  { path: '/register',           title: 'Register',       icon: 'ni-circle-08 text-pink',   class: '', roles: ['admin'] }
];


@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  public menuItems: RouteInfo[] = [];
  public isCollapsed = true;
  role = localStorage.getItem('gym_role'); // 'admin' | 'trainer' | 'trainee'

  constructor(private router: Router) {}

  ngOnInit() {
    // فلترة العناصر حسب الدور
    this.menuItems = ROUTES.filter(item => !item.roles || item.roles.includes(this.role || ''));
    this.router.events.subscribe(() => { this.isCollapsed = true; });
  }
}
