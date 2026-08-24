using CK.Core;

namespace Sample.App;

[SqlPackage( FullName = "Sample.Package", Schema = "Sample", ResourcePath = "Res" )]
[Versions( "1.0.0" )]
public abstract class Package : SqlPackage
{
    void StObjConstruct( CK.DB.HWorkspace.Page.Package pkg )
    {
    }
}
