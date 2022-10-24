import { Http, HttpResponse, Observable } from '@nativescript/core';
import { Subject } from 'rxjs';
import CryptoES from 'crypto-es';
import Base64 = CryptoES.enc.Base64;
import sha256 = CryptoES.SHA256;
import { SecureStorage } from '@nativescript/secure-storage';
import { Auth0Config } from './index';

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

  getAccessToken(): Subject<string> {
    return this.accessToken$;
  }

  abstract connect();

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

  protected prepareAuthUrl(verifier): string {
    const challenge: string = Base64.stringify(sha256(verifier)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return 'https://' + this.config.domain + '/authorize?audience=' + this.config.audience + '&' + 'scope=offline_access&' + 'response_type=code&' + 'client_id=' + this.config.clientId + '&' + 'redirect_uri=' + this.config.redirectUri + '&' + 'code_challenge=' + challenge + '&' + 'code_challenge_method=S256';
  }
}
