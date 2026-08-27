/* global Ext */

/*
 * Menu Details : deux onglets, au format des ecrans de reference.
 *
 *  - « Historique des deconditionnements » : un acte par ligne, avec les stocks du produit
 *    principal avant/apres et l'operateur ;
 *  - « Liste des Produits detailles » : un couple produit principal / produit detail par ligne,
 *    avec les filtres en tete, l'edition PDF, l'export Excel et la creation d'inventaire.
 */
Ext.define('testextjs.view.produits.DetailsManager', {
    extend: 'Ext.tab.Panel',
    xtype: 'detailsmanager',
    title: 'Détails',
    frame: true,
    width: '98%',
    cls: 'custompanel',

    initComponent: function () {
        var me = this;
        me.height = Ext.getBody().getViewSize().height - 110;

        var entier = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };

        // ---------- Onglet 1 : historique ----------
        var storeHistorique = new Ext.data.Store({
            fields: ['date', 'codeCh', 'nomCh', 'codeDet', 'nomDet', 'utilisateur',
                {name: 'qteDet', type: 'int'}, {name: 'stockAvant', type: 'int'}, {name: 'stockApres', type: 'int'}],
            pageSize: 50,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/details/historique',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        me.storeHistorique = storeHistorique;

        var ongletHistorique = {
            title: 'Historique des déconditionnements',
            itemId: 'ongletHistorique',
            layout: 'fit',
            tbar: [
                {xtype: 'datefield', itemId: 'histoDebut', fieldLabel: 'Du', labelWidth: 22, width: 150,
                    format: 'd/m/Y', submitFormat: 'Y-m-d'},
                {xtype: 'datefield', itemId: 'histoFin', fieldLabel: 'Au', labelWidth: 22, width: 150,
                    format: 'd/m/Y', submitFormat: 'Y-m-d'},
                {xtype: 'textfield', itemId: 'histoRech', fieldLabel: 'Recherche', labelWidth: 62, width: 320,
                    emptyText: 'CIP, produit ou utilisateur (contient)', enableKeyEvents: true},
                {itemId: 'btnHistoRechercher', tooltip: 'Rechercher', iconCls: 'searchicon', text: 'Rechercher'},
                '->',
                {itemId: 'btnHistoImprimer', tooltip: 'Imprimer la liste affichée', iconCls: 'printable', text: 'PDF'},
                {itemId: 'btnHistoExcel', tooltip: 'Exporter la liste affichée', iconCls: 'export_excel_icon',
                    text: 'Excel'}
            ],
            items: [{
                    xtype: 'grid',
                    itemId: 'grilleHistorique',
                    store: storeHistorique,
                    columns: [
                        {header: 'Date', dataIndex: 'date', width: 85},
                        {header: 'Code CH', dataIndex: 'codeCh', width: 110},
                        {header: 'Nom CH', dataIndex: 'nomCh', flex: 2},
                        {header: 'Qté Det', dataIndex: 'qteDet', width: 70, align: 'right', renderer: entier},
                        {header: 'Code Det', dataIndex: 'codeDet', width: 110},
                        {header: 'Nom Det', dataIndex: 'nomDet', flex: 2},
                        {header: 'Stock avant', dataIndex: 'stockAvant', width: 85, align: 'right', renderer: entier},
                        {header: 'Stock après', dataIndex: 'stockApres', width: 85, align: 'right', renderer: entier},
                        {header: 'Utilisateur', dataIndex: 'utilisateur', width: 130}
                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: storeHistorique,
                        displayInfo: true,
                        displayMsg: 'Mouvements {0} - {1} sur {2}',
                        emptyMsg: 'Aucun mouvement'
                    }
                }]
        };

        // ---------- Onglet 2 : liste des produits detailles ----------
        var storeProduits = new Ext.data.Store({
            fields: ['cipPP', 'nomPP', 'cipPD', 'nomPD',
                {name: 'stockPP', type: 'int'}, {name: 'contenance', type: 'int'}, {name: 'stockPD', type: 'int'}],
            pageSize: 50,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/details/produits',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        me.storeProduits = storeProduits;

        var ongletListe = {
            title: 'Liste des Produits détaillés',
            itemId: 'ongletListe',
            layout: 'fit',
            tbar: [
                // Une seule zone de recherche : elle trouve par le produit principal OU par le detail.
                {xtype: 'textfield', itemId: 'rech', fieldLabel: 'Produit', labelWidth: 48, width: 380,
                    emptyText: 'CIP ou nom, principal ou détail (contient)', enableKeyEvents: true},
                {xtype: 'numberfield', itemId: 'rechContenance', fieldLabel: 'Contenance', labelWidth: 75, width: 160,
                    minValue: 0, hideTrigger: true, emptyText: 'Toutes'},
                {itemId: 'btnListeRechercher', tooltip: 'Rechercher', iconCls: 'searchicon'},
                {itemId: 'btnListeVider', tooltip: 'Vider les filtres', iconCls: 'icon-clear-group'},
                '->',
                {itemId: 'btnListeImprimer', tooltip: 'Imprimer la liste filtrée', iconCls: 'printable', text: 'PDF'},
                {itemId: 'btnListeExcel', tooltip: 'Exporter la liste filtrée', iconCls: 'export_excel_icon',
                    text: 'Excel'},
                {itemId: 'btnListeInventaire', tooltip: 'Créer un inventaire avec les produits de la liste filtrée',
                    iconCls: 'icon-grid', text: 'Inventaire'}
            ],
            items: [{
                    xtype: 'grid',
                    itemId: 'grilleProduits',
                    store: storeProduits,
                    columns: [
                        {header: 'Identifiant PP', dataIndex: 'cipPP', width: 120},
                        {header: 'Produit Principal', dataIndex: 'nomPP', flex: 2},
                        {header: 'Stock CH', dataIndex: 'stockPP', width: 80, align: 'right', renderer: entier},
                        {header: 'Contenance', dataIndex: 'contenance', width: 95, align: 'right',
                            renderer: function (v) {
                                return '<span style="color:#1c7c1c;font-weight:bold;">' + entier(v) + '</span>';
                            }},
                        {header: 'Identifiant PD', dataIndex: 'cipPD', width: 120},
                        {header: 'Produit Détail', dataIndex: 'nomPD', flex: 2},
                        {header: 'Stock Détail', dataIndex: 'stockPD', width: 90, align: 'right', renderer: entier}
                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: storeProduits,
                        displayInfo: true,
                        displayMsg: 'Nombre de lignes : {0} - {1} sur {2}',
                        emptyMsg: 'Nombre de lignes : 0'
                    }
                }]
        };

        Ext.apply(me, {
            // L'ordre des onglets suit l'ecran de reference ; la liste est active a l'ouverture.
            items: [ongletHistorique, ongletListe],
            activeTab: 1
        });
        me.callParent(arguments);
    },

    /** Filtres de l'onglet liste, tels qu'affiches : la meme source sert l'ecran, le PDF, l'Excel et l'inventaire. */
    parametresListe: function () {
        return {
            rech: this.down('#rech').getValue() || '',
            contenance: this.down('#rechContenance').getValue() || 0
        };
    },

    /** Periode et recherche de l'onglet historique (vides = tout l'historique). */
    parametresHistorique: function () {
        var debut = this.down('#histoDebut').getValue();
        var fin = this.down('#histoFin').getValue();
        return {
            dtStart: debut ? Ext.Date.format(debut, 'Y-m-d') : '',
            dtEnd: fin ? Ext.Date.format(fin, 'Y-m-d') : '',
            recherche: this.down('#histoRech').getValue() || ''
        };
    }
});
