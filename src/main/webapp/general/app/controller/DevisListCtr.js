/* global Ext */

Ext.define('testextjs.controller.DevisListCtr', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.model.caisse.Vente'
    ],
    views: ['testextjs.view.devis.Devis'],
    refs: [{
            ref: 'devislist',
            selector: 'devismanager'
        },
        {
            ref: 'queryBtn',
            selector: 'devismanager #rechercher'
        }, {
            ref: 'addBtn',
            selector: 'devismanager #addBtn'
        },
        {
            ref: 'devisGrid',
            selector: 'devismanager gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'devismanager gridpanel pagingtoolbar'
        }

        , {
            ref: 'printPdf',
            selector: 'devismanager #printPdf'
        }, {
            ref: 'dtStart',
            selector: 'devismanager #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'devismanager #dtEnd'
        }

        , {
            ref: 'queryField',
            selector: 'devismanager #query'
        }


    ],
    init: function (application) {
        this.control({
            'devismanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'devismanager #rechercher': {
                click: this.doSearch
            },
            'devismanager #typeVente': {
                select: this.doSearch
            },
            'devismanager gridpanel': {
                viewready: this.doInitStore
            },
            "devismanager gridpanel actioncolumn": {
                toEdit: this.onEdite,
                toPrintTicket: this.onPrintTicket,
                toExportCsv: this.onbtnexportCsv,
                toExportWord: this.onExportWord,
                toExportExcel: this.onExportExcel,
                toRemove: this.onDelete,
                toTransform: this.transformIntoVente,
                toPdf: this.onExportPdf,
                toClone: this.toClone,
                toBonPdf:this.onbonPdf
            },
            'devismanager #query': {
                specialkey: this.onSpecialKey
            },
            'devismanager #addBtn': {
                click: this.onAddClick
            },
            'devismanager #printPdf': {
                click: this.printLit
            }
        });
    },
    printLit: function () {
        var me = this,
                query = me.getQueryField().getValue(),
                dtStart = me.getDtStart().getSubmitValue(),
                dtEnd = me.getDtEnd().getSubmitValue();
        var linkUrl = '../webservices/sm_user/preenregistrement/ws_generate_pdf.jsp?dt_Date_Debut=' + dtStart + "&dt_Date_Fin=" + dtEnd + "&search_value=" + query + "&str_STATUT=devis&title=LISTE DES DEVIS";
        window.open(linkUrl);
    },
    onbtnexportCsv: function (view, rowIndex, colIndex, item, e, rec, row) {
        window.location = '../api/v1/ventestats/devis/csv?id=' + rec.get('lgPREENREGISTREMENTID') + '&ref=' + rec.get('strREF');

    },
    onPrintTicket: function (view, rowIndex, colIndex, item, e, rec, row) {
        var linkUrl = "../FacturePdfServlet?mode=DEVIS&venteId=" + rec.get('lgPREENREGISTREMENTID');
        window.open(linkUrl);

    },
    onExportWord: function (view, rowIndex, colIndex, item, e, rec, row) {
        var linkUrl = "../FacturePdfServlet?mode=DEVIS_FACTURE&venteId=" + rec.get('lgPREENREGISTREMENTID') + "&format=WORD";
        window.open(linkUrl);

    },
    onExportExcel: function (view, rowIndex, colIndex, item, e, rec, row) {
        var linkUrl = "../FacturePdfServlet?mode=DEVIS_FACTURE&venteId=" + rec.get('lgPREENREGISTREMENTID') + "&format=EXCEL";
        window.open(linkUrl);
    },
    onExportPdf: function (view, rowIndex, colIndex, item, e, rec, row) {
        var linkUrl = "../FacturePdfServlet?mode=DEVIS_FACTURE&venteId=" + rec.get('lgPREENREGISTREMENTID') + "&format=PDF";
        window.open(linkUrl);

    },
     onbonPdf: function (view, rowIndex, colIndex, item, e, rec, row) {
          var linkUrl = '../webservices/sm_user/detailsvente/ws_generate_devis__pdf.jsp?lg_PREENREGISTREMENT_ID=' + rec.get('lgPREENREGISTREMENTID');
        window.open(linkUrl);

    },
    handleActionColumn: function (view, rowIndex, colIndex, item, e) {
        var me = this;
        var store = me.getDevisGrid().getStore(),
                rec = store.getAt(colIndex);
        if (parseInt(item) === 8) {
            me.onDelete(rec.get('lgPREENREGISTREMENTID'));
        } else if (parseInt(item) === 7) {
            me.onEdite(rec);
        } else if (parseInt(item) === 6) {
            me.transformIntoVente(rec);
        } else if (parseInt(item) === 9) {
            var linkUrl = "../FacturePdfServlet?mode=DEVIS&venteId=" + rec.get('lgPREENREGISTREMENTID');
            window.open(linkUrl);
        }
    },
    onAddClick: function () {
        var xtype = "doDevis";
        var data = {'isEdit': false, 'record': {}};
        testextjs.app.getController('App').onRedirectTo(xtype, data);
    },
    onDelete: function (view, rowIndex, colIndex, item, e, rec, row) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/ventestats/remove/' + rec.get('lgPREENREGISTREMENTID'),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.doSearch();
                } else {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: "L'opération a échouée",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
                }
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }

        });
    },
    toClone: function (view, rowIndex, colIndex, item, e, rec, row) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'PUT',
            url: '../api/v1/vente/clone-devis/' + rec.get('lgPREENREGISTREMENTID'),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.doSearch();
                } else {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: "L'opération a échouée",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
                }
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }

        });

    },
    transformIntoVente: function (view, rowIndex, colIndex, item, e, rec, row) {
        var data = {'isEdit': true, 'record': rec.data, 'isDevis': true, 'categorie': 'VENTE'};
        var xtype = "doventemanager";
        testextjs.app.getController('App').onRedirectTo(xtype, data);
    
    },
    onEdite: function (view, rowIndex, colIndex, item, e, rec, row) {
        var data = {'isEdit': true, 'record': rec.data};
        var xtype = "doDevis";
        testextjs.app.getController('App').onRedirectTo(xtype, data);
    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getDevisGrid().getStore().getProxy();
        myProxy.params = {
            query: null,
            typeVenteId: null,
            statut: 'devis',
            dtStart: null,
            dtEnd: null

        };
        myProxy.setExtraParam('statut', 'devis');
        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
    },
    doInitStore: function () {
        var me = this;
        me.doSearch();
    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            if (field.getValue() && field.getValue().trim() !== "") {
                var me = this;
                me.doSearch();
            }
        }
    },
    doSearch: function () {
        var me = this;
        me.getDevisGrid().getStore().load({
            params: {
                "statut": 'devis',
                "query": me.getQueryField().getValue(),
                "dtStart": me.getDtStart().getSubmitValue(),
                "dtEnd": me.getDtEnd().getSubmitValue()
            }
        });
    }
});