using CK.AppIdentity;
using CK.Core;
using CK.Cris;
using CK.Setup;
using CK.Setup.Cris;
using CK.Testing;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using System;
using System.Threading.Tasks;
using static CK.Testing.MonitorTestHelper;

namespace CK.Ng.SiteMap.Tests;

[TestFixture]
public class SiteMapTests
{
    [Test]
    public async Task CK_Ng_SiteMap_Async()
    {
        var targetProjectPath = TestHelper.GetTypeScriptInlineTargetProjectPath();

        var configuration = TestHelper.CreateDefaultEngineConfiguration();
        configuration.FirstBinPath.Path = TestHelper.BinFolder;
        configuration.EnsureSqlServerConfigurationAspect();
        var tsConfig = configuration.FirstBinPath.EnsureTypeScriptConfigurationAspect( targetProjectPath );
        Throw.DebugAssert( tsConfig.AspectConfiguration != null );
        tsConfig.AspectConfiguration.IgnoreVersionsBound = true;

        var map = (await configuration.RunSuccessfullyAsync()).LoadMap();

        var builder = WebApplication.CreateSlimBuilder();
        builder.Services.AddSingleton( ApplicationIdentityServiceConfiguration.CreateEmpty() );

        await using var server = await builder.CreateRunningAspNetAuthenticationServerAsync( map, o => o.SlidingExpirationTime = TimeSpan.FromMinutes( 10 ) );
        await using var runner = TestHelper.CreateTypeScriptRunner( targetProjectPath, server.ServerAddress );
        await TestHelper.SuspendAsync( resume => resume );
        runner.Run();
        runner.Run( "build" );
    }
}
