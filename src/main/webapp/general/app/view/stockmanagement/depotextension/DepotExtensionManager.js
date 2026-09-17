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
        'testextjs.view.stockmanagement.depotextension.DepotExtensionCa',
        /* L'onglet « Point de caisse » embarque l'ecran existant : il doit etre charge avant le rendu. */
        'testextjs.view.caisseManager.balance.PointCaisseView'
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

        /* Criteres partages par les deux vues : les stores vivent donc sur l'ecran, pas dans une grille. */
        me.familleStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/famillearticles',
                reader: { type: 'json', root: 'data', totalProperty: 'total' }
            }
        });

        /* Le meme service que le filtre famille, cote emplacements : les rayons de l'officine
         * (t_zone_geographique), avec l'entree « Tous » que le service ajoute lui-meme. */
        me.emplacementStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/rayons',
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
                    /*
                     * Ordre demande par l'officine (retour du 17/09) : « l'onglet Saisir vente depot en PREMIER
                     * onglet ». C'est le geste du quotidien ; la consultation vient apres.
                     *
                     * « Chaque onglet doit avoir sa couleur » : chacun porte une classe via tabConfig, et les
                     * couleurs sont dans vente-theme.css. Elles ne sont pas decoratives - sur un ecran ou l'on
                     * saisit de l'argent, la couleur dit d'un coup d'oeil dans quelle partie on se trouve.
                     *
                     * Chaque onglet est de plus sous SON privilege : le controleur retire ceux auxquels
                     * l'operateur n'a pas droit, et les services les refusent de leur cote.
                     */
                    items: [{
                            xtype: 'panel',
                            itemId: 'ongletVente',
                            title: 'Saisir vente dépôt',
                            layout: 'fit',
                            tabConfig: { cls: 'depot-onglet-vente' },
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
                            // Onglet 1 : valorisation. Deux vues de la meme chose, en disposition « card » :
                            // setActiveItem gere l'affichage sans toucher a des composants non rendus, ce qui
                            // eviterait l'erreur JavaScript classique de setVisible avant rendu.
                            xtype: 'panel',
                            itemId: 'ongletValorisation',
                            title: 'Valorisation',
                            layout: 'fit',
                            tabConfig: { cls: 'depot-onglet-valorisation' },
                            items: [{
                                    xtype: 'panel',
                                    itemId: 'vues',
                                    layout: 'card',
                                    activeItem: 0,
                                    /*
                                     * Les criteres sont ICI, au-dessus des deux vues, et non dans l'une d'elles.
                                     *
                                     * Retour du 17/09 : « la recherche sur valorisation simple joue sur l'option par
                                     * emplacement ». Tant que la barre de recherche vivait dans la grille des
                                     * articles, elle disparaissait avec elle : passer en vue par emplacement faisait
                                     * perdre de vue les criteres appliques, et rien ne permettait de les changer
                                     * sans revenir en arriere. Un seul jeu de criteres, au-dessus, et les deux vues
                                     * regardent forcement la meme chose.
                                     */
                                    dockedItems: [{
                                            xtype: 'toolbar',
                                            dock: 'top',
                                            itemId: 'barreCriteres',
                                            items: [{
                                                    xtype: 'textfield',
                                                    itemId: 'recherche',
                                                    flex: 1,
                                                    minWidth: 160,
                                                    emptyText: 'Rechercher (CIP ou désignation)...',
                                                    enableKeyEvents: true
                                                }, {
                                                    xtype: 'combobox',
                                                    itemId: 'famille',
                                                    fieldLabel: 'Famille',
                                                    labelWidth: 50,
                                                    width: 210,
                                                    store: me.familleStore,
                                                    valueField: 'id',
                                                    displayField: 'libelle',
                                                    queryMode: 'local',
                                                    editable: false,
                                                    emptyText: 'Toutes'
                                                }, {
                                                    // « comme le filtre famille », demande de l'officine : meme
                                                    // service de la maison (v1/common/rayons), meme presentation.
                                                    xtype: 'combobox',
                                                    itemId: 'emplacement',
                                                    fieldLabel: 'Emplacement',
                                                    labelWidth: 78,
                                                    width: 250,
                                                    store: me.emplacementStore,
                                                    valueField: 'id',
                                                    displayField: 'libelle',
                                                    queryMode: 'local',
                                                    editable: false,
                                                    emptyText: 'Tous',
                                                    tooltip: 'Rayon de l\'article (le dépôt, lui, est choisi en haut)'
                                                }, {
                                                    xtype: 'combobox',
                                                    itemId: 'filtreStock',
                                                    fieldLabel: 'Stock',
                                                    labelWidth: 42,
                                                    width: 170,
                                                    valueField: 'id',
                                                    displayField: 'libelle',
                                                    queryMode: 'local',
                                                    editable: false,
                                                    value: 'TOUS',
                                                    tooltip: 'Les trois choix autres que « tous » correspondent aux '
                                                            + 'trois couleurs de la liste : rouge pour un stock '
                                                            + 'négatif, violet pour un stock à zéro.',
                                                    store: Ext.create('Ext.data.Store', {
                                                        fields: ['id', 'libelle'],
                                                        data: [
                                                            { id: 'TOUS', libelle: 'Tous' },
                                                            { id: 'NEGATIF', libelle: 'Négatif' },
                                                            { id: 'ZERO', libelle: 'À zéro' },
                                                            { id: 'POSITIF', libelle: 'Positif' }
                                                        ]
                                                    })
                                                }, {
                                                    xtype: 'checkbox',
                                                    itemId: 'enStock',
                                                    // « détenus seulement » ne disait pas ce que fait la case, et
                                                    // cachait un cas : un stock NEGATIF passe aussi le filtre.
                                                    boxLabel: 'masquer les articles à 0',
                                                    // Decochee au depart (retour du 17/09) : l'officine veut voir
                                                    // la liste complete en arrivant, y compris les articles a zero,
                                                    // qui sont justement ceux qu'elle vient chercher en violet.
                                                    checked: false,
                                                    tooltip: 'Cochée : les articles dont le stock du dépôt est zéro '
                                                            + 'sont masqués. Un stock négatif reste visible, c\'est '
                                                            + 'une anomalie à voir. Sans effet quand un filtre de '
                                                            + 'stock est choisi : c\'est alors lui qui décide.'
                                                }, {
                                                    xtype: 'button',
                                                    itemId: 'rechercher',
                                                    text: 'Rechercher',
                                                    iconCls: 'icon-find'
                                                }]
                                        }, {
                                            xtype: 'toolbar',
                                            dock: 'top',
                                            itemId: 'barreVues',
                                            items: [{
                                                    xtype: 'button',
                                                    itemId: 'vueSimple',
                                                    text: 'Liste des articles',
                                                    toggleGroup: 'vueValorisation',
                                                    allowDepress: false,
                                                    pressed: true,
                                                    tooltip: 'Le détail article par article'
                                                }, {
                                                    xtype: 'button',
                                                    itemId: 'vueEmplacement',
                                                    text: 'Valorisation par emplacement',
                                                    toggleGroup: 'vueValorisation',
                                                    allowDepress: false,
                                                    tooltip: 'Répartition par rayon de l\'article'
                                                }, {
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
                                                    // Une seule commande d'impression pour les deux vues : elle
                                                    // edite CE QUI EST AFFICHE. « Par emplacement, on doit pouvoir
                                                    // imprimer » - c'est la meme, avec son propre modele.
                                                    xtype: 'button',
                                                    itemId: 'imprimer',
                                                    text: 'Imprimer',
                                                    iconCls: 'printable',
                                                    disabled: true
                                                }]
                                        }],
                                    items: [
                                        { xtype: 'depotextensionstock' },
                                        { xtype: 'depotextensionemplacement' }
                                    ]
                                }]
                        }, {
                            xtype: 'panel',
                            itemId: 'ongletCa',
                            title: 'Chiffre d\'affaires',
                            layout: 'fit',
                            tabConfig: { cls: 'depot-onglet-ca' },
                            items: [{ xtype: 'depotextensionca' }]
                        }, {
                            /*
                             * Onglet « Point de caisse » (retour du 17/09, point 5), demande « comme
                             * pointcaisseview afin qu'on ait un menu GESTION DEPOT EXTENSION complet ».
                             *
                             * L'ecran existant est EMBARQUE tel quel, et non recopie : son controleur le pilote
                             * par ses propres selecteurs, et l'onglet herite donc de son comportement sans qu'on
                             * ait a le maintenir en double. Ses composants portent des identifiants fixes, ce qui
                             * interdirait deux instances simultanees - mais le panneau central n'affiche qu'un
                             * ecran a la fois : ouvrir le menu « Point Caisse Depot » detruit celui-ci d'abord.
                             *
                             * Le controleur lui impose ensuite le depot choisi en haut de l'ecran, pour que
                             * l'onglet parle du meme depot que ses voisins.
                             */
                            xtype: 'panel',
                            itemId: 'ongletPointCaisse',
                            title: 'Point de caisse',
                            layout: 'fit',
                            tabConfig: { cls: 'depot-onglet-caisse' },
                            items: [{ xtype: 'pointcaisseview', width: undefined, autoScroll: true }]
                        }]
                }]
        });
        me.callParent(arguments);
    }
});
