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
                { name: 'quantite', type: 'int' },
                { name: 'valeurAchat', type: 'int' },
                { name: 'valeurVente', type: 'int' }],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/depot-extension/valorisation-emplacement',
                reader: { type: 'json', root: 'data', totalProperty: 'total' },
                extraParams: { depotId: '', query: '', familleId: '', enStock: true },
                timeout: 180000
            }
        });

        Ext.apply(me, {
            store: me.store,
            columns: [
                { text: 'EMPLACEMENT', dataIndex: 'emplacement', flex: 2 },
                { text: 'ARTICLES', dataIndex: 'articles', width: 100, align: 'right',
                    renderer: montant },
                { text: 'QUANTITÉ', dataIndex: 'quantite', width: 110, align: 'right',
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
