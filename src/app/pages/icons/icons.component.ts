import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-icons',
  templateUrl: './icons.component.html',
  styleUrls: ['./icons.component.scss']
})
export class IconsComponent implements OnInit {
  copy: string = '';

  onCopy(val: string) {
    navigator.clipboard.writeText(val).then(() => {
      this.copy = val; // عشان التولتيب يبدّل لـ "Copied"
    }).catch(() => {
      // لو المتصفح منع النسخ لأي سبب، بنظل محافظين على السلوك بدون كراش
    });
  }

  ngOnInit(): void {}
}
