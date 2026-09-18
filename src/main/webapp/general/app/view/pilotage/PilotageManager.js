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
        {cle: 'marge', titre: 'Marge'},
        {cle: 'achats', titre: 'Achats'},
        {cle: 'caisse', titre: 'Caisse & tiers-payant'},
        {cle: 'stock', titre: 'Stock'},
        {cle: 'qualite', titre: 'Qualité–Exploitation'},
        {cle: 'kpi', titre: 'KPI Analyse'},
        {cle: 'comparateur', titre: 'Comparateur'}
    ],

    initComponent: function () {
        var me = this;

        /* Grossistes qui ont reellement livre sur la fenetre : le filtre ne propose pas de fournisseur muet. */
        me.storeGrossistes = new Ext.data.Store({
            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/pilotage/grossistes',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Part de chaque grossiste sur la fenetre : la lecture que l'officine fait en premier. */
        me.storeRepartition = new Ext.data.Store({
            fields: [{name: 'grossiste', type: 'string'}, {name: 'montant', type: 'float'},
                {name: 'part', type: 'float'}],
            data: []
        });

        me.storeFamilles = new Ext.data.Store({
            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/famillearticles',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        me.storeEmplacements = new Ext.data.Store({
            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/rayons',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Le catalogue des KPI vient du SERVEUR : l'ecran ne connait pas les indicateurs. */
        me.storeKpis = new Ext.data.Store({
            fields: [{name: 'cle', type: 'string'}, {name: 'libelle', type: 'string'},
                {name: 'unite', type: 'string'}, {name: 'famille', type: 'string'},
                {name: 'mensuel', type: 'boolean'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/pilotage/kpis',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Frequentation horaire : le seul indicateur qui ne se lit pas par mois. */
        me.storeHoraire = new Ext.data.Store({
            fields: [{name: 'heure', type: 'int'}, {name: 'libelle', type: 'string'},
                {name: 'nbVentes', type: 'int'}, {name: 'caTTC', type: 'float'}],
            data: []
        });

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
                        {name: 'partTiersPayant', type: 'float'},
                        {name: 'encaisse', type: 'float'}, {name: 'credit', type: 'float'},
                        {name: 'partComptant', type: 'float'}, {name: 'partCredit', type: 'float'},
                        {name: 'tpRegle', type: 'float'},
                        {name: 'valeurAchat', type: 'float'}, {name: 'valeurVente', type: 'float'},
                        {name: 'entrees', type: 'float'}, {name: 'sorties', type: 'float'},
                        {name: 'variationStock', type: 'float'}, {name: 'unites', type: 'float'},
                        {name: 'mesure', type: 'boolean'},
                        {name: 'nbAnnulees', type: 'int'}, {name: 'montantAnnule', type: 'float'},
                        {name: 'tauxRemise', type: 'float'}, {name: 'tauxAnnulation', type: 'float'},
                        {name: 'ratioVA', type: 'float'},
                        /* Comparateur : les deux objets compares et leur ecart. */
                        {name: 'a', type: 'float'}, {name: 'b', type: 'float'},
                        {name: 'ecart', type: 'float'}, {name: 'rapport', type: 'float'}],
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

    /* Un onglet : les tuiles, le graphique, le detail mensuel. L'onglet Achats porte en plus ses filtres
     * et la part de chaque grossiste. */
    onglet: function (onglet) {
        var me = this;
        var contenu = [];
        if (onglet.cle === 'achats') {
            contenu.push(me.filtresAchats());
        }
        if (onglet.cle === 'kpi') {
            contenu.push(me.casesKpi());
        }
        if (onglet.cle === 'comparateur') {
            contenu.push(me.choixComparateur());
        }
        contenu.push(me.tuiles(onglet.cle));
        if (onglet.cle === 'achats') {
            contenu.push(me.repartitionGrossistes());
        }
        if (onglet.cle === 'stock' || onglet.cle === 'qualite') {
            /* La note dit d'ou viennent les chiffres : reconstitues ou mesures pour le stock, etat du jour
             * ou periode pour la qualite. Sans elle, deux lectures differentes seraient confondues. */
            contenu.push({
                xtype: 'toolbar',
                itemId: 'note-' + onglet.cle,
                padding: 4,
                items: [{xtype: 'displayfield', itemId: 'texteNote', flex: 1, value: ''}]
            });
        }
        contenu.push(me.graphique(onglet.cle));
        if (onglet.cle === 'kpi') {
            contenu.push(me.frequentation());
        }
        contenu.push(me.detail(onglet.cle));
        return {
            xtype: 'panel',
            itemId: 'onglet-' + onglet.cle,
            title: onglet.titre,
            cleOnglet: onglet.cle,
            border: false,
            autoScroll: true,
            layout: {type: 'vbox', align: 'stretch'},
            items: contenu
        };
    },

    /*
     * Filtres de l'onglet Achats.
     *
     * Le filtre grossiste garde le montant des BONS ; les filtres famille et emplacement font passer le
     * calcul sur les LIGNES, parce que l'en-tete d'un bon porte le bon entier. L'ecran le dit alors en clair :
     * sans cela, l'officine croirait avoir perdu 4 % de ses achats en posant un filtre.
     */
    filtresAchats: function () {
        var me = this;
        return {
            xtype: 'toolbar',
            itemId: 'filtresAchats',
            padding: 4,
            items: [{
                    xtype: 'combobox',
                    itemId: 'grossiste',
                    fieldLabel: 'Grossiste',
                    labelWidth: 64,
                    width: 280,
                    store: me.storeGrossistes,
                    displayField: 'libelle',
                    valueField: 'id',
                    queryMode: 'local',
                    editable: false,
                    emptyText: 'Tous'
                }, {
                    xtype: 'combobox',
                    itemId: 'famille',
                    fieldLabel: 'Famille',
                    labelWidth: 54,
                    width: 250,
                    store: me.storeFamilles,
                    displayField: 'libelle',
                    valueField: 'id',
                    queryMode: 'local',
                    editable: false,
                    emptyText: 'Toutes'
                }, {
                    xtype: 'combobox',
                    itemId: 'emplacement',
                    fieldLabel: 'Emplacement',
                    labelWidth: 84,
                    width: 250,
                    store: me.storeEmplacements,
                    displayField: 'libelle',
                    valueField: 'id',
                    queryMode: 'local',
                    editable: false,
                    emptyText: 'Tous'
                }, {
                    xtype: 'button',
                    itemId: 'reinitialiserAchats',
                    text: 'Réinitialiser'
                }, {
                    xtype: 'component',
                    flex: 1
                }, {
                    xtype: 'displayfield',
                    itemId: 'noteAchats',
                    value: ''
                }]
        };
    },

    repartitionGrossistes: function () {
        return {
            xtype: 'gridpanel',
            itemId: 'repartition',
            title: 'Part de chaque grossiste sur la fenêtre',
            store: this.storeRepartition,
            height: 150,
            columnLines: true,
            columns: [
                {text: 'GROSSISTE', dataIndex: 'grossiste', flex: 2, itemId: 'col-grossiste'},
                {text: 'MONTANT', dataIndex: 'montant', width: 150, align: 'right',
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    }},
                {text: 'PART', dataIndex: 'part', width: 100, align: 'right', itemId: 'col-part',
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.0') + ' %';
                    }}
            ]
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
        var champs = {synthese: 'caTTC', ventes: 'caTTC', marge: 'marge', achats: 'achatTTC',
            caisse: 'encaisse', stock: 'valeurAchat', qualite: 'nbAnnulees', kpi: 'caTTC',
            comparateur: 'a'};
        var titres = {synthese: 'Chiffre d\'affaires TTC mensuel', ventes: 'Chiffre d\'affaires TTC mensuel',
            marge: 'Marge mensuelle', achats: 'Achats mensuels', caisse: 'Encaissé au comptoir, par mois',
            stock: 'Valeur du stock au prix d\'achat, fin de mois',
            qualite: 'Ventes annulées par mois', kpi: 'Évolution du premier indicateur coché',
            comparateur: 'Évolution de l\'objet A'};
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

    /*
     * KPI cochables.
     *
     * « On devra avoir tous les KPI cochables ; celui qui est coche fera l'objet de l'analyse sur le selecteur
     * de periode choisi et on verra sa courbe d'evolution. » Les cases sont construites a partir du catalogue
     * rendu par le serveur, regroupees par famille d'indicateurs : l'ecran n'en connait pas la liste.
     */
    casesKpi: function () {
        return {
            xtype: 'panel',
            itemId: 'casesKpi',
            title: 'Indicateurs à analyser (cochez ce que vous voulez suivre)',
            bodyPadding: 6,
            layout: {type: 'table', columns: 5},
            items: [],
            height: 140,
            autoScroll: true
        };
    },

    /* La courbe de frequentation horaire : elle n'apparait que si l'indicateur est coche. */
    frequentation: function () {
        return {
            xtype: 'gridpanel',
            itemId: 'frequentation',
            title: 'Fréquentation horaire de la période',
            store: this.storeHoraire,
            height: 170,
            hidden: true,
            columnLines: true,
            columns: [
                {text: 'HEURE', dataIndex: 'libelle', width: 90, itemId: 'col-heure'},
                {text: 'CLIENTS SERVIS', dataIndex: 'nbVentes', width: 140, align: 'right',
                    itemId: 'col-clients',
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    summaryType: 'sum'},
                {text: 'CHIFFRE D\'AFFAIRES', dataIndex: 'caTTC', flex: 1, align: 'right',
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    }}
            ],
            features: [{ftype: 'summary'}]
        };
    },

    /*
     * Comparateur : deux objets, la meme grandeur, la meme periode.
     *
     * Deux usages : deux objets de meme nature (deux familles, deux rayons, deux grossistes), ou deux
     * GRANDEURS entre elles - « par exemple les achats aux ventes sur une periode ».
     */
    choixComparateur: function () {
        var me = this;
        return {
            xtype: 'toolbar',
            itemId: 'choixComparateur',
            padding: 4,
            items: [{
                    xtype: 'combobox',
                    itemId: 'typeComparaison',
                    fieldLabel: 'Comparer',
                    labelWidth: 62,
                    width: 230,
                    editable: false,
                    value: 'GRANDEUR',
                    store: new Ext.data.Store({
                        fields: ['id', 'libelle'],
                        data: [
                            {id: 'GRANDEUR', libelle: 'Deux grandeurs'},
                            {id: 'FAMILLE', libelle: 'Deux familles'},
                            {id: 'RAYON', libelle: 'Deux rayons'},
                            {id: 'GROSSISTE', libelle: 'Deux grossistes'}
                        ]
                    }),
                    displayField: 'libelle',
                    valueField: 'id',
                    queryMode: 'local'
                }, {
                    xtype: 'combobox',
                    itemId: 'objetA',
                    fieldLabel: 'A',
                    labelWidth: 16,
                    width: 230,
                    editable: false,
                    store: me.storeKpis,
                    displayField: 'libelle',
                    valueField: 'cle',
                    queryMode: 'local',
                    value: 'caTTC'
                }, {
                    xtype: 'combobox',
                    itemId: 'objetB',
                    fieldLabel: 'B',
                    labelWidth: 16,
                    width: 230,
                    editable: false,
                    store: me.storeKpis,
                    displayField: 'libelle',
                    valueField: 'cle',
                    queryMode: 'local',
                    value: 'achatTTC'
                }, {
                    xtype: 'combobox',
                    itemId: 'grandeurComparee',
                    fieldLabel: 'Sur',
                    labelWidth: 26,
                    width: 190,
                    editable: false,
                    disabled: true,
                    store: new Ext.data.Store({
                        fields: ['id', 'libelle'],
                        data: [
                            {id: 'caTTC', libelle: 'Chiffre d\'affaires'},
                            {id: 'marge', libelle: 'Marge'},
                            {id: 'unites', libelle: 'Unités vendues'}
                        ]
                    }),
                    displayField: 'libelle',
                    valueField: 'id',
                    queryMode: 'local',
                    value: 'caTTC'
                }, {
                    xtype: 'component',
                    flex: 1
                }, {
                    xtype: 'displayfield',
                    itemId: 'noteComparateur',
                    value: ''
                }]
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
        if (cle === 'achats') {
            /* Les colonnes de grossistes s'ajoutent au chargement : elles dependent de qui a livre. */
            return [mois, montant('ACHATS', 'achatTTC'), montant('BONS', 'nbBons', 80)];
        }
        if (cle === 'kpi') {
            /* Les colonnes suivent les cases cochees : elles sont posees au chargement. */
            return [mois];
        }
        if (cle === 'comparateur') {
            return [mois, montant('OBJET A', 'a', 150), montant('OBJET B', 'b', 150),
                montant('ÉCART', 'ecart', 150),
                {text: 'RAPPORT A / B', dataIndex: 'rapport', width: 130, align: 'right',
                    itemId: 'col-rapport',
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.00');
                    }}];
        }
        if (cle === 'stock') {
            return [mois, montant('VALEUR DU STOCK', 'valeurAchat', 150), montant('ENTRÉES', 'entrees'),
                montant('SORTIES', 'sorties'), montant('VARIATION', 'variationStock'),
                {text: 'SOURCE', dataIndex: 'mesure', width: 110, itemId: 'col-mesure',
                    renderer: function (v) {
                        /* Une valeur mesurée et une valeur reconstituée ne se lisent pas de la même façon :
                         * l'écran le dit ligne par ligne plutôt qu'une fois en note. */
                        return v ? 'Photo' : '<span style="color:#8a6d3b">Reconstituée</span>';
                    }}];
        }
        if (cle === 'qualite') {
            return [mois, montant('CA TTC', 'caTTC'), montant('VENTES', 'nbVentes', 90),
                montant('ANNULÉES', 'nbAnnulees', 100), taux('% ANNUL.', 'tauxAnnulation'),
                montant('REMISES', 'remises'), taux('% REMISE', 'tauxRemise')];
        }
        if (cle === 'caisse') {
            return [mois, montant('CA TTC', 'caTTC'), montant('ENCAISSÉ', 'encaisse'),
                montant('CRÉDIT', 'credit'), taux('% COMPTANT', 'partComptant'),
                montant('TP FACTURÉ', 'partTiersPayant'), montant('TP RÉGLÉ', 'tpRegle')];
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
