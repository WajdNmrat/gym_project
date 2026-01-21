import { Component, OnInit, TemplateRef } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { MachinesService } from '../../../../core/services/machines.service';
import { Machine } from '../../../../core/models/api.models';

@Component({
  selector: 'app-machines',
  templateUrl: './machines.component.html',
  styleUrls: ['./machines.component.scss']
})
export class MachinesComponent implements OnInit {
  loading = false;
  saving = false;
  q = '';
  idFilter: number | null = null;
  activeFilter: 'all' | 'active' | 'inactive' = 'all';

  rows: Machine[] = [];
  modalRef?: NgbModalRef;

  editMode = false;
  editingId: number | null = null;

  form = {
    code: '',
    name: '',
    description: '',
    is_active: true
  };

  cols = [
    { key: 'code',       label: 'الكود' },
    { key: 'name',       label: 'الاسم' },
    { key: 'description',label: 'الشرح' },
    { key: 'is_active',  label: 'Active' },
  ];

  constructor(private api: MachinesService, private modal: NgbModal) {}

  ngOnInit(): void {
    this.load();
  }

  load(page: number = 1) {
    this.loading = true;
    this.api.list({
      page,
      page_size: 100,
      search: this.q || undefined,
      id: this.idFilter || undefined,
      is_active:
        this.activeFilter === 'all' ? undefined : this.activeFilter === 'active'
    }).subscribe({
      next: (res) => { this.rows = res.results || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openAdd(tpl: TemplateRef<any>) {
    this.editMode = false;
    this.editingId = null;
    this.form = { code: '', name: '', description: '', is_active: true };
    this.modalRef = this.modal.open(tpl, { centered: true, size: 'lg' });
  }

  openEdit(row: Machine, tpl: TemplateRef<any>) {
    this.editMode = true;
    this.editingId = row.id;
    this.form = {
      code: row.code,
      name: row.name,
      description: row.description || '',
      is_active: row.is_active
    };
    this.modalRef = this.modal.open(tpl, { centered: true, size: 'lg' });
  }

  save() {
    if (!this.form.code.trim() || !this.form.name.trim()) return;
    if (this.saving) return;
    this.saving = true;

    const payload = {
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      description: this.form.description?.trim() || '',
      is_active: !!this.form.is_active
    };

    const req = this.editMode && this.editingId
      ? this.api.update(this.editingId, payload)
      : this.api.create(payload);

    req.subscribe({
      next: _ => { this.modalRef?.close(); this.saving = false; this.load(); },
      error: _ => { this.saving = false; }
    });
  }

  toggleActive(row: Machine) {
    this.api.patch(row.id, { is_active: !row.is_active }).subscribe({
      next: (m) => { row.is_active = m.is_active; },
      error: () => {}
    });
  }

  remove(row: Machine) {
    if (!confirm('حذف الجهاز؟')) return;
    this.api.remove(row.id).subscribe(() => this.load());
  }
}
