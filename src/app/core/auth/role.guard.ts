import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowed: string[] = (route.data?.['roles'] || []).map((x: string) => x.toLowerCase());
    const current = (localStorage.getItem('gym_role') || 'trainee').toLowerCase();
    if (allowed.length === 0 || allowed.includes(current)) return true;
    this.router.navigate(['/dashboard']);
    return false;
  }

}
