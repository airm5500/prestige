/* global Ext, testextjs */

/**
 * Depots d'extension (evolution 5, point 1) : ce que chaque depot detient, consulte depuis l'officine.
 *
 * Le stock d'un depot d'extension est t_famille_stock pour l'emplacement du depot - la meme table que le stock de
 * l'officine, distinguee par son emplacement. Les donnees existaient donc deja ; ce qui manquait, c'est de pouvoir
 * les consulter depot par depot, avec la valorisation de ce que le depot detient, et de l'emporter en Excel ou en PDF.
 *
 * Cette vue est « Liste des articles » : le detail article par article. Sa jumelle, depotextensionemplacement,
 * montre la meme chose ventilee par rayon. Les CRITERES ne sont pas ici mais dans la barre partagee de l'ecran
 * (DepotExtensionManager) : les deux vues doivent regarder exactement le meme perimetre.
 *
 * La valorisation affichee en haut vient du serveur et porte sur TOUTES les lignes retenues : additionner la page
 * affichee donnerait un total faux des la deuxieme page.
 */
Ext.define('testextjs.view.stockmanagement.depotextension.DepotExtensionStock', {
    extend: 'Ext.grid.Panel',
    /* Onglet « Valorisation » de « Gestion depots extensions ». Il porte son propre xtype, et non celui de
     * l'ecran : les autres onglets ont eux aussi un selecteur de depot et une barre d'actions, et des selecteurs
     * qualifies par le seul xtype de l'ecran les rencontreraient tous. */
    xtype: 'depotextensionstock',

    title: 'Liste des articles',
    cls: 'custompanel',
    forceFit: true,
    columnLines: true,

    initComponent: function () {
        var me = this;

        me.store = Ext.create('Ext.data.Store', {
            fields: ['id', 'cip', 'nom', 'famille', 'emplacement',
                { name: 'stock', type: 'int' },
                { name: 'prixAchat', type: 'int' },
                { name: 'prixVente', type: 'int' },
                { name: 'valeurAchat', type: 'int' },
                { name: 'valeurVente', type: 'int' }],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/depot-extension/stock',
                reader: { type: 'json', root: 'data', totalProperty: 'total' },
                extraParams: { depotId: '', query: '', familleId: '', zoneGeoId: '', filtreStock: 'TOUS',
                    enStock: false },
                timeout: 180000
            }
        });

        Ext.apply(me, {
            /*
             * Couleurs demandees par l'officine : stock NEGATIF en rouge, stock A ZERO en violet.
             *
             * La classe est posee sur la LIGNE et non sur la seule cellule du stock : c'est l'article entier qui
             * est en anomalie, et on doit le reperer en parcourant la colonne des designations. Les couleurs sont
             * dans vente-theme.css, avec leur variante pour la ligne selectionnee - sans quoi la selection
             * bleue effacerait l'information au moment meme ou l'on clique sur la ligne qui intrigue.
             */
            viewConfig: {
                stripeRows: true,
                enableTextSelection: true,
                getRowClass: function (enregistrement) {
                    var stock = enregistrement.get('stock');
                    if (stock < 0) {
                        return 'depot-stock-negatif';
                    }
                    if (stock === 0) {
                        return 'depot-stock-zero';
                    }
                    return '';
                }
            },
            dockedItems: [{
                    xtype: 'pagingtoolbar',
                    dock: 'bottom',
                    store: me.store,
                    displayInfo: true,
                    items: ['-', {
                            xtype: 'component',
                            itemId: 'legende',
                            html: '<span class="depot-legende-negatif">stock négatif</span>'
                                    + ' <span class="depot-legende-zero">stock à zéro</span>'
                        }]
                }],

            columns: [
                { text: 'ID', dataIndex: 'id', hidden: true },
                { text: 'CIP', dataIndex: 'cip', flex: 0.8 },
                { text: 'Désignation', dataIndex: 'nom', flex: 2.6 },
                { text: 'Famille', dataIndex: 'famille', flex: 1.2 },
                { text: 'Emplacement', dataIndex: 'emplacement', flex: 1 },
                {
                    text: 'Stock dépôt', dataIndex: 'stock', flex: 0.7, align: 'right',
                    renderer: function (v) { return '<b>' + Ext.util.Format.number(v || 0, '0,000') + '</b>'; }
                },
                {
                    text: 'PA', dataIndex: 'prixAchat', flex: 0.6, align: 'right',
                    renderer: function (v) { return Ext.util.Format.number(v || 0, '0,000'); }
                },
                {
                    text: 'PV', dataIndex: 'prixVente', flex: 0.6, align: 'right',
                    renderer: function (v) { return Ext.util.Format.number(v || 0, '0,000'); }
                },
                {
                    text: 'Valeur achat', dataIndex: 'valeurAchat', flex: 0.9, align: 'right',
                    renderer: function (v) { return Ext.util.Format.number(v || 0, '0,000'); }
                },
                {
                    text: 'Valeur vente', dataIndex: 'valeurVente', flex: 0.9, align: 'right',
                    renderer: function (v) { return Ext.util.Format.number(v || 0, '0,000'); }
                }
            ]
        });

        me.callParent(arguments);
    }
});
