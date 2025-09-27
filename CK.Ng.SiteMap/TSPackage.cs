using CK.Core;
using CK.TypeScript;
using Microsoft.AspNetCore.Antiforgery;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CK.Ng.SiteMap;

[TypeScriptPackage]
[Requires<CK.Ng.AspNet.Auth.AspNetAuthPackage>]
public sealed class TSPackage : TypeScriptPackage
{
}
