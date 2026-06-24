import { DestroyRef, effect, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { NavigationEnd, Router, Route } from '@angular/router';
import { resolveNamedComponentTypeAsync } from '@local/ck-gen/CK/Angular/NamedComponentsResolver';
import { faSitemap } from '@fortawesome/free-solid-svg-icons';
import { filter, Subscription } from 'rxjs';
import { BreadcrumbItem } from '@local/ck-gen/CK/Ng/Zorro/breadcrumb/breadcrumb-item-model';
import { HttpCrisEndpoint } from '@local/ck-gen/CK/Cris/HttpCrisEndpoint';
import { NgAuthService } from '@local/ck-gen/CK/Ng/AspNet/Auth/NgAuthService';
import { GetSiteMapQCommand } from '@local/ck-gen/CK/IO/SiteMap/GetSiteMapQCommand';
import { SiteMap } from '@local/ck-gen/CK/IO/SiteMap/SiteMap';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import defaultRoutes from '@local/ck-gen/CK/Angular/routes';
import { PrivatePage } from '../AspNet/Auth/private-page/private-page';

@Injectable({ providedIn: 'root' })
export class SiteMapProvider {

    //#region Services
    readonly #cris = inject(HttpCrisEndpoint);
    readonly #auth = inject(NgAuthService);
    readonly #router = inject(Router);
    readonly #destroyRef = inject(DestroyRef);
    //#endregion

    //#region Private values
    #navSub?: Subscription;
    #siteMap?: SiteMap;
    #rootRoute?: RichRoute;
    #previousUrl?: string;

    readonly #breadcrumbItems: WritableSignal<BreadcrumbItem[]> = signal([]);
    readonly #preferredPages: WritableSignal<PreferredPage[]> = signal([]);
    readonly #homePagePath: WritableSignal<string | undefined> = signal(undefined);
    //#endregion

    //#region Public values
    readonly breadcrumbItems: Signal<BreadcrumbItem[]> = this.#breadcrumbItems.asReadonly();
    readonly preferredPages: Signal<PreferredPage[]> = this.#preferredPages.asReadonly();
    readonly homePagePath = this.#homePagePath.asReadonly();
    //#endregion

    constructor() {

        let lastUserId: number | undefined;
        effect(async () => {

            const userId = this.#auth.authenticationInfo().user.userId;
            if (lastUserId === userId) return;
            lastUserId = userId;

            if (userId === 0) {
                // When userId is 0 (anonymous), this service is on hold. Then unsubscribe router updates.
                this.#navSub?.unsubscribe();
                this.#navSub = undefined;
                this.#siteMap = undefined;
                this.#rootRoute = undefined;
                this.#breadcrumbItems.set([]);
                this.#homePagePath.set('');
                this.#preferredPages.set([]);

            } else {
                this.#navSub ??= this.#router.events
                    .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.#destroyRef))
                    .subscribe(this.#updateNavigationState.bind(this));

                await this.#loadSiteMapAsync();
            }
        });
    }

    async #loadSiteMapAsync(): Promise<void> {
        try {
            this.#siteMap = checkNotNull(await this.#cris.sendOrThrowAsync(new GetSiteMapQCommand()));

            this.#homePagePath.set(this.#siteMap.pages.find(p => p.webPageId === this.#siteMap!.homePageId)?.path);

            this.#preferredPages.set(this.#siteMap.preferredPages.map(pp => {
                const page = checkNotNull(this.#siteMap!.pages.find(p => pp === p.webPageId));
                return { path: page.path, title: page.pageTitle };
            }));

            const route = await this.#siteMapToRouteAsync(this.#siteMap);

            const pp = checkNotNull(defaultRoutes.find(r => r.component === PrivatePage), 'Could not find PrivatePage in default routes.');
            if (this.#rootRoute) {
                pp.children?.splice(checkNotNull(pp.children).indexOf(this.#rootRoute), 1, route);
            } else {
                pp.children ??= [];
                pp.children.push(route);
                this.#rootRoute = route;
            }
            this.#router.resetConfig(defaultRoutes);

            await this.#router.navigateByUrl(checkNotNull(this.#homePagePath()));

        } catch (err) {
            console.error(err);
            this.#siteMap = undefined;
            this.#rootRoute = undefined;
            this.#breadcrumbItems.set([]);
            this.#homePagePath.set('');
            this.#preferredPages.set([]);
        }
    }

    async #siteMapToRouteAsync(siteMap: SiteMap): Promise<RichRoute> {

        const rootRoute: RichRoute = { path: '', children: [] };

        for (const page of siteMap.pages) {

            const path = page.path.split('/');
            let currentRoute = rootRoute;

            for (let i = 0; i < path.length; i++) {

                let nextRoute: RichRoute | undefined = currentRoute.children?.find(c => c.path === path[i]);
                if (!nextRoute) {
                    nextRoute = { path: path[i] };
                    currentRoute.children ??= [];
                    currentRoute.children.push(nextRoute);
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

    #updateNavigationState(e: NavigationEnd): void {
        try {
            let url = e.urlAfterRedirects;
            if (this.#previousUrl === url) return;
            if (!this.#rootRoute) return;

            this.#previousUrl = url;

            if (url.startsWith('/')) url = url.slice(1);

            //TODO: Should save previous url and rebuild breadcrumb only if new url is different?
            const breadcrumb = this.#buildBreadcrumb(this.#rootRoute, url.split('/'));
            this.#breadcrumbItems.set(breadcrumb);

            // WARN: This subscription can be trigger before the sitemap loading.
        } catch (err) {
            console.error(err);
            this.#breadcrumbItems.set([]);
        }
    }

    #buildBreadcrumb(tree: RichRoute, path: string[]): BreadcrumbItem[] {

        const breadcrumb: BreadcrumbItem[] = [];
        breadcrumb.unshift(this.#recursiveBuildBreadcrumb(tree, breadcrumb, [], path));
        breadcrumb[0].icon = faSitemap;

        while (breadcrumb.length > 0 &&
            breadcrumb[0].disabled &&
            (!breadcrumb[0].children || breadcrumb[0].children.length <= 1)) {
            // Trim for node with only one child.
            breadcrumb.shift();
        }

        for (const item of breadcrumb) {
            this.#formatBeadcrumbItemChildren(item);
        }

        // TODO: Sort breadcrumb items children by name...
        console.log('breadcrumb', breadcrumb);

        return breadcrumb;
    }

    #recursiveBuildBreadcrumb(currentNode: RichRoute,
        breadcrumb: BreadcrumbItem[],
        buildingPath: string[],
        path: string[] = []): BreadcrumbItem {

        const breadcrumbItem: BreadcrumbItem = {
            name: currentNode.pageTitle ?? currentNode.path ?? '',
            disabled: !currentNode.component
        };

        const fullPath = [...buildingPath];
        if (currentNode.path) fullPath.push(currentNode.path);

        if (currentNode.component) {
            breadcrumbItem.onClick = async () => await this.#router.navigate(fullPath);
        }
        if (currentNode.children) {
            for (const childNode of currentNode.children) {
                if (path.length > 0 && path[0] === childNode.path) {
                    breadcrumb.unshift(this.#recursiveBuildBreadcrumb(childNode, breadcrumb, fullPath, path.slice(1)));
                    path = [];
                }
                breadcrumbItem.children ??= [];
                breadcrumbItem.children.push(this.#recursiveBuildBreadcrumb(childNode, breadcrumb, fullPath));
            }
        }
        if (path.length > 0) {
            throw new Error(`Could not find '${path[0]}' segment in the current tree node.`);
        }
        return breadcrumbItem;
    }

    #formatBeadcrumbItemChildren(item: BreadcrumbItem): void {
        if (!item.children || item.children.length === 0) {
            return;
        }

        const info: { [itemName: string]: BreadcrumbChildItemInfo[] } = {};
        for (const childInfo of this.#getNavigableChildren(item.children)) {
            info[childInfo.item.name] ??= [];
            info[childInfo.item.name].push(childInfo);
        }

        const result: BreadcrumbItem[] = [];
        for (const [itemName, children] of Object.entries(info)) {

            if (children.length === 1) {
                result.push(children[0].item);

            } else {
                const prefixes = children.map(j => j.path.slice(0, -1));
                const hasRootPath = prefixes.filter(j => j.length === 0).length === 1;

                if (hasRootPath && children.length === 2) {
                    children.forEach(child => {
                        if (child.path.length !== 0) {
                            child.item.name = `(…) ${itemName}`;
                        }
                    });
                    break;
                }

                for (let i = 0; i < children.length; i++) {
                    if (children[i].path.length !== 0) {
                        const d = this.#getDiscriminant(prefixes, children[i].path);
                        children[i].item.name = `(${d.hasBefore ? '…' : ''}${d.segment}${d.hasAfter ? '…' : ''}) ${itemName}`;
                    }
                }
            }
        }

        item.children = result;
    }

    #getDiscriminant(prefixes: string[][], path: string[]): { segment: string; hasBefore: boolean; hasAfter: boolean } {
        if (path.length === 0) {
            return { segment: '', hasBefore: false, hasAfter: false };
        }

        for (let i = path.length - 1; i >= 0; i--) {
            const segment = path[i];
            const matching = prefixes.filter(other => other.includes(segment));
            if (matching.length) {
                return {
                    segment,
                    hasBefore: i > 0,
                    hasAfter: i < path.length - 1
                };
            }
        }

        return {
            segment: path[path.length - 1],
            hasBefore: path.length > 1,
            hasAfter: false
        };
    }

    *#getNavigableChildren(children: BreadcrumbItem[],
        path: string[] = [],
        directChilren: boolean = true): Iterable<BreadcrumbChildItemInfo> {

        for (const child of children) {
            const subPath = [...path, child.name];
            if (!child.disabled) {
                yield { item: child, path, directChilren };
            } else if (child.children) {
                for (const subChild of this.#getNavigableChildren(child.children, subPath, false)) {
                    yield subChild;
                }
            }
        }
    }
}

function checkNotNull<T>(value: T | undefined | null, message?: string): T {
    if (!value) throw new Error(message);
    return value;
}

type BreadcrumbChildItemInfo = {
    item: BreadcrumbItem;
    path: string[];
    directChilren: boolean;
};

type PreferredPage = {
    /** Page title. */
    title: string;
    /** Page path. */
    path: string;
};

type RichRoute = Route & {
    pageTitle?: string;
    children?: RichRoute[];
};
