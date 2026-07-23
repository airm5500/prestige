/* global Ext */

// Ecran Historique de promotions, reconstruit en API REST (v1/promotions/historique) :
// consultation paginee de toutes les mises en promotion (produit, type, remise ou prix
// promotionnel, periode), avec recherche par CIP / nom de produit / type.
var url_rest_promotions_historique = '../api/v1/promotions/historique';
var Me_PromotionsHistorique;

Ext.define('testextjs.view.Promotions.PromotionHistoryManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'promotionhistorymanager',
    id: 'promotionhistorymanagerID',
    requires: [
        'Ext.grid.*',
        'Ext.data.*',
        'testextjs.model.promotions.PromotionHistory'
    ],
    title: 'Historique de promotions',
    closable: false,
    frame: true,
    initComponent: function () {

        Me_PromotionsHistorique = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.promotions.PromotionHistory',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_rest_promotions_historique,
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
            id: 'GridPromotionHistoriqueID',
            columns: [{
                    header: 'Date promotion',
                    dataIndex: 'dt_PROMOTED_DATE',
                    flex: 0.8
                }, {
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 0.7
                }, {
                    header: 'Produit',
                    dataIndex: 'str_NAME',
                    flex: 2
                }, {
                    header: 'Type',
                    dataIndex: 'str_TYPE',
                    flex: 1
                }, {
                    header: 'Remise %',
                    dataIndex: 'int_DISCOUNT',
                    align: 'right',
                    flex: 0.6
                }, {
                    header: 'Prix promo',
                    dataIndex: 'db_PROMOTION_PRICE',
                    align: 'right',
                    flex: 0.7
                }, {
                    header: 'Unit&eacute;s gratuites',
                    dataIndex: 'int_PACK_NUMBER',
                    align: 'right',
                    flex: 0.7
                }, {
                    header: 'A partir de',
                    dataIndex: 'int_ACTIVE_AT',
                    align: 'right',
                    flex: 0.6
                }, {
                    header: 'D&eacute;but',
                    dataIndex: 'dt_START_DATE',
                    flex: 0.7
                }, {
                    header: 'Fin',
                    dataIndex: 'dt_END_DATE',
                    flex: 0.7
                }, {
                    header: 'Nb mises en promo',
                    dataIndex: 'int_COUNT',
                    align: 'right',
                    flex: 0.7
                }],
            tbar: [{
                    xtype: 'textfield',
                    id: 'rech_promotion_historique',
                    emptyText: 'Recherche CIP / produit / type...',
                    flex: 1,
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_PromotionsHistorique.onRechClick();
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
        store.getProxy().setExtraParam('search_value', Ext.getCmp('rech_promotion_historique').getValue());
        store.loadPage(1);
    }
});
