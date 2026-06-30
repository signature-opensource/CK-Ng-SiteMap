import { DestroyRef, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { BreadcrumbItem } from '../Zorro/breadcrumb/breadcrumb-item-model';
import { NavigationEnd, Route, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IRouteListener } from './RouteListener';

/** This type is synchronized with the same in CK.Ng.SiteMap. */
type RichRoute = Route & {
    pageTitle: string | null;
    children?: RichRoute[];
};

function isRichRoute(r: Route): r is RichRoute {
    return (<any>r)["pageTitle"] !== undefined;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService implements IRouteListener {

    readonly #router = inject(Router);
    readonly #destroyRef = inject(DestroyRef);

    readonly #breadcrumb: WritableSignal<BreadcrumbItem[]> = signal([]);
    readonly breadcrumb: Signal<readonly BreadcrumbItem[]> = this.#breadcrumb.asReadonly();

    constructor() {
        this.#router.events
            .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.#destroyRef))
            .subscribe(e => {
                let url = e.urlAfterRedirects;
                if (url.startsWith('/')) {
                    url = url.slice(1);
                }
                const path = url.split('/');
                // TODO: Compute current breadcrumb path
            });
    }

    public updateFromRouter(): void {
        const routes = this.#router.config;
        // TODO: Update Breadcrumb
    }
}
