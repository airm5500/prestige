/* global Ext */

Ext.define('testextjs.view.Dashboard.Recap', {
    extend: 'Ext.panel.Panel',
    xtype: 'recap',
    frame: true,
    width: '98%',
    minHeight: 600,
    layout: {type: 'vbox',
        align: 'stretch'

    },
    initComponent: function () {
        const achats = new Ext.data.Store({
            fields: [
                {
                    name: 'libelleGroupeGrossiste',
                    type: 'string'
                },

                {
                    name: 'montantTTC',
                    type: 'number'
                },
                {
                    name: 'montantHT',
                    type: 'number'
                },
                {
                    name: 'montantTVA',
                    type: 'number'
                }
            ],
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json'
                }

            }
        });

        const credits = new Ext.data.Store({
            fields: [
                {
                    name: 'libelleTiersPayant',
                    type: 'string'
                },
                {
                    name: 'libelleTypeTiersPayant',
                    type: 'string'
                },
                {
                    name: 'montant',
                    type: 'number'
                },
                {
                    name: 'nbreClient',
                    type: 'number'
                },
                {
                    name: 'nbreBons',
                    type: 'number'
                }
            ],
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/recap/credits',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                },
                timeout: 2400000
            }
        });
        const reglements = new Ext.data.Store({
            fields: [
                {
                    name: 'description',
                    type: 'string'
                },
                {
                    name: 'ref',
                    type: 'string'
                },
                {
                    name: 'refTwo',
                    type: 'string'
                },
                {
                    name: 'value',
                    type: 'number'
                },
                {
                    name: 'valueTwo',
                    type: 'number'
                },
                {
                    name: 'valueThree',
                    type: 'number'
                }
            ],
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/recap/reglements',
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
                    xtype: 'fieldset',
                    collapsible: false,
                    flex: 1,
                    margin: '2',
                    height: 280,
                    layout: 'hbox',
                    items: [
                        {
                            xtype: 'panel',

                            margin: '5',
                            flex: 1,
                            id: 'panelCa',
                            height: 260, //#3CBC9E #3CBC80; #3CBC80; #5E3CBC #AC3CBCF2;
                            title: "CHIFFRES D'AFFAIRES ",
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Montant TTC',
                                    labelWidth: 100,
                                    itemId: 'montantTTC',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;text-align:right;",
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Montant remise',
                                    labelWidth: 100,
                                    itemId: 'montantRemise',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;text-align:right;",
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Montant net',
                                    labelWidth: 100,
                                    itemId: 'montantNet',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;text-align:right;",
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Montant Tva',
                                    labelWidth: 100,
                                    itemId: 'montantTVA',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;text-align:right;",
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Montant HT',
                                    labelWidth: 100,
                                    itemId: 'montantHT',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;text-align:right;",
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Total comptant',
                                    labelWidth: 100,
                                    itemId: 'montantEsp',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;text-align:right;",
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Total crédit',
                                    labelWidth: 100,
                                    itemId: 'montantCredit',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;text-align:right;",
                                    value: 0
                                }
                            ]
                        },
                        {
                            xtype: 'panel',
                            margin: '5',
                            flex: 1,
                            height: 260,
                            id: 'panelAchat',
                            title: "TOTAUX ACHATS",
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Montant TTC',
                                    labelWidth: 100,
                                    fieldStyle: "color:blue;text-align:right;",
                                    itemId: 'montantTotalTTC',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Montant TVA',
                                    labelWidth: 100,
                                    fieldStyle: "color:blue;text-align:right;",
                                    itemId: 'montantTotalTVA',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Montant HT',
                                    labelWidth: 100,
                                    fieldStyle: "color:blue;text-align:right;",
                                    itemId: 'montantTotalHT',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Marge',
                                    labelWidth: 100,
                                    itemId: 'marge',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;text-align:right;",
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Ratio',
                                    labelWidth: 100,
                                    itemId: 'ratio',
                                    fieldStyle: "color:blue;text-align:right;",
                                    value: 0
                                }
                            ]
                        },
                        {
                            xtype: 'panel',
                            margin: '5',
                            collapsible: false,
                            height: 260,
                            id: 'panelRecette',
                            flex: 1,
                            title: "RECETTES",
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            itemId: 'recette',
                            items: [

                            ]
                        },
                        {
                            xtype: 'panel',
                            collapsible: false,
                            margin: '5',
                            height: 260,
                            id: 'panelCaisse',
                            flex: 1,
                            title: "MOUVEMENTS DE CAISSE",
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            itemId: 'reglement',
                            items: [

                            ]
                        }

                    ]
                },
                {
                    xtype: 'panel',
                    margin: '5',
                    id: 'achats',
                    flex: 1,
                    title: "ACHATS",
                    layout: 'fit',
                    items: [
                        {
                            xtype: 'grid',
                            minHeight: 15,
                            itemId: 'achatGrid',
                            store: achats,
                            columns: [{
                                    header: 'Groupe grossiste',
                                    dataIndex: 'libelleGroupeGrossiste',
                                    flex: 1.5

                                },

                                {
                                    header: 'Montant HT',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'montantHT',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Montant TVA',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'montantTVA',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Montant TTC',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'montantTTC',
                                    align: 'right',
                                    flex: 1
                                }
                            ]
                        }
                    ]

                },

                {
                    xtype: 'panel',
                    margin: '5',
                    id: 'criditsAccordes',
                    flex: 1,
                    title: "CREDITS ACCORDES",
                    layout: 'fit',
                    items: [
                        {
                            xtype: 'grid',
                            minHeight: 15,
                            itemId: 'creditaccorde',
                            store: credits,
                            columns: [{
                                    header: 'Nom TP',
                                    dataIndex: 'libelleTiersPayant',
                                    flex: 1.5

                                },
                                {
                                    header: 'Type',
                                    dataIndex: 'libelleTypeTiersPayant',
                                    flex: 1

                                },
                                {
                                    header: 'Nb.Bons',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'nbreBons',
                                    align: 'right',
                                    flex: 0.5
                                },
                                {
                                    header: 'Montant',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'montant',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Nb.Clients',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'nbreClient',
                                    align: 'right',
                                    flex: 0.5
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: credits,
                                dock: 'bottom',
                                pageSize: 10,
                                displayInfo: true,
                                items: [

                                    {
                                        xtype: 'displayfield',
                                        fieldLabel: 'Total Nb Bons',
                                        labelWidth: 100,
                                        itemId: 'totalnb',
                                        fieldStyle: "color:blue;",
                                        margin: '0 10 0 10',
                                        renderer: function (v) {
                                            return Ext.util.Format.number(v, '0,000.');
                                        },

                                        value: 0
                                    },
                                    {
                                        xtype: 'displayfield',
                                        fieldLabel: 'Total Montant',
                                        labelWidth: 100,
                                        itemId: 'totalmontant',
                                        fieldStyle: "color:blue;",
                                        margin: '0 10 0 10',
                                        renderer: function (v) {
                                            return Ext.util.Format.number(v, '0,000.');
                                        },

                                        value: 0
                                    },
                                    {
                                        xtype: 'displayfield',
                                        fieldLabel: ' Total Nb Clients',
                                        labelWidth: 110,
                                        itemId: 'totalnbclient',
                                        renderer: function (v) {
                                            return Ext.util.Format.number(v, '0,000.');
                                        },
                                        fieldStyle: "color:blue;",
                                        value: 0,
                                        margin: '0 10 0 10'
                                    }


                                ]
                            },
                            dockedItems: [
                                {
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            itemId: 'query',
                                            width: 450,
                                            enableKeyEvents: true,
                                            emptyText: 'Recherche'
                                        },
                                        {
                                            text: 'rechercher',
                                            tooltip: 'rechercher',
                                            itemId: 'creditbtn',
                                            scope: this,
                                            iconCls: 'searchicon'
                                        }


                                    ]
                                }
                            ]
                        }
                    ]

                },

                {
                    xtype: 'panel',
                    margin: '5',
                    id: 'reglementTp',
                    flex: 1,
                    title: "REGLEMENTS TP",
                    layout: 'fit',
                    items: [
                        {
                            xtype: 'grid',
                            itemId: 'reglementGrid',
                            minHeight: 15,
                            store: reglements,
                            columns: [{
                                    header: 'Nom TP',
                                    dataIndex: 'description',
                                    flex: 1.5

                                },
                                {
                                    header: 'Type',
                                    dataIndex: 'ref',
                                    flex: 1

                                },
                                {
                                    header: 'Facture',
                                    dataIndex: 'refTwo',
                                    flex: 1

                                },
                                {
                                    header: 'Montant.Facture',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'valueTwo',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Montant',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'value',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Reste',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'valueThree',
                                    align: 'right',
                                    flex: 1
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: reglements,
                                dock: 'bottom',
                                pageSize: 10,
                                displayInfo: true

                            },
                            dockedItems: [
                                {
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            itemId: 'queryRgl',
                                            width: 450,
                                            enableKeyEvents: true,
                                            emptyText: 'Recherche'
                                        },
                                        {
                                            text: 'rechercher',
                                            tooltip: 'rechercher',
                                            itemId: 'reglebtn',
                                            scope: this,
                                            iconCls: 'searchicon'
                                        }


                                    ]
                                }
                            ]
                        }]}
            ]

        });
        me.callParent(arguments);
    }
});


