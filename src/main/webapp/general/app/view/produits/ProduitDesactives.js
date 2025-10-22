/* global Ext */

Ext.define('testextjs.view.produits.ProduitDesactives', {
    extend: 'Ext.panel.Panel',
    xtype: 'familledisablemanager',
    requires: [

    ],
    //successProperty : 'meta.success'
    frame: true,
    title: 'Liste des produits désactivés',
    width: '97%',
    height: 'auto',
    minHeight: 570,
//    maxHeight: 800,
    cls: 'custompanel',
    layout: {
        type: 'fit'
//        align: 'stretch'
    },
    initComponent: function () {

        var storeProduits = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'lgFAMILLEID',
                            type: 'string'
                        },
                        {
                            name: 'intCIP',
                            type: 'string'
                        },
                        {
                            name: 'strNAME',
                            type: 'string'
                        }, {
                            name: 'intPRICE',
                            type: 'number'
                        }
                        , {
                            name: 'intNUMBERAVAILABLE',
                            type: 'number'
                        }
                        , {
                            name: 'intPAF',
                            type: 'number'
                        }, {
                            name: 'intNUMBER',
                            type: 'number'
                        }, {
                            name: 'displayDate',
                            type: 'string'
                        }
                    ],
            pageSize: 15,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/produit-desactives',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
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
                            xtype: 'textfield',
                            itemId: 'query',
                            width: 350,
                            height: 30,
                            enableKeyEvents: true,
                            emptyText: 'Recherche'
                        }, '-',
                        {
                            text: 'Rechercher',
                            tooltip: 'Rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }

                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: storeProduits,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        enableColumnHide:false

                    },
                    columns: [
                        {
                            header: 'Cip',
                            dataIndex: 'intCIP',
                            sortable: false,
                            menuDisabled: true,
                            flex: 0.7
                        },
                        {
                            header: 'Désignation',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'strNAME',
                            flex: 1.5
                        },

                        {
                            header: 'Prix de vente',
                            xtype: 'numbercolumn',
                            dataIndex: 'intPRICE',
                             align: 'right',
                            sortable: false,
                            menuDisabled: true,
                            flex: 0.6,
                            format: '0,000.'

                        },
                        {
                            header: "Prix d'achat",
                            xtype: 'numbercolumn',
                             align: 'right',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'intPAF',
                            flex: 0.6,
                            format: '0,000.'

                        },
                        {
                            header: "Stock",
                            xtype: 'numbercolumn',
                             align: 'right',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'intNUMBERAVAILABLE',
                            flex: 0.6,
                            format: '0,000.'

                        },
                        
                        {
                            header: "Date",
                         
                             align: 'right',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'displayDate',
                            flex: 0.6
                        
                        },
                        
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/enable.png',
                                    tooltip: 'Activer le produit',
                                  
                                     handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('activeProduit', view, rowIndex, colIndex, item, e, record, row);
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

                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: storeProduits,
                        dock: 'bottom',
                        displayInfo: true
                    }
                }
            ]

        });
        me.callParent(arguments);
    }
    
});


