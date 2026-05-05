/* global Ext */

Ext.define('testextjs.controller.peremptionManagerCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Report.peremptions.peremptionManager'],
    refs: [{
            ref: 'peremptionquery',
            selector: 'peremptionquery'
        },
        {
            ref: 'imprimerBtn',
            selector: 'peremptionquery #imprimer'
        },
        {
            ref: 'peremptionGrid',
            selector: 'peremptionquery gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'peremptionquery gridpanel pagingtoolbar'
        }

        , {
            ref: 'nbreMois',
            selector: 'peremptionquery #nbreMois'
        },
        {ref: 'rechercherButton',
            selector: 'peremptionquery #rechercher'

        },
        {
            ref: 'rayons',
            selector: 'peremptionquery #rayons'
        }, {
            ref: 'dtEnd',
            selector: 'peremptionquery #dtEnd'
        },
        {
            ref: 'dtStart',
            selector: 'peremptionquery #dtStart'
        },

        {
            ref: 'grossiste',
            selector: 'peremptionquery #grossiste'
        },
        {
            ref: 'codeFamile',
            selector: 'peremptionquery #codeFamile'
        },
        {
            ref: 'stock',
            selector: 'peremptionquery #stock'
        },
        {
            ref: 'achat',
            selector: 'peremptionquery #achat'
        },
        {
            ref: 'vente',
            selector: 'peremptionquery #vente'
        },
        {
            ref: 'query',
            selector: 'peremptionquery #query'
        }





    ],
    init: function (application) {
        this.control({
            'peremptionquery gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'peremptionquery #rechercher': {
                click: this.doSearch
            },
            'peremptionquery #imprimer': {
                click: this.onPdfClick
            },
            'peremptionquery #rayons': {
                select: this.doSearch
            },
            'peremptionquery #grossiste': {
                select: this.doSearch
            },
            'peremptionquery #codeFamile': {
                select: this.doSearch
            },
            'peremptionquery #filtre': {
                select: this.doSearch
            }, 'peremptionquery #query': {
                specialkey: this.onQuery
            },

            'peremptionquery gridpanel': {
                viewready: this.doInitStore
            }


        });
    },
    onQuery: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.doSearch();
        }
    },
    onPdfClick: function () {
        let me = this;
        let nbreMois = me.getNbreMois().getValue();
        let codeRayon = me.getRayons().getValue();
        let codeGrossiste = me.getGrossiste().getValue();
        let codeFamile = me.getCodeFamile().getValue();
        let query = me.getQuery().getValue();
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        if (dtStart == null) {
            dtStart = '';
        }
        if (dtEnd == null) {
            dtEnd = '';
        }
        if (codeFamile == null) {
            codeFamile = '';
        }
        if (codeRayon == null) {
            codeRayon = '';
        }
        if (codeGrossiste == null) {
            codeGrossiste = '';
        }
        const linkUrl = '../BalancePdfServlet?mode=PERIMES&nbre=' + nbreMois + '&query=' + query
                + '&codeGrossiste=' + codeGrossiste + '&codeRayon=' + codeRayon +
                '&codeFamile=' + codeFamile + '&dtEnd=' + dtEnd + '&dtStart=' + dtStart;
        window.open(linkUrl);
    },

    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getPeremptionGrid().getStore().getProxy();
        myProxy.params = {
            nbreMois: -1,
            codeFamile: null,
            codeRayon: null,
            codeGrossiste: null,
            query: null,
            dtEnd: null,
            dtStart: null

        };
        let nbreMois = me.getNbreMois().getValue();
        let codeRayon = me.getRayons().getValue();
        let codeGrossiste = me.getGrossiste().getValue();
        let codeFamile = me.getCodeFamile().getValue();
        let query = me.getQuery().getValue();
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        myProxy.setExtraParam('codeRayon', codeRayon);
        myProxy.setExtraParam('codeFamile', codeFamile);
        myProxy.setExtraParam('codeGrossiste', codeGrossiste);
        myProxy.setExtraParam('query', query);
        myProxy.setExtraParam('nbreMois', nbreMois);
        myProxy.setExtraParam('dtStart', dtStart);
        myProxy.setExtraParam('dtEnd', dtEnd);
    },
    doInitStore: function () {
        const me = this;
        me.getPeremptionGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();
    },
    doSearch: function () {
        const me = this;
        let nbreMois = me.getNbreMois().getValue();
        let codeRayon = me.getRayons().getValue();
        let codeGrossiste = me.getGrossiste().getValue();
        let codeFamile = me.getCodeFamile().getValue();
        let query = me.getQuery().getValue();
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        me.getPeremptionGrid().getStore().load({
            params: {
                nbreMois: nbreMois,
                codeFamile: codeFamile,
                codeRayon: codeRayon,
                codeGrossiste: codeGrossiste,
                query: query,
                dtStart: dtStart,
                dtEnd: dtEnd

            }
        });
    },
    doMetachange: function (store, meta) {
        const me = this;
        me.buildSummary(meta);
    },
    buildSummary: function (rec) {
        const me = this;
        me.getStock().setValue(rec.totalQuantiteLot);
        me.getAchat().setValue(rec.totalValeurAchat);
        me.getVente().setValue(rec.totalValeurVente);
    }
});