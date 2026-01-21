import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// لو الجدول داخل هذا المسار
import { GenericTableComponent } from './generic-table/generic-table.component';

@NgModule({
  declarations: [
    GenericTableComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    GenericTableComponent  // ✅ مهم: نُصدر الكومبوننت لباقي الموديولات
  ]
})
export class SharedModule {}
