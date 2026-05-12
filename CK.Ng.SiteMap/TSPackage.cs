using CK.Core;
using CK.TypeScript;

namespace CK.Ng.SiteMap;

[TypeScriptPackage]
[Requires<CK.Ng.Cris.AspNet.Auth.CrisAspNetAuthPackage>]
[Requires<CK.Ng.Zorro.ActionBarComponent>]
[Requires<CK.Ng.Zorro.BreadcrumbComponent>]
[TypeScriptFile( "SiteMapProvider.ts", "SiteMapProvider" )]
public sealed class TSPackage : TypeScriptPackage
{
}
