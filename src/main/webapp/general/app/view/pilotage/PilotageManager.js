/* global Ext */

/*
 * MENU DE PILOTAGE (evolution 6, point 1).
 *
 * Ce que cet ecran apporte, et qui n'existait pas dans le logiciel : chaque mois est isole et COMPARABLE a un
 * autre. Jusqu'ici il fallait exporter le rapport d'activite mois par mois et rapprocher les classeurs a la
 * main pour repondre a « est-ce qu'on fait mieux que l'an dernier ». La donnee etait deja en base ; il
 * manquait l'ecran.
 *
 * Le tableau de bord existant n'est pas touche : ce menu vit a cote de lui.
 *
 * LE SELECTEUR DE PERIODE N'EST PAS UN FILTRE, C'EST UN AXE DE COMPARAISON. Choisir « Vs meme mois l'an
 * dernier » ne change pas la periode regardee : il change ce a quoi on la compare, et chaque tuile gagne sa
 * ligne de variation. C'est le mecanisme central de l'ecran.
 *
 * Chaque onglet a la meme structure, celle qui a ete validee sur la maquette : une rangee de TUILES avec leur
 * variation, un GRAPHIQUE d'evolution mensuelle, et le DETAIL MENSUEL chiffre en dessous. Habillage clair,
 * celui du logiciel : un ecran sombre au milieu de Prestige ferait tache et fatiguerait a la lecture d'un
 * tableau de chiffres.
 */
Ext.define('testextjs.view.pilotage.PilotageManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'pilotage',
    itemId: 'pilotage',
    requires: ['Ext.chart.Chart', 'Ext.chart.series.Line', 'Ext.chart.axis.Numeric',
        'Ext.chart.axis.Category'],
    frame: true,
    title: 'PILOTAGE DE L\'OFFICINE',
    width: '99%',
    height: 'auto',
    minHeight: 620,
    cls: 'custompanel',
    layout: {type: 'vbox', align: 'stretch'},

    /* Les onglets de cette livraison. Chacun porte ses colonnes de detail : le reste est commun. */
    ONGLETS: [
        {cle: 'synthese', titre: 'Synthèse'},
        {cle: 'ventes', titre: 'Ventes'},
        {cle: 'marge', titre: 'Marge'}
    ],

    initComponent: function () {
        var me = this;

        me.storeAxes = new Ext.data.Store({
            fields: [{name: 'code', type: 'string'}, {name: 'libelle', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/pilotage/axes',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Un store de tuiles et un store de mois PAR ONGLET : deux onglets ne se pietinent pas. */
        me.stores = {};
        Ext.each(me.ONGLETS, function (onglet) {
            me.stores[onglet.cle] = {
                tuiles: new Ext.data.Store({
                    fields: ['cle', 'libelle', 'unite', 'sousTitre',
                        {name: 'valeur', type: 'float'},
                        /*
                         * useNull : SANS lui, ExtJS convertit une valeur absente en 0, et une tuile sans
                         * comparaison affichait « ▲ 0,0 % » - c'est-a-dire une variation nulle la ou il n'y
                         * a aucune comparaison. Defaut vu au banc.
                         */
                        {name: 'reference', type: 'float', useNull: true},
                        {name: 'variation', type: 'float', useNull: true},
                        {name: 'ecart', type: 'float', useNull: true}],
                    data: []
                }),
                mois: new Ext.data.Store({
                    fields: ['mois', 'libelle',
                        {name: 'caTTC', type: 'float'}, {name: 'caHT', type: 'float'},
                        {name: 'marge', type: 'float'}, {name: 'tauxMarge', type: 'float'},
                        {name: 'achatTTC', type: 'float'}, {name: 'coutAchat', type: 'float'},
                        {name: 'nbVentes', type: 'int'}, {name: 'nbBons', type: 'int'},
                        {name: 'panier', type: 'float'}, {name: 'remises', type: 'float'},
                        {name: 'partTiersPayant', type: 'float'}],
                    data: []
                })
            };
        });

        Ext.applyIf(me, {
            items: [me.barrePeriode(), me.onglets()]
        });
        me.callParent(arguments);
    },

    /* ================================================================= l'axe de comparaison */

    barrePeriode: function () {
        var me = this;
        return {
            xtype: 'toolbar',
            itemId: 'barrePeriode',
            padding: 6,
            layout: {type: 'vbox', align: 'stretch'},
            items: [{
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    defaults: {margin: '0 6 4 0'},
                    items: [{
                            xtype: 'displayfield',
                            value: '<b>PÉRIODE</b>',
                            width: 64
                        }, {
                            xtype: 'combobox',
                            itemId: 'axe',
                            width: 250,
                            store: me.storeAxes,
                            displayField: 'libelle',
                            valueField: 'code',
                            queryMode: 'local',
                            editable: false,
                            value: 'MOIS'
                        }, {
                            xtype: 'datefield',
                            itemId: 'dtStart',
                            fieldLabel: 'Du',
                            labelWidth: 24,
                            width: 150,
                            format: 'd/m/Y',
                            /* Les dates ne servent QUE pour l'axe « période personnalisée ». */
                            disabled: true
                        }, {
                            xtype: 'datefield',
                            itemId: 'dtEnd',
                            fieldLabel: 'au',
                            labelWidth: 24,
                            width: 150,
                            format: 'd/m/Y',
                            disabled: true
                        }, {
                            xtype: 'button',
                            itemId: 'actualiser',
                            text: 'Actualiser',
                            iconCls: 'search'
                        }, {
                            xtype: 'component',
                            flex: 1
                        }, {
                            xtype: 'button',
                            itemId: 'imprimer',
                            text: 'Imprimer / exporter la vue',
                            iconCls: 'printable',
                            menu: [{itemId: 'imprimerPdf', text: 'Imprimer (PDF)', iconCls: 'printable'},
                                {itemId: 'exporterExcel', text: 'Exporter Excel', iconCls: 'icon-excel'}]
                        }]
                }, {
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    items: [{
                            xtype: 'displayfield',
                            itemId: 'rappelAxe',
                            flex: 1,
                            value: ''
                        }]
                }]
        };
    },

    onglets: function () {
        var me = this;
        var onglets = [];
        Ext.each(me.ONGLETS, function (onglet) {
            onglets.push(me.onglet(onglet));
        });
        return {
            xtype: 'tabpanel',
            itemId: 'onglets',
            flex: 1,
            minHeight: 520,
            activeTab: 0,
            items: onglets
        };
    },

    /* Un onglet : les tuiles, le graphique, le detail mensuel. */
    onglet: function (onglet) {
        var me = this;
        return {
            xtype: 'panel',
            itemId: 'onglet-' + onglet.cle,
            title: onglet.titre,
            cleOnglet: onglet.cle,
            border: false,
            autoScroll: true,
            layout: {type: 'vbox', align: 'stretch'},
            items: [me.tuiles(onglet.cle), me.graphique(onglet.cle), me.detail(onglet.cle)]
        };
    },

    /*
     * Les tuiles. Une vue de donnees plutot qu'un assemblage de panneaux : le serveur decide des tuiles de
     * chaque onglet, et l'ecran n'a pas a connaitre leur liste. La ligne de variation n'apparait que s'il y a
     * une comparaison - et elle est verte a la hausse, rouge a la baisse, avec la fleche qui va avec.
     */
    tuiles: function (cle) {
        return {
            xtype: 'dataview',
            itemId: 'tuiles-' + cle,
            store: this.stores[cle].tuiles,
            cls: 'pilotage-tuiles',
            itemSelector: 'div.pilotage-tuile',
            emptyText: '<div class="pilotage-vide">Choisissez une période puis « Actualiser ».</div>',
            deferEmptyText: false,
            height: 104,
            tpl: new Ext.XTemplate(
                '<tpl for=".">',
                '<div class="pilotage-tuile" data-cle="{cle}">',
                '<div class="pilotage-tuile-libelle">{libelle}</div>',
                '<div class="pilotage-tuile-valeur">{[this.montant(values.valeur, values.unite)]}</div>',
                '<tpl if="variation !== null && variation !== undefined">',
                '<div class="pilotage-tuile-variation {[values.variation >= 0 ? \'hausse\' : \'baisse\']}">',
                '{[values.variation >= 0 ? \'▲\' : \'▼\']} {[this.pourcent(values.variation)]}',
                '<span class="pilotage-tuile-ecart"> ({[this.montant(values.ecart, values.unite)]})</span>',
                '</div>',
                '</tpl>',
                '<tpl if="sousTitre">',
                '<div class="pilotage-tuile-sous">{sousTitre}</div>',
                '</tpl>',
                '</div>',
                '</tpl>',
                {
                    montant: function (valeur, unite) {
                        if (valeur === null || valeur === undefined) {
                            return '-';
                        }
                        var signe = valeur < 0 ? '-' : '';
                        var absolu = Math.abs(valeur);
                        /* Les montants d'une officine se comptent en millions : on les abrege pour qu'ils
                         * restent lisibles dans une tuile, le detail mensuel donnant la valeur exacte. */
                        if (unite === 'FCFA' && absolu >= 1000000) {
                            return signe + Ext.util.Format.number(absolu / 1000000, '0,000.0') + ' M';
                        }
                        if (unite === '%') {
                            return Ext.util.Format.number(valeur, '0,000.0') + ' %';
                        }
                        return signe + Ext.util.Format.number(absolu, '0,000.##');
                    },
                    pourcent: function (valeur) {
                        return Ext.util.Format.number(Math.abs(valeur), '0,000.0') + ' %';
                    }
                })
        };
    },

    graphique: function (cle) {
        var champs = {synthese: 'caTTC', ventes: 'caTTC', marge: 'marge'};
        var titres = {synthese: 'Chiffre d\'affaires TTC mensuel', ventes: 'Chiffre d\'affaires TTC mensuel',
            marge: 'Marge mensuelle'};
        return {
            xtype: 'panel',
            itemId: 'graphiquePanneau-' + cle,
            title: titres[cle],
            height: 240,
            layout: 'fit',
            items: [{
                    xtype: 'chart',
                    itemId: 'graphique-' + cle,
                    animate: false,
                    shadow: false,
                    store: this.stores[cle].mois,
                    axes: [{
                            type: 'Numeric',
                            position: 'left',
                            fields: [champs[cle]],
                            minimum: 0,
                            grid: true,
                            label: {renderer: function (v) {
                                    return Ext.util.Format.number(v / 1000000, '0,000.0') + ' M';
                                }}
                        }, {
                            type: 'Category',
                            position: 'bottom',
                            fields: ['libelle'],
                            label: {rotate: {degrees: 315}}
                        }],
                    series: [{
                            type: 'line',
                            xField: 'libelle',
                            yField: champs[cle],
                            smooth: false,
                            markerConfig: {radius: 3},
                            tips: {
                                trackMouse: true,
                                width: 220,
                                height: 44,
                                renderer: function (record) {
                                    this.setTitle(record.get('libelle') + ' : '
                                            + Ext.util.Format.number(record.get(this.yField
                                                    || 'caTTC'), '0,000.') + ' FCFA');
                                }
                            }
                        }]
                }]
        };
    },

    detail: function (cle) {
        var colonnes = this.colonnes(cle);
        return {
            xtype: 'gridpanel',
            itemId: 'detail-' + cle,
            title: 'Détail mensuel',
            store: this.stores[cle].mois,
            flex: 1,
            minHeight: 200,
            columnLines: true,
            features: [{ftype: 'summary'}],
            columns: colonnes,
            viewConfig: {
                /* Le mois en cours est incomplet : il se lit en italique pour qu'on ne le compare pas
                 * naïvement aux mois pleins qui le precedent. */
                getRowClass: function (record, index, rowParams, store) {
                    return index === store.getCount() - 1 ? 'pilotage-mois-encours' : '';
                }
            }
        };
    },

    /** Colonnes du detail mensuel, par onglet. Les montants portent leur total en pied de grille. */
    colonnes: function (cle) {
        var montant = function (texte, champ, largeur) {
            return {text: texte, dataIndex: champ, width: largeur || 120, align: 'right',
                itemId: 'col-' + champ,
                renderer: function (v) {
                    return Ext.util.Format.number(v, '0,000.');
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    return '<b>' + Ext.util.Format.number(v, '0,000.') + '</b>';
                }};
        };
        var taux = function (texte, champ) {
            return {text: texte, dataIndex: champ, width: 100, align: 'right', itemId: 'col-' + champ,
                renderer: function (v) {
                    return Ext.util.Format.number(v, '0,000.0') + ' %';
                }};
        };
        var mois = {text: 'MOIS', dataIndex: 'libelle', flex: 1, itemId: 'col-mois',
            summaryRenderer: function () {
                return '<b>TOTAL</b>';
            }};
        if (cle === 'marge') {
            return [mois, montant('CA HT', 'caHT'), montant('COÛT D\'ACHAT', 'coutAchat'),
                montant('MARGE', 'marge'), taux('TAUX DE MARGE', 'tauxMarge'),
                montant('CA TTC', 'caTTC'), montant('ACHATS TTC', 'achatTTC')];
        }
        if (cle === 'ventes') {
            /* Les colonnes de modes de reglement s'ajoutent au chargement : elles dependent des modes
             * REELLEMENT rencontres sur la periode. */
            return [mois, montant('CA TTC', 'caTTC'), montant('VENTES', 'nbVentes', 90),
                montant('PANIER MOYEN', 'panier'), montant('REMISES', 'remises')];
        }
        return [mois, montant('CA TTC', 'caTTC'), montant('MARGE', 'marge'), taux('TAUX', 'tauxMarge'),
            montant('ACHATS TTC', 'achatTTC'), montant('VENTES', 'nbVentes', 90),
            montant('PANIER MOYEN', 'panier'), montant('PART TIERS PAYANT', 'partTiersPayant')];
    }
});
