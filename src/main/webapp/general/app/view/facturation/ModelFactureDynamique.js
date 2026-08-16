/* global Ext */

// Createur de modeles de facture : l'utilisateur choisit les colonnes a afficher,
// leurs libelles, leur ordre et le tri, puis rattache des tiers payants au modele.
// Les tiers payants rattaches sont factures par le nouveau moteur PDF ; les autres
// gardent les modeles Jasper historiques.
var url_rest_model_facture_dynamique = '../api/v1/model-facture-dynamique/';

Ext.define('testextjs.view.facturation.ModelFactureDynamique', {
    extend: 'Ext.panel.Panel',
    xtype: 'modelfacturedynamique',
    requires: [
        'Ext.ux.CheckColumn',
        'testextjs.store.Statistics.TiersPayans'
    ],
    frame: true,
    title: 'Cr&eacute;ateur de mod&egrave;les de facture',
    // Ext JS 4.2 : « autoScroll », et non « scrollable » qui n'existe qu'a partir d'Ext JS 5.
    autoScroll: true,
    width: '90%',
    minHeight: 500,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'id', type: 'int'},
                {name: 'nom', type: 'string'},
                {name: 'description', type: 'string'},
                {name: 'modeTri', type: 'string'},
                {name: 'afficherEntete', type: 'boolean'},
                {name: 'afficherPiedPage', type: 'boolean'},
                {name: 'detaillerProduits', type: 'boolean'},
                {name: 'taillePolice', type: 'int'},
                {name: 'nbBonsParPage', type: 'int', defaultValue: 0},
                {name: 'colonnesProduit'},
                {name: 'nbColonnes', type: 'int'},
                {name: 'nbTiersPayants', type: 'int'},
                {name: 'colonnes'}
            ],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_rest_model_facture_dynamique + 'list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        me.modelStore = store;

        Ext.applyIf(me, {
            items: [{
                    xtype: 'gridpanel',
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true
                    },
                    tbar: [{
                            text: 'Cr&eacute;er un mod&egrave;le',
                            iconCls: 'addicon',
                            scope: me,
                            handler: function () {
                                me.openModelWindow(null);
                            }
                        }],
                    columns: [
                        {
                            header: 'Nom du mod&egrave;le',
                            dataIndex: 'nom',
                            flex: 1.5
                        },
                        {
                            header: 'Description',
                            dataIndex: 'description',
                            flex: 2
                        },
                        {
                            header: 'Tri',
                            dataIndex: 'modeTri',
                            flex: 1.2,
                            renderer: function (v) {
                                if (v === 'ALPHABETIQUE') {
                                    return 'Alphab&eacute;tique (nom client)';
                                }
                                if (v === 'DATE_BON') {
                                    return 'Date du bon / op&eacute;ration';
                                }
                                return 'Selon la fiche du tiers payant';
                            }
                        },
                        {
                            header: 'Colonnes',
                            dataIndex: 'nbColonnes',
                            flex: 0.6,
                            align: 'center'
                        },
                        {
                            header: 'Tiers payants rattach&eacute;s',
                            dataIndex: 'nbTiersPayants',
                            flex: 0.8,
                            align: 'center'
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/page_white_edit.png',
                                    tooltip: 'Modifier le mod&egrave;le',
                                    handler: function (grid, rowIndex) {
                                        me.openModelWindow(grid.getStore().getAt(rowIndex));
                                    }
                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    iconCls: 'detailclients',
                                    tooltip: 'Tiers payants rattach&eacute;s au mod&egrave;le',
                                    handler: function (grid, rowIndex) {
                                        me.openAssignWindow(grid.getStore().getAt(rowIndex));
                                    }
                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/page_copy.png',
                                    tooltip: 'Exporter la mise en page au format .jrxml',
                                    handler: function (grid, rowIndex) {
                                        me.onExportJrxml(grid.getStore().getAt(rowIndex));
                                    }
                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Supprimer le mod&egrave;le',
                                    handler: function (grid, rowIndex) {
                                        me.onDeleteModel(grid.getStore().getAt(rowIndex));
                                    }
                                }]
                        }
                    ]
                }]
        });
        this.callParent();
    },

    // Telechargement du fichier de mise en page Jasper : le navigateur enregistre le .jrxml,
    // modifiable ensuite dans Jaspersoft Studio puis deposable dans le dossier des etats du serveur.
    onExportJrxml: function (rec) {
        window.open(url_rest_model_facture_dynamique + 'jrxml/' + rec.get('id'));
    },

    onDeleteModel: function (rec) {
        var me = this;
        Ext.MessageBox.confirm('Message',
                'Supprimer le mod&egrave;le <b>' + rec.get('nom') + '</b> ?<br/>'
                + 'Les tiers payants rattach&eacute;s reviendront aux mod&egrave;les de facture classiques.',
                function (btn) {
                    if (btn === 'yes') {
                        Ext.Ajax.request({
                            url: url_rest_model_facture_dynamique + 'delete',
                            method: 'POST',
                            params: {id: rec.get('id')},
                            success: function (response) {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === "0") {
                                    Ext.MessageBox.alert('Message d\'erreur', object.errors);
                                    return;
                                }
                                me.modelStore.reload();
                            },
                            failure: function (response) {
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                });
    },

    // ============================ Fenetre creation / modification =============================
    openModelWindow: function (rec) {
        var me = this;
        var colonnesStore = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'champ', type: 'string'},
                {name: 'libelleDefaut', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'inclure', type: 'boolean'},
                {name: 'ordre', type: 'int'}
            ],
            proxy: {type: 'memory'}
        });
        // second selecteur : colonnes des produits d'un bon (visible seulement si le detail est actif)
        var produitsStore = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'champ', type: 'string'},
                {name: 'libelleDefaut', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'inclure', type: 'boolean'},
                {name: 'ordre', type: 'int'}
            ],
            proxy: {type: 'memory'}
        });

        // Hauteur d'une grille de selection pour qu'elle montre TOUTES ses lignes sans ascenseur.
        // Les colonnes proposees sont connues et peu nombreuses : il n'y a aucune raison de les
        // couper. Les hauteurs fixes d'avant (380 et 200) laissaient les dernieres lignes hors
        // de vue, et il fallait agrandir la fenetre a la main pour les atteindre.
        var HAUTEUR_LIGNE_GRILLE = 22;
        var HAUTEUR_ENTETES_GRILLE = 58;
        var hauteurGrille = function (nombreDeLignes) {
            return HAUTEUR_ENTETES_GRILLE + Math.max(nombreDeLignes, 1) * HAUTEUR_LIGNE_GRILLE;
        };

        /*
         * Hauteur dont une grille a REELLEMENT besoin pour montrer toutes ses lignes.
         *
         * On mesure le contenu deja affiche plutot que de le calculer : la hauteur d'une ligne
         * depend du theme et de la police du poste, et une estimation trop courte laisse les
         * dernieres lignes sous le bord de la grille - c'est ce qui se passait. Tant que rien
         * n'est peint (la grille des produits quand elle est masquee), on retombe sur l'estimation.
         */
        /*
         * Hauteur du contenu d'une colonne : le bas de son dernier element visible, mesure
         * depuis son propre haut.
         *
         * On ne peut pas prendre la hauteur de la colonne elle-meme : elle est etiree sur toute
         * la hauteur de la fenetre, et la fenetre ne saurait alors plus jamais se resserrer.
         */
        var hauteurContenu = function (conteneur) {
            var element = conteneur ? conteneur.getEl() : null;
            if (!element || !element.dom) {
                return 0;
            }
            var haut = element.getRegion().top - element.dom.scrollTop;
            var bas = haut;
            conteneur.items.each(function (enfant) {
                if (enfant.isHidden() || !enfant.getEl()) {
                    return;
                }
                bas = Math.max(bas, enfant.getEl().getRegion().bottom);
            });
            // Un peu d'air sous le dernier element.
            return bas - haut + 8;
        };

        var hauteurNecessaire = function (grille, nombreDeLignes) {
            var vue = grille ? grille.getView() : null;
            var element = vue ? vue.getEl() : null;
            if (!element || !element.dom || !element.dom.scrollHeight) {
                return hauteurGrille(nombreDeLignes);
            }
            // Ce que la grille occupe en plus de ses lignes : sa barre de titre et l'entete
            // de ses colonnes.
            var habillage = grille.getHeight() - element.getHeight();
            return habillage + element.dom.scrollHeight + 2;
        };

        /*
         * Ajuste la fenetre a ce qu'elle doit montrer, sans jamais depasser l'ecran.
         *
         * La fenetre est en DEUX colonnes : a gauche les reglages du modele et les colonnes des
         * PRODUITS, a droite les colonnes du BON. Chaque colonne se lit donc sur sa propre
         * hauteur, et c'est la plus haute des deux qui commande la hauteur de la fenetre. En une
         * seule colonne, tout s'empilait et les dernieres lignes des colonnes du bon tombaient
         * sous le bord de l'ecran : il fallait agrandir la fenetre a la main pour les atteindre.
         */
        var ajusterHauteurs = function (fenetre) {
            if (!fenetre || fenetre.isDestroyed) {
                return;
            }
            var grilleBon = fenetre.down('#mfdColonnes');
            var grilleProduit = fenetre.down('#mfdColonnesProduit');
            if (!grilleBon) {
                return;
            }
            var hauteurBon = hauteurNecessaire(grilleBon, colonnesStore.getCount());
            var hauteurProduit = hauteurNecessaire(grilleProduit, produitsStore.getCount());
            // Les deux grilles prennent leur taille en une seule mise en page, sinon la colonne
            // de gauche serait mesuree avant que la grille des produits ait la sienne.
            Ext.suspendLayouts();
            grilleBon.setHeight(hauteurBon);
            if (grilleProduit) {
                grilleProduit.setHeight(hauteurProduit);
            }
            Ext.resumeLayouts(true);
            var visibleProduit = grilleProduit && !grilleProduit.isHidden();
            // Colonne de gauche : nom, description, tri, presentation, police, bons par page,
            // detail des ventes, puis les colonnes des produits quand elles sont demandees.
            // On la MESURE plutot que de l'estimer : une phrase d'aide de plus, et une valeur
            // ecrite en dur laisserait le bas de la colonne sous le bord de la fenetre.
            var HAUTEUR_REGLAGES = 340;
            var colonneGauche = fenetre.down('#mfdReglages');
            var mesureGauche = hauteurContenu(colonneGauche);
            var hauteurGauche = mesureGauche > 0 ? mesureGauche
                    : HAUTEUR_REGLAGES + (visibleProduit ? hauteurProduit + 10 : 0);
            // Colonne de droite : le titre du bloc puis la grille des colonnes du bon.
            var necessaire = Math.max(hauteurGauche, hauteurBon);

            /*
             * La fenetre grandit exactement de ce qui manque.
             *
             * Les deux colonnes sont etirees sur toute la hauteur du formulaire : la hauteur
             * QU'ELLES ONT est donc, au pixel pres, la place dont on dispose. On compare cette
             * place a celle qu'il faudrait, et on ajoute la difference a la fenetre. Aucune
             * valeur ecrite en dur pour la barre de titre, les marges ou la barre de boutons :
             * elles dependent du theme, et une estimation trop courte laissait la derniere
             * ligne des colonnes du bon coupee par le bord.
             */
            var disponible = colonneGauche ? colonneGauche.getHeight() : 0;
            if (disponible <= 0) {
                return;
            }
            // Un peu d'air sous la derniere ligne : collee au bord, elle a l'air coupee.
            var AIR_EN_BAS = 6;
            var souhaitee = fenetre.getHeight() + (necessaire + AIR_EN_BAS - disponible);
            fenetre.setHeight(Math.min(souhaitee, Ext.Element.getViewportHeight() - 20));
            fenetre.center();
        };

        // Construit les lignes d'un selecteur : colonnes disponibles renvoyees par le serveur,
        // pre-cochees et ordonnees selon le modele en cours de modification.
        var construireLignes = function (disponibles, choisiesDuModele) {
            var existantes = {};
            Ext.each(choisiesDuModele || [], function (c) {
                existantes[c.champ] = c;
            });
            var rows = [];
            var prochainOrdre = 100;
            Ext.each(disponibles || [], function (c) {
                var choisie = existantes[c.champ];
                rows.push({
                    champ: c.champ,
                    libelleDefaut: c.libelle,
                    libelle: choisie ? choisie.libelle : c.libelle,
                    inclure: !!choisie,
                    ordre: choisie ? choisie.ordre : prochainOrdre++
                });
            });
            rows.sort(function (a, b) {
                return a.ordre - b.ordre;
            });
            return rows;
        };

        // colonnes disponibles depuis le serveur, puis pre-cochage avec celles du modele edite
        Ext.Ajax.request({
            url: url_rest_model_facture_dynamique + 'colonnes',
            method: 'GET',
            success: function (response) {
                var object = Ext.JSON.decode(response.responseText, false);
                colonnesStore.loadData(construireLignes(object.data, rec ? rec.get('colonnes') : null));
                produitsStore.loadData(construireLignes(object.produit, rec ? rec.get('colonnesProduit') : null));
                ajusterHauteurs(win);
            }
        });

        // Fabrique d'un selecteur de colonnes : cases a cocher, libelle modifiable,
        // position calculee et reordonnancement au glisser-deposer.
        var selecteurColonnes = function (config) {
            var magasin = config.store;
            return {
                xtype: 'gridpanel',
                title: config.titre,
                itemId: config.itemId,
                height: config.height,
                hidden: config.hidden === true,
                margin: config.margin || '10 0 0 0',
                anchor: '100%',
                store: magasin,
                plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1})],
                viewConfig: {
                    plugins: {
                        ptype: 'gridviewdragdrop',
                        dragText: 'D&eacute;placer pour changer la position sur la facture'
                    },
                    listeners: {
                        drop: function () {
                            magasin.each(function (r, index) {
                                r.set('ordre', index);
                            });
                            magasin.commitChanges();
                            this.refresh();
                        }
                    }
                },
                columns: [
                    {
                        xtype: 'checkcolumn',
                        header: 'Afficher',
                        dataIndex: 'inclure',
                        width: 80,
                        listeners: {
                            // La colonne « Position » se recalcule pour TOUTES les lignes des qu'on
                            // en coche une : il faut donc repeindre la grille. Repeindre la ramene
                            // en haut de liste, et la ligne qu'on vient de cocher semble sauter.
                            // On remet donc l'ascenseur ou il etait.
                            checkchange: function (col) {
                                var vue = col.up('gridpanel').getView();
                                var element = vue.getEl();
                                var position = element ? element.getScroll().top : 0;
                                vue.refresh();
                                if (element) {
                                    element.scrollTo('top', position);
                                }
                            }
                        }
                    },
                    {
                        header: 'Information',
                        dataIndex: 'libelleDefaut',
                        flex: 1.2
                    },
                    {
                        header: 'Libell&eacute; sur la facture',
                        dataIndex: 'libelle',
                        flex: 1.2,
                        editor: {xtype: 'textfield', allowBlank: false}
                    },
                    {
                        header: 'Position',
                        dataIndex: 'ordre',
                        width: 80,
                        align: 'center',
                        sortable: false,
                        menuDisabled: true,
                        renderer: function (value, meta, record, rowIndex) {
                            if (!record.get('inclure')) {
                                return '';
                            }
                            var rang = 0;
                            magasin.each(function (r, i) {
                                if (i <= rowIndex && r.get('inclure')) {
                                    rang++;
                                }
                            });
                            return rang;
                        }
                    }
                ]
            };
        };

        // colonnes cochees d'un selecteur, dans l'ordre des lignes de la grille
        var colonnesChoisies = function (magasin) {
            var choisies = [];
            magasin.each(function (r) {
                if (r.get('inclure')) {
                    choisies.push({
                        champ: r.get('champ'),
                        libelle: r.get('libelle') || r.get('libelleDefaut'),
                        ordre: choisies.length
                    });
                }
            });
            return choisies;
        };
        var win = Ext.create('Ext.window.Window', {
            autoShow: true,
            modal: true,
            title: rec ? 'Modifier le mod&egrave;le [' + rec.get('nom') + ']' : 'Cr&eacute;er un mod&egrave;le de facture',
            /*
             * Fenetre large et en DEUX colonnes. Les colonnes du bon sont nombreuses : empilees
             * sous les reglages, leurs dernieres lignes tombaient sous le bord de l'ecran et
             * l'ascenseur du formulaire ne suffisait pas a les atteindre. Cote a cote, chaque
             * bloc se lit en entier sans rien faire defiler.
             */
            width: Math.max(1000, Math.min(1320, Ext.Element.getViewportWidth() - 40)),
            height: 660,
            maximizable: true,
            layout: 'fit',
            items: [{
                    xtype: 'form',
                    bodyPadding: 10,
                    layout: {type: 'hbox', align: 'stretch'},
                    items: [{
                        // Colonne de gauche : ce qui decrit le modele, puis le detail des ventes.
                        xtype: 'container',
                        itemId: 'mfdReglages',
                        flex: 1,
                        layout: 'anchor',
                        // Ext JS 4.2 : c'est « autoScroll » qui pose un ascenseur, pas
                        // « scrollable » (Ext JS 5). Avec « scrollable », le contenu qui
                        // depassait etait simplement coupe, sans aucun moyen de l'atteindre.
                        autoScroll: true,
                        defaults: {labelWidth: 105},
                        items: [
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Nom du mod&egrave;le',
                            itemId: 'mfdNom',
                            allowBlank: false,
                            anchor: '100%',
                            value: rec ? rec.get('nom') : ''
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Description',
                            itemId: 'mfdDescription',
                            anchor: '100%',
                            value: rec ? rec.get('description') : ''
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Tri des lignes',
                            itemId: 'mfdModeTri',
                            anchor: '100%',
                            store: Ext.create('Ext.data.ArrayStore', {
                                data: [
                                    ['TIERS_PAYANT', 'Selon la fiche du tiers payant'],
                                    ['ALPHABETIQUE', 'Alphab&eacute;tique (nom du client)'],
                                    ['DATE_BON', 'Date du bon / op&eacute;ration']
                                ],
                                fields: [{name: 'value', type: 'string'}, {name: 'libelle', type: 'string'}]
                            }),
                            valueField: 'value',
                            displayField: 'libelle',
                            editable: false,
                            queryMode: 'local',
                            value: rec ? rec.get('modeTri') : 'TIERS_PAYANT'
                        },
                        // Les deux interrupteurs de presentation, l'un sous l'autre : cote a cote
                        // dans une colonne deux fois moins large, le second perdait son libelle.
                        {
                            xtype: 'checkbox',
                            itemId: 'mfdEntete',
                            fieldLabel: 'Pr&eacute;sentation',
                            boxLabel: 'Afficher l\'en-t&ecirc;te (officine, tiers payant, n&deg; de facture)',
                            anchor: '100%',
                            // modele existant : on reprend son reglage ; nouveau modele : en-tete affiche
                            checked: rec ? rec.get('afficherEntete') !== false : true
                        },
                        {
                            xtype: 'checkbox',
                            itemId: 'mfdPiedPage',
                            // Libelle vide mais place reservee : l'interrupteur reste aligne
                            // sous le precedent au lieu de revenir contre le bord gauche.
                            fieldLabel: '',
                            hideEmptyLabel: false,
                            boxLabel: 'Afficher le pied de page (num&eacute;ro de page)',
                            anchor: '100%',
                            checked: rec ? rec.get('afficherPiedPage') !== false : true
                        },
                        {
                            xtype: 'numberfield',
                            itemId: 'mfdTaillePolice',
                            fieldLabel: 'Taille de police',
                            // 7 points pour un nouveau modele. Un modele deja cree garde SA
                            // taille : les modeles d'avant cette option valent 8, ils restent a 8.
                            value: (rec && rec.get('taillePolice')) ? rec.get('taillePolice') : 7,
                            minValue: 5,
                            maxValue: 12,
                            step: 1,
                            allowDecimals: false,
                            width: 260
                        },
                        {
                            xtype: 'component',
                            margin: '0 0 6 105',
                            html: '<div style="color:#888;font-size:11px">'
                                    + 'Descendez la taille si les noms passent &agrave; la ligne ; '
                                    + 'montez-la si la facture a peu de colonnes. Les lignes de produit '
                                    + 'restent d\'un point plus petites.</div>'
                        },
                        {
                            xtype: 'numberfield',
                            itemId: 'mfdBonsParPage',
                            fieldLabel: 'Bons par page',
                            emptyText: 'Automatique',
                            // 20 bons par page par defaut. Vider le champ revient a « automatique » :
                            // la page se remplit alors d'elle-meme, comme avant cette option.
                            value: (rec && rec.get('nbBonsParPage') > 0) ? rec.get('nbBonsParPage') : 20,
                            allowBlank: true,
                            minValue: 5,
                            maxValue: 500,
                            step: 5,
                            allowDecimals: false,
                            width: 260
                        },
                        {
                            xtype: 'component',
                            margin: '0 0 6 105',
                            html: '<div style="color:#888;font-size:11px">'
                                    + 'Laissez vide pour garder la pr&eacute;sentation actuelle. '
                                    + 'La fiche d\'un tiers payant peut encore remplacer ce nombre '
                                    + 'pour ses propres factures.</div>'
                        },
                        {
                            xtype: 'checkbox',
                            itemId: 'mfdDetailProduits',
                            fieldLabel: 'D&eacute;tail des ventes',
                            boxLabel: 'D&eacute;tailler les produits de chaque bon (les lignes de vente '
                                    + 's\'affichent sous la ligne du bon)',
                            anchor: '100%',
                            checked: rec ? rec.get('detaillerProduits') === true : false,
                            listeners: {
                                change: function (cmp, valeur) {
                                    var fenetre = cmp.up('window');
                                    fenetre.down('#mfdColonnesProduit').setVisible(valeur);
                                    ajusterHauteurs(fenetre);
                                }
                            }
                        },
                        selecteurColonnes({
                            titre: 'Colonnes des PRODUITS affich&eacute;s sous chaque bon',
                            itemId: 'mfdColonnesProduit',
                            store: produitsStore,
                            // recalculee des que les colonnes disponibles sont arrivees
                            height: 200,
                            hidden: !(rec && rec.get('detaillerProduits'))
                        })
                        ]
                    }, {
                        // Gouttiere entre les deux colonnes.
                        xtype: 'container', width: 14
                    }, {
                        // Colonne de droite : les colonnes du bon, en entier et sans ascenseur.
                        xtype: 'container',
                        flex: 1,
                        layout: 'anchor',
                        autoScroll: true,
                        items: [
                        selecteurColonnes({
                            titre: 'Colonnes du BON : cochez, renommez, GLISSEZ pour changer l\'ordre',
                            itemId: 'mfdColonnes',
                            store: colonnesStore,
                            // recalculee des que les colonnes disponibles sont arrivees
                            height: 380,
                            margin: '0 0 0 0'
                        })
                        ]
                    }]
                }],
            buttons: [
                {
                    text: 'Enregistrer',
                    handler: function (btn) {
                        var formulaire = btn.up('window').down('form');
                        if (!formulaire.isValid()) {
                            return;
                        }
                        // l'ordre envoye au serveur est celui des lignes des grilles (glisser-deposer)
                        var colonnes = colonnesChoisies(colonnesStore);
                        if (colonnes.length === 0) {
                            Ext.MessageBox.alert('Avertissement',
                                    'Choisissez au moins une colonne du bon &agrave; afficher sur la facture');
                            return;
                        }
                        var detailProduits = formulaire.down('#mfdDetailProduits').getValue();
                        var colonnesProduit = colonnesChoisies(produitsStore);
                        if (detailProduits && colonnesProduit.length === 0) {
                            Ext.MessageBox.alert('Avertissement',
                                    'Le d&eacute;tail des produits est activ&eacute; : choisissez au moins une '
                                    + 'colonne de produit &agrave; afficher');
                            return;
                        }
                        Ext.Ajax.request({
                            url: url_rest_model_facture_dynamique + 'save',
                            method: 'POST',
                            params: {
                                id: rec ? rec.get('id') : '',
                                nom: formulaire.down('#mfdNom').getValue(),
                                description: formulaire.down('#mfdDescription').getValue(),
                                modeTri: formulaire.down('#mfdModeTri').getValue(),
                                afficherEntete: formulaire.down('#mfdEntete').getValue(),
                                afficherPiedPage: formulaire.down('#mfdPiedPage').getValue(),
                                detaillerProduits: detailProduits,
                                taillePolice: formulaire.down('#mfdTaillePolice').getValue(),
                                nbBonsParPage: formulaire.down('#mfdBonsParPage').getValue() || 0,
                                colonnes: Ext.encode(colonnes),
                                colonnesProduit: Ext.encode(colonnesProduit)
                            },
                            success: function (response) {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === "0") {
                                    Ext.MessageBox.alert('Message d\'erreur', object.errors);
                                    return;
                                }
                                win.close();
                                me.modelStore.reload();
                            },
                            failure: function (response) {
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                },
                {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }
            ]
        });
    },

    // ============================ Fenetre d'affectation des tiers payants ====================
    // Trois zones :
    //   - a GAUCHE la recherche, paginee (une recherche large depassait les 25 lignes affichees
    //     par defaut et le reste etait perdu) ;
    //   - a DROITE le panier des tiers payants coches. Le panier vit EN DEHORS du magasin de
    //     recherche : on peut donc enchainer plusieurs recherches sans perdre les coches deja
    //     faites, ce que l'ancien ecran ne permettait pas (chaque recherche remplacait les lignes,
    //     donc les coches) ;
    //   - en BAS les tiers payants deja rattaches au modele.
    openAssignWindow: function (rec) {
        var me = this;
        var modelId = rec.get('id');
        var derniereRecherche = '';
        // groupe de tiers payants retenu : 0 = tous les groupes
        var derniereGroupe = 0;
        // 100 lignes par page (25 auparavant) : sur une recherche large, on voit quatre fois
        // plus de tiers payants sans changer de page.
        var LIGNES_PAR_PAGE = 100;

        var groupeStore = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'lg_GROUPE_ID', type: 'int'},
                {name: 'str_LIBELLE', type: 'string'}
            ],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                // meme service que l'ecran "Generer facture" : liste des groupes sans controle
                // de privilege de reglement, qui n'a pas de sens ici
                url: '../api/v1/groupe-tierspayant/facture-data',
                extraParams: {limit: 1000, start: 0},
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            },
            listeners: {
                load: function (magasin, enregistrements, ok) {
                    if (!ok) {
                        return;
                    }
                    // Le service ajoute deja sa propre ligne "Tous les groupes" (identifiant -1)
                    // et seulement quand il y a au moins un groupe. On la remplace par la notre,
                    // toujours presente et toujours en tete, pour que le retour a "tous les
                    // groupes" existe meme sur une officine sans aucun groupe declare.
                    var i = magasin.findExact('lg_GROUPE_ID', -1);
                    if (i >= 0) {
                        magasin.removeAt(i);
                    }
                    if (magasin.findExact('lg_GROUPE_ID', 0) < 0) {
                        magasin.insert(0, {lg_GROUPE_ID: 0, str_LIBELLE: 'Tous les groupes'});
                    }
                }
            }
        });

        var assignedStore = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'lg_TIERS_PAYANT_ID', type: 'string'},
                {name: 'str_FULLNAME', type: 'string'}
            ],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_rest_model_facture_dynamique + 'tiers-payants?modelId=' + modelId,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        var champsTiersPayant = [
            {name: 'lg_TIERS_PAYANT_ID', type: 'string'},
            {name: 'str_FULLNAME', type: 'string'},
            {name: 'MODELE_ACTUEL', type: 'string'},
            {name: 'EST_DYNAMIQUE', type: 'boolean'},
            {name: 'isChecked', type: 'boolean'}
        ];

        // Panier : les tiers payants retenus, quelle que soit la recherche qui les a fait apparaitre.
        var panierStore = Ext.create('Ext.data.Store', {
            fields: champsTiersPayant,
            sorters: [{property: 'str_FULLNAME', direction: 'ASC'}]
        });

        var rechercheStore = Ext.create('Ext.data.Store', {
            fields: champsTiersPayant,
            pageSize: LIGNES_PAR_PAGE,
            autoLoad: false,
            remoteSort: false,
            proxy: {
                type: 'ajax',
                url: url_rest_model_facture_dynamique + 'rechercher-tiers-payants',
                reader: {type: 'json', root: 'data', totalProperty: 'total'},
                // le critere de recherche et le groupe accompagnent chaque page
                extraParams: {query: '', groupeId: 0}
            },
            listeners: {
                load: function (magasin) {
                    // Une page qui arrive doit montrer les coches deja faites : la verite est
                    // dans le panier, pas dans la page.
                    magasin.each(function (r) {
                        r.set('isChecked', panierStore.findExact('lg_TIERS_PAYANT_ID',
                                r.get('lg_TIERS_PAYANT_ID')) >= 0);
                    });
                    magasin.commitChanges();
                }
            }
        });

        var majCompteur = function () {
            var champ = Ext.getCmp('mfdCompteurPanier');
            if (champ) {
                var n = panierStore.getCount();
                champ.setText(n === 0 ? 'Aucun tiers payant coch&eacute;'
                        : '<b>' + n + '</b> tiers payant' + (n > 1 ? 's' : '') + ' coch&eacute;'
                        + (n > 1 ? 's' : ''));
            }
        };
        panierStore.on('datachanged', majCompteur);
        panierStore.on('add', majCompteur);
        panierStore.on('remove', majCompteur);

        var ajouterAuPanier = function (r) {
            if (panierStore.findExact('lg_TIERS_PAYANT_ID', r.get('lg_TIERS_PAYANT_ID')) < 0) {
                panierStore.add(r.copy());
            }
        };

        var retirerDuPanier = function (idTp) {
            var idx = panierStore.findExact('lg_TIERS_PAYANT_ID', idTp);
            if (idx >= 0) {
                panierStore.removeAt(idx);
            }
            var ligne = rechercheStore.findExact('lg_TIERS_PAYANT_ID', idTp);
            if (ligne >= 0) {
                rechercheStore.getAt(ligne).set('isChecked', false);
                rechercheStore.commitChanges();
            }
        };

        var viderPanier = function () {
            panierStore.removeAll();
            rechercheStore.each(function (r) {
                r.set('isChecked', false);
            });
            rechercheStore.commitChanges();
        };

        var minuterieRecherche = null;
        var lancerRecherche = function (fenetre) {
            clearTimeout(minuterieRecherche);
            var champ = fenetre.down('#mfdRecherche');
            var combo = fenetre.down('#mfdGroupe');
            derniereRecherche = champ ? (champ.getValue() || '') : '';
            derniereGroupe = combo && combo.getValue() ? combo.getValue() : 0;
            rechercheStore.getProxy().extraParams.query = derniereRecherche;
            rechercheStore.getProxy().extraParams.groupeId = derniereGroupe;
            rechercheStore.loadPage(1);
        };

        /*
         * Recherche differee : appelee a chaque caractere tape, elle n'interroge le serveur que
         * lorsque la frappe s'arrete. Sans ce delai, taper « ASCOMA » lancerait six recherches.
         * La touche Entree et le bouton Rechercher partent, eux, sans attendre.
         */
        var rechercherPlusTard = function (fenetre) {
            clearTimeout(minuterieRecherche);
            minuterieRecherche = setTimeout(function () {
                if (!fenetre.isDestroyed) {
                    lancerRecherche(fenetre);
                }
            }, 350);
        };

        // "Tout cocher" : coche le resultat COMPLET de la recherche en cours, toutes pages
        // confondues. Cocher page par page etait le seul moyen auparavant, et sur 45 tiers
        // payants trouves il fallait passer sur chaque page sans en oublier une.
        var toutCocher = function (bouton) {
            bouton.disable();
            Ext.Ajax.request({
                url: url_rest_model_facture_dynamique + 'rechercher-tiers-payants',
                method: 'GET',
                params: {query: derniereRecherche, groupeId: derniereGroupe, tout: true},
                callback: function () {
                    bouton.enable();
                },
                success: function (response) {
                    var objet = Ext.JSON.decode(response.responseText, true);
                    if (!objet || !objet.data) {
                        Ext.MessageBox.alert('Information',
                                'La liste complète des tiers payants n\'a pas pu être récupérée. '
                                + 'Relancez la recherche puis réessayez.');
                        return;
                    }
                    var nouveaux = [];
                    Ext.Array.each(objet.data, function (ligne) {
                        if (panierStore.findExact('lg_TIERS_PAYANT_ID', ligne.lg_TIERS_PAYANT_ID) < 0) {
                            nouveaux.push(ligne);
                        }
                    });
                    if (nouveaux.length) {
                        // un seul add : le compteur et la grille ne sont repeints qu'une fois
                        panierStore.add(nouveaux);
                    }
                    // la page affichee doit refleter les coches qui viennent d'etre posees
                    rechercheStore.each(function (r) {
                        r.set('isChecked', true);
                    });
                    rechercheStore.commitChanges();
                },
                failure: function (response) {
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        };

        var idsDuPanier = function () {
            var ids = [];
            panierStore.each(function (r) {
                ids.push(r.get('lg_TIERS_PAYANT_ID'));
            });
            return ids;
        };

        var affecter = function (ids, idModele, libelleAction) {
            if (!ids.length) {
                Ext.MessageBox.alert('Information',
                        'Cochez au moins un tiers payant dans les résultats de recherche.');
                return;
            }
            Ext.MessageBox.confirm('Confirmation',
                    libelleAction + ' pour ' + ids.length + ' tiers payant(s) ?',
                    function (btn) {
                        if (btn !== 'yes') {
                            return;
                        }
                        Ext.Ajax.request({
                            url: url_rest_model_facture_dynamique + 'assigner-masse',
                            method: 'POST',
                            params: {modelId: idModele, tiersPayants: Ext.encode(ids)},
                            success: function (response) {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === "0") {
                                    Ext.MessageBox.alert('Message d\'erreur', object.errors);
                                    return;
                                }
                                Ext.MessageBox.alert('Information', object.errors);
                                // L'affectation a change le modele de ces tiers payants : on
                                // relance la MEME recherche pour que la colonne "Modele
                                // actuellement affecte" dise la verite, et on vide le panier.
                                viderPanier();
                                if (rechercheStore.getCount() > 0 || derniereRecherche !== '') {
                                    rechercheStore.loadPage(rechercheStore.currentPage || 1);
                                }
                                assignedStore.reload();
                                me.modelStore.reload();
                            },
                            failure: function (response) {
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    });
        };

        var win = Ext.create('Ext.window.Window', {
            autoShow: true,
            modal: true,
            // Une recherche en attente ne doit pas partir apres la fermeture de la fenetre.
            listeners: {
                destroy: function () {
                    clearTimeout(minuterieRecherche);
                }
            },
            title: 'Affecter le mod&egrave;le [' + rec.get('nom') + '] &agrave; des tiers payants',
            width: Math.max(1040, Math.min(Ext.Element.getViewportWidth() - 60, 1400)),
            height: Math.max(620, Math.min(Ext.Element.getViewportHeight() - 60, 800)),
            maximizable: true,
            layout: {type: 'vbox', align: 'stretch'},
            items: [
                {
                    // Recherche a GAUCHE, panier a DROITE : les deux listes restent visibles en
                    // meme temps, et chacune dispose de toute la hauteur.
                    xtype: 'container',
                    flex: 2,
                    layout: {type: 'hbox', align: 'stretch'},
                    items: [
                        {
                            xtype: 'gridpanel',
                            title: '1. Rechercher des tiers payants et cocher ceux &agrave; affecter',
                            flex: 1,
                            store: rechercheStore,
                            dockedItems: [
                                {
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            itemId: 'mfdRecherche',
                                            flex: 1,
                                            minWidth: 220,
                                            height: 28,
                                            fieldStyle: 'font-size:13px;',
                                            emptyText: 'Nom du tiers payant (vide = tout lister)...',
                                            enableKeyEvents: true,
                                            listeners: {
                                                // La recherche part toute seule pendant la frappe.
                                                change: function (champ) {
                                                    rechercherPlusTard(champ.up('window'));
                                                },
                                                specialKey: function (champ, e) {
                                                    if (e.getKey() === e.ENTER) {
                                                        lancerRecherche(champ.up('window'));
                                                    }
                                                }
                                            }
                                        },
                                        {
                                            text: 'Rechercher',
                                            iconCls: 'searchicon',
                                            handler: function (btn) {
                                                lancerRecherche(btn.up('window'));
                                            }
                                        },
                                        {
                                            text: 'Effacer',
                                            handler: function (btn) {
                                                var fenetre = btn.up('window');
                                                var champ = fenetre.down('#mfdRecherche');
                                                var combo = fenetre.down('#mfdGroupe');
                                                champ.setValue('');
                                                if (combo) {
                                                    combo.setValue(0);
                                                }
                                                champ.focus();
                                                lancerRecherche(fenetre);
                                            }
                                        }
                                    ]
                                },
                                {
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            itemId: 'mfdGroupe',
                                            fieldLabel: 'Groupe',
                                            labelWidth: 50,
                                            flex: 1,
                                            minWidth: 240,
                                            store: groupeStore,
                                            valueField: 'lg_GROUPE_ID',
                                            displayField: 'str_LIBELLE',
                                            queryMode: 'local',
                                            editable: false,
                                            value: 0,
                                            emptyText: 'Tous les groupes',
                                            listeners: {
                                                // choisir un groupe relance la recherche : on ne
                                                // demande pas a l'utilisateur de recliquer sur
                                                // "Rechercher" apres avoir filtre
                                                select: function (combo) {
                                                    lancerRecherche(combo.up('window'));
                                                }
                                            }
                                        },
                                        {
                                            text: 'Tout cocher',
                                            iconCls: 'addicon',
                                            tooltip: 'Coche TOUS les tiers payants trouv&eacute;s par la recherche '
                                                    + 'en cours, y compris ceux des pages suivantes',
                                            handler: function (btn) {
                                                toutCocher(btn);
                                            }
                                        },
                                        {
                                            text: 'Tout d&eacute;cocher',
                                            iconCls: 'retiremodeleicon',
                                            tooltip: 'D&eacute;coche tout : vide la liste des tiers payants '
                                                    + 's&eacute;lectionn&eacute;s',
                                            handler: viderPanier
                                        },
                                        {
                                            xtype: 'tbtext',
                                            id: 'mfdCompteurPanier',
                                            text: 'Aucun tiers payant coch&eacute;'
                                        }
                                    ]
                                },
                                {
                                    xtype: 'pagingtoolbar',
                                    dock: 'bottom',
                                    store: rechercheStore,
                                    displayInfo: true,
                                    displayMsg: '{0} - {1} sur {2} tiers payant(s)',
                                    emptyMsg: 'Aucun résultat'
                                }
                            ],
                            columns: [
                                {
                                    xtype: 'checkcolumn',
                                    dataIndex: 'isChecked',
                                    width: 40,
                                    listeners: {
                                        checkchange: function (colonne, rowIndex, coche) {
                                            var r = rechercheStore.getAt(rowIndex);
                                            if (coche) {
                                                ajouterAuPanier(r);
                                            } else {
                                                retirerDuPanier(r.get('lg_TIERS_PAYANT_ID'));
                                            }
                                        }
                                    }
                                },
                                {
                                    header: 'Tiers payant',
                                    dataIndex: 'str_FULLNAME',
                                    flex: 1.6
                                },
                                {
                                    header: 'Mod&egrave;le actuellement affect&eacute;',
                                    dataIndex: 'MODELE_ACTUEL',
                                    flex: 1.4,
                                    // Vert = modele dynamique (cree ici), bleu = modele classique
                                    // (fichier Jasper). La couleur dit d'un coup d'oeil ce qui va
                                    // reellement changer avant de valider une affectation.
                                    renderer: function (value, meta, r) {
                                        if (!value) {
                                            return '';
                                        }
                                        var couleur = r.get('EST_DYNAMIQUE') ? '#2e7d32' : '#1e5fa9';
                                        return '<span style="color:' + couleur + ';font-weight:bold;">'
                                                + value + '</span>';
                                    }
                                }
                            ]
                        },
                        {
                            xtype: 'gridpanel',
                            title: '2. Tiers payants coch&eacute;s (le panier)',
                            flex: 1,
                            margin: '0 0 0 6',
                            store: panierStore,
                            viewConfig: {
                                emptyText: '<div style="padding:12px;color:#888;">Cochez des tiers payants '
                                        + '&agrave; gauche : ils s\'ajoutent ici et y restent d\'une recherche '
                                        + '&agrave; l\'autre.</div>',
                                deferEmptyText: false
                            },
                            dockedItems: [{
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    items: [
                                        '->',
                                        {
                                            text: 'Affecter ce mod&egrave;le',
                                            iconCls: 'addicon',
                                            cls: 'btn-valider-vert',
                                            overCls: 'btn-valider-vert-over',
                                            pressedCls: 'btn-valider-vert-pressed',
                                            handler: function () {
                                                affecter(idsDuPanier(), modelId,
                                                        'Affecter le modèle "' + rec.get('nom') + '"');
                                            }
                                        },
                                        {
                                            text: 'Retirer le mod&egrave;le',
                                            // iconCls "cancelicon" n'existe dans aucune feuille du
                                            // theme : le bouton s'affichait sans pictogramme et en
                                            // gris, a cote d'un "Affecter" vert et illustre.
                                            iconCls: 'retiremodeleicon',
                                            cls: 'btn-retirer-orange',
                                            overCls: 'btn-retirer-orange-over',
                                            pressedCls: 'btn-retirer-orange-pressed',
                                            tooltip: 'Remettre le mod&egrave;le de facture standard',
                                            handler: function () {
                                                affecter(idsDuPanier(), 0, 'Remettre le modèle standard');
                                            }
                                        }
                                    ]
                                }],
                            columns: [
                                {
                                    header: 'Tiers payant',
                                    dataIndex: 'str_FULLNAME',
                                    flex: 1
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/delete.png',
                                            tooltip: 'Retirer du panier',
                                            handler: function (grid, rowIndex) {
                                                retirerDuPanier(grid.getStore().getAt(rowIndex)
                                                        .get('lg_TIERS_PAYANT_ID'));
                                            }
                                        }]
                                }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'gridpanel',
                    title: '3. Tiers payants actuellement factur&eacute;s avec ce mod&egrave;le',
                    flex: 1,
                    margin: '6 0 0 0',
                    store: assignedStore,
                    columns: [
                        {
                            header: 'Tiers payant',
                            dataIndex: 'str_FULLNAME',
                            flex: 1
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Retirer ce tiers payant du mod&egrave;le '
                                            + '(retour au mod&egrave;le de facture standard)',
                                    handler: function (grid, rowIndex) {
                                        var tpRec = grid.getStore().getAt(rowIndex);
                                        Ext.MessageBox.confirm('Confirmation',
                                                'Retirer <b>' + tpRec.get('str_FULLNAME') + '</b> de ce mod&egrave;le ?'
                                                + '<br/>Ses prochaines factures sortiront au format standard.',
                                                function (btn) {
                                                    if (btn !== 'yes') {
                                                        return;
                                                    }
                                                    Ext.Ajax.request({
                                                        url: url_rest_model_facture_dynamique + 'assigner',
                                                        method: 'POST',
                                                        params: {
                                                            lg_TIERS_PAYANT_ID: tpRec.get('lg_TIERS_PAYANT_ID'),
                                                            modelId: ''
                                                        },
                                                        success: function (response) {
                                                            var object = Ext.JSON.decode(response.responseText, false);
                                                            if (object.success === "0") {
                                                                Ext.MessageBox.alert('Message d\'erreur',
                                                                        object.errors);
                                                                return;
                                                            }
                                                            assignedStore.reload();
                                                            me.modelStore.reload();
                                                            if (derniereRecherche !== ''
                                                                    || rechercheStore.getCount() > 0) {
                                                                rechercheStore.loadPage(
                                                                        rechercheStore.currentPage || 1);
                                                            }
                                                        },
                                                        failure: function (response) {
                                                            Ext.MessageBox.alert('Error Message',
                                                                    response.responseText);
                                                        }
                                                    });
                                                });
                                    }
                                }]
                        }
                    ]
                }
            ],
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }]
        });
        majCompteur();
    }
});
