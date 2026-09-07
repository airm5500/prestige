
/* global Ext */

Ext.define('testextjs.view.pharmaml.Rupturepharma', {
    extend: 'Ext.panel.Panel',
    xtype: 'rupturepharma',
    frame: true,
    title: 'LISTE DES RUPTURES',
    scrollable: true,
    width: '98%',
    minHeight: 500,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
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

        var store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },
                        {name: 'libelleGrossiste',
                            type: 'string'

                        },

                        {name: 'reference',
                            type: 'string'

                        },
                        {name: 'prixAchat',
                            type: 'number'

                        },
                        {name: 'prixVente',
                            type: 'number'

                        },

                        {name: 'qty',
                            type: 'number'

                        },
                        {name: 'nbreProduit',
                            type: 'number'

                        },

                        {name: 'details',
                            type: 'string'

                        },
                        {name: 'grossisteId',
                            type: 'string'

                        },
                        {name: 'commandeDate',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/rupture',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var me = this;
        Ext.applyIf(me, {
            dockedItems: [
                {xtype: 'toolbar',
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
                        , {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            emptyText: 'Taper pour rechercher',
                            enableKeyEvents: true
                        },
                        {
                            xtype: 'tbseparator'
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
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un grossiste'
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
                        }

                        , {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'Fussionner les ruptures',
                            iconCls: 'fusionicon',
                            itemId: 'fusion',
                            scope: this

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
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },

                    columns: [
                        {
                            header: 'Référence',
                            dataIndex: 'reference',
                            flex: 1

                        },

                        {
                            header: 'Grossiste',
                            dataIndex: 'libelleGrossiste',
                            flex: 1.5
                        },
                        {
                            header: 'Nb.Produits',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            dataIndex: 'nbreProduit',
                            flex: 0.5
                        },
                        {
                            header: 'Montant.Achat',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            dataIndex: 'prixAchat',
                            flex: 1
                        },
                        {
                            header: 'Date',
                            dataIndex: 'commandeDate',
                            flex: 0.7

                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/order_tracking.png',
                                    tooltip: 'ENVOI PAR PHARMAML', 
                                            handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                            this.fireEvent('envoiPharmaML', view, rowIndex, colIndex, item, e, record, row);
                                            }

                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/excel_csv.png',
                                    tooltip: 'Exporter CSV',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('exportCsv', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Supprimer',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('remove', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        }

                    ],
                    selModel: {
                        selType: 'checkboxmodel',
                        injectCheckbox: 'last',
                        pruneRemoved: false

                    },
                    dockedItems: [

                        {
                            xtype: 'pagingtoolbar',
                            store: store,
                            dock: 'bottom',
                            displayInfo: true,
                            pageSize: 15

                        }
                    ]

                }
            ]

        });
        me.callParent(arguments);
    }
});


