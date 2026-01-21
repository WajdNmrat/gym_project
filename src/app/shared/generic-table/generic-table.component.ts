// src/app/shared/generic-table/generic-table.component.ts
import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';

export interface TableCol { key: string; label: string; }

@Component({
  selector: 'app-generic-table',
  templateUrl: './generic-table.component.html'
})
export class GenericTableComponent {
  @Input() cols: TableCol[] = [];
  @Input() rows: any[] = [];
  @Input() loading = false;

  // عمود قابل للنقر (مثلاً 'username')
  @Input() clickableKey?: string;

  // (اختياري) قالب إجراءات مخصّص للعمود الأخير
  @Input() actionsTpl?: TemplateRef<any>;

  @Output() edit = new EventEmitter<any>();
  @Output() remove = new EventEmitter<any>();
  @Output() rowClick = new EventEmitter<any>();

  onEdit(r: any) { this.edit.emit(r); }
  onRemove(r: any) { this.remove.emit(r); }
  onRowClick(r: any) { this.rowClick.emit(r); }
}
