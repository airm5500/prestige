/* global Ext */

Ext.define('testextjs.controller.RecapCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Dashboard.Recap'],
    refs: [{
            ref: 'recap',
            selector: 'recap'
        }
        , {
            ref: 'dtStart',
            selector: 'recap #dtStart'
        },

        {
            ref: 'dtEnd',
            selector: 'recap #dtEnd'
        },
        {
            ref: 'cartesRecap',
            selector: 'recap #cartesRecap'
        }
        , {
            ref: 'queryRgl',
            selector: 'recap #queryRgl'
        },
        {
            ref: 'query',
            selector: 'recap #query'
        },
        {
            ref: 'reglementGrid',
            selector: 'recap #reglementGrid'
        },
        {
            ref: 'creditaccorde',
            selector: 'recap #creditaccorde'
        },
        {
            ref: 'totalnb',
            selector: 'recap #totalnb'
        },
        {
            ref: 'totalmontant',
            selector: 'recap #totalmontant'
        },
        {
            ref: 'totalnbclient',
            selector: 'recap #totalnbclient'
        },
        {
            ref: 'achatGrid',
            selector: 'recap #achatGrid'
        },
        {
            ref: 'ongletAchats',
            selector: 'recap #ongletAchats'
        },
        {
            ref: 'ongletCredits',
            selector: 'recap #ongletCredits'
        },
        {
            ref: 'ongletReglements',
            selector: 'recap #ongletReglements'
        },
        {
            ref: 'resumeAchats',
            selector: 'recap #resumeAchats'
        }

    ],
    init: function (application) {
        this.control({
            'recap': {
                render: this.onReady
            },
            'recap #reglementGrid pagingtoolbar': {
                beforechange: this.doBeforechangeRegle
            },
            'recap #creditaccorde pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'recap #rechercher': {
                click: this.doSearch
            },
            'recap #creditbtn': {
                click: this.doSearchCredit
            },
            'recap #reglebtn': {
                click: this.doSearchRecgl
            },
            'recap #imprimer': {
                click: this.onPdfClick
            },
            'recap #imprimerAchats': {
                click: this.onImprimerAchats
            },
            'recap #imprimerCredits': {
                click: this.onImprimerCredits
            },
            'recap #imprimerReglements': {
                click: this.onImprimerReglements
            },
            'recap #query': {
                specialkey: this.onCreditKey
            },
            'recap #queryRgl': {
                specialkey: this.onSpecialSpecialKey
            }
        });
    },
    onPdfClick: function () {
        const me = this;
        const dtStart = me.getDtStart().getSubmitValue();
        const dtEnd = me.getDtEnd().getSubmitValue();
        const query=me.getQuery().getValue();
        const linkUrl = '../BalancePdfServlet?mode=RECAP&dtStart=' + dtStart + '&dtEnd=' + dtEnd+'&query='+query;
        window.open(linkUrl);
    },

    /* Editions des onglets : le PDF est servi en flux par l'API, dans l'onglet ouvert par le clic (pas de
       fenetre intermediaire). */
    periodeUrl: function () {
        const me = this;
        return 'dtStart=' + me.getDtStart().getSubmitValue() + '&dtEnd=' + me.getDtEnd().getSubmitValue();
    },
    onImprimerAchats: function () {
        window.open('../api/v1/recap/achats/pdf?' + this.periodeUrl());
    },
    onImprimerCredits: function () {
        window.open('../api/v1/recap/credits/pdf?' + this.periodeUrl() + '&query=' + encodeURIComponent(this.getQuery().getValue() || ''));
    },
    onImprimerReglements: function () {
        window.open('../api/v1/recap/reglements/pdf?' + this.periodeUrl() + '&query=' + encodeURIComponent(this.getQueryRgl().getValue() || ''));
    },
    /* Le titre de chaque onglet annonce son contenu : nombre de lignes et total, mis a jour a chaque chargement. */
    titreOnglet: function (onglet, base, detail) {
        if (onglet) {
            onglet.setTitle(base + (detail ? ' <span style="font-weight:normal;color:#555;">' + detail + '</span>' : ''));
        }
    },
    resumerReglements: function (store) {
        const me = this, total = store.getTotalCount() || 0;
        me.titreOnglet(me.getOngletReglements(), 'REGLEMENTS TP', total + ' facture(s)');
    },

    doBeforechange: function (page, currentPage) {
        const me = this;
        let myProxy = me.getCreditaccorde().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            query: null

        };
        myProxy.setExtraParam('query', me.getQuery().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());

    },

    doBeforechangeRegle: function (page, currentPage) {
        const me = this;
        let myProxy = me.getReglementGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            query: null

        };
        myProxy.setExtraParam('query', me.getQueryRgl().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());

    },
    doSearchRecgl: function () {
        const me = this;
        me.getReglementGrid().getStore().load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                query: me.getQueryRgl().getValue()

            },
            callback: function () {
                me.resumerReglements(me.getReglementGrid().getStore());
            }
        });

    },
    doSearchCredit: function () {
        const me = this;
        me.getCreditaccorde().getStore().load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                query: me.getQuery().getValue()

            }
        });
        me.buildTotauxCredits();
    },
    doSearch: function () {
        const me = this;
        me.doSearchRecgl();
        me.doSearchCredit();
        me.buildSummary();
    },
    buildSummary: function () {
        const me = this, achatGrid = me.getAchatGrid();
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/recap/dashboard',
            timeout: 2400000,
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()
            },
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                const rec = result.data;
                me.dessinerCartes(rec);
                achatGrid.getStore().loadData(rec.achats);
                const nbAchats = (rec.achats || []).length;
                me.titreOnglet(me.getOngletAchats(), 'ACHATS', nbAchats + ' groupe(s) · ' + Ext.util.Format.number(rec.montantTotalTTC, '0,000.') + ' TTC');
                if (me.getResumeAchats()) {
                    me.getResumeAchats().setText('Achats par groupe de grossistes : ' + nbAchats + ' groupe(s), total TTC ' + Ext.util.Format.number(rec.montantTotalTTC, '0,000.'));
                }

            }, failure: function (response, options) {
                progress.hide();

            }

        });
    },
    /* Les quatre cartes du haut sont un seul gabarit HTML (style des tableaux de la balance). */
    dessinerCartes: function (rec) {
        const me = this, cartes = me.getCartesRecap();
        const recettes = rec.reglements || [];
        let total = 0;
        recettes.forEach(function (e) {
            total += Number(e.montant) || 0;
        });
        cartes.update(Ext.apply({}, rec, {reglements: recettes, totalRecettes: total, mvtsCaisse: rec.mvtsCaisse || []}));
    },
    onSpecialSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.doSearchRecgl();
        }
    },
    onCreditKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.doSearchCredit();
        }
    },
    onReady: function () {
        const me = this;
        me.doSearch();

    },
    buildTotauxCredits: function () {
        const me = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/recap/credits/totaux',
            timeout: 2400000,
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                query: me.getQuery().getValue()
            },
            success: function (response, options) {
                progress.hide();
                const rec = Ext.JSON.decode(response.responseText, true);
                const totalnb = me.getTotalnb(), totalmontant = me.getTotalmontant(), totalnbclient = me.getTotalnbclient();
                totalnb.setValue(rec.nbreBons);
                totalnbclient.setValue(rec.nbreClient);
                totalmontant.setValue(rec.montant);
                me.titreOnglet(me.getOngletCredits(), 'CREDITS ACCORDES', Ext.util.Format.number(rec.nbreBons, '0,000.') + ' bon(s) · ' + Ext.util.Format.number(rec.montant, '0,000.'));

            }, failure: function (response, options) {
                progress.hide();

            }

        });
    }
});