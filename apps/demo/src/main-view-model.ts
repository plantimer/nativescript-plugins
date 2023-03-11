import { Frame, Observable } from '@nativescript/core';
import { NativescriptAuth0 } from '@plantimer/nativescript-auth0';

const environement = {
  clientId: '',
  domain: '',
  audience: '',
  redirectUri: '',
  scope: '',
};

export class MainViewModel extends Observable {
  viewDemo(args) {
    Frame.topmost().navigate({
      moduleName: `plugin-demos/${args.object.text}`,
    });
  }

  signUp() {
    NativescriptAuth0.setUp({ auth0Config: environement }).signUp();
  }
}
