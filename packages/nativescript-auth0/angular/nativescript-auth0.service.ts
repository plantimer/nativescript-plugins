import { NativescriptAuth0 } from '@plantimer/nativescript-auth0';
import { Subject } from 'rxjs';
import { environment } from './environment';

export class NativescriptAuth0Service {
  private auth0 = new NativescriptAuth0();

  async connect(): Promise<void> {
    this.auth0.setConfig(environment);
    return await this.auth0.connect();
  }

  async disconnect(): Promise<void> {
    return await this.auth0.disconnect();
  }

  getAccessToken(): Subject<string> {
    this.auth0.setConfig(environment);
    return this.auth0.getAccessToken();
  }
}
