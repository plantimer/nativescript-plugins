import { Component } from '@angular/core';
import { NativescriptAuth0Service } from '@plantimer/nativescript-auth0/angular';

@Component({
  selector: 'demo-nativescript-auth0',
  templateUrl: 'demo-nativescript-auth0.component.html',
  styleUrls: ['demo-nativescript-auth0.component.css'],
})
export class DemoNativescriptAuth0Component {
  connected = false;

  constructor(private auth0: NativescriptAuth0Service) {
    auth0.getAccessToken().subscribe((token) => {
      this.connected = !!token;
    });
  }

  async connect(): Promise<void> {
    await this.auth0.connect();
  }

  async disconnect(): Promise<void> {
    await this.auth0.disconnect();
  }
}
