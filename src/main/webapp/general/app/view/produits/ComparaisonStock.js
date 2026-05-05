/* global Ext */

Ext.define('testextjs.view.produits.ComparaisonStock', {
    extend: 'Ext.panel.Panel',
    xtype: 'famillestockcomparaisonmanager',
    frame: true,
    title: 'Comparaison stock article',
    width: '98%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
    layout: 'fit',
    initComponent: function () {

        var filtreStock = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'LESS', libelle: "Inférieur à"},
                {id: 'EQUAL', libelle: "Egal à"},
                {id: 'GREATER', libelle: "Supérieur à"},
                {id: 'NOT', libelle: "Différent de"},
                {id: 'GREATER_EQUAL', libelle: "Superieur ou égal"},
                {id: 'LESS_EQUAL', libelle: "Inferieur ou égal"},
                {id: 'STOCK_LESS_THAN_SEUIL', libelle: "Inferieur au seuil de reappro"},
                {id: 'ALL', libelle: "Tous"}
            ]
        });
        var filtreSueil = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'LESS', libelle: "Inférieur à"},
                {id: 'EQUAL', libelle: "Egal à"},
                {id: 'GREATER', libelle: "Supérieur à"},
                {id: 'NOT', libelle: "Différent de"},
                {id: 'GREATER_EQUAL', libelle: "Superieur ou égal"},
                {id: 'LESS_EQUAL', libelle: "Inferieur ou égal"},
                {id: 'ALL', libelle: "Tous"}
            ]
        });
        var data = new Ext.data.Store({
            idProperty: 'id',
            fields: [
                {name: 'id', type: 'string'},
                 {name: 'code', type: 'string'},
                {name: 'libelle', type: 'string'},
                
                  {name: 'lastDateVente', type: 'string'},
                {name: 'filterId', type: 'string'},
                {name: 'filterLibelle', type: 'string'},
                {name: 'stock', type: 'number'},
                {name: 'prixAchat', type: 'number'},
                {name: 'prixVente', type: 'number'},
                {name: 'codeGrossiste', type: 'string'},
                {name: 'consommation', type: 'number'},
                {name: 'qteVendue', type: 'number'},
                {name: 'valeurVente', type: 'number'},
                {name: 'valeurQteSurplus', type: 'number'},
                {name: 'consommationsThree', type: 'number'},
                {name: 'consommationsTwo', type: 'number'},
                {name: 'consommationsOne', type: 'number'},
                {name: 'consommationUn', type: 'number'},
                {name: 'consommationsFour', type: 'number'},
                {name: 'consommationsFive', type: 'number'},
                {name: 'consommationsSix', type: 'number'},
                {name: 'seuiRappro', type: 'number'},
                {name: 'qteReappro', type: 'number'},
                {name: 'codeEan', type: 'string'},
                {name: 'rayonLibelle', type: 'string'},
                {name: 'codeEtiquette', type: 'string'},
                {name: 'tva', type: 'string'},
                {name: 'dateEntree', type: 'string'},
                {name: 'dateBon', type: 'string'},
                {name: 'familleLibelle', type: 'string'},
                {name: 'dateInventaire', type: 'string'},
                {name: 'stockDetail', type: 'number'}
            ],
            pageSize: 15,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/fichearticle/comparaison',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }
        });
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
        var rayons = Ext.create('Ext.data.Store', {
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
                url: '../api/v1/common/rayons',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var familles = Ext.create('Ext.data.Store', {
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
                url: '../api/v1/common/famillearticles',
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
                            itemId: 'rayons',
                            store: rayons,
                            pageSize: 99999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un emplacement'
                        }, {
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
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'codeFamile',
                            store: familles,
                            pageSize: 9999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez une famille'
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
                        }
                        
                        , {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        },  {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'suggestion',
                            itemId: 'suggestion',
                            iconCls: 'suggestionreapro',
                            tooltip: 'suggestion',
                            scope: this
                        }
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                          {
                            xtype: 'combobox',
                            fieldLabel: 'Filtre sur stock',
                            itemId: 'stockFiltre',
                            store: filtreStock,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            flex: 1,
                            queryMode: 'local',
                            emptyText: 'Filtre sur stock...'

                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'numberfield',
                            itemId: 'stock',
                            flex: 0.5,
                            hideTrigger: true,
                            emptyText: 'Stock'

                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Filtre sur seuil',
                            itemId: 'seuilFiltre',
                            store: filtreSueil,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            flex: 1,
                            queryMode: 'local',
                            emptyText: 'Filtre sur seuil...'

                        }, {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'numberfield',
                            itemId: 'suill',
                            flex: 0.5,
                            hideTrigger: true,
                            emptyText: 'Seuil'

                        },
                    {
                        text: 'Excel',
                        tooltip: 'Exporter en Excel',
                        iconCls: 'export_excel',
                        handler: me.onExportExcelClick,  // handler que tu as déjà ajouté côté JS
                        scope: me
                    },
                    {
                        text: 'CSV',
                        tooltip: 'Exporter en CSV',
                        iconCls: 'export_csv',
                        handler: me.onExportCsvClick,    // handler que tu as déjà ajouté
                        scope: me
                    },
                    {
                        text: 'Créer inventaire',
                        tooltip: 'Créer un inventaire à partir de la liste',
                        iconCls: 'inventaireicon',
                        handler: me.onCreateInventaireClick,
                        scope: me
                    }


                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: data,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [
                        {
                            header: 'Code CIP',
                            dataIndex: 'code',
                            flex: 0.5
                        },
                        {
                            header: 'Libellé',
                            dataIndex: 'libelle',
                            flex: 1.3
                        },

                        {
                            header: 'Prix.Vente',
                            dataIndex: 'prixVente',
                            flex: 0.4,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }

                        }
                        , {
                            header: 'Prix.Achat',
                            dataIndex: 'prixAchat',
                            flex: 0.4,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }

                        },
                        {
                            header: 'Qté.Stock',
                            dataIndex: 'stock',
                            align: 'right',
                            flex: 0.5,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }

                        },
                        {
                            header: 'Seuil.Reappro',
                            dataIndex: 'seuiRappro',
                            align: 'right',
                            flex: 0.5,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }

                        },
                        {
                            header: 'Qté.Reappro',
                            dataIndex: 'qteReappro',
                            align: 'right',
                            flex: 0.5,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }

                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [
                                {
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Detail sur l\'article',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('goto', view, rowIndex, colIndex, item, e, record, row);
                                    }


                                }
                            ]
                        }

                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: data,
                        pageSize: 15,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }
            ]

        });

        me.callParent(arguments);
        
        

    },
    buildBaseParams: function () {
    var me = this,
        grid  = me.down('gridpanel'), // ou me.down('grid') selon ta config
        store = grid.getStore(),
        params = {};

    // 1. On essaie d'abord les derniers params utilisés par le store
    if (store.lastOptions && store.lastOptions.params) {
        params = Ext.apply({}, store.lastOptions.params);
    } else if (store.getProxy && store.getProxy().extraParams) {
        // fallback : extraParams du proxy
        params = Ext.apply({}, store.getProxy().extraParams);
    }

    // 2. On nettoie un peu
    params.stock = params.stock || 0;
    params.seuil = params.seuil || 0;

    // On ne touche pas aux autres (filtreStock, filtreSeuil, codeFamile, etc.)
    return params;
}
,

onExportExcelClick: function () {
    var me = this,
        params = me.buildBaseParams(),
        url = '../api/v1/fichearticle/comparaison/excel?' +
              Ext.Object.toQueryString(params);

    window.open(url);
},

onExportCsvClick: function () {
    var me = this,
        params = me.buildBaseParams(),
        url = '../api/v1/fichearticle/comparaison/csv?' +
              Ext.Object.toQueryString(params);

    window.open(url);
},

onCreateInventaireClick: function () {
    var me = this,
        params = me.buildBaseParams();

    Ext.Msg.confirm('Confirmation',
        'Créer un inventaire à partir de ce comparatif ?',
        function (btn) {
            if (btn === 'yes') {
                Ext.getBody().mask('Création de l\'inventaire...');
                Ext.Ajax.request({
                    url: '../api/v1/fichearticle/comparaison/inventaire',
                    method: 'GET',
                    params: params,
                    success: function (response) {
                        Ext.getBody().unmask();
                        var o = Ext.decode(response.responseText, true) || {};
                        if (o.count && o.count > 0) {
                            Ext.Msg.alert('Succès',
                                'Inventaire créé avec succès (' + o.count + ' article(s)).');
                        } else {
                            Ext.Msg.alert('Information',
                                'Aucun article à inventorier pour ces filtres.');
                        }
                    },
                    failure: function (response) {
                        Ext.getBody().unmask();
                        Ext.Msg.alert('Erreur',
                            'Erreur lors de la création de l\'inventaire (code ' +
                            response.status + ').');
                    }
                });
            }
        }
    );
}



});



