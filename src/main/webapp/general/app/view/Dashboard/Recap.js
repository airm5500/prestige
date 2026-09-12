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
    autoScroll: true,
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
                    /* Les quatre cartes du haut, dans le style des tableaux de la balance vente / caisse (bandeau
                       bleu, libelle a gauche, montant en gras a droite, part en pourcentage, ligne de total).
                       Hauteur fixe : le reste de l'ecran revient aux onglets. */
                    xtype: 'component',
                    itemId: 'cartesRecap',
                    cls: 'ventilation-balance vb-v2 recap-cartes',
                    height: 250,
                    margin: '2',
                    tpl: new Ext.XTemplate(
                        '<div class="vb-rangee">',
                        // ---------------------------------------------------------------- chiffres d affaires
                        '<div class="vb-col" id="panelCa">',
                        '<div class="vb-titre">Chiffres d\'affaires</div>',
                        '<table class="vb-table">',
                        '<tr><th></th><th>Montant</th><th>% ventes</th></tr>',
                        '<tr><td class="vb-lib">Montant TTC</td><td class="vb-n">{[this.n(values.montantTTC)]}</td><td class="vb-p"></td></tr>',
                        '<tr><td class="vb-lib">Montant remise</td><td class="vb-n">{[this.n(values.montantRemise)]}</td><td class="vb-p"></td></tr>',
                        '<tr><td class="vb-lib">Montant net</td><td class="vb-n">{[this.n(values.montantNet)]}</td><td class="vb-p"></td></tr>',
                        '<tr><td class="vb-lib">Montant TVA</td><td class="vb-n">{[this.n(values.montantTVA)]}</td><td class="vb-p"></td></tr>',
                        '<tr><td class="vb-lib">Montant HT</td><td class="vb-n">{[this.n(values.montantHT)]}</td><td class="vb-p"></td></tr>',
                        '<tr><td class="vb-lib">Total comptant</td><td class="vb-n">{[this.n(values.montantEsp)]}</td><td class="vb-p">{[this.p(values.pourcentageEsp)]}</td></tr>',
                        '<tr class="vb-total"><td class="vb-lib">Total crédit</td><td class="vb-n">{[this.n(values.montantCredit)]}</td><td class="vb-p">{[this.p(values.pourcentageCredit)]}</td></tr>',
                        '</table>',
                        '</div>',
                        // ---------------------------------------------------------------- totaux achats
                        '<div class="vb-col" id="panelAchat">',
                        '<div class="vb-titre">Totaux achats</div>',
                        '<table class="vb-table">',
                        '<tr><th></th><th>Montant</th></tr>',
                        '<tr><td class="vb-lib">Montant HT</td><td class="vb-n">{[this.n(values.montantTotalHT)]}</td></tr>',
                        '<tr><td class="vb-lib">Montant TVA</td><td class="vb-n">{[this.n(values.montantTotalTVA)]}</td></tr>',
                        '<tr class="vb-total"><td class="vb-lib">Montant TTC</td><td class="vb-n">{[this.n(values.montantTotalTTC)]}</td></tr>',
                        '<tr><td class="vb-lib">Marge</td><td class="vb-n">{[this.n(values.marge)]}</td></tr>',
                        '<tr><td class="vb-lib">Ratio ventes / achats</td><td class="vb-p">{[values.ratio == null ? "" : values.ratio]}</td></tr>',
                        '</table>',
                        '</div>',
                        // ---------------------------------------------------------------- recettes
                        '<div class="vb-col" id="panelRecette">',
                        '<div class="vb-titre">Recettes</div>',
                        '<table class="vb-table">',
                        '<tr><th></th><th>Montant</th><th>% recettes</th></tr>',
                        '<tpl for="reglements">',
                        '<tr><td class="vb-lib">{libelle}</td><td class="vb-n">{[this.n(values.montant)]}</td><td class="vb-p">{[this.part(values.montant, parent.totalRecettes)]}</td></tr>',
                        '</tpl>',
                        '<tr class="vb-total"><td class="vb-lib">TOTAL</td><td class="vb-n">{[this.n(values.totalRecettes)]}</td><td class="vb-p">{[values.reglements && values.reglements.length ? "100 %" : ""]}</td></tr>',
                        '</table>',
                        '</div>',
                        // ---------------------------------------------------------------- mouvements de caisse
                        '<div class="vb-col" id="panelCaisse">',
                        '<div class="vb-titre">Mouvements de caisse</div>',
                        '<table class="vb-table">',
                        '<tr><th></th><th>Montant</th></tr>',
                        '<tpl for="mvtsCaisse">',
                        '<tr><td class="vb-lib">{libelle}</td><td class="vb-n">{[this.n(values.montant)]}</td></tr>',
                        '</tpl>',
                        '<tr class="vb-total"><td class="vb-lib">TOTAL</td><td class="vb-n">{[this.n(values.montantTotalMvt)]}</td></tr>',
                        '</table>',
                        '</div>',
                        '</div>',
                        {
                            n: function (v) {
                                const x = Number(v) || 0;
                                // le format ne gere pas le signe : on l ajoute (sorties de caisse negatives)
                                return (x < 0 ? '-' : '') + Ext.util.Format.number(Math.abs(x), '0,000.');
                            },
                            p: function (v) {
                                return (v == null ? 0 : v) + ' %';
                            },
                            part: function (v, total) {
                                if (!total) {
                                    return '';
                                }
                                return Ext.util.Format.number(v * 100 / total, '0.0') + ' %';
                            }
                        }
                    ),
                    data: {montantTTC: 0, montantRemise: 0, montantNet: 0, montantTVA: 0, montantHT: 0, montantEsp: 0, montantCredit: 0,
                        pourcentageEsp: 0, pourcentageCredit: 0, montantTotalHT: 0, montantTotalTVA: 0, montantTotalTTC: 0, marge: 0, ratio: 0,
                        reglements: [], totalRecettes: 0, mvtsCaisse: [], montantTotalMvt: 0}
                },
                {
                    /* Nouvelle presentation (proposition A retenue) : les cartes restent fixes en haut, les trois
                       listes se partagent le reste de l'ecran en onglets ; chaque liste defile seule, et chaque onglet
                       porte son total dans son titre et son propre bouton d'impression. */
                    xtype: 'tabpanel',
                    itemId: 'ongletsRecap',
                    margin: '5',
                    flex: 1,
                    minHeight: 250,
                    activeTab: 0,
                    plain: true,
                    deferredRender: false,
                    items: [
                        {
                            xtype: 'panel',
                            id: 'achats',
                            itemId: 'ongletAchats',
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
                                    ],
                                    dockedItems: [
                                        {
                                            xtype: 'toolbar',
                                            dock: 'top',
                                            items: [
                                                {
                                                    xtype: 'tbtext',
                                                    itemId: 'resumeAchats',
                                                    text: ''
                                                },
                                                '->',
                                                {
                                                    text: 'imprimer',
                                                    itemId: 'imprimerAchats',
                                                    iconCls: 'printable',
                                                    tooltip: 'imprimer les achats par groupe de grossistes'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]

                        },

                        {
                            xtype: 'panel',
                            id: 'criditsAccordes',
                            itemId: 'ongletCredits',
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
                                                },
                                                '->',
                                                {
                                                    text: 'imprimer',
                                                    itemId: 'imprimerCredits',
                                                    iconCls: 'printable',
                                                    tooltip: 'imprimer les crédits accordés'
                                                }


                                            ]
                                        }
                                    ]
                                }
                            ]

                        },

                        {
                            xtype: 'panel',
                            id: 'reglementTp',
                            itemId: 'ongletReglements',
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
                                                },
                                                '->',
                                                {
                                                    text: 'imprimer',
                                                    itemId: 'imprimerReglements',
                                                    iconCls: 'printable',
                                                    tooltip: 'imprimer les règlements des tiers payants'
                                                }


                                            ]
                                        }
                                    ]
                                }]
                        }
                    ]
                }
            ]

        });
        me.callParent(arguments);
    }
});


