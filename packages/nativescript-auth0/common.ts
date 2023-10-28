import { ApplicationSettings, Http, HttpResponse, isAndroid, Observable, Utils } from '@nativescript/core';
import { SecureStorage } from '@nativescript/secure-storage';
import { InAppBrowser } from 'nativescript-inappbrowser';
import { Subject } from 'rxjs';
import CryptoES from 'crypto-es';
import { AuthSessionResult } from 'nativescript-inappbrowser/InAppBrowser.common';
import Base64 = CryptoES.enc.Base64;
import sha256 = CryptoES.SHA256;
import { Auth0Error } from './auth0-error';
import { Config } from './index';

export class Auth0Common extends Observable {
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

  setTokens(json: string) {
    this.storeRefreshToken(json);
    this.storeAccessToken(json);
  }

  setUp(config: Config) {
    this.config = config;
    this.verifier = Auth0Common.getRandomValues(32);

    if (isAndroid) {
      InAppBrowser.mayLaunchUrl(this.prepareSignInAuthUrl(''), []);
    }

    return this;
  }

  async signIn(loginHint = ''): Promise<boolean> {
    try {
      const code = await this.fetchCodeInAppBrowser(this.prepareSignInAuthUrl(loginHint));
      if (!code) {
        return false;
      }

      await this.fetchRefreshToken(code, this.verifier);
    } catch (e) {
      const secureStorage = new SecureStorage();
      secureStorage.removeSync({ key: '@plantimer/auth0_refresh_token' });
      secureStorage.removeSync({ key: '@plantimer/auth0_access_token' });
      ApplicationSettings.remove('@plantimer/auth0_access_token_expire');

      throw new Auth0Error('Error during sign in', {
        additionalInfo: 'Every token has been deleted from the device.',
        error: e,
      });
    }

    return true;
  }

  async signUp(loginHint = ''): Promise<boolean> {
    const code = await this.fetchCodeInAppBrowser(this.prepareSignUpAuthUrl(loginHint));
    if (!code) {
      return false;
    }

    await this.fetchRefreshToken(code, this.verifier);

    return true;
  }

  async logOut(): Promise<boolean> {
    const secureStorage = new SecureStorage();
    secureStorage.removeSync({ key: '@plantimer/auth0_refresh_token' });
    secureStorage.removeSync({ key: '@plantimer/auth0_access_token' });

    ApplicationSettings.remove('@plantimer/auth0_access_token_expire');

    const returnTo = this.config.auth0Config.redirectUri;
    const logout = 'https://' + this.config.auth0Config.domain + '/v2/logout?client_id=' + this.config.auth0Config.clientId;
    try {
      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.openAuth(logout, returnTo, this.config.browserConfig);
      } else {
        Utils.openUrl(logout);
      }

      this.accessToken$.next('');
    } catch (e) {
      throw new Auth0Error("Failed to get the user's info", {
        logout,
        returnTo,
        error: e,
      });
    }

    return true;
  }

  async getUserInfo(force = false): Promise<object | null> {
    if (ApplicationSettings.hasKey('@plantimer/auth0_user_info') && !force) {
      return JSON.parse(ApplicationSettings.getString('@plantimer/auth0_user_info'));
    }

    const url = 'https://' + this.config.auth0Config.domain + '/userinfo';
    const response: HttpResponse = await Http.request({
      url,
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        Authorization: 'Bearer ' + (await this.getAccessToken()),
      },
    });

    if (response.statusCode !== 200) {
      throw new Auth0Error("Failed to get the user's info", {
        url,
        httpResponseStatusCode: response.statusCode,
        httpResponseBody: response.content,
      });
    }

    const userInfo = response?.content?.toJSON();

    ApplicationSettings.setString('@plantimer/auth0_user_info', JSON.stringify(userInfo));

    return userInfo;
  }

  /**
   * Get or fetch an access token based on the refresh token
   */
  async getAccessToken(force = false): Promise<string | null> {
    const secureStorage = new SecureStorage();

    if (force) {
      secureStorage.removeSync({ key: '@plantimer/auth0_access_token' });
    }

    const tokenExpire = ApplicationSettings.getNumber('@plantimer/auth0_access_token_expire');
    const storedToken = secureStorage.getSync({ key: '@plantimer/auth0_access_token' });
    if (storedToken && tokenExpire && Date.now() <= tokenExpire) {
      return storedToken;
    }

    const accessToken = await this.fetchAccessToken();
    this.accessToken$.next(accessToken);

    return accessToken;
  }

  private async fetchAccessToken(): Promise<string | null> {
    const secureStorage = new SecureStorage();
    const refreshToken = secureStorage.getSync({ key: '@plantimer/auth0_refresh_token' });
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
      const json = response.content.toJSON();

      await Promise.all([this.storeRefreshToken(json), this.storeAccessToken(json)]);

      return json.access_token;
    } catch (e) {
      throw new Auth0Error('Issue when fetching an access token using a refresh token', { error: e });
    }

    return null;
  }

  protected async fetchRefreshToken(code: string, verifier: string): Promise<void> {
    if (!code || !verifier) {
      throw new Auth0Error('Missing code or verifier', {});
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
    secureStorage.setSync({ key: '@plantimer/auth0_access_token', value: accessToken });

    const expireDate = new Date();
    expireDate.setSeconds(expireDate.getSeconds() + expireSeconds);
    ApplicationSettings.setNumber('@plantimer/auth0_access_token_expire', expireDate.getTime());

    return accessToken;
  }

  private storeRefreshToken(json): string {
    const refreshToken = json.refresh_token;
    if (!refreshToken) {
      return;
    }

    const secureStorage = new SecureStorage();
    secureStorage.setSync({ key: '@plantimer/auth0_refresh_token', value: refreshToken });

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

  private async fetchCodeInAppBrowser(authorizeUrl: string): Promise<string | false> {
    const response: AuthSessionResult = await InAppBrowser.openAuth(authorizeUrl, this.config.auth0Config.redirectUri);

    if (response.type === 'success' && response.url) {
      // Split the string to obtain the code or the access token
      return response.url.split('=')[1];
    }

    return false;
  }
}
