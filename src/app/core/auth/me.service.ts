// src/app/core/auth/me.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment as env } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MeService {
  constructor(private http: HttpClient) {}
  getMe() { return this.http.get<any>(`${env.apiUrl}/auth/me/`); }
}
