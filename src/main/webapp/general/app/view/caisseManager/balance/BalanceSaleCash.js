
/* global Ext */
Ext.define('testextjs.view.caisseManager.balance.BalanceSaleCash', {
    extend: 'Ext.panel.Panel',
    xtype: 'balancesalecahs',
    frame: true,
    title: 'Balance Vente/Caisse',
    width: '97%',
    height: 500,
    minHeight: 500,

    cls: 'custompanel',
    layout: {
        type: 'fit',
//        align: 'stretch',
        padding: 10
    },
    initComponent: function () {
        var me = this;
        /*
         * L'analyse comparative du second onglet. Une ligne par periode : les trois derniers mois
         * revolus, plus le mois en cours rappele et marque.
         */
        var analyseStore = Ext.create('Ext.data.Store', {
            fields: ['cle', 'libelle', 'debut', 'fin', {name: 'enCours', type: 'boolean'},
                {name: 'nbreVente', type: 'int'}, {name: 'montantTTC', type: 'int'},
                {name: 'montantRemise', type: 'int'}, {name: 'montantNet', type: 'int'},
                {name: 'montantAchat', type: 'int'}, {name: 'marge', type: 'int'},
                {name: 'panierMoyen', type: 'int'}, {name: 'montantEsp', type: 'int'},
                {name: 'montantCB', type: 'int'}, {name: 'montantCheque', type: 'int'},
                {name: 'montantVirement', type: 'int'}, {name: 'montantMobilePayment', type: 'int'},
                {name: 'montantTp', type: 'int'}, {name: 'montantDiff', type: 'int'},
                {name: 'ecart', type: 'int', useNull: true},
                {name: 'ecartPourcentage', type: 'float', useNull: true}]
        });
        var store = Ext.create('Ext.data.Store', {
            fields:
                    [
                        {name: 'typeVente',
                            type: 'string'

                        },
                        {name: 'nbreVente',
                            type: 'number'

                        },
                        {name: 'montantDiff',
                            type: 'number'

                        },
                        {name: 'montantTp',
                            type: 'number'

                        },
                        {name: 'montantCB',
                            type: 'number'

                        },
                        {name: 'MontantVirement',
                            type: 'number'

                        },
                        {name: 'montantCheque',
                            type: 'number'

                        },
                        {name: 'montantEsp',
                            type: 'number'

                        },
                        {name: 'panierMoyen',
                            type: 'number'

                        },
                        {name: 'pourcentage',
                            type: 'number'

                        },

                        {name: 'montantTTC',
                            type: 'number'

                        },
                        {name: 'montantNet',
                            type: 'number'

                        },
                        {name: 'montantRemise',
                            type: 'number'

                        },
                        {name: 'montantMobilePayment',
                            type: 'number'

                        }
                    ],
            autoLoad: false,
            pageSize: 2,

            proxy: {
                type: 'ajax',
                url: '../api/v1/balance/balancesalecash',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
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
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            labelWidth: 15,
                            flex: 1,
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
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

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
                            tooltip: 'Imprimer la balance vente/caisse',
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
                            fieldLabel: 'MONTANT VENTE',
                            labelWidth: 120,
                            itemId: 'montantTTC',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'MONTANT ACHAT',
                            labelWidth: 120,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantAchat',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'MARGE:',
                            labelWidth: 55,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'marge',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'RATIO V/A:',
                            labelWidth: 100,
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'ratioVA'

                        }
                    ]
                },

                {
                    xtype: "toolbar",
                    dock: 'bottom',
                    items: [
                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'FOND.CAISSE',
                            labelWidth: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'fondCaisse',
                            value: 0

                        }, {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'REGL.DIFFERE',
                            labelWidth: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantRegDiff',
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'MOBILE',
                            labelWidth: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantMobilePayment',
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },

                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'REGL.TPAYANT:',
                            labelWidth: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantRegleTp',
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'SORTIE:',
                            labelWidth: 60,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantSortie',
                            fieldStyle: "color:red;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',

                            flex: 0.7,
                            fieldLabel: 'ENTREE',
                            labelWidth: 60,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            itemId: 'montantEntre',
                            fieldStyle: "color:green;font-weight:800;",
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
                            fieldLabel: 'ESPECES',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantEsp',
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'PANIER M',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'panierMoyen',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'NB.VENTE',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'nbreVente',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'CHEQUE',
                            labelWidth: 60,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            id: 'montantCheque',
                            value: 0
                        }, {
                            xtype: 'displayfield',
                            flex: 0.7,
                            fieldLabel: 'VIREMENT',
                            labelWidth: 70,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            id: 'montantVirement',
                            value: 0
                        }
                    ]
                }

            ],
            items: [{
                    xtype: 'tabpanel',
                    itemId: 'ongletsBalance',
                    items: [{
                    title: 'Balance',
                    xtype: 'gridpanel',
                    itemId: 'balanceGrid',
                    store: store,
//                    height: 150,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },

                    columns: [

                        {
                            header: 'Type vente',
                            dataIndex: 'typeVente',
                            flex: 0.5

                        }, {
                            header: 'Nbre Vente',
                            dataIndex: 'nbreVente',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.5
                        }, {
                            text: 'Montant',
                            columns: [
                                {
                                    text: 'Brut(TTC)',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'montantTTC',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    text: 'Remise',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'montantRemise',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    text: 'Net(TTC)',
                                    xtype: 'numbercolumn',
                                    format: '0,000.',
                                    dataIndex: 'montantNet',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    text: '%',
                                    dataIndex: 'pourcentage',
                                    flex: 0.5
                                }
                            ]
                        }, {
                            header: 'Panier.M',
                            dataIndex: 'panierMoyen',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }, {
                            header: 'Espèces',
                            dataIndex: 'montantEsp',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }, {
                            header: 'Chèques',
                            dataIndex: 'montantCheque',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }, {
                            header: 'Carte.Banc',
                            dataIndex: 'montantCB',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }, {
                            header: 'Différé',
                            dataIndex: 'montantDiff',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        },
                        {
                            header: 'P.Mobile',
                            dataIndex: 'montantMobilePayment',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        },

                        {
                            header: 'Tiers payant',
                            dataIndex: 'montantTp',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true

                    }

                }, me.ongletAnalyse(analyseStore)]
                }
            ]

        });
        this.callParent();
    },

    /**
     * L'onglet d'analyse comparative.
     *
     * L'onglet « Balance » repond a « combien sur cette periode ». Celui-ci repond a « comment cela
     * evolue d'une periode a l'autre », ce qu'aucune lecture d'une seule periode ne donne.
     *
     * Une seule periode ne fait pas une comparaison : les ecarts restent alors vides, et la grille
     * affiche les chiffres bruts. C'est a partir de deux que la colonne d'ecart a un sens.
     */
    ongletAnalyse: function (analyseStore) {
        var montant = function (entete, champ, largeur) {
            return {
                header: entete, dataIndex: champ, width: largeur || 105, align: 'right',
                xtype: 'numbercolumn', format: '0,000.'
            };
        };
        return {
            title: 'Analyse comparative',
            itemId: 'ongletAnalyseBalance',
            xtype: 'gridpanel',
            store: analyseStore,
            viewConfig: {
                columnLines: true,
                deferEmptyText: false,
                emptyText: '<div style="padding:12px">Choisissez une p&eacute;riode et lancez la recherche.</div>',
                getRowClass: function (ligne) {
                    // La periode en cours n'est pas comparable telle quelle aux periodes revolues :
                    // elle est distinguee a l'oeil, en plus de la mention portee sur son libelle.
                    return ligne.get('enCours') ? 'periode-en-cours' : '';
                }
            },
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'tbtext',
                            itemId: 'analyseResume',
                            text: 'Les p&eacute;riodes r&eacute;volues sont compl&egrave;tes ; celle en cours est '
                                    + 'rappel&eacute;e &agrave; part et n\'est pas comparable telle quelle.'
                        }, '->',
                        {
                            text: 'Exporter', itemId: 'analyseExporter',
                            tooltip: 'Exporter l\'analyse affich&eacute;e au format Excel',
                            iconCls: 'export_excel_icon'
                        }]
                }],
            columns: [
                {
                    header: 'P&eacute;riode', dataIndex: 'libelle', flex: 1,
                    renderer: function (valeur, meta, ligne) {
                        return ligne.get('enCours')
                                ? valeur + ' <i style="color:#888">(en cours)</i>' : valeur;
                    }
                },
                {header: 'Ventes', dataIndex: 'nbreVente', width: 70, align: 'right'},
                montant('Brut TTC', 'montantTTC'),
                montant('Remise', 'montantRemise', 90),
                montant('Net TTC', 'montantNet'),
                montant('Achat', 'montantAchat'),
                montant('Marge', 'marge'),
                montant('Panier moyen', 'panierMoyen', 100),
                montant('Esp&egrave;ces', 'montantEsp', 95),
                montant('Mobile', 'montantMobilePayment', 95),
                montant('Tiers payant', 'montantTp', 100),
                montant('Diff&eacute;r&eacute;', 'montantDiff', 95),
                {
                    header: '&Eacute;cart net', dataIndex: 'ecart', width: 100, align: 'right',
                    renderer: function (valeur, meta, ligne) {
                        if (valeur === null || valeur === undefined) {
                            return '';
                        }
                        // La couleur suit le signe : une baisse doit sauter aux yeux.
                        var couleur = valeur > 0 ? '#177a17' : (valeur < 0 ? '#a00' : '#666');
                        return '<span style="color:' + couleur + '">' + (valeur > 0 ? '+' : '')
                                + Ext.util.Format.number(valeur, '0,000') + '</span>';
                    }
                },
                {
                    header: '&Eacute;cart %', dataIndex: 'ecartPourcentage', width: 85, align: 'right',
                    renderer: function (valeur) {
                        if (valeur === null || valeur === undefined) {
                            return '';
                        }
                        var couleur = valeur > 0 ? '#177a17' : (valeur < 0 ? '#a00' : '#666');
                        return '<span style="color:' + couleur + '">' + (valeur > 0 ? '+' : '')
                                + Ext.util.Format.number(valeur, '0.00') + ' %</span>';
                    }
                }
            ]
        };
    }
});


