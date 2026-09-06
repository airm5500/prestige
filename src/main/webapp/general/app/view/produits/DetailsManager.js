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

        /* Point 8 : la colonne « Qte Det » compte des BOITES deconditionnees, pas des unites de
         * detail. Elle est mise en rouge, et le nom du detail porte juste apres, en vert, ce que
         * l'operation a REELLEMENT produit : boites x contenance. Les deux nombres se lisaient
         * jusqu'ici comme un seul, et on croyait avoir sorti 2 unites la ou on en avait sorti 20. */
        var nombreDeBoites = function (v) {
            return '<span style="color:#c0392b;font-weight:bold;">' + entier(v) + '</span>';
        };

        var nomAvecQuantiteObtenue = function (valeur, meta, enregistrement) {
            var nom = Ext.String.htmlEncode(valeur || '');
            var obtenue = enregistrement.get('qteDetailObtenue');
            var contenance = enregistrement.get('contenance');
            if (!obtenue) {
                return nom;
            }
            var infobulle = entier(enregistrement.get('qteDet')) + ' boîte(s) x ' + entier(contenance)
                    + ' par boîte = ' + entier(obtenue) + ' unité(s) de détail';
            meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(infobulle) + '"';
            return nom + ' <span style="color:#1e7e34;font-weight:bold;">(+' + entier(obtenue) + ')</span>';
        };

        // ---------- Onglet 1 : historique ----------
        var storeHistorique = new Ext.data.Store({
            fields: ['date', 'codeCh', 'nomCh', 'codeDet', 'nomDet', 'utilisateur',
                {name: 'qteDet', type: 'int'}, {name: 'stockAvant', type: 'int'}, {name: 'stockApres', type: 'int'},
                {name: 'stockAvantDet', type: 'int'}, {name: 'stockApresDet', type: 'int'},
                {name: 'contenance', type: 'int'}, {name: 'qteDetailObtenue', type: 'int'}],
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
                /* Periode du JOUR a l'ouverture : l'ecran chargeait tout l'historique, ce qui
                 * n'a d'interet ni pour l'usage courant ni pour le temps de reponse. Les deux
                 * champs restent libres : vider les dates redonne l'historique complet. */
                {xtype: 'datefield', itemId: 'histoDebut', fieldLabel: 'Du', labelWidth: 22, width: 150,
                    format: 'd/m/Y', submitFormat: 'Y-m-d', value: new Date()},
                {xtype: 'datefield', itemId: 'histoFin', fieldLabel: 'Au', labelWidth: 22, width: 150,
                    format: 'd/m/Y', submitFormat: 'Y-m-d', value: new Date()},
                {xtype: 'textfield', itemId: 'histoRech', fieldLabel: 'Recherche', labelWidth: 62, width: 320,
                    emptyText: 'CIP, produit ou utilisateur (contient)', enableKeyEvents: true},
                {itemId: 'btnHistoRechercher', tooltip: 'Rechercher', iconCls: 'searchicon', text: 'Rechercher'},
                '->',
                {itemId: 'btnHistoImprimer', tooltip: 'Imprimer la liste affichée', iconCls: 'printable', text: 'PDF'},
                {itemId: 'btnHistoExcel', tooltip: 'Exporter la liste affichée', iconCls: 'export_excel_icon',
                    text: 'Excel'},
                /* Inventaire des produits qui ont bouge sur la periode : la boite ET son detail.
                 * C'est entre eux que la quantite s'est deplacee, compter l'un sans l'autre ne
                 * dirait rien. */
                {itemId: 'btnHistoInventaire', tooltip: 'Créer un inventaire avec les produits déconditionnés'
                            + ' de la période affichée (chapeau et détail)',
                    iconCls: 'icon-grid', text: 'Créer inventaire'}
            ],
            items: [{
                    xtype: 'grid',
                    itemId: 'grilleHistorique',
                    store: storeHistorique,
                    columns: [
                        /* Chaque bloc porte ses propres stocks : la boite a gauche avec ses
                         * colonnes CH, le detail a droite avec les siennes. Les quantites sont
                         * centrees dans leur colonne, comme demande en recette. */
                        {header: 'Date', dataIndex: 'date', width: 85},
                        {header: 'Code CH', dataIndex: 'codeCh', width: 110},
                        {header: 'Nom CH', dataIndex: 'nomCh', flex: 2},
                        {header: 'Stock av. CH', dataIndex: 'stockAvant', width: 90, align: 'center',
                            renderer: entier},
                        {header: 'Stock ap. CH', dataIndex: 'stockApres', width: 90, align: 'center',
                            renderer: entier},
                        {header: 'Qté Det', dataIndex: 'qteDet', width: 70, align: 'center',
                            tooltip: 'Nombre de boîtes déconditionnées', renderer: nombreDeBoites},
                        /* Contenance rappelee : sans elle, « 2 boites » et « (+20) » n'ont aucun
                         * rapport visible, et le lecteur ne peut pas refaire le calcul. */
                        {header: 'Contenance', dataIndex: 'contenance', width: 85, align: 'center',
                            tooltip: 'Unités de détail contenues dans une boîte', renderer: entier},
                        {header: 'Code Det', dataIndex: 'codeDet', width: 110},
                        {header: 'Nom Det', dataIndex: 'nomDet', flex: 2, renderer: nomAvecQuantiteObtenue},
                        {header: 'Stock av. Det', dataIndex: 'stockAvantDet', width: 90, align: 'center',
                            renderer: entier},
                        {header: 'Stock ap. Det', dataIndex: 'stockApresDet', width: 90, align: 'center',
                            renderer: entier},
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
            fields: ['cipPP', 'nomPP', 'cipPD', 'nomPD', 'familleIdPP', 'familleIdPD',
                {name: 'stockPP', type: 'int'}, {name: 'contenance', type: 'int'}, {name: 'stockPD', type: 'int'},
                {name: 'detailDesactive', type: 'boolean'}],
            pageSize: 50,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/details/produits',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        me.storeProduits = storeProduits;

        /*
         * Memoire du cochage. La grille est paginee : a chaque page le magasin est vide et
         * recharge, et le modele de selection d'ExtJS perd ce qui n'est plus present. On tient
         * donc nous-memes la liste des lignes cochees, par identifiant de produit principal, et
         * on la reapplique apres chaque chargement. Sans cela, cocher trois produits page 1 puis
         * passer page 2 les perdrait sans le dire.
         */
        me.cochesProduits = {};

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
                /* « icon-clear-group » represente un groupement de lignes et ne disait pas
                 * « vider » : remplacee par un pictogramme d'effacement (cf. vente-theme.css). */
                {itemId: 'btnListeVider', tooltip: 'Vider les filtres', iconCls: 'vp-icone-vider'},
                '->',
                {itemId: 'btnListeImprimer', tooltip: 'Imprimer la liste filtrée', iconCls: 'printable', text: 'PDF'},
                {itemId: 'btnListeExcel', tooltip: 'Exporter la liste filtrée', iconCls: 'export_excel_icon',
                    text: 'Excel'},
                {itemId: 'btnListeInventaire', tooltip: 'Créer un inventaire : les produits cochés, ou toute la'
                            + ' liste filtrée si rien n\'est coché',
                    iconCls: 'icon-grid', text: 'Créer inventaire'},
                /* Compteur du cochage : sans lui, une selection faite sur des pages precedentes
                 * n'est visible nulle part au moment de creer l'inventaire. */
                {xtype: 'tbtext', itemId: 'compteurCoches', text: ''},
                {itemId: 'btnListeDecocher', tooltip: 'Décocher tous les produits', iconCls: 'vp-icone-vider',
                    text: 'Tout décocher', hidden: true}
            ],
            items: [{
                    xtype: 'grid',
                    itemId: 'grilleProduits',
                    store: storeProduits,
                    /* Cochage a la ligne : « checkOnly » evite qu'un simple clic dans la ligne
                     * remplace toute la selection - on ne coche et decoche qu'avec la case. */
                    selModel: Ext.create('Ext.selection.CheckboxModel', {
                        mode: 'MULTI', checkOnly: true, showHeaderCheckbox: true
                    }),
                    columns: [
                        /* « Identifiant PP / PD » ne parlait qu'au developpeur : ce sont des codes CIP,
                         * l'un de la boite (CH), l'autre du detail (DET). Quantites centrees. */
                        {header: 'Code CIP CH', dataIndex: 'cipPP', width: 120},
                        {header: 'Libellé CH', dataIndex: 'nomPP', flex: 2},
                        {header: 'Stock CH', dataIndex: 'stockPP', width: 80, align: 'center', renderer: entier},
                        {header: 'Contenance', dataIndex: 'contenance', width: 95, align: 'center',
                            renderer: function (v) {
                                return '<span style="color:#1c7c1c;font-weight:bold;">' + entier(v) + '</span>';
                            }},
                        {header: 'Code CIP Détail', dataIndex: 'cipPD', width: 120},
                        {header: 'Libellé Détail', dataIndex: 'nomPD', flex: 2,
                            renderer: function (v, meta, record) {
                                // zone vide : distinguer le detail jamais cree du detail desactive
                                if (!v && record.get('detailDesactive')) {
                                    return '<span style="color:#c0392b;font-weight:bold;">Détail désactivé</span>';
                                }
                                return Ext.String.htmlEncode(v || '');
                            }},
                        {header: 'Stock Détail', dataIndex: 'stockPD', width: 90, align: 'center', renderer: entier}
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
