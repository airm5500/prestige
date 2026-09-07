/* global Ext */

Ext.define('testextjs.view.Dashboard.TiersPayantExclus', {
    extend: 'Ext.tab.Panel',
    xtype: 'tpexclus',
    frame: false,
    width: '97%',
    height: 670,
//    fullscreen: true,
    tabPosition: "top",

    initComponent: function () {

        var tierspayantExlus = new Ext.data.Store({
            fields: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'code',
                    type: 'string'
                },
                {
                    name: 'nom',
                    type: 'string'
                },
                {
                    name: 'nomComplet',
                    type: 'string'
                },
                {
                    name: 'account',
                    type: 'number'
                }
            ],
            pageSize: 20,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v2/tiers-payant/list-exclus',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }
        });
        var ventes = new Ext.data.Store({
            fields: [
                {
                    name: 'tiersPayantId',
                    type: 'string'
                },
                {
                    name: 'codeTiersPayant',
                    type: 'string'
                },
                {
                    name: 'libelleTiersPayant',
                    type: 'string'
                },
                {
                    name: 'operateur',
                    type: 'string'
                },
                {
                    name: 'montant',
                    type: 'number'
                },
                {
                    name: 'dateVente',
                    type: 'string'
                }, {
                    name: 'taux',
                    type: 'number'
                }
                , {
                    name: 'refVente',
                    type: 'string'
                }, {
                    name: 'refBon',
                    type: 'string'
                }

            ],
            pageSize: 18,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v2/tiers-payant/ventes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 2400000
            }
        });

        var reglements = new Ext.data.Store({
            fields: [
                {
                    name: 'tiersPayantId',
                    type: 'string'
                },
                {
                    name: 'description',
                    type: 'string'
                },
                {
                    name: 'tiersPayant',
                    type: 'string'
                }, {
                    name: 'userId',
                    type: 'string'
                },
                {
                    name: 'user',
                    type: 'string'
                },
                {
                    name: 'montantPaye',
                    type: 'number'
                },
                {
                    name: 'createdAt',
                    type: 'string'
                }, {
                    name: 'montantPayer',
                    type: 'number'
                }
                , {
                    name: 'montantRestant',
                    type: 'number'
                }, {
                    name: 'id',
                    type: 'string'
                }

            ],
            pageSize: 18,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v2/tiers-payant/reglements',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 2400000
            }
        });

        var me = this;
        Ext.applyIf(me, {
            dockedItems: [
                {xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'combobox',
                            flex: 1.5,
                            margin: '0 5 0 0',
                            fieldLabel: 'Tiers-payants',
                            itemId: 'tiersPayantsExclus',
                            store: tierspayantExlus,
                            pageSize: 20,
                            valueField: 'id',
                            displayField: 'nomComplet',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un tiers-payant'
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 0.5,
                            labelWidth: 20,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 20,
                            flex: 0.5,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'
                        }
                        , {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'btnVentePanel',
                            scope: this,
                            iconCls: 'searchicon'
                        }, {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }]
                }

            ],
            items: [
                {
                    xtype: 'panel',
                    title: 'VENTES',
                    border: false,
                    itemId: 'ventePanel',
                    scrollable: true,
                    items: [
                        {
                            xtype: 'gridpanel',
                            title: '',
                            border: false,
                            store: ventes,
                            scrollable: true,
                            columns:
                                    [
                                        {
                                            header: 'id',
                                            dataIndex: 'tiersPayantId',
                                            hidden: true
                                        },

                                        {
                                            header: 'Code',
                                            dataIndex: 'codeTiersPayant',
                                            hidden: true,
                                            flex: 0.4
                                        },

                                        {
                                            header: 'Tiers-payant',
                                            dataIndex: 'libelleTiersPayant',
                                            flex: 1
                                        },
                                        {
                                            header: 'Date',
                                            dataIndex: 'dateVente',
                                            flex: 0.5
                                        }, {
                                            header: 'Référence',
                                            dataIndex: 'refVente',
                                            flex: 0.5
                                        }, {
                                            header: 'Montant',
                                            dataIndex: 'montant',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },
                                        {
                                            header: 'Opérateur',
                                            dataIndex: 'operateur',
                                            hidden: true,
                                            flex: 1
                                        }

                                    ],
                            selModel: {
                                selType: 'cellmodel'

                            },
                            dockedItems: [
                                {
                                    xtype: 'pagingtoolbar',
                                    store: ventes,
                                    pageSize: 18,
                                    dock: 'bottom',
                                    displayInfo: true

                                },
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    items: [
                                        {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Montant',
                                            labelWidth: 80,
                                            itemId: 'montant',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }, {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Nombre de vente',
                                            labelWidth: 120,
                                            itemId: 'nbreVente',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }

                                    ]
                                }

                            ]
                        }
                    ]
                },
                {
                    xtype: 'panel',
                    title: 'REGLEMENTS',
                    border: false,
                    itemId: 'reglementPanel',
                    items: [

                        {
                            xtype: 'gridpanel',
                            title: '',
                            border: false,
                            store: reglements,
                            scrollable: true,
                            columns:
                                    [
                                        {
                                            header: 'id',
                                            dataIndex: 'id',
                                            hidden: true
                                        },

                                        {
                                            header: 'Tiers-payant',
                                            dataIndex: 'tiersPayant',
                                            flex: 1
                                        },

                                        {
                                            header: 'Description',
                                            dataIndex: 'description',
                                            flex: 1
                                        },
                                        {
                                            header: 'Date',
                                            dataIndex: 'createdAt',
                                            flex: 0.5
                                        }, {
                                            header: 'Montant versé',
                                            dataIndex: 'montantPaye',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5

                                        },
                                        {
                                            header: 'Montant attendu',
                                            dataIndex: 'montantPayer',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },

                                        {
                                            header: 'Montant restant',
                                            dataIndex: 'montantRestant',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },
                                        {
                                            header: 'Opérateur',
                                            dataIndex: 'user',
                                            hidden: true,
                                            flex: 1
                                        }

                                    ],
                            selModel: {
                                selType: 'cellmodel'

                            },
                            dockedItems: [
                                {
                                    xtype: 'pagingtoolbar',
                                    store: reglements,
                                    pageSize: 18,
                                    dock: 'bottom',
                                    displayInfo: true

                                },
                                {
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    items: [
                                        {
                                            text: 'Nouveau règlement',
                                            scope: this,
                                            itemId: 'btnReglement',
                                            iconCls: 'addicon'

                                        },
                                        {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Solde',
                                            labelWidth: 50,
                                            itemId: 'accountReglement',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:red;font-weight:900;",
                                            value: 0

                                        }

                                    ]
                                },
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    items: [
                                        {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Total versé',
                                            labelWidth: 80,
                                            itemId: 'montantPaye',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }, {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Nombre de versement',
                                            labelWidth: 150,
                                            itemId: 'montantPayer',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }

                                    ]
                                }

                            ]
                        }
                    ]
                }



            ]
        });
        me.callParent(arguments);
    }
});
