/* global Ext, testextjs */

/**
 * Depots d'extension (evolution 5, point 1) : ce que chaque depot detient, consulte depuis l'officine.
 *
 * Le stock d'un depot d'extension est t_famille_stock pour l'emplacement du depot - la meme table que le stock de
 * l'officine, distinguee par son emplacement. Les donnees existaient donc deja ; ce qui manquait, c'est de pouvoir
 * les consulter depot par depot, avec la valorisation de ce que le depot detient, et de l'emporter en Excel ou en PDF.
 *
 * La valorisation affichee en haut vient du serveur et porte sur TOUTES les lignes retenues : additionner la page
 * affichee donnerait un total faux des la deuxieme page.
 */
Ext.define('testextjs.view.stockmanagement.depotextension.DepotExtensionManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'depotextension',

    title: 'GESTION DÉPÔTS EXTENSIONS',
    frame: true,
    cls: 'custompanel',
    width: '97%',
    minHeight: 570,
    forceFit: true,
    columnLines: true,
    viewConfig: { stripeRows: true, enableTextSelection: true },

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
                extraParams: { depotId: '', query: '', familleId: '', enStock: true },
                timeout: 180000
            }
        });

        me.depotStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'nom', 'localite', 'telephone', 'responsable'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/depot-extension/depots',
                reader: { type: 'json', root: 'data', totalProperty: 'total' }
            }
        });

        me.familleStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/famillearticles',
                reader: { type: 'json', root: 'data', totalProperty: 'total' }
            }
        });

        Ext.apply(me, {
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    itemId: 'barreDepot',
                    items: [{
                            xtype: 'combobox',
                            itemId: 'depot',
                            fieldLabel: 'Dépôt',
                            labelWidth: 45,
                            width: 330,
                            store: me.depotStore,
                            valueField: 'id',
                            displayField: 'nom',
                            queryMode: 'local',
                            editable: false,
                            forceSelection: true,
                            emptyText: 'Choisir un dépôt...'
                        }, {
                            xtype: 'textfield',
                            itemId: 'recherche',
                            flex: 1,
                            emptyText: 'Rechercher (CIP ou désignation)...',
                            enableKeyEvents: true
                        }, {
                            xtype: 'combobox',
                            itemId: 'famille',
                            fieldLabel: 'Famille',
                            labelWidth: 55,
                            width: 250,
                            store: me.familleStore,
                            valueField: 'id',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            emptyText: 'Toutes'
                        }, {
                            xtype: 'checkbox',
                            itemId: 'enStock',
                            // « détenus seulement » ne disait pas ce que fait la case, et cachait un cas : un
                            // stock NEGATIF passe aussi le filtre. Le libellé décrit maintenant exactement
                            // l'effet, et il est assez court pour la barre.
                            boxLabel: 'masquer les articles à 0',
                            checked: true,
                            // Un depot partage le referentiel articles de l'officine : sans ce filtre, la liste
                            // sortirait les milliers d'articles que le depot ne detient pas.
                            tooltip: 'Cochée : seuls les articles dont le stock du dépôt n\'est pas zéro. '
                                    + 'Un stock négatif reste visible, c\'est une anomalie à voir. '
                                    + 'Décochée : tout le catalogue de l\'officine, pour saisir un article que '
                                    + 'le dépôt ne détient pas encore.'
                        }, {
                            xtype: 'button',
                            itemId: 'rechercher',
                            text: 'Rechercher',
                            iconCls: 'icon-find'
                        }]
                }, {
                    xtype: 'toolbar',
                    dock: 'top',
                    itemId: 'barreActions',
                    items: [{
                            xtype: 'component',
                            itemId: 'valorisation',
                            flex: 1,
                            cls: 'depot-valorisation',
                            html: 'Choisissez un dépôt pour voir ce qu\'il détient.'
                        }, {
                            xtype: 'button',
                            itemId: 'exporterExcel',
                            text: 'Exporter Excel',
                            iconCls: 'icon-excel',
                            disabled: true
                        }, {
                            xtype: 'button',
                            itemId: 'imprimer',
                            text: 'Imprimer',
                            iconCls: 'printable',
                            disabled: true
                        }]
                }, {
                    xtype: 'pagingtoolbar',
                    dock: 'bottom',
                    store: me.store,
                    displayInfo: true
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
