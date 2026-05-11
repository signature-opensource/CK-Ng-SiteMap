using CK.Core;
using CK.TypeScript;

namespace CK.Ng.SiteMap;

[TypeScriptPackage]
[Requires<CK.Ng.AspNet.Auth.AspNetAuthPackage>]
[Requires<CK.Ng.Zorro.ActionBarComponent>]
[Requires<CK.Ng.Zorro.BreadcrumbComponent>]
public sealed class TSPackage : TypeScriptPackage
{
}
