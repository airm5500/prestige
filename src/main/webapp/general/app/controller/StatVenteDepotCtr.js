/* global Ext */

Ext.define('testextjs.controller.StatVenteDepotCtr', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.model.caisse.Vente',
        'testextjs.view.vente.depot.StatVenteDepot'
    ],
    views: ['testextjs.view.vente.depot.StatVenteDepot'],
    refs: [{
            ref: 'ventemanager',
            selector: 'ventehistoriquedepotmanager'
        },

        {
            ref: 'queryBtn',
            selector: 'ventehistoriquedepotmanager #rechercher'
        }, {
            ref: 'amount',
            selector: 'ventehistoriquedepotmanager #amount'
        }, {
            ref: 'depotId',
            selector: 'ventehistoriquedepotmanager #depotId'
        },

        {
            ref: 'ventemanagerGrid',
            selector: 'ventehistoriquedepotmanager gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'ventehistoriquedepotmanager gridpanel pagingtoolbar'
        }
        , {
            ref: 'dtStart',
            selector: 'ventehistoriquedepotmanager #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'ventehistoriquedepotmanager #dtEnd'
        }

        , {
            ref: 'hStart',
            selector: 'ventehistoriquedepotmanager #hStart'
        }, {
            ref: 'hEnd',
            selector: 'ventehistoriquedepotmanager #hEnd'
        }
        , {
            ref: 'queryField',
            selector: 'ventehistoriquedepotmanager #query'
        }, {
            ref: 'typeVente',
            selector: 'ventehistoriquedepotmanager #typeVente'
        }




    ],
    config: {
        datemisajour: null
    },
    init: function (application) {
        this.control({
            'ventehistoriquedepotmanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'ventehistoriquedepotmanager #rechercher': {
                click: this.doSearch
            },
            'ventehistoriquedepotmanager #typeVente': {
                select: this.doSearch
            },

            'ventehistoriquedepotmanager gridpanel': {
                viewready: this.doInitStore
            },
            "ventehistoriquedepotmanager gridpanel actioncolumn": {
                printTicket: this.printTicket,
                facture: this.onFacture

            },
            'ventemanager #query': {
                specialkey: this.onSpecialKey
            },
            'ventemanager #depotId': {
                select: this.doSearch
            }
        });
    },

    onFacture: function (view, rowIndex, colIndex, item, e, rec, row) {
        const me = this;
        const client = rec.get('clientFullName');
        const linkUrl = '../webservices/sm_user/detailsvente/ws_generate_facture_pdf.jsp?lg_PREENREGISTREMENT_ID=' + rec.get('lgPREENREGISTREMENTID');
        if (client !== '') {
            window.open(linkUrl);
        } else {
            me.buildForm(rec, linkUrl);
        }


    },

    printTicket: function (view, rowIndex, colIndex, item, e, rec, row) {
        const me = this;
        me.onPrintTicket(rec.get('lgPREENREGISTREMENTID'), rec.get('lgTYPEVENTEID'), rec.get('copy'));
    },
    onPrintTicket: function (id, lgTYPEVENTEID, copy) {
        let url = (lgTYPEVENTEID === '1') ? '../api/v1/vente/ticket/vno/' + id : '../api/v1/vente/ticket/vo/' + id;
        if (copy) {
            url = '../api/v1/vente/copy/' + id;
        }
        if (lgTYPEVENTEID === '5') {
            url = '../api/v1/vente/ticket/depot/' + id;
        }
        let progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            url: url,
            success: function (response, options) {
                progress.hide();
            },
            failure: function (response, options) {
                progress.hide();
            }

        });
    },

    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getVentemanagerGrid().getStore().getProxy();
        myProxy.params = {
            query: null,
            typeDepotId: null,
            dtStart: null,
            dtEnd: null,
            hEnd: null,
            hStart: null,
            onlyAvoir: false,
            sansBon: false,
            nature: null,
            depotOnly: true,
            depotId: null

        };
        myProxy.setExtraParam('sansBon', false);
        myProxy.setExtraParam('onlyAvoir', false);
        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('typeDepotId', me.getTypeVente().getValue());
        myProxy.setExtraParam('hStart', me.getHStart().getSubmitValue());
        myProxy.setExtraParam('hEnd', me.getHEnd().getSubmitValue());
        myProxy.setExtraParam('nature', me.getNature().getValue());
        myProxy.setExtraParam('depotOnly', true);
        myProxy.setExtraParam('depotId', me.getDepotId().getValue());
    },
    doInitStore: function () {
        const me = this;
        me.doSearch();

    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.doSearch();
        }
    },
    doSearch: function () {
        const me = this;
        me.getVentemanagerGrid().getStore().load({
            params: {
                "query": me.getQueryField().getValue(),
                "dtStart": me.getDtStart().getSubmitValue(),
                "dtEnd": me.getDtEnd().getSubmitValue(),
                "typeDepotId": me.getTypeVente().getValue(),
                "hStart": me.getHStart().getSubmitValue(),
                "hEnd": me.getHEnd().getSubmitValue(),
                "onlyAvoir": false,
                "sansBon": false,
                "depotOnly": true,
                "depotId": me.getDepotId().getValue()

            }
        });
        me.fetchAmount();
    },

    fetchAmount: function () {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/depot-amount',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.amount = result.amount;
                }
            }

        });
    }

});