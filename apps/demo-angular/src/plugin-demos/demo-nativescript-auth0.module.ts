import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule, NativeScriptRouterModule } from '@nativescript/angular';
import { DemoNativescriptAuth0Component } from './demo-nativescript-auth0.component';
import { NativescriptAuth0Module, NativescriptAuth0Service } from '@plantimer/nativescript-auth0/angular';

@NgModule({
  imports: [
    NativeScriptCommonModule,
    NativeScriptRouterModule.forChild([{ path: '', component: DemoNativescriptAuth0Component }]),
    NativescriptAuth0Module.forRoot({
      domain: '', // Domain name given by Auth0 or your own domain if you have a paid plan
      clientId: '',
      audience: '', // Often a URL
      redirectUri: 'schema:///', // The app's schema
    }),
  ],
  declarations: [DemoNativescriptAuth0Component],
  providers: [NativescriptAuth0Service],
  schemas: [NO_ERRORS_SCHEMA],
})
export class DemoNativescriptAuth0Module {}
