import { Component, NgZone } from '@angular/core';
import { DemoSharedAuth0 } from '@demo/shared';

@Component({
  selector: 'demo-auth0',
  templateUrl: 'auth0.component.html',
})
export class Auth0Component {
  demoShared: DemoSharedAuth0;

  constructor() {}

  ngOnInit() {
    this.demoShared = new DemoSharedAuth0();
  }
}
