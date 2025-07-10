
/* global Ext */

Ext.define('testextjs.controller.DoRetourCarnetCtr', {
    extend: 'Ext.app.Controller',
    models: [
        'testextjs.model.caisse.Produit'
    ],
    views: [
        'testextjs.view.Dashboard.DoRetourCarnet'
    ],
    config: {
        current: null
    },
    refs: [

        {
            ref: 'doRetourCarnet',
            selector: 'doRetourCarnet'
        }
        , {
            ref: 'contenu',
            selector: 'doRetourCarnet #contenu'
        },

        {
            ref: 'ventevno',
            selector: 'doRetourCarnet #contenu panel'
        },
        {
            ref: 'ventevnoPaging',
            selector: 'doRetourCarnet #contenu pagingtoolbar'
        },

        {ref: 'vnoproduitCombo',
            selector: 'doRetourCarnet #produit'
        },
        {ref: 'tiersPayantsExclus',
            selector: 'doRetourCarnet #tiersPayantsExclus'
        },

        {ref: 'vnoqtyField',
            selector: 'doRetourCarnet #qtyField'
        },
        {ref: 'commentaire',
            selector: 'doRetourCarnet #commentaire'
        },

        {ref: 'vnostockField',
            selector: 'doRetourCarnet #stockField'
        },
        {ref: 'typeAjustement',
            selector: 'doRetourCarnet #motifRetour'
        },

        {ref: 'vnobtnCloture',
            selector: 'doRetourCarnet #contenu [xtype=toolbar] #btnCloture'
        },
        {ref: 'vnobtnGoBack',
            selector: 'doRetourCarnet #contenu [xtype=toolbar] #btnGoBack'
        },
        {ref: 'vnogrid',
            selector: 'doRetourCarnet #contenu #gridContainer #venteGrid'
        },
        {ref: 'vnoactioncolumn',
            selector: 'doRetourCarnet #contenu [xtype=gridpanel] [xtype=actioncolumn]'
        },
        {ref: 'queryField',
            selector: 'doRetourCarnet #contenu #gridContainer [xtype=gridpanel] #query'
        },
        {ref: 'vnopagingtoolbar',
            selector: 'doRetourCarnet #contenu #gridContainer gridpanel #pagingtoolbar'
        },
        {ref: 'detailGrid',
            selector: 'doRetourCarnet #contenu [xtype=gridpanel]'
        },
        {ref: 'pagingtoolbar',
            selector: 'doRetourCarnet #contenu [xtype=gridpanel] #pagingtoolbar'
        },

        {ref: 'dtStart',
            selector: 'doRetourCarnet #dtStart'
        },
        {ref: 'dtEnd',
            selector: 'doRetourCarnet #dtEnd'
        }

    ],
    init: function () {
        this.control(
                {
                    'doRetourCarnet': {
                        render: this.onReady
                    },

                    'doRetourCarnet #qtyField': {
                        specialkey: this.onQtySpecialKey
                    },

                    'doRetourCarnet #produit': {
                        afterrender: this.produitCmpAfterRender,
                        select: this.produitSelect,
                        specialkey: this.onProduitSpecialKey
                    },
                    'doRetourCarnet #motifRetour': {
                        select: this.onMotifSelect
                    }
                    , 'doRetourCarnet #tiersPayantsExclus': {
                        select: this.onTpSelect
                    }
                    ,

                    'doRetourCarnet #contenu [xtype=gridpanel] pagingtoolbar': {
                        beforechange: this.doBeforechangeVno
                    },
                    'doRetourCarnet #contenu [xtype=gridpanel] #btnRecherche': {
                        click: this.refresh
                    },
                    'doRetourCarnet #contenu [xtype=gridpanel] #query': {
                        specialkey: this.onSpecialSpecialKey
                    },

                    'doRetourCarnet #contenu [xtype=gridpanel] [xtype=actioncolumn]': {
                        click: this.removeItem
                    },

                    'doRetourCarnet #contenu [xtype=gridpanel]': {
                        edit: this.onGridEdit
                    },
                    'doRetourCarnet #contenu [xtype=toolbar] #btnGoBack': {
                        click: this.goBack
                    },
                    'doRetourCarnet #contenu [xtype=toolbar] #btnCloture': {
                        click: this.doCloture
                    }

                });
    },

    onReady: function () {
        var me = this;
        me.current = null;
        me.getVnoproduitCombo().getStore().on('beforeload', function (store, operation) {
            operation.params = operation.params || {};
            operation.params.tiersPayantId = me.getTiersPayantsExclus().getValue();
            operation.params.dtEnd = me.getDtEnd().getSubmitValue();
            operation.params.dtStart = me.getDtStart().getSubmitValue();

        });


    },
    onBeforeload: function (store, operation) {
        var me = this;
        operation.params = operation.params || {};
        operation.params.tiersPayantId = me.getTiersPayantsExclus().getValue();
    },
    produitCmpAfterRender: function (cmp) {
        cmp.focus();
    },
    onMotifSelect: function (cmp, record) {
        var me = this;
        me.getVnoqtyField().focus(true, 100);
    },
    onTpSelect: function (cmp, record) {
        var me = this;
        me.getVnoproduitCombo().clearValue();
        me.getVnoproduitCombo().focus(true, 100);
         me.getVnoproduitCombo().getStore().load();
    },

    produitSelect: function (cmp, record) {
        var me = this;
        var record = cmp.findRecord("id" || "cip", cmp.getValue());
        if (record) {
            let motifField = me.getTypeAjustement();
            motifField.focus(true, 100);
        }
    },

    onProduitSpecialKey: function (field, e) {
        var me = this;
        field.suspendEvents();
        var task = new Ext.util.DelayedTask(function (combo, e) {
            if (e.getKey() === e.ENTER) {
                if (combo.getValue() === null || combo.getValue().trim() === "") {

                } else {
                    var record = combo.findRecord("id" || "cip", combo.getValue());
                    if (record) {
                        me.getTypeAjustement().focus(true, 100);
                    } else {
                        me.checkDouchette(combo);
                    }
                }
            }
            combo.resumeEvents();
        }, this);
        task.delay(10, null, null, arguments);

    },
    checkDouchette(field) {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v2/carnet-depot/produits-one/' + field.getValue() + '/' + me.getTiersPayantsExclus().getValue(),
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.getTypeAjustement().focus(true, 100);
                } else {
                    field.focus(true, 100);
                }

            }

        });
    },
    onSpecialSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.refresh();
        }
    },

    onQtySpecialKey: function (field, e, options) {
        var me = this;
        let tiersPayantsExclus = me.getTiersPayantsExclus().getValue();
        if (field.getValue() !== 0 && tiersPayantsExclus) {
            if (e.getKey() === e.ENTER) {

                var produitCmp = me.getVnoproduitCombo();
                let typeAjustement = me.getTypeAjustement().getValue();
                var record = produitCmp.findRecord("id", produitCmp.getValue());
                record = record ? record : produitCmp.findRecord("cip", produitCmp.getValue());
                var ajustement = me.getCurrent();
                var ajustementId = null;
                if (ajustement) {
                    ajustementId = ajustement.id;
                }
                var url = ajustement ? '../api/v2/retour-carnet-depot/add/item' : '../api/v2/retour-carnet-depot/creeation';
                if (record) {
                    var commentaire = me.getCommentaire().getValue();
                    var qte = parseInt(field.getValue());
                    var params = {
                        "refParent": ajustementId,
                        "value": qte,
                        "description": commentaire,
                        "refTwo": record.get('id'),
                        "valueFour": typeAjustement,
                        "ref": tiersPayantsExclus
                    };
                    me.addRetour(params, url, field, produitCmp);
                }
            }
        }
    },
    refresh: function () {
        var me = this;
        var ajustement = me.getCurrent();
        var ajustementId = null;
        if (ajustement) {
            ajustementId = ajustement.id;
        }
        var query = me.getQueryField().getValue();
        var grid = me.getVnogrid();
        grid.getStore()
                .load({
                    params: {
                        retourCarnetId: ajustementId,
                        query: query

                    },
                    callback: function (records, operation, successful) {
                        me.getVnoproduitCombo()
                                .focus(true, 100);
                    }
                });

    },
    addRetour: function (params, url, field, comboxProduit) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: url,
            params: Ext.JSON.encode(params),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.current = result.data;
                    field.setValue(1);
                    comboxProduit.clearValue();
                    me.getTypeAjustement().clearValue();
                    me.refresh();
                    me.getTiersPayantsExclus().setReadOnly(true);
                }
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }
        });
    },
    doBeforechangeVno: function (page, currentPage) {
        var me = this;
        var myProxy = me.getVnogrid().getStore().getProxy();
        var ajustement = me.getCurrent();

        var ajustementId = null;
        if (ajustement) {
            ajustementId = ajustement.id;
        }
        var query = me.getQueryField().getValue();
        myProxy.params = {
            retourCarnetId: ajustementId,
            query: query

        };
        myProxy.setExtraParam('id', ajustementId);
        myProxy.setExtraParam('query', query);

    },

    doSearch: function () {
        var me = this;
        me.refresh();
    },
    removeItem: function (grid, rowIndex, colIndex) {
        var me = this;
        var record = grid.getStore().getAt(colIndex);
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v2/retour-carnet-depot/item/' + record.get('id'),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.getVnoproduitCombo()
                            .focus(true, 100);

                    me.refresh();
                }
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }
        });
    }
    ,

    updateventeOnAjustementgrid: function (editor, e, url, params) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            url: url,
            params: Ext.JSON.encode(params),
            success: function (response, options) {
                progress.hide();
                e.record.commit();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.current = result.data;
                } else {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: result.msg,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {

                            }
                        }
                    });
                }
                me.refresh();

            },
            failure: function (response, options) {
                progress.hide();
                editor.cancelEdit();
                e.record.commit();
                Ext.Msg.alert("Message", "L'opération a échoué " + response.status);
            }

        });
    },
    onGridEdit: function (editor, e) {
        var params = {};
        var me = this;
        var record = e.record;
        var url = '../api/v2/retour-carnet-depot/item/' + record.get('id');
        if (e.field === 'qtyRetour') {
            params = {
                "value": record.get('qtyRetour')
            };
            me.updateventeOnAjustementgrid(editor, e, url, params);
        }


    },
    removeAjustemement: function () {
        var me = this, current = me.getCurrent();
        if (current) {
            Ext.Ajax.request({
                headers: {'Content-Type': 'application/json'},
                method: 'DELETE',
                url: '../api/v2/retour-carnet-depot/' + current.id,
                success: function (response, options) {
                }

            });
        }
        me.goBack();
    },
    goBack: function () {
        const xtype = 'retourcarnetdepot';
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },

    onPrintPdf: function (id) {
        var url = '../webservices/stockmanagement/ajustementmanagement/ws_generate_pdf.jsp?lg_AJUSTEMENT_ID=' + id;
        window.open(url);
    },

    clotureAjustement: function () {
        var me = this;
        var ajustement = me.getCurrent();
        var commentaire = me.getCommentaire().getValue();
        var ajustementId = null;
        if (ajustement) {
            ajustementId = ajustement.id;
            var params = {
                "description": commentaire
            };

            var url = '../api/v2/retour-carnet-depot/' + ajustementId;
            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                url: url,
                params: Ext.JSON.encode(params),
                success: function (response, options) {
                    var result = Ext.JSON.decode(response.responseText, true);
                    progress.hide();
                    if (result.success) {
                        me.resetAllCmp();
                        me.getTiersPayantsExclus().setReadOnly(false);
                    } else {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: result.msg,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {

                                }
                            }
                        });
                    }

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                }

            });
        }
    },
    doCloture: function () {
        var me = this;
        me.clotureAjustement();
    },
    resetAllCmp: function () {
        var me = this;
        me.current = null;
        me.getVnoqtyField().setValue(1);
        me.getVnoproduitCombo().clearValue();
        me.getCommentaire().setValue('');
        me.getTypeAjustement().clearValue();
        me.getTiersPayantsExclus().clearValue();
        me.getTiersPayantsExclus().setReadOnly(false);
        me.getTiersPayantsExclus().focus(true, 50);
        me.refresh();

    }
}
);