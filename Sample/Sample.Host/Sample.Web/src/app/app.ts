import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CKGenAppModule } from '@local/ck-gen/CK/Angular/CKGenAppModule';
import { Breadcrumb, BreadcrumbService, SiteMapProvider } from '@local/ck-gen';

@Component( {
  selector: 'app-root',
  imports: [RouterOutlet, CKGenAppModule, Breadcrumb],
  templateUrl: './app.html',
  styleUrl: './app.less'
} )
export class App {
  readonly #siteMap = inject( SiteMapProvider );
  readonly #breadcrumb = inject( BreadcrumbService );

  homePagePath = computed( () => this.#siteMap.homePagePath() );

  breadcrumbItems = computed( () => [...this.#breadcrumb.breadcrumb()] );
  preferredPage = computed( () => this.#siteMap.preferredPages() );

  constructor() {

  }
}
