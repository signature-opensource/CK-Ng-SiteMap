using CK.Core;
using CK.TypeScript;

namespace CK.IO.SiteMap;

/// <summary>
/// Models the web page component type.
/// </summary>
[TypeScriptType]
public interface IWebPagePageComponentType : IPoco
{
    /// <summary>
    /// Gets or sets the component type identifier.
    /// </summary>
    int ComponentTypeId { get; set; }

    /// <summary>
    /// Gets or sets the type name.
    /// </summary>
    string TypeName { get; set; }
}
