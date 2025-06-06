using CK.Core;
using CK.TypeScript;

namespace CK.IO.Ng.SiteMap;

/// <summary>
/// A point of view describes an aspect of the <see cref="ISiteMap.Pages"/>.
/// </summary>
[TypeScriptType]
public interface IWebPagePointOfView : IPoco
{
    /// <summary>
    /// Gets or sets the name of this point of view.
    /// </summary>
    string Name { get; set; }

    /// <summary>
    /// Gets or sets the number of <see cref="ISiteMap.Pages"/> that have this point of view.
    /// </summary>
    int PageCount { get; set; }
}
