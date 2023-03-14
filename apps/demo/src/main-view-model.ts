import { Frame, Observable } from '@nativescript/core';

export class MainViewModel extends Observable {
  viewAuth0Demo() {
    Frame.topmost().navigate({
      moduleName: 'plugin-demos/nativescript-auth0',
    });
  }
}
