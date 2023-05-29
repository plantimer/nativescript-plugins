import { ApplicationSettings, Http, HttpResponse, isAndroid, Utils } from '@nativescript/core';
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
  private config: Config;
  protected verifier: string;
  accessToken$ = new Subject<string>();

  /**
   * Get a random string value
   *
   * @param size between 43 and 128 (default 128)
   */
  private static getRandomValues(size) {
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
    this.verifier = NativescriptAuth0Common.getRandomValues(32);

    if (isAndroid) {
      InAppBrowser.mayLaunchUrl(this.prepareSignInAuthUrl(''), []);
    }

    return this;
  }

  async signIn(loginHint = '') {
    try {
      const code = await this.fetchCodeInAppBrowser(this.prepareSignInAuthUrl(loginHint));
      await this.fetchRefreshToken(code, this.verifier);
    } catch (e) {
      console.error('Error during signIn', e);
      const secureStorage = new SecureStorage();
      secureStorage.removeSync({ key: 'refresh_token' });
      secureStorage.removeSync({ key: 'access_token' });
      ApplicationSettings.remove('access_token_expire');

      return e;
    }
  }

  async signUp(loginHint = '') {
    const code = await this.fetchCodeInAppBrowser(this.prepareSignUpAuthUrl(loginHint));
    await this.fetchRefreshToken(code, this.verifier);
  }

  async logOut(): Promise<void> {
    const secureStorage = new SecureStorage();
    secureStorage.removeSync({ key: 'refresh_token' });
    secureStorage.removeSync({ key: 'access_token' });

    ApplicationSettings.remove('access_token_expire');

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

  async getUserInfo(): Promise<object | null> {
    const response: HttpResponse = await Http.request({
      url: 'https://' + this.config.auth0Config.domain + '/userinfo',
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        Authorization: 'Bearer ' + (await this.getAccessToken()),
      },
    });

    if (response.statusCode !== 200) {
      console.error('[' + response.statusCode + '] ' + response.content);
      throw new Error('[getUserInfo] Unauthorized token');
    }

    return response?.content?.toJSON();
  }

  /**
   * Get or fetch an access token based on the refresh token
   */
  async getAccessToken(force = false): Promise<string | null> {
    const secureStorage = new SecureStorage();

    if (force) {
      secureStorage.removeSync({ key: 'access_token' });
    }

    const tokenExpire = ApplicationSettings.getNumber('access_token_expire');
    const storedToken = secureStorage.getSync({ key: 'access_token' });
    if (storedToken && tokenExpire && Date.now() <= tokenExpire) {
      return storedToken;
    }

    const accessToken = await this.fetchAccessToken();
    this.accessToken$.next(accessToken);

    return accessToken;
  }

  private async fetchAccessToken(): Promise<string | null> {
    const secureStorage = new SecureStorage();
    const refreshToken = secureStorage.getSync({ key: 'refresh_token' });
    if (!refreshToken) {
      return null;
    }

    try {
      const response: HttpResponse = await Http.request({
        url: 'https://' + this.config.auth0Config.domain + '/oauth/token',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        content: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: this.config.auth0Config.clientId,
          refresh_token: refreshToken,
        }),
      });

      return this.storeAccessToken(response.content.toJSON());
    } catch (e) {
      console.error('Issue when fetching an access token using a refresh token');
      console.error(e);
    }

    return null;
  }

  protected async fetchRefreshToken(code: string, verifier: string): Promise<void> {
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

    const json = refresh_token_response.content.toJSON();
    this.storeRefreshToken(json);
    this.storeAccessToken(json);
  }

  private storeAccessToken(json): string | null {
    const accessToken = json?.access_token;
    if (!accessToken) {
      return null;
    }

    const expireSeconds = json.expires_in;

    const secureStorage = new SecureStorage();
    secureStorage.setSync({ key: 'access_token', value: accessToken });

    const expireDate = new Date();
    expireDate.setSeconds(expireDate.getSeconds() + expireSeconds);
    ApplicationSettings.setNumber('access_token_expire', expireDate.getTime());

    return accessToken;
  }

  private storeRefreshToken(json): string {
    const refreshToken = json.refresh_token;
    if (!refreshToken) {
      throw new Error('Missing refresh token');
    }
    const secureStorage = new SecureStorage();
    secureStorage.setSync({ key: 'refresh_token', value: refreshToken });

    return refreshToken;
  }

  private prepareSignUpAuthUrl(loginHint: string): string {
    const challenge: string = Base64.stringify(sha256(this.verifier)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `https://${this.config.auth0Config.domain}/authorize?audience=${this.config.auth0Config.audience}&scope=offline_access%20openid%20profile&response_type=code&client_id=${this.config.auth0Config.clientId}&redirect_uri=${this.config.auth0Config.redirectUri}&code_challenge=${challenge}&code_challenge_method=S256&login_hint=${loginHint}&screen_hint=signup`;
  }

  private prepareSignInAuthUrl(loginHint): string {
    const challenge: string = Base64.stringify(sha256(this.verifier)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `https://${this.config.auth0Config.domain}/authorize?audience=${this.config.auth0Config.audience}&scope=offline_access%20openid%20profile&response_type=code&client_id=${this.config.auth0Config.clientId}&redirect_uri=${this.config.auth0Config.redirectUri}&code_challenge=${challenge}&code_challenge_method=S256&login_hint=${loginHint}`;
  }

  private async fetchCodeInAppBrowser(authorizeUrl: string): Promise<string> {
    const response: AuthSessionResult = await InAppBrowser.openAuth(authorizeUrl, this.config.auth0Config.redirectUri);

    if (response.type === 'success' && response.url) {
      // Split the string to obtain the code or the access token
      return response.url.split('=')[1];
    }

    throw ConnectionErrors.invalidToken();
  }
}
