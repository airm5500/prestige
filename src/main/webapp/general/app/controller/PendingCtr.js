/* global Ext */

Ext.define('testextjs.controller.PendingCtr', {
    extend: 'Ext.app.Controller',
    requires: [

        'testextjs.model.caisse.Vente'


    ],
    views: ['testextjs.view.vente.Pending'],
    refs: [{
            ref: 'pending',
            selector: 'cloturerventemanager'
        },
        {
            ref: 'queryBtn',
            selector: 'cloturerventemanager #rechercher'
        }, {
            ref: 'addBtn',
            selector: 'cloturerventemanager #addBtn'
        },

        {
            ref: 'pendingGrid',
            selector: 'cloturerventemanager gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'cloturerventemanager gridpanel pagingtoolbar'
        }

        , {
            ref: 'typeComboField',
            selector: 'cloturerventemanager #typeVente'
        }

        , {
            ref: 'queryField',
            selector: 'cloturerventemanager #query'
        }


    ],
    init: function (application) {
        this.control({
            'cloturerventemanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'cloturerventemanager #rechercher': {
                click: this.doSearch
            },
            'cloturerventemanager #typeVente': {
                select: this.doSearch
            },

            'cloturerventemanager gridpanel': {
                viewready: this.doInitStore
            },
            "cloturerventemanager gridpanel actioncolumn": {
                click: this.handleActionColumn
            },
            'cloturerventemanager #query': {
                specialkey: this.onSpecialKey
            },
            'cloturerventemanager #addBtn': {
                click: this.onAddClick
            }
        });
    },

    handleActionColumn: function (view, rowIndex, colIndex, item, e) {
        var me = this;

        var store = me.getPendingGrid().getStore(),
                rec = store.getAt(colIndex);
        
        if (parseInt(item) === 9) {
            me.onDelete(rec.get('lgPREENREGISTREMENTID'));
        } else if (parseInt(item) === 7) {
            me.onEdite(rec);
        } else if (parseInt(item) === 8) {
            me.onCorbeille(rec.get('lgPREENREGISTREMENTID'));
        }
    },
    onAddClick: function () {
        var xtype = "doventemanager";
        var data = {'isEdit': false,'categorie':'VENTE', 'record': {}};
        testextjs.app.getController('App').onRedirectTo(xtype, data);

    },

    onDelete: function (id) {
        var me = this;
          var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
//            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/ventestats/remove/' + id,
//            params: Ext.JSON.encode(params),
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
    onCorbeille: function (id) {
        var me = this;
         var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
//            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/ventestats/update/' + id,
            params: {'statut': 'is_Trash'},
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

    onEdite: function (rec) {
        var data = {'isEdit': true, 'record': rec.data, 'isDevis': false,'categorie':'VENTE'};
        var xtype = "doventemanager";
        testextjs.app.getController('App').onRedirectTo(xtype, data);
    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getPendingGrid().getStore().getProxy();

        myProxy.params = {
            query: null,
            typeVenteId: null,
            statut: 'is_Process'

        };
        myProxy.setExtraParam('statut', 'is_Process');
        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('typeVenteId', me.getTypeComboField().getValue());

    },

    doInitStore: function () {
        var me = this;
//         me.getPendingGrid().plugins.push({
//                    ptype: 'rowexpander',
//                    rowBodyTpl: new Ext.XTemplate(
//                            '<p>{strREF}</p>'
//
//                            )
//                });
//      

        me.doSearch();

    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
                var me = this;
                me.doSearch();
        }
    },
    doSearch: function () {
        var me = this;

        me.getPendingGrid().getStore().load({
            params: {
                "statut": 'is_Process',
                "query": me.getQueryField().getValue(),
                "typeVenteId": me.getTypeComboField().getValue()
            }
        });
    }
});