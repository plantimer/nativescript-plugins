import { ModuleWithProviders, NgModule } from '@angular/core';
import { Auth0Config } from '@plantimer/nativescript-auth0';
import { environment } from './environment';

@NgModule()
export class NativescriptAuth0Module {
  static forRoot(config: Auth0Config): ModuleWithProviders<NativescriptAuth0Module> {
    environment.audience = config.audience;
    environment.clientId = config.clientId;
    environment.domain = config.domain;
    environment.redirectUri = config.redirectUri;
    environment.scope = config.scope;

    return {
      ngModule: NativescriptAuth0Module,
    };
  }
}
