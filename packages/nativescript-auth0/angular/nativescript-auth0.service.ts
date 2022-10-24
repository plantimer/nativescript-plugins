import { NativescriptAuth0 } from '@plantimer/nativescript-auth0';
import { Subject } from 'rxjs';
import { environment } from './environment';

export class NativescriptAuth0Service {
  private auth0 = new NativescriptAuth0();

  async connect() {
    this.auth0.setConfig(environment);
    return await this.auth0.connect();
  }

  getAccessToken(): Subject<string> {
    this.auth0.setConfig(environment);
    return this.auth0.getAccessToken();
  }
}
