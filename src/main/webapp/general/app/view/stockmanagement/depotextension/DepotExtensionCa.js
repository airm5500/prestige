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
 *
 * Retour du 17/09 : la période part des dates DU JOUR, les colonnes sont celles demandées par l'officine (avec
 * la marge, les espèces et le tiers payant, et une ligne TOTAL), et le tout s'imprime. La colonne « règlement »
 * a disparu : l'officine a demandé à quoi elle servait, et la réponse est qu'elle ne servait à rien — le service
 * ne la renseigne jamais pour ces lignes, elle était systématiquement vide.
 */
Ext.define('testextjs.view.stockmanagement.depotextension.DepotExtensionCa', {
    extend: 'Ext.panel.Panel',
    xtype: 'depotextensionca',

    cls: 'custompanel',
    layout: { type: 'vbox', align: 'stretch' },

    initComponent: function () {
        var me = this;
        // Dates du JOUR au départ (retour du 17/09) : c'est la question posée dix fois par jour ; le mois
        // entier, quand on le veut, se demande en deux clics.
        var jour = new Date();
        var montant = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        var sommeMontant = function (valeur) {
            return '<b>' + Ext.util.Format.number(valeur || 0, '0,000') + '</b>';
        };

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
                            value: jour
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
                        }, {
                            // Edition servie en flux dans l'onglet ouvert par le clic, comme toutes les
                            // editions de cet ecran : aucune fenetre intermediaire.
                            xtype: 'button',
                            itemId: 'caImprimer',
                            text: 'Imprimer',
                            iconCls: 'printable',
                            margin: '0 0 0 10',
                            disabled: true
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
                    // La ligne TOTAL est calculee par la grille sur les lignes chargees. Elle est juste ici
                    // sans reserve : la balance ne rend qu'une ligne par type de vente, il n'y a pas de
                    // pagination sous laquelle une ligne pourrait se cacher.
                    features: [{ ftype: 'summary' }],
                    store: Ext.create('Ext.data.Store', {
                        // Champs du BalanceDTO servi par v1/balance/balancesalecashdepot. « reglement » n'est
                        // pas lu : le service ne le renseigne jamais pour ces lignes.
                        fields: ['typeVente',
                            { name: 'montantTTC', type: 'int' },
                            { name: 'montantNet', type: 'int' },
                            { name: 'marge', type: 'int' },
                            { name: 'nbreVente', type: 'int' },
                            { name: 'montantEsp', type: 'int' },
                            { name: 'montantTp', type: 'int' }],
                        autoLoad: false
                    }),
                    /* Colonnes et ordre demandes par l'officine. */
                    columns: [
                        { text: 'TYPE DE VENTE', dataIndex: 'typeVente', flex: 1.6,
                            summaryRenderer: function () { return '<b>TOTAL</b>'; } },
                        { text: 'MONTANT TTC', dataIndex: 'montantTTC', flex: 1, align: 'right',
                            renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant },
                        { text: 'MONTANT NET', dataIndex: 'montantNet', flex: 1, align: 'right',
                            renderer: function (v) { return '<b>' + montant(v) + '</b>'; },
                            summaryType: 'sum', summaryRenderer: sommeMontant },
                        { text: 'MARGE', dataIndex: 'marge', flex: 1, align: 'right',
                            renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant },
                        { text: 'NBRE VENTES', dataIndex: 'nbreVente', width: 110, align: 'right',
                            summaryType: 'sum', summaryRenderer: sommeMontant },
                        { text: 'MONTANT ESPÈCES', dataIndex: 'montantEsp', flex: 1, align: 'right',
                            renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant },
                        { text: 'MONTANT TIERS PAYANT', dataIndex: 'montantTp', flex: 1.1, align: 'right',
                            renderer: montant, summaryType: 'sum', summaryRenderer: sommeMontant }
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
