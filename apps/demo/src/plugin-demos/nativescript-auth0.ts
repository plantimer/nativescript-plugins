import { EventData, Page } from '@nativescript/core';
import { DemoSharedNativescriptAuth0 } from '@demo/shared';
import { Config, Auth0 } from '@plantimer/nativescript-auth0';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new DemoAuth0ViewModel();
}

export class DemoAuth0ViewModel extends DemoSharedNativescriptAuth0 {
  private config: Config = {
    auth0Config: {
      clientId: '',
      domain: '',
      audience: '',
      redirectUri: '',
    },
  };

  accessToken = '';

  async signUp() {
    const nsAuth0 = new Auth0().setUp(this.config);
    await nsAuth0.signUp();
    this.accessToken = await nsAuth0.getAccessToken();
  }

  async signIn() {
    const nsAuth0 = new Auth0().setUp(this.config);
    await nsAuth0.signIn();
    this.accessToken = await nsAuth0.getAccessToken();
  }

  async getAccessToken() {
    this.accessToken = await new Auth0().setUp(this.config).getAccessToken();
  }

  logOut() {
    new Auth0().setUp(this.config).logOut();
  }

  set clientId(clientId: string) {
    this.config.auth0Config.clientId = clientId;
  }

  set domain(domain: string) {
    this.config.auth0Config.domain = domain;
  }

  set audience(audience: string) {
    this.config.auth0Config.audience = audience;
  }

  set redirectUri(redirectUri: string) {
    this.config.auth0Config.redirectUri = redirectUri;
  }

  logData() {
    console.log('config', this.config);
    console.log('accessToken', this.accessToken);
  }
}
