/* global Ext */

Ext.define('testextjs.controller.UgCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.actions.Ug'],
    refs: [{
            ref: 'venteugs',
            selector: 'venteugs'
        },
      
        {
            ref: 'uggid',
            selector: 'venteugs #uggid'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'venteugs #uggid pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'venteugs #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'venteugs #dtEnd'
        }, {
            ref: 'query',
            selector: 'venteugs #query'
        },
        {ref: 'rechercherButton',
            selector: 'venteugs #rechercher'

        }, 
        {
            ref: 'montantAchat',
            selector: 'venteugs #montantAchat'
        },
       
        {
            ref: 'nbreVente',
            selector: 'venteugs #nbreVente'
        }
       
    ],
    init: function (application) {
        this.control({
            'venteugs #uggid pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'venteugs #rechercher': {
                click: this.doSearch
            },
            'venteugs #imprimer': {
                click: this.onPdfClick
            },
            'venteugs #query': {
                specialkey: this.onQuerySpecialKey
            },
            'venteugs #uggid': {
                viewready: this.doInitStore
            }

        });
    },
    // plan du 06/11, point 13 : PDF avec la colonne Vendeur et la recherche de l'ecran
    onPdfClick: function () {
        var me = this;
        window.open('../api/v1/caisse/ca/ug/pdf?' + Ext.Object.toQueryString(me.parametres()));
    },
    onQuerySpecialKey: function (field, e) {
        if (e.getKey() === e.ENTER) {
            this.doSearch();
        }
    },
    parametres: function () {
        var me = this;
        return {dtStart: me.getDtStart().getSubmitValue(), dtEnd: me.getDtEnd().getSubmitValue(),
            query: me.getQuery() ? me.getQuery().getValue() : ''};
    },
    doMetachange: function (store, meta) {
        var me = this;
        me.buildSummary(meta);

    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getUggid().getStore().getProxy();
        Ext.Object.each(me.parametres(), function (k, v) {
            myProxy.setExtraParam(k, v);
        });

    },

    doInitStore: function () {
        var me = this;
        me.getUggid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();
    },

    // plan du 06/11, point 13 : pagination du serveur (start / limit), toujours depuis la premiere page
    doSearch: function () {
        var me = this, store = me.getUggid().getStore();
        Ext.Object.each(me.parametres(), function (k, v) {
            store.getProxy().setExtraParam(k, v);
        });
        store.loadPage(1);
    },
    buildSummary: function (rec) {
        var me = this;
        me.getMontantAchat().setValue(rec.montantAchat);
        me.getNbreVente().setValue(rec.nbreVente);
    }
});