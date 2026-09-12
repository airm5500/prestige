/* global Ext */

/*
 * Point 3 : chiffre d'affaires par zone geographique et par famille d'articles, avec comparaison de
 * periodes (3 dernieres semaines, 3 derniers mois, 6 derniers mois, 3 dernieres annees ou periode
 * libre). Onglet « Tableau » : une colonne par tranche, total, evolution ; onglet « Courbe » : une
 * ligne par zone ou famille (les plus fortes) plus le total.
 *
 * Les colonnes dependent de la periode : la grille est reconstruite a chaque recherche par le
 * controleur (CaZoneGeoCtr), de meme que la courbe.
 */
Ext.define('testextjs.view.cazonegeo.CaZoneGeoManager', {
    extend: 'Ext.tab.Panel',
    xtype: 'cazonegeomanager',
    frame: true,
    width: '97%',
    height: 620,
    minHeight: 620,
    tabPosition: 'top',
    title: 'Analyse du CA par emplacement et famille',

    initComponent: function () {
        const me = this;
        const zones = Ext.create('Ext.data.Store', {
            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
            autoLoad: true,
            pageSize: 9999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/rayons',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        const familles = Ext.create('Ext.data.Store', {
            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
            autoLoad: true,
            pageSize: 9999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/famillearticles',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        /*
         * Les choix viennent de resources/js/selecteur-periodes.js, qui est aussi ce qui pose le
         * selecteur sur les autres ecrans d'analyse. Cet ecran avait le sien avant l'existence de
         * ce fichier et le garde -- l'injection automatique l'ignore quand « #typePeriode » est
         * deja la -- mais la LISTE, elle, doit rester unique : deux listes finiraient par
         * diverger, et deux menus d'analyse ne proposeraient plus les memes periodes.
         */
        const periodes = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            data: (window.PrestigeAnalyse && window.PrestigeAnalyse.CHOIX) || [
                {id: 'TROIS_SEMAINES', libelle: '3 dernières semaines'},
                {id: 'TROIS_MOIS', libelle: '3 derniers mois'},
                {id: 'SIX_MOIS', libelle: '6 derniers mois'},
                {id: 'TROIS_ANS', libelle: '3 dernières années'},
                {id: 'LIBRE', libelle: 'Période libre'}
            ]
        });
        const regroupements = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            data: [
                {id: 'ZONE', libelle: 'Par zone géographique'},
                {id: 'FAMILLE', libelle: 'Par famille d\'articles'},
                {id: 'ZONE_FAMILLE', libelle: 'Zone puis famille'}
            ]
        });
        const debutParDefaut = Ext.Date.add(new Date(), Ext.Date.MONTH, -1);

        Ext.applyIf(me, {
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'combobox',
                            itemId: 'typePeriode',
                            fieldLabel: 'Période',
                            labelWidth: 50,
                            width: 210,
                            store: periodes,
                            valueField: 'id',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            value: 'TROIS_MOIS'
                        }, {
                            xtype: 'datefield',
                            itemId: 'dtStart',
                            fieldLabel: 'Du',
                            labelWidth: 22,
                            width: 130,
                            hidden: true,
                            format: 'd/m/Y',
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            value: debutParDefaut
                        }, {
                            xtype: 'datefield',
                            itemId: 'dtEnd',
                            fieldLabel: 'Au',
                            labelWidth: 22,
                            width: 130,
                            hidden: true,
                            format: 'd/m/Y',
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            value: new Date()
                        }, {
                            xtype: 'combobox',
                            itemId: 'zone',
                            flex: 1,
                            store: zones,
                            valueField: 'id',
                            displayField: 'libelle',
                            queryMode: 'local',
                            typeAhead: true,
                            forceSelection: true,
                            emptyText: 'Toutes les zones géographiques'
                        }, {
                            xtype: 'combobox',
                            itemId: 'famille',
                            flex: 1,
                            store: familles,
                            valueField: 'id',
                            displayField: 'libelle',
                            queryMode: 'local',
                            typeAhead: true,
                            forceSelection: true,
                            emptyText: 'Toutes les familles d\'articles'
                        }, {
                            xtype: 'combobox',
                            itemId: 'regroupement',
                            width: 170,
                            store: regroupements,
                            valueField: 'id',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            value: 'ZONE'
                        }, {
                            text: 'Rechercher',
                            itemId: 'btnRechercher',
                            iconCls: 'searchicon'
                        }, {
                            text: 'Imprimer',
                            itemId: 'btnPdf',
                            iconCls: 'printable',
                            tooltip: 'Éditer le tableau et la courbe en PDF'
                        }, {
                            text: 'Excel',
                            itemId: 'btnExcel',
                            iconCls: 'export_excel_icon',
                            tooltip: 'Exporter le tableau vers Excel'
                        }]
                }, {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    items: [{
                            xtype: 'displayfield',
                            itemId: 'periodeTexte',
                            fieldLabel: 'Période',
                            labelWidth: 55,
                            flex: 1.4,
                            value: ''
                        }, {
                            xtype: 'displayfield',
                            itemId: 'totalTexte',
                            fieldLabel: 'CA total',
                            labelWidth: 55,
                            flex: 1,
                            fieldStyle: 'color:blue;font-weight:800;',
                            value: '0'
                        }, {
                            xtype: 'displayfield',
                            itemId: 'evolutionTexte',
                            fieldLabel: 'Évolution',
                            labelWidth: 60,
                            flex: 1,
                            fieldStyle: 'font-weight:800;',
                            value: ''
                        }]
                }],
            items: [{
                    xtype: 'gridpanel',
                    title: 'Tableau comparatif',
                    itemId: 'grille',
                    border: false,
                    autoScroll: true,
                    features: [{ftype: 'summary'}],
                    viewConfig: {
                        columnLines: true,
                        emptyText: '<div style="margin:20px;">Aucune vente sur la période</div>',
                        deferEmptyText: false
                    },
                    store: Ext.create('Ext.data.Store', {fields: ['libelle'], data: []}),
                    columns: [{text: 'Libellé', dataIndex: 'libelle', flex: 1}]
                }, {
                    xtype: 'panel',
                    title: 'Courbe',
                    itemId: 'panneauCourbe',
                    layout: 'fit',
                    border: false,
                    html: '<div style="margin:20px;color:#666;">Lancez une recherche pour afficher la courbe.</div>'
                }, {
                    /* Retours du 12/09 (point 9) : le meme tableau comparatif, regroupe par gamme puis par
                       laboratoire, sur la periode et les filtres de la barre d'outils. Charge a l'ouverture de
                       l'onglet. */
                    xtype: 'tabpanel',
                    title: 'Gammes / Laboratoires',
                    itemId: 'ongletGammesLabos',
                    border: false,
                    items: [{
                            xtype: 'gridpanel',
                            title: 'Gammes',
                            itemId: 'grilleGammes',
                            regroupement: 'GAMME',
                            border: false,
                            autoScroll: true,
                            features: [{ftype: 'summary'}],
                            viewConfig: {columnLines: true, emptyText: '<div style="margin:20px;">Aucune vente sur la période</div>', deferEmptyText: false},
                            store: Ext.create('Ext.data.Store', {fields: ['libelle'], data: []}),
                            columns: [{text: 'Gamme', dataIndex: 'libelle', flex: 1}]
                        }, {
                            xtype: 'gridpanel',
                            title: 'Laboratoires',
                            itemId: 'grilleLaboratoires',
                            regroupement: 'LABORATOIRE',
                            border: false,
                            autoScroll: true,
                            features: [{ftype: 'summary'}],
                            viewConfig: {columnLines: true, emptyText: '<div style="margin:20px;">Aucune vente sur la période</div>', deferEmptyText: false},
                            store: Ext.create('Ext.data.Store', {fields: ['libelle'], data: []}),
                            columns: [{text: 'Laboratoire', dataIndex: 'libelle', flex: 1}]
                        }]
                }]
        });
        me.callParent(arguments);
    }
});
