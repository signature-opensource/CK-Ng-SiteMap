// <HasNgPrivatePage />
import { Component, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CKGenAppModule } from '@local/ck-gen/CK/Angular/CKGenAppModule';
import { CommonModule } from '@angular/common';
import { PrivatePage, NgAuthService } from '@local/ck-gen';
// Private Page is from CK.Ng.Cris.AspNet.Authentication package.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, PrivatePage, CKGenAppModule],
  templateUrl: './app.html',
  styleUrl: './app.less'
})
export class AppComponent {

readonly #authService = inject( NgAuthService );
isAuthenticated = computed( () => this.#authService.actor().actorId !== 0 );

  title = 'CK_Ng_SiteMap';
}
