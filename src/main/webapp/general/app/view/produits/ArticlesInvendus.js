/* global Ext */

Ext.define('testextjs.view.produits.ArticlesInvendus', {
    extend: 'Ext.panel.Panel',
    xtype: 'stockmort',
    frame: true,
    title: 'Articles invendus',
    width: '98%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
    layout: 'fit',
    initComponent: function () {

        var filtreStock = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'LESS', libelle: "Inférieur à"},
                {id: 'EQUAL', libelle: "Egal à"},
                {id: 'GREATER', libelle: "Supérieur à"},
                {id: 'NOT', libelle: "Différent de"},
                {id: 'GREATER_EQUAL', libelle: "Superieur ou égal"},
                {id: 'LESS_EQUAL', libelle: "Inferieur ou égal"},
                {id: 'ALL', libelle: "Tous"}
            ]
        });

        var data = new Ext.data.Store({
            idProperty: 'code',
            fields: [
                {name: 'code', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'filterId', type: 'string'},
                {name: 'filterLibelle', type: 'string'},
                {name: 'stock', type: 'number'},
                {name: 'prixAchat', type: 'number'},
                {name: 'prixVente', type: 'number'},
                {name: 'lastDate', type: 'string'},
                {name: 'lastHour', type: 'string'}

            ],
            pageSize: 15,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/datareporting/articleInvendus',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }
        });
        var grossiste = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/grossiste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var rayons = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/rayons',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var familles = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/famillearticles',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var me = this;
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

                        }, {
                            xtype: 'tbseparator'
                        }
                        ,

                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            emptyText: 'Taper pour rechercher',
                            enableKeyEvents: true
                        },

                        {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'rayons',
                            store: rayons,
                            pageSize: 99999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un emplacement'
                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'grossiste',
                            store: grossiste,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un grossiste'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'codeFamile',
                            store: familles,
                            pageSize: 9999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez une famille'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
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
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            xtype: 'combobox',
                            fieldLabel: 'Filtre sur stock',
                            itemId: 'stockFiltre',
                            store: filtreStock,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            flex: 1,
                            queryMode: 'local',
                            emptyText: 'Filtre sur stock...'

                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'numberfield',
                            itemId: 'stock',
                            flex: 0.5,
                            emptyText: 'Stock'

                        }, {
                            text: 'suggestion',
                            itemId: 'suggestion',
                            iconCls: 'suggestionreapro',
                            tooltip: 'suggestion',
                            scope: this
                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'Export Excel',
                            itemId: 'btnExportExcel',
                            iconCls: 'export_excel'
                        },
                        {
                            text: 'Export CSV',
                            itemId: 'btnExportCsv',
                            iconCls: 'export_csv'
                        },
                        {
                            text: 'Créer inventaire',
                            itemId: 'btnCreateInventaire',
                            iconCls: 'inventaireicon'
                        }


                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: data,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [
                        {
                            header: 'Code CIP',
                            dataIndex: 'code',
                            flex: 0.5
                        },
                        {
                            header: 'Libellé',
                            dataIndex: 'libelle',
                            flex: 1.3
                        },

                        {
                            header: 'Prix.Vente',
                            dataIndex: 'prixVente',
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
                            header: 'Qté.Stock',
                            dataIndex: 'stock',
                            align: 'right',
                            flex: 0.5,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }

                        },
                        {
                            header: 'Date.dernière.vente',
                            dataIndex: 'lastDate',
                            flex: 1
                        }, {
                            header: 'Heure.dernière.vente',
                            dataIndex: 'lastHour',
                            flex: 1
                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: data,
                        pageSize: 15,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }
            ]

        });

        me.callParent(arguments);
    }

});



