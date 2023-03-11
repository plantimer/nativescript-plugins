import { InAppBrowserOptions } from 'nativescript-inappbrowser/InAppBrowser.common';
import { NativescriptAuth0Common } from './common';

export type Config = {
  auth0Config: Auth0Config;
  browserConfig?: InAppBrowserOptions;
};

export type Auth0Config = {
  clientId: string;
  domain: string;
  audience: string;
  redirectUri: string;
  scope: string;
};

export const NativescriptAuth0: NativescriptAuth0Common;
