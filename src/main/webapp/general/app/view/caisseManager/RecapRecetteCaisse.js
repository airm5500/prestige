/* global Ext */

Ext.define('testextjs.view.caisseManager.RecapRecetteCaisse', {
    extend: 'Ext.panel.Panel',
    xtype: 'caisserecetterecap',
    frame: true,
    title: 'Recapitulatif caisse/recette',
    width: '97%',
      height: Ext.getBody()?Ext.getBody().getViewSize().height*0.85:700,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        const storeTypereglement = new Ext.data.Store({
            fields: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'libelle',
                    type: 'string'
                }
            ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/type-reglements/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        const data = new Ext.data.Store({
            fields: [
                {
                    name: 'displayMvtDate',
                    type: 'string'
                },
                {
                    name: 'montantEspece',
                    type: 'number'
                },
                {
                    name: 'montantCredit',
                    type: 'number'
                },
                {
                    name: 'montantReglementDiff',
                    type: 'number'
                },
                {
                    name: 'montantHt',
                    type: 'number'
                },
                {
                    name: 'montantTtc',
                    type: 'number'
                },
                {
                    name: 'montantTva',
                    type: 'number'
                },
                {
                    name: 'montantNet',
                    type: 'number'
                },
                {
                    name: 'montantRemise',
                    type: 'number'
                },
                {
                    name: 'montantReglementFacture',
                    type: 'number'
                },
                {
                    name: 'montantMobile',
                    type: 'number'
                },
                {
                    name: 'montantCb',
                    type: 'number'
                },
                {
                    name: 'montantCheque',
                    type: 'number'
                },
                {
                    name: 'montantVirement',
                    type: 'number'
                },
                {
                    name: 'montantBilletage',
                    type: 'number'
                },
                {
                    name: 'nbreClient',
                    type: 'number'
                },
                {
                    name: 'montantSolde',
                    type: 'number'
                },
                {
                    name: 'montantEntre',
                    type: 'number'
                },
                {
                    name: 'montantSortie',
                    type: 'number'
                }

            ],
            pageSize: 99999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/stats-recette-caisse/data',
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
                            xtype: 'combobox',
                            fieldLabel: 'Type.Reglement',
                            itemId: 'typeRglementId',
                            store: storeTypereglement,
                            flex: 2,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Selectionner un type de reglement...'

                        },
                        {
                            xtype: 'checkbox',
                            boxLabel: 'Annuelle',
                            checked: false,
                            itemId: 'groupByYear'
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
                        }, {
                            text: 'Exporter en excel',
                            itemId: 'btnExcel',
                            scope: this
                        }
                    ]
                }


            ],
            items: [
                {
                    xtype: 'gridpanel',
                 //   title: 'Recapitulatif caisse/recette',
                    border: false,
                    features: [
                        {
                            ftype: 'summary'
                        }],
                    itemId: 'caisserecetterecapGrid',
                    store: data,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: 'Date',
                            dataIndex: 'displayMvtDate',
                            summaryType: "count",
                            summaryRenderer: function (value) {

                                if (value > 0) {
                                    return "<b><span style='color:blue;'>TOTAL: </span></b>";
                                } else {
                                    return '';
                                }
                            }

                        },
                        {
                            header: 'Comptant',
                            dataIndex: 'montantEspece',
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
                            header: 'Mobile',
                            dataIndex: 'montantMobile',
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
                            header: 'Carte bancaire',
                            dataIndex: 'montantCb',
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
                        },
                        {
                            header: 'Chèque',
                            dataIndex: 'montantCheque',
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
                        },
                        {
                            header: 'Virement',
                            dataIndex: 'montantVirement',
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
                        },
                        {
                            header: 'Crédit',
                            dataIndex: 'montantCredit',
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
                            header: 'Remise',
                            dataIndex: 'montantRemise',
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
                        },
                        {
                            header: 'Net',
                            dataIndex: 'montantNet',
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
                        },
                        {
                            header: 'Nbre clients',
                            dataIndex: 'nbreClient',
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
                        },
                        {
                            header: 'Règlement tp',
                            dataIndex: 'montantReglementFacture',
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
                        },
                        {
                            header: 'Règlement diff',
                            dataIndex: 'montantReglementDiff',
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
                        },
                        
                        {
                            header: 'Billetage',
                            dataIndex: 'montantBilletage',
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
                        },
                        {
                            header: 'Solde',
                            dataIndex: 'montantSolde',
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
                }

            ]

        });
        me.callParent(arguments);
    }
});


