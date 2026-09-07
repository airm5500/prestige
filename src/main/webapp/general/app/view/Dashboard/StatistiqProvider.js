/* global Ext */

Ext.define('testextjs.view.Dashboard.StatistiqProvider', {
    extend: 'Ext.tab.Panel',
    xtype: 'statistiqueProvider',
    frame: true,
    width: '97%',
    height: 570,
    minHeight: 570,
    fullscreen: true,
    tabPosition: "top",
    initComponent: function () {
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
        var data = new Ext.data.Store({
            idProperty: 'code',
            fields: [
                {name: 'code', type: 'string'},
                {name: 'MONTANT NET TTC', type: 'number'},
                {name: 'libelle', type: 'string'},
                {name: 'MONTANT NET HT', type: 'number'},
                {name: 'VALEUR ACHAT', type: 'number'},
                {name: 'MARGE NET', type: 'number'},
                {name: 'MARGE POURCENTAGE', type: 'float'},
                {name: 'POURCENTAGE TOTAL', type: 'float'}

            ],
            pageSize: 99999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/statfamillearticle/statisticprovider',
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
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 1,
                            labelWidth: 20,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 20,
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'
                        },
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            emptyText: 'Taper pour rechercher',
                            enableKeyEvents: true
                        },

                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'rayons',
                            store: rayons,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un emplacement'
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
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un grossiste'
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
                },
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    items: [
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Montant TTC',
                            labelWidth: 80,
                            itemId: 'montantTtc',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Montant Net HT',
                            labelWidth: 100,
                            itemId: 'montantNet',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },

                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Achat',
                            labelWidth: 40,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantAchat',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.6,
                            fieldLabel: 'Marge',
                            labelWidth:45,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'marge',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.6,
                            fieldLabel: '%Marge:',
                            labelWidth: 50,
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'margeRatio'

                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                     autoScroll: true,
                    title: 'Chiffre d\'affaires par grossiste',
                    border: false,
                    itemId: 'providerStatGrid',
                    store: data,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: 'Code',
                            dataIndex: 'code',
                            flex: 0.4

                        },
                        {
                            header: 'Libellé',
                            dataIndex: 'libelle',
                            flex: 1.4

                        },
                        {
                            text: 'Mont.Net TTC',
                            dataIndex: 'MONTANT NET TTC',
                            flex: 1,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }


                        }
                        , {
                            text: 'Mont.Net HT',
                            dataIndex: 'MONTANT NET HT',
                            flex: 1,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }



                        },
                        {
                            text: 'Valeur.Achat',
                            dataIndex: 'VALEUR ACHAT',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 1
                        },
                        {
                            text: '%Période',
                            dataIndex: 'POURCENTAGE TOTAL',
                            align: 'right',
                            flex: 0.5
                        },
                        {
                            text: 'Marge.Net',
                            dataIndex: 'MARGE NET',
                            align: 'right',
                            flex: 0.5,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }

                        }
                        ,
                        {
                            text: '%Marge',
                            align: 'right',
                            dataIndex: 'MARGE POURCENTAGE',
                            flex: 0.5
                        }


                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: data,
                        pageSize: 99999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                },
                {
                    xtype: 'chart',
                    animate: true,
                    border: false,
                    title: 'Graphe Statistique par grossiste ',
                    style: 'background:#fff',
                    store: data,
                    legend: {
                        position: 'bottom'
                    },
                    axes: [{
                            type: 'Numeric',
                            grid: true,
                            position: 'left', // the axe position
                            fields: [
                                'MONTANT NET TTC',
                                'MONTANT NET HT',
                                'VALEUR ACHAT',
                                'MARGE NET'


                            ],
                            title: '',
                            minimum: 0
                        }, {
                            type: 'Category',
                            position: 'bottom',
                            fields: ['libelle'] // the mapping data for this axe
                        }],
                    series: [{
                            type: 'column',
                            axis: 'left',
                            xField: 'libelle',
                            yField: [
                                'MONTANT NET TTC',
                                'MONTANT NET HT',
                                'VALEUR ACHAT',
                                'MARGE NET'
                            ],
                            style: {
                                opacity: 0.93
                            },
                            highlight: true,
                            tips: {
                                trackMouse: true,
                                style: 'font-size:11px;background: #fff;color: #6D6D6D;',
                                width: 180,
                                renderer: function (storeItem, item) {
                                    this.setTitle(storeItem.get('libelle') + ' </br> ' + item.yField + ': <span  style="color:blue;font-weight:600;">' + Ext.util.Format.number(storeItem.get(item.yField), '0,000') + "</span>"
                                            );
                                }

                            }
                        }]
                }
            ]

        });
        me.callParent(arguments);
    }
});


