import { Http, HttpResponse, Utils } from '@nativescript/core';
import { Subject } from 'rxjs';
import CryptoES from 'crypto-es';
import { SecureStorage } from '@nativescript/secure-storage';
import { InAppBrowser } from 'nativescript-inappbrowser';
import { AuthSessionResult } from 'nativescript-inappbrowser/InAppBrowser.common';
import { ConnectionErrors } from './connection-errors';
import { Config } from './index';
import Base64 = CryptoES.enc.Base64;
import sha256 = CryptoES.SHA256;

export class NativescriptAuth0Common {
  protected fetchedRefreshToken$ = new Subject<string>();
  protected verifier: string = NativescriptAuth0Common.getRandomValues(32);
  private accessToken$ = new Subject<string>();
  private config: Config;

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

  setUp(config: Config) {
    this.config = config;

    this.fetchedRefreshToken$.subscribe(async (refreshToken) => {
      const access_token_response: HttpResponse = await Http.request({
        url: 'https://' + this.config.auth0Config.domain + '/oauth/token',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        content: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: this.config.auth0Config.clientId,
          refresh_token: refreshToken,
          audience: this.config.auth0Config.audience,
        }),
      });
      this.accessToken$.next(access_token_response.content.toJSON().access_token);
    });

    InAppBrowser.mayLaunchUrl(this.prepareSignInAuthUrl(), []);

    return this;
  }

  async signIn() {
    const authorizeUrl: string = this.prepareSignInAuthUrl();

    if (!(await InAppBrowser.isAvailable())) {
      throw ConnectionErrors.unavailableBrowser();
    }

    const code = await this.openInAppBrowser(authorizeUrl);
    const refreshToken = await this.fetchRefreshToken(code, this.verifier);
    this.fetchedRefreshToken$.next(refreshToken);
  }

  async signUp(loginHint = '') {
    const authorizeUrl: string = this.prepareSignUpAuthUrl(loginHint);

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
      const returnTo = this.config.auth0Config.redirectUri;
      const logout = 'https://' + this.config.auth0Config.domain + '/v2/logout?client_id=' + this.config.auth0Config.clientId;

      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.openAuth(logout, returnTo, this.config.browserConfig);
      } else {
        Utils.openUrl(logout);
      }

      this.accessToken$.next('');
    } catch (e) {
      console.error('Issue when disconnecting the user', e);
    }
  }

  protected async fetchRefreshToken(code: string, verifier: string): Promise<string> {
    if (!code || !verifier) {
      console.error('Missing code or verifier');
    }

    const refresh_token_response: HttpResponse = await Http.request({
      url: 'https://' + this.config.auth0Config.domain + '/oauth/token',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      content: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.config.auth0Config.clientId,
        code: code,
        code_verifier: verifier,
        audience: this.config.auth0Config.audience,
        redirect_uri: this.config.auth0Config.redirectUri,
      }),
    });

    const refreshToken = refresh_token_response.content.toJSON().refresh_token;

    if (refreshToken) {
      const secureStorage = new SecureStorage();
      secureStorage.setSync({ key: 'refresh_token', value: refreshToken });
    }

    return refreshToken;
  }

  protected prepareSignInAuthUrl(): string {
    const challenge: string = Base64.stringify(sha256(this.verifier)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `https://${this.config.auth0Config.domain}/authorize?audience=${this.config.auth0Config.audience}&scope=offline_access&response_type=code&client_id=${this.config.auth0Config.clientId}&redirect_uri=${this.config.auth0Config.redirectUri}&code_challenge=${challenge}&code_challenge_method=S256`;
  }

  private async openInAppBrowser(authorizeUrl: string): Promise<string> {
    const response: AuthSessionResult = await InAppBrowser.openAuth(authorizeUrl, this.config.auth0Config.redirectUri);

    if (response.type === 'success' && response.url) {
      // Split the string to obtain the code
      return response.url.split('=')[1];
    }

    throw ConnectionErrors.invalidToken();
  }

  private prepareSignUpAuthUrl(loginHint: string): string {
    return `https://${this.config.auth0Config.domain}/authorize?audience=${this.config.auth0Config.audience}&response_type=token&client_id=${this.config.auth0Config.clientId}&redirect_uri=${this.config.auth0Config.redirectUri}&nonce=${Math.floor(Math.random() * 1000)}&screen_hint=signup&login_hint=${loginHint}`;
  }
}
