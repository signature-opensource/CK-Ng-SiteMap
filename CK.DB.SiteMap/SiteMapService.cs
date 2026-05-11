using CK.Core;
using CK.Cris;
using CK.DB.HWorkspace;
using CK.IO.SiteMap;
using CK.SqlServer;
using Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CK.DB.SiteMap;

public class SiteMapService : ISingletonAutoService
{
    readonly WorkspaceTable _workspaceTable;

    public SiteMapService( WorkspaceTable workspaceTable )
    {
        _workspaceTable = workspaceTable;
    }

    // Temporary:
    // - This will be handled by Poco validation.
    // - The [AmbientServiceValue] is a INullInvalidAttribute, null will be rejected.
    [IncomingValidator]
    public void Validate( UserMessageCollector c, IGetSiteMapQCommand cmd )
    {
        if( !cmd.ActorId.HasValue )
        {
            c.Error( $"Invalid property: ActorId cannot be null." );
        }
    }

    [CommandHandler]
    public async Task<ISiteMap> GetSiteMapAsync( ISqlCallContext ctx,
                                                 IGetSiteMapQCommand cmd )
    {
        Throw.DebugAssert( cmd.ActorId.HasValue );
        var pages = await GetWebPagesAsync( ctx, cmd.ActorId.Value );
        var home = await GetPreferredWorkspacePageAsync( ctx, cmd.ActorId.Value );
        return cmd.CreateResult( s =>
        {
            s.HomePageId = home;
            s.Pages.AddRange( pages );
        } );
    }

    /// <summary>
    /// Gets all the <see cref="IWebPage"/> that can be viewed by the acting actor.
    /// </summary>
    /// <param name="ctx">The call context to use.</param>
    /// <param name="actorId">The acting actor.</param>
    /// <returns>The set of pages (their paths and titles).</returns>
    Task<IEnumerable<IWebPage>> GetWebPagesAsync( ISqlCallContext ctx, int actorId )
    {
        return ctx[_workspaceTable].QueryAsync<IWebPage>(
            @"select wp.WebPageId,
                     wp.ComponentTypeId,
                     [Path] = substring( wp.ResPath, 3, len( wp.ResPath ) - 2 ),
                     wp.PageTitle,
                from CK.vWebPage wp
                inner join CK.vAclActor aA on wp.AclId = aA.AclId and aA.ActorId = @ActorId
                where aA.GrantLevel >= 16 and wp.PageId > 0;",
            new { ActorId = actorId } );
    }

    /// <summary>
    /// Gets the preferred workspace page of a user.
    /// </summary>
    /// <param name="ctx">The call context to use.</param>
    /// <param name="actorId">The acting actor.</param>
    /// <returns>The page's identifier.</returns>
    Task<int> GetPreferredWorkspacePageAsync( ISqlCallContext ctx, int actorId )
    {
        return ctx[_workspaceTable].QuerySingleAsync<int>(
            @"select w.PageId
                    from CK.tUser u
                    inner join CK.tWorkspace w on u.PreferredWorkspaceId = w.WorkspaceId",
            new { ActorId = actorId } );
    }
}
