using CK.Core;
using CK.Setup;
using CK.Testing;
using Microsoft.AspNetCore.Builder;
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
        // The application is its own AuthCenter (with its HTTP front).
        configuration.FirstBinPath.AddAuthCenterApplication();
        configuration.FirstBinPath.Assemblies.AddRange( [
            "CK.TS.Angular",
            "CK.Ng.Cris.AspNet.Authentication.Basic",
            "CK.DB.User.UserPassword",
            "CK.Ng.SiteMap"
            ] );
        var tsConfig = configuration.FirstBinPath.EnsureTypeScriptConfigurationAspect( targetProjectPath );
        Throw.DebugAssert( tsConfig.AspectConfiguration != null );
        tsConfig.AspectConfiguration.IgnoreVersionsBound = true;
        var map = (await configuration.RunSuccessfullyAsync()).LoadMap();

        await using var server = await WebApplication.CreateSlimBuilder().CreateRunningAuthCenterApplicationAsync( map );
        await using var runner = TestHelper.CreateTypeScriptRunner( targetProjectPath, server.ServerAddress );
        await TestHelper.SuspendAsync( resume => resume );
        runner.Run();
        runner.Run( "build" );
    }
}
