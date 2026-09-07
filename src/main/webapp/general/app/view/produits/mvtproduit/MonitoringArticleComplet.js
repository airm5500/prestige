/* global Ext */

/*
 * Copie assumee de MonitoringArticle.js ("Suivi mouvement article 2"), enrichie des mouvements
 * internes rayon<->reserve et des stocks rayon / reserve / total. L'ecran d'origine reste
 * strictement inchange pour les officines qui n'utilisent pas la reserve : toute correction
 * commune doit etre reportee dans les deux fichiers.
 */
Ext.define('testextjs.view.produits.mvtproduit.MonitoringArticleComplet', {
    extend: 'Ext.panel.Panel',
    xtype: 'monitoringarticlecomplet',
    requires: [
        'testextjs.view.garde.SelecteurGarde',

    ],
    frame: true,
    title: 'Suivi mouvement article complet',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
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
                        }, {
                            name: 'qtyVersReserve',
                            type: 'number'
                        }, {
                            name: 'qtyVersRayon',
                            type: 'number'
                        }, {
                            name: 'qtyAjustReserve',
                            type: 'number'
                        }, {
                            name: 'currentStockReserve',
                            type: 'number'
                        }, {
                            name: 'currentStockTotal',
                            type: 'number'
                        }
                    ],
            pageSize: 15,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring-complet',
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

                        },

                        {
                            xtype: 'datefield',
                            itemId: 'dtStart',
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'datefield',
                            itemId: 'dtEnd',
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
                        // Applique en un geste les bornes d'une garde enregistree.
                        {xtype: 'selecteurgarde'},
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
                            itemId: 'imprimerPdf',
                            iconCls: 'printable',
                            tooltip: 'Imprimer en PDF (A4 paysage, toutes les lignes filtrees)',
                            scope: this
                        }, {
                            xtype: 'tbseparator'
                        }, {
                            text: 'exporter',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'Exporter en Excel (toutes les lignes filtrees)',
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
                            width: 250
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
                                            format: '0,000.'
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
                        },
                        {
                            // Transferts rayon<->reserve : mouvements INTERNES, jamais comptes dans les
                            // entrees/sorties (le stock physique total ne change pas). Seul l'ajustement
                            // de reserve, signe, modifie le stock total.
                            text: 'Mouvements internes réserve',
                            columns:
                                    [
                                        {
                                            text: 'Vers réserve',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyVersReserve',
                                            width: 80,
                                            align: 'right',
                                            format: '0,000.'
                                        },
                                        {
                                            text: 'Vers rayon',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyVersRayon',
                                            width: 76,
                                            align: 'right',
                                            format: '0,000.'
                                        },
                                        {
                                            text: 'Ajust.réserve',
                                            xtype: 'numbercolumn',
                                            dataIndex: 'qtyAjustReserve',
                                            width: 82,
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
                            text: 'Stock rayon',
                            xtype: 'numbercolumn',
                            dataIndex: 'currentStock',
                            width: 70,
                            align: 'right',
                            format: '0,000.'
                        },
                        {
                            text: 'Stock réserve',
                            xtype: 'numbercolumn',
                            dataIndex: 'currentStockReserve',
                            width: 78,
                            align: 'right',
                            format: '0,000.'
                        },
                        {
                            text: 'Stock total',
                            xtype: 'numbercolumn',
                            dataIndex: 'currentStockTotal',
                            width: 70,
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
