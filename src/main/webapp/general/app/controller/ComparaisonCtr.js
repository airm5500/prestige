/* global Ext */

Ext.define('testextjs.controller.ComparaisonCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.produits.ComparaisonStock', 'testextjs.view.produits.ComparaisonStockDetails'],
    refs: [{
            ref: 'famillestockcomparaisonmanager',
            selector: 'famillestockcomparaisonmanager'
        },

        {
            ref: 'surGrid',
            selector: 'famillestockcomparaisonmanager gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'famillestockcomparaisonmanager gridpanel pagingtoolbar'
        }
        ,
        {
            ref: 'rayons',
            selector: 'famillestockcomparaisonmanager #rayons'
        },
        {
            ref: 'grossiste',
            selector: 'famillestockcomparaisonmanager #grossiste'
        },

        {
            ref: 'query',
            selector: 'famillestockcomparaisonmanager #query'
        },
        {
            ref: 'codeFamile',
            selector: 'famillestockcomparaisonmanager #codeFamile'
        },
        {
            ref: 'stock',
            selector: 'famillestockcomparaisonmanager #stock'
        },

        {
            ref: 'stockFiltre',
            selector: 'famillestockcomparaisonmanager #stockFiltre'
        },
        {
            ref: 'seuilFiltre',
            selector: 'famillestockcomparaisonmanager #seuilFiltre'
        },
        {
            ref: 'suill',
            selector: 'famillestockcomparaisonmanager #suill'
        },
        {
            ref: 'comparaisonDetails',
            selector: 'comparaisonDetails'
        },
        {
            ref: 'detailGrid',
            selector: 'comparaisonDetails gridpanel'
        },
        {
            ref: 'detailQuery',
            selector: 'comparaisonDetails #detailquery'
        }, {
            ref: 'dtEnd',
            selector: 'comparaisonDetails #dtEnd'
        }, {
            ref: 'dtStart',
            selector: 'comparaisonDetails #dtStart'
        },
        {
            ref: 'detailForm',
            selector: 'comparaisonDetails #detailForm'
        }

    ],
    config: {
        selected: null
    },
    init: function (application) {
        this.control({
            'famillestockcomparaisonmanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'famillestockcomparaisonmanager #rechercher': {
                click: this.doSearch
            },
            'famillestockcomparaisonmanager #imprimer': {
                click: this.onPdfClick
            },
            'famillestockcomparaisonmanager #rayons': {
                select: this.doSearch
            }, 'famillestockcomparaisonmanager #codeFamile': {
                select: this.doSearch
            },

            'famillestockcomparaisonmanager #grossiste': {
                select: this.doSearch
            },
            'famillestockcomparaisonmanager #query': {
                specialkey: this.onQuery
            },
            'famillestockcomparaisonmanager #stock': {
                specialkey: this.onQuery
            },

            'famillestockcomparaisonmanager gridpanel': {
                viewready: this.doInitStore
            },

            'famillestockcomparaisonmanager #stockFiltre': {
                select: this.onSelectStock
            }
            , 'famillestockcomparaisonmanager #seuilFiltre': {
                select: this.onSelectSeuil
            },
            'famillestockcomparaisonmanager #suill': {
                specialkey: this.onQuery
            },
            'famillestockcomparaisonmanager #suggestion': {
                click: this.onSuggere
            },

            "famillestockcomparaisonmanager gridpanel actioncolumn": {
                goto: this.goto
            },
            'comparaisonDetails #btnCancel': {
                click: this.onBtnCloseWindow
            }, 'comparaisonDetails #detailquery': {
                specialkey: this.onDetailQuery
            }, 'comparaisonDetails #detailrechercher': {
                click: this.doDetailSearch
            }
            , 'comparaisonDetails #detailimprimer': {
                click: this.onPdfDetailsClick
            },
            'comparaisonDetails gridpanel': {
                viewready: this.doInitStoreDetail
            },
            'comparaisonDetails gridpanel pagingtoolbar': {
                beforechange: this.doBeforechangeDetail
            }
        });
    },
    onBtnCloseWindow: function () {
        var me = this;
        me.getComparaisonDetails().destroy();

    },
    onDetailQuery: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doDetailSearch();
        }
    },

    goto: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;
        me.selected = record;
        Ext.create('testextjs.view.produits.ComparaisonStockDetails', {data: record}).show();
        me.getDetailForm().loadRecord(record);
    },
    onQuery: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    onSelectStock: function (field, e, options) {
        var me = this;
        me.getStock().focus(50, true);

    },

    onSelectSeuil: function (field, e, options) {
        var me = this;
        me.getSuill().focus(50, true);

    },

    onPdfDetailsClick: function () {
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var query = me.getDetailQuery().getValue();
        var el=me.getSelected();
        var linkUrl = '../DataReportingServlet?mode=COMPARAISON_STOCK_DETAIL&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&query=' + query+ '&id=' + el.get('id')+ '&cip=' + el.get('code')+ '&libelle=' + el.get('libelle');
        window.open(linkUrl);
    },

    onPdfClick: function () {
        var me = this;
        var filtreStock = me.getStockFiltre().getValue();
        var seuilFiltre = me.getSeuilFiltre().getValue();
        var stock = me.getStock().getValue();
        var suill = me.getSuill().getValue();
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue(),
                codeFamile = me.getCodeFamile().getValue();
        var query = me.getQuery().getValue();

        if (codeFamile == null) {
            codeFamile = '';
        }
        if (codeRayon == null) {
            codeRayon = '';
        }

        if (codeGrossiste == null) {
            codeGrossiste = '';
        }
        var linkUrl = '../DataReportingServlet?mode=COMPARAISON_STOCK&codeGrossiste=' + codeGrossiste + '&codeRayon=' + codeRayon + '&query=' + query
                + '&codeFamile=' + codeFamile + '&query=' + query + '&stock=' + stock
                + '&seuil=' + suill
                + '&filtreStock=' + filtreStock
                + '&filtreSeuil=' + seuilFiltre
                ;
        window.open(linkUrl);
    },

    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getSurGrid().getStore().getProxy();
        myProxy.params = {

            query: null,
            codeGrossiste: null,
            codeRayon: null,
            codeFamile: null,
            filtreSeuil: null,
            filtreStock: null,
            stock: 0,
            seuil: 0


        };
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue();
        var query = me.getQuery().getValue(),
                codeFamile = me.getCodeFamile().getValue();
        var filtreStock = me.getStockFiltre().getValue();
        var filtreSeuil = me.getSeuilFiltre().getValue();
        var stock = me.getStock().getValue();
        var seuil = me.getSuill().getValue();
        myProxy.setExtraParam('filtreStock', filtreStock);
        myProxy.setExtraParam('filtreSeuil', filtreSeuil);
        myProxy.setExtraParam('stock', stock);
        myProxy.setExtraParam('codeFamile', codeFamile);
        myProxy.setExtraParam('codeRayon', codeRayon);
        myProxy.setExtraParam('codeGrossiste', codeGrossiste);
        myProxy.setExtraParam('seuil', seuil);
        myProxy.setExtraParam('query', query);

    },
    doInitStore: function () {
        var me = this;
        me.doSearch();
    },

    doSearch: function () {
        var me = this;
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue();
        var query = me.getQuery().getValue(),
                codeFamile = me.getCodeFamile().getValue();
        var filtreStock = me.getStockFiltre().getValue();
        var filtreSeuil = me.getSeuilFiltre().getValue();
        var stock = me.getStock().getValue();
        var seuil = me.getSuill().getValue();

        me.getSurGrid().getStore().load({
            params: {
                query: query,
                codeRayon: codeRayon,
                codeGrossiste: codeGrossiste,
                seuil: seuil,
                stock: stock,
                filtreSeuil: filtreSeuil,
                filtreStock: filtreStock,
                codeFamile: codeFamile

            }
        });
    },

    doDetailSearch: function () {
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var query = me.getDetailQuery().getValue();
        me.getDetailGrid().getStore().load({
            params: {
                query: query,
                dtStart: dtStart,
                dtEnd: dtEnd
            }
        });
    },
    doBeforechangeDetail: function (page, currentPage) {
        var me = this;
        var myProxy = me.getDetailGrid().getStore().getProxy();
        myProxy.params = {

            query: null,
            dtStart: null,
            dtEnd: null
        };
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var query = me.getDetailQuery().getValue();
        myProxy.setExtraParam('query', query);
        myProxy.setExtraParam('dtEnd', dtEnd);
        myProxy.setExtraParam('dtStart', dtStart);
    },
    doInitStoreDetail: function () {
        var me = this;
        me.doDetailSearch();
    },
    onSuggere: function () {
        var me = this;
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue();
        var query = me.getQuery().getValue(),
                codeFamile = me.getCodeFamile().getValue();
        var filtreStock = me.getStockFiltre().getValue();
        var filtreSeuil = me.getSeuilFiltre().getValue();
        var stock = me.getStock().getValue();
        var seuil = me.getSuill().getValue();
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/fichearticle/comparaison/suggestion',
            params: {
                query: query,
                codeRayon: codeRayon,
                codeGrossiste: codeGrossiste,
                seuil: seuil,
                stock: stock,
                filtreSeuil: filtreSeuil,
                filtreStock: filtreStock,
                codeFamile: codeFamile
            },
            timeout: 2400000,
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    Ext.Msg.alert("Message", 'Produits pris en compte ' + result.count);
                }
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Erreur !!' + response.status);
            }

        });


    }
});