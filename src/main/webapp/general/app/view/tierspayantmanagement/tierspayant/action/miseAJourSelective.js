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
                    }
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
                title: 'Valeurs &agrave; appliquer aux tiers payants coch&eacute;s',
                bodyPadding: 10,
                layout: {type: 'hbox', align: 'stretch'},
                defaults: {flex: 1, labelWidth: 130, margin: '0 12 0 0'},
                items: [
                    {
                        xtype: 'combobox',
                        itemId: 'majCodeEdition',
                        fieldLabel: 'Code &eacute;dition',
                        store: me.modeleStore,
                        valueField: 'str_VALUE',
                        displayField: 'str_VALUE',
                        queryMode: 'local',
                        editable: false,
                        emptyText: 'Ne pas modifier',
                        listeners: {
                            // Sans cela on ne peut plus revenir en arriere apres avoir choisi
                            // un code : le champ resterait rempli et le code serait applique.
                            render: function (combo) {
                                combo.getEl().on('dblclick', function () {
                                    combo.clearValue();
                                });
                            }
                        }
                    },
                    {
                        xtype: 'numberfield',
                        itemId: 'majBonsParPage',
                        fieldLabel: 'Bons par page',
                        emptyText: 'Ne pas modifier',
                        allowBlank: true,
                        allowDecimals: false,
                        minValue: 5,
                        maxValue: 500,
                        step: 5,
                        value: null
                    },
                    {
                        xtype: 'combobox',
                        itemId: 'majTaillePolice',
                        fieldLabel: 'Police facture',
                        store: Ext.create('Ext.data.ArrayStore', {
                            data: [
                                [0, 'Automatique (taille du mod&egrave;le)'],
                                [5, '5 points'], [6, '6 points'], [7, '7 points'], [8, '8 points'],
                                [9, '9 points'], [10, '10 points'], [11, '11 points'], [12, '12 points']
                            ],
                            fields: [{name: 'value', type: 'int'}, {name: 'libelle', type: 'string'}]
                        }),
                        valueField: 'value',
                        displayField: 'libelle',
                        queryMode: 'local',
                        editable: false,
                        emptyText: 'Ne pas modifier',
                        value: null
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
        var code = me.down('#majCodeEdition').getValue();
        var bons = me.down('#majBonsParPage').getValue();
        var police = me.down('#majTaillePolice').getValue();
        // Un champ laisse vide veut dire « ne pas y toucher » : on ne l'envoie pas du tout.
        var parametres = {tiersPayants: Ext.encode(ids)};
        var resume = [];
        if (code) {
            parametres.codeEditBordereau = code;
            resume.push('code &eacute;dition = ' + code);
        }
        if (bons !== null && bons !== '') {
            parametres.nbBonsParPage = bons;
            resume.push('bons par page = ' + bons);
        }
        if (police !== null && police !== '') {
            parametres.taillePolice = police;
            resume.push('police = ' + (police > 0 ? police + ' pt' : 'automatique'));
        }
        if (!resume.length) {
            Ext.MessageBox.alert('Information',
                    'Renseignez au moins une valeur &agrave; appliquer. Un champ laiss&eacute; vide '
                    + 'n\'est pas modifi&eacute;.');
            return;
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
