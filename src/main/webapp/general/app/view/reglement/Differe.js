/* global Ext */

Ext.define('testextjs.view.reglement.Differe', {
    extend: 'Ext.tab.Panel',
    xtype: 'delayed',
    requires: [
        'testextjs.model.caisse.ClientLambda'
    ],
    frame: true,
    width: '97%',
    height: 'auto',
    minHeight: 570,
    fullscreen: true,
    // border:1,
//    cls: 'custompanel',
    tabPosition: "top",
    initComponent: function () {
        var liste = new Ext.data.Store({
            fields: [
                {
                    name: 'clientId',
                    type: 'string'
                },
                {
                    name: 'clientFullName',
                    type: 'string'
                },
                {
                    name: 'reference',
                    type: 'string'
                },

                {
                    name: 'heure',
                    type: 'string'
                },
                {
                    name: 'dateOp',
                    type: 'string'
                },
                {
                    name: 'montantAttendu',
                    type: 'number'
                },
                {
                    name: 'montantRegle',
                    type: 'number'
                },
                {
                    name: 'totalAmount',
                    type: 'number'
                },
                {
                    name: 'montantRestant',
                    type: 'number'
                }

            ],
            pageSize: 999,
            autoLoad: false,
            groupField: 'clientFullName',
            proxy: {
                type: 'ajax',
                url: '../api/v1/reglement/liste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }

            }
        });
        var diffreglement = new Ext.data.Store({
            fields: [
                {
                    name: 'clientId',
                    type: 'string'
                },
                {
                    name: 'clientFullName',
                    type: 'string'
                },
                {
                    name: 'libelleRegl',
                    type: 'string'
                },
                {
                    name: 'idRegle',
                    type: 'string'
                },
                {
                    name: 'heure',
                    type: 'string'
                },
                {
                    name: 'dateOp',
                    type: 'string'
                },
                {
                    name: 'montantAttendu',
                    type: 'number'
                },
                {
                    name: 'montantRegle',
                    type: 'number'
                },
                {
                    name: 'montantRestant',
                    type: 'number'
                },

                {
                    name: 'userFullName',
                    type: 'string'
                }, {
                    name: 'reference',
                    type: 'string'
                }
            ],
            pageSize: 20,
            autoLoad: false,
            groupField: 'clientFullName',
            proxy: {
                type: 'ajax',
                url: '../api/v1/reglement/delayed',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }

            }
        });
        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.ClientLambda',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/delayed',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var diffUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.ClientLambda',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/differes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var me = this;
        Ext.applyIf(me, {
            items: [

                {
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    text: 'Faire un réglement',
                                    itemId: 'doreglement',
                                    iconCls: 'addicon',
                                    scope: this
                                },
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    itemId: 'dtStartre',
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
                                    itemId: 'dtEndre',
                                    labelWidth: 20,
                                    flex: 1,
                                    maxValue: new Date(),
                                    value: new Date(),
                                    margin: '0 9 0 0',
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y'

                                },

                                {
                                    xtype: 'combobox',
                                    itemId: 'userre',
                                    store: diffUser,
                                    labelWidth: 40,
                                    fieldLabel: 'Clients',
                                    pageSize: null,
                                    valueField: 'lgCLIENTID',
                                    displayField: 'fullName',
                                    typeAhead: false,
                                    flex: 1,
                                    minChars: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un client'

                                }
                                ,
                                {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    itemId: 'search',
                                    scope: this,
                                    iconCls: 'searchicon'
                                },
                                {
                                    text: 'imprimer',
                                    itemId: 'imprimerre',
                                    iconCls: 'printable',
                                    tooltip: 'imprimer',
                                    scope: this
                                }
                            ]
                        }
                    ],
                    xtype: 'gridpanel',
                    title: 'LISTE DES REGLEMENTS',
                    features: [
                        {
                            ftype: 'groupingsummary',
                            collapsible: true,
                            groupHeaderTpl: "{[values.rows[0].data.clientFullName]}",
                            hideGroupedHeader: true,
                            showSummaryRow: true
                        }],
                    border: false,

                    itemId: 'reglementGrid',
                    store: diffreglement,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: '#',
                            dataIndex: 'clientId',
                            flex: 1,
                            hidden: true

                        },

                        {
                            header: 'Mode R&egrave;glement',
                            dataIndex: 'libelleRegl',
                            flex: 1.5, summaryType: "count",
                            summaryRenderer: function (value) {
                                return "<b>Nombre de R&egrave;glements </b><span style='color:blue;font-weight:800;'>" + value + "</span>";

                            }},
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant attendu',
                            format: '0,000.',
                            dataIndex: 'montantAttendu',
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " <span style='color:brown;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }
                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant R&egrave;gl&eacute;',
                            format: '0,000.',
                            dataIndex: 'montantRegle',
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " <span style='color:blue;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }

                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant Restant',
                            format: '0,000.',
                            dataIndex: 'montantRestant',
                            fieldStyle: "color:red;",
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " <span style='color:red;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }
                        },
                        {
                            header: 'Date',
                            dataIndex: 'dateOp',
                            flex: 1

                        },
                        {
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 1

                        },
                        {
                            header: 'Op&eacute;rateur',
                            dataIndex: 'userFullName',
                            flex: 1

                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            tooltip: 'Faire le reglement',
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Voir le detail du reglement',
                                    scope: this

                                }
                            ]
                        }

                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: diffreglement,
                        pageSize: 30,
                        dock: 'bottom',
                        displayInfo: true

                    }
                },

                {
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
                                    value: new Date("2015-01-01"),
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
                                    emptyText: 'Recherche',
                                    flex: 1,
                                    enableKeyEvents: true
                                },
                                {
                                    xtype: 'combobox',
                                    itemId: 'user',
                                    store: storeUser,
                                    labelWidth: 40,
                                    fieldLabel: 'Clients',
                                    pageSize: null,
                                    valueField: 'lgCLIENTID',
                                    displayField: 'fullName',
                                    typeAhead: false,
                                    flex: 1,
                                    minChars: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un client'

                                }
                                ,
                                {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    itemId: 'rechercher',
                                    scope: this,
                                    iconCls: 'searchicon'
                                },
                                {
                                    text: 'imprimer',
                                    itemId: 'imprimer',
                                    iconCls: 'printable',
                                    tooltip: 'imprimer',
                                    scope: this
                                }
                            ]
                        }
                    ],
                    xtype: 'gridpanel',
                    title: 'LISTE DES DIFFERES',
                    features: [
                        {
                            ftype: 'groupingsummary',
                            collapsible: true,
                            groupHeaderTpl: "{[values.rows[0].data.clientFullName]}",
                            hideGroupedHeader: true,
                            showSummaryRow: true
                        }],
                    border: false,

                    itemId: 'liste',
                    store: liste,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: 'Réference',
                            dataIndex: 'reference',
                            flex: 1,
                            summaryType: "count",
                            summaryRenderer: function (value) {
                                return "<b>Nombre de ventes différées:  </b><span style='color:blue;font-weight:800;'>" + value + "</span>";

                            }},

                        {
                            header: 'Client',
                            dataIndex: 'clientFullName',
                            flex: 1.5

                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant total vente',
                            format: '0,000.',
                            dataIndex: 'totalAmount',
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " <span style='color:red;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }

                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant Attendu',
                            format: '0,000.',
                            dataIndex: 'montantAttendu',
                            flex: 1,
                            align: 'right'
                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Reste à Payer',
                            format: '0,000.',
                            dataIndex: 'montantRegle',
                            fieldStyle: "color:green;",
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " Reste à Payer: <span style='color:green;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }
                        },
                        {
                            header: 'Date',
                            dataIndex: 'dateOp',
                            flex: 1

                        },
                        {
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 1

                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: liste,
                        pageSize: 999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }/*  FIN LISTE*/

            ]

        });
        me.callParent(arguments);
    }
});


