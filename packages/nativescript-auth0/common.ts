import { Http, HttpResponse, Observable, Utils } from '@nativescript/core';
import { Subject } from 'rxjs';
import CryptoES from 'crypto-es';
import { SecureStorage } from '@nativescript/secure-storage';
import { Auth0Config } from './index';
import { InAppBrowser } from 'nativescript-inappbrowser';
import { AuthSessionResult } from 'nativescript-inappbrowser/InAppBrowser.common';
import { ConnectionErrors } from './connection-errors';
import Base64 = CryptoES.enc.Base64;
import sha256 = CryptoES.SHA256;

export abstract class NativescriptAuth0Common extends Observable {
  protected fetchedRefreshToken$ = new Subject<string>();
  private accessToken$ = new Subject<string>();
  protected config: Auth0Config = {
    redirectUri: '',
    domain: '',
    audience: '',
    clientId: '',
    scope: '',
  };
  protected verifier: string = NativescriptAuth0Common.getRandomValues(32);

  constructor() {
    super();

    this.fetchedRefreshToken$.subscribe(async (refreshToken) => {
      const access_token_response: HttpResponse = await Http.request({
        url: 'https://' + this.config.domain + '/oauth/token',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        content: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          refresh_token: refreshToken,
          audience: this.config.audience,
        }),
      });
      this.accessToken$.next(access_token_response.content.toJSON().access_token);
    });
  }

  setConfig(config: Auth0Config): void {
    this.config.redirectUri = config.redirectUri;
    this.config.domain = config.domain;
    this.config.audience = config.audience;
    this.config.clientId = config.clientId;
    this.config.scope = config.scope;
  }

  async connect() {
    const authorizeUrl: string = this.prepareConnectionAuthUrl();

    if (!(await InAppBrowser.isAvailable())) {
      throw ConnectionErrors.unavailableBrowser();
    }

    const refreshToken = await this.openInAppBrowser(authorizeUrl);
    this.fetchedRefreshToken$.next(refreshToken);
  }

  getAccessToken(): Subject<string> {
    return this.accessToken$;
  }

  async disconnect(): Promise<void> {
    const secureStorage = new SecureStorage();
    secureStorage.removeSync({ key: 'refresh_token' });

    try {
      const returnTo = 'demo:///';
      const logout = 'https://' + this.config.domain + '/v2/logout?client_id=' + this.config.clientId;

      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.openAuth(logout, returnTo, {
          // Android Properties
          showTitle: false,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
          forceCloseOnRedirection: true,
        });
      } else {
        Utils.openUrl(logout);
      }

      this.accessToken$.next('');
    } catch (e) {
      console.error('Issue when disconnecting the user', e);
    }
  }

  private async openInAppBrowser(authorizeUrl: string): Promise<string> {
    const response: AuthSessionResult = await InAppBrowser.openAuth(authorizeUrl, this.config.redirectUri);

    if (response.type === 'success' && response.url) {
      // Split the string to obtain the code
      const code = response.url.split('=')[1];
      return await this.fetchRefreshToken(code, this.verifier);
    }

    throw ConnectionErrors.invalidToken();
  }

  protected async fetchRefreshToken(code: string, verifier: string): Promise<string> {
    if (!code || !verifier) {
      console.error('Missing code or verifier');
    }

    const refresh_token_response: HttpResponse = await Http.request({
      url: 'https://' + this.config.domain + '/oauth/token',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      content: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        code: code,
        code_verifier: verifier,
        audience: this.config.audience,
        redirect_uri: this.config.redirectUri,
      }),
    });

    const refreshToken = refresh_token_response.content.toJSON().refresh_token;

    if (refreshToken) {
      const secureStorage = new SecureStorage();
      secureStorage.setSync({ key: 'refresh_token', value: refreshToken });
    }

    return refreshToken;
  }

  protected prepareConnectionAuthUrl(): string {
    const challenge: string = Base64.stringify(sha256(this.verifier)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `https://${this.config.domain}/authorize?audience=${this.config.audience}&scope=offline_access&response_type=code&client_id=${this.config.clientId}&redirect_uri=${this.config.redirectUri}&code_challenge=${challenge}&code_challenge_method=S256`;
  }

  /**
   * Get a random string value
   *
   * @param size between 43 and 128 (default 128)
   */
  protected static getRandomValues(size) {
    size = size >= 43 && size <= 128 ? size : 128;

    let benchStr = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < size; i++) {
      benchStr += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return benchStr;
  }
}
