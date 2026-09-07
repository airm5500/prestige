
/* global Ext */
Ext.define('testextjs.view.actions.Ug', {
    extend: 'Ext.panel.Panel',
    xtype: 'venteugs',
    requires: [
        'testextjs.view.garde.SelecteurGarde'
    ],
    frame: true,
    title: 'Ventes unités gratuites',
    width: '97%',
    height: 500,
    minHeight: 500,
    cls: 'custompanel',
    layout: {
        type: 'fit',
        padding: 10
    },
    initComponent: function () {
        var store = Ext.create('Ext.data.Store', {
            fields:
                    [
                        {name: 'strNAME',
                            type: 'string'

                        },
                        {name: 'strREF',
                            type: 'string'

                        }, {name: 'HEURE',
                            type: 'string'

                        }, {name: 'dtCREATED',
                            type: 'string'

                        },
                        {name: 'intCIP',
                            type: 'string'

                        }, {name: 'dateHeure',
                            type: 'string'
                        },
                        {name: 'operateur',
                            type: 'string'
                        },
                        {name: 'intQUANTITY',
                            type: 'number'

                        },
                        {name: 'intPRICE',
                            type: 'number'

                        },
                        {name: 'intPRICEUNITAIR',
                            type: 'number'

                        },
                        {name: 'uniteGratuite',
                            type: 'number'

                        },
                           {name: 'stockUg',
                            type: 'number'

                        },
                        
                        {name: 'montantUg',
                            type: 'number'
                        }
                        

                    ],
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/caisse/ca/ug',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 240000

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
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        },  {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, {
                            xtype: 'tbseparator'
                        },
                        // Applique en un geste les bornes d'une garde enregistree.
                        {xtype: 'selecteurgarde'},
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        } , {
                            xtype: 'tbseparator'
                        },
                        {
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
                            fieldLabel: 'TOTAL QTE UG',
                            labelWidth: 120,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'nbreVente',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'MONTANT TOTAL',
                            labelWidth: 120,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantAchat',
                            value: 0
                        }
                        

                    ]
                }


            ],
            items: [
                {
                    xtype: 'gridpanel',
                    itemId:'uggid',
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },

                    columns: [

                        {
                            header: 'Cip',
                            dataIndex: 'intCIP',
                            flex: 1

                        },
                        {
                            header: 'Libellé',
                            dataIndex: 'strNAME',
                            flex: 1

                        },

                        {
                            header: 'Qté Vente',
                            dataIndex: 'intQUANTITY',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.5
                        },
                       
                        {
                            header: 'Qté Ug',
                            dataIndex: 'uniteGratuite',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.5
                        },
                          {
                            header: 'Qté Ug restante',
                            dataIndex: 'stockUg',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.5
                        },
                        {
                            header: 'Montant ug',
                            dataIndex: 'montantUg',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.5
                        },
                        {
                            header: 'Date',
                            dataIndex: 'dateHeure',
                            flex: 1
                        },
                        {
                            header: 'Référence vente',
                            dataIndex: 'strREF',
                            flex: 1
                        }
                        
                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                         pageSize: 15,
                        dock: 'bottom',
                        displayInfo: true

                    }

                }
            ]

        });
        this.callParent();
    }
});


