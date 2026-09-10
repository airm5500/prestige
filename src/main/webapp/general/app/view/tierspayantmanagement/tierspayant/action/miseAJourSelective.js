/* global Ext */

/*
 * Mise a jour selective des tiers payants.
 *
 * Regler le code d'edition du bordereau, le nombre de bons par page ou la taille de police
 * organisme par organisme prend un temps fou des qu'il y en a plusieurs dizaines, et laisse
 * passer des oublis. Cet ecran applique une MEME valeur a tous les tiers payants coches.
 *
 * Trois choses le rendent sur :
 *   - un reglage laisse sur « Ne pas modifier » n'est pas envoye, donc rien n'est ecrase ;
 *   - les coches survivent au changement de page et a une nouvelle recherche : on peut cocher
 *     trois organismes ici, chercher autre chose, en cocher deux autres, puis appliquer aux cinq ;
 *   - le bouton n'apparait qu'avec le droit « Autorisation de mise à jour sélectives tiers
 *     payants », et le serveur revérifie ce droit a chaque appel.
 */

var url_rest_tierspayant_maj_selective = '../api/v1/tierspayant/mise-a-jour-selective/';

/*
 * Les donnees reglables en masse. « champ » est le nom attendu par le serveur (enumeration
 * ChampTiersPayantMaj cote Java, sauf les trois premieres qui gardent leur parametre historique),
 * « colonne » le champ du store affiche dans la grille, « saisie » l'itemId de l'editeur.
 *
 * L'officine coche les donnees qu'elle veut regler : une donnee non cochee n'est pas envoyee, donc
 * pas modifiee. C'est ce qui rend l'ecran sur quand on l'applique a quarante organismes.
 */
var TP_DONNEES = [
    {champ: 'codeEditBordereau', legacy: true, libelle: 'Code d\'édition du bordereau',
        colonne: 'str_CODE_EDIT_BORDEREAU', saisie: 'valCodeEdition'},
    {champ: 'nbBonsParPage', legacy: true, libelle: 'Bons par page du bordereau',
        colonne: 'int_NB_BONS_PAR_PAGE', saisie: 'valBonsParPage'},
    {champ: 'taillePolice', legacy: true, libelle: 'Taille de police de la facture',
        colonne: 'int_TAILLE_POLICE', saisie: 'valTaillePolice'},
    {champ: 'NBRE_EXEMPLAIRE_BORD', libelle: 'Nombre d\'exemplaires du bordereau',
        colonne: 'int_NBRE_EXEMPLAIRE_BORD', saisie: 'valNbreExemplaire'},
    {champ: 'NBREBONS', libelle: 'Nombre maximum de bons par facture',
        colonne: 'int_NBREBONS', saisie: 'valNbreBons'},
    {champ: 'MONTANTFAC', libelle: 'Montant maximum d\'une facture',
        colonne: 'int_MONTANTFAC', saisie: 'valMontantFacture'},
    {champ: 'MODE_TRI_FACTURE', libelle: 'Mode de tri de la facture',
        colonne: 'str_MODE_TRI_FACTURE', saisie: 'valModeTri'},
    {champ: 'PLAFOND_CREDIT', libelle: 'Plafond de crédit',
        colonne: 'dbl_PLAFOND_CREDIT', saisie: 'valPlafondCredit'},
    {champ: 'PLAFOND_VENTE', libelle: 'Plafond par tiers payant',
        colonne: 'dbl_PLAFOND_VENTE', saisie: 'valPlafondVente'},
    {champ: 'IS_ABSOLUTE', libelle: 'Plafond absolu',
        colonne: 'b_IsAbsolute', saisie: 'valPlafondAbsolu'},
    {champ: 'COMPTE_CONTRIBUABLE', libelle: 'Compte contribuable',
        colonne: 'str_COMPTE_CONTRIBUABLE', saisie: 'valCompteContribuable'},
    {champ: 'REGISTRE_COMMERCE', libelle: 'Registre de commerce',
        colonne: 'str_REGISTRE_COMMERCE', saisie: 'valRegistreCommerce'},
    {champ: 'CODE_OFFICINE', libelle: 'Code officine',
        colonne: 'str_CODE_OFFICINE', saisie: 'valCodeOfficine'}
];

/** Les deux seuls modes de tri connus de la facture, memes valeurs que la fiche du tiers payant. */
var TP_MODES_TRI = [['ALPHABETIQUE', 'Alphabétique (nom du client)'], ['DATE_BON', 'Date du bon / opération']];

/** Un reglage oui / non. La valeur transmise est « 1 » ou « 0 », jamais une chaine vide. */
var TP_OUI_NON = [['1', 'Oui'], ['0', 'Non']];

Ext.define('testextjs.view.tierspayantmanagement.tierspayant.action.miseAJourSelective', {
    extend: 'Ext.window.Window',
    xtype: 'tierspayantmiseajourselective',
    requires: [
        'Ext.grid.*',
        'Ext.data.*',
        'Ext.form.*',
        'Ext.toolbar.Paging',
        'Ext.grid.column.CheckColumn'
    ],
    title: 'Mise &agrave; jour s&eacute;lective des tiers payants',
    modal: true,
    autoShow: true,
    maximizable: true,
    layout: {type: 'vbox', align: 'stretch'},

    /** La grille appelante, rechargee apres une mise a jour pour qu'elle dise la verite. */
    grilleAppelante: null,

    constructor: function (config) {
        var me = this;
        config = config || {};
        me.grilleAppelante = config.grilleAppelante || null;

        // Les tiers payants coches, par identifiant. Un objet plutot que la selection de la
        // grille : la selection est perdue des qu'on change de page ou qu'on relance la
        // recherche, alors que le panier doit survivre aux deux.
        me.panier = {};
        me.derniereRecherche = '';
        me.derniereGroupe = '';
        me.minuterieRecherche = null;

        me.resultatStore = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'lg_TIERS_PAYANT_ID', type: 'string'},
                {name: 'str_NAME', type: 'string'},
                {name: 'str_FULLNAME', type: 'string'},
                {name: 'str_CODE_ORGANISME', type: 'string'},
                {name: 'str_CODE_EDIT_BORDEREAU', type: 'string'},
                {name: 'int_NB_BONS_PAR_PAGE', type: 'int'},
                {name: 'int_TAILLE_POLICE', type: 'int'},
                {name: 'int_NBRE_EXEMPLAIRE_BORD', type: 'int'},
                {name: 'int_NBREBONS', type: 'int'},
                {name: 'int_MONTANTFAC', type: 'int'},
                {name: 'str_MODE_TRI_FACTURE', type: 'string'},
                {name: 'dbl_PLAFOND_CREDIT', type: 'float'},
                {name: 'dbl_PLAFOND_VENTE', type: 'float'},
                {name: 'b_IsAbsolute', type: 'boolean'},
                {name: 'str_COMPTE_CONTRIBUABLE', type: 'string'},
                {name: 'str_REGISTRE_COMMERCE', type: 'string'},
                {name: 'str_CODE_OFFICINE', type: 'string'},
                {name: 'coche', type: 'boolean'}
            ],
            pageSize: 25,
            autoLoad: false,
            remoteSort: false,
            proxy: {
                type: 'ajax',
                url: url_rest_tierspayant_maj_selective + 'rechercher',
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            },
            listeners: {
                // Une page qui arrive doit afficher les coches deja posees sur ces lignes.
                load: function (store) {
                    store.each(function (ligne) {
                        ligne.set('coche', !!me.panier[ligne.get('lg_TIERS_PAYANT_ID')]);
                    });
                    store.commitChanges();
                    me.rafraichirCompteur();
                }
            }
        });

        // Groupes de tiers payants, pour filtrer la recherche.
        me.groupeStore = Ext.create('Ext.data.Store', {
            fields: ['lg_GROUPE_ID', 'str_LIBELLE'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/groupe-tierspayant/list',
                extraParams: {start: 0, limit: 500},
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            },
            listeners: {
                load: function (store) {
                    // La ligne « Tous les groupes » leve le filtre ; sans elle on ne pourrait plus
                    // revenir a la liste complete apres avoir choisi un groupe.
                    if (store.findExact('str_LIBELLE', '') < 0) {
                        store.insert(0, [{lg_GROUPE_ID: '', str_LIBELLE: ''}]);
                    }
                }
            }
        });

        // Les donnees reglables, telles qu'elles sont proposees dans le selecteur. « retenu »
        // porte la coche : c'est lui, et lui seul, qui decide de ce qui part au serveur.
        me.champStore = Ext.create('Ext.data.Store', {
            fields: [{name: 'champ', type: 'string'}, {name: 'libelle', type: 'string'},
                {name: 'retenu', type: 'boolean'}],
            data: Ext.Array.map(TP_DONNEES, function (donnee) {
                return {champ: donnee.champ, libelle: donnee.libelle, retenu: false};
            })
        });

        // Codes d'edition de bordereau : MEME source que la liste deroulante de la fiche
        // du tiers payant, pour ne jamais proposer un code que la fiche refuserait.
        me.modeleStore = Ext.create('Ext.data.Store', {
            fields: ['lg_MODEL_FACTURE_ID', 'str_VALUE', 'str_DESCRIPTION'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/facturation/modelfacture/liste',
                extraParams: {start: 0, limit: 200},
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        Ext.apply(config, {
            width: Math.max(980, Math.min(Ext.Element.getViewportWidth() - 60, 1320)),
            height: Math.max(600, Math.min(Ext.Element.getViewportHeight() - 60, 780)),
            items: me.contenu()
        });
        me.callParent([config]);
    },

    contenu: function () {
        var me = this;
        return [
            {
                xtype: 'gridpanel',
                itemId: 'majGrille',
                flex: 1,
                store: me.resultatStore,
                columns: [
                    {
                        xtype: 'checkcolumn',
                        dataIndex: 'coche',
                        width: 34,
                        sortable: false,
                        menuDisabled: true,
                        listeners: {
                            checkchange: function (colonne, ligne, coche) {
                                var enregistrement = me.resultatStore.getAt(ligne);
                                me.cocher(enregistrement, coche);
                            }
                        }
                    },
                    {header: 'Code', dataIndex: 'str_CODE_ORGANISME', width: 90},
                    {header: 'Nom abr&eacute;g&eacute;', dataIndex: 'str_NAME', flex: 1},
                    {header: 'Nom complet', dataIndex: 'str_FULLNAME', flex: 2},
                    {
                        header: 'Code &eacute;dition actuel',
                        dataIndex: 'str_CODE_EDIT_BORDEREAU',
                        width: 150
                    },
                    {
                        header: 'Bons/page actuel',
                        dataIndex: 'int_NB_BONS_PAR_PAGE',
                        width: 120,
                        align: 'center',
                        // 0 en base veut dire « automatique » : le mot est plus parlant qu'un zero
                        renderer: function (valeur) {
                            return valeur > 0 ? valeur : 'Automatique';
                        }
                    },
                    {
                        header: 'Police actuelle',
                        dataIndex: 'int_TAILLE_POLICE',
                        width: 120,
                        align: 'center',
                        renderer: function (valeur) {
                            return valeur > 0 ? valeur + ' pt' : 'Automatique';
                        }
                    },
                    // Les dix autres donnees. Masquees au depart : treize colonnes visibles d'un
                    // coup rendraient la grille illisible. Cocher une donnee a regler affiche la
                    // colonne correspondante, pour voir ce qu'on remplace avant de remplacer.
                    {
                        header: 'Exempl. bordereau',
                        dataIndex: 'int_NBRE_EXEMPLAIRE_BORD',
                        width: 130, align: 'center', hidden: true
                    },
                    {
                        header: 'Bons max / facture',
                        dataIndex: 'int_NBREBONS',
                        width: 130, align: 'center', hidden: true,
                        // 0 ou -1 en base veut dire « pas de limite » : le dire est plus parlant.
                        renderer: function (valeur) {
                            return valeur > 0 ? valeur : 'Sans limite';
                        }
                    },
                    {
                        header: 'Montant max / facture',
                        dataIndex: 'int_MONTANTFAC',
                        width: 150, align: 'right', hidden: true,
                        renderer: function (valeur) {
                            return valeur > 0 ? Ext.util.Format.number(valeur, '0,000') : 'Sans limite';
                        }
                    },
                    {
                        header: 'Tri facture',
                        dataIndex: 'str_MODE_TRI_FACTURE',
                        width: 130, hidden: true,
                        renderer: function (valeur) {
                            return 'DATE_BON' === valeur ? 'Date du bon' : 'Alphab&eacute;tique';
                        }
                    },
                    {
                        header: 'Plafond cr&eacute;dit',
                        dataIndex: 'dbl_PLAFOND_CREDIT',
                        width: 130, align: 'right', hidden: true,
                        renderer: function (valeur) {
                            return valeur > 0 ? Ext.util.Format.number(valeur, '0,000') : '';
                        }
                    },
                    {
                        header: 'Plafond vente',
                        dataIndex: 'dbl_PLAFOND_VENTE',
                        width: 130, align: 'right', hidden: true,
                        renderer: function (valeur) {
                            return valeur > 0 ? Ext.util.Format.number(valeur, '0,000') : '';
                        }
                    },
                    {
                        header: 'Plafond absolu',
                        dataIndex: 'b_IsAbsolute',
                        width: 110, align: 'center', hidden: true,
                        renderer: function (valeur) {
                            return valeur ? 'Oui' : 'Non';
                        }
                    },
                    {header: 'Compte contribuable', dataIndex: 'str_COMPTE_CONTRIBUABLE', width: 160, hidden: true},
                    {header: 'Registre commerce', dataIndex: 'str_REGISTRE_COMMERCE', width: 160, hidden: true},
                    {header: 'Code officine', dataIndex: 'str_CODE_OFFICINE', width: 130, hidden: true}
                ],
                dockedItems: [
                    {
                        xtype: 'toolbar',
                        dock: 'top',
                        items: [
                            {
                                xtype: 'textfield',
                                itemId: 'majRecherche',
                                flex: 1,
                                minWidth: 240,
                                emptyText: 'Nom ou code du tiers payant (vide = tout lister), puis Entr&eacute;e...',
                                enableKeyEvents: true,
                                listeners: {
                                    // La recherche part toute seule pendant la frappe. Le delai
                                    // evite une requete par caractere : on attend que la saisie
                                    // se pose. La touche Entree la declenche sans attendre.
                                    change: function () {
                                        me.rechercherPlusTard();
                                    },
                                    specialKey: function (champ, e) {
                                        if (e.getKey() === e.ENTER) {
                                            me.rechercher();
                                        }
                                    }
                                }
                            },
                            {
                                xtype: 'combobox',
                                itemId: 'majGroupe',
                                fieldLabel: 'Groupe',
                                labelWidth: 48,
                                width: 260,
                                store: me.groupeStore,
                                valueField: 'str_LIBELLE',
                                displayField: 'str_LIBELLE',
                                queryMode: 'local',
                                editable: false,
                                value: '',
                                emptyText: 'Tous les groupes',
                                listeners: {
                                    // Choisir un groupe relance la recherche : on ne demande pas
                                    // de recliquer sur « Rechercher » apres avoir filtre.
                                    select: function () {
                                        me.rechercher();
                                    }
                                }
                            },
                            {
                                text: 'Effacer',
                                tooltip: 'Vide la recherche et le filtre de groupe',
                                handler: function () {
                                    me.down('#majRecherche').setValue('');
                                    me.down('#majGroupe').setValue('');
                                    me.rechercher();
                                }
                            },
                            '-',
                            {
                                text: 'Tout cocher',
                                iconCls: 'check_icon',
                                tooltip: 'Coche TOUS les tiers payants trouv&eacute;s par la recherche en cours, '
                                        + 'pages suivantes comprises',
                                handler: function (bouton) {
                                    me.toutCocher(bouton);
                                }
                            },
                            {
                                text: 'Tout d&eacute;cocher',
                                handler: function () {
                                    me.toutDecocher();
                                }
                            },
                            '->',
                            {
                                xtype: 'tbtext',
                                itemId: 'majCompteur',
                                text: '<b>0</b> tiers payant(s) coch&eacute;(s)'
                            }
                        ]
                    },
                    {
                        xtype: 'pagingtoolbar',
                        dock: 'bottom',
                        store: me.resultatStore,
                        displayInfo: true,
                        displayMsg: '{0} - {1} sur {2}',
                        emptyMsg: 'Aucun tiers payant'
                    }
                ]
            },
            {
                xtype: 'form',
                itemId: 'majFormulaire',
                title: 'Donn&eacute;es &agrave; appliquer aux tiers payants coch&eacute;s',
                height: 210,
                bodyPadding: 10,
                layout: {type: 'hbox', align: 'stretch'},
                items: [
                    {
                        // Le selecteur. Plusieurs donnees peuvent etre reglees dans le meme passage :
                        // c'est tout l'interet, sinon il faudrait rouvrir l'ecran treize fois.
                        //
                        // Une grille a cases plutot qu'un « multiselect » : ce dernier vient du
                        // paquet ux, qui n'est pas charge par l'application. La case a cocher est
                        // par ailleurs l'idiome deja employe par la grille des tiers payants
                        // ci-dessus et par la mise a jour selective de la fiche article.
                        xtype: 'gridpanel',
                        itemId: 'majChamps',
                        title: 'Donn&eacute;es &agrave; modifier',
                        width: 330,
                        hideHeaders: true,
                        store: me.champStore,
                        columns: [
                            {
                                xtype: 'checkcolumn', dataIndex: 'retenu', width: 34,
                                sortable: false, menuDisabled: true,
                                listeners: {
                                    checkchange: function (colonne) {
                                        colonne.up('window').surSelectionChamps();
                                    }
                                }
                            },
                            {dataIndex: 'libelle', flex: 1}
                        ]
                    },
                    {
                        // Les editeurs, un par donnee, tous crees mais masques : seul celui d'une
                        // donnee cochee est visible, et seul son contenu part au serveur.
                        xtype: 'container',
                        itemId: 'majEditeurs',
                        flex: 1,
                        margin: '0 0 0 12',
                        autoScroll: true,
                        defaults: {labelWidth: 200, width: 460, hidden: true, margin: '0 0 6 0'},
                        items: me.editeurs()
                    }
                ]
            }
        ];
    },

    buttons: [
        {
            text: 'Appliquer aux coch&eacute;s',
            iconCls: 'check_icon',
            handler: function (bouton) {
                bouton.up('window').appliquer(bouton);
            }
        },
        {
            text: 'Fermer',
            handler: function (bouton) {
                bouton.up('window').close();
            }
        }
    ],

    /**
     * Un editeur par donnee reglable. Ils sont tous crees d'emblee, masques : montrer ou cacher un
     * composant existant est instantane, alors que le construire au moment du clic ferait clignoter
     * la fenetre a chaque changement de selection.
     */
    editeurs: function () {
        var me = this;
        return [
            {
                xtype: 'combobox', itemId: 'valCodeEdition', fieldLabel: 'Code d\'&eacute;dition du bordereau',
                store: me.modeleStore, valueField: 'str_VALUE', displayField: 'str_VALUE',
                queryMode: 'local', editable: false, emptyText: 'Choisissez un code...'
            },
            {
                xtype: 'numberfield', itemId: 'valBonsParPage', fieldLabel: 'Bons par page du bordereau',
                allowDecimals: false, minValue: 5, maxValue: 500, step: 5, value: null
            },
            {
                xtype: 'combobox', itemId: 'valTaillePolice', fieldLabel: 'Taille de police de la facture',
                store: Ext.create('Ext.data.ArrayStore', {
                    data: [[0, 'Automatique (taille du mod&egrave;le)'],
                        [5, '5 points'], [6, '6 points'], [7, '7 points'], [8, '8 points'],
                        [9, '9 points'], [10, '10 points'], [11, '11 points'], [12, '12 points']],
                    fields: [{name: 'value', type: 'int'}, {name: 'libelle', type: 'string'}]
                }),
                valueField: 'value', displayField: 'libelle', queryMode: 'local', editable: false, value: null
            },
            {
                xtype: 'numberfield', itemId: 'valNbreExemplaire', fieldLabel: 'Nombre d\'exemplaires du bordereau',
                allowDecimals: false, minValue: 1, maxValue: 20, value: null
            },
            {
                xtype: 'numberfield', itemId: 'valNbreBons', fieldLabel: 'Nombre maximum de bons par facture',
                allowDecimals: false, minValue: 0, maxValue: 100000, value: null,
                emptyText: '0 = sans limite'
            },
            {
                xtype: 'numberfield', itemId: 'valMontantFacture', fieldLabel: 'Montant maximum d\'une facture',
                allowDecimals: false, minValue: 0, value: null, emptyText: '0 = sans limite'
            },
            {
                xtype: 'combobox', itemId: 'valModeTri', fieldLabel: 'Mode de tri de la facture',
                store: Ext.create('Ext.data.ArrayStore', {
                    data: TP_MODES_TRI,
                    fields: [{name: 'value', type: 'string'}, {name: 'libelle', type: 'string'}]
                }),
                valueField: 'value', displayField: 'libelle', queryMode: 'local', editable: false, value: null
            },
            {
                xtype: 'numberfield', itemId: 'valPlafondCredit', fieldLabel: 'Plafond de cr&eacute;dit',
                allowDecimals: true, minValue: 0, value: null
            },
            {
                xtype: 'numberfield', itemId: 'valPlafondVente', fieldLabel: 'Plafond par tiers payant',
                allowDecimals: true, minValue: 0, value: null
            },
            {
                xtype: 'combobox', itemId: 'valPlafondAbsolu', fieldLabel: 'Plafond absolu',
                store: Ext.create('Ext.data.ArrayStore', {
                    data: TP_OUI_NON,
                    fields: [{name: 'value', type: 'string'}, {name: 'libelle', type: 'string'}]
                }),
                valueField: 'value', displayField: 'libelle', queryMode: 'local', editable: false, value: null
            },
            {
                xtype: 'textfield', itemId: 'valCompteContribuable', fieldLabel: 'Compte contribuable', maxLength: 100
            },
            {
                xtype: 'textfield', itemId: 'valRegistreCommerce', fieldLabel: 'Registre de commerce', maxLength: 100
            },
            {
                xtype: 'textfield', itemId: 'valCodeOfficine', fieldLabel: 'Code officine', maxLength: 100
            }
        ];
    },

    /** Le descripteur des donnees actuellement cochees dans le selecteur. */
    donneesChoisies: function () {
        var coches = [];
        this.champStore.each(function (ligne) {
            if (ligne.get('retenu')) {
                coches.push(ligne.get('champ'));
            }
        });
        return Ext.Array.filter(TP_DONNEES, function (donnee) {
            return Ext.Array.contains(coches, donnee.champ);
        });
    },

    /**
     * Cocher ou decocher une donnee montre son editeur, et affiche dans la grille la colonne qui
     * porte sa valeur actuelle : on voit ce qu'on s'apprete a remplacer avant de le remplacer.
     */
    surSelectionChamps: function () {
        var me = this;
        var choisies = me.donneesChoisies();
        var grille = me.down('#majGrille');
        Ext.Array.each(TP_DONNEES, function (donnee) {
            var retenue = Ext.Array.contains(choisies, donnee);
            var editeur = me.down('#' + donnee.saisie);
            if (editeur) {
                editeur.setVisible(retenue);
                if (!retenue) {
                    // Une donnee decochee ne doit rien garder : sinon la recocher plus tard
                    // reappliquerait une valeur saisie pour une autre selection d'organismes.
                    editeur.setValue(editeur.isXType('textfield', true) ? '' : null);
                }
            }
            var colonne = grille ? grille.down('gridcolumn[dataIndex=' + donnee.colonne + ']') : null;
            // Les trois colonnes historiques restent visibles en permanence : elles etaient la
            // avant le selecteur, les masquer serait une regression pour qui s'y est habitue.
            if (colonne && !donnee.legacy) {
                colonne.setVisible(retenue);
            }
        });
    },

    /** La valeur telle qu'elle sera relue dans la demande de confirmation, en clair. */
    libelleValeur: function (donnee, valeur) {
        if (donnee.champ === 'IS_ABSOLUTE') {
            return '1' === String(valeur) ? 'oui' : 'non';
        }
        if (donnee.champ === 'MODE_TRI_FACTURE') {
            return 'DATE_BON' === valeur ? 'date du bon' : 'alphab&eacute;tique';
        }
        if (donnee.champ === 'taillePolice') {
            return valeur > 0 ? valeur + ' pt' : 'automatique';
        }
        if (donnee.champ === 'NBREBONS' || donnee.champ === 'MONTANTFAC') {
            return valeur > 0 ? valeur : 'sans limite';
        }
        return valeur === '' ? '(vide)' : valeur;
    },

    /** Ajoute ou retire un tiers payant du panier. */
    cocher: function (enregistrement, coche) {
        if (!enregistrement) {
            return;
        }
        var id = enregistrement.get('lg_TIERS_PAYANT_ID');
        if (coche) {
            this.panier[id] = enregistrement.get('str_FULLNAME') || enregistrement.get('str_NAME') || id;
        } else {
            delete this.panier[id];
        }
        this.rafraichirCompteur();
    },

    identifiantsCoches: function () {
        return Ext.Object.getKeys(this.panier);
    },

    rafraichirCompteur: function () {
        var compteur = this.down('#majCompteur');
        if (compteur) {
            compteur.setText('<b>' + this.identifiantsCoches().length + '</b> tiers payant(s) coch&eacute;(s)');
        }
    },

    /**
     * Recherche differee : appelee a chaque caractere tape, elle n'interroge le serveur que
     * lorsque la frappe s'arrete. Sans ce delai, taper « ASCOMA » lancerait six recherches.
     */
    rechercherPlusTard: function () {
        var me = this;
        clearTimeout(me.minuterieRecherche);
        me.minuterieRecherche = setTimeout(function () {
            if (!me.isDestroyed) {
                me.rechercher();
            }
        }, 350);
    },

    rechercher: function () {
        clearTimeout(this.minuterieRecherche);
        this.derniereRecherche = this.down('#majRecherche').getValue() || '';
        this.derniereGroupe = this.down('#majGroupe').getValue() || '';
        this.resultatStore.getProxy().extraParams = {
            query: this.derniereRecherche,
            groupeId: this.derniereGroupe
        };
        this.resultatStore.loadPage(1);
    },

    toutCocher: function (bouton) {
        var me = this;
        bouton.disable();
        Ext.Ajax.request({
            url: url_rest_tierspayant_maj_selective + 'rechercher',
            method: 'GET',
            params: {query: me.derniereRecherche, groupeId: me.derniereGroupe || '', tout: true},
            callback: function () {
                bouton.enable();
            },
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true);
                if (!objet || !objet.results) {
                    Ext.MessageBox.alert('Information',
                            'La liste compl&egrave;te n\'a pas pu &ecirc;tre r&eacute;cup&eacute;r&eacute;e. '
                            + 'Relancez la recherche puis r&eacute;essayez.');
                    return;
                }
                Ext.Array.each(objet.results, function (ligne) {
                    me.panier[ligne.lg_TIERS_PAYANT_ID] = ligne.str_FULLNAME || ligne.str_NAME;
                });
                me.resultatStore.each(function (ligne) {
                    ligne.set('coche', true);
                });
                me.resultatStore.commitChanges();
                me.rafraichirCompteur();
            },
            failure: function (reponse) {
                Ext.MessageBox.alert('Message d\'erreur', reponse.responseText);
            }
        });
    },

    toutDecocher: function () {
        this.panier = {};
        this.resultatStore.each(function (ligne) {
            ligne.set('coche', false);
        });
        this.resultatStore.commitChanges();
        this.rafraichirCompteur();
    },

    appliquer: function (bouton) {
        var me = this;
        var ids = me.identifiantsCoches();
        if (!ids.length) {
            Ext.MessageBox.alert('Information', 'Cochez au moins un tiers payant.');
            return;
        }
        var choisies = me.donneesChoisies();
        if (!choisies.length) {
            Ext.MessageBox.alert('Information',
                    'Choisissez au moins une donn&eacute;e &agrave; appliquer dans la liste de gauche. '
                    + 'Une donn&eacute;e non choisie n\'est pas modifi&eacute;e.');
            return;
        }
        // Ce qui part au serveur : les trois reglages historiques gardent leur parametre nomme,
        // les dix autres voyagent dans une seule table « champ -> valeur ».
        var parametres = {tiersPayants: Ext.encode(ids)};
        var autres = {};
        var resume = [];
        var manquante = null;
        Ext.Array.each(choisies, function (donnee) {
            var editeur = me.down('#' + donnee.saisie);
            var valeur = editeur ? editeur.getValue() : null;
            var textuelle = donnee.champ === 'COMPTE_CONTRIBUABLE' || donnee.champ === 'REGISTRE_COMMERCE'
                    || donnee.champ === 'CODE_OFFICINE';
            // Un champ texte coche et laisse vide efface volontairement la donnee ; pour tous les
            // autres, cocher sans saisir est une etourderie et non une intention.
            if (valeur === null || valeur === undefined || (valeur === '' && !textuelle)) {
                manquante = donnee.libelle;
                return false;
            }
            if (donnee.legacy) {
                parametres[donnee.champ] = valeur;
            } else {
                autres[donnee.champ] = String(valeur);
            }
            resume.push(donnee.libelle + ' = ' + me.libelleValeur(donnee, valeur));
            return true;
        });
        if (manquante) {
            Ext.MessageBox.alert('Information',
                    'Renseignez la valeur de « ' + manquante + ' », ou retirez cette donn&eacute;e de la liste.');
            return;
        }
        if (!Ext.Object.isEmpty(autres)) {
            parametres.valeurs = Ext.encode(autres);
        }
        Ext.MessageBox.confirm('Confirmation',
                'Appliquer ' + resume.join(', ') + '<br/>&agrave; <b>' + ids.length + '</b> tiers payant(s) ?',
                function (choix) {
                    if (choix !== 'yes') {
                        return;
                    }
                    bouton.disable();
                    Ext.Ajax.request({
                        url: url_rest_tierspayant_maj_selective + 'appliquer',
                        method: 'POST',
                        params: parametres,
                        callback: function () {
                            bouton.enable();
                        },
                        success: function (reponse) {
                            var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                            if (objet.success === '0') {
                                Ext.MessageBox.alert('Message d\'erreur', objet.errors);
                                return;
                            }
                            Ext.MessageBox.alert('Information', objet.errors);
                            // Les valeurs affichees dans la grille viennent de changer : on
                            // recharge la page en cours pour qu'elle dise la verite, et on
                            // garde les coches au cas ou l'officine enchaine un autre reglage.
                            me.resultatStore.loadPage(me.resultatStore.currentPage || 1);
                            if (me.grilleAppelante && me.grilleAppelante.getStore()) {
                                me.grilleAppelante.getStore().reload();
                            }
                        },
                        failure: function (reponse) {
                            Ext.MessageBox.alert('Message d\'erreur', reponse.responseText);
                        }
                    });
                });
    },

    listeners: {
        afterrender: function (fenetre) {
            fenetre.rechercher();
        },
        // Une recherche differee qui partirait apres la fermeture interrogerait le serveur pour
        // un ecran qui n'existe plus.
        beforedestroy: function (fenetre) {
            clearTimeout(fenetre.minuterieRecherche);
        }
    }
});
