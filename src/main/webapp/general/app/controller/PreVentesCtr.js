/* global Ext */

Ext.define('testextjs.controller.PreVentesCtr', {
    extend: 'Ext.app.Controller',
    requires: [

        'testextjs.model.caisse.Vente'


    ],
    views: ['testextjs.view.vente.PreSaleManager'],
    refs: [{
            ref: 'pending',
            selector: 'preenregistrementmanager'
        },
        {
            ref: 'queryBtn',
            selector: 'preenregistrementmanager #rechercher'
        }, {
            ref: 'addBtn',
            selector: 'preenregistrementmanager #addBtn'
        },

        {
            ref: 'pendingGrid',
            selector: 'preenregistrementmanager gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'preenregistrementmanager gridpanel pagingtoolbar'
        }

        , {
            ref: 'queryField',
            selector: 'preenregistrementmanager #query'
        }, {
            ref: 'statut',
            selector: 'preenregistrementmanager #statut'
        }


    ],
    init: function (application) {
        this.control({
            'preenregistrementmanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'preenregistrementmanager #rechercher': {
                click: this.doSearch
            },
            'preenregistrementmanager #statut': {
                select: this.doSearch
            },
            'preenregistrementmanager gridpanel': {
                viewready: this.doInitStore
            },

            'preenregistrementmanager #query': {
                specialkey: this.onSpecialKey
            },
            'preenregistrementmanager #addBtn': {
                click: this.onAddClick
            },
            "preenregistrementmanager gridpanel actioncolumn": {
                toEdit: this.edit,
                toRemove: this.remove,
                toPrint: this.imprimerTicket

            },
            'preenregistrementmanager #excelBtn': {
                click: this.exporterExcel
            }
        });
    },

    /* Reimpression du ticket synthetique de la prevente : meme route que l'impression a l'enregistrement. */
    imprimerTicket: function (view, rowIndex, colIndex, item, e, rec, row) {
        const attente = Ext.MessageBox.wait('Impression du ticket . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/ticket/prevente/' + rec.get('lgPREENREGISTREMENTID'),
            success: function (response) {
                attente.hide();
                const lu = Ext.JSON.decode(response.responseText, true);
                if (!lu || !lu.success) {
                    Ext.MessageBox.show({title: 'Ticket de prévente', width: 420,
                        msg: (lu && lu.msg) || 'L\'impression n\'a pas abouti.',
                        buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.ERROR});
                }
            },
            failure: function (response) {
                attente.hide();
                Ext.MessageBox.show({title: 'Ticket de prévente', width: 420,
                    msg: 'Le serveur n\'a pas répondu (' + response.status + ').',
                    buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.ERROR});
            }
        });
    },

    /* Export Excel de la liste filtree entiere : memes criteres que la recherche (statut, texte). */
    exporterExcel: function () {
        const me = this;
        const statut = me.getStatut().getValue() || 'ALL';
        const query = me.getQueryField().getValue() || '';
        window.location = '../api/v1/ventestats/preventes/excel?statut=' + encodeURIComponent(statut)
                + '&query=' + encodeURIComponent(query);
    },
    edit: function (view, rowIndex, colIndex, item, e, rec, row) {
        const me = this;
        me.onEdite(rec);
    },
    remove: function (view, rowIndex, colIndex, item, e, rec, row) {
        const me = this;
        me.onDelete(rec.get('lgPREENREGISTREMENTID'));
    },

    onAddClick: function () {
        var xtype = "doventemanager";
        var data = {'isEdit': false, 'categorie': 'PREVENTE', 'record': {}};
        testextjs.app.getController('App').onRedirectTo(xtype, data);

    },

    onDelete: function (id) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/ventestats/remove/' + id,
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
        var data = {'isEdit': true, 'record': rec.data, 'isDevis': false, 'categorie': 'PREVENTE'};
        var xtype = "doventemanager";
        testextjs.app.getController('App').onRedirectTo(xtype, data);
    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getPendingGrid().getStore().getProxy();

        myProxy.params = {
            query: null,
            statut: 'ALL'

        };
        myProxy.setExtraParam('statut', me.getStatut().getValue());
        myProxy.setExtraParam('query', me.getQueryField().getValue());
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

        me.getPendingGrid().getStore().load({
            params: {
                "statut": me.getStatut().getValue(),
                "query": me.getQueryField().getValue()
            }
        });
    }
});