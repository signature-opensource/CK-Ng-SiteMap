# CK.Ng.SiteMap

## Breadcrumb

We are on a P page. 
The content of its "Children" list has to handle unreachable intermediate pages.
 
When no homonym issue exists, we display a marker that communicates the existence of unreachable intermediate pages.
.../P/X/Y/Z/Toto 	        => (…) Toto
.../P/(any path)/Tata 	    => (…) Tata

When there are homonyms (here the first reachable is "Toto"), we need to distinguish them:
 
.../P/C/D/E/F/Papa1/Toto    => (…Papa1) Toto
.../P/C/D/E/F/Papa2/Toto    => (…Papa2) Toto
 
.../P/C/D/E1/F/Papa/Toto    => (…E1…) Toto
.../P/C/D/E2/F/Papa/Toto    => (…E2…) Toto
 
.../P/E1/F/Papa/Toto        => (E1…) Toto
.../P/E2/F/Papa/Toto        => (E2…) Toto
