import { NativescriptAuth0Common } from './common';
import { AppURL, handleOpenURL } from '@bradmartin/nativescript-urlhandler';
import { ApplicationSettings } from '@nativescript/core';
import { InAppBrowser } from 'nativescript-inappbrowser';

export class NativescriptAuth0 extends NativescriptAuth0Common {
  async connect() {
    const verifier: string = NativescriptAuth0Common.getRandomValues(32);
    const authorizeUrl: string = this.prepareAuthUrl(verifier);

    return await this.openInAppBrowser(authorizeUrl, verifier);
  }

  private async openInAppBrowser(authorizeUrl: string, verifier: string) {
    handleOpenURL(async (appURL: AppURL) => {
      // Split the string to obtain the code
      const code = appURL.params.get('code');

      if (code) {
        const verifier = ApplicationSettings.getString('verifier');
        ApplicationSettings.remove('verifier');
        const refreshToken = await this.fetchRefreshToken(code, verifier);
        this.fetchedRefreshToken$.next(refreshToken);
      }
    });

    ApplicationSettings.setString('verifier', verifier);

    const isAvailable: boolean = await InAppBrowser.isAvailable();
    if (!isAvailable) {
      await InAppBrowser.close();
      await InAppBrowser.closeAuth();
    }

    await InAppBrowser.openAuth(authorizeUrl, this.config.redirectUri);
  }
}
