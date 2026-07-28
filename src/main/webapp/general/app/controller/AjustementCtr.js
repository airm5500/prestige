
/* global Ext */

Ext.define('testextjs.controller.AjustementCtr', {
    extend: 'Ext.app.Controller',
    models: [
        'testextjs.model.caisse.Produit',
        'testextjs.model.caisse.ItemAjust'
    ],
    views: [
        'testextjs.view.produits.Ajuster'
    ],
    config: {
        current: null
    },
    refs: [

        {
            ref: 'ajustementview',
            selector: 'doajustementmanager'
        }
        , {
            ref: 'contenu',
            selector: 'doajustementmanager #contenu'
        },

        {
            ref: 'ventevno',
            selector: 'doajustementmanager #contenu panel'
        },
        {
            ref: 'ventevnoPaging',
            selector: 'doajustementmanager #contenu pagingtoolbar'
        },

        {ref: 'vnoproduitCombo',
            selector: 'doajustementmanager #produit'
        },
        {ref: 'vnoqtyField',
            selector: 'doajustementmanager #qtyField'
        },
        {ref: 'commentaire',
            selector: 'doajustementmanager #commentaire'
        },

        {ref: 'vnostockField',
            selector: 'doajustementmanager #stockField'
        }, {ref: 'typeAjustement',
            selector: 'doajustementmanager #typeAjustement'
        },

        {ref: 'vnobtnCloture',
            selector: 'doajustementmanager #contenu [xtype=toolbar] #btnCloture'
        },
        {ref: 'vnobtnGoBack',
            selector: 'doajustementmanager #contenu [xtype=toolbar] #btnGoBack'
        },
        {ref: 'vnogrid',
            selector: 'doajustementmanager #contenu #gridContainer #venteGrid'
        },
        {ref: 'vnoactioncolumn',
            selector: 'doajustementmanager #contenu [xtype=gridpanel] [xtype=actioncolumn]'
        },
        {ref: 'queryField',
            selector: 'doajustementmanager #contenu #gridContainer [xtype=gridpanel] #query'
        },
        {ref: 'vnopagingtoolbar',
            selector: 'doajustementmanager #contenu #gridContainer gridpanel #pagingtoolbar'
        },
        {ref: 'detailGrid',
            selector: 'doajustementmanager #contenu [xtype=gridpanel]'
        },
        {ref: 'pagingtoolbar',
            selector: 'doajustementmanager #contenu [xtype=gridpanel] #pagingtoolbar'
        }

    ],
    init: function () {
        this.control(
                {
                    'doajustementmanager': {
                        render: this.onReady
                    },

                    'doajustementmanager #qtyField': {
                        specialkey: this.onQtySpecialKey
                    },
                    'doajustementmanager #produit': {
                        afterrender: this.produitCmpAfterRender,
                        select: this.produitSelect,
                        specialkey: this.onProduitSpecialKey
                    },
                     'doajustementmanager #typeAjustement': {
                        select: this.onMotifSelect
                    }
                    ,

                    'doajustementmanager #contenu [xtype=gridpanel] pagingtoolbar': {
                        beforechange: this.doBeforechangeVno
                    },
                    'doajustementmanager #contenu [xtype=gridpanel] #btnRecherche': {
                        click: this.refresh
                    },
                    'doajustementmanager #contenu [xtype=gridpanel] #query': {
                        specialkey: this.onSpecialSpecialKey
                    },

                    'doajustementmanager #contenu [xtype=gridpanel] [xtype=actioncolumn]': {
                        click: this.removeItem
                    },

                    'doajustementmanager #contenu [xtype=gridpanel]': {
                        edit: this.onGridEdit
                    },
                    'doajustementmanager #contenu [xtype=toolbar] #btnGoBack': {
                        click: this.goBack
                    },
                    'doajustementmanager #contenu [xtype=toolbar] #btnCloture': {
                        click: this.doCloture
                    }

                });
    },

    onReady: function () {
        var me = this;
        me.current = null;

    },

    produitCmpAfterRender: function (cmp) {
        cmp.focus();
    },
     onMotifSelect: function (cmp, record) {
            var me = this;
             me.getVnoqtyField().focus(true, 100);
     },
    produitSelect: function (cmp, record) {
        var me = this;
        var record = cmp.findRecord("lgFAMILLEID" || "intCIP", cmp.getValue());
        if (record) {
            let vnostockField = me.getVnostockField();
            vnostockField.setValue(record.get('intNUMBERAVAILABLE'));
            /* focus directement sur la quantite (produit + qte, produit + qte...) ;
             * le motif reste selectionnable a la souris */
            me.getVnoqtyField().focus(true, 100);
        }
    },

    onProduitSpecialKey: function (field, e) {
        var me = this;
        field.suspendEvents();
        var task = new Ext.util.DelayedTask(function (combo, e) {
            if (e.getKey() === e.ENTER) {
                if (combo.getValue() === null || combo.getValue().trim() === "") {

                } else {
                    var record = combo.findRecord("lgFAMILLEID" || "intCIP", combo.getValue());
                    if (record) {
                        var vnostockField = me.getVnostockField();
                        vnostockField.setValue(record.get('intNUMBERAVAILABLE'));
                        me.getVnoqtyField().focus(true, 100);
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
            url: '../api/v1/vente/findone/' + field.getValue(),
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    var produit = result.data;
                    var vnostockField = me.getVnostockField();
                    vnostockField.setValue(produit.intNUMBERAVAILABLE);
                    me.getVnoqtyField().focus(true, 100);
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
        if (field.getValue() !== 0) {
            if (e.getKey() === e.ENTER) {
                var me = this;
                var produitCmp = me.getVnoproduitCombo();
                let typeAjustement = me.getTypeAjustement().getValue();
                var record = produitCmp.findRecord("lgFAMILLEID", produitCmp.getValue());
                record = record ? record : produitCmp.findRecord("intCIP", produitCmp.getValue());
                var ajustement = me.getCurrent();
                var ajustementId = null;
                if (ajustement) {
                    ajustementId = ajustement.lgAJUSTEMENTID;
                }
                var url = ajustement ? '../api/v1/ajustement/add/item' : '../api/v1/ajustement/creeation';
                if (record) {
                    var commentaire = me.getCommentaire().getValue();
                    var qte = parseInt(field.getValue());
                    // Zone ciblee : n'est prise en compte qu'a la creation de l'ajustement,
                    // elle vaut ensuite pour toutes ses lignes.
                    var cboZone = Ext.getCmp('str_ZONE_AJUSTEMENT');
                    // Une fois l'ajustement cree, sa zone est figee : la laisser modifiable
                    // laisserait croire que les lignes suivantes pourraient viser l'autre zone.
                    if (cboZone) {
                        cboZone.setDisabled(!!ajustementId);
                    }
                    var params = {
                        "refParent": ajustementId,
                        "value": qte,
                        "description": commentaire,
                        "refTwo": record.get('lgFAMILLEID'),
                        "valueTwo": record.get('intNUMBERAVAILABLE'),
                        "valueFour": typeAjustement,
                        "zone": (cboZone && cboZone.getValue()) ? cboZone.getValue() : 'RAYON'
                    };
                    me.addAjustement(params, url, field, produitCmp);
                }
            }
        }
    },
    refresh: function () {
        var me = this;
        var ajustement = me.getCurrent();
        var ajustementId = null;
        if (ajustement) {
            ajustementId = ajustement.lgAJUSTEMENTID;
        }
        var query = me.getQueryField().getValue();
        var grid = me.getVnogrid();
        grid.getStore()
                .load({
                    params: {
                        ajustementId: ajustementId,
                        query: query

                    },
                    callback: function (records, operation, successful) {
                        me.getVnoproduitCombo()
                                .focus(true, 100);
                    }
                });

    },
    addAjustement: function (params, url, field, comboxProduit) {
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
                    me.getVnostockField().setValue(0);
                    me.current = result.data;
                    field.setValue(1);
                    comboxProduit.clearValue();
                    me.refresh();
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
            ajustementId = ajustement.lgAJUSTEMENTID;
        }
        var query = me.getQueryField().getValue();
        myProxy.params = {
            ajustementId: ajustementId,
            query: query

        };
        myProxy.setExtraParam('ajustementId', ajustementId);
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
            url: '../api/v1/ajustement/item/' + record.get('lgAJUSTEMENTDETAILID'),
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
        var url = '../api/v1/ajustement/item/' + record.get('lgAJUSTEMENTDETAILID');

        if (e.field === 'intNUMBER') {
            params = {
                "ref": record.get('lgAJUSTEMENTDETAILID'),
                "value": record.get('intNUMBER'),
                "valueTwo": record.get('intNUMBERCURRENTSTOCK')
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
                url: '../api/v1/ajustement/' + current.lgAJUSTEMENTID,
                success: function (response, options) {
                }

            });
        }
        me.goBack();
    },
    goBack: function () {
        var xtype = 'ajustementmanager';
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
            ajustementId = ajustement.lgAJUSTEMENTID;
            var params = {
                "description": commentaire
            };

            var url = '../api/v1/ajustement/' + ajustementId;
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
                        Ext.MessageBox.show({
                            title: 'Impression',
                            msg: 'Voulez-vous imprimer ?',
                            buttons: Ext.MessageBox.YESNO,
                            fn: function (button) {
                                if ('yes' == button)
                                {
                                    me.onPrintPdf(ajustementId);
                                    me.goBack();
                                } else {
                                    me.goBack();
                                }

                            },
                            icon: Ext.MessageBox.QUESTION
                        });
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
    }
}
);