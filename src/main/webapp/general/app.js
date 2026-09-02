/*
 This file is generated and updated by Sencha Cmd. You can edit this file as
 needed for your application, but these edits will have to be merged by
 Sencha Cmd when upgrading.
 */

/* global Ext */

// DO NOT DELETE - this directive is required for Sencha Cmd packages to work. 
//@require @packageOverrides
if (Ext.repoDevMode) {
    document.write('<link rel="stylesheet" type="text/css" href="../build/testextjs/ext-theme-' +
            Ext.themeName + '/resources/testextjs-all.css"/>');
}

Ext.Loader.setConfig({
    enabled: true,
    disableCaching: false,
    paths: {
        'testextjs': '/prestige/general/app'
        //,'Ext.ux': '/prestige/general/ux'
    }
});

Ext.Loader.setPath('testextjs', '/prestige/general/app');
//Ext.Loader.setPath('Ext.ux', '/prestige/general/ux');

Ext.application({
    name: 'testextjs',
    appFolder: '/prestige/general/app',
    
    requires: [
        'Ext.util.History',
        'testextjs.view.Header',
        'testextjs.view.Navigation',
        'testextjs.view.Main',
        'testextjs.view.window.BasicWindow',
        'testextjs.view.sm_user.user.UserManager',
        'testextjs.view.sm_user.role.RoleManager',
        'testextjs.view.sm_user.role.action.add',
        'testextjs.view.sm_user.role.action.addPrivilegeBis',
        'testextjs.view.sm_user.privilege.PrivilegeManager',
        'testextjs.view.sm_user.module.ModuleManager',
        'testextjs.view.sm_user.menu.MenuManager',
        'testextjs.view.sm_user.sous_menu.SousmenuManager',
        'testextjs.view.sm_user.menu.action.add',
        'testextjs.view.sm_user.sous_menu.action.add',
        'testextjs.model.Role',
        'testextjs.model.Utilisateur',
        'testextjs.view.sm_user.user.action.addpwd',
        'testextjs.view.sm_user.user.action.add',
        'testextjs.store.Statut',
        'testextjs.model.Statut',
        'testextjs.view.sm_user.user.action.addpwd',
        'testextjs.view.sm_user.user.action.add',
        'testextjs.view.sm_user.skin.SkinManager',
        'testextjs.view.sm_user.skin.action.add',
        'testextjs.view.sm_user.language.action.add',
        'testextjs.view.sm_user.language.LanguageManager',
        'testextjs.view.sm_user.role.action.addPrivilege',
        'testextjs.view.sm_user.role.action.addPrivilegeItem',
        'testextjs.model.Notification',
        'testextjs.view.sm_user.notification.NotificationManager',
        'testextjs.view.sm_user.about.AboutManager',
        'testextjs.model.UserPhone',
        'testextjs.view.sm_user.user_phone.action.add',
        'testextjs.view.sm_user.user_phone.UserphoneManager',
        'testextjs.view.sm_user.alertevent.AlerteventManager',
        'testextjs.model.Alertevent',
        'testextjs.view.sm_user.alertevent.action.add',
        'testextjs.view.sm_user.alertevent.action.adduserphonealertevent',
        'testextjs.model.Userphonealertevent',
        'testextjs.view.sm_user.alertevent.action.adduserphonetoalert',
        'testextjs.model.Outboudmessage',
        'testextjs.view.sm_user.outboudmessage.OutboudmessageManager',
        'testextjs.model.Preenregistrement',
        'testextjs.view.sm_user.role.RoleManager',
        'testextjs.view.sm_user.privilege.PrivilegeManager',
        'testextjs.view.sm_user.module.ModuleManager',
        'testextjs.view.sm_user.menu.MenuManager',
        'testextjs.view.sm_user.sous_menu.SousmenuManager',
        'testextjs.view.sm_user.menu.action.add',
        'testextjs.view.sm_user.sous_menu.action.add',
        'testextjs.model.Role',
        'testextjs.model.Utilisateur',
        'testextjs.view.sm_user.user.action.addpwd',
        'testextjs.view.sm_user.user.action.add',
        'testextjs.store.Statut',
        'testextjs.model.Statut',
        'testextjs.view.sm_user.user.action.addpwd',
        'testextjs.view.sm_user.user.action.add',
        'testextjs.view.sm_user.skin.SkinManager',
        'testextjs.view.sm_user.skin.action.add',
        'testextjs.view.sm_user.language.action.add',
        'testextjs.view.sm_user.language.LanguageManager',
        'testextjs.view.sm_user.role.action.addPrivilege',
        'testextjs.view.sm_user.role.action.addPrivilegeItem',
        'testextjs.model.Notification',
        'testextjs.view.sm_user.notification.NotificationManager',
        'testextjs.view.sm_user.about.AboutManager',
        'testextjs.model.Preenregistrement',
        'testextjs.view.sm_user.detailsvente.DetailsVenteManager',
        'testextjs.model.DetailsVente',
        'testextjs.view.sm_user.detailsvente.action.add',
        'testextjs.model.GroupeFamille',
        'testextjs.view.configmanagement.groupefamille.GroupeFamilleManager',
        'testextjs.view.configmanagement.groupefamille.action.add',
        'testextjs.view.Promotions.PromotionManager',
        'testextjs.view.Promotions.PromotionHistoryManager',
        'Ext.util.History',
        'testextjs.view.Header',
        'testextjs.view.Navigation',
        'testextjs.view.Main',
        'testextjs.view.window.BasicWindow',
        'testextjs.view.sm_user.user.UserManager',
        'testextjs.view.sm_user.role.RoleManager',
        'testextjs.view.sm_user.privilege.PrivilegeManager',
        'testextjs.view.sm_user.module.ModuleManager',
        'testextjs.view.sm_user.menu.MenuManager',
        'testextjs.view.sm_user.sous_menu.SousmenuManager',
        'testextjs.view.sm_user.menu.action.add',
        'testextjs.view.sm_user.sous_menu.action.add',
        'testextjs.model.Role',
        'testextjs.model.Utilisateur',
        'testextjs.view.sm_user.user.action.addpwd',
        'testextjs.view.sm_user.user.action.add',
        'testextjs.store.Statut',
        'testextjs.model.Statut',
        'testextjs.view.sm_user.user.action.addpwd',
        'testextjs.view.sm_user.user.action.add',
        'testextjs.view.sm_user.skin.SkinManager',
        'testextjs.view.sm_user.skin.action.add',
        'testextjs.view.sm_user.language.action.add',
        'testextjs.view.sm_user.language.LanguageManager',
        'testextjs.model.dd.Simple',
        'testextjs.view.sm_user.role.action.addPrivilege',
        'testextjs.view.sm_user.role.action.addPrivilegeItem',
        'testextjs.model.Notification',
        'testextjs.view.sm_user.notification.NotificationManager',
        'testextjs.view.sm_user.myaccount.MyaccountManager',
        'testextjs.view.sm_user.about.AboutManager',
        'testextjs.model.Preenregistrement',
        'testextjs.view.sm_user.dovente.action.displayAyantDroit',
        'testextjs.model.Famille',
        'testextjs.view.configmanagement.famille.FamilleManager',

        'testextjs.view.configmanagement.famille.action.add',
        'testextjs.view.configmanagement.famille.action.maxVente',
        'testextjs.model.StatVenteFamille',
        //optimisation quantité
        'testextjs.model.OptimisationQuantite',
        'testextjs.view.configmanagement.optimisationquantite.OptimisationQuantiteManager',
        'testextjs.view.configmanagement.optimisationquantite.action.add',
        //code gestion
        'testextjs.model.CodeGestion',
        'testextjs.view.configmanagement.codegestion.CodeGestionManager',
        'testextjs.view.configmanagement.codegestion.action.add',
        //code contre indication
        'testextjs.model.ContreIndication',
        'testextjs.view.configmanagement.contreindication.ContreIndicationManager',
        'testextjs.view.configmanagement.contreindication.action.add',
        //tranche
        'testextjs.model.Tranche',
        'testextjs.view.configmanagement.tranche.TrancheManager',
        'testextjs.view.configmanagement.tranche.action.add',
        //type societe
        'testextjs.model.TypeSociete',
        'testextjs.view.configmanagement.typesociete.TypeSocieteManager',
        'testextjs.view.configmanagement.tranche.action.add',
        //type remise
        'testextjs.model.TypeRemise',
        'testextjs.view.configmanagement.typeremise.TypeRemiseManager',
        'testextjs.view.configmanagement.typeremise.action.add',
        //Categorie ayant droit
        'testextjs.model.CategorieAyantdroit',
        'testextjs.view.configmanagement.categorieayantdroit.CategorieAyantdroitManager',
        'testextjs.view.configmanagement.categorieayantdroit.action.add',
        //Categorie Dossier tiers payant
        'testextjs.model.DossierTiersPayant',
        'testextjs.view.configmanagement.dossiertierspayant.DossierTiersPayantManager',
        'testextjs.view.configmanagement.dossiertierspayant.action.add',
        //Escompte Societe
        'testextjs.model.EscompteSociete',
        'testextjs.view.configmanagement.escomptesociete.EscompteSocieteManager',
        'testextjs.view.configmanagement.escomptesociete.action.add',
        //ville
        'testextjs.model.Ville',
        'testextjs.view.configmanagement.ville.VilleManager',
        'testextjs.view.configmanagement.ville.action.add',
        //grossiste
        'testextjs.model.Grossiste',
        'testextjs.view.configmanagement.grossiste.GrossisteManager',
        'testextjs.view.configmanagement.grossiste.action.add',
        //remise
        'testextjs.model.Remise',
        'testextjs.view.configmanagement.remise.RemiseManager',
        'testextjs.view.configmanagement.remise.action.add',
        //risque
        'testextjs.model.Risque',
        'testextjs.view.configmanagement.risque.RisqueManager',
        'testextjs.view.configmanagement.risque.action.add',
        //Type risque
        'testextjs.model.Typerisque',
        'testextjs.view.configmanagement.typerisque.TyperisqueManager',
        'testextjs.view.configmanagement.typerisque.action.add',
        //Regime caisse
        'testextjs.model.Regimecaisse',
        'testextjs.view.configmanagement.regimecaisse.RegimecaisseManager',
        'testextjs.view.configmanagement.regimecaisse.action.add',
        // Medecin
        'testextjs.model.Medecin',
        'testextjs.view.configmanagement.medecin.MedecinManager',
        'testextjs.view.configmanagement.medecin.action.add',
        // type tiers payant
        'testextjs.model.TypeTiersPayant',
        'testextjs.view.tierspayantmanagement.typetierspayant.TypeTiersPayantManager',
        'testextjs.view.tierspayantmanagement.typetierspayant.action.add',
        'testextjs.view.tierspayantmanagement.tierspayant.action.addPhoto',
        // tiers payant
        'testextjs.model.TiersPayant',
        'testextjs.view.tierspayantmanagement.tierspayant.TiersPayantManager',
        'testextjs.view.tierspayantmanagement.tierspayant.action.add',
        'testextjs.view.tierspayantmanagement.balanceagee_detail.action.detailTransactionClient',
        'testextjs.view.tierspayantmanagement.balanceagee_detail.BalanceageeRecapitulatifDetailManager',
        'testextjs.view.tierspayantmanagement.balanceagee.BalanceageeManager',
        // client
        'testextjs.model.Client',
        'testextjs.view.configmanagement.client.action.add',
        'testextjs.view.configmanagement.client.ClientManager',
        'testextjs.view.configmanagement.client.SuiviConsoClients',
        'testextjs.view.configmanagement.client.ClientTabPanel',
        'testextjs.view.sm_user.client.ClientManager',
        'testextjs.view.sm_user.mainmenu.MainMenuManager',
        'testextjs.view.configmanagement.client.action.addmedecin',

        'testextjs.model.Warehouse',
        'testextjs.view.sm_user.entreestock.EntreestockManager',
        'testextjs.view.sm_user.entreestock.action.add',
        // Etat du stock
        'testextjs.model.Productitemstock',
        'testextjs.view.sm_user.etatstock.EtatstockManager',

// Caisse

        'testextjs.view.sm_user.coffrecaisse.CoffrecaisseManager',
        'testextjs.view.sm_user.ouverturecaisse.OuverturecaisseManager',
        'testextjs.model.Ouverturecaisse',
        'testextjs.model.Caisse',
        'testextjs.view.sm_user.caisse.CaisseManager',
        // 'testextjs.model.Caisse',
        'testextjs.model.ResumeCaisse',
        'testextjs.model.Familleorder',
        'testextjs.view.sm_user.familleorder.FamilleOrderManager',
        'testextjs.view.sm_user.familleorder.action.add',
        // Gerer Famille Order
        'testextjs.model.Warehouseorder',
        'testextjs.view.sm_user.warehouseorder.WarehouseOrderManager',
        // preenregistrementcompteclient
        'testextjs.model.Preenregistrementcompteclient',
        'testextjs.view.sm_user.preenregistrementcompteclient.PreenregistrementcompteclientManager',
        // preenregistrementcompteclienttierspayant
        'testextjs.model.Preenregistrementcompteclienttierspayant',
        'testextjs.view.sm_user.preenregistrementcompteclienttierspayant.PreenregistrementcompteclienttierspayantManager',
        'testextjs.model.TypeVente',
        'testextjs.view.sm_user.dovente.action.addclt',
        'testextjs.view.sm_user.dovente.action.addtp',
        'testextjs.view.sm_user.dovente.action.addTiersPayant',
        'testextjs.view.sm_user.dovente.action.addTiersPayantItem',
        'testextjs.model.VPropositionCde',
        'testextjs.model.CodeGestion',
        'testextjs.model.CodeActe',
      
        'testextjs.view.configmanagement.client.action.infoCompte',

        'testextjs.model.EscompteSocieteTranche',
        //retrocession
        'testextjs.view.sm_user.retrocession.retrocessionManager',
        'testextjs.model.Retrocession',

        'testextjs.model.DetailsVenteRetrocession',
        'testextjs.model.Tva',
        'testextjs.view.sm_user.doventeretrocession.ShowDetailRetrocessionManager',
        // Gerer Famille Order
        'testextjs.model.Familleorder',
        'testextjs.view.sm_user.familleorder.FamilleOrderManager',
        'testextjs.view.sm_user.familleorder.action.add',
        // Gerer Famille Order
        'testextjs.model.Warehouseorder',
        'testextjs.view.sm_user.warehouseorder.WarehouseOrderManager',
        // preenregistrementcompteclient
        'testextjs.model.Preenregistrementcompteclient',
        'testextjs.view.sm_user.preenregistrementcompteclient.PreenregistrementcompteclientManager',
        // preenregistrementcompteclienttierspayant
        'testextjs.model.Preenregistrementcompteclienttierspayant',
        'testextjs.view.sm_user.preenregistrementcompteclienttierspayant.PreenregistrementcompteclienttierspayantManager',
        'testextjs.model.TypeVente',
        'testextjs.view.sm_user.dovente.action.addclt',
        'testextjs.view.sm_user.dovente.action.addtp',
        'testextjs.view.sm_user.dovente.action.addTiersPayant',
        'testextjs.view.sm_user.dovente.action.addTiersPayantItem',
        'testextjs.model.VPropositionCde',
        'testextjs.model.CodeGestion',
        'testextjs.model.CodeActe',
        'testextjs.model.ZoneGeographique',
        'testextjs.view.configmanagement.client.action.infoCompte',
        // 'testextjs.view.sm_user.contregisterorder.ContregisterorderManager'
        'testextjs.view.sm_user.retrocession.retrocessionManager',
        'testextjs.model.Retrocession',
        'testextjs.view.sm_user.doventeretrocession.DoventeRetrocessionManager',

        // Famille
        'testextjs.view.configmanagement.famillearticle.action.add',
        'testextjs.view.configmanagement.famille.action.addfamillegrossiste',
        'testextjs.model.FamilleArticle',
        'testextjs.view.configmanagement.famillearticle.FamilleArticleManager',
        'testextjs.model.FamilleGrossiste',
        'testextjs.view.configmanagement.famille.action.addgrossiste',
     
        'testextjs.view.configmanagement.zonegeographique.ZoneGeographiqueManager',
        'testextjs.view.configmanagement.zonegeographique.action.add',
        // Representant grossiste
        'testextjs.model.Representantgrossiste',
        'testextjs.view.configmanagement.representantgrossiste.RepresentantGrossisteManager',
        'testextjs.view.configmanagement.representantgrossiste.action.add',
        // Ayant Droit
        'testextjs.model.AyantDroit',
        'testextjs.view.configmanagement.ayantdroit.AyantDroitManager',
        'testextjs.view.configmanagement.ayantdroit.action.add',
        'testextjs.view.configmanagement.client.action.addcltayantdroit',
        'testextjs.view.configmanagement.client.action.showclttierspayant',
        'testextjs.view.configmanagement.compteclient.action.addclttierspayant',
        'testextjs.view.sm_user.retrocession.retrocessionManager',
        'testextjs.model.Retrocession',

        'testextjs.model.DetailsVenteRetrocession',
        'testextjs.model.Tva',

        'testextjs.view.sm_user.retrocession.action.addClient',
        'testextjs.view.sm_user.retrocession.ConfrereManager',
        // Gerer Famille Order
        'testextjs.model.Familleorder',
        'testextjs.view.sm_user.familleorder.FamilleOrderManager',
        'testextjs.view.sm_user.familleorder.action.add',
        // Gerer Famille Order
        'testextjs.model.Warehouseorder',
        'testextjs.view.sm_user.warehouseorder.WarehouseOrderManager',
        // preenregistrementcompteclient
        'testextjs.model.Preenregistrementcompteclient',
        'testextjs.view.sm_user.preenregistrementcompteclient.PreenregistrementcompteclientManager',
        // preenregistrementcompteclienttierspayant
        'testextjs.model.Preenregistrementcompteclienttierspayant',
        'testextjs.view.sm_user.preenregistrementcompteclienttierspayant.PreenregistrementcompteclienttierspayantManager',
        'testextjs.model.TypeVente',
        'testextjs.view.sm_user.dovente.action.addclt',
        'testextjs.view.sm_user.dovente.action.addtp',
        'testextjs.view.sm_user.dovente.action.addTiersPayant',
        'testextjs.view.sm_user.dovente.action.addTiersPayantItem',
        'testextjs.model.VPropositionCde',
        'testextjs.model.CodeGestion',
        'testextjs.model.CodeActe',
      
        'testextjs.view.configmanagement.client.action.infoCompte',
        'testextjs.view.sm_user.retrocession.retrocessionManager',
        'testextjs.model.Retrocession',

        // Famille
        'testextjs.view.configmanagement.famillearticle.action.add',
        'testextjs.model.FamilleArticle',
        'testextjs.view.configmanagement.famillearticle.FamilleArticleManager',
        'testextjs.view.configmanagement.famille.action.detailArticle',
       
        'testextjs.view.configmanagement.zonegeographique.action.add',
        // Representant grossiste
        'testextjs.model.Representantgrossiste',
        'testextjs.view.configmanagement.representantgrossiste.RepresentantGrossisteManager',
        'testextjs.view.configmanagement.representantgrossiste.action.add',
        // Ayant Droit
        'testextjs.model.AyantDroit',
        'testextjs.view.configmanagement.ayantdroit.AyantDroitManager',
        'testextjs.view.configmanagement.ayantdroit.action.add',
        'testextjs.view.configmanagement.client.action.addcltayantdroit',
        'testextjs.view.configmanagement.client.action.showclttierspayant',
        'testextjs.view.configmanagement.compteclient.action.addclttierspayant',

        'testextjs.model.GrilleRemise',
        'testextjs.view.configmanagement.grilleremise.GrilleRemiseManager',
        'testextjs.view.configmanagement.grilleremise.action.add',
        //facturation tiers payant
        'testextjs.model.FacturationClientTierspayant',
        'testextjs.view.tierspayantmanagement.facturationtierspayant.FacturationTiersPayantManager',
        'testextjs.view.tierspayantmanagement.facturationtierspayant.action.detailTransactionClient',
        'testextjs.model.GrilleRemise',
        'testextjs.view.configmanagement.grilleremise.GrilleRemiseManager',
        'testextjs.view.configmanagement.grilleremise.action.add',
        //gestion de stock
        'testextjs.model.FamilleStock',
        'testextjs.view.stockmanagement.etatstock.EtatStockManager',
        'testextjs.view.stockmanagement.etatstock.action.add',
        'testextjs.view.stockmanagement.evolutionstock.EvolutionStock',
        'testextjs.view.vente.SuppressionsVente',
        'testextjs.view.vente.VentesModifieesManager',
        'testextjs.view.produits.GestionSurstock',
        'testextjs.view.stockmanagement.suivistockvente.SuiviStockVenteManager',
        'testextjs.view.stockmanagement.perime.PerimeManager',
        'testextjs.view.stockmanagement.suivistockvente.EvaluationVenteMoyenneManager',
        'testextjs.view.stockmanagement.suivistockvente.SuiviDetailStockVenteManager',
        'testextjs.view.stockmanagement.etatstock.action.editjourvente',
        // 
        'testextjs.model.GrilleRemise',
        'testextjs.model.Workflowremisearticle',
        'testextjs.view.configmanagement.workflowremisearticle.WorkflowremisearticleManager',
        'testextjs.view.configmanagement.workflowremisearticle.action.add',
        // GESTION DES COMMANDES
        'testextjs.model.RuptureFournisseur',
        'testextjs.view.commandemanagement.rupturefournisseur.RuptureFournisseurManager',
        'testextjs.view.commandemanagement.etats.EtatControleManager',
        'testextjs.model.EtatControle',
        'testextjs.view.configmanagement.grossiste.action.grossisteview',
        'testextjs.view.commandemanagement.order.action.editgrossiste',
        'testextjs.view.commandemanagement.bonlivraison.action.editprice',
        'testextjs.view.commandemanagement.retourfournisseur.retourFrsManager',
        'testextjs.view.commandemanagement.retourfournisseur.action.add',
        'testextjs.model.RetourFournisseur',
        'testextjs.model.RetourFournisseurDetail',
        'testextjs.view.configmanagement.motifretour.MotifRetourManager',
        'testextjs.model.MotifRetour',
        'testextjs.view.configmanagement.motifretour.action.add',
        'testextjs.view.commandemanagement.cmde_passees.action.add',
        'testextjs.model.BonLivraison',

        'testextjs.model.Suggestion',
        'testextjs.model.SuggestionOrder',
        'testextjs.model.Order',
        'testextjs.view.commandemanagement.bonlivraison.action.add',
        'testextjs.view.commandemanagement.order.OrderManager',
        'testextjs.view.commandemanagement.order.action.add',
        'testextjs.model.TSuggestionOrderDetails',
        'testextjs.model.OrderDetail',

        'testextjs.view.sm_user.suggerercde.SuggerercdeManager',

        'testextjs.view.commandemanagement.suggestion.Suggestion_Manager',
        'testextjs.view.commandemanagement.bonlivraison.BonLivraisonManager',
        //  Fiche Societe
        'testextjs.model.FicheSociete',
        'testextjs.view.configmanagement.fichesociete.FicheSocieteManager',
        'testextjs.view.configmanagement.ville.VilleManager',
        'testextjs.view.configmanagement.escomptesociete.EscompteSocieteManager',
        'testextjs.view.configmanagement.fichesociete.action.add',
        'testextjs.view.configmanagement.fichesociete.action.add',

        'testextjs.model.Balance',
        //lot article
        'testextjs.view.configmanagement.lotarticle.LotManager',
        'testextjs.model.Lot',
        'testextjs.view.configmanagement.lotarticle.action.add',
        //Tableau
        'testextjs.view.configmanagement.tableau.TableauManager',
        'testextjs.model.Tableau',
        'testextjs.view.configmanagement.tableau.action.add',
        //DCI      
        'testextjs.view.configmanagement.dci.DciManager',
        'testextjs.model.Dci',
        'testextjs.view.configmanagement.dci.action.add',

        'testextjs.model.Etiquette',

        'testextjs.view.configmanagement.tauxmarque.TauxmarqueManager',
        'testextjs.model.TauxMarque',
        'testextjs.view.configmanagement.tauxmarque.action.add',
        'testextjs.model.Cashtransactiondata',

        //Forme Article
        'testextjs.model.Formearticle',
        'testextjs.view.configmanagement.formearticle.action.add',
        'testextjs.view.configmanagement.formearticle.FormeArticleManager',
        // Fabricant
        'testextjs.model.Fabriquant',
        'testextjs.view.configmanagement.fabriquant.action.add',
        'testextjs.view.configmanagement.fabriquant.FabricantManager',
        // Etat Article
        'testextjs.model.EtatArticle',
        'testextjs.view.configmanagement.etatarticle.action.add',
        'testextjs.view.configmanagement.etatarticle.EtatArticleManager',
        //Taux de Rembourssement
        'testextjs.model.Tauxrembourssement',
        'testextjs.view.configmanagement.tauxrembourssement.action.add',
        'testextjs.view.configmanagement.tauxrembourssement.TauxrembourssementManager',
        // WIZARD ARTICLE
        'testextjs.view.configmanagement.famille.action.infogenerale',
        'testextjs.view.configmanagement.famille.action.comptabilite',
        'testextjs.view.configmanagement.famille.action.autreinfos',
        // Specialite Medecin        
        'testextjs.model.Specialite',
        'testextjs.view.configmanagement.specialite.action.add',
        'testextjs.view.configmanagement.specialite.SpecialiteManager',
        //gestion des etiquettes
        'testextjs.model.Typeetiquette',
        'testextjs.view.stockmanagement.etiquette.EtiquetteManager',
        'testextjs.view.stockmanagement.etiquette.EtiquetteManager',
        'testextjs.view.stockmanagement.etiquette.action.printEtiquette',
        //gestion des inventaires
        'testextjs.view.stockmanagement.inventaire.InventaireManager',
        'testextjs.view.stockmanagement.inventaire.action.add',
        'testextjs.view.stockmanagement.inventaire.action.addBis',
        'testextjs.view.stockmanagement.inventaire.action.selectionCriteres',
        'testextjs.model.Inventaire',
        'testextjs.view.stockmanagement.inventaire.action.addArticle',
        'testextjs.view.stockmanagement.inventaire.action.editInventaireManager',
        'testextjs.view.stockmanagement.inventaire.action.detailInventaireManager',
        'testextjs.view.stockmanagement.inventaire.EcartInventaireManager',
        // Numero Caisse

        'testextjs.model.NumeroCaisse',
        'testextjs.view.configmanagement.numerocaisse.action.add',
        'testextjs.view.configmanagement.numerocaisse.NumeroCaisseManager',
        'testextjs.model.NumeroCaisse',
        'testextjs.view.configmanagement.numerocaisse.action.add',
        'testextjs.view.configmanagement.numerocaisse.NumeroCaisseManager',
        'testextjs.model.CentrePayeur',
        'testextjs.view.configmanagement.centrepayeur.action.add',
        'testextjs.view.configmanagement.centrepayeur.CentrePayeurManager',
        'testextjs.view.configmanagement.client.action.addMedecinClientItem',
        'testextjs.view.configmanagement.client.action.addMedecinClient',
        'testextjs.view.stockmanagement.perime.action.addDatePeromption',
        //gestion reserve
        'testextjs.view.stockmanagement.reserve.ReserveManager',
        'testextjs.view.stockmanagement.reserve.action.add',
        'testextjs.view.stockmanagement.reserve.action.addToReserve',
        'testextjs.view.stockmanagement.reserve.action.historique',
        'testextjs.view.stockmanagement.reserve.action.inventaireSelection',
        'testextjs.view.sm_user.diffclient.DiffManager',
        'testextjs.model.Differes',
        //gestion des depots

        'testextjs.view.stockmanagement.dodepot.action.addclt',
        'testextjs.view.stockmanagement.stockdepot.StockDepotManager',
        'testextjs.view.stockmanagement.stockdepot.action.add',
        'testextjs.view.stockmanagement.dodepot.action.add',
        //gestion des deconditionnements
        'testextjs.view.configmanagement.famille.action.doDecondition',
        'testextjs.model.ModeReglement',
        'testextjs.view.sm_user.dovente.action.displayArticle',
        'testextjs.view.sm_user.dovente.action.updateQuantity',
        'testextjs.view.sm_user.dovente.action.displayCustomer',
        'testextjs.view.sm_user.dovente.action.addAyant',
        'testextjs.model.Company',
        //gestion des lititges
        'testextjs.model.TypeLitige',
        'testextjs.model.Litige',
        'testextjs.view.configmanagement.litige.LitigeManager',
        'testextjs.view.configmanagement.litige.action.detailTransactionLitige',
        'testextjs.view.configmanagement.litige.action.add',
        'testextjs.view.configmanagement.litige.action.detailLitige',
        //balange agée
        'testextjs.view.tierspayantmanagement.balanceagee_detail.BalanceageeDetailManager',
        'testextjs.view.configmanagement.client.action.addClient',
        'testextjs.view.stockmanagement.etiquette.action.add',
        'testextjs.view.stockmanagement.etiquette.action.add',
        'testextjs.view.stockmanagement.perime.PerimeRemoveToStockManager',
        'testextjs.view.stockmanagement.perime.action.add',
        //facturation
        'testextjs.model.Facture',
        'testextjs.model.DetailFacture',
        'testextjs.model.DossierFacture',
        'testextjs.model.Bordereau',
        'testextjs.view.sm_user.editfacture.action.detailTransactionTiersPayant',
        'testextjs.view.sm_user.editfacture.action.detailTransactionFournisseur',
        'testextjs.view.sm_user.editfacture.EditFactureManager',
        'testextjs.view.sm_user.editfacture.action.add',
        'testextjs.model.TypeFacture',
        'testextjs.view.sm_user.editfacture.action.DetailFacture',
        'testextjs.view.sm_user.editbordereau.EditBordereaumanager',
        'testextjs.view.sm_user.editbordereau.action.add',
        'testextjs.view.sm_user.editfacture.action.DetailFactureFournisseur',
        'testextjs.view.sm_user.diffclient.action.BuyDiffere',
        'testextjs.view.sm_user.reglement.ReglementManager',
        'testextjs.view.sm_user.reglement.action.DoReglement',
        'testextjs.view.sm_user.reglement.action.displayDossier',
        'testextjs.view.sm_user.reglement.action.displayBordereau',
        'testextjs.view.sm_user.editfacture.action.DetaillBon',
        'testextjs.model.DetailBon',
        'testextjs.model.Reglement',
        'testextjs.view.sm_user.factureregle.FactureRegleManager',

        //Report

        'testextjs.model.Statistiquefamille',

        'testextjs.model.Statistiquevente',
        'testextjs.model.Statistiqueunitevendue',

        'testextjs.view.stockmanagement.suivistockvente.action.detailArticle',
        'testextjs.view.sm_user.caisse.action.DoBilletage',
        'testextjs.view.stockmanagement.suivistockvente.action.detailArticle',
        'testextjs.model.Mouvement',
        'testextjs.model.Journaldesventes',
        'testextjs.view.Report.journaldesventes.journaldesventesmanager',
        'testextjs.view.Report.analyseFrequentationOff.analyseFrequentationOffManager',
        'testextjs.model.AnalyseFrequentationOff',
        'testextjs.model.ListeDiffereClient',
        'testextjs.view.Report.listeDiffereClient.listeDiffereClientManager',
        'testextjs.view.Report.statActiviteOperateur.statActiviteOperateurManager',
        'testextjs.model.StatActiviteOperateur',

        'testextjs.model.TableauBordPharmacien',
        'testextjs.model.ComparaisonChiffreAffaire',
        'testextjs.view.Report.DossierEnAttenteEdition.DossierEnAttenteEditionManager',
        'testextjs.model.DossierEnAttenteEdition',
        'testextjs.view.Report.AbandonEtAnnulation.AbandonEtAnnulationManager',
        'testextjs.model.AbandonEtAnnulation',
        'testextjs.view.Report.ListeDeCaisseDetaille.ListeDeCaisseDetailleManager',
        'testextjs.model.ListeDeCaisseDetaille',
        'testextjs.model.BalanceVenteCaisse',
        'testextjs.view.Report.BalanceAgeDetaille.BalanceAgeDetailleManager',
        'testextjs.model.BalanceAgeDetaille',
        'testextjs.view.Report.BalanceAgeOrganisme.BalanceAgeOrganismeManager',
        'testextjs.model.BalanceAgeOrganisme',
        'testextjs.model.BalanceAgeGenerale',
        //emplacement
        'testextjs.view.configmanagement.emplacement.EmplacementManager',
        'testextjs.model.Emplacement',
        'testextjs.view.configmanagement.emplacement.action.add',
        //fin emplacement


        //suivi mouvement article
        'testextjs.view.stockmanagement.suivistockvente.action.detailVente',
        'testextjs.view.stockmanagement.suivistockvente.action.detailRetour',
        'testextjs.view.stockmanagement.suivistockvente.action.detailPerime',
        'testextjs.view.stockmanagement.suivistockvente.action.detailEntree',
        'testextjs.view.stockmanagement.suivistockvente.action.detailCommande',
        'testextjs.view.stockmanagement.suivistockvente.action.detailStock',
        //code tva
        'testextjs.model.CodeTva',
        'testextjs.model.BalanceAgee',
        'testextjs.view.sm_user.mvtcaisse.MvtCaisseManager',
        'testextjs.model.MvtCaisse',
        'testextjs.view.sm_user.mvtcaisse.action.add',
        'testextjs.model.TypeEcartMvt',
        'testextjs.view.configmanagement.client.action.addClientLast',
        'testextjs.view.sm_user.dovente.action.associateTiersPayantItem',
        'testextjs.view.sm_user.parameter.ParameterManager',
        'testextjs.view.sm_user.parameter.action.add',
        'testextjs.model.Parameter',
        'testextjs.view.configmanagement.parametreGeneraux.ParametreGenerauxManager',
        'testextjs.view.configmanagement.parametreGeneraux.action.maxVente',
        'testextjs.model.Dci_famille',
        //ajustement
        'testextjs.model.Ajustement',

        'testextjs.model.DetailsAjustement',

        'testextjs.view.stockmanagement.suivistockvente.action.detailOther',
        //fin ajustement

//suite commmande
        'testextjs.view.commandemanagement.order.action.importOrder',
        //gestion des imprimantes
        'testextjs.view.configmanagement.imprimantemanager.ImprimanteManager',
        'testextjs.model.Imprimante',
        'testextjs.view.configmanagement.imprimantemanager.action.add',
        'testextjs.view.configmanagement.famille.ArticleVendu',
        'testextjs.view.sm_user.user.action.addPrinter',
        'testextjs.view.sm_user.user.action.addUserPhone',
        'testextjs.view.sm_user.info_officine.OfficineManager',
        'testextjs.model.Officine',

        'testextjs.view.sm_user.mouvementprix.Mouvementprixvente',
        'testextjs.view.configmanagement.famille.action.add2',
        'testextjs.view.stockmanagement.suivistockvente.action.detailAjustement',
        'testextjs.view.stockmanagement.suivistockvente.action.detailInventaire',

        'testextjs.view.configmanagement.famille.action.export',
        'testextjs.model.ModelFacture',
        'testextjs.view.stockmanagement.retourdepot.retourdepotManager',
        'testextjs.view.stockmanagement.retourdepot.action.add',
        'testextjs.view.sm_user.journalvente.action.detailProduct',
      
        'testextjs.model.SnapshotFamille',
        'testextjs.view.sm_user.journalvente.FactureSubrogatoireManager',
        'testextjs.view.sm_user.privilege.action.add',
        'testextjs.model.Devise',
        'testextjs.view.configmanagement.devise.DeviseManager',
        'testextjs.view.configmanagement.devise.action.add',
        'testextjs.view.tierspayantmanagement.tierspayant.TiersPayantDesactiveManager',
        'testextjs.view.configmanagement.client.ClientDesactiveManager',
        'testextjs.view.stockmanagement.dodepot.action.importOrder',
        'testextjs.view.stockmanagement.etiquette.action.addBis',
        'testextjs.view.configmanagement.famille.action.detailArticleOther',
        'testextjs.view.sm_user.reglement.FactureenAttendeEditionManager',
        'testextjs.view.configmanagement.famille.action.updatezonegeo',
        'testextjs.view.stockmanagement.etatstock.action.removeLot',
        'testextjs.view.sm_user.outboudmessage.action.add',
        'testextjs.view.configmanagement.zonegeographique.action.changeProduitEmplacement',
        'testextjs.view.commandemanagement.evaluation.Evaluationoffreprix',
        'testextjs.view.commandemanagement.evaluation.action.add',
        'testextjs.view.configmanagement.famille.ArticleVenduBis',
        'testextjs.view.commandemanagement.retourfournisseur.action.reponseretourfournisseur',
       

        'testextjs.view.configmanagement.famille.action.importOrder',
        'testextjs.view.Report.statistiquevente.SalesStatistcManager',
        /* kobena 14 01 2016 */
        'testextjs.view.Report.comparaisonCAFamilles.CAFamilleManager',
        'testextjs.view.Report.RuptureStock.RuptureStockManager',
        'testextjs.view.Report.analyseventestock.analyseventestockmanager',
        'testextjs.view.Report.AchatsFournisseurs.AchatFournisseursManager',
        'testextjs.view.Report.achatproduits.AchatProduitManager',
        'testextjs.view.Report.venteavoirclient.venteavoirclientkmanager',
        'testextjs.view.Report.ventesocietereglement.ventesocietereglementManager',
        'testextjs.view.Report.Retrocessions.RetrocessionsManager',
        'testextjs.view.commandemanagement.lots.LotsManager',
        'testextjs.view.Report.RapportGestions.RapportGestionsManager',
        'testextjs.view.sm_user.Defferedpaiement.DefferedPaiement',
        'testextjs.view.sm_user.RecapOrganisme.RecapManager',
        'testextjs.view.sm_user.Defferedpaiement.action.add',
        'testextjs.model.ReferenceVente',
        'testextjs.model.StatistiqueMois',
        'testextjs.model.Vente',
        'testextjs.view.tierspayantmanagement.tierspayant.action.detailstierspayant',
        'testextjs.view.configmanagement.litige.action.add',
        'testextjs.view.commandemanagement.etats.action.quinzaineManager',
        'testextjs.view.commandemanagement.etats.action.paybls',
        'testextjs.view.commandemanagement.etats.action.addQuinzaine',
        'testextjs.store.Lot',
        'testextjs.model.Quinzaine',
        'testextjs.view.configmanagement.famille.action.detailArticleVendus',
        'testextjs.view.Report.saisieperimes.SaisiePerimeManager',
        /* 0603207 */
        'testextjs.view.configmanagement.categoryclient.CategoryClientManger',
        'testextjs.view.Report.uniteGratuite.UniteGratuite',
        'testextjs.view.tierspayantmanagement.groupetierspayant.groupe',
        'testextjs.view.tierspayantmanagement.groupetierspayant.groupeInvoices',
        'testextjs.view.Report.statqties.qtymanager',
        'testextjs.view.Report.statsAchats.statsAchats',
        'testextjs.view.Report.activities.rapportactivite',
        'testextjs.view.stockmanagement.valorisation.Valorisation',
        'testextjs.view.configmanagement.logfile.logManager',
        'testextjs.view.configmanagement.company.company',
        'testextjs.view.actions.Doublons',
        'testextjs.view.Report.resultatstva.TvaManager',
        'testextjs.view.produits.mvtproduit.*',
        'testextjs.view.facturation.ModelFacture',
        'testextjs.view.facturation.ModelFactureDynamique',
        'testextjs.view.facturation.FactureProvisoire',
        'testextjs.view.caisseManager.Importation',
        'testextjs.view.actions.action',
        'testextjs.view.configmanagement.famille.Products',
        'testextjs.view.depot.Export',
        'testextjs.view.depot.Import',
        'testextjs.view.depot.Export',
        'testextjs.view.achat',
        'testextjs.view.chiffreAnnuel',
        'testextjs.view.sm_user.mvtcaisse.action.Detail',
        'testextjs.view.notification.RecapSms',
        'testextjs.view.ticketzrecap',
        'testextjs.view.modereglement.ModeReglementGrid',
        'testextjs.view.modereglement.ModeReglementView',
        'testextjs.view.stat.ArticleMvtGrid',
        'testextjs.store.ArticleMvtStore',
        'testextjs.model.ArticleMvt',
        'testextjs.view.support.SupportContact',
        'testextjs.view.support.SupportTickets',
        'testextjs.view.support.SupportDiagnostic',
        'testextjs.view.support.SupportSante',
        'testextjs.view.support.SupportHistorique',
        'testextjs.view.support.SupportMaintenance'


        
    ],
    controllers: [
        'App',
        'VisualisationCtr',
        'ListeCaisseCtr',
        'VenteCtr',
        'PendingCtr',
        'PreVentesCtr',
        'ProduitDesactivesCtr',
        'DevisListCtr',
        'DevisCtr',
        'DepotListCtr',
        'DepotCtr',
        'AnnulationCtr',
        'VenteFinisCtr',
        'ListeAvoirCtr',
        'AvoirCtr',
        'AjusteListCtr',
        'AjustementCtr',
        'BalanceVenteCtr',
        'GestionCaisseCtr',
        'TableauBoardCtr',
        'TvaCtr',
        'ReportCtr',
        'MvtArticleCtr',
        'MvtArticleCompletCtr',
        'DiffereCtr',
        'FaireReglementCtr',
        'RecapCtr',
        'FactureCtr',
        'FamilleArticleStatsCtr',
        'VingthManagerCtr',
        'AnalyseTiersPayantCtr',
        'DetailsCtr',
        'VentesRateesCtr',
        'AbcManagerCtr',
        'FeuilleDeMatchCtr',
        'peremptionManagerCtr',
        'MargeManagerCtr',
        'UnitesVenduesCtr',
        'RupturepharmaCtr',
        'GroupeGrossisteCtr',
        'GammeProduitCtr',
        'LaboratoireCtr',
        'StatsByGammeCtr',
        'StatsByLaboratoireCtr',
        'CashmovementCtr',
        'StatistiqProviderCtr',
        'StatistiqRayonsCtr',
        'CaZoneGeoCtr',
        'ModeleMessageCtr',
        'ArticleInvendusCtr',
        'SurStockCtr',
        'ComparaisonCtr',
        'OrdonnancierCtrl',
        'VenteTiersPayantsCtr',
        'UgCtr',
        'ImportationHistoriqueCtr',
        'FamilleArticleStatVetoCtr',
        'ParaCtr',
        'CompteExploitationCtr',
        'TiersPayantExclusCtrl',
        'GestionCarnetDepotCtr',
        'DoRetourCarnetCtr',
        'CarnetRetourCtr',
        'TierspAsDepotCtrl',
        'TierspExclusCtrl',
        'SuiviPerimesCtr',
        'BalanceVenteCarnetCtr',
        'MotifReglementCtr',
        'EtatControlAnnuelCtr',
        'TableauBoardCarnetCtr',
        'AchatGrossisteMensuelCtr',
        'FactureSubrogatoireCtr',
        'ProuduitsVenteAnnulesCtr',
        'NotificationCtr',
        'CategorieNotificationCtr',
        'SmsFournisseurCtr',
        'RecapRecetteCaisseCtr',
        'StatVenteDepotCtr',
        'CautionCtr',
        'BalanceSaleCashDepotController',
        'PointCaisseController',
        'ArticleMvtController',
        'SupportContactCtr',
        'SupportTicketsCtr',
        'SupportDiagnosticCtr',
        'SupportSanteCtr'


    ],
    stores: [
        'Menu'
    ],
    autoCreateViewport: true

});

// ---------------------------------------------------------------------
// Memorisation des colonnes PAR POSTE (lot 3) : les grilles declarees
// « stateful » (avec un stateId stable) conservent colonnes affichees ou
// masquees, largeurs, ordre et tri dans le stockage local du navigateur.
// L'etat survit au changement de menu et a la deconnexion, et disparait
// quand le cache du navigateur est vide — comportement demande.
// Seules les grilles explicitement marquees sont concernees : aucune
// grille existante ne change de comportement sans stateId.
// ---------------------------------------------------------------------
(function () {
    try {
        if (window.localStorage && Ext.state && Ext.state.LocalStorageProvider) {
            Ext.state.Manager.setProvider(new Ext.state.LocalStorageProvider({prefix: 'prestige-'}));
        }
    } catch (e) {
        // stockage local indisponible (navigation privee, quota...) :
        // pas de memorisation, comportement d'origine
    }

    /*
     * Identifiant STABLE par colonne, indispensable a la memorisation.
     *
     * ExtJS reconnait une colonne dans l'etat enregistre par « stateId ou headerId » ;
     * faute de stateId, le headerId est genere a la creation (header-1234) et CHANGE a
     * chaque nouvelle instance de la grille. L'etat etait donc bien enregistre mais ne
     * pouvait plus etre applique en revenant sur le menu : tout repartait par defaut.
     *
     * On derive donc un identifiant du dataIndex (ou du rang pour les colonnes qui n'en
     * ont pas, numeroteur et colonnes d'action), prefixe par la grille.
     */
    window.PrestigeEtatColonnes = {
        identifier: function (prefixe, colonnes) {
            (colonnes || []).forEach(function (colonne, rang) {
                if (colonne && !colonne.stateId) {
                    colonne.stateId = prefixe + '-' + (colonne.dataIndex || ('col' + rang));
                }
            });
            return colonnes;
        }
    };
})();

// ---------------------------------------------------------------------
// Couleurs de mise en evidence des lignes, reglees par officine.
//
// Deux parametres de l'ecran « Gestion des parametrages » donnent la couleur
// de la ligne survolee (COULEUR_SURVOL_LIGNE) et celle de la ligne
// selectionnee (COULEUR_SELECTION_LIGNE). Il n'y a qu'un code hexadecimal a
// saisir par etat : le lisere et la couleur du libelle en sont deduits, et un
// fond clair recoit un texte sombre, un fond fonce un texte clair.
//
// Les valeurs sont posees en variables CSS sur <html> ; les feuilles de style
// les utilisent avec la couleur d'origine en repli, donc un appel qui echoue
// ou un parametre absent laisse l'application telle qu'elle etait.
// ---------------------------------------------------------------------
window.PrestigeCouleursLignes = (function () {
    'use strict';

    var DEFAUTS = {survol: '#ffcc80', selection: '#CE93D8'};

    /** #abc ou #aabbcc -> {r, g, b}, null si le code n'est pas exploitable. */
    function composantes(couleur) {
        var code = String(couleur || '').trim().replace('#', '');
        if (code.length === 3) {
            code = code.charAt(0) + code.charAt(0) + code.charAt(1) + code.charAt(1)
                    + code.charAt(2) + code.charAt(2);
        }
        if (!/^[0-9a-fA-F]{6}$/.test(code)) {
            return null;
        }
        return {
            r: parseInt(code.substring(0, 2), 16),
            g: parseInt(code.substring(2, 4), 16),
            b: parseInt(code.substring(4, 6), 16)
        };
    }

    function enHexa(n) {
        var v = Math.max(0, Math.min(255, Math.round(n))).toString(16);
        return v.length === 1 ? '0' + v : v;
    }

    /**
     * Lisere : meme teinte que le fond, mais franchement plus foncee et plus vive.
     *
     * Multiplier les trois composantes assombrirait aussi la couleur, mais en la
     * ternissant (l'orange virait au brun). On passe donc par la teinte et la
     * saturation, qui sont conservees, et seule la luminosite est baissee.
     */
    function lisere(rgb) {
        var r = rgb.r / 255, v = rgb.g / 255, b = rgb.b / 255;
        var maxi = Math.max(r, v, b), mini = Math.min(r, v, b);
        var l = (maxi + mini) / 2;
        var d = maxi - mini;
        var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
        var h = 0;
        if (d !== 0) {
            if (maxi === r) {
                h = 60 * (((v - b) / d) % 6);
            } else if (maxi === v) {
                h = 60 * (((b - r) / d) + 2);
            } else {
                h = 60 * (((r - v) / d) + 4);
            }
        }
        if (h < 0) {
            h += 360;
        }
        return versHexa(h, Math.min(1, s * 1.35 + 0.15), Math.max(0.18, l * 0.5));
    }

    /** Teinte, saturation, luminosite -> code hexadecimal. */
    function versHexa(h, s, l) {
        var c = (1 - Math.abs(2 * l - 1)) * s;
        var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        var m = l - c / 2;
        var t = (h < 60) ? [c, x, 0] : (h < 120) ? [x, c, 0] : (h < 180) ? [0, c, x]
                : (h < 240) ? [0, x, c] : (h < 300) ? [x, 0, c] : [c, 0, x];
        return '#' + enHexa((t[0] + m) * 255) + enHexa((t[1] + m) * 255) + enHexa((t[2] + m) * 255);
    }

    /** Libelle sombre sur fond clair, clair sur fond fonce. */
    function couleurTexte(rgb) {
        var luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
        return luminance > 150 ? '#1a1a1a' : '#ffffff';
    }

    function poser(nom, valeur) {
        if (document.documentElement && document.documentElement.style.setProperty) {
            document.documentElement.style.setProperty(nom, valeur);
        }
    }

    function appliquer(couleurs) {
        var valeurs = couleurs || {};
        var survol = composantes(valeurs.survol) || composantes(DEFAUTS.survol);
        var selection = composantes(valeurs.selection) || composantes(DEFAUTS.selection);

        poser('--vp-survol-fond', '#' + enHexa(survol.r) + enHexa(survol.g) + enHexa(survol.b));
        poser('--vp-survol-bord', lisere(survol));
        poser('--vp-survol-texte', couleurTexte(survol));
        // Dans les listes, on ne force le libelle que si la couleur choisie est
        // foncee : sur un fond clair, les colonnes gardent leurs couleurs
        // (stock en bleu, alertes en rouge) au lieu d'etre uniformisees.
        poser('--vp-survol-texte-grille', couleurTexte(survol) === '#ffffff' ? '#ffffff' : 'inherit');
        poser('--vp-selection-fond', '#' + enHexa(selection.r) + enHexa(selection.g) + enHexa(selection.b));
        poser('--vp-selection-texte', couleurTexte(selection));
    }

    function charger() {
        try {
            var requete = new XMLHttpRequest();
            requete.open('GET', '../api/v1/app-params/couleurs-lignes', true);
            requete.onreadystatechange = function () {
                if (requete.readyState !== 4 || requete.status !== 200) {
                    return;
                }
                try {
                    appliquer(JSON.parse(requete.responseText));
                } catch (e) {
                    // reponse inattendue : on garde les couleurs d'origine
                }
            };
            requete.send();
        } catch (e) {
            // pas de reseau : on garde les couleurs d'origine
        }
    }

    charger();
    return {appliquer: appliquer, recharger: charger};
})();

// ---------------------------------------------------------------------
// Ligne active : au clic, c'est la LIGNE entiere qui est marquee (violet),
// pas la seule cellule cliquee.
//
// La plupart des grilles de l'application sont en selection « cellule »
// (selType cellmodel) : ExtJS ne marque alors que la cellule cliquee
// (x-grid-cell-selected) et ne pose AUCUNE classe sur la ligne — il n'y a
// donc rien a styler en CSS seul.
//
// Plutot que de basculer 230 grilles en selection « ligne », ce qui
// changerait la semantique de selection (edition en cellule, appels a
// getCurrentPosition, evenements select), on se contente d'ajouter une
// classe d'affichage vp-ligne-active sur la ligne qui porte la selection.
// Purement cosmetique : la selection ExtJS, elle, ne change pas.
//
// La ligne CLIQUEE est marquee elle aussi, meme si elle n'est pas
// selectionnee : sur la liste des factures par exemple, la selection est
// volontairement reservee a la case a cocher (checkOnly) et refusee aux
// factures non supprimables — cliquer une ligne ne selectionne donc rien
// et il ne se passait rien a l'ecran.
//
// Les arbres (menu de navigation) heritent de Ext.tree.Panel et non de
// Ext.grid.Panel : ils ne sont pas concernes et gardent leur propre style.
// ---------------------------------------------------------------------
Ext.define('Prestige.override.GrilleLigneActive', {
    override: 'Ext.grid.Panel',

    initComponent: function () {
        this.callParent(arguments);

        this.on('afterrender', function (grille) {
            try {
                var modele = grille.getSelectionModel();
                var vue = grille.getView();
                if (!modele || !vue) {
                    return;
                }
                var ligneCliquee = null;

                var marquer = function (enregistrement) {
                    var noeud = enregistrement ? vue.getNode(enregistrement) : null;
                    if (noeud) {
                        Ext.fly(noeud).addCls('vp-ligne-active');
                    }
                };

                var repeindre = function () {
                    try {
                        if (!vue.rendered || !vue.getEl()) {
                            return;
                        }
                        Ext.Array.each(vue.getEl().query('.vp-ligne-active'), function (noeud) {
                            Ext.fly(noeud).removeCls('vp-ligne-active');
                        });
                        Ext.Array.each(modele.getSelection() || [], marquer);
                        // la ligne cliquee reste marquee tant qu'aucune autre
                        // n'est cliquee ou selectionnee
                        if (!(modele.getSelection() || []).length) {
                            marquer(ligneCliquee);
                        }
                    } catch (e) {
                        // rendu en cours de destruction : rien a repeindre
                    }
                };

                modele.on('selectionchange', repeindre);
                vue.on('refresh', repeindre);
                grille.on('itemclick', function (v, enregistrement) {
                    ligneCliquee = enregistrement;
                    repeindre();
                });
                if (grille.getStore()) {
                    grille.getStore().on('load', function () {
                        ligneCliquee = null;
                    });
                }
            } catch (e) {
                // grille atypique : on laisse le comportement d'origine
            }
        });
    }
});

// ---------------------------------------------------------------------
// Centre de Support : capture automatique des erreurs frontend
// (erreurs JavaScript non gerees et echecs Ajax). Les evenements sont
// envoyes au journal du Centre de Support ou ils sont dedupliques par
// signature. La capture est silencieuse : elle ne doit jamais perturber
// l'utilisation de l'application.
// ---------------------------------------------------------------------
(function () {
    var reported = {};
    var reportCount = 0;
    var MAX_REPORTS = 20;

    // Fil d'Ariane : tampon circulaire des dernieres actions de l'utilisateur
    // (ecrans ouverts, appels API) pour reconstituer le contexte d'une erreur
    // que l'utilisateur n'arrive pas a reproduire ou a expliquer.
    var breadcrumb = [];
    var MAX_BREADCRUMB = 15;

    function heure() {
        try {
            return Ext.Date.format(new Date(), 'H:i:s');
        } catch (e) {
            return '';
        }
    }

    function pushBreadcrumb(action) {
        try {
            if (!action) {
                return;
            }
            breadcrumb.push(heure() + '  ' + String(action).substring(0, 200));
            if (breadcrumb.length > MAX_BREADCRUMB) {
                breadcrumb.shift();
            }
        } catch (ignore) {
            // fil d'Ariane silencieux
        }
    }

    function breadcrumbJson() {
        try {
            return Ext.JSON.encode({fil_ariane: breadcrumb.slice()});
        } catch (e) {
            return null;
        }
    }

    // Expose au reste de l'application (ex. ouverture d'ecran depuis le controleur App).
    window.__prestigeSupport = {push: pushBreadcrumb};

    function reportError(payload) {
        try {
            if (reportCount >= MAX_REPORTS) {
                return;
            }
            var key = (payload.messageCourt || '') + '|' + (payload.urlOuEcran || '');
            if (reported[key]) {
                return;
            }
            reported[key] = true;
            reportCount++;
            payload.payloadJson = breadcrumbJson();
            Ext.Ajax.request({
                method: 'POST',
                url: '/prestige/api/v1/support/events',
                headers: {'Content-Type': 'application/json'},
                params: Ext.JSON.encode(payload),
                failure: Ext.emptyFn
            });
        } catch (ignore) {
            // capture silencieuse
        }
    }

    // Messages d'erreur JS benins / bruit de librairie : on ne les remonte pas (faux positifs).
    var MESSAGES_BENINS = ['no data specified', 'script error', 'resizeobserver',
        'null is not an object', 'result is not defined'];

    function estBenin(message) {
        var m = String(message || '').toLowerCase();
        for (var i = 0; i < MESSAGES_BENINS.length; i++) {
            if (m.indexOf(MESSAGES_BENINS[i]) !== -1) {
                return true;
            }
        }
        return false;
    }

    window.onerror = function (message, source, lineno, colno, error) {
        if (estBenin(message)) {
            return false;
        }
        reportError({
            type: 'JS',
            niveau: 'ERROR',
            module: 'FRONTEND',
            messageCourt: String(message || 'Erreur JavaScript').substring(0, 500),
            urlOuEcran: (String(source || window.location.pathname) + ':' + (lineno || 0)).substring(0, 255),
            stack: (error && error.stack) ? String(error.stack).substring(0, 8000) : null
        });
        return false;
    };

    // Promesses rejetees sans .catch() : invisibles de window.onerror, elles ne laissaient donc aucune trace.
    // Meme traitement que les erreurs de script : filtre des messages benins, plafond de remontees, deduplication
    // par signature et fil d'Ariane sont ceux de reportError.
    if (window.addEventListener) {
        window.addEventListener('unhandledrejection', function (evenement) {
            try {
                var raison = evenement ? evenement.reason : null;
                var message = (raison && raison.message) ? raison.message : String(raison);
                if (estBenin(message)) {
                    return;
                }
                reportError({
                    type: 'JS',
                    niveau: 'ERROR',
                    module: 'FRONTEND',
                    messageCourt: ('Promesse rejetée : ' + message).substring(0, 500),
                    urlOuEcran: String(window.location.pathname || '').substring(0, 255),
                    stack: (raison && raison.stack) ? String(raison.stack).substring(0, 8000) : null
                });
            } catch (ignore) {
                // capture silencieuse
            }
        });
    }

    // Garde sur Ext.EventManager.removeAll. ExtJS 4.2 y lit « element.id » sans verifier
    // que l'element existe encore :
    //     removeAll: function (n) { var o = (typeof n === "string") ? n : n.id, ... }
    // Quand un composant est detruit deux fois, ou quand son noeud DOM a deja disparu,
    // l'appel remonte « can't access property "id", n is undefined » et interrompt la
    // destruction en cours : l'ecran reste a moitie ferme. Retirer les ecouteurs d'un
    // element absent n'a aucun sens, il n'y a rien a retirer : on ne fait rien et on
    // remonte l'incident une seule fois, avec la pile, pour identifier l'appelant.
    (function () {
        if (!window.Ext || !Ext.EventManager || typeof Ext.EventManager.removeAll !== 'function') {
            return;
        }
        var removeAllOrigine = Ext.EventManager.removeAll;
        var dejaSignale = false;
        Ext.EventManager.removeAll = function (element) {
            if (element === null || element === undefined) {
                if (!dejaSignale) {
                    dejaSignale = true;
                    var pile = null;
                    try {
                        pile = new Error('removeAll sur un element absent').stack;
                    } catch (ignore) {
                        pile = null;
                    }
                    reportError({
                        type: 'JS',
                        niveau: 'WARN',
                        module: 'FRONTEND',
                        messageCourt: 'Ext.EventManager.removeAll appelé sur un élément absent (neutralisé)',
                        urlOuEcran: String(window.location.pathname || '').substring(0, 255),
                        stack: pile ? String(pile).substring(0, 8000) : null
                    });
                }
                return;
            }
            return removeAllOrigine.apply(this, arguments);
        };
    })();

    Ext.onReady(function () {
        // Alimente le fil d'Ariane a chaque appel API (hors envois du support lui-meme).
        Ext.Ajax.on('beforerequest', function (conn, options) {
            try {
                var url = (options && options.url) ? String(options.url) : '';
                if (url.indexOf('/support/events') !== -1) {
                    return;
                }
                pushBreadcrumb('API ' + ((options && options.method) || 'GET') + ' ' + url);
            } catch (ignore) {
                // silencieux
            }
        });

        Ext.Ajax.on('requestexception', function (conn, response, options) {
            try {
                var url = (options && options.url) ? String(options.url) : '';
                if (url.indexOf('/support/events') !== -1) {
                    return;
                }
                if (response && response.aborted) {
                    return;
                }
                var status = response ? response.status : 0;
                // HTTP 0 = requete interrompue/avortee (navigation, rechargement, coupure reseau) : non
                // actionnable et tres bruyant. On ne la remonte pas (si le serveur etait vraiment injoignable,
                // l'envoi de l'evenement lui-meme echouerait de toute facon).
                if (status === 0) {
                    return;
                }
                reportError({
                    type: 'AJAX',
                    niveau: status >= 500 ? 'ERROR' : 'WARN',
                    module: 'FRONTEND',
                    messageCourt: ('Échec Ajax HTTP ' + status + ' '
                            + (response && response.statusText ? response.statusText : '')).substring(0, 500),
                    urlOuEcran: url.substring(0, 255),
                    stack: (response && response.responseText)
                            ? String(response.responseText).substring(0, 4000) : null
                });
            } catch (ignore) {
                // capture silencieuse
            }
        });
    });
})();
