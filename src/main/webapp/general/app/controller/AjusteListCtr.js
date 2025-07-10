/* global Ext */

Ext.define('testextjs.controller.AjusteListCtr', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.model.caisse.Ajustement'
    ],
    views: ['testextjs.view.produits.Ajustement', 'testextjs.view.produits.ItemAjustement'],
    refs: [{
            ref: 'ajustementmanagerlist',
            selector: 'ajustementmanager'
        },
        {
            ref: 'itemAjustement',
            selector: 'itemAjustement'
        },
        {ref: 'commentaire',
            selector: 'itemAjustement #commentaire'
        },
        {
            ref: 'queryBtn',
            selector: 'ajustementmanager #rechercher'
        }, {
            ref: 'typeAjustement',
            selector: 'ajustementmanager #typeAjustement'
        },

        {
            ref: 'ajustementmanagerGrid',
            selector: 'ajustementmanager gridpanel'
        },
        {
            ref: 'itemAjustementGrid',
            selector: 'itemAjustement gridpanel'
        }, {
            ref: 'pagingDetail',
            selector: 'itemAjustement gridpanel pagingtoolbar'
        }
        ,

        {
            ref: 'pagingtoolbar',
            selector: 'ajustementmanager gridpanel pagingtoolbar'
        }
        ,

        {
            ref: 'dtStart',
            selector: 'ajustementmanager #dtStart'
        },
        {
            ref: 'userName',
            selector: 'itemAjustement #userName'
        }, {
            ref: 'dateOp',
            selector: 'itemAjustement #dateOp'
        },

        {
            ref: 'dtEnd',
            selector: 'ajustementmanager #dtEnd'
        }

        , {
            ref: 'queryField',
            selector: 'ajustementmanager #query'
        }
        , {
            ref: 'detailQuery',
            selector: 'itemAjustement #query'
        }

        , {
            ref: 'addBtn',
            selector: 'ajustementmanager #addBtn'
        }
    ],
    config: {
        data: null
    },
    init: function (application) {
        this.control({
            'ajustementmanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'itemAjustement gridpanel pagingtoolbar': {
                beforechange: this.doBeforechangeDetails
            },

            'itemAjustement': {
                render: this.onReady
            },
            'ajustementmanager #rechercher': {
                click: this.doSearch
            },
            'itemAjustement #btnRecherche': {
                click: this.doSearchDetails
            },
            'ajustementmanager gridpanel': {
                viewready: this.doInitStore
            },
            'itemAjustement gridpanel': {
                viewready: this.doInitDetailsStore
            },

            'ajustementmanager #query': {
                specialkey: this.onSpecialKey
            },
            'itemAjustement #query': {
                specialkey: this.onSpecialQuery
            },

            "ajustementmanager gridpanel actioncolumn": {
                toItem: this.toItem,
                print: this.print
            },
            'ajustementmanager #addBtn': {
                click: this.onAddClick
            }, 'itemAjustement [xtype=toolbar] #btnGoBack': {
                click: this.goBack
            },
            'itemAjustement [xtype=toolbar] #btnCloture': {
                click: this.onPrintPdf
            },
            'ajustementmanager #imprimer': {
                click: this.onPdfClick
            },
        });
    },
    onPrintPdf: function () {
        var me = this;
        var data = me.getData();
        var id = data.lgAJUSTEMENTID;
        var url = '../webservices/stockmanagement/ajustementmanagement/ws_generate_pdf.jsp?lg_AJUSTEMENT_ID=' + id;
        window.open(url);
        //me.goBack();
    },
    goBack: function () {
        var xtype = 'ajustementmanager';
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },

    onAddClick: function () {
        var xtype = "doajustementmanager";
        var data = {'isEdit': false, 'record': {}};
        testextjs.app.getController('App').onRedirectTo(xtype, data);

    },
    toItem: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;
        me.goToItem(record);

    },
    print: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;
        me.printTicket(record.get('lgAJUSTEMENTID'));
    },

    goToItem: function (rec) {
        var data = {'record': rec.data, 'isEdit': true};
        var xtype = "itemAjustement";
        testextjs.app.getController('App').onRedirectTo(xtype, data);
    },
    printTicket: function (id) {
        var linkUrl = '../webservices/stockmanagement/ajustementmanagement/ws_generate_pdf.jsp?lg_AJUSTEMENT_ID=' + id;
        Ext.MessageBox.confirm('Message',
                'Confirmation de l\'impression du detail de cet ajustement',
                function (btn) {
                    if (btn == 'yes') {
                        window.open(linkUrl);
                        return;
                    }
                });

    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getAjustementmanagerGrid().getStore().getProxy();

        myProxy.params = {
            query: null,
            dtStart: null,
            dtEnd: null,
            typeFiltre: null

        };

        myProxy.setExtraParam('typeFiltre', me.getTypeAjustement().getValue());
        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

    },
    doInitDetailsStore: function () {
        var me = this;
        me.doSearchDetails();

    },
    doInitStore: function () {
        var me = this;
        me.doSearch();

    },
    onReady: function () {
        var me = this;
        me.data = null;
        var me = this, view = me.getItemAjustement();
        var rec = view.getData().record;
        me.data = rec;
    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    doBeforechangeDetails: function (page, currentPage) {
        const me = this;
        const myProxy = me.getItemAjustementGrid().getStore().getProxy();
        let ajustement = me.getData();
        let ajustementId = null;
        if (ajustement) {
            ajustementId = ajustement.lgAJUSTEMENTID;
        }
        let query = me.getDetailQuery().getValue();
        myProxy.params = {
            ajustementId: ajustementId,
            query: query

        };
        myProxy.setExtraParam('ajustementId', ajustementId);
        myProxy.setExtraParam('query', query);

    },
    onSpecialQuery: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearchDetails();
        }
    },
    doSearchDetails: function () {
        var me = this;
        var ajustement = me.getData();
        var detailQuery = me.getDetailQuery().getValue();
        var ajustementId = null;
        if (ajustement) {
            ajustementId = ajustement.lgAJUSTEMENTID;
        }
        me.getItemAjustementGrid().getStore().load({
            params: {
                "ajustementId": ajustementId,
                "query": detailQuery
            }, callback: function (records, operation, successful) {

                me.getUserName().setValue(ajustement.userFullName);
                me.getDateOp().setValue(ajustement.dtUPDATED);
                me.getCommentaire().setValue(ajustement.commentaire);
            }
        });
    },
    doSearch: function () {
        var me = this;
        me.getAjustementmanagerGrid().getStore().load({
            params: {
                "query": me.getQueryField().getValue(),
                "dtStart": me.getDtStart().getSubmitValue(),
                "dtEnd": me.getDtEnd().getSubmitValue(),
                "typeFiltre": me.getTypeAjustement().getValue()
            }
        });
    },
    onPdfClick: function () {
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var query = me.getQueryField().getValue();
        var typeFiltre = me.getTypeAjustement().getValue();
        if (typeFiltre == null) {
            typeFiltre = '';
        }
        var linkUrl = '../DataReportingServlet?mode=ALL_AJUSTEMENTS&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&typeFiltre=' + typeFiltre + '&query=' + query;
        window.open(linkUrl);
    }

});