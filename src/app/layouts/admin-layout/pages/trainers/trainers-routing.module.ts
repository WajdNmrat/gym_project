// src/app/layouts/admin-layout/pages/trainers/trainers-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TrainersComponent } from './trainers.component';
import { TrainerDetailsComponent } from './trainer-details.component';

const routes: Routes = [
  { path: '', component: TrainersComponent },
  { path: ':id', component: TrainerDetailsComponent } // تفاصيل المدرّب
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TrainersRoutingModule {}
