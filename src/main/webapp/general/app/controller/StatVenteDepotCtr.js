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
            'ventehistoriquedepotmanager': {
                printTicket: this.printTicket,
                facture: this.onFacture,
                showProduits: this.onShowProduits
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

    onShowProduits: function (record) {
        const venteId = record.get('lgPREENREGISTREMENTID');
        if (!venteId) {
            Ext.Msg.alert('Erreur', 'ID vente introuvable');
            return;
        }

        const win = Ext.create('Ext.window.Window', {
            title: 'Produits - ' + (record.get('strREF') || ''),
            modal: true,
            width: 900,
            height: 500,
            layout: 'fit',
            items: [{
                    xtype: 'gridpanel',
                    itemId: 'gridProduits',
                    store: Ext.create('Ext.data.Store', {
                        fields: [
                            {name: 'lg', type: 'int'},
                            {name: 'nom', type: 'string'},
                            {name: 'cip', type: 'string'},
                            {name: 'qte', type: 'int'},
                            {name: 'pu', type: 'int'},
                            {name: 'montant', type: 'int'}
                        ]
                    }),
                    columns: [
                        {text: 'LG', dataIndex: 'lg', width: 50},
                        {text: 'Nom', dataIndex: 'nom', flex: 1},
                        {text: 'Cip', dataIndex: 'cip', width: 100},
                        {text: 'Quantité', dataIndex: 'qte', width: 90, align: 'right'},
                        {text: 'Prix.Vente', dataIndex: 'pu', width: 110, align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }},
                        {text: 'Montant', dataIndex: 'montant', width: 110, align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }}
                    ]
                }],
            bbar: ['->', {text: 'Fermer', handler: function () {
                        win.close();
                    }}]
        });

        win.show();

        const grid = win.down('#gridProduits');
        const store = grid.getStore();

        const progress = Ext.MessageBox.wait('Chargement des produits...', 'Veuillez patienter');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/find-one/' + venteId,
            method: 'GET',
            success: function (resp) {
                progress.hide();
                const json = Ext.decode(resp.responseText, true) || {};
                const data = json.data || {};
                const items = data.items || [];

                const rows = [];
                Ext.Array.forEach(items, function (it, idx) {
                    const p = it.produit || {};
                    rows.push({
                        lg: idx + 1,
                        nom: p.strNAME || p.strDESCRIPTION || '',
                        cip: p.intCIP || '',
                        qte: it.intQUANTITY || 0,
                        pu: it.intPRICEUNITAIR || 0,
                        montant: it.intPRICE || 0
                    });
                });

                store.loadData(rows, false);
            },
            failure: function () {
                progress.hide();
                Ext.Msg.alert('Erreur', 'Impossible de charger les détails de la vente');
            }
        });
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