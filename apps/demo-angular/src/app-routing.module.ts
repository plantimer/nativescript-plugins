import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptRouterModule } from '@nativescript/angular';

import { HomeComponent } from './home.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  {
    path: 'nativescript-auth0',
    loadChildren: () => import('./plugin-demos/demo-nativescript-auth0.module').then((m) => m.DemoNativescriptAuth0Module),
  },
];

@NgModule({
  imports: [NativeScriptRouterModule.forRoot(routes)],
  exports: [NativeScriptRouterModule],
  providers: [],
})
export class AppRoutingModule {}
