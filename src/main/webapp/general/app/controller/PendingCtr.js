/* global Ext */

Ext.define('testextjs.controller.PendingCtr', {
    extend: 'Ext.app.Controller',
    requires: [

        'testextjs.model.caisse.Vente', 'testextjs.view.vente.PreventeDetail'


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
        }, {
            ref: 'preventeDetail',
            selector: 'preventeDetail'
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
                toEdit: this.edit,
                toDelete: this.delete,
                toTrash: this.corbeille,
                goto: this.goto
            },
            'cloturerventemanager #query': {
                specialkey: this.onSpecialKey
            },
            'cloturerventemanager #addBtn': {
                click: this.onAddClick
            },
            'cloturerventemanager #printParVente': {
                click: this.onPrintParVente
            },
            'cloturerventemanager #printListe': {
                click: this.onPrintListe
            },
            'cloturerventemanager #createInventaire': {
                click: this.onCreateInventaire
            },
            'preventeDetail #btnCancel': {
                click: this.onClosePreventeDetail
            }
        });
    },
    onClosePreventeDetail: function () {
        const me = this;
        me.getPreventeDetail().destroy();

    },
    edit: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.onEdite(record);
    },
    delete: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.onDelete(record.get('lgPREENREGISTREMENTID'));
    }, corbeille: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.onCorbeille(record.get('lgPREENREGISTREMENTID'));
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
        var data = {'isEdit': false, 'categorie': 'VENTE', 'record': {}};
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
    goto: function (view, rowIndex, colIndex, item, e, rec, row) {

        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/find-one/' + rec.get('lgPREENREGISTREMENTID'),
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                Ext.create('testextjs.view.vente.PreventeDetail', {vente: result.data}).show();
            }

        });


    },
    onCorbeille: function (id) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'PUT',
            url: '../api/v1/ventestats/update/' + id + '/is_Trash',
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
        var data = {'isEdit': true, 'record': rec.data, 'isDevis': false, 'categorie': 'VENTE'};
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
    },
    // Filtres actifs de la liste (repris pour les impressions et l'inventaire)
    getActiveFilters: function () {
        var me = this;
        return {
            statut: 'is_Process',
            query: me.getQueryField().getValue() || '',
            typeVenteId: me.getTypeComboField().getValue() || ''
        };
    },
    doPrintProduits: function (mode) {
        var me = this;
        var params = Ext.apply({mode: mode}, me.getActiveFilters());
        var progress = Ext.MessageBox.wait('Generation du PDF . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/preventes/produits/pdf',
            method: 'GET',
            params: params,
            timeout: 600000,
            success: function (resp) {
                progress.hide();
                var r = Ext.JSON.decode(resp.responseText, true);
                if (r && r.success && r.url) {
                    window.open(r.url);
                } else {
                    Ext.MessageBox.alert('Impression',
                            (r && r.message) ? r.message : "La generation du PDF n'a pas abouti.");
                }
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Impression', 'La generation du PDF a echoue.');
            }
        });
    },
    onPrintParVente: function () {
        this.doPrintProduits('PAR_VENTE');
    },
    onPrintListe: function () {
        this.doPrintProduits('LISTE');
    },
    // Creation d'inventaire avec les produits des ventes en attente affichees
    // (un meme produit dans plusieurs ventes = une seule ligne)
    onCreateInventaire: function () {
        var me = this, filters = me.getActiveFilters();
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Controle des produits');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/preventes/produits/count',
            method: 'GET',
            params: filters,
            success: function (resp) {
                progress.hide();
                var r = Ext.JSON.decode(resp.responseText, true);
                var count = (r && r.count) ? r.count : 0;
                if (count === 0) {
                    Ext.MessageBox.alert('Message', 'Aucun produit dans les ventes en attente affichees.');
                    return;
                }
                Ext.MessageBox.confirm('Confirmation',
                        'Vous allez creer un inventaire contenant <b>' + count
                        + '</b> produit(s) distinct(s) des ventes en attente affichees.<br/>Confirmez-vous ?',
                        function (btn) {
                            if (btn !== 'yes') {
                                return;
                            }
                            var prog = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
                            Ext.Ajax.request({
                                // filtres en query string : le endpoint lit des @QueryParam
                                url: '../api/v1/ventestats/preventes/create-inventaire?'
                                        + Ext.Object.toQueryString(filters),
                                method: 'POST',
                                timeout: 600000,
                                success: function (response) {
                                    prog.hide();
                                    var res = Ext.JSON.decode(response.responseText, true);
                                    if (res && res.success) {
                                        Ext.MessageBox.alert('Inventaire',
                                                'Inventaire cree.<br/>Produits en compte : <b>' + (res.count || 0) + '</b>');
                                    } else {
                                        Ext.MessageBox.alert('Erreur',
                                                (res && res.message) ? res.message : "La creation de l'inventaire a echoue.");
                                    }
                                },
                                failure: function () {
                                    prog.hide();
                                    Ext.MessageBox.alert('Erreur',
                                            "La creation de l'inventaire a echoue. Aucun inventaire partiel n'a ete cree.");
                                }
                            });
                        });
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Erreur', 'Le controle du nombre de produits a echoue.');
            }
        });
    }
});