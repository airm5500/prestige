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
            'analysetierspayant #grilleTiersPayants': {
                selectionchange: this.onTiersPayantSelectionne
            },
            'analysetierspayant #btnExportTiersPayants': {
                click: this.onExportTiersPayants
            },
            'analysetierspayant #btnExportProduits': {
                click: this.onExportProduits
            }
        });
    },

    /* L'export reprend exactement la periode et les filtres affiches : le fichier
     * correspond a ce que l'utilisateur a sous les yeux. */
    onExportTiersPayants: function (bouton) {
        var ecran = this.ecran(bouton), p = ecran.parametres();
        window.open('../api/v1/analyse-tierspayant/csv?' + Ext.Object.toQueryString({
            niveau: 'TIERSPAYANT', dtStart: p.dtStart, dtEnd: p.dtEnd, query: p.queryTiersPayant
        }));
    },

    onExportProduits: function (bouton) {
        var ecran = this.ecran(bouton), p = ecran.parametres();
        window.open('../api/v1/analyse-tierspayant/csv?' + Ext.Object.toQueryString({
            niveau: 'PRODUIT', dtStart: p.dtStart, dtEnd: p.dtEnd,
            tiersPayantId: ecran.tiersPayantSelectionne(), query: p.queryProduit
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
