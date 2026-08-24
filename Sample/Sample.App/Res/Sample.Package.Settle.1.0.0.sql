-------------------------------------------------------------
-- Workspaces
-------------------------------------------------------------

declare @W1Id int, @W2Id int, @W1AdminGroupId int, @W1AclId int, @W2AdminGroupId int, @W2AclId int;

exec CK.sWorkspaceCreate 1, N'Company', @W1Id output;
select @W1AdminGroupId = AdminGroupId,
       @W1AclId = AclId
    from CK.tWorkspace
    where WorkspaceId = @W1Id;

exec CK.sWorkspaceCreate 1, N'Sub-company', @W2Id output, @W1Id;
select @W2AdminGroupId = AdminGroupId,
       @W2AclId = AclId
    from CK.tWorkspace
    where WorkspaceId = @W2Id;

-------------------------------------------------------------
-- Users
-------------------------------------------------------------

-- Creation

declare @AdminId int, @User1Id int, @User2Id int;
exec CK.sUserCreate 1, N'Admin', @AdminId output;
exec CK.sUserPasswordUCL 1, @AdminId, 0x010000000100030D400000001052DD32D50DA7DAA6BFCC48A2F42AB388B9C4C46BE1978891F8E65FEC1C6189499E6EDF971806935AF61652E80F1062AD, 3, 0, null, null;
exec CK.sUserCreate 1, N'User 1', @User1Id output;
exec CK.sUserPasswordUCL 1, @User1Id, 0x010000000100030D400000001052DD32D50DA7DAA6BFCC48A2F42AB388B9C4C46BE1978891F8E65FEC1C6189499E6EDF971806935AF61652E80F1062AD, 3, 0, null, null;
exec CK.sUserCreate 1, N'User 2', @User2Id output;
exec CK.sUserPasswordUCL 1, @User2Id, 0x010000000100030D400000001052DD32D50DA7DAA6BFCC48A2F42AB388B9C4C46BE1978891F8E65FEC1C6189499E6EDF971806935AF61652E80F1062AD, 3, 0, null, null;

-- Assignment

exec CK.sGroupUserAdd 1, @W1AdminGroupId, @AdminId, 1;
exec CK.sUserPreferredWorkspaceIdSet 1, @AdminId, @W1Id;
exec CK.sGroupUserAdd 1, @W2AdminGroupId, @AdminId, 1;

exec CK.sGroupUserAdd 1, @W1Id, @User1Id;
exec CK.sUserPreferredWorkspaceIdSet 1, @User1Id, @W1Id;

exec CK.sGroupUserAdd 1, @W2Id, @User2Id, 1;
exec CK.sAclGrantSet 1, @W1AclId, @User2Id, 'User', 8;
exec CK.sUserPreferredWorkspaceIdSet 1, @User2Id, @W2Id;

-------------------------------------------------------------
-- Pages
-------------------------------------------------------------

/*

Pages navigation tree:

Company
├─ archives (hidden) → dossiers (hidden) → confidentiel-rh (hidden) → "Rapport Annuel"
│     => Company > (…) > Rapport Annuel   (3 consecutive hidden parents, no homonym)
│
├─ confidentiel (hidden)
│  └─ filiale (hidden)
│     ├─ direction (hidden) → service (hidden)
│     │     ├─ chef-a (hidden) → "Budget"     => (…chef-a) Budget
│     │     └─ chef-b (hidden) → "Budget"     => (…chef-b) Budget
│     ├─ equipe-nord (hidden) → bureau (hidden) → archive-dossier (hidden) → "Contrat"
│     │     => (…equipe-nord…) Contrat
│     └─ equipe-sud (hidden) → bureau (hidden) → archive-dossier (hidden) → "Contrat"
│           => (…equipe-sud…) Contrat
│
├─ equipe-est (hidden) → guichet (hidden) → dossier-x (hidden) → "Note"
│     => (equipe-est…) Note
└─ equipe-ouest (hidden) → guichet (hidden) → dossier-x (hidden) → "Note"
      => (equipe-ouest…) Note

Sub-company
└─ prive (hidden) → interne (hidden) → restreint (hidden) → "Note de Service"
      => Sub-company > (…) > Note de Service

The "hidden" pages are granted only to the Administrators group of each
workspace (see @W1HiddenAclId / @W2HiddenAclId below): they are therefore
invisible to User 1 / User 2 and appear as non-clickable segments in their
breadcrumb.

*/

-- Component Type

declare @WorkspacePageTypeId int;
exec CK.sWebPageComponentTypeCreate 1, 'workspace-page', @WorkspacePageTypeId output;

declare @SimplePageTypeId int;
exec CK.sWebPageComponentTypeCreate 1, 'simple-page', @SimplePageTypeId output;

-- Workspaces page

declare @P1 int, @P2 int;

exec CK.sWorkspacePagePlug 1, @W1Id, @P1 output;
update CK.tWebPage
    set ComponentTypeId = @WorkspacePageTypeId
    where PageId = @P1;

exec CK.sWorkspacePagePlug 1, @W2Id, @P2 output;
update CK.tWebPage
    set ComponentTypeId = @WorkspacePageTypeId
    where PageId = @P2;

-- Pages

-- Acl dedicated to hidden pages (visible only to the Administrators of each workspace)

declare @W1HiddenAclId int, @W2HiddenAclId int;

exec CK.sAclCreate 1, @W1HiddenAclId output;
exec CK.sAclGrantSet 1, @W1HiddenAclId, @W1AdminGroupId, 'Workspace.Administrator.Level', 127;
exec CK.sAclGrantSet 1, @W1HiddenAclId, 2, 'Platform.Administrator', 127;

exec CK.sAclCreate 1, @W2HiddenAclId output;
exec CK.sAclGrantSet 1, @W2HiddenAclId, @W2AdminGroupId, 'Workspace.Administrator.Level', 127;
exec CK.sAclGrantSet 1, @W2HiddenAclId, 2, 'Platform.Administrator', 127;

-- Scenario "(…) Page" + 3 consecutive hidden parents: Company > (…) > Rapport Annuel

declare @ArchivesId int, @DossiersId int, @ConfidentielRhId int, @RapportId int;
exec CK.sWebPageCreate 1, @P1, 'archives', N'Archives', @W1HiddenAclId, @SimplePageTypeId, @ArchivesId output;
exec CK.sWebPageCreate 1, @ArchivesId, 'dossiers', N'Dossiers', @W1HiddenAclId, @SimplePageTypeId, @DossiersId output;
exec CK.sWebPageCreate 1, @DossiersId, 'confidentiel-rh', N'Confidentiel RH', @W1HiddenAclId, @SimplePageTypeId, @ConfidentielRhId output;
exec CK.sWebPageCreate 1, @ConfidentielRhId, 'rapport', N'Rapport Annuel', @W1AclId, @SimplePageTypeId, @RapportId output;

-- Scenario "(…Ancestor) Page": "Budget" homonyms, only the last ancestor (chef-a / chef-b) differs

declare @ConfidentielId int, @FilialeId int, @DirectionId int, @ServiceId int, @ChefAId int, @ChefBId int, @BudgetAId int, @BudgetBId int;
exec CK.sWebPageCreate 1, @P1, 'confidentiel', N'Confidentiel', @W1HiddenAclId, @SimplePageTypeId, @ConfidentielId output;
exec CK.sWebPageCreate 1, @ConfidentielId, 'filiale', N'Filiale', @W1HiddenAclId, @SimplePageTypeId, @FilialeId output;
exec CK.sWebPageCreate 1, @FilialeId, 'direction', N'Direction', @W1HiddenAclId, @SimplePageTypeId, @DirectionId output;
exec CK.sWebPageCreate 1, @DirectionId, 'service', N'Service', @W1HiddenAclId, @SimplePageTypeId, @ServiceId output;
exec CK.sWebPageCreate 1, @ServiceId, 'chef-a', N'Chef A', @W1HiddenAclId, @SimplePageTypeId, @ChefAId output;
exec CK.sWebPageCreate 1, @ChefAId, 'budget', N'Budget', @W1AclId, @SimplePageTypeId, @BudgetAId output;
exec CK.sWebPageCreate 1, @ServiceId, 'chef-b', N'Chef B', @W1HiddenAclId, @SimplePageTypeId, @ChefBId output;
exec CK.sWebPageCreate 1, @ChefBId, 'budget', N'Budget', @W1AclId, @SimplePageTypeId, @BudgetBId output;

-- Scenario "(…Ancestor…) Page": "Contrat" homonyms, common prefix (filiale) and suffix
-- (bureau/archive-dossier), only equipe-nord / equipe-sud differs in the middle

declare @EquipeNordId int, @BureauNordId int, @ArchiveDossierNordId int, @ContratNordId int;
declare @EquipeSudId int, @BureauSudId int, @ArchiveDossierSudId int, @ContratSudId int;

exec CK.sWebPageCreate 1, @FilialeId, 'equipe-nord', N'Equipe Nord', @W1HiddenAclId, @SimplePageTypeId, @EquipeNordId output;
exec CK.sWebPageCreate 1, @EquipeNordId, 'bureau', N'Bureau', @W1HiddenAclId, @SimplePageTypeId, @BureauNordId output;
exec CK.sWebPageCreate 1, @BureauNordId, 'archive-dossier', N'Archive Dossier', @W1HiddenAclId, @SimplePageTypeId, @ArchiveDossierNordId output;
exec CK.sWebPageCreate 1, @ArchiveDossierNordId, 'contrat', N'Contrat', @W1AclId, @SimplePageTypeId, @ContratNordId output;

exec CK.sWebPageCreate 1, @FilialeId, 'equipe-sud', N'Equipe Sud', @W1HiddenAclId, @SimplePageTypeId, @EquipeSudId output;
exec CK.sWebPageCreate 1, @EquipeSudId, 'bureau', N'Bureau', @W1HiddenAclId, @SimplePageTypeId, @BureauSudId output;
exec CK.sWebPageCreate 1, @BureauSudId, 'archive-dossier', N'Archive Dossier', @W1HiddenAclId, @SimplePageTypeId, @ArchiveDossierSudId output;
exec CK.sWebPageCreate 1, @ArchiveDossierSudId, 'contrat', N'Contrat', @W1AclId, @SimplePageTypeId, @ContratSudId output;

-- Scenario "(Ancestor…) Page": "Note" homonyms, only the first ancestor (equipe-est / equipe-ouest,
-- directly under Company) differs, the guichet/dossier-x suffix is common

declare @EquipeEstId int, @GuichetEstId int, @DossierXEstId int, @NoteEstId int;
declare @EquipeOuestId int, @GuichetOuestId int, @DossierXOuestId int, @NoteOuestId int;

exec CK.sWebPageCreate 1, @P1, 'equipe-est', N'Equipe Est', @W1HiddenAclId, @SimplePageTypeId, @EquipeEstId output;
exec CK.sWebPageCreate 1, @EquipeEstId, 'guichet', N'Guichet', @W1HiddenAclId, @SimplePageTypeId, @GuichetEstId output;
exec CK.sWebPageCreate 1, @GuichetEstId, 'dossier-x', N'Dossier X', @W1HiddenAclId, @SimplePageTypeId, @DossierXEstId output;
exec CK.sWebPageCreate 1, @DossierXEstId, 'note', N'Note', @W1AclId, @SimplePageTypeId, @NoteEstId output;

exec CK.sWebPageCreate 1, @P1, 'equipe-ouest', N'Equipe Ouest', @W1HiddenAclId, @SimplePageTypeId, @EquipeOuestId output;
exec CK.sWebPageCreate 1, @EquipeOuestId, 'guichet', N'Guichet', @W1HiddenAclId, @SimplePageTypeId, @GuichetOuestId output;
exec CK.sWebPageCreate 1, @GuichetOuestId, 'dossier-x', N'Dossier X', @W1HiddenAclId, @SimplePageTypeId, @DossierXOuestId output;
exec CK.sWebPageCreate 1, @DossierXOuestId, 'note', N'Note', @W1AclId, @SimplePageTypeId, @NoteOuestId output;

-- Sub-company: small mirror tree for User 2, "(…) Page" + 3 consecutive hidden parents

declare @PriveId int, @InterneId int, @RestreintId int, @NoteServiceId int;
exec CK.sWebPageCreate 1, @P2, 'prive', N'Prive', @W2HiddenAclId, @SimplePageTypeId, @PriveId output;
exec CK.sWebPageCreate 1, @PriveId, 'interne', N'Interne', @W2HiddenAclId, @SimplePageTypeId, @InterneId output;
exec CK.sWebPageCreate 1, @InterneId, 'restreint', N'Restreint', @W2HiddenAclId, @SimplePageTypeId, @RestreintId output;
exec CK.sWebPageCreate 1, @RestreintId, 'note-service', N'Note de Service', @W2AclId, @SimplePageTypeId, @NoteServiceId output;
