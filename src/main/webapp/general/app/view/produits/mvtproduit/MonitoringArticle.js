/* global Ext */

Ext.define('testextjs.view.produits.mvtproduit.MonitoringArticle', {
    extend: 'Ext.panel.Panel',
    xtype: 'monitoringproduct',
    requires: [

    ],
    frame: true,
    title: 'Suivi mouvement article',
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
        var storezonegeo = new Ext.data.Store({
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
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/rayons',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            },
            autoLoad: false

        });
        var familles = new Ext.data.Store({
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
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/familles',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            },
            autoLoad: false

        });
        var fabricants = new Ext.data.Store({
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
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/fabricants',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            },
            autoLoad: false

        });
        var storeProduits = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'produitId',
                            type: 'string'
                        },
                        {
                            name: 'cip',
                            type: 'string'
                        },
                        {
                            name: 'produitName',
                            type: 'string'
                        }, {
                            name: 'qtyVente',
                            type: 'number'
                        }
                        , {
                            name: 'currentStock',
                            type: 'number'
                        }
                        , {
                            name: 'qtyAjust',
                            type: 'number'
                        }, {
                            name: 'qtyAnnulation',
                            type: 'number'
                        }
                        , {
                            name: 'qtyRetour',
                            type: 'number'
                        }, {
                            name: 'qtyRetourDepot',
                            type: 'number'
                        }, {
                            name: 'qtyInv',
                            type: 'number'
                        }, {
                            name: 'qtyPerime',
                            type: 'number'
                        }, {
                            name: 'qtyAjustSortie',
                            type: 'number'
                        }, {
                            name: 'qtyDeconEntrant',
                            type: 'number'
                        }, {
                            name: 'qtyDecondSortant',
                            type: 'number'
                        }, {
                            name: 'qtyEntree',
                            type: 'number'
                        }, {
                            name: 'ecartInventaire',
                            type: 'number'
                        }
                    ],
            pageSize: 15,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring',
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
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: "combobox",
                            margins: "0 10 0 0",
                            itemId: "categorieId",
                            store: familles,
                            valueField: "id",
                            displayField: "libelle",
                            typeAhead: true,
                            pageSize: null,
                            queryMode: "remote",
                            flex: 1,
                            emptyText: "Selectionner famille article..."

                        }, "-", {
                            xtype: "combobox",
                            itemId: 'rayonId',
                            store: storezonegeo,
                            margins: "0 10 0 0",
                            valueField: "id",
                            displayField: "libelle",
                            typeAhead: true,
                            pageSize: null,
                            queryMode: "remote",
                            flex: 1,
                            emptyText: "Sectionner zone geographique..."

                        }, "-", {
                            xtype: "combobox",
                            itemId: 'fabricantId',
                            store: fabricants,
                            margin: '0 10 0 0',
                            valueField: "id",
                            displayField: "libelle",
                            typeAhead: true,
                            pageSize: null,
                            queryMode: "remote",
                            flex: 1,
                            emptyText: "Sectionner fabriquant..."

                        },

                        {
                            xtype: 'datefield',
//                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 1,
//                            labelWidth: 20,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'datefield',
//                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
//                            labelWidth: 20,
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
                            flex: 1,
                            enableKeyEvents: true,
                            emptyText: 'Recherche'
                        }, '-',
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, {
                            xtype: 'tbseparator'
                        }, {
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
                    xtype: 'gridpanel',
                    store: storeProduits,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        enableColumnHide: false

                    },
                    selModel: {
                        selType: 'cellmodel'
                    },
                    columns: [
                        {
                            header: 'Cip',
                            dataIndex: 'cip',
                            sortable: false,
                            menuDisabled: true,
                            width: 85
                        },
                        {
                            header: 'Désignation',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'produitName',
                            width: 296
                        },
                        {
                            text: 'Mouvements Sortie',
                            columns:
                                    [
                                        {
                                            text: 'Vente',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyVente',
                                            width: 57,
                                            align: 'right',
                                            format: '0,000.'/*,
                                             renderer: function (v, m, r) {
                                             var Stock = r.data.currentStock;
                                             if (Stock === 0) {
                                             m.style = 'background-color:#B0F2B6;font-weight:800;';
                                             } else if (Stock > 0) {
                                             m.style = 'font-weight:800;';
                                             } else if (Stock < 0) {
                                             m.style = 'background-color:#F5BCA9;font-weight:800;';
                                             }
                                             return v;
                                             }*/
                                        },
                                        {
                                            text: 'Ret.four',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyRetour',
                                            width: 71,
                                            align: 'right',
                                            format: '0,000.'
                                        },
                                        {
                                            text: 'Qté.périmée',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyPerime',
                                            width: 78,
                                            align: 'right',
                                            format: '0,000.'
                                        },
                                        {
                                            text: 'Qté.Ajustée',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyAjustSortie',
                                            width: 83,
                                            align: 'right',
                                            format: '0,000.'
                                        },
                                        {
                                            text: 'Qté.Décon',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyDecondSortant',
                                            width: 74,
                                            align: 'right',
                                            format: '0,000.'
                                        }
                                    ]
                        },
                        {
                            text: 'Mouvements Entrée',
                            columns:
                                    [
                                        {
                                            text: 'Qté.Entrée',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyEntree',
                                            width: 76,
                                            align: 'right',
                                            format: '0,000.'
                                        },
                                        {
                                            text: 'Qté.Ajustée',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyAjust',
                                            width: 77,
                                            align: 'right',
                                            format: '0,000.'
                                        },
                                        {
                                            text: 'Qté.Décon',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyDeconEntrant',
                                            width: 79,
                                            align: 'right',
                                            format: '0,000.'
                                        },
                                        {
                                            text: 'Qté.Annulée',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyAnnulation',
                                            width: 76,
                                            align: 'right',
                                            format: '0,000.'
                                        },
                                        {
                                            text: 'Qté.Ret.Depôt',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyRetourDepot',
                                            width: 0,
                                            align: 'right',
                                            format: '0,000.'
                                        }
                                    ]
                        }
                        ,
                        {
                            text: 'Qté.Inv',
                            xtype: 'numbercolumn',
                            dataIndex: 'qtyInv',
                            width: 57,
                            align: 'right',
                            format: '0,000.'
                        },
                        {
                            text: 'écart.Inv',
                            xtype: 'numbercolumn',
                            dataIndex: 'ecartInventaire',
                            width: 57,
                            align: 'right',
                            format: '0,000.'
                        },

                        {
                            text: 'Stock',
                            xtype: 'numbercolumn',
                            dataIndex: 'currentStock',
                            width: 57,
                            align: 'right',
                            format: '0,000.'
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Voir détail',
                                    scope: me

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


