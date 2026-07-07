import { inject, Injectable, signal, Signal, WritableSignal } from '@angular/core';
import { Router, Routes } from '@angular/router';

// TODO: Move to CK.Ng.Zorro
/**
 * This service is optional. It exists to resolve the following problem: currently, the Angular Router doesn't expose event for Router.config updates.
 */
@Injectable({ providedIn: 'root' })
export class DynamicRouterService {

    readonly #router = inject(Router);

    #routesUpdated: WritableSignal<Routes> = signal(this.#router.config, { equal: () => false });

    public routesUpdated: Signal<Routes> = this.#routesUpdated.asReadonly();

    public signalRoutesUpdate(): void {
        this.#routesUpdated.set(this.#router.config);
    }
}
