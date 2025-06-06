using CK.Core;
using CK.TypeScript;

namespace CK.IO.Ng.SiteMap;

/// <summary>
/// Minimal model for a web page.
/// </summary>
[TypeScriptType]
public interface IWebPage : IPoco
{
    /// <summary>
    /// Gets or sets the page identifier.
    /// </summary>
    int WebPageId { get; set; }

    /// <summary>
    /// Gets or sets the page's component type identifier.
    /// </summary>
    int ComponentTypeId { get; set; }

    /// <summary>
    /// Gets or sets the '/' separated path of the page.
    /// </summary>
    string Path { get; set; }

    /// <summary>
    /// Gets or sets the title of the page.
    /// They may exist longer title, this one must be used to generate links.
    /// </summary>
    string PageTitle { get; set; }
}
