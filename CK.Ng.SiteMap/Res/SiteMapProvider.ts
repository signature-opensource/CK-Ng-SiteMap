import { effect, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { Router, Route } from '@angular/router';
import { resolveNamedComponentTypeAsync } from '@local/ck-gen/CK/Angular/NamedComponentsResolver';
import { HttpCrisEndpoint } from '@local/ck-gen/CK/Cris/HttpCrisEndpoint';
import { NgAuthService } from '@local/ck-gen/CK/Ng/AspNet/Auth/NgAuthService';
import { GetSiteMapQCommand } from '@local/ck-gen/CK/IO/SiteMap/GetSiteMapQCommand';
import { SiteMap } from '@local/ck-gen/CK/IO/SiteMap/SiteMap';
import { PrivatePage } from '../AspNet/Auth/private-page/private-page';
import { IRouteListener, ROUTE_LISTENER } from './RouteListener';

export type PreferredPage = {
    title: string;
    path: string;
};

/** This type is synchronized with the same in CK.Ng.Zorro.Breadcrumb. */
type RichRoute = Route & {
    pageTitle: string | null;
    children?: RichRoute[];
};

function isRichRoute(r: Route): r is RichRoute {
    return (<any>r)["pageTitle"] !== undefined;
}

function checkNotNull<T>(value: T | undefined | null, message?: string): T {
    if (!value) throw new Error(message);
    return value;
}

@Injectable({ providedIn: 'root' })
export class SiteMapProvider {

    //#region Services
    readonly #cris = inject(HttpCrisEndpoint);
    readonly #auth = inject(NgAuthService);
    readonly #router = inject(Router);
    readonly #routerListener = inject<IRouteListener>(ROUTE_LISTENER, { optional: true });
    //#endregion

    //#region Private values
    readonly #preferredPages: WritableSignal<PreferredPage[]> = signal([]);
    readonly #homePagePath: WritableSignal<string | undefined> = signal(undefined);
    #rootRoute?: RichRoute;
    //#endregion

    //#region Public values
    readonly preferredPages: Signal<PreferredPage[]> = this.#preferredPages.asReadonly();
    readonly homePagePath: Signal<string | undefined> = this.#homePagePath.asReadonly();
    //#endregion

    constructor() {
        let lastUserId: number | undefined;
        effect(async () => {
            const userId = this.#auth.authenticationInfo().user.userId;
            if (lastUserId !== userId) {
                lastUserId = userId;

                if (userId === 0) {
                    this.#preferredPages.set([]);
                    this.#homePagePath.set(undefined);
                    this.#rootRoute = undefined;
                } else {
                    await this.#loadSiteMapAsync();
                }
            }
        });
    }

    async #loadSiteMapAsync(): Promise<void> {
        try {
            const siteMap = checkNotNull(await this.#cris.sendOrThrowAsync(new GetSiteMapQCommand()));

            const homePagePath = siteMap.homePageId !== 0
                ? checkNotNull(siteMap.pages.find(p => p.webPageId === siteMap.homePageId)).path
                : undefined;

            this.#homePagePath.set(homePagePath);

            this.#preferredPages.set(siteMap.preferredPages.map(pp => {
                const page = checkNotNull(siteMap.pages.find(p => pp === p.webPageId));
                return {
                    path: page.path,
                    title: page.pageTitle
                };
            }));

            const route = await this.#siteMapToRouteAsync(siteMap);

            const defaultRoutes = this.#router.config;
            const pp = checkNotNull(defaultRoutes.find(r => r.component === PrivatePage), 'Could not find PrivatePage in default routes.');
            if (!pp.children) {
                pp.children = [route];
            } else if (this.#rootRoute) {
                pp.children.splice(checkNotNull(pp.children).indexOf(this.#rootRoute), 1, route);
            } else {
                pp.children.push(route);
            }
            this.#rootRoute = route;
            this.#routerListener?.updateFromRouter();

            if (homePagePath !== undefined) {
                await this.#router.navigateByUrl(homePagePath);
            }

        } catch (err) {
            console.error(err);
            this.#preferredPages.set([]);
            this.#homePagePath.set(undefined);
            this.#rootRoute = undefined;
        }
    }

    async #siteMapToRouteAsync(siteMap: SiteMap): Promise<RichRoute> {

        const rootRoute: RichRoute = {
            path: '',
            pageTitle: null
        };

        for (const page of siteMap.pages) {

            const path = page.path.split('/');
            let currentRoute = rootRoute;

            for (let i = 0; i < path.length; i++) {

                let nextRoute: RichRoute | Route | undefined = currentRoute.children?.find(c => c.path === path[i]);
                if (!nextRoute) {
                    nextRoute = {
                        path: path[i],
                        pageTitle: null
                    };
                    currentRoute.children ??= [];
                    currentRoute.children.push(nextRoute);
                }
                else if (!isRichRoute(nextRoute)) {
                    throw new Error(`Route at '${path.slice(0, i + 1).join('/')}' is not a RichRoute.`);
                }

                const isLast = i === path.length - 1;
                if (isLast) {
                    const ct = checkNotNull(siteMap.componentTypes.find(ct => ct.componentTypeId = page.componentTypeId), `Could not find component type with id ${page.componentTypeId}.`);
                    const component = await resolveNamedComponentTypeAsync(ct.typeName);
                    nextRoute.component = checkNotNull(component, `Could not find '${ct.typeName}' component.`);
                    nextRoute.pageTitle = page.pageTitle;
                }

                currentRoute = nextRoute;
            }
        }

        return rootRoute;
    }
}
