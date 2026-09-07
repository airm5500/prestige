/* global Ext */

Ext.define('testextjs.view.Dashboard.MargeManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'margeproducts',
    frame: true,
    title: 'Marge sur produits vendus',
    width: '98%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
    layout: 'fit',
    initComponent: function () {
        var data = new Ext.data.Store({
            idProperty: 'code',
            fields: [
                {name: 'code', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'montantCumulTTC', type: 'number'},
                {name: 'montantCumulHT', type: 'number'},
                {name: 'montantRemise', type: 'number'},
                {name: 'montantTva', type: 'number'},
                {name: 'montantCumulTva', type: 'number'},
                {name: 'montantCumulAchat', type: 'number'},
                {name: 'montantCumulMarge', type: 'number'},
                {name: 'pourcentageCumulMage', type: 'number'},
                {name: 'montantCumulMarge', type: 'number'}


            ],
            pageSize: 15,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/datareporting/margeproduitsvendus',
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

                        }
                        , {
                            xtype: 'tbseparator'
                        },
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
                            xtype: 'combo',
                            emptyText: 'filtre marge',
                            labelWidth: 1,
                            flex: 1,
                            editable: false,
                            itemId: 'filtre',
                            valueField: 'ID',
                            displayField: 'VALUE',
                            value: 'ALL',
                            store: Ext.create("Ext.data.Store", {
                                fields: ["ID", "VALUE"],

                                data: [{'ID': "LESS", "VALUE": "Inférieur à"},
                                    {'ID': "LESS_EQUAL", "VALUE": "Inférieur ou équal à"},
                                    {'ID': "GREATER", "VALUE": "Supérieur à"},
                                    {'ID': "GREATER_EQUAL", "VALUE": "Supérieur ou équal à"},
                                    {'ID': "EQUAL", "VALUE": "Equal à"},
                                    {'ID': "NOT", "VALUE": "Différent de"},

                                    {'ID': "ALL", "VALUE": "Tous"}

                                ]
                            })
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'numberfield',
                            itemId: 'critere',
                            flex: 1,
                            hidden: true,
                            emptyText: 'Saisir une marge',
                            hideTrigger:true,
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
                            flex: 1.4

                        },

                        {
                            header: 'Qté',
                            dataIndex: 'montantCumulTva',
                            flex: 0.4,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }


                        }
                        , {
                            header: 'P.Achat',
                            dataIndex: 'montantTva',
                            flex: 0.6,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        },
                        {
                            header: 'P.Vente',
                            dataIndex: 'montantRemise',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.6
                        },
                        {
                            header: 'Valeur.Achat',
                            dataIndex: 'montantCumulAchat',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.6
                        },
                        {
                            header: 'Montant.TTC',
                            dataIndex: 'montantCumulTTC',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.6
                        },
                        {
                            header: 'Montant.HT',
                            dataIndex: 'montantCumulHT',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.6
                        },
                        {
                            header: 'Marge',
                            dataIndex: 'montantCumulMarge',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.6
                        },
                        {
                            header: '%Marge',
                            dataIndex: 'pourcentageCumulMage',
                            align: 'right',
                            flex: 0.6
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



