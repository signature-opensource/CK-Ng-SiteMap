import { InjectionToken } from '@angular/core';

export interface IRouteListener {
    updateFromRouter(): void;
}

export const ROUTE_LISTENER = new InjectionToken<IRouteListener>('IRouteListener');
