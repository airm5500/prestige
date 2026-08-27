/* global Ext */

/*
 * Menu « Ventes ratees » (Service client) : consultation complete du registre.
 *
 *  - onglet « Registre » : filtres (periode, utilisateur, produit, client, motif, connu/inconnu,
 *    commande, rattachement), actions (nouvelle demande, modifier, commander, rattacher),
 *    impression PDF et exports CSV / Excel de la liste filtree ;
 *  - onglet « Analyse » : indicateurs, classements et evolutions sur la periode.
 *
 * La fenetre d'acces rapide (bouton panier du bandeau) reste centree sur la journee ;
 * cet ecran porte l'historique.
 */
Ext.define('testextjs.view.ventesratees.VentesRateesManager', {
    extend: 'Ext.tab.Panel',
    xtype: 'ventesrateesmanager',
    title: 'Ventes ratées',
    frame: true,
    width: '98%',
    cls: 'custompanel',

    initComponent: function () {
        var me = this;
        me.height = Ext.getBody().getViewSize().height - 110;

        var storeRegistre = new Ext.data.Store({
            fields: ['id', 'familleId', 'cip', 'designation', 'clientId', 'nomClient', 'telephone', 'motifId',
                'motif', 'commentaire', 'date', 'utilisateur', 'etat', 'dateCommande', 'utilisateurCommande',
                'produitRattache', {name: 'quantite', type: 'int'}, {name: 'commande', type: 'boolean'},
                {name: 'connu', type: 'boolean'}, {name: 'rattache', type: 'boolean'}],
            pageSize: 50,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventes-ratees/recherche',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        me.storeRegistre = storeRegistre;

        var storeMotifs = new Ext.data.Store({
            fields: ['id', 'libelle'],
            proxy: {type: 'ajax', url: '../api/v1/ventes-ratees/motifs',
                reader: {type: 'json', root: 'data'}},
            autoLoad: true
        });
        me.storeMotifs = storeMotifs;

        var storeUtilisateurs = new Ext.data.Store({
            fields: ['id', 'nom'],
            proxy: {type: 'ajax', url: '../api/v1/ventes-ratees/utilisateurs',
                reader: {type: 'json', root: 'data'}},
            autoLoad: true
        });
        me.storeUtilisateurs = storeUtilisateurs;

        var comboTroisEtats = function (itemId, label, largeurLabel, largeur, valeurs) {
            return {
                xtype: 'combo', itemId: itemId, fieldLabel: label, labelWidth: largeurLabel, width: largeur,
                editable: false, value: '',
                store: new Ext.data.ArrayStore({fields: ['code', 'libelle'], data: valeurs}),
                valueField: 'code', displayField: 'libelle', queryMode: 'local'
            };
        };

        var etatRenderer = function (v, meta, record) {
            var couleur = record.get('commande') ? '#1e8449' : '#c0392b';
            return '<span style="color:' + couleur + ';font-weight:bold;">' + v + '</span>';
        };
        var produitRenderer = function (v, meta, record) {
            var texte = Ext.String.htmlEncode(v || '');
            if (record.get('rattache') && record.get('produitRattache')) {
                texte += ' <span style="color:#1a6dae;">→ ' + Ext.String.htmlEncode(record.get('produitRattache'))
                        + '</span>';
            } else if (!record.get('connu')) {
                texte += ' <span style="color:#9a6d00;">(saisie libre)</span>';
            }
            return texte;
        };

        var ongletRegistre = {
            title: 'Registre des ventes ratées',
            itemId: 'ongletRegistre',
            layout: 'fit',
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top',
                    items: [
                        {xtype: 'datefield', itemId: 'filtreDebut', fieldLabel: 'Du', labelWidth: 22, width: 148,
                            format: 'd/m/Y'},
                        {xtype: 'datefield', itemId: 'filtreFin', fieldLabel: 'Au', labelWidth: 22, width: 148,
                            format: 'd/m/Y'},
                        {xtype: 'combo', itemId: 'filtreUtilisateur', fieldLabel: 'Utilisateur', labelWidth: 62,
                            width: 220, store: storeUtilisateurs, valueField: 'id', displayField: 'nom',
                            queryMode: 'local', editable: false, emptyText: 'Tous'},
                        {xtype: 'textfield', itemId: 'filtreProduit', fieldLabel: 'Produit', labelWidth: 45,
                            width: 210, emptyText: 'CIP ou désignation (contient)', enableKeyEvents: true},
                        {xtype: 'textfield', itemId: 'filtreClient', fieldLabel: 'Client', labelWidth: 40,
                            width: 190, emptyText: 'Nom ou téléphone', enableKeyEvents: true},
                        {xtype: 'combo', itemId: 'filtreMotif', fieldLabel: 'Motif', labelWidth: 35, width: 200,
                            store: storeMotifs, valueField: 'id', displayField: 'libelle', queryMode: 'local',
                            editable: false, emptyText: 'Tous'}
                    ]
                }, {
                    xtype: 'toolbar', dock: 'top',
                    items: [
                        comboTroisEtats('filtreConnu', 'Produit', 45, 180,
                                [['', 'Tous'], ['connu', 'Produit connu'], ['inconnu', 'Saisie libre']]),
                        comboTroisEtats('filtreCommande', 'État', 30, 190,
                                [['', 'Tous'], ['oui', 'Commandées'], ['non', 'Non commandées']]),
                        comboTroisEtats('filtreRattache', 'Rattachement', 80, 235,
                                [['', 'Tous'], ['rattache', 'Rattachées'], ['arattacher', 'À rattacher']]),
                        {itemId: 'btnRechercher', tooltip: 'Rechercher', iconCls: 'searchicon', text: 'Rechercher'},
                        {itemId: 'btnVider', tooltip: 'Vider les filtres', iconCls: 'icon-clear-group',
                            text: 'Vider'},
                        '->',
                        {itemId: 'btnNouvelle', tooltip: 'Saisir une nouvelle demande', iconCls: 'addicon',
                            text: 'Nouvelle demande'},
                        {itemId: 'btnImprimer', tooltip: 'Imprimer la liste filtrée', iconCls: 'printable',
                            text: 'PDF'},
                        {itemId: 'btnExcel', tooltip: 'Exporter la liste filtrée', iconCls: 'export_excel_icon',
                            text: 'Excel'},
                        {itemId: 'btnCsv', tooltip: 'Exporter la liste filtrée en CSV', iconCls: 'export_csv_icon',
                            text: 'CSV'}
                    ]
                }],
            items: [{
                    xtype: 'grid',
                    itemId: 'grilleRegistre',
                    store: storeRegistre,
                    columns: [
                        {header: 'Date', dataIndex: 'date', width: 105},
                        {header: 'CIP', dataIndex: 'cip', width: 85},
                        {header: 'Produit / désignation', dataIndex: 'designation', flex: 3,
                            renderer: produitRenderer},
                        {header: 'Qté', dataIndex: 'quantite', width: 50, align: 'right'},
                        {header: 'Client', dataIndex: 'nomClient', flex: 1},
                        {header: 'Téléphone', dataIndex: 'telephone', width: 95},
                        {header: 'Motif', dataIndex: 'motif', flex: 1},
                        {header: 'Commentaire', dataIndex: 'commentaire', flex: 1},
                        {header: 'Utilisateur', dataIndex: 'utilisateur', width: 110},
                        {header: 'État', dataIndex: 'etat', width: 105, renderer: etatRenderer}
                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: storeRegistre,
                        displayInfo: true,
                        displayMsg: 'Demandes {0} - {1} sur {2}',
                        emptyMsg: 'Aucune demande',
                        items: ['-',
                            {itemId: 'btnModifier', text: 'Modifier', iconCls: 'edit',
                                tooltip: 'Modifier la demande sélectionnée (ou double-clic sur la ligne)'},
                            {itemId: 'btnCommander', text: 'Marquer commandé', iconCls: 'check_icon',
                                tooltip: 'Marquer la demande sélectionnée comme commandée'},
                            {itemId: 'btnRattacher', text: 'Rattacher', iconCls: 'fusionicon',
                                tooltip: 'Rattacher la saisie libre sélectionnée à un produit'}]
                    }
                }]
        };

        var ongletAnalyse = {
            title: 'Analyse',
            itemId: 'ongletAnalyse',
            autoScroll: true,
            bodyPadding: 12,
            tbar: [
                // Par defaut : la journee en cours, chargee automatiquement a l'ouverture de l'onglet
                {xtype: 'datefield', itemId: 'analyseDebut', fieldLabel: 'Du', labelWidth: 22, width: 148,
                    format: 'd/m/Y', value: new Date()},
                {xtype: 'datefield', itemId: 'analyseFin', fieldLabel: 'Au', labelWidth: 22, width: 148,
                    format: 'd/m/Y', value: new Date()},
                {itemId: 'btnAnalyser', tooltip: 'Actualiser l\'analyse', iconCls: 'searchicon', text: 'Actualiser'},
                '->',
                {itemId: 'btnAnalysePdf', tooltip: 'Imprimer l\'analyse affichée', iconCls: 'printable',
                    text: 'PDF'},
                {itemId: 'btnAnalyseExcel', tooltip: 'Exporter l\'analyse affichée', iconCls: 'export_excel_icon',
                    text: 'Excel'}
            ],
            html: '<div id="vr-analyse">Chargement de la journée en cours…</div>'
        };

        Ext.apply(me, {
            items: [ongletRegistre, ongletAnalyse],
            activeTab: 0
        });
        me.callParent(arguments);
    },

    /** Filtres du registre, tels qu'affiches : la meme source sert l'ecran, le PDF, l'Excel et le CSV. */
    parametresRegistre: function () {
        var debut = this.down('#filtreDebut').getValue();
        var fin = this.down('#filtreFin').getValue();
        return {
            dtStart: debut ? Ext.Date.format(debut, 'Y-m-d') : '',
            dtEnd: fin ? Ext.Date.format(fin, 'Y-m-d') : '',
            userId: this.down('#filtreUtilisateur').getValue() || '',
            produit: this.down('#filtreProduit').getValue() || '',
            client: this.down('#filtreClient').getValue() || '',
            motifId: this.down('#filtreMotif').getValue() || '',
            connu: this.down('#filtreConnu').getValue() || '',
            commande: this.down('#filtreCommande').getValue() || '',
            rattache: this.down('#filtreRattache').getValue() || ''
        };
    },

    parametresAnalyse: function () {
        var debut = this.down('#analyseDebut').getValue();
        var fin = this.down('#analyseFin').getValue();
        return {
            dtStart: debut ? Ext.Date.format(debut, 'Y-m-d') : '',
            dtEnd: fin ? Ext.Date.format(fin, 'Y-m-d') : ''
        };
    }
});
