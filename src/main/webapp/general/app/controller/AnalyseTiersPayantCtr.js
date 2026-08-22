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
            }
        });
    },

    /* L'export reprend exactement la periode et les filtres affiches : le fichier
     * correspond a ce que l'utilisateur a sous les yeux. */
    onExportTiersPayants: function (bouton) {
        var ecran = this.ecran(bouton), p = ecran.parametres();
        window.open('../api/v1/analyse-tierspayant/csv?' + Ext.Object.toQueryString({
            niveau: 'TIERSPAYANT', dtStart: p.dtStart, dtEnd: p.dtEnd, query: p.queryTiersPayant, tri: p.tri
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
            tri: p.tri});
    },

    onImprimerProduits: function (bouton) {
        var ecran = this.ecran(bouton), p = ecran.parametres();
        this.imprimer({niveau: 'PRODUIT', dtStart: p.dtStart, dtEnd: p.dtEnd,
            tiersPayantId: ecran.tiersPayantSelectionne(), query: p.queryProduit, tri: p.tri});
    },

    onExportProduits: function (bouton) {
        var ecran = this.ecran(bouton), p = ecran.parametres();
        window.open('../api/v1/analyse-tierspayant/csv?' + Ext.Object.toQueryString({
            niveau: 'PRODUIT', dtStart: p.dtStart, dtEnd: p.dtEnd,
            tiersPayantId: ecran.tiersPayantSelectionne(), query: p.queryProduit, tri: p.tri
        }));
    },

    ecran: function (composant) {
        return composant.up('analysetierspayant') || Ext.ComponentQuery.query('analysetierspayant')[0];
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
