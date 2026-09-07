/* global Ext */

Ext.define('testextjs.view.produits.ComparaisonStockDetails', {
    extend: 'Ext.window.Window',
    xtype: 'comparaisonDetails',
    autoShow: false,
    minHeight: 500,
    width: '80%',
    modal: true,
    iconCls: 'icon-grid',
    closeAction: 'hide',
    closable: true,
    maximizable: true,
    config: {
        data: null
    },
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    initComponent: function () {
        var me = this;
        var initRecord = me.getData();
        this.title = "Detail sur l'article [" + initRecord.get('libelle') + "]";
        var detailsStore = Ext.create('Ext.data.Store', {
            idProperty: 'lgPREENREGISTREMENTDETAILID',
            fields:
                    [
                        {
                            name: 'lgPREENREGISTREMENTDETAILID',
                            type: 'string'
                        },
                        {
                            name: 'dateHeure',
                            type: 'string'
                        },
                        {
                            name: 'strREF',
                            type: 'string'
                        }, {
                            name: 'operateur',
                            type: 'string'
                        },
                        {
                            name: 'intQUANTITY',
                            type: 'number'
                        },
                        {
                            name: 'intPRICEUNITAIR',
                            type: 'number'
                        }

                    ],
            autoLoad: false,
            pageSize: 15,
            proxy: {
                type: 'ajax',
                url: '../api/v1/fichearticle/comparaison/details/' + initRecord.get('id'),
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }


            }
        });
        Ext.applyIf(me, {
            dockedItems: [

                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    layout: {
                        pack: 'end',
                        type: 'hbox'
                    },
                    items: [

                        {
                            xtype: 'button',
                            itemId: 'btnCancel',
                            text: 'Annuler'

                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'form',
                    flex: 1,
                    itemId: 'detailForm',
                    bodyPadding: 2,
                    layout: {
                        type: 'hbox',
                        align: 'stretch'
                    },
                    items: [

                        {
                            xtype: 'container',
                            flex: 1,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    collapsible: false,
                                    bodyPadding: 5,
                                    title: "Infos.Generales sur l'article",
                                    layout: {
                                        type: 'vbox',
                                        align: 'stretch'
                                    },
                                    items: [
//                                      

                                        {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em"
                                            },
                                            margin: '0 0 5 0',
                                            items: [
                                                {
                                                    fieldLabel: 'CIP',
                                                    flex: 1,
                                                    name: 'code'
                                                }, {xtype: 'splitter'},
                                                {
                                                    flex: 1,
                                                    fieldLabel: 'Designation',
                                                    name: 'libelle'
                                                }, {xtype: 'splitter'},
                                                {
                                                    flex: 1,
                                                    fieldLabel: 'Code EAN 13',
                                                    name: 'codeEan'
                                                }


                                            ]
                                        }, {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em"
                                            },
                                            margin: '0 0 5 0',
                                            items: [
                                                {
                                                    fieldLabel: 'Emplacement',
                                                    flex: 1,
                                                    name: 'rayonLibelle'

                                                },
                                                {
                                                    fieldLabel: 'Famille',
                                                    flex: 1,
                                                    name: 'familleLibelle'
                                                },
                                                {
                                                    fieldLabel: 'Code etiquette',
                                                    flex: 1,
                                                    name: 'codeEtiquette'
                                                }

                                            ]
                                        }, {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em"
                                            },
                                            margin: '0 0 5 0',
                                            items: [

                                                {
                                                    fieldLabel: 'Prix de vente',
                                                    flex: 1,
                                                    name: 'prixVente',
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                },
                                                {
                                                    fieldLabel: 'Prix d\'achat',
                                                    flex: 1,
                                                    name: 'prixAchat',
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                },
                                                  {
                                                    fieldLabel: '',
                                                    flex: 1,
                                                    name: 'codeGestion'
                                                }

                                            ]
                                        },

                                        {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em"
                                            },
                                            margin: '0 0 5 0',
                                            items: [
                                                {
                                                    fieldLabel: 'Code.Tva',
                                                    flex: 1,
                                                    name: 'tva'

                                                },
                                                {
                                                    fieldLabel: 'Stock détail',
                                                    flex: 1,
                                                    name: 'stockDetail',
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                },

                                                {
                                                    fieldLabel: 'Stock',
                                                    flex: 1,
                                                    name: 'stock',
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                }



                                            ]
                                        },
                                        {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em"
                                            },

                                            margin: '0 0 5 0',
                                            items: [

                                                {
                                                    fieldLabel: 'Date dernier.BL',
                                                    flex: 1,
                                                    name: 'dateBon'
                                                }, {
                                                    fieldLabel: 'Seuil.Reappro',
                                                    flex: 1,
                                                    name: 'seuiRappro',
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                },
                                                {
                                                    fieldLabel: 'Qte.Reappro',
                                                    flex: 1,
                                                    name: 'qteReappro',
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                }


                                            ]
                                        },
                                        {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em"
                                            },

                                            margin: '0 0 5 0',
                                            items: [{
                                                    fieldLabel: 'Date dernière.Vente',
                                                    flex: 1,
                                                    name: 'lastDateVente'

                                                }, {
                                                    fieldLabel: 'Date dernière.Entrée',
                                                    flex: 1,
                                                    name: 'dateEntree'
                                                }
                                                , {
                                                    fieldLabel: 'Date dernier.Inventaire',
                                                    flex: 1,
                                                    name: 'dateInventaire'
                                                }]
                                        }
                                    ]
                                }
                            ]
                        }

                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: false,
                    flex: 1,
                    bodyPadding: 5,
                    title: 'Information sur la consommation',
                    layout: {
                        type: 'fit',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'gridpanel',
//                    flex:1,
                            store: detailsStore,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true

                            },
                            columns: [

                                {
                                    xtype: 'rownumberer',
                                    text: 'LG',
                                    width: 40,
                                    sortable: true
                                },
                                {
                                    text: 'Date',
                                    flex: 0.7,
                                    sortable: true,
                                    dataIndex: 'dateHeure'
                                },
                                {
                                    text: 'Référence',
                                    flex: 0.9,
                                    sortable: true,
                                    dataIndex: 'strREF'
                                },
                                {
                                    header: 'Quantité',
                                    dataIndex: 'intQUANTITY',
                                    flex: 0.6,
                                    align: 'right',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    }

                                },
                                {
                                    header: 'Prix.Vente',
                                    dataIndex: 'intPRICEUNITAIR',
                                    align: 'right',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    flex: 1

                                },
                                {
                                    header: 'Opérateur',
                                    flex: 1,
                                    dataIndex: 'operateur'

                                }
                            ],
                            selModel: {
                                selType: 'rowmodel',
                                mode: 'SINGLE'
                            },
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

                                        }, '-', {
                                            xtype: 'datefield',
                                            fieldLabel: 'Au',
                                            itemId: 'dtEnd',
                                            labelWidth: 15,
                                            flex: 1,
                                            submitFormat: 'Y-m-d',
                                            maxValue: new Date(),
                                            format: 'd/m/Y',
                                            value: new Date()

                                        }, '-',
                                        {
                                            xtype: 'textfield',
                                            itemId: 'detailquery',
                                            flex: 1,
                                            height: 35,
                                            enableKeyEvents: true,
                                            emptyText: 'Taper ici pour rechercher '
                                        }, '-',
                                        {
                                            text: 'rechercher',
                                            tooltip: 'rechercher',
                                            itemId: 'detailrechercher',
                                            scope: this,
                                            iconCls: 'searchicon'
                                        }, '-',
                                        {
                                            text: 'imprimer',
                                            itemId: 'detailimprimer',
                                            iconCls: 'printable',
                                            tooltip: 'imprimer',
                                            scope: this
                                        }
                                    ]
                                }

                            ]

                        }



                    ]}
            ]

        });
        me.callParent(arguments);
    }

});