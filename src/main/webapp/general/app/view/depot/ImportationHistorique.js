/* global Ext */

Ext.define('testextjs.view.depot.ImportationHistorique', {
    extend: 'Ext.panel.Panel',
    xtype: 'importfromjson',
    requires: [
        'Ext.grid.plugin.RowExpander'
    ],

    frame: true,
    title: 'Historique des importations',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {

        var vente = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'details',
                    type: 'string'
                },
                {
                    name: 'user',
                    type: 'string'
                },
                {
                    name: 'createdAt',
                    type: 'string'
                },
                {
                    name: 'montantAchat',
                    type: 'number'
                },
                {
                    name: 'montantVente',
                    type: 'number'
                },
                {
                    name: 'nbreLigne',
                    type: 'number'
                }
            ],
            autoLoad: false,
            pageSize: 9999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/depot/historiques',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });
        let me = this;
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
                            width:350,
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
                            width:350,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
//                               flex: 1,
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-',
                        {
                            text: 'Importer',
                            tooltip: 'Importer',
                            itemId: 'import',
//                               flex: 1,
                            iconCls: 'printable',
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
                            labelWidth: 120,
                            fieldLabel: 'Nombre de produit',
                            itemId: 'nbreLigne',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Montant achat',
                            itemId: 'montantAchat',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Montant vente',

                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantVente',
                            value: 0
                        }

                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    plugins: [{
                            ptype: 'rowexpander',
                            rowBodyTpl: new Ext.XTemplate(
                                    '<p>{details}</p>'
                                    )
                        }
                    ],
                    store: vente,

                    columns: [
                        {
                            header: 'Date',
                            dataIndex: 'createdAt',
                            flex: 1
                        },
                        {

                            header: 'Nbre de produits',
                            xtype: 'numbercolumn',
                            dataIndex: 'nbreLigne',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }
                        , {

                            header: 'Montant achat',
                            xtype: 'numbercolumn',
                            dataIndex: 'montantAchat',
                            align: 'right',
                            flex: 1,
                            format: '0,000.'

                        },
                        {

                            header: 'Montant vente',
                            xtype: 'numbercolumn',
                            dataIndex: 'montantVente',
                            align: 'right',
                            flex: 1,
                            format: '0,000.'

                        },

                        {
                           
                            header: 'Opérateur',
                            dataIndex: 'user',
                            flex: 1
                        }

                    ],

                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: vente,
                        pageSize: 9999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }]
        });
        me.callParent(arguments);
    }
});


