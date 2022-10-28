import { NativescriptAuth0Common } from './common';
import { InAppBrowser } from 'nativescript-inappbrowser';

export class NativescriptAuth0 extends NativescriptAuth0Common {
  constructor() {
    super();
    InAppBrowser.mayLaunchUrl(this.prepareConnectionAuthUrl(), []);
  }
}
