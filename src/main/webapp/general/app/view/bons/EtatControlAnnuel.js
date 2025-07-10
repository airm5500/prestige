/* global Ext */

Ext.define('testextjs.view.bons.EtatControlAnnuel', {
    extend: 'Ext.panel.Panel',
    xtype: 'etatannuel',
    frame: true,
    title: 'Etat de control annuel',
    width: '98%',
    // height:  580,
    minHeight: 580,
    maxHeight: 780,
    cls: 'custompanel',
    layout: 'fit',
    initComponent: function () {

        const groupByStore = Ext.create('Ext.data.ArrayStore', {
            data: [['GROSSISTE', 'Grouper par grossiste'], ['GROUP', 'Grouper par groupe']],
            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}]
        });
        const data = new Ext.data.Store({
            idProperty: 'groupByLibelle',
            fields: [
                {name: 'groupByLibelle', type: 'string'},
                {name: 'montantHtaxe', type: 'number'},
                {name: 'montantTaxe', type: 'number'},
                {name: 'montantTtc', type: 'number'},
                {name: 'montantVenteTtc', type: 'number'},
                {name: 'montantMarge', type: 'number'},
                {name: 'nbreBon', type: 'number'},
                {name: 'pourcentage', type: 'number'}
            ],
            pageSize: 9999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/etat-control-bon/list-annuelle',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 2400000
            }
        });
        const grossiste = Ext.create('Ext.data.Store', {
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
        const groupeGrossiste = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {
                            name: 'id',
                            type: 'number'
                        },
                        {
                            name: 'libelle',
                            type: 'string'
                        }

                    ],
            autoLoad: false,
            pageSize: 999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/groupegrossiste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
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

                        }
                        ,
                        {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'grossisteId',
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
                            itemId: 'groupeId',
                            store: groupeGrossiste,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un groupe grossiste'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'groupBy',
                            store: groupByStore,
                            pageSize: 3,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'local',
                            value: 'GROSSISTE'

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
                        }, {
                            text: 'Exporter en excel',
                            tooltip: 'Exporter en excel',
                            icon: 'resources/images/icons/fam/excel_icon.png',
                            scope: this,
                           itemId: 'exportToExcel'
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
                            fieldLabel: 'Total HT',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'totaltHtaxe',
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Total TVA',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'totalTaxe',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Total TTC',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'totalTtc',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Total vente TTC',
                            labelWidth: 110,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            id: 'totalVenteTtc',
                            value: 0
                        }, {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Total Marge',
                            labelWidth: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            id: 'totalMarge',
                            value: 0
                        }, {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'Total B.L',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            id: 'totalNbreBon',
                            value: 0
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: data,
                    features: [
                        {
                            ftype: 'summary'
                        }],
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: 'Libellé',
                            dataIndex: 'groupByLibelle',
                            flex: 1.2

                        },

                        {
                            header: 'Total HT',
                            dataIndex: 'montantHtaxe',
                            flex: 0.5,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }

                        }
                        , {
                            header: 'Total TVA',
                            dataIndex: 'montantTaxe',
                            flex: 0.5,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        },
                        {
                            header: 'Total TTC',
                            dataIndex: 'montantTtc',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.5

                        },
                        {
                            header: 'Total vente TTC',
                            dataIndex: 'montantVenteTtc',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.6

                        },
                        {
                            header: 'Total Marge',
                            dataIndex: 'montantMarge',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.5
                        },
                        {
                            header: 'Nombre Bon',
                            dataIndex: 'nbreBon',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.4

                        },
                        {
                            header: 'TTC%',
                            dataIndex: 'pourcentage',
                            align: 'right',
                            flex: 0.4
                        }

                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: data,
                        pageSize: 999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }
            ]

        });
        me.callParent(arguments);
    }

});
