import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CKGenAppModule } from '@local/ck-gen/CK/Angular/CKGenAppModule';
import { Breadcrumb, SiteMapProvider } from '@local/ck-gen';
import { JsonPipe } from '@angular/common';

@Component( {
  selector: 'app-root',
  imports: [RouterOutlet, CKGenAppModule, JsonPipe, Breadcrumb],
  templateUrl: './app.html',
  styleUrl: './app.less'
} )
export class App {
  readonly #siteMap = inject( SiteMapProvider );

  homePagePath = computed( () => this.#siteMap.homePagePath() );

  breadcrumbItems = computed( () => this.#siteMap.breadcrumbItems() );
  test2 = computed( () => this.#siteMap.preferredPages() );

  constructor() {

  }
}
