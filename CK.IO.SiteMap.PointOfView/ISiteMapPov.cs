using CK.TypeScript;
using System.Collections.Generic;

namespace CK.IO.SiteMap.PointOfView;

[TypeScriptType]
public interface ISiteMapPov : ISiteMap
{
    /// <summary>
    /// Gets the point of views existing in the <see cref="ISiteMap.Pages"/>.
    /// </summary>
    public IList<IWebPagePointOfView> Pov { get; }
}
