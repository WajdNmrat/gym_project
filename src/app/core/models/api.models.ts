// src/app/core/models/api.models.ts
export type Role = 'admin' | 'trainer' | 'trainee';

export interface User {
  id: number;
  username: string;
  role: Role;
  is_active: boolean;

  // ✅ نخليهم اختياريين لأنهم أحياناً null بالباك
  first_name?: string;
  last_name?: string;

  // ✅ هذا طبيعي يكون optional
  email?: string;

  // ✅ ID المدرب (للمتدرّبين فقط)
  trainer?: number | null;
}

export interface Machine {
  id: number;
  name: string;
  description?: string;
}
// src/app/core/models/api.models.ts  (فقط Machine)
export interface Machine {
  id: number;
  code: string;         // جديد
  name: string;
  description?: string;
  is_active: boolean;   // جديد
}

export interface Plan {
  id: number;
  user: number;            // trainee id
  title: string;
  description?: string;
  days_per_week: number;
  sets: number;
  reps: number;
  duration_minutes: number;
  machines: number[];      // IDs
  is_active: boolean;

  // 👇 جديد
  days_of_week?: number[]; // 0=Sunday .. 6=Saturday
}

