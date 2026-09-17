/* global Ext */

/**
 * Valorisation du dépôt ventilée par EMPLACEMENT des articles.
 *
 * « Emplacement » désigne ici le rayon de l'article (t_zone_geographique) et non le dépôt : le dépôt, lui, est
 * déjà choisi en haut de l'écran. C'est le sens qu'a déjà « valorisation par EMPLACEMENT » dans l'édition de
 * valorisation de l'officine, et le vocabulaire de la maison est gardé tel quel.
 *
 * Les articles sans rayon renseigné sont regroupés sous « Sans emplacement » plutôt que d'être perdus : leur
 * valeur compte dans le total du dépôt, la somme des lignes doit donc faire ce total.
 *
 * Deux grandeurs distinctes par ligne, et l'officine a eu raison de demander à quoi servait la seconde :
 * RÉFÉRENCES compte les articles différents présents dans le rayon, UNITÉS additionne les quantités détenues.
 * Un rayon peut porter 40 références pour 900 unités ; aucun des deux chiffres ne se déduit de l'autre, et c'est
 * le second qui dit le volume à manipuler lors d'un inventaire.
 *
 * Les critères viennent de la barre partagée de l'écran : cette vue et la liste des articles regardent
 * exactement le même périmètre, une recherche faite dans l'une valant pour l'autre.
 */
Ext.define('testextjs.view.stockmanagement.depotextension.DepotExtensionEmplacement', {
    extend: 'Ext.grid.Panel',
    xtype: 'depotextensionemplacement',

    cls: 'custompanel',
    forceFit: true,
    columnLines: true,
    viewConfig: { stripeRows: true, enableTextSelection: true,
        emptyText: '<div style="padding:12px;color:#888;">Choisissez un dépôt.</div>', deferEmptyText: false },

    initComponent: function () {
        var me = this;
        var montant = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };

        me.store = Ext.create('Ext.data.Store', {
            fields: ['emplacement',
                { name: 'articles', type: 'int' },
                { name: 'unites', type: 'int' },
                { name: 'valeurAchat', type: 'int' },
                { name: 'valeurVente', type: 'int' }],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/depot-extension/valorisation-emplacement',
                reader: { type: 'json', root: 'data', totalProperty: 'total' },
                extraParams: { depotId: '', query: '', familleId: '', zoneGeoId: '', filtreStock: 'TOUS',
                    enStock: false },
                timeout: 180000
            }
        });

        Ext.apply(me, {
            store: me.store,
            columns: [
                { text: 'EMPLACEMENT', dataIndex: 'emplacement', flex: 2 },
                { text: 'RÉFÉRENCES', dataIndex: 'articles', width: 110, align: 'right',
                    tooltip: 'Nombre d\'articles différents présents dans ce rayon',
                    renderer: montant },
                { text: 'UNITÉS', dataIndex: 'unites', width: 110, align: 'right',
                    tooltip: 'Somme des quantités détenues dans ce rayon, toutes références confondues',
                    renderer: montant },
                { text: 'VALEUR D\'ACHAT', dataIndex: 'valeurAchat', flex: 1, align: 'right',
                    renderer: montant },
                { text: 'VALEUR DE VENTE', dataIndex: 'valeurVente', flex: 1, align: 'right',
                    renderer: montant }
            ],
            // Les totaux viennent du serveur et portent sur toutes les lignes : additionner ce qui est
            // affiche donnerait un total faux des qu'un filtre est pose.
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    itemId: 'barreTotaux',
                    items: [{
                            xtype: 'component',
                            itemId: 'totaux',
                            html: ''
                        }]
                }]
        });
        me.callParent(arguments);
    }
});
