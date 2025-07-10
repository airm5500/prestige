/* global Ext */

Ext.define('testextjs.controller.ProduitDesactivesCtr', {
    extend: 'Ext.app.Controller',
    requires: [],
    views: ['testextjs.view.produits.ProduitDesactives'],
    refs: [{
            ref: 'produitDesactives',
            selector: 'familledisablemanager'
        },
        {
            ref: 'queryBtn',
            selector: 'familledisablemanager #rechercher'
        },

        {
            ref: 'desactivesGrid',
            selector: 'familledisablemanager gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'familledisablemanager gridpanel pagingtoolbar'
        }
        , {
            ref: 'queryField',
            selector: 'familledisablemanager #query'
        }


    ],
    init: function (application) {
        this.control({
            'familledisablemanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'familledisablemanager #rechercher': {
                click: this.doSearch
            },
            'familledisablemanager #typeVente': {
                select: this.doSearch
            },

            'familledisablemanager gridpanel': {
                viewready: this.doInitStore
            },
            "familledisablemanager gridpanel actioncolumn": {
               remove: this.onDelete,
               activeProduit:this.activeProduit
            },
            'familledisablemanager #query': {
                specialkey: this.onSpecialKey
            }
            

        });
    },

    handleActionColumn: function (view, rowIndex, colIndex, item, e) {
        var me = this;
        var store = me.getDesactivesGrid().getStore(),
                rec = store.getAt(colIndex);
        if (parseInt(item) === 6) {
            me.onDelete(rec.get('lgFAMILLEID'));
        } else if (parseInt(item) === 5) {
            me.activeProduit(rec.get('lgFAMILLEID'));
        }
    },

    onDelete:function (view, rowIndex, colIndex, item, e, rec, row)  {
        var me = this;
       
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/produit/remove-desactive/' + rec.get('lgFAMILLEID'),
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
    activeProduit: function (view, rowIndex, colIndex, item, e, rec, row)  {
        var me = this;
       
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/produit/enable-desactives/' + rec.get('lgFAMILLEID'),
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
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getDesactivesGrid().getStore().getProxy();

        myProxy.params = {
            query: null
        };
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
        me.getDesactivesGrid().getStore().load({
            params: {
                "query": me.getQueryField().getValue()
            }
        });
    }
});