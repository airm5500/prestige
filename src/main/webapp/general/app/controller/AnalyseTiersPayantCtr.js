/* global Ext */

Ext.define('testextjs.controller.AnalyseTiersPayantCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Report.analysetierspayant.AnalyseTiersPayantManager'],

    init: function () {
        this.control({
            'analysetierspayant': {
                afterrender: this.onEcranAffiche
            },
            'analysetierspayant #btnRechercher': {
                click: this.onRechercher
            },
            /* Entree dans l'un ou l'autre filtre relance la recherche : on ne force pas
             * l'utilisateur a viser le bouton apres avoir tape. */
            'analysetierspayant #rechercheTiersPayant': {
                specialkey: this.onToucheEntree
            },
            'analysetierspayant #rechercheProduit': {
                specialkey: this.onToucheEntree
            },
            /* Changer le tri relance les deux listes : c'est le serveur qui trie, la grille
             * n'a pas les lignes des autres pages sous la main. */
            'analysetierspayant #tri': {
                select: this.onRechercher
            },
            'analysetierspayant #grilleTiersPayants': {
                selectionchange: this.onTiersPayantSelectionne
            },
            'analysetierspayant #btnExportTiersPayants': {
                click: this.onExportTiersPayants
            },
            'analysetierspayant #btnExportProduits': {
                click: this.onExportProduits
            },
            'analysetierspayant #btnPrintTiersPayants': {
                click: this.onImprimerTiersPayants
            },
            'analysetierspayant #btnPrintProduits': {
                click: this.onImprimerProduits
            },
            /* Point 5 : choisir un groupe de tiers payants relance la recherche, comme le fait
             * deja le choix d'un tri. L'utilisateur n'a plus a viser le bouton Rechercher. */
            'analysetierspayant #groupeTiersPayant': {
                select: this.onRechercher
            },
            'analysetierspayant #btnExcelTiersPayants': {
                click: this.onExcelTiersPayants
            },
            'analysetierspayant #btnExcelProduits': {
                click: this.onExcelProduits
            },
            'analysetierspayant #btnSuggestion': {
                click: this.onCreerSuggestion
            }
        });
    },

    /* L'export reprend exactement la periode et les filtres affiches : le fichier
     * correspond a ce que l'utilisateur a sous les yeux. */
    onExportTiersPayants: function (bouton) {
        var ecran = this.ecran(bouton), p = ecran.parametres();
        window.open('../api/v1/analyse-tierspayant/csv?' + Ext.Object.toQueryString({
            niveau: 'TIERSPAYANT', dtStart: p.dtStart, dtEnd: p.dtEnd, query: p.queryTiersPayant, tri: p.tri,
            groupeId: p.groupeId
        }));
    },

    /* L'edition PDF est produite cote serveur puis ouverte : le service repond par l'URL du fichier.
     * Meme enchainement que l'impression du dictionnaire des pannes (SupportTicketsCtr). */
    imprimer: function (params) {
        var progress = Ext.MessageBox.wait('Génération du PDF . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/analyse-tierspayant/print',
            params: params,
            success: function (response) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true) || {};
                if (result.success && result.msg) {
                    window.open('..' + result.msg, '_blank');
                } else {
                    Ext.Msg.alert('Message', result.msg || 'Impossible de générer le PDF');
                }
            },
            failure: function () {
                progress.hide();
                Ext.Msg.alert('Message', 'Un problème avec le serveur');
            }
        });
    },

    onImprimerTiersPayants: function (bouton) {
        var p = this.ecran(bouton).parametres();
        this.imprimer({niveau: 'TIERSPAYANT', dtStart: p.dtStart, dtEnd: p.dtEnd, query: p.queryTiersPayant,
            tri: p.tri, groupeId: p.groupeId});
    },

    onImprimerProduits: function (bouton) {
        var ecran = this.ecran(bouton), p = ecran.parametres();
        this.imprimer({niveau: 'PRODUIT', dtStart: p.dtStart, dtEnd: p.dtEnd,
            tiersPayantId: ecran.tiersPayantSelectionne(), query: p.queryProduit, tri: p.tri,
            groupeId: p.groupeId});
    },

    onExportProduits: function (bouton) {
        var ecran = this.ecran(bouton), p = ecran.parametres();
        window.open('../api/v1/analyse-tierspayant/csv?' + Ext.Object.toQueryString({
            niveau: 'PRODUIT', dtStart: p.dtStart, dtEnd: p.dtEnd,
            tiersPayantId: ecran.tiersPayantSelectionne(), query: p.queryProduit, tri: p.tri,
            groupeId: p.groupeId
        }));
    },

    onExcelTiersPayants: function (bouton) {
        var p = this.ecran(bouton).parametres();
        window.location = '../api/v1/analyse-tierspayant/excel?' + Ext.Object.toQueryString({
            niveau: 'TIERSPAYANT', dtStart: p.dtStart, dtEnd: p.dtEnd, query: p.queryTiersPayant, tri: p.tri,
            groupeId: p.groupeId
        });
    },

    onExcelProduits: function (bouton) {
        var ecran = this.ecran(bouton), p = ecran.parametres();
        window.location = '../api/v1/analyse-tierspayant/excel?' + Ext.Object.toQueryString({
            niveau: 'PRODUIT', dtStart: p.dtStart, dtEnd: p.dtEnd,
            tiersPayantId: ecran.tiersPayantSelectionne(), query: p.queryProduit, tri: p.tri,
            groupeId: p.groupeId
        });
    },

    /*
     * Suggestion batie sur les produits du resultat COURANT : memes filtres que la grille
     * « Par produit », donc la liste que l'utilisateur a sous les yeux, et non l'ensemble des
     * produits. On confirme avant, puis on annonce le nombre reellement integre.
     */
    onCreerSuggestion: function (bouton) {
        var me = this, ecran = me.ecran(bouton), p = ecran.parametres();
        var nbAffiches = ecran.storeProduits.getCount();
        if (!nbAffiches) {
            Ext.Msg.alert('Message', 'Aucun produit dans le résultat affiché : lancez d\'abord une recherche.');
            return;
        }
        Ext.MessageBox.show({
            title: 'Créer une suggestion',
            width: 480,
            msg: 'Créer une suggestion de commande à partir des produits du résultat affiché ?',
            buttons: Ext.MessageBox.YESNO,
            icon: Ext.MessageBox.QUESTION,
            fn: function (btn) {
                if (btn !== 'yes') {
                    return;
                }
                var attente = Ext.MessageBox.wait('Création de la suggestion . . .', 'Veuillez patienter');
                Ext.Ajax.request({
                    method: 'GET',
                    url: '../api/v1/analyse-tierspayant/suggestion',
                    params: {
                        dtStart: p.dtStart, dtEnd: p.dtEnd, tiersPayantId: ecran.tiersPayantSelectionne(),
                        query: p.queryProduit, tri: p.tri, groupeId: p.groupeId
                    },
                    success: function (reponse) {
                        attente.hide();
                        var res = Ext.JSON.decode(reponse.responseText, true) || {};
                        if (!res.success) {
                            Ext.Msg.alert('Message', res.msg || 'La suggestion n\'a pas pu être créée');
                            return;
                        }
                        var message = res.count + ' produit(s) intégré(s) à la suggestion.';
                        // Un produit sans grossiste par defaut ne peut pas etre commande : le dire
                        // plutot que de laisser croire a un resultat partiel inexplique.
                        if (res.produitsDuResultat && res.count < res.produitsDuResultat) {
                            message += '<br><span style="color:#b35900;">'
                                    + (res.produitsDuResultat - res.count)
                                    + ' produit(s) du résultat n\'ont pas été retenus (pas de grossiste '
                                    + 'par défaut, ou produit déconditionné).</span>';
                        }
                        Ext.MessageBox.show({
                            title: 'Suggestion créée', width: 480, msg: message,
                            buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.INFO
                        });
                    },
                    failure: function () {
                        attente.hide();
                        Ext.Msg.alert('Message', 'Un problème avec le serveur');
                    }
                });
            }
        });
    },

    ecran: function (composant) {
        /* Le composant est celui qui a declenche l'action : bouton, champ, grille. Il peut manquer
         * quand l'action est rappelee autrement qu'a la main ; on retombe alors sur l'ecran ouvert. */
        if (composant && composant.up) {
            return composant.up('analysetierspayant') || Ext.ComponentQuery.query('analysetierspayant')[0];
        }
        return Ext.ComponentQuery.query('analysetierspayant')[0];
    },

    onEcranAffiche: function (ecran) {
        ecran.chargerTiersPayants();
        ecran.chargerProduits();
    },

    onRechercher: function (bouton) {
        var ecran = this.ecran(bouton);
        /* La liste des tiers payants change : la selection precedente n'a plus de sens,
         * on repart de la vue « tous tiers payants » plutot que de garder une ligne fantome. */
        ecran.down('#grilleTiersPayants').getSelectionModel().deselectAll();
        ecran.chargerTiersPayants();
        ecran.chargerProduits();
    },

    onToucheEntree: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.onRechercher(champ);
        }
    },

    onTiersPayantSelectionne: function (modele) {
        var ecran = this.ecran(modele.view);
        if (ecran) {
            ecran.chargerProduits();
        }
    }
});
