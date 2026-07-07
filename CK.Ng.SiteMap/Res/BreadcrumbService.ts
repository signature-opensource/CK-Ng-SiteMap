import { DestroyRef, effect, inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { BreadcrumbItem } from '../Zorro/breadcrumb/breadcrumb-item-model';
import { NavigationEnd, Route, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DynamicRouterService } from './DynamicRouterService';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import { PrivatePage } from '../AspNet/Auth/private-page/private-page';

/** This type is synchronized with the same in CK.Ng.SiteMap. */
type RichRoute = Route & {
    pageTitle: string | null;
    children?: RichRoute[];
};

function isRichRoute(r: Route): r is RichRoute {
    return (<any>r)["pageTitle"] !== undefined;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {

    readonly #router = inject(Router);
    readonly #destroyRef = inject(DestroyRef);
    readonly #dynamicRouterService = inject(DynamicRouterService);

    #fullBreadcrumb: Node;
    #currentPath: string[];
    readonly #breadcrumb: WritableSignal<BreadcrumbItem[]> = signal([]);
    readonly breadcrumb: Signal<readonly BreadcrumbItem[]> = this.#breadcrumb.asReadonly();

    constructor() {

        //this.#routeLogger(this.#router.config);    
        this.#fullBreadcrumb = this.#buildFullBreadcrumbTreeFromRoutes(this.#router.config);
        this.#currentPath = this.#pathFromUrl(this.#router.url);

        this.#router.events
            .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this.#destroyRef))
            .subscribe(e => {
                this.#currentPath = this.#pathFromUrl(e.urlAfterRedirects);
                this.#breadcrumb.set(this.#buildPublicBreacrumb(this.#fullBreadcrumb, this.#currentPath));
            });

        effect(() => {
            const routes = this.#dynamicRouterService.routesUpdated();
            this.#logRoutes(routes);
            this.#fullBreadcrumb = this.#buildFullBreadcrumbTreeFromRoutes(routes);
            this.#logFullBreadcrumb(this.#fullBreadcrumb);
            this.#breadcrumb.set(this.#buildPublicBreacrumb(this.#fullBreadcrumb, this.#currentPath));
        });
    }

    #pathFromUrl(url: string): string[] {
        if (url.startsWith('/')) {
            url = url.slice(1);
        }
        return url.split('/');
    }

    #buildFullBreadcrumbTreeFromRoutes(routes: Route[]): Node {
        const root: Node = {
            segment: '',
            clickable: false,
            children: []
        };

        const pp = this.#getPrivatePageOrThrow(routes);
        if (pp.children) {
            for (const rr of this.#recursiveBuildFullBreadcrumbTreeFromRoutes(pp.children)) {
                root.children ??= [];
                root.children.push(rr);
            }
        }

        return root;
    }

    #getPrivatePageOrThrow(routes: Route[]): Route {
        for (const route of routes) {
            if (route.component === PrivatePage) {
                return route;
            }
        }
        throw new Error('Missing private page from Routes.');
    }

    /**
     * 
     * @param routes Children routes of PrivatePage.
     * @param path 
     */
    *#recursiveBuildFullBreadcrumbTreeFromRoutes(routes: Route[], path: string[] = []): Iterable<Node> {
        for (const route of routes) {

            const currentPath = [...path];
            if (route.path) currentPath.push(route.path);

            if (isRichRoute(route)) {
                yield* this.#buildBreadcrumbTree(route, path);

            } else if (route.children) {
                yield* this.#recursiveBuildFullBreadcrumbTreeFromRoutes(route.children, currentPath);
            }
        }
    }

    /**
     * Creates a raw breacumb tree from the RichRoute.
     * If the given route has no page title and no path, it's ignorend and it's children are returned.
     */
    *#buildBreadcrumbTree(route: RichRoute, path: string[]): Iterable<Node> {
        const currentPath = [...path];
        if (route.path) currentPath.push(route.path);

        let result: Node | undefined;
        if (route.pageTitle) { // If a route have a pageTitle, then it is navigable...
            if (!route.path) throw new Error('A rich route page must have a path.');
            result = {
                segment: route.path,
                clickable: true,
                pageTitle: route.pageTitle,
                onClick: async () => await this.#router.navigate(currentPath)
            };
        } else if (route.path) { // ...Otherwise, if the route have a not empty path, it's a segment that sould appear in the breadcrumb but disabled.
            result = {
                segment: route.path,
                clickable: false,
                children: []
            };
        }

        if (route.children) {
            for (const childRoute of route.children) {
                if (!isRichRoute(childRoute)) throw new Error('Child of RichRoute must be a RichRoute.');
                for (const childItem of this.#buildBreadcrumbTree(childRoute, currentPath)) {
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

    #buildPublicBreacrumb(item: Node, path: string[]): BreadcrumbItem[] {
        // First step: Create breadcrumb

        const items: Node[] = [item];
        let current = item;
        for (const segment of path) {
            if (!current.children) {
                console.warn(`Item '${current.segment}' doesn't have children. Expected segment '${segment}'.`);
                break;
            }

            const child = current.children.find(i => i.segment === segment);
            if (!child) {
                console.warn(`Item '${current.segment}' not contains children for expected segment '${segment}'.`);
                break;
            }
            items.push(child);
            current = child;
        }

        // Second step: New BeradcrumbItem instances, remove segment and set disabled
        const result: BreadcrumbItem[] = [];
        for (let i = 0; i < items.length; i++) {
            const node = items[i];
            let bi: BreadcrumbItem;
            if (i === 0) { // Root
                bi = {
                    name: '',
                    disabled: true,
                    icon: faHome
                };
            } else {
                bi = this.#toBreadcrumbItem(node);
            }
            if (node.children && node.children.length > 0) {
                bi.children = this.#buildChildren(node.children, i < items.length - 1 ? items[i + 1].segment : undefined);
            }
            result.push(bi);
        }

        return this.#trimUninformativeLeadingItems(result);
    }

    /**
     * Drops leading items that are disabled and offer no real choice (their dropdown has a single
     * entry), since they carry no information the user could act on. Always keeps at least the last
     * item (the active page), even if it would otherwise qualify.
     */
    #trimUninformativeLeadingItems(items: BreadcrumbItem[]): BreadcrumbItem[] {
        let start = 0;
        while (start < items.length - 1 && items[start].disabled && items[start].children?.length === 1) {
            start++;
        }
        return items.slice(start);
    }

    #toBreadcrumbItem(node: Node, forceDisabled: boolean = false): BreadcrumbItem {
        return node.clickable
            ? { name: node.pageTitle, onClick: node.onClick, disabled: forceDisabled }
            : { name: node.segment, disabled: true };
    }

    /**
     * Builds the dropdown items for a breadcrumb node: the sibling actually on the active path (disabled),
     * directly clickable siblings (as-is), and, for non-clickable siblings, the first clickable descendant(s)
     * reached by drilling through their subtree (disambiguated when several share the same pageTitle).
     */
    #buildChildren(nodes: Node[], nextSegment?: string): BreadcrumbItem[] {
        const items: BreadcrumbItem[] = [];
        const drilled: DrilledCandidate[] = [];

        for (const child of nodes) {
            if (child.segment === nextSegment) {
                items.push(this.#toBreadcrumbItem(child, true));
            } else if (child.clickable) {
                items.push({ name: child.pageTitle, onClick: child.onClick, disabled: false });
            } else {
                drilled.push(...this.#collectFirstClickableDescendants(child));
            }
        }

        items.push(...this.#disambiguateHomonyms(drilled));
        return items;
    }

    /**
     * Yields, for each branch of a non-clickable node's subtree, the first clickable descendant found,
     * along with the chain of non-clickable segment names crossed to reach it (root-to-target order).
     */
    *#collectFirstClickableDescendants(node: NonClickableNode, ancestors: string[] = []): Iterable<DrilledCandidate> {
        const currentAncestors = [...ancestors, node.segment];
        for (const child of node.children) {
            if (child.clickable) {
                yield { node: child, ancestors: currentAncestors };
            } else {
                yield* this.#collectFirstClickableDescendants(child, currentAncestors);
            }
        }
    }

    /**
     * Prefixes each drilled candidate's name so that pages sharing the same pageTitle can be told apart,
     * per CK.Ng.SiteMap/README.md: no homonym => generic "(…)"; homonyms => the closest-to-target ancestor
     * name not already claimed by another candidate of the same group, ellipsis marking hidden segments.
     */
    #disambiguateHomonyms(drilled: DrilledCandidate[]): BreadcrumbItem[] {
        const groups = new Map<string, DrilledCandidate[]>();
        for (const candidate of drilled) {
            const group = groups.get(candidate.node.pageTitle);
            if (group) {
                group.push(candidate);
            } else {
                groups.set(candidate.node.pageTitle, [candidate]);
            }
        }

        const items: BreadcrumbItem[] = [];
        for (const group of groups.values()) {
            if (group.length === 1) {
                items.push(this.#toDisambiguatedItem(group[0], '…'));
                continue;
            }

            const used = new Set<string>();
            for (const candidate of group) {
                const leafToRoot = [...candidate.ancestors].reverse();
                let chosenIndex = leafToRoot.findIndex(name => !used.has(name));
                if (chosenIndex === -1) chosenIndex = 0; // Pathological case: every ancestor name already claimed.

                leafToRoot.forEach(name => used.add(name));

                const leading = chosenIndex !== leafToRoot.length - 1 ? '…' : '';
                const trailing = chosenIndex !== 0 ? '…' : '';
                items.push(this.#toDisambiguatedItem(candidate, `${leading}${leafToRoot[chosenIndex]}${trailing}`));
            }
        }
        return items;
    }

    #toDisambiguatedItem(candidate: DrilledCandidate, prefix: string): BreadcrumbItem {
        return {
            name: `(${prefix}) ${candidate.node.pageTitle}`,
            onClick: candidate.node.onClick,
            disabled: false
        };
    }

    //#region Loggers
    #logRoutes(routes: Route[], acc: string[] = ['Angular Routes:'], spaces: string[] = []): void {
        for (let i = 0; i < routes.length; i++) {
            const nextSpaces = [...spaces, i === routes.length - 1 ? '    ' : '│   '];
            acc.push(`${spaces.join('')}${i === routes.length - 1 ? '└' : '├'}'${routes[i].path}'${isRichRoute(routes[i]) ? ' (RichRoute)' : ''}`);
            if (routes[i].children) this.#logRoutes(routes[i].children!, acc, nextSpaces);
        }
        if (spaces.length === 0) console.log(acc.join('\n'));
    }

    #logFullBreadcrumb(item: Node, acc: string[] = ['Full breadcrumb tree:'], spaces: string[] = [], isLast: boolean = true): void {
        acc.push(`${spaces.join('')}${spaces.length === 0 ? '' : isLast ? '└' : '├'}'${item.segment}' (${item.clickable ? 'enabled' : 'disabled'})`);
        if (item.children) {
            for (let i = 0; i < item.children.length; i++) {
                const nextSpaces = [...spaces, isLast ? '    ' : '│   '];
                const nextIsLast = i === item.children.length - 1;
                this.#logFullBreadcrumb(item.children[i], acc, nextSpaces, nextIsLast);
            }
        }
        if (spaces.length === 0) console.log(acc.join('\n'));
    }
    //#endregion
}

type Node = {
    segment: string;
} & ({
    clickable: true;
    pageTitle: string;
    onClick: () => void;
    children?: Node[];
} | {
    clickable: false;
    children: Node[];
});

type ClickableNode = Extract<Node, { clickable: true }>;
type NonClickableNode = Extract<Node, { clickable: false }>;

type DrilledCandidate = {
    node: ClickableNode;
    /** Non-clickable segment names crossed to reach `node`, root-to-target order. */
    ancestors: string[];
};
