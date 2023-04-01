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
  scope?: string;
};

export declare class NativeScriptAuth0 extends NativescriptAuth0Common {}
