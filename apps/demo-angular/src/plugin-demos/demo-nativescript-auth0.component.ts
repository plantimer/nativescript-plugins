import { Component, NgZone } from '@angular/core';
import { DemoSharedNativescriptAuth0 } from '@demo/shared';
import { NativescriptAuth0Service } from '@plantimer/nativescript-auth0/angular';

@Component({
  selector: 'demo-nativescript-auth0',
  templateUrl: 'demo-nativescript-auth0.component.html',
})
export class DemoNativescriptAuth0Component {
  demoShared: DemoSharedNativescriptAuth0;

  constructor(private _ngZone: NgZone, private auth0: NativescriptAuth0Service) {}

  async ngOnInit() {
    this.demoShared = new DemoSharedNativescriptAuth0();
    await this.auth0.connect();
  }
}
