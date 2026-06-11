using CK.Core;
using CK.Cris;
using CK.DB.HWorkspace;
using CK.IO.SiteMap;
using CK.IO.SiteMap.PointOfView;
using CK.SqlServer;
using System.Linq;
using System.Threading.Tasks;

namespace CK.DB.SiteMap.PointOfView;

public sealed class SiteMapPovService : SiteMapService
{
    public SiteMapPovService( WorkspaceTable workspaceTable )
        : base( workspaceTable )
    {
    }

    // Temporary:
    // - This will be handled by Poco validation.
    // - The [AmbientServiceValue] is a INullInvalidAttribute, null will be rejected.
    [IncomingValidator]
    public void Validate( UserMessageCollector c, IGetSiteMapPovQCommand cmd )
    {
        if( !cmd.ActorId.HasValue )
        {
            c.Error( $"Invalid property: ActorId cannot be null." );
        }
    }

    [CommandHandler]
    public async Task<ISiteMap> GetSiteMapWithPovAsync( ISqlCallContext ctx,
                                                        PocoDirectory pocoDir,
                                                        IGetSiteMapPovQCommand cmd )
    {
        var siteMap = await GetSiteMapAsync( ctx, cmd );
        return pocoDir.Create<ISiteMapPov>( s =>
        {
            s.HomePageId = siteMap.HomePageId;
            s.Pages.AddRange( siteMap.Pages );
            s.Pov.AddRange( s.Pages
                             .Select( p => GetPOV( p.Path ) )
                             .Where( p => p is not null )
                             .GroupBy( Util.FuncIdentity )
                             .Select( g => pocoDir.Create<IWebPagePointOfView>( pov =>
                             {
                                 pov.Name = g.Key;
                                 pov.PageCount = g.Count();
                             } ) ) );
        } );
    }

    static string? GetPOV( string path )
    {
        int idx = path.LastIndexOf( '/' );
        Throw.DebugAssert( idx < 0 || idx < path.Length - 1 );
        if( ++idx > 0 && path[idx] == '$' )
        {
            return path.Substring( idx );
        }
        return null;
    }
}
