import { Component } from '@angular/core';

@Component({
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss']
})
export class ContactUsComponent {
  // محتوى ثابت حسب طلبك
  club = {
    name: 'GYM Club',
    address: 'Nazareth – بجانب العالمية للعطور الفرنسية',
    hours: [
      { days: 'الإثنين – الخميس', time: '08:00 صباحًا – 10:00 مساءً' },
    ],
    phone: '0412345',
    email: 'wajd@gmail.com',
    mapUrl: 'https://maps.google.com/?q=Nazareth'
  };
}
