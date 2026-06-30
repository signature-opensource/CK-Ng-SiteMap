using CK.Core;
using CK.TS.Angular;
using CK.TypeScript;

namespace CK.Ng.SiteMap;

[TypeScriptPackage]
[Requires<CK.Ng.Cris.AspNet.Auth.CrisAspNetAuthPackage>]
[Requires<CK.Ng.Zorro.ActionBarComponent>]
[Requires<CK.Ng.Zorro.BreadcrumbComponent>]
[TypeScriptFile( "SiteMapProvider.ts", "SiteMapProvider" )]

// TODO: This configuration must be provided by the CK.Ng.Zorro.Breadcrumb.BreadcrumbComponent
[TypeScriptFile( "BreadcrumbService.ts", "BreadcrumbService" )]

// TODO: This configuration must be provided by a base package, referenced by CK.Ng.Zorro.Breadcrumb and CK.Ng.SiteMap
[TypeScriptFile( "RouteListener.ts", "ROUTE_LISTENER" )]

// TODO: Find who should provide these configutations
[NgProviderImport( "ROUTE_LISTENER" )]
[NgProviderImport( "BreadcrumbService" )]
[NgProvider( "{ provide: ROUTE_LISTENER, useClass: BreadcrumbService }" )]
public sealed class TSPackage : TypeScriptPackage
{
}
