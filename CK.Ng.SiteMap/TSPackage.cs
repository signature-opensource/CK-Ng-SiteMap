using CK.Core;
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
[TypeScriptFile( "DynamicRouterService.ts", "DynamicRouterService" )]

public sealed class TSPackage : TypeScriptPackage
{
}
