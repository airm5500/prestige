/* global Ext */

Ext.define('testextjs.view.produits.ProuduitsVenteAnnules', {
    extend: 'Ext.panel.Panel',
    xtype: 'venteproduitannules',
    frame: true,
    title: 'Produits vendus annulés',
    width: '98%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
    layout: 'fit',
    initComponent: function () {

        const storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/users',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        const data = new Ext.data.Store({

            fields: [
                {name: 'numberOfTime', type: 'number'},
                {name: 'produitId', type: 'string'},
                {name: 'cip', type: 'string'},
                {name: 'produitName', type: 'string'},
                {name: 'quantity', type: 'number'},
                {name: 'prixAchat', type: 'number'},
                {name: 'prixUni', type: 'number'},
                {name: 'userId', type: 'string'},
                {name: 'abrName', type: 'string'}

            ],
            pageSize: 17,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/stats/produit-annules',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }
        });

        const me = this;
        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            submitFormat: 'Y-m-d',
                            flex: 0.8,
                            labelWidth: 17,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 17,
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        },

                        {
                            xtype: 'tbseparator'
                        }

                        , {
                            xtype: 'combobox',
                            fieldLabel: 'Utilisateur',
                            itemId: 'user',
                            store: storeUser,
                            pageSize: 10,
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            typeAhead: false,
                            flex: 2,
                            minChars: 2,
                            labelWidth: 60,
                            queryMode: 'remote',
                            emptyText: 'Choisir un utilisateur...'

                        },
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, {
                            xtype: 'tbseparator'
                        }, {
                            text: 'Générer un inventaire',
                            itemId: 'doInventaire',
                            tooltip: 'Générer un inventaire',
                            scope: this
                        }
                        , {
                            xtype: 'tbseparator'
                        }, {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    itemId: 'itemGrid',
                    store: data,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [
                        {
                            header: 'Code CIP',
                            dataIndex: 'cip',
                            flex: 0.5
                        },
                        {
                            header: 'Libellé',
                            dataIndex: 'produitName',
                            flex: 1.3
                        },

                        {
                            header: 'Prix.Vente',
                            dataIndex: 'prixUni',
                            flex: 0.4,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }

                        }
                        , {
                            header: 'Prix.Achat',
                            dataIndex: 'prixAchat',
                            flex: 0.4,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }

                        },
                        {
                            header: 'Opérateur',
                            dataIndex: 'abrName',
                            flex: 1
                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: data,
                        pageSize: 17,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }
            ]

        });

        me.callParent(arguments);
    }

});
