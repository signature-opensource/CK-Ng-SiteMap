using CK.Core;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Generic;
using System.Reflection;

var builder = WebApplication.CreateSlimBuilder( args );
var monitor = builder.GetBuilderMonitor();

builder.UseCKMonitoring();
builder.AddApplicationIdentityServiceConfiguration();

builder.Services.AddSpaStaticFiles( c => c.RootPath = "wwwroot" );

builder.AddWebFrontAuth( o =>
{
    o.ExpireTimeSpan = TimeSpan.FromHours( 1 );
    o.SlidingExpirationTime = TimeSpan.FromHours( 1 );
    o.SchemesCriticalTimeSpan = new Dictionary<string, TimeSpan> { { "Basic", TimeSpan.FromMinutes( 5 ) } };
} );

builder.Services.AddAuthorization();

var map = StObjContextRoot.Load( Assembly.GetExecutingAssembly(), monitor );
var cs = builder.Configuration["ConnectionStrings:SampleDB"];
if( cs is not null )
{
    Throw.CheckData( map is not null );
    var db = map.StObjs.Obtain<SqlDefaultDatabase>();
    Throw.CheckData( db is not null );
    db.ConnectionString = cs;
}

var app = builder.CKBuild( map );

// Configure the HTTP request pipeline.
if( !app.Environment.IsDevelopment() )
{
    app.UseExceptionHandler( "/Error" );
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
app.UseForwardedHeaders();
app.UseSpaStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseCris();
app.UseSpa( c =>
{
    if( builder.Environment.IsDevelopment() )
    {
        // Note that the proxy will spaz out for 2-3 seconds when using "localhost" instead of "127.0.0.1",
        // as it attempts to connect on IPv6 to [::1]:4200 instead of 127.0.0.1:4200,
        // and SPAs like ng serve usually don't listen on IPv6.
        // See: https://github.com/dotnet/aspnetcore/issues/18062
        c.UseProxyToSpaDevelopmentServer( "http://localhost:4200" );
    }
} );

await app.RunAsync().ConfigureAwait( false );
