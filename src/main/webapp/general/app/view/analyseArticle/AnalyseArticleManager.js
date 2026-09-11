/* global Ext */

/*
 * Analyse article.
 *
 * Deux lectures de l'assortiment vendu sur une periode :
 *   - la matrice marge x rotation : quatre quadrants (champions, rentables mais lents, volume fort peu
 *     rentable, produits a risque), chacun avec sa decision pratique, et la liste des produits ;
 *   - les produits achetes ensemble : les paires les plus frequentes sur un meme ticket.
 * Tout est recalcule depuis les ventes et le stock actuel ; les seuils « eleve / faible » valent par defaut
 * les medianes de l'assortiment et se modifient dans la barre d'outils.
 */
Ext.define('testextjs.view.analyseArticle.AnalyseArticleManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'analysearticle',

    frame: true,
    title: 'Analyse article',
    iconCls: 'icon-grid',
    width: '97%',
    height: Ext.getBody() ? Ext.getBody().getViewSize().height * 0.85 : 700,
    minHeight: 570,
    cls: 'custompanel',
    layout: 'fit',

    /** Les quatre quadrants, dans l'ordre d'affichage (memes textes que le serveur). */
    QUADRANTS: [
        {quadrant: 1, libelle: 'Champions', couleur: '#177a17', axes: 'Marge élevée · rotation élevée'},
        {quadrant: 2, libelle: 'Rentables mais lents', couleur: '#1565c0', axes: 'Marge élevée · rotation faible'},
        {quadrant: 3, libelle: 'Volume fort, peu rentable', couleur: '#b26a00', axes: 'Marge faible · rotation élevée'},
        {quadrant: 4, libelle: 'Produits à risque', couleur: '#a00000', axes: 'Marge faible · rotation faible'}
    ],

    initComponent: function () {
        var me = this;
        me.articleStore = Ext.create('Ext.data.Store', {
            fields: ['produitId', 'cip', 'libelle', 'familleId', 'rayonId', 'grossisteId',
                {name: 'quantite', type: 'int'}, {name: 'tickets', type: 'int'}, {name: 'montant', type: 'int'},
                {name: 'montantHt', type: 'int'}, {name: 'achat', type: 'int'}, {name: 'marge', type: 'int'},
                {name: 'tauxMarge', type: 'float'}, {name: 'stock', type: 'int'}, {name: 'rotation', type: 'float'},
                {name: 'couverture', type: 'float'}, {name: 'valeurStock', type: 'int'}, 'classe',
                {name: 'quadrant', type: 'int'}, 'quadrantLibelle', 'decision'],
            pageSize: 50,
            proxy: {
                type: 'ajax',
                url: '../api/v1/analyse-article/matrice',
                timeout: 600000,
                extraParams: {typePeriode: 'TROIS_MOIS'},
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        me.paireStore = Ext.create('Ext.data.Store', {
            fields: ['produit1Id', 'cip1', 'libelle1', 'produit2Id', 'cip2', 'libelle2',
                {name: 'tickets', type: 'int'}, {name: 'tickets1', type: 'int'}, {name: 'tickets2', type: 'int'},
                {name: 'part1', type: 'float'}, {name: 'part2', type: 'float'}],
            proxy: {
                type: 'ajax',
                url: '../api/v1/analyse-article/paires',
                timeout: 600000,
                extraParams: {typePeriode: 'TROIS_MOIS', minimum: 3, limite: 100},
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        Ext.applyIf(me, {
            dockedItems: [me.barreOutils()],
            items: [{
                    xtype: 'tabpanel',
                    itemId: 'ongletsAnalyse',
                    items: [me.ongletMatrice(), me.ongletPaires()]
                }]
        });
        me.callParent(arguments);
    },

    /** Les choix de periode : ceux du fichier de configuration s'il est charge, sinon la liste standard. */
    choixPeriodes: function () {
        return (window.PrestigeAnalyse && window.PrestigeAnalyse.CHOIX) || [
            {id: 'TROIS_SEMAINES', libelle: '3 dernières semaines'}, {id: 'TROIS_MOIS', libelle: '3 derniers mois'},
            {id: 'SIX_MOIS', libelle: '6 derniers mois'}, {id: 'TROIS_ANS', libelle: '3 dernières années'},
            {id: 'LIBRE', libelle: 'Période libre'}];
    },

    barreOutils: function () {
        var me = this;
        return {
            xtype: 'toolbar',
            dock: 'top',
            items: [{
                    xtype: 'combobox',
                    // « typePeriode » : le selecteur de periodes commun reconnait cet identifiant et ne pose
                    // pas un second selecteur.
                    itemId: 'typePeriode',
                    fieldLabel: 'Période',
                    labelWidth: 50,
                    width: 210,
                    store: Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], data: me.choixPeriodes()}),
                    valueField: 'id',
                    displayField: 'libelle',
                    queryMode: 'local',
                    editable: false,
                    value: 'TROIS_MOIS'
                }, {
                    xtype: 'datefield', fieldLabel: 'Du', itemId: 'dtStart', labelWidth: 20, width: 140,
                    submitFormat: 'Y-m-d', maxValue: new Date(), format: 'd/m/Y', value: new Date(), disabled: true
                }, {
                    xtype: 'datefield', fieldLabel: 'Au', itemId: 'dtEnd', labelWidth: 20, width: 140,
                    submitFormat: 'Y-m-d', maxValue: new Date(), format: 'd/m/Y', value: new Date(), disabled: true
                }, '-', {
                    // Les seuils : vides, ce sont les medianes de l'assortiment qui s'appliquent (rappelees
                    // dans l'en-tete de la matrice) ; saisis, ils remplacent les medianes.
                    xtype: 'numberfield', itemId: 'seuilMarge', fieldLabel: 'Marge élevée ≥', labelWidth: 95,
                    width: 175, minValue: 0, maxValue: 100, allowDecimals: true, decimalPrecision: 1,
                    emptyText: 'médiane', hideTrigger: true
                }, {
                    xtype: 'displayfield', value: '%', margin: '0 8 0 2'
                }, {
                    xtype: 'numberfield', itemId: 'seuilRotation', fieldLabel: 'Rotation élevée ≥', labelWidth: 110,
                    width: 190, minValue: 0, allowDecimals: true, decimalPrecision: 2, emptyText: 'médiane',
                    hideTrigger: true
                }, {
                    text: 'Analyser', itemId: 'analyser', iconCls: 'x-tbar-loading'
                }, '->', {
                    text: 'Créer un inventaire', itemId: 'creerInventaire', iconCls: 'addicon',
                    tooltip: 'Un inventaire des produits cochés, ou de tous les produits affichés'
                }, {
                    text: 'Exporter Excel', itemId: 'exporterExcel', iconCls: 'export_excel_icon'
                }, {
                    text: 'Imprimer', itemId: 'imprimer', iconCls: 'printable'
                }]
        };
    },

    /* ------------------------------------------------------------------ matrice marge x rotation */

    ongletMatrice: function () {
        var me = this;
        var filtreDistant = function (url) {
            return Ext.create('Ext.data.Store', {
                idProperty: 'id',
                fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
                autoLoad: false,
                pageSize: 9999,
                proxy: {type: 'ajax', url: url, reader: {type: 'json', root: 'data', totalProperty: 'total'}}
            });
        };
        var combo = function (itemId, libelle, store) {
            return {
                xtype: 'combobox', itemId: itemId, fieldLabel: libelle, labelWidth: 70, width: 220,
                store: store, pageSize: 999, valueField: 'id', displayField: 'libelle', typeAhead: true,
                queryMode: 'remote', minChars: 2, emptyText: 'Tous'
            };
        };
        var nombre = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        return {
            title: 'Matrice marge × rotation',
            itemId: 'ongletMatrice',
            xtype: 'panel',
            layout: {type: 'vbox', align: 'stretch'},
            items: [{
                    // Les quatre quadrants : un clic filtre la liste sur le quadrant (second clic : tous).
                    xtype: 'panel',
                    itemId: 'quadrants',
                    border: false,
                    height: 150,
                    cls: 'analyse-article-quadrants',
                    tpl: new Ext.XTemplate(
                        '<div class="aa-entete">{entete}</div>',
                        '<div class="aa-grille">',
                        '<tpl for="quadrants">',
                        '<div class="aa-quadrant {[values.actif ? "aa-actif" : ""]}" data-quadrant="{quadrant}" style="border-top:4px solid {couleur};">',
                        '<div class="aa-titre" style="color:{couleur};">{libelle}</div>',
                        '<div class="aa-axes">{axes}</div>',
                        '<div class="aa-chiffres"><b>{produits}</b> produit(s) · CA <b>{[this.n(values.montant)]}</b> ({partCa} %) · marge <b>{[this.n(values.marge)]}</b> · stock <b>{[this.n(values.valeurStock)]}</b></div>',
                        '<div class="aa-decision">{decision}</div>',
                        '</div>',
                        '</tpl>',
                        '</div>',
                        {n: nombre}),
                    data: {entete: 'Choisissez une période puis cliquez sur Analyser.', quadrants: []}
                }, {
                    xtype: 'toolbar',
                    items: [{
                            xtype: 'combobox', itemId: 'filtreQuadrant', fieldLabel: 'Quadrant', labelWidth: 55, width: 240,
                            store: Ext.create('Ext.data.ArrayStore', {
                                data: [[0, 'Tous']].concat(Ext.Array.map(me.QUADRANTS, function (q) {
                                    return [q.quadrant, q.libelle];
                                })),
                                fields: [{name: 'value', type: 'int'}, 'libelle']
                            }),
                            valueField: 'value', displayField: 'libelle', queryMode: 'local', editable: false, value: 0
                        },
                        combo('filtreRayon', 'Emplacement', filtreDistant('../api/v1/common/rayons')),
                        combo('filtreFamille', 'Famille', filtreDistant('../api/v1/common/famillearticles')),
                        combo('filtreGrossiste', 'Grossiste', filtreDistant('../api/v1/common/grossiste')),
                        {
                            xtype: 'textfield', itemId: 'recherche', fieldLabel: 'Produit', labelWidth: 50, width: 240,
                            emptyText: 'CIP ou libellé', enableKeyEvents: true
                        }, {
                            text: 'Effacer les filtres', itemId: 'effacerFiltres'
                        }, '->', {
                            xtype: 'tbtext', itemId: 'compteCoches', text: ''
                        }]
                }, {
                    xtype: 'gridpanel',
                    itemId: 'grilleArticles',
                    flex: 1,
                    store: me.articleStore,
                    selModel: Ext.create('Ext.selection.CheckboxModel', {mode: 'MULTI', checkOnly: true}),
                    viewConfig: {
                        columnLines: true,
                        deferEmptyText: false,
                        emptyText: '<div style="padding:12px">Aucun produit vendu sur la période.</div>'
                    },
                    bbar: Ext.create('Ext.PagingToolbar', {store: me.articleStore, displayInfo: true}),
                    columns: [
                        {
                            header: 'Quadrant', dataIndex: 'quadrant', width: 150,
                            renderer: function (v, meta, ligne) {
                                var q = me.QUADRANTS[v - 1];
                                if (!q) {
                                    return '';
                                }
                                meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(ligne.get('decision')) + '"';
                                return '<b style="color:' + q.couleur + '">' + q.libelle + '</b>';
                            }
                        },
                        {header: 'CIP', dataIndex: 'cip', width: 85},
                        {header: 'Produit', dataIndex: 'libelle', flex: 1},
                        {header: 'Qté', dataIndex: 'quantite', width: 60, align: 'right'},
                        {header: 'Tickets', dataIndex: 'tickets', width: 65, align: 'right'},
                        {header: 'Chiffre', dataIndex: 'montant', width: 95, align: 'right', xtype: 'numbercolumn', format: '0,000.'},
                        {header: 'Marge', dataIndex: 'marge', width: 90, align: 'right', xtype: 'numbercolumn', format: '0,000.'},
                        {header: 'Taux %', dataIndex: 'tauxMarge', width: 65, align: 'right', xtype: 'numbercolumn', format: '0.0'},
                        {header: 'Stock', dataIndex: 'stock', width: 60, align: 'right'},
                        {
                            header: 'Rotation', dataIndex: 'rotation', width: 70, align: 'right',
                            tooltip: 'Quantité vendue sur la période / stock actuel',
                            xtype: 'numbercolumn', format: '0.00'
                        },
                        {
                            header: 'Couv. (j)', dataIndex: 'couverture', width: 70, align: 'right',
                            tooltip: 'Jours de couverture du stock actuel au rythme de vente de la période',
                            renderer: function (v) {
                                return v < 0 ? '∞' : Ext.util.Format.number(v, '0.0');
                            }
                        },
                        {header: 'Valeur stock', dataIndex: 'valeurStock', width: 90, align: 'right', xtype: 'numbercolumn', format: '0,000.'},
                        {
                            header: 'ABC', dataIndex: 'classe', width: 45, align: 'center',
                            renderer: function (v) {
                                return v ? '<span class="classe-abc-lettre-' + v.toLowerCase() + '">' + v + '</span>' : '';
                            }
                        }
                    ]
                }]
        };
    },

    /* ------------------------------------------------------------------ produits achetes ensemble */

    ongletPaires: function () {
        var me = this;
        return {
            title: 'Achetés ensemble',
            itemId: 'ongletPaires',
            xtype: 'gridpanel',
            store: me.paireStore,
            viewConfig: {
                columnLines: true,
                deferEmptyText: false,
                emptyText: '<div style="padding:12px">Aucune paire de produits n\'atteint le minimum de tickets en commun.</div>'
            },
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'tbtext',
                            text: 'Produits présents sur les mêmes tickets, du plus fréquent au moins fréquent.'
                        }, '-', {
                            xtype: 'numberfield', itemId: 'minimumTickets', fieldLabel: 'Minimum de tickets ensemble',
                            labelWidth: 170, width: 240, minValue: 1, allowDecimals: false, value: 3
                        }, {
                            xtype: 'numberfield', itemId: 'limitePaires', fieldLabel: 'Paires', labelWidth: 45, width: 120,
                            minValue: 1, maxValue: 1000, allowDecimals: false, value: 100
                        }, {
                            text: 'Actualiser', itemId: 'actualiserPaires', iconCls: 'x-tbar-loading'
                        }, '->', {
                            text: 'Exporter Excel', itemId: 'exporterPaires', iconCls: 'export_excel_icon'
                        }]
                }],
            columns: [
                {xtype: 'rownumberer', width: 36},
                {header: 'CIP', dataIndex: 'cip1', width: 85},
                {header: 'Produit 1', dataIndex: 'libelle1', flex: 1},
                {header: 'CIP', dataIndex: 'cip2', width: 85},
                {header: 'Produit 2', dataIndex: 'libelle2', flex: 1},
                {header: 'Tickets ensemble', dataIndex: 'tickets', width: 120, align: 'right'},
                {
                    header: '% des tickets du produit 1', dataIndex: 'part1', width: 160, align: 'right',
                    tooltip: 'Part des tickets contenant le produit 1 qui contiennent aussi le produit 2',
                    xtype: 'numbercolumn', format: '0.0'
                },
                {
                    header: '% des tickets du produit 2', dataIndex: 'part2', width: 160, align: 'right',
                    xtype: 'numbercolumn', format: '0.0'
                }
            ]
        };
    }
});
