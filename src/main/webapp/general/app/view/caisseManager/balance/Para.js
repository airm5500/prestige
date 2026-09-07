
/* global Ext */
Ext.define('testextjs.view.caisseManager.balance.Para', {
    extend: 'Ext.panel.Panel',
    xtype: 'balancepara',
    frame: true,
    title: 'Balance Vente/Caisse',
    width: '97%',
    height: 500,
    minHeight: 500,

    cls: 'custompanel',
    layout: {
        type: 'fit',
//        align: 'stretch',
        padding: 10
    },
    initComponent: function () {
        var store = Ext.create('Ext.data.Store', {
            fields:
                    [
                        {name: 'typeVente',
                            type: 'string'

                        },
                        {name: 'nbreVente',
                            type: 'number'

                        },
                        {name: 'montantDiff',
                            type: 'number'

                        },
                        {name: 'montantTp',
                            type: 'number'

                        },
                        {name: 'montantCB',
                            type: 'number'

                        },
                        {name: 'MontantVirement',
                            type: 'number'

                        },
                        {name: 'montantCheque',
                            type: 'number'

                        },
                        {name: 'montantEsp',
                            type: 'number'

                        },
                        {name: 'panierMoyen',
                            type: 'number'

                        },
                        {name: 'pourcentage',
                            type: 'number'

                        },

                        {name: 'montantTTC',
                            type: 'number'

                        },
                        {name: 'montantNet',
                            type: 'number'

                        },
                        {name: 'montantRemise',
                            type: 'number'

                        },
                        {name: 'montantMobilePayment',
                            type: 'number'

                        }
                    ],
            autoLoad: false,
            pageSize: 2,

            proxy: {
                type: 'ajax',
                url: '../api/v2/caisse/balanceparas',
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
            /*tools: [{
             type: 'refresh',
             tooltip: 'Actualiser'
             }],*/
            dockedItems: [

                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            labelWidth: 15,
                            width: 350,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 15,
                             width: 350,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',
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
                            tooltip: 'Imprimer la balance vente/caisse',
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
                            fieldLabel: 'MONTANT TTC',
                            labelWidth: 100,
                            itemId: 'montantTTC',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                         {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'MONTANT NET',
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
                            fieldLabel: 'REMISE',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantRemise',
                            value: 0
                        },
                     {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'ESPECES',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantEsp',
                            value: 0

                        },
                        
                        {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'NB.VENTE',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'nbreVente',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'CHEQUE',
                            labelWidth: 60,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            id: 'montantCheque',
                            value: 0
                        }, {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'VIREMENT',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            id: 'montantVirement',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'MOBILE',
                            labelWidth: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantMobilePayment',
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        }
                     
                    ]
                }

             

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    itemId: 'balanceGrid',
                    store: store,
//                    height: 150,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },

                    columns: [

                        {
                            header: 'Type vente',
                            dataIndex: 'typeVente',
                            flex: 0.5

                        }, {
                            header: 'Nbre Vente',
                            dataIndex: 'nbreVente',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.5
                        }, 
                         {
                                    text: 'Brut(TTC)',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'montantTTC',
                                    align: 'right',
                                    flex: 1
                                },
                                   {
                                    text: 'Remise',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'montantRemise',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    text: 'Net(TTC)',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'montantNet',
                                    align: 'right',
                                    flex: 1
                                }
                        
                       , {
                            header: 'Espèces',
                            dataIndex: 'montantEsp',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }, {
                            header: 'Chèques',
                            dataIndex: 'montantCheque',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }, {
                            header: 'Carte.Banc',
                            dataIndex: 'montantCB',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }, 
                        {
                            header: 'P.Mobile',
                            dataIndex: 'montantMobilePayment',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }

                       
                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true

                    }

                }
            ]

        });
        this.callParent();
    }
});


