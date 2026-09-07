/* global Ext */
/*
 *   extend  : 'Ext.form.Panel',
  alias   : 'widget.wizard',
 */
Ext.define('testextjs.view.Dashboard.CarnetDepot', {
    extend: 'Ext.tab.Panel',
    xtype: 'reglementdepot',
    frame: false,
    width: '97%',
    height: 670,
    tabPosition: "top",
    initComponent: function () {
        let tierspayantExlus = new Ext.data.Store({
            fields: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'code',
                    type: 'string'
                },
                {
                    name: 'nom',
                    type: 'string'
                },
                {
                    name: 'nomComplet',
                    type: 'string'
                },
                {
                    name: 'account',
                    type: 'number'
                }
            ],
            pageSize: 20,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v2/carnet-depot/list-exclus',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }
        });
        let ventes = new Ext.data.Store({
            fields: [
                {
                    name: 'tiersPayantId',
                    type: 'string'
                },
                {
                    name: 'codeTiersPayant',
                    type: 'string'
                },
                {
                    name: 'libelleTiersPayant',
                    type: 'string'
                },
                {
                    name: 'operateur',
                    type: 'string'
                },
                {
                    name: 'montant',
                    type: 'number'
                },
                {
                    name: 'dateVente',
                    type: 'string'
                }, {
                    name: 'taux',
                    type: 'number'
                }
                , {
                    name: 'refVente',
                    type: 'string'
                }, {
                    name: 'refBon',
                    type: 'string'
                }

            ],
            pageSize: 18,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v2/carnet-depot/ventes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 2400000
            }
        });

        let reglements = new Ext.data.Store({
            fields: [
                {
                    name: 'tiersPayantId',
                    type: 'string'
                },
                {
                    name: 'description',
                    type: 'string'
                },
                {
                    name: 'tiersPayant',
                    type: 'string'
                }, {
                    name: 'userId',
                    type: 'string'
                },
                {
                    name: 'user',
                    type: 'string'
                },
                {
                    name: 'montantPaye',
                    type: 'number'
                },
                {
                    name: 'createdAt',
                    type: 'string'
                }, {
                    name: 'montantPayer',
                    type: 'number'
                }
                , {
                    name: 'montantRestant',
                    type: 'number'
                }, {
                    name: 'id',
                    type: 'string'
                }
                , {
                    name: 'idDossier',
                    type: 'string'
                }
            ],
            pageSize: 18,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v2/carnet-depot/reglements',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 2400000
            }
        });
        
         let depenses = new Ext.data.Store({
            fields: [
                {
                    name: 'tiersPayantId',
                    type: 'string'
                },
                {
                    name: 'description',
                    type: 'string'
                },
                {
                    name: 'tiersPayant',
                    type: 'string'
                }, {
                    name: 'userId',
                    type: 'string'
                },
                {
                    name: 'user',
                    type: 'string'
                },
                {
                    name: 'montantPaye',
                    type: 'number'
                },
                {
                    name: 'createdAt',
                    type: 'string'
                }, {
                    name: 'montantPayer',
                    type: 'number'
                }
                , {
                    name: 'montantRestant',
                    type: 'number'
                }, {
                    name: 'id',
                    type: 'string'
                }
                , {
                    name: 'idDossier',
                    type: 'string'
                }
            ],
            pageSize: 18,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v2/carnet-depot/reglements',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 2400000
            }
        });
        
           let produits = new Ext.data.Store({
            fields: [
                {
                    name: 'codeCip',
                    type: 'string'
                },
                {
                    name: 'produitName',
                    type: 'string'
                },
                {
                    name: 'tiersPayantName',
                    type: 'string'
                },
               
                {
                    name: 'montantVente',
                    type: 'number'
                },
             
                
                {
                    name: 'montantAchat',
                    type: 'number'
                }
                , {
                    name: 'prixUni',
                    type: 'number'
                }, {
                    name: 'quantite',
                    type: 'number'
                }, {
                    name: 'prixAchat',
                    type: 'number'
                }

            ],
            pageSize: 15,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v2/carnet-depot/produits-carnet-as-depot',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 2400000
            }
        });
        
        
        
        /* Factures des carnets depot : point d'entree DEDIE. Il ne rend que les factures dont le
           tiers payant est marque « depot », quel que soit l'ecran depuis lequel elles ont ete
           creees - le classement depend du tiers payant rattache, pas du chemin de creation. */
        const facturesDepot = Ext.create('Ext.data.Store', {
            fields: ['lgFACTUREID', 'periode', 'strFULLNAME', 'strCODEFACTURE',
                {name: 'nbDossier', type: 'number'}, {name: 'dblMONTANTCMDE', type: 'number'},
                'dtDATEFACTURE'],
            pageSize: 18,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/facturation/summary/carnet-depot',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        let me = this;
        me.storeFacturesDepot = facturesDepot;
        Ext.applyIf(me, {
            dockedItems: [
                {xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'combobox',
                            flex: 1.5,
                            margin: '0 5 0 0',
                            fieldLabel: 'Tiers-payants',
                            itemId: 'tiersPayantsExclus',
                            store: tierspayantExlus,
                            pageSize: 20,
                            valueField: 'id',
                            displayField: 'nomComplet',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un tiers-payant'
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 0.5,
                            labelWidth: 20,
                            maxValue: new Date(),
                            value: '01/01/2015',
                            format: 'd/m/Y'

                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 20,
                            flex: 0.5,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'
                        }
                        , {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'btnVentePanel',
                            scope: this,
                            iconCls: 'searchicon'
                        }, {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }]
                }

            ],
            items: [
                {
                    xtype: 'panel',
                    title: 'VENTES',
                    border: false,
                    itemId: 'ventePanel',
                    scrollable: true,
                    items: [
                        {
                            xtype: 'gridpanel',
                            title: '',
                            border: false,
                            store: ventes,
                            scrollable: true,
                            columns:
                                    [
                                        {
                                            header: 'id',
                                            dataIndex: 'tiersPayantId',
                                            hidden: true
                                        },

                                        {
                                            header: 'Code',
                                            dataIndex: 'codeTiersPayant',
                                            hidden: true,
                                            flex: 0.4
                                        },

                                        {
                                            header: 'Tiers-payant',
                                            dataIndex: 'libelleTiersPayant',
                                            flex: 1
                                        },
                                        {
                                            header: 'Date',
                                            dataIndex: 'dateVente',
                                            flex: 0.5
                                        }, {
                                            header: 'Référence',
                                            dataIndex: 'refVente',
                                            flex: 0.5
                                        }, {
                                            header: 'Montant',
                                            dataIndex: 'montant',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },
                                        {
                                            header: 'Opérateur',
                                            dataIndex: 'operateur',
                                            hidden: true,
                                            flex: 1
                                        }

                                    ],
                            selModel: {
                                selType: 'cellmodel'

                            },
                            dockedItems: [
                                {
                                    xtype: 'pagingtoolbar',
                                    store: ventes,
                                    pageSize: 18,
                                    dock: 'bottom',
                                    displayInfo: true

                                },
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    items: [
                                        {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Montant',
                                            labelWidth: 80,
                                            itemId: 'montant',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }, {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Nombre de vente',
                                            labelWidth: 120,
                                            itemId: 'nbreVente',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }

                                    ]
                                }

                            ]
                        }
                    ]
                },
                {
                    xtype: 'panel',
                    title: 'REGLEMENTS',
                    border: false,
                    itemId: 'reglementPanel',
                    items: [
                        {
                            xtype: 'gridpanel',
                            title: '',
                            border: false,
                            store: reglements,
                            scrollable: true,
                            columns:
                                    [
                                        {
                                            header: 'id',
                                            dataIndex: 'id',
                                            hidden: true
                                        },

                                        {
                                            header: 'Tiers-payant',
                                            dataIndex: 'tiersPayant',
                                            flex: 1
                                        },

                                        {
                                            header: 'Description',
                                            dataIndex: 'description',
                                            flex: 1
                                        },
                                        {
                                            header: 'Date',
                                            dataIndex: 'createdAt',
                                            flex: 0.5
                                        }, {
                                            header: 'Montant versé',
                                            dataIndex: 'montantPaye',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5

                                        },
                                        {
                                            header: 'Montant attendu',
                                            dataIndex: 'montantPayer',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },

                                        {
                                            header: 'Montant restant',
                                            dataIndex: 'montantRestant',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },
                                        {
                                            header: 'Opérateur',
                                            dataIndex: 'user',
                                            hidden: true,
                                            flex: 1
                                        },
                                         {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Réimprimer le ticket',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('printTicket', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        }

                                    ],
                            selModel: {
                                selType: 'cellmodel'

                            },
                            dockedItems: [
                                {
                                    xtype: 'pagingtoolbar',
                                    store: reglements,
                                    pageSize: 18,
                                    dock: 'bottom',
                                    displayInfo: true

                                },
                                {
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    items: [
                                        {
                                            text: 'Nouveau règlement',
                                            scope: this,
                                            itemId: 'btnReglement',
                                            iconCls: 'addicon'

                                        },
                                        {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Solde',
                                            labelWidth: 50,
                                            itemId: 'accountReglement',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:red;font-weight:900;",
                                            value: 0

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
                                            fieldLabel: 'Total versé',
                                            labelWidth: 80,
                                            itemId: 'montantPaye',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }, {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Nombre de versement',
                                            labelWidth: 150,
                                            itemId: 'montantPayer',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }

                                    ]
                                }

                            ]
                        }
                    ]
                },
                
                 {
                    xtype: 'panel',
                    title: 'DEPENSES',
                    border: false,
                    itemId: 'depensePanel',
                    items: [
                        {
                            xtype: 'gridpanel',
                            title: '',
                            border: false,
                            store: depenses,
                            scrollable: true,
                            columns:
                                    [
                                        {
                                            header: 'id',
                                            dataIndex: 'id',
                                            hidden: true
                                        },

                                        {
                                            header: 'Tiers-payant',
                                            dataIndex: 'tiersPayant',
                                            flex: 1
                                        },

                                        {
                                            header: 'Description',
                                            dataIndex: 'description',
                                            flex: 1
                                        },
                                        {
                                            header: 'Date',
                                            dataIndex: 'createdAt',
                                            flex: 0.5
                                        }, {
                                            header: 'Montant versé',
                                            dataIndex: 'montantPaye',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5

                                        },
                                        {
                                            header: 'Montant attendu',
                                            dataIndex: 'montantPayer',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },

                                        {
                                            header: 'Montant restant',
                                            dataIndex: 'montantRestant',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },
                                        {
                                            header: 'Opérateur',
                                            dataIndex: 'user',
                                            hidden: true,
                                            flex: 1
                                        },
                                         {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Réimprimer le ticket',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('printTicket', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        }

                                    ],
                            selModel: {
                                selType: 'cellmodel'

                            },
                            dockedItems: [
                                {
                                    xtype: 'pagingtoolbar',
                                    store: depenses,
                                    pageSize: 18,
                                    dock: 'bottom',
                                    displayInfo: true

                                },
                                {
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    items: [
                                        {
                                            text: 'Nouvelle dépense',
                                            scope: this,
                                            itemId: 'btnDepense',
                                            iconCls: 'addicon'

                                        },
                                           {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Solde',
                                            labelWidth: 50,
                                            itemId: 'account',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:red;font-weight:900;",
                                            value: 0

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
                                            fieldLabel: 'Total versé',
                                            labelWidth: 80,
                                            itemId: 'montantDepensePaye',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }, {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Nombre de règlement',
                                            labelWidth: 150,
                                            itemId: 'montantDepensePayer',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }

                                    ]
                                }

                            ]
                        }
                    ]
                },
                
                 {
                    xtype: 'panel',
                    title: 'PRODUITS',
                    border: false,
                    itemId: 'produitsPanel',
                    items: [
                        {
                            xtype: 'gridpanel',
                            title: '',
                            border: false,
                            store: produits,
                            scrollable: true,
                            columns:
                                    [
                                      

                                        {
                                            header: 'Cip',
                                            dataIndex: 'codeCip',
                                            flex: 1
                                        },

                                        {
                                            header: 'Description',
                                            dataIndex: 'produitName',
                                            flex: 1
                                        }
                                       , {
                                            header: 'Quantité',
                                            dataIndex: 'quantite',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5

                                        },
                                        {
                                            header: 'Prix Achat',
                                            dataIndex: 'prixAchat',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },
                                         {
                                            header: 'Prix U',
                                            dataIndex: 'prixUni',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },

                                        {
                                            header: 'Montant Achat',
                                            dataIndex: 'montantAchat',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        },
                                      {
                                            header: 'Montant Vente',
                                            dataIndex: 'montantVente',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5
                                        }

                                    ],
                            selModel: {
                                selType: 'cellmodel'

                            },
                            dockedItems: [
                                {
                                    xtype: 'pagingtoolbar',
                                    store: produits,
                                    pageSize: 15,
                                    dock: 'bottom',
                                    displayInfo: true

                                },
                              
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    items: [
                                        {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Total Vente',
                                            labelWidth: 100,
                                            itemId: 'montantVente',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }, {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Total Achat',
                                            labelWidth: 100,
                                            itemId: 'montantAchat',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight:800;",
                                            value: 0

                                        }

                                    ]
                                }

                            ]
                        }
                    ]
                },
                {
                    xtype: 'panel',
                    title: 'FACTURES',
                    border: false,
                    itemId: 'facturesPanel',
                    layout: 'fit',
                    items: [{
                            xtype: 'gridpanel',
                            itemId: 'grilleFacturesDepot',
                            border: false,
                            store: facturesDepot,
                            viewConfig: {
                                columnLines: true,
                                emptyText: '<div style="margin:20px;">Aucune facture carnet dépôt</div>',
                                deferEmptyText: false
                            },
                            dockedItems: [{
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    items: [{
                                            text: 'Créer une facture',
                                            itemId: 'btnCreerFactureDepot',
                                            iconCls: 'addicon',
                                            tooltip: 'Créer une facture pour un carnet dépôt'
                                        }, {
                                            text: 'Rafraîchir',
                                            itemId: 'btnRafraichirFacturesDepot',
                                            iconCls: 'searchicon'
                                        }, '->', {
                                            xtype: 'tbtext',
                                            text: '<span style="color:#555;">La sélection de tiers-payant '
                                                    + 'ci-dessus limite la liste à un carnet précis.</span>'
                                        }]
                                }],
                            columns: [
                                {header: 'Période facturée', dataIndex: 'periode', flex: 1.2},
                                {header: 'Dépôt / tiers-payant', dataIndex: 'strFULLNAME', flex: 1.6},
                                {header: 'N° facture', dataIndex: 'strCODEFACTURE', flex: 1},
                                {header: 'Nbre bons', dataIndex: 'nbDossier', align: 'right', flex: 0.6,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v || 0, '0,000');
                                    }},
                                {header: 'Montant net', dataIndex: 'dblMONTANTCMDE', align: 'right', flex: 0.9,
                                    renderer: function (v) {
                                        return '<b>' + Ext.util.Format.number(v || 0, '0,000') + '</b>';
                                    }},
                                {header: 'Date facture', dataIndex: 'dtDATEFACTURE', flex: 0.9},
                                {
                                    xtype: 'actioncolumn',
                                    header: 'Impressions',
                                    width: 90,
                                    align: 'center',
                                    menuDisabled: true,
                                    sortable: false,
                                    items: [{
                                            icon: 'resources/images/icons/fam/printer.png',
                                            tooltip: 'Imprimer les bons (modèle du tiers-payant)',
                                            altText: 'Imprimer les bons',
                                            handler: function (grille, ligne) {
                                                grille.up('reglementdepot').fireEvent('imprimerFactureDepot',
                                                        grille.getStore().getAt(ligne), false);
                                            }
                                        }, {
                                            icon: 'resources/images/icons/fam/text_list_bullets.png',
                                            tooltip: 'Imprimer les bons + le détail des médicaments',
                                            altText: 'Imprimer les bons avec le détail des médicaments',
                                            handler: function (grille, ligne) {
                                                grille.up('reglementdepot').fireEvent('imprimerFactureDepot',
                                                        grille.getStore().getAt(ligne), true);
                                            }
                                        }]
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: facturesDepot,
                                displayInfo: true,
                                displayMsg: 'Factures {0} - {1} sur {2}',
                                emptyMsg: 'Aucune facture'
                            }
                        }]
                }
            ]
        });
        me.callParent(arguments);
    }
});
