import { DestroyRef, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { BreadcrumbItem } from '../Zorro/breadcrumb/breadcrumb-item-model';
import { NavigationEnd, Route, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IRouteListener } from './RouteListener';
import { faHome } from '@fortawesome/free-solid-svg-icons';

/** This type is synchronized with the same in CK.Ng.SiteMap. */
type RichRoute = Route & {
    pageTitle: string | null;
    children?: RichRoute[];
};

function isRichRoute(r: Route): r is RichRoute {
    return (<any>r)["pageTitle"] !== undefined;
}

function getRootBreadcrumb(): BreadcrumbItem {
    return {
        name: '',
        icon: faHome,
        disabled: true
    };
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService implements IRouteListener {

    readonly #router = inject(Router);
    readonly #destroyRef = inject(DestroyRef);

    #fullBreadcrumb: BreadcrumbItem;
    readonly #breadcrumb: WritableSignal<BreadcrumbItem[]> = signal([]);
    readonly breadcrumb: Signal<readonly BreadcrumbItem[]> = this.#breadcrumb.asReadonly();

    constructor() {

        this.#fullBreadcrumb = this.#buildFullBreadcrumb(this.#router.config);

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
        this.#fullBreadcrumb = this.#buildFullBreadcrumb(routes);
    }

    #buildFullBreadcrumb(routes: Route[]): BreadcrumbItem {

        const root = getRootBreadcrumb();

        for (const route of routes) {

            if (route.path === '**') continue;

            for (const childItem of this.#buildBreadcrumb(route)) {
                if (childItem) {
                    root.children ??= [];
                    root.children.push(childItem);
                }
            }
        }

        // Format

        return root;
    }

    *#buildBreadcrumb(route: Route, path: string[] = []): Iterable<BreadcrumbItem> {
        let result: BreadcrumbItem | undefined;

        const currentPath = [...path];
        if (route.path) currentPath.push(route.path);

        if (isRichRoute(route)) {
            if (route.pageTitle) {
                result = {
                    name: route.pageTitle,
                    onClick: async () => await this.#router.navigate(currentPath),
                    disabled: false
                };
            } else {
                result = {
                    name: route.path ?? 'no title',
                    disabled: true
                };
            }
        }

        if (route.children && route.children.length > 0) {
            for (const childRoute of route.children) {
                for (const childItem of this.#buildBreadcrumb(childRoute, currentPath)) {
                    if (result) {
                        result.children ??= [];
                        result.children.push(childItem);
                    } else {
                        yield childItem;
                    }
                }
            }
        }

        if (result) {
            yield result;
        }
    }

    // #buildBreadcrumb(r: Route, b: BreadcrumbItem, path: string[] = []): BreadcrumbItem {

    // }
}
