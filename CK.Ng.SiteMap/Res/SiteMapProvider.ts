import { computed, effect, inject, Injectable, Signal, signal } from '@angular/core';
import { NavigationEnd, Route, Router } from '@angular/router';
import { resolveNamedComponentTypeAsync } from '@local/ck-gen/CK/Angular/NamedComponentsResolver';
import { faSitemap } from '@fortawesome/free-solid-svg-icons';
import { GetSiteMapQCommand, SiteMap, WebPagePageComponentType } from '@local/ck-gen';
import { filter } from 'rxjs';
import { BreadcrumbItem } from '@local/ck-gen/CK/Ng/Zorro/breadcrumb/breadcrumb-item-model';
import { HttpCrisEndpoint } from '@local/ck-gen/CK/Cris/HttpCrisEndpoint';
import { NgAuthService } from '@local/ck-gen/CK/Ng/AspNet/Auth/NgAuthService';

@Injectable({ providedIn: 'root' })
export class SiteMapProvider {

    readonly #cris = inject(HttpCrisEndpoint);
    readonly #auth = inject(NgAuthService);
    readonly #router = inject(Router);

    readonly #currentUrl = signal<string[]>([]);
    readonly #siteMap = signal<SiteMap | null>(null);

    readonly #tree = computed<ITreeNode>(() => {
        const sm = this.#siteMap();
        return sm ? this.#buildTree(sm) :
            {
                children: {},
                isNavigable: false,
                pageTitle: '',
                path: ''
            };
    });

    readonly homePagePath = computed<string | undefined>(() => {
        const sm = this.#siteMap();
        return sm?.pages.find(p => p.webPageId === sm.homePageId)?.path;
    });

    readonly preferredPages = computed<{ pageTitle: string; path: string; }[]>(() => {
        const sm = this.#siteMap();
        return sm?.preferredPages.map(pageId => {
            const page = sm.pages.find(p => p.webPageId === pageId);
            if (!page) {
                throw new Error(`Could not find preferred page with id ${pageId} from pages.`);
            }
            return {
                pageTitle: page.pageTitle,
                path: page.path
            };
        }) ?? [];
    });

    readonly breadcrumbItems: Signal<BreadcrumbItem[]> = computed(() => {
        return this.#buildBreadcrumb(this.#tree(), this.#currentUrl());
    });

    constructor() {

        this.#router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe(e => this.#currentUrl.set(this.#parseUrl(e.urlAfterRedirects)));

        let lastUserId: number | undefined;
        effect(async () => {
            const userId = this.#auth.authenticationInfo().user.userId;
            if (lastUserId !== userId) {
                lastUserId = userId;
                await this.#loadSiteMapAsync();
            }
        });

        effect(async () => {
            const routes = await this.#generateRoutesAsync(this.#tree());
            this.#router.resetConfig(routes);
        });
    }

    #parseUrl(url: string): string[] {
        if (url === '' || url === '/') {
            return [];
        }
        else if (url.startsWith('/')) {
            url = url.slice(1);
        }
        return url.split('/');
    }

    async #loadSiteMapAsync(): Promise<void> {
        try {
            const siteMap = await this.#cris.sendOrThrowAsync(new GetSiteMapQCommand());
            if (siteMap) {
                this.#siteMap.set(siteMap);
            }
        } catch {
            this.#siteMap.set(null);
        }
    }

    #buildTree(siteMap: SiteMap): ITreeNode {

        const root: ITreeNode = {
            children: {},
            pageTitle: '',
            path: '',
            isNavigable: false
        };

        for (const page of siteMap.pages) {

            let current: ITreeNode = root;
            const segments: string[] = page.path.split('/');

            for (let i = 0; i < segments.length; i++) {

                const segment = segments[i];
                const isLastSegment: boolean = i === segments.length - 1;

                if (isLastSegment) {

                    const next: ITreeNode | undefined = current.children[segment];

                    const component = siteMap.componentTypes.find(c => c.componentTypeId === page.componentTypeId);
                    if (!component) {
                        throw new Error(`Could not find component with id ${page.componentTypeId} from SiteMap.`);
                    }

                    const newNext: ITreeNode = {
                        children: next?.children ?? {},
                        pageTitle: page.pageTitle,
                        component,
                        path: page.path,
                        isNavigable: true
                    };

                    // If next exists, then it's probably a INotNavigableNode, then replace it with a PageNode.
                    current.children[segment] = newNext;
                    current = newNext;

                } else {
                    current = current.children[segment] ??= {
                        children: {},
                        pageTitle: segment,
                        path: segments.slice(0, i + 1).join('/'),
                        isNavigable: false
                    };
                }
            }
        }

        return root;
    }

    #buildBreadcrumb(tree: ITreeNode, path: string[]): BreadcrumbItem[] {

        const breadcrumb: BreadcrumbItem[] = [];
        breadcrumb.unshift(this.#recursiveBuildBreadcrumb(tree, breadcrumb, path));
        breadcrumb[0].icon = faSitemap;

        debugger;

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

        return breadcrumb;
    }

    #recursiveBuildBreadcrumb(currentNode: ITreeNode, breadcrumb: BreadcrumbItem[], path: string[] = []): BreadcrumbItem {
        const breadcrumbItem: BreadcrumbItem = {
            name: currentNode.pageTitle,
            disabled: !currentNode.isNavigable
        };
        if (currentNode.isNavigable) {
            breadcrumbItem.onClick = async () => await this.#router.navigate([currentNode.path]);
        }
        for (const [segment, childNode] of Object.entries(currentNode.children)) {
            if (path?.length > 0 && path[0] === segment) {
                breadcrumb.unshift(this.#recursiveBuildBreadcrumb(childNode, breadcrumb, path.slice(1)));
                path = [];
            } else {
                breadcrumbItem.children ??= [];
                breadcrumbItem.children.push(this.#recursiveBuildBreadcrumb(childNode, breadcrumb));
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

    *#getNavigableChildren(children: BreadcrumbItem[], path: string[] = [], directChilren: boolean = true): Iterable<BreadcrumbChildItemInfo> {
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

    async #generateRoutesAsync(tree: ITreeNode, routes: Route[] = []): Promise<Route[]> {
        if (tree.isNavigable) {
            routes.push(
                {
                    path: tree.path,
                    component: await resolveNamedComponentTypeAsync(tree.component!.typeName)
                }
            );
        }

        for (const child of Object.values(tree.children)) {
            await this.#generateRoutesAsync(child, routes);
        }

        return routes;
    }
}

type BreadcrumbChildItemInfo = {
    item: BreadcrumbItem;
    path: string[];
    directChilren: boolean;
};

interface ITreeNode {
    readonly children: { [segment: string]: ITreeNode },
    readonly path: string;
    readonly pageTitle: string; // TODO: If it's not a page, there are no WebPage, then no page name, then use segment?
    readonly component?: WebPagePageComponentType;
    readonly isNavigable: boolean;
}
