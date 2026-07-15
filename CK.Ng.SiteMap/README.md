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

## Fil principal (breadcrumb bar)

`minItemsShow` (côté `ck-backoffice-breadcrumb`) tronque le fil affiché aux N derniers éléments,
sans distinguer clickable / non-clickable. Pour qu'une chaîne profonde de segments non-clickables
ne finisse pas par pousser un ancêtre clickable hors de la fenêtre visible (le rendant
inaccessible), tout groupe de 2 segments non-clickables consécutifs ou plus, dans le fil principal,
est remplacé par un unique item `(…)`. Un segment non-clickable isolé (aucun voisin non-clickable)
garde son nom brut. Le dropdown de `(…)` reprend celui déjà calculé pour le premier segment du
groupe.

Avec `Company` et `Toto` seuls clickables :
```
Company/P/C/D/E1/F/Papa/Toto
Company/P/C/D/E2/F/Papa/Toto
```
=> fil principal : `Company > (…) > Toto`
=> dropdown de `Company` (inchangé) : `(…E1…) Toto`, `(…E2…) Toto`
=> dropdown de `(…)` : identique à celui de `P`, soit ici `(…E1…) Toto`, `(…E2…) Toto`
