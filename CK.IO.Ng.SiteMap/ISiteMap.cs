using CK.Core;
using CK.TypeScript;
using System.Collections.Generic;

namespace CK.IO.Ng.SiteMap;

/// <summary>
/// Root model of a site map. This is bound to a user and only contains the elements
/// that are accessible to the user.
/// </summary>
[TypeScriptType]
public interface ISiteMap : IPoco
{
    /// <summary>
    /// Gets or sets the preferred workspace's page of the user.
    /// </summary>
    public int HomePageId { get; set; }

    /// <summary>
    /// Gets an ordered list of preferred pages.
    /// </summary>
    public IList<int> PreferredPages { get; }

    /// <summary>
    /// Gets the page components type.
    /// This list can contain component types not currently used by any <see cref="Pages"/>.
    /// </summary>
    public IList<IWebPagePageComponentType> ComponentTypes { get; }

    /// <summary>
    /// Gets the list of pages ordered by their <see cref="IWebPage.Path"/>.
    /// </summary>
    public IList<IWebPage> Pages { get; }

    /// <summary>
    /// Gets the point of views existing in the <see cref="Pages"/>.
    /// </summary>
    public IList<IWebPagePointOfView> Pov { get; }
}
