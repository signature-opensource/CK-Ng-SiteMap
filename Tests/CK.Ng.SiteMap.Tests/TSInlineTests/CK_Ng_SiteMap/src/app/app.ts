// <HasNgPrivatePage />
import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CKGenAppModule } from '@local/ck-gen/CK/Angular/CKGenAppModule';

import { PrivatePage, NgAuthService } from '@local/ck-gen';
// Private Page is from CK.Ng.Cris.AspNet.Authentication package.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PrivatePage, CKGenAppModule],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.less'
})
export class AppComponent {

readonly #authService = inject( NgAuthService );
isAuthenticated = computed( () => this.#authService.actor().actorId !== 0 );

  title = 'CK_Ng_SiteMap';
}
