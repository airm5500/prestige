/* global Ext */

Ext.define('testextjs.controller.ArticleInvendusCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.produits.ArticlesInvendus'],
    refs: [{
            ref: 'stockmort',
            selector: 'stockmort'
        },

        {
            ref: 'unitesGrid',
            selector: 'stockmort gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'stockmort gridpanel pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'stockmort #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'stockmort #dtEnd'
        },

        {
            ref: 'rayons',
            selector: 'stockmort #rayons'
        },
        {
            ref: 'grossiste',
            selector: 'stockmort #grossiste'
        },

        {
            ref: 'query',
            selector: 'stockmort #query'
        },
        {
            ref: 'codeFamile',
            selector: 'stockmort #codeFamile'
        },
        {
            ref: 'stock',
            selector: 'stockmort #stock'
        },
        {
            ref: 'stockFiltre',
            selector: 'stockmort #stockFiltre'
        }



    ],
    init: function (application) {
        this.control({
            'stockmort #btnExportExcel': {
                click: this.onExportExcel
            },
            'stockmort #btnExportCsv': {
                click: this.onExportCsv
            },
            'stockmort #btnCreateInventaire': {
                click: this.onCreateInventaire
            },
            'stockmort gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'stockmort #rechercher': {
                click: this.doSearch
            },
            'stockmort #imprimer': {
                click: this.onPdfClick
            },
            'stockmort #rayons': {
                select: this.doSearch
            }, 'stockmort #codeFamile': {
                select: this.doSearch
            },

            'stockmort #grossiste': {
                select: this.doSearch
            },
            'stockmort #query': {
                specialkey: this.onQuery
            }, 'stockmort #stock': {
                specialkey: this.onQuery
            },
            'stockmort #stockFiltre': {
                select: this.onFilterSelect
            },
            'stockmort gridpanel': {
                viewready: this.doInitStore
            }, 'stockmort #suggestion': {
                click: this.onSuggere
            }

        });
    },
    onQuery: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    onSuggere: function () {
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue(),
                codeFamile = me.getCodeFamile().getValue();
        var query = me.getQuery().getValue();
        var stock = me.getStock().getValue();
        var stockFiltre = me.getStockFiltre().getValue();
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/datareporting/suggestion',
            params: {
                dtStart: dtStart,
                dtEnd: dtEnd,
                query: query,
                codeRayon: codeRayon,
                codeGrossiste: codeGrossiste,
                stockFiltre: stockFiltre,
                stock: stock,
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


    },

    onPdfClick: function () {
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue(),
                codeFamile = me.getCodeFamile().getValue();
        var query = me.getQuery().getValue();
        var stock = me.getStock().getValue();
        var stockFiltre = me.getStockFiltre().getValue();
        if (codeFamile == null) {
            codeFamile = '';
        }
        if (codeRayon == null) {
            codeRayon = '';
        }

        if (codeGrossiste == null) {
            codeGrossiste = '';
        }
        if (stockFiltre == null) {
            stockFiltre = 'ALL';
        }
        var query = me.getQuery().getValue();
        var linkUrl = '../DataReportingServlet?mode=ARTICLES_NON_VENDUES&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&codeGrossiste=' + codeGrossiste + '&codeRayon=' + codeRayon + '&query=' + query
                + '&codeFamile=' + codeFamile + '&query=' + query + '&stock=' + stock + '&stockFiltre=' + stockFiltre
                ;
        window.open(linkUrl);
    },

    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getUnitesGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            query: null,
            codeGrossiste: null,
            codeRayon: null,
            codeFamile: null,
            stock: 0,
            stockFiltre: null

        };
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue();
        var query = me.getQuery().getValue(),
                codeFamile = me.getCodeFamile().getValue();
        var stock = me.getStock().getValue();
        var stockFiltre = me.getStockFiltre().getValue();
        myProxy.setExtraParam('stockFiltre', stockFiltre);
        myProxy.setExtraParam('stock', stock);
        myProxy.setExtraParam('codeFamile', codeFamile);
        myProxy.setExtraParam('codeRayon', codeRayon);
        myProxy.setExtraParam('codeGrossiste', codeGrossiste);
        myProxy.setExtraParam('query', query);
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
    },
    doInitStore: function () {
        var me = this;
        me.doSearch();
    },
    onFilterSelect: function () {
        var me = this;
        me.getStock().focus(40, true);
    },
    doSearch: function () {
        var me = this;
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue();
        var query = me.getQuery().getValue(),
                codeFamile = me.getCodeFamile().getValue();
        var stock = me.getStock().getValue();
        var stockFiltre = me.getStockFiltre().getValue();
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        if (Ext.isEmpty(dtStart) || Ext.isEmpty(dtEnd)) {
            return;
        }
        me.getUnitesGrid().getStore().load({
            params: {
                dtStart: dtStart,
                dtEnd: dtEnd,
                query: query,
                codeRayon: codeRayon,
                codeGrossiste: codeGrossiste,
                stockFiltre: stockFiltre,
                stock: stock,
                codeFamile: codeFamile

            }
        });
    },
    buildFiltersParams: function () {
    var me = this;
    return {
        dtStart: me.getDtStart().getSubmitValue(),
        dtEnd: me.getDtEnd().getSubmitValue(),
        query: me.getQuery().getValue(),
        codeRayon: me.getRayons().getValue(),
        codeGrossiste: me.getGrossiste().getValue(),
        stockFiltre: me.getStockFiltre().getValue(),
        stock: me.getStock().getValue(),
        codeFamile: me.getCodeFamile().getValue()
    };
},

onExportExcel: function () {
    var params = this.buildFiltersParams();
    var qs = Ext.Object.toQueryString(params);
    window.location = '../api/v1/datareporting/articleInvendus/excel?' + qs;
},

onExportCsv: function () {
    var params = this.buildFiltersParams();
    var qs = Ext.Object.toQueryString(params);
    window.location = '../api/v1/datareporting/articleInvendus/csv?' + qs;
},

onCreateInventaire: function () {
    var me = this,
        params = me.buildFiltersParams(),
        progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');

    Ext.Ajax.request({
        url: '../api/v1/datareporting/articleInvendus/create-inventaire',
        method: 'GET',
        params: params,
        timeout: 2400000,
        success: function (response) {
            progress.hide();
            var result = Ext.JSON.decode(response.responseText, true);
            Ext.MessageBox.show({
                title: 'Message',
                width: 320,
                msg: 'Nombre de produits en compte : ' + result.count,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.INFO
            });
        },
        failure: function () {
            progress.hide();
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: "L'opération n'a pas abouti",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR
            });
        }
    });
}


});