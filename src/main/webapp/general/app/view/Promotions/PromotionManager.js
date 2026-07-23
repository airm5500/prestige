/* global Ext */

// Ecran Promotions, reconstruit en API REST (v1/promotions) : liste des promotions,
// creation/modification (type + periode), gestion des produits de chaque promotion
// (prix promotionnel calcule selon le type, produit marque comme promu pour la vente)
// et cloture (sortie de promotion de tous les produits).
var url_rest_promotions = '../api/v1/promotions';
var url_services_rest_promotions = '../api/v1/promotions/';
var Me_Promotions;

Ext.define('testextjs.view.Promotions.PromotionManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'promotionmanager',
    id: 'promotionmanagerID',
    requires: [
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.form.*',
        'testextjs.model.promotions.Promotion',
        'testextjs.model.promotions.PromotionProduct',
        'testextjs.model.Famille'
    ],
    title: 'Gestion des promotions',
    closable: false,
    frame: true,
    initComponent: function () {

        Me_Promotions = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.promotions.Promotion',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_rest_promotions,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store,
            id: 'GridPromotionsID',
            columns: [{
                    header: 'lg_CODE_PROMOTION_ID',
                    dataIndex: 'lg_CODE_PROMOTION_ID',
                    hidden: true,
                    flex: 0.5
                }, {
                    header: 'Type',
                    dataIndex: 'str_TYPE',
                    flex: 1.2
                }, {
                    header: 'D&eacute;but',
                    dataIndex: 'dt_START_DATE',
                    flex: 0.8
                }, {
                    header: 'Fin',
                    dataIndex: 'dt_END_DATE',
                    flex: 0.8
                }, {
                    header: 'Active',
                    dataIndex: 'bl_ACTIVE',
                    align: 'center',
                    flex: 0.5,
                    renderer: function (val) {
                        return val ? "<span style='color:#2E7D32;font-weight:bold'>Oui</span>"
                                : "<span style='color:#C62828;font-weight:bold'>Non</span>";
                    }
                }, {
                    header: 'Nb produits',
                    dataIndex: 'int_NUMBER_PRODUCT',
                    align: 'right',
                    flex: 0.6
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            iconCls: 'pillsv',
                            tooltip: 'G&eacute;rer les produits de la promotion',
                            scope: this,
                            handler: this.onProduitsClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier la promotion',
                            scope: this,
                            handler: this.onEditClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/disable.png',
                            tooltip: 'Cl&ocirc;turer la promotion (sort tous ses produits de promotion)',
                            scope: this,
                            handler: this.onCloturerClick
                        }]
                }],
            tbar: [{
                    text: 'Cr&eacute;er',
                    iconCls: 'addicon',
                    scope: this,
                    handler: function () {
                        this.ouvrirFenetrePromotion(null);
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rech_promotion',
                    emptyText: 'Recherche type...',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Promotions.onRechClick();
                                }
                            });
                        }
                    }
                }, {
                    text: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store,
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();
        this.on('afterlayout', function () {
            this.getStore().load();
        }, this, {delay: 1, single: true});
    },
    onRechClick: function () {
        var store = this.getStore();
        store.getProxy().setExtraParam('search_value', Ext.getCmp('rech_promotion').getValue());
        store.loadPage(1);
    },
    /* Fenetre de creation / modification d'une promotion */
    ouvrirFenetrePromotion: function (rec) {
        var me = this;
        var modeCreation = !rec;
        var win = Ext.create('Ext.window.Window', {
            title: modeCreation ? 'Cr&eacute;er une promotion'
                    : 'Modifier la promotion [' + rec.get('str_TYPE') + ']',
            modal: true,
            width: 460,
            layout: 'fit',
            items: [{
                    xtype: 'form',
                    bodyPadding: 12,
                    defaults: {anchor: '100%', labelWidth: 110},
                    items: [{
                            xtype: 'combobox',
                            itemId: 'promoType',
                            fieldLabel: 'Type',
                            store: ['REMISE', 'PRIX SPECIAL', 'UNITES GRATUITES'],
                            editable: false,
                            allowBlank: false,
                            value: rec ? rec.get('str_TYPE') : undefined,
                            emptyText: 'Choisir un type...'
                        }, {
                            xtype: 'datefield',
                            itemId: 'promoDebut',
                            fieldLabel: 'D&eacute;but',
                            format: 'd/m/Y',
                            submitFormat: 'Y-m-d',
                            allowBlank: false,
                            value: rec ? Ext.Date.parse(rec.get('dt_START_DATE'), 'd/m/Y') : new Date()
                        }, {
                            xtype: 'datefield',
                            itemId: 'promoFin',
                            fieldLabel: 'Fin',
                            format: 'd/m/Y',
                            submitFormat: 'Y-m-d',
                            allowBlank: false,
                            value: rec ? Ext.Date.parse(rec.get('dt_END_DATE'), 'd/m/Y') : new Date()
                        }]
                }],
            buttons: [{
                    text: 'Enregistrer',
                    handler: function () {
                        var form = win.down('form');
                        if (!form.isValid()) {
                            Ext.MessageBox.alert('Echec', 'Formulaire non valide');
                            return;
                        }
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_rest_promotions + (modeCreation ? 'create' : 'update'),
                            method: 'POST',
                            params: {
                                lg_CODE_PROMOTION_ID: modeCreation ? '' : rec.get('lg_CODE_PROMOTION_ID'),
                                str_TYPE: form.down('#promoType').getValue(),
                                dt_START_DATE: form.down('#promoDebut').getSubmitValue(),
                                dt_END_DATE: form.down('#promoFin').getSubmitValue()
                            },
                            success: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                Ext.MessageBox.alert('Confirmation', object.errors);
                                win.close();
                                me.getStore().reload();
                            },
                            failure: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });
        win.show();
    },
    onEditClick: function (grid, rowIndex) {
        this.ouvrirFenetrePromotion(grid.getStore().getAt(rowIndex));
    },
    onCloturerClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        Ext.MessageBox.confirm('Message',
                'Cl&ocirc;turer la promotion <b>' + rec.get('str_TYPE') + '</b> ?<br>'
                + 'Ses ' + rec.get('int_NUMBER_PRODUCT') + ' produit(s) sortiront de promotion.',
                function (btn) {
                    if (btn === 'yes') {
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_rest_promotions + 'cloturer',
                            method: 'POST',
                            params: {lg_CODE_PROMOTION_ID: rec.get('lg_CODE_PROMOTION_ID')},
                            success: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                Ext.MessageBox.alert(object.success == "0" ? 'Error Message' : 'Confirmation',
                                        object.errors);
                                grid.getStore().reload();
                            },
                            failure: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                });
    },
    /* Fenetre de gestion des produits d'une promotion */
    onProduitsClick: function (grid, rowIndex) {
        var me = this;
        var promo = grid.getStore().getAt(rowIndex);
        var promoId = promo.get('lg_CODE_PROMOTION_ID');
        var promoType = promo.get('str_TYPE');

        var storeProduits = new Ext.data.Store({
            model: 'testextjs.model.promotions.PromotionProduct',
            pageSize: 10,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_rest_promotions + 'produits',
                extraParams: {lg_CODE_PROMOTION_ID: promoId},
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });
        // Choix du produit : meme webservice famille que les autres ecrans
        var storeFamille = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/sm_user/famille/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }
        });

        var win = Ext.create('Ext.window.Window', {
            title: 'Produits de la promotion [' + promoType + ' du ' + promo.get('dt_START_DATE')
                    + ' au ' + promo.get('dt_END_DATE') + ']',
            modal: true,
            width: '85%',
            height: 520,
            layout: 'fit',
            items: [{
                    xtype: 'gridpanel',
                    store: storeProduits,
                    columns: [{
                            header: 'CIP',
                            dataIndex: 'int_CIP',
                            flex: 0.7
                        }, {
                            header: 'Produit',
                            dataIndex: 'str_NAME',
                            flex: 2
                        }, {
                            header: 'Prix actuel',
                            dataIndex: 'int_PRICE',
                            align: 'right',
                            flex: 0.7
                        }, {
                            header: 'Remise %',
                            dataIndex: 'int_DISCOUNT',
                            align: 'right',
                            hidden: promoType !== 'REMISE',
                            flex: 0.6
                        }, {
                            header: 'Prix promo',
                            dataIndex: 'int_PROMOTION_PRICE',
                            align: 'right',
                            hidden: promoType === 'UNITES GRATUITES',
                            flex: 0.7
                        }, {
                            header: 'Unit&eacute;s gratuites',
                            dataIndex: 'int_PACK_NUMBER',
                            align: 'right',
                            hidden: promoType !== 'UNITES GRATUITES',
                            flex: 0.7
                        }, {
                            header: 'A partir de',
                            dataIndex: 'int_ACTIVE_AT',
                            align: 'right',
                            hidden: promoType !== 'UNITES GRATUITES',
                            flex: 0.6
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Retirer ce produit de la promotion',
                                    handler: function (g, ri) {
                                        var ligne = g.getStore().getAt(ri);
                                        Ext.MessageBox.confirm('Message',
                                                'Retirer <b>' + ligne.get('str_NAME') + '</b> de la promotion ?',
                                                function (btn) {
                                                    if (btn === 'yes') {
                                                        Ext.Ajax.request({
                                                            url: url_services_rest_promotions + 'produits/remove',
                                                            method: 'POST',
                                                            params: {
                                                                lg_PROMOTION_PRODUCT_ID: ligne.raw.lg_PROMOTION_PRODUCT_ID
                                                            },
                                                            success: function (response) {
                                                                var object = Ext.JSON.decode(response.responseText, false);
                                                                Ext.MessageBox.alert(object.success == "0"
                                                                        ? 'Error Message' : 'Confirmation', object.errors);
                                                                storeProduits.reload();
                                                                me.getStore().reload();
                                                            }
                                                        });
                                                    }
                                                });
                                    }
                                }]
                        }],
                    tbar: [{
                            xtype: 'combobox',
                            itemId: 'choixProduit',
                            emptyText: 'Rechercher un produit (3 lettres min)...',
                            store: storeFamille,
                            valueField: 'lg_FAMILLE_ID',
                            displayField: 'str_NAME',
                            typeAhead: false,
                            minChars: 3,
                            pageSize: 20,
                            queryMode: 'remote',
                            flex: 2
                        }, {
                            xtype: 'numberfield',
                            itemId: 'champRemise',
                            emptyText: 'Remise %',
                            minValue: 1,
                            maxValue: 99,
                            hidden: promoType !== 'REMISE',
                            width: 100
                        }, {
                            xtype: 'numberfield',
                            itemId: 'champPrixPromo',
                            emptyText: 'Prix promo',
                            minValue: 1,
                            hidden: promoType !== 'PRIX SPECIAL',
                            width: 110
                        }, {
                            xtype: 'numberfield',
                            itemId: 'champPack',
                            emptyText: 'Unit&eacute;s gratuites',
                            minValue: 1,
                            hidden: promoType !== 'UNITES GRATUITES',
                            width: 130
                        }, {
                            xtype: 'numberfield',
                            itemId: 'champSeuil',
                            emptyText: 'A partir de (qte)',
                            minValue: 1,
                            hidden: promoType !== 'UNITES GRATUITES',
                            width: 130
                        }, {
                            text: 'Ajouter',
                            iconCls: 'addicon',
                            handler: function () {
                                var conteneur = win.down('gridpanel');
                                var familleId = conteneur.down('#choixProduit').getValue();
                                if (!familleId) {
                                    Ext.MessageBox.alert('Information', 'Choisissez d\'abord un produit.');
                                    return;
                                }
                                Ext.Ajax.request({
                                    url: url_services_rest_promotions + 'produits/add',
                                    method: 'POST',
                                    params: {
                                        lg_CODE_PROMOTION_ID: promoId,
                                        lg_FAMILLE_ID: familleId,
                                        int_DISCOUNT: conteneur.down('#champRemise').getValue() || 0,
                                        db_PROMOTION_PRICE: conteneur.down('#champPrixPromo').getValue() || 0,
                                        int_PACK_NUMBER: conteneur.down('#champPack').getValue() || 0,
                                        int_ACTIVE_AT: conteneur.down('#champSeuil').getValue() || 0
                                    },
                                    success: function (response) {
                                        var object = Ext.JSON.decode(response.responseText, false);
                                        if (object.success == "0") {
                                            Ext.MessageBox.alert('Error Message', object.errors);
                                            return;
                                        }
                                        conteneur.down('#choixProduit').setValue('');
                                        storeProduits.reload();
                                        me.getStore().reload();
                                    },
                                    failure: function (response) {
                                        Ext.MessageBox.alert('Error Message', response.responseText);
                                    }
                                });
                            }
                        }],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: storeProduits,
                        displayInfo: true
                    }
                }],
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }]
        });
        win.show();
    }
});
