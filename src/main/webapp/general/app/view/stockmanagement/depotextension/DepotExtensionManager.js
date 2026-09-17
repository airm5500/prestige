/* global Ext */

/**
 * « Gestion dépôts extensions » (évolution 5, point 1).
 *
 * Un seul écran pour tout ce qui concerne un dépôt d'extension : on choisit le dépôt UNE FOIS, en haut, et les
 * onglets suivent.
 *
 *   1. Valorisation       — valeur d'achat et valeur de vente du dépôt, en vue simple (article par article)
 *                           ou ventilée par emplacement (le rayon de l'article).
 *   2. Saisir vente dépôt — la saisie de vente, comme si l'on était connecté dans le dépôt.
 *   3. Chiffre d'affaires — ce que le dépôt a vendu sur une période.
 *
 * L'onglet de vente est le SEUL endroit d'où l'on vend en dépôt : il n'y a plus de menu séparé. Deux instances
 * de cet écran ouvertes en même temps donneraient un écran piloté par son contrôleur et l'autre mort, les
 * sélecteurs ne renvoyant que le premier composant trouvé.
 *
 * La saisie de vente garde son propre sélecteur de dépôt : le dépôt y est redemandé à CHAQUE vente, choix de
 * l'officine, pour qu'on ne vende jamais dans un dépôt sans l'avoir voulu. Le choix fait en haut de l'écran l'y
 * prérenseigne, sans dispenser de le confirmer.
 */
Ext.define('testextjs.view.stockmanagement.depotextension.DepotExtensionManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'depotextension',
    requires: [
        'testextjs.view.stockmanagement.depotextension.DepotExtensionStock',
        'testextjs.view.stockmanagement.depotextension.DepotExtensionEmplacement',
        'testextjs.view.stockmanagement.depotextension.DepotExtensionCa'
    ],

    title: 'GESTION DÉPÔTS EXTENSIONS',
    frame: true,
    cls: 'custompanel',
    /* Pas de largeur en pourcentage : PrestigeAffichage.collerAuConteneur pose une taille explicite en
     * pixels, a l'ouverture et a chaque redimensionnement. Une largeur en pourcentage ne ferait que la
     * concurrencer, et c'est ce genre de concurrence qui laisse une bande de fond a droite. */
    layout: 'fit',

    initComponent: function () {
        var me = this;

        me.depotStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'nom', 'localite', 'telephone', 'responsable'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/depot-extension/depots',
                reader: { type: 'json', root: 'data', totalProperty: 'total' }
            }
        });

        Ext.apply(me, {
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    itemId: 'barreEcran',
                    items: [{
                            // Choisi une fois pour tout l'ecran. Les onglets Valorisation et Chiffre d'affaires
                            // le suivent ; la saisie de vente le redemande a chaque vente.
                            xtype: 'combobox',
                            itemId: 'depotEcran',
                            fieldLabel: 'Dépôt',
                            labelWidth: 45,
                            width: 420,
                            store: me.depotStore,
                            valueField: 'id',
                            displayField: 'nom',
                            queryMode: 'local',
                            editable: false,
                            allowBlank: false,
                            fieldStyle: 'font-weight:bold;',
                            emptyText: 'Choisir le dépôt...',
                            listConfig: {
                                getInnerTpl: function () {
                                    return '<tpl for="."><b>{nom}</b>'
                                            + '<tpl if="localite"> <span style="color:#666;">- {localite}</span></tpl>'
                                            + '</tpl>';
                                }
                            }
                        }, '->', {
                            xtype: 'component',
                            itemId: 'rappelDepot',
                            html: ''
                        }]
                }],
            items: [{
                    xtype: 'tabpanel',
                    itemId: 'onglets',
                    activeTab: 0,
                    items: [{
                            // Onglet 1 : valorisation. Deux vues de la meme chose, en disposition « card » :
                            // setActiveItem gere l'affichage sans toucher a des composants non rendus, ce qui
                            // eviterait l'erreur JavaScript classique de setVisible avant rendu.
                            xtype: 'panel',
                            itemId: 'ongletValorisation',
                            title: 'Valorisation',
                            layout: 'fit',
                            items: [{
                                    xtype: 'panel',
                                    itemId: 'vues',
                                    layout: 'card',
                                    activeItem: 0,
                                    dockedItems: [{
                                            xtype: 'toolbar',
                                            dock: 'top',
                                            itemId: 'barreVues',
                                            items: [{
                                                    xtype: 'button',
                                                    itemId: 'vueSimple',
                                                    text: 'Valorisation simple',
                                                    toggleGroup: 'vueValorisation',
                                                    allowDepress: false,
                                                    pressed: true
                                                }, {
                                                    xtype: 'button',
                                                    itemId: 'vueEmplacement',
                                                    text: 'Par emplacement',
                                                    toggleGroup: 'vueValorisation',
                                                    allowDepress: false,
                                                    tooltip: 'Répartition par rayon de l\'article'
                                                }]
                                        }],
                                    items: [
                                        { xtype: 'depotextensionstock' },
                                        { xtype: 'depotextensionemplacement' }
                                    ]
                                }]
                        }, {
                            xtype: 'panel',
                            itemId: 'ongletVente',
                            title: 'Saisir vente dépôt',
                            layout: 'fit',
                            // « data » est indispensable : l'ecran de vente lit me.getData().isEdit sans garde,
                            // et planterait si on l'embarquait sans. Le menu lui passe {} de la meme facon.
                            // La largeur et la hauteur mini heritees de l'ecran de vente (99% et 570 px)
                            // sont neutralisees : dans un onglet, c'est la disposition « fit » qui donne la
                            // taille, et une largeur en pourcentage la contredirait au moindre ascenseur.
                            // (Les 5 px de debordement mesures a l'interieur de la vente ne viennent PAS de
                            // la : c'est le cadre du panneau « frame: true », que l'ecran de vente de
                            // l'officine presente aussi, a l'identique, hors de tout onglet.)
                            items: [{ xtype: 'doventeendepot', data: {}, width: undefined, minHeight: undefined,
                                    autoScroll: true }]
                        }, {
                            xtype: 'panel',
                            itemId: 'ongletCa',
                            title: 'Chiffre d\'affaires',
                            layout: 'fit',
                            items: [{ xtype: 'depotextensionca' }]
                        }]
                }]
        });
        me.callParent(arguments);
    }
});
