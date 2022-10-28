# @plantimer/nativescript-auth0

Packages are published to github.com under the `@plantimer` scope so you may need an extra step to login.
```bash
npm login --scope=@plantimer --registry=https://npm.pkg.github.com

npm install @plantimer/nativescript-auth0
```

## How does it work 
The only workflow currently supported is the [Authorization Code Grant with PKCE](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce) with a refresh token.

**This will not work if you haven't enabled the refresh token setting !**

Following the diagram given in the Auth0 docs, the flow is as follows:
- The user is redirected to the Auth0 login page with a PKCE challenge
- The user logs in and is redirected back to the app with an access code
- The stores the refresh token fetched using the access code, the PKCE challenge and the PKCE verifier
- The app fetches the access token using the refresh token

## Usage
This plugin uses the [InAppBrowser](https://github.com/proyecto26/nativescript-inappbrowser) plugin to open the Auth0 login page and the [NativeScript Secure Storage](https://github.com/EddyVerbruggen/nativescript-secure-storage) plugin to store tokens.

### Vanilla
```js
import { Auth0 } from '@plantimer/nativescript-auth0';

const auth0 = new Auth0({
  clientId: 'YOUR_CLIENT_ID',
  domain: 'YOUR_DOMAIN',
  redirectUri: 'YOUR_REDIRECT_URI',
  scope: 'openid profile email',
});

auth0.getAccessToken().subscribe((accessToken) => {
  // Do something with the access token (meaning you are logged in)
});

await auth0.connect();
```

### Angular
```typescript
// *.module.ts
import { NativescriptAuth0Module, NativescriptAuth0Service } from '@plantimer/nativescript-auth0/angular';

@NgModule({
  imports: [
    NativescriptAuth0Module.forRoot({ // Import the module
      domain: "mydomain.auth0.com", // Domain name given by Auth0 or your own domain if you have a paid plan
      clientId: 'ClIenTiDgIvEnByAuTh0', // Client ID given by Auth0
      audience: 'https://your.audience.com', // Often a URL
      redirectUri: 'schema:///', // The app's schema (set in AndroidManifest.xml and Info.plist)
    }),
    // ...
  ],
  providers: [
    NativescriptAuth0Service, // Provide the service
    // ...
  ],
  declarations: [
    AppComponent,
    // ...
  ],
  // ...
})
export class YourModule {}
```

```typescript
// *.component.ts
import { NativescriptAuth0Service } from '@plantimer/nativescript-auth0/angular';

@Component({
  selector: 'ns-app',
  template: '<Button (tap)="login()">Login</Button>',
})
export class AppComponent {
  constructor(private auth0: NativescriptAuth0Service) {
    this.auth0.getAccessToken().subscribe((accessToken) => {
      // Do something with the access token (meaning you are logged in)
    });
  }

  login() {
    this.auth0.connect();
  }
}
```

### Enable deep linking
Deep linking is the ability for the app to open when a link is clicked. This is required for the redirectUri to work.

Please follow the [InAppBrowser documentation](https://github.com/proyecto26/nativescript-inappbrowser#authentication-flow-using-deep-linking) to enable deep linking (i.e. set the schema).

## Ideas and issues
If you have any ideas, issues or security concerns, please open an issue !

## License
This repository is available under the [MIT License](https://github.com/plantimer/nativescript-plugins/blob/main/LICENSE).
