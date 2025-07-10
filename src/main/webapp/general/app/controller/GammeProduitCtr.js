/* global Ext */

Ext.define('testextjs.controller.GammeProduitCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.produits.GammeProduit', 'testextjs.view.produits.form.GammeProduitForm'],
    refs: [{
            ref: 'gammeproduits',
            selector: 'gammeproduits'
        },

        {
            ref: 'gammeGrid',
            selector: 'gammeproduits gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'gammeproduits gridpanel pagingtoolbar'
        },
        {ref: 'rechercherButton',
            selector: 'gammeproduits #rechercher'

        },
        {ref: 'query',
            selector: 'gammeproduits #query'

        },
        {ref: 'gammeProduitForm',
            selector: 'gammeProduitForm'

        },
        {ref: 'form',
            selector: 'gammeProduitForm form'

        }



    ],
    init: function (application) {
        this.control({
            'gammeproduits gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'gammeproduits #rechercher': {
                click: this.doSearch
            },

            'gammeproduits gridpanel': {
                viewready: this.doInitStore
            }
            ,
            "gammeproduits gridpanel actioncolumn": {
                remove: this.remove,
                editer: this.editer

            },
            'gammeproduits #query': {
                specialkey: this.onSpecialKey
            },
            'gammeproduits #addBtn': {
                click: this.add
            },
              'gammeProduitForm #btnsave': {
                click: this.saveRecord
            },
            'gammeProduitForm #btnCancel': {
                click: this.closeWindows
            }


        });
    },
    add: function () {
        var formwin = Ext.create('testextjs.view.produits.form.GammeProduitForm');
        formwin.show();
    },
closeWindows: function () {
        var me = this;
        me.getGammeProduitForm().destroy();
    },
    saveRecord: function () {
        const me = this;
       const form = me.getForm();
        if (form.isValid()) {
            let datas = form.getValues();
            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/gammeproduits/',
                params: Ext.JSON.encode(datas),
                success: function (response, options) {
                    progress.hide();
                    var result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.closeWindows();
                        me.doSearch();
                    } else {
                        Ext.Msg.alert("Message", "L'opérateur a échouée");
                    }

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                }
            });
        }

    },

    editer: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;
        var formwin = Ext.create('testextjs.view.produits.form.GammeProduitForm');
        me.getForm().loadRecord(record);
        formwin.show();

    },

    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    remove: function (view, rowIndex, colIndex, item, e, record, row) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/gammeproduits/' + record.get('id'),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.doSearch();
                } else {
                    Ext.Msg.alert("Message", "L'opérateur a échouée");
                }

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }
        });

    },

    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getGammeGrid().getStore().getProxy();
        myProxy.params = {
            query: null


        };
        var query = me.getQuery().getValue();
        myProxy.setExtraParam('query', query);

    },
    doInitStore: function () {
        var me = this;
        me.doSearch();
    },
    doSearch: function () {
        var me = this;
        var query = me.getQuery().getValue();
        me.getGammeGrid().getStore().load({
            params: {
                query: query

            }
        });
    }

});