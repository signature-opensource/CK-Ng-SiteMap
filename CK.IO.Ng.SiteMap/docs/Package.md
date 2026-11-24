The site map of a user: `IGetSiteMapQCommand` returns an `ISiteMap` that contains only the web pages the user can
access.

`ISiteMap` holds the home page of the user (the page of its preferred workspace), its preferred pages, the pages
(`IWebPage`, ordered by path), their component types (`IWebPagePageComponentType`) and their points of view
(`IWebPagePointOfView`).
