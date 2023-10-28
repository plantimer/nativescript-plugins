import { Auth0Common } from './common';
import { InAppBrowserOptions } from 'nativescript-inappbrowser/InAppBrowser.common';

export type Config = {
  auth0Config: Auth0Config;
  browserConfig?: InAppBrowserOptions;
};

export type Auth0Config = {
  clientId: string;
  domain: string;
  audience: string;
  redirectUri: string;
  scope?: string;
};

export declare class Auth0 extends Auth0Common {}

export * from './auth0-error';
