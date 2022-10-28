import { NativescriptAuth0Common } from './common';
import { Subject } from 'rxjs';

export declare class NativescriptAuth0 extends NativescriptAuth0Common {
  getAccessToken(): Subject<string>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export type Auth0Config = {
  clientId: string;
  domain: string;
  audience: string;
  redirectUri: string;
  scope: string;
};
