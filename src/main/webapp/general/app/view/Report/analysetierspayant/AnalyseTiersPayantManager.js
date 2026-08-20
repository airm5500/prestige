/* global Ext */

/*
 * Analyse tiers payants : ce que chaque tiers payant a fait vendre sur une periode, et sur quels produits.
 *
 * Deux grilles : les tiers payants en haut, les produits en bas. Selectionner un tiers payant restreint la
 * grille des produits ; sans selection, les produits sont cumules tous tiers payants confondus.
 *
 * La marge est celle de l'analyse 20/80 du chiffre d'affaires : chiffre d'affaires hors taxes net de remise,
 * diminue du prix d'achat reel de la ligne de vente.
 */
Ext.define('testextjs.view.Report.analysetierspayant.AnalyseTiersPayantManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'analysetierspayant',
    title: 'Analyse tiers payants',
    frame: true,
    width: '98%',
    minHeight: 520,
    cls: 'custompanel',
    layout: {type: 'vbox', align: 'stretch'},

    /* Premier et dernier jour utile du mois en cours : periode proposee a l'ouverture. */
    debutDuMois: function () {
        var maintenant = new Date();
        return new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    },

    initComponent: function () {
        var me = this;
        /* Hauteur lue au moment de l'ouverture, pas au chargement du fichier : la taille de la
         * fenetre du navigateur peut avoir change entre les deux. */
        me.height = Ext.getBody().getViewSize().height - 110;

        var champsCommuns = [
            {name: 'quantite', type: 'int'},
            {name: 'caTtc', type: 'int'},
            {name: 'caHt', type: 'int'},
            {name: 'montantAchat', type: 'int'},
            {name: 'marge', type: 'int'},
            {name: 'tauxMarge', type: 'float'}
        ];

        var storeTiersPayants = new Ext.data.Store({
            fields: champsCommuns.concat([
                {name: 'tiersPayantId', type: 'string'},
                {name: 'tiersPayant', type: 'string'},
                {name: 'nbVentes', type: 'int'},
                {name: 'partTiersPayant', type: 'int'},
                {name: 'partClient', type: 'int'}
            ]),
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/analyse-tierspayant/tiers-payants',
                reader: {type: 'json', root: 'data', totalProperty: 'total'},
                timeout: 300000
            }
        });

        var storeProduits = new Ext.data.Store({
            fields: champsCommuns.concat([
                {name: 'cip', type: 'string'},
                {name: 'designation', type: 'string'}
            ]),
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/analyse-tierspayant/produits',
                reader: {type: 'json', root: 'data', totalProperty: 'total'},
                timeout: 300000
            }
        });

        me.storeTiersPayants = storeTiersPayants;
        me.storeProduits = storeProduits;

        var montant = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        var pourcent = function (v) {
            return Ext.util.Format.number(v || 0, '0.00') + ' %';
        };
        /* Une marge negative se remarque : c'est une vente a perte. */
        var margeRenderer = function (v, meta) {
            if (v < 0) {
                meta.style = 'color:#B02A37;font-weight:bold;';
            }
            return montant(v);
        };
        /* Pied de grille : les montants s'additionnent, le taux se recalcule sur les totaux
         * (faire la moyenne des taux ligne a ligne donnerait un chiffre faux). */
        var sommeMontant = function (v) {
            return '<b>' + montant(v) + '</b>';
        };
        var sommeEntier = function (v) {
            return '<b>' + Ext.util.Format.number(v || 0, '0,000') + '</b>';
        };
        var tauxGlobalDe = function (store) {
            return function () {
                var marge = 0, caHt = 0;
                store.each(function (r) {
                    marge += r.get('marge') || 0;
                    caHt += r.get('caHt') || 0;
                });
                return '<b>' + (caHt === 0 ? '0.00' : Ext.util.Format.number(marge * 100 / caHt, '0.00')) + ' %</b>';
            };
        };
        var tauxGlobalTiersPayants = tauxGlobalDe(storeTiersPayants);
        var tauxGlobalProduits = tauxGlobalDe(storeProduits);

        Ext.applyIf(me, {
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'top',
                items: [
                    {
                        xtype: 'datefield', fieldLabel: 'Du', itemId: 'dtStart', labelWidth: 20,
                        margin: '0 10 0 0', width: 170, submitFormat: 'Y-m-d', format: 'd/m/Y',
                        maxValue: new Date(), value: me.debutDuMois()
                    },
                    {
                        xtype: 'datefield', fieldLabel: 'Au', itemId: 'dtEnd', labelWidth: 20,
                        margin: '0 10 0 0', width: 170, submitFormat: 'Y-m-d', format: 'd/m/Y',
                        maxValue: new Date(), value: new Date()
                    },
                    {
                        xtype: 'textfield', itemId: 'rechercheTiersPayant', width: 210,
                        margin: '0 10 0 0', emptyText: 'Filtrer un tiers payant...',
                        enableKeyEvents: true
                    },
                    {
                        xtype: 'textfield', itemId: 'rechercheProduit', width: 230,
                        margin: '0 10 0 0', emptyText: 'Filtrer un produit (CIP ou libellé)...',
                        enableKeyEvents: true
                    },
                    {text: 'Rechercher', itemId: 'btnRechercher', iconCls: 'searchicon'},
                    '->',
                    {text: 'Exporter CSV', itemId: 'btnExportTiersPayants', iconCls: 'icon-clear-group',
                     tooltip: 'Export CSV de la liste des tiers payants'},
                    {text: 'Exporter CSV produits', itemId: 'btnExportProduits', iconCls: 'icon-clear-group',
                     tooltip: 'Export CSV de la liste des produits affichée'}
                ]
            }],
            items: [
                {
                    xtype: 'gridpanel',
                    itemId: 'grilleTiersPayants',
                    title: 'Par tiers payant',
                    flex: 1,
                    store: storeTiersPayants,
                    viewConfig: {forceFit: true, columnLines: true},
                    selModel: {selType: 'rowmodel', mode: 'SINGLE'},
                    columns: [
                        {header: 'Tiers payant', dataIndex: 'tiersPayant', flex: 1.6},
                        {header: 'Ventes', dataIndex: 'nbVentes', flex: 0.5, align: 'right', summaryType: 'sum', summaryRenderer: sommeEntier},
                        {header: 'Quantité', dataIndex: 'quantite', flex: 0.6, align: 'right', summaryType: 'sum', summaryRenderer: sommeEntier},
                        {header: 'CA TTC', dataIndex: 'caTtc', flex: 0.9, align: 'right', renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant},
                        {header: 'Part tiers payant', dataIndex: 'partTiersPayant', flex: 1, align: 'right',
                         renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant},
                        {header: 'Part client', dataIndex: 'partClient', flex: 0.9, align: 'right',
                         renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant},
                        {header: 'CA HT', dataIndex: 'caHt', flex: 0.9, align: 'right', renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant},
                        {header: 'Achat', dataIndex: 'montantAchat', flex: 0.9, align: 'right', renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant},
                        {header: 'Marge', dataIndex: 'marge', flex: 0.9, align: 'right', renderer: margeRenderer, summaryType: 'sum', summaryRenderer: sommeMontant},
                        {header: 'Marge / CA HT', dataIndex: 'tauxMarge', flex: 0.8, align: 'right',
                         renderer: pourcent, summaryType: 'sum', summaryRenderer: tauxGlobalTiersPayants}
                    ],
                    features: [{
                        ftype: 'summary',
                        dock: 'bottom'
                    }]
                },
                {
                    xtype: 'gridpanel',
                    itemId: 'grilleProduits',
                    title: 'Par produit — tous tiers payants',
                    flex: 1,
                    store: storeProduits,
                    viewConfig: {forceFit: true, columnLines: true},
                    columns: [
                        {header: 'CIP', dataIndex: 'cip', flex: 0.7},
                        {header: 'Désignation', dataIndex: 'designation', flex: 2},
                        {header: 'Quantité', dataIndex: 'quantite', flex: 0.6, align: 'right', summaryType: 'sum', summaryRenderer: sommeEntier},
                        {header: 'CA TTC', dataIndex: 'caTtc', flex: 0.9, align: 'right', renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant},
                        {header: 'CA HT', dataIndex: 'caHt', flex: 0.9, align: 'right', renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant},
                        {header: 'Achat', dataIndex: 'montantAchat', flex: 0.9, align: 'right', renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant},
                        {header: 'Marge', dataIndex: 'marge', flex: 0.9, align: 'right', renderer: margeRenderer, summaryType: 'sum', summaryRenderer: sommeMontant},
                        {header: 'Marge / CA HT', dataIndex: 'tauxMarge', flex: 0.8, align: 'right',
                         renderer: pourcent, summaryType: 'sum', summaryRenderer: tauxGlobalProduits}
                    ],
                    features: [{ftype: 'summary', dock: 'bottom'}]
                }
            ]
        });

        me.callParent();
    },

    /* Parametres de la periode et des filtres, partages par les chargements et les exports. */
    parametres: function () {
        var me = this;
        var valeur = function (itemId, lecture) {
            var champ = me.down(itemId);
            return champ ? (lecture(champ) || '') : '';
        };
        return {
            dtStart: valeur('#dtStart', function (c) { return c.getSubmitValue(); }),
            dtEnd: valeur('#dtEnd', function (c) { return c.getSubmitValue(); }),
            queryTiersPayant: valeur('#rechercheTiersPayant', function (c) { return c.getValue(); }).trim(),
            queryProduit: valeur('#rechercheProduit', function (c) { return c.getValue(); }).trim()
        };
    },

    /* Tiers payant selectionne, ou chaine vide pour « tous ». */
    tiersPayantSelectionne: function () {
        var selection = this.down('#grilleTiersPayants').getSelectionModel().getSelection();
        return selection.length ? selection[0].get('tiersPayantId') : '';
    },

    chargerTiersPayants: function () {
        var p = this.parametres();
        this.storeTiersPayants.load({
            params: {dtStart: p.dtStart, dtEnd: p.dtEnd, query: p.queryTiersPayant}
        });
    },

    chargerProduits: function () {
        var me = this, p = me.parametres(), tp = me.tiersPayantSelectionne();
        var selection = me.down('#grilleTiersPayants').getSelectionModel().getSelection();
        me.down('#grilleProduits').setTitle(selection.length
                ? 'Par produit — ' + selection[0].get('tiersPayant')
                : 'Par produit — tous tiers payants');
        me.storeProduits.load({
            params: {dtStart: p.dtStart, dtEnd: p.dtEnd, tiersPayantId: tp, query: p.queryProduit}
        });
    }
});
