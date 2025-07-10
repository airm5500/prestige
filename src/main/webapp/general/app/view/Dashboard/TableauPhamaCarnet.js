/* global Ext */

Ext.define('testextjs.view.Dashboard.TableauPhamaCarnet', {
    extend: 'Ext.tab.Panel',
    xtype: 'tableauPhamaCarnet',

    frame: true,
    width: '97%',
    height: 'auto',
    minHeight: 570,
    fullscreen: true,
    tabPosition: "top",
    initComponent: function () {
        const data = new Ext.data.Store({
            fields: [
                {
                    name: 'dateOperation',
                    type: 'string'
                },
                {
                    name: 'Total vente',
                    type: 'float'
                },
                {
                    name: 'Ca net',
                    type: 'float'
                },
                {
                    name: 'Remise',
                    type: 'float'
                },
                {
                    name: 'Comptant',
                    type: 'float'
                },
                {
                    name: 'Credit',
                    type: 'float'
                },
                {
                    name: 'Nbre Clients',
                    type: 'number'
                },
                {
                    name: 'LABOREX',
                    type: 'float'
                },
                {
                    name: 'DPCI',
                    type: 'float'
                },
                {
                    name: 'COPHARMED',
                    type: 'float'
                },
                {
                    name: 'TEDIS PHARMA',
                    type: 'float'
                },
                {
                    name: 'AUTRES',
                    type: 'float'
                },
                {
                    name: 'Achat net',
                    type: 'float'
                },
                {
                    name: 'AVOIR',
                    type: 'float'
                },
                {
                    name: 'RATIOVA',
                    type: 'float'
                },
                {
                    name: 'RATIOACHV',
                    type: 'float'
                }

            ],
            pageSize: 99999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/tableau-board/carnet',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
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
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 0.6,
                            labelWidth: 20,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 20,
                            flex: 0.6,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        },
                        {
                            xtype: 'checkbox',
                            boxLabel: 'Mensuel',
                            checked: false,
                            itemId: 'monthly'
                        },

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        },
                        {
                            xtype: 'combo',
                            value: 'Ratio Ventes/Achats',
                            flex: 1.3,
                            itemId: 'comboRation',
                            labelWidth: 60,
                            fieldLabel: 'Filtrer par',
                            store: ['Ratio Vente/Achat', 'Ratio Achat/Vente']
                        }
                        , {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }, {
                            text: 'Exporter en excel',
                            itemId: 'btnExcel',
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
                            fieldLabel: 'CA NET',
                            labelWidth: 60,
                            itemId: 'montantNet',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.8,
                            fieldLabel: 'Remise',
                            labelWidth: 60,
                            itemId: 'montantRemise',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'ACHAT NET',
                            labelWidth: 80,
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
                            fieldLabel: 'N.CLTS',
                            labelWidth: 50,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'nbreClient',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.6,
                            fieldLabel: 'R V/A:',
                            labelWidth: 50,
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'ratioVA'

                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.6,
                            fieldLabel: 'R A/V:',
                            labelWidth: 50,
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'ratioAV'

                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    title: 'Tableau de Bord du Pharmacien',
                    border: false,
                    features: [
                        {
                            ftype: 'summary'
                        }],
                    itemId: 'tableauBoardGrid',
                    store: data,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: 'DATE',
                            dataIndex: 'dateOperation',
                            summaryType: "count",
                            summaryRenderer: function (value) {

                                if (value > 0) {
                                    return "<b><span style='color:blue;'>TOTAL: </span></b>";
                                } else {
                                    return '';
                                }
                            }

                        }, {
                            text: 'CHIFFRES D\'AFFAIRES',
                            columns: [
                                {
                                    header: 'COMPTANT ',
                                    dataIndex: 'Comptant',
                                    flex: 1,
                                    summaryType: "sum",
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    align: 'right',
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }

                                ,
                                {
                                    text: 'CREDIT ',
                                    dataIndex: 'Credit',
                                    flex: 1,
                                    xtype: 'numbercolumn',
                                    summaryType: "sum",
                                    format: '0,000.',
                                    align: 'right',
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }
                                , {
                                    text: 'REMISE',
                                    dataIndex: 'Remise',
                                    flex: 0.7,
                                    xtype: 'numbercolumn',
                                    summaryType: "sum",
                                    format: '0,000.',
                                    align: 'right',
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }


                                },
                                {
                                    text: 'C.A Net  ',
                                    dataIndex: 'Ca net',
                                    summaryType: "sum",
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    flex: 1,
                                    align: 'right',
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }

                                },
                                {
                                    text: 'N.CLIENTS',
                                    dataIndex: 'Nbre Clients',
                                    summaryType: "sum",
                                    align: 'right',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    flex: 0.5,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }

                                }

                            ]}, {
                            text: 'ACHATS (A VENDRE)',
                            columns: [
                                {
                                    header: 'LABOREX ',
                                    dataIndex: 'LABOREX',
                                    flex: 1,
                                    summaryType: "sum",
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    align: 'right',

                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }

                                ,
                                {
                                    text: 'DPCI ',
                                    dataIndex: 'DPCI',
                                    flex: 1,
                                    align: 'right',
                                    summaryType: "sum",
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }
                                , {
                                    text: 'COPHARMED',
                                    dataIndex: 'COPHARMED',
                                    flex: 1,
                                    align: 'right',
                                    summaryType: "sum",
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }


                                },
                                {
                                    text: 'TEDIS PHARMA',
                                    dataIndex: 'TEDIS PHARMA',
                                    summaryType: "sum",
                                    align: 'right',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    flex: 1,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }

                                },
                                {
                                    text: 'AUTRES',
                                    dataIndex: 'AUTRES',
                                    align: 'right',
                                    summaryType: "sum",
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    flex: 1,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }

                                },
                                {
                                    text: 'AVOIRS',
                                    dataIndex: 'AVOIR',
                                    summaryType: "sum",
                                    align: 'right',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    flex: 0.5,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + "</span></b>";
                                        } else {
                                            return '';
                                        }
                                    }

                                },
                                {
                                    text: 'ACHATS Nets',
                                    dataIndex: 'Achat net',
                                    summaryType: "sum",
                                    align: 'right',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    renderer: function (v) {
                                        if (v < 0) {
                                            var montant = v.toString();
                                            montant = Number(montant.substr(1));

                                            return "<span style='color:red;'>-" + amountformat(montant) + " </span>";
                                        } else {

                                            return amountformat(v);
                                        }

                                    },
                                    flex: 1,
                                    summaryRenderer: function (value) {
                                        if (value !== 0) {
                                            if (value > 0) {
                                                return "<b><span style='color:blue;'>" + amountformat(value) + "</span></b>";
                                            } else {
                                                var montant = value.toString();
                                                montant = Number(montant.substr(1));
                                                return "<b><span style='color:red;'>-" + amountformat(montant) + "</span></b>";
                                            }

                                        } else {
                                            return '';
                                        }
                                    }

                                },
                                {
                                    text: 'Ventes/Achats',
                                    dataIndex: 'RATIOVA',
                                    align: 'right',
                                    flex: 0.5


                                },
                                {
                                    text: 'Achats/Ventes',
                                    dataIndex: 'RATIOACHV',
                                    align: 'right',
                                    flex: 0.5


                                }
                            ]}


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
                    title: 'Statistique  chiffre d\'affaires journalier',
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
                                'Comptant',
                                'Credit',
                                'Ca net',
                                'Remise'


                            ],
                            title: 'Chiffre d\'affaires journamier',
                            minimum: 0
                        }, {
                            type: 'Category',
                            position: 'bottom',
                            fields: ['dateOperation'] // the mapping data for this axe
//                    title: 'Month of the Year'

                                    /* label: {display: 'insideStart',
                                     font: '10px Arial',
                                     rotate: {
                                     degrees:45
                                     }}*/
                        }],
                    series: [{
                            type: 'column',
                            axis: 'left',
                            xField: 'dateOperation',
                            yField: [
                                'Comptant',
                                'Credit',
                                'Ca net',
                                'Remise'



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
                                    this.setTitle(storeItem.get('dateOperation') + ' </br> ' + item.yField + ': <span  style="color:blue;font-weight:600;">' + Ext.util.Format.number(storeItem.get(item.yField), '0,000') + "</span>"
                                            );
                                }

                            }
                        }]
                },

                {
                    xtype: 'chart',
                    animate: true,
                    border: false,
                    title: 'Statistique des achats par groupe grossiste',
                    style: 'background:#fff',
                    store: data,
                    legend: {
                        position: 'bottom'
                    }, axes: [{
                            type: 'Numeric',
                            grid: true,
                            position: 'left', // the axe position
                            fields: [
                                'LABOREX',
                                'DPCI',
                                'COPHARMED',
                                'TEDIS PHARMA',
                                'AUTRES',
                                'Achat net'
                            ],
                            title: 'Valeur achat pas groupe grossiste',
                            minimum: 0
                        }, {
                            type: 'Category',
                            position: 'bottom', // the axe position
                            fields: ['dateOperation'] // the mapping data for this axe

                        }],
                    series: [{
                            type: 'column',
                            axis: 'left',
                            xField: 'dateOperation',
                            yField: [
                                'LABOREX',
                                'DPCI',
                                'COPHARMED',
                                'TEDIS PHARMA',
                                'AUTRES',
                                'Achat net'

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
                                    this.setTitle(storeItem.get('dateOperation') + ' </br> ' + item.yField + ': <span  style="color:blue;font-weight:600;">' + Ext.util.Format.number(storeItem.get(item.yField), '0,000') + "</span>"
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


