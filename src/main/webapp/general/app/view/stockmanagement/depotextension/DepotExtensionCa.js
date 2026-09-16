/* global Ext */

/**
 * Onglet « Chiffre d'affaires » de « Gestion dépôts extensions ».
 *
 * Il lit la même ressource que l'écran « Balance Dépôt » (v1/balance/balancesalecashdepot), dont le périmètre a
 * été corrigé : le chiffre d'affaires d'un dépôt réunit les ventes saisies par un utilisateur rattaché au dépôt
 * ET celles jouées dans le dépôt depuis l'officine.
 *
 * Il porte son PROPRE xtype, et n'embarque pas l'écran « Balance Dépôt » : deux instances du même écran ouvertes
 * en même temps donneraient un écran piloté par son contrôleur et l'autre mort, les sélecteurs ne renvoyant que
 * le premier composant trouvé.
 *
 * Rappel utile à la lecture : l'argent de ces ventes est dans la caisse de l'opérateur de l'officine, pas dans
 * une caisse du dépôt. Le chiffre appartient au dépôt, l'encaissement à l'officine — c'est pourquoi le ticket Z
 * de l'opérateur porte une ligne « dont vente dépôt ».
 */
Ext.define('testextjs.view.stockmanagement.depotextension.DepotExtensionCa', {
    extend: 'Ext.panel.Panel',
    xtype: 'depotextensionca',

    cls: 'custompanel',
    layout: { type: 'vbox', align: 'stretch' },

    initComponent: function () {
        var me = this;
        var jour = new Date();
        var premier = Ext.Date.getFirstDateOfMonth(jour);

        Ext.apply(me, {
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    itemId: 'barreCa',
                    items: [{
                            xtype: 'datefield',
                            itemId: 'caDebut',
                            fieldLabel: 'Du',
                            labelWidth: 20,
                            width: 150,
                            format: 'd/m/Y',
                            value: premier
                        }, {
                            xtype: 'datefield',
                            itemId: 'caFin',
                            fieldLabel: 'au',
                            labelWidth: 20,
                            width: 150,
                            margin: '0 10 0 10',
                            format: 'd/m/Y',
                            value: jour
                        }, {
                            xtype: 'button',
                            itemId: 'caRechercher',
                            text: 'Rechercher',
                            iconCls: 'icon-find'
                        }, '->', {
                            xtype: 'component',
                            itemId: 'caTotaux',
                            html: ''
                        }]
                }],
            items: [{
                    xtype: 'gridpanel',
                    itemId: 'caGrille',
                    flex: 1,
                    forceFit: true,
                    columnLines: true,
                    viewConfig: { stripeRows: true,
                        emptyText: '<div style="padding:12px;color:#888;">Choisissez un dépôt et une période, '
                                + 'puis lancez la recherche.</div>', deferEmptyText: false },
                    store: Ext.create('Ext.data.Store', {
                        // Champs du BalanceDTO servi par v1/balance/balancesalecashdepot.
                        fields: ['typeVente', 'reglement',
                            { name: 'montantTTC', type: 'int' },
                            { name: 'montantNet', type: 'int' },
                            { name: 'montantRemise', type: 'int' },
                            { name: 'nbreVente', type: 'int' }],
                        autoLoad: false
                    }),
                    columns: [
                        { text: 'TYPE DE VENTE', dataIndex: 'typeVente', flex: 2 },
                        { text: 'RÈGLEMENT', dataIndex: 'reglement', flex: 1 },
                        { text: 'VENTES', dataIndex: 'nbreVente', width: 100, align: 'right' },
                        { text: 'MONTANT TTC', dataIndex: 'montantTTC', flex: 1, align: 'right',
                            renderer: function (v) { return Ext.util.Format.number(v || 0, '0,000'); } },
                        { text: 'REMISE', dataIndex: 'montantRemise', flex: 1, align: 'right',
                            renderer: function (v) { return Ext.util.Format.number(v || 0, '0,000'); } },
                        { text: 'MONTANT NET', dataIndex: 'montantNet', flex: 1, align: 'right',
                            renderer: function (v) { return Ext.util.Format.number(v || 0, '0,000'); } }
                    ]
                }, {
                    xtype: 'component',
                    itemId: 'caNote',
                    height: 30,
                    html: '<div style="padding:6px;color:#888;">L\'argent de ces ventes est encaissé dans la '
                            + 'caisse de l\'opérateur de l\'officine : le chiffre appartient au dépôt, '
                            + 'l\'encaissement à l\'officine.</div>'
                }]
        });
        me.callParent(arguments);
    }
});
