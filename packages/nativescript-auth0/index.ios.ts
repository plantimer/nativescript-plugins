import { NativescriptAuth0Common } from './common';
import { AuthSessionResult } from 'nativescript-inappbrowser/InAppBrowser.common';
import { InAppBrowser } from 'nativescript-inappbrowser';
import { ConnectionErrors } from './connection-errors';

export class NativescriptAuth0 extends NativescriptAuth0Common {
  async connect() {
    const verifier: string = NativescriptAuth0Common.getRandomValues(32);
    const authorizeUrl: string = this.prepareAuthUrl(verifier);

    const refreshToken = await this.openInAppBrowser(authorizeUrl, verifier);
    this.fetchedRefreshToken$.next(refreshToken);
  }

  private async openInAppBrowser(authorizeUrl: string, verifier: string): Promise<string> {
    const response: AuthSessionResult = await InAppBrowser.openAuth(authorizeUrl, this.config.redirectUri);

    if (response.type === 'success' && response.url) {
      // Split the string to obtain the code
      const code = response.url.split('=')[1];
      return await this.fetchRefreshToken(code, verifier);
    } else {
      throw ConnectionErrors.invalidToken();
    }
  }
}
