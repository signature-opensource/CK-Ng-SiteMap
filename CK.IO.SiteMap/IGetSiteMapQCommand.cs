using CK.Auth;
using CK.Cris;
using CK.TypeScript;

namespace CK.IO.SiteMap;

/// <summary>
/// Query command for <see cref="ISiteMap"/>.
/// </summary>
[TypeScriptType]
public interface IGetSiteMapQCommand : ICommand<ISiteMap>, ICommandAuthNormal
{
}
