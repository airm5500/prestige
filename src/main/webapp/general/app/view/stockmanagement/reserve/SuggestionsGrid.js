/* global Ext */

// Onglet SUGGESTIONS : espace de consultation et de traitement des suggestions de reserve.
// Une suggestion y est un objet durable, recherchable et auditable, et non plus un calcul
// affiche puis perdu.
Ext.define('testextjs.view.stockmanagement.reserve.SuggestionsGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'reservesuggestionsgrid',
    requires: [
        'testextjs.view.stockmanagement.reserve.action.traitementSuggestion',
        'testextjs.view.stockmanagement.reserve.action.inventaireSelection'
    ],
    border: false,
    frame: true,
    columnLines: true,

    // Libelles lisibles : l'utilisateur ne voit jamais les codes techniques.
    libelleCategorie: {
        RAYON: 'REAPPRO RAYON (envoi en rayon)',
        RESERVE: 'REAPPRO RESERVE (envoi en reserve)'
    },
    libelleStatut: {
        A_TRAITER: {texte: 'A traiter', couleur: '#b06000'},
        EN_COURS: {texte: 'En cours', couleur: '#0b57d0'},
        TRAITEE: {texte: 'Traitee', couleur: '#2a6b2e'},
        SUPPRIMEE: {texte: 'Supprimee', couleur: '#999999'},
        ANNULEE: {texte: 'Annulee', couleur: '#a8231c'}
    },

    initComponent: function () {
        var me = this;
        var baseUrl = '../api/v1/suggestion-reserve/';

        var store = new Ext.data.Store({
            pageSize: 25,
            autoLoad: false,
            fields: [
                'lg_SUGGESTION_RESERVE_ID', 'str_REF', 'str_CATEGORIE', 'str_ORIGINE', 'str_STATUT',
                'str_COMMENTAIRE', 'motif_id', 'motif_libelle',
                'str_USER_CREATEUR', 'str_USER_TRAITANT', 'str_USER_CLOTURE',
                'dt_CREATED', 'dt_UPDATED', 'dt_TRAITEE', 'dt_CLOTURE',
                'str_USER_CONTROLE', 'dt_CONTROLE', 'str_OBSERVATION_CONTROLE',
                {name: 'bl_CONTROLEE', type: 'boolean'},
                {name: 'nb_produits', type: 'int'}
            ],
            proxy: {
                type: 'ajax',
                url: baseUrl + 'liste',
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });
        me.store = store;

        var combo = function (itemId, empty, donnees, largeur) {
            return {
                xtype: 'combo', itemId: itemId, emptyText: empty, width: largeur || 150,
                editable: false, queryMode: 'local', displayField: 'libelle', valueField: 'valeur',
                store: new Ext.data.Store({
                    fields: ['valeur', 'libelle'],
                    data: [{valeur: '', libelle: empty}].concat(donnees)
                }),
                // Choisir une valeur declenche la recherche : le bouton devient facultatif.
                listeners: {
                    select: function () {
                        me.onRechercher();
                    }
                }
            };
        };

        // Utilisateurs ayant fait au moins un mouvement, comme sur l'onglet HISTORIQUE : on peut
        // ainsi retrouver les suggestions liees a une personne.
        var storeUsers = new Ext.data.Store({
            fields: ['lg_USER_ID', 'nom'],
            proxy: {type: 'ajax', url: '../api/v1/reserve/historique/utilisateurs', reader: {type: 'json'}}
        });
        storeUsers.load();

        // Motifs charges depuis le referentiel : ajouter un motif en base suffit a le voir ici.
        var storeMotifs = new Ext.data.Store({
            fields: ['id', 'libelle'],
            proxy: {type: 'ajax', url: baseUrl + 'motifs', reader: {type: 'json'}}
        });
        storeMotifs.load();

        // Les filtres sur la premiere ligne, separes par de vrais separateurs.
        // Choisir dans une liste lance directement la recherche : plus besoin de cliquer.
        var filtres = [
            {xtype: 'textfield', itemId: 'fSearch', emptyText: 'Produit ou CIP', width: 150,
                listeners: {
                    specialkey: function (f, e) {
                        if (e.getKey() === e.ENTER) {
                            f.dernierTerme = (f.getValue() || '').trim();
                            me.onRechercher();
                        }
                    },
                    // Recherche automatique a partir de 3 caracteres, apres une pause de frappe.
                    change: {
                        buffer: 800,
                        fn: function (f, v) {
                            var terme = (v || '').trim();
                            if (terme.length > 0 && terme.length < 3) {
                                return;
                            }
                            if (terme === f.dernierTerme) {
                                return;
                            }
                            f.dernierTerme = terme;
                            me.onRechercher();
                        }
                    }
                }},
            '-',
            combo('fStatut', 'Tous les statuts', [
                {valeur: 'A_TRAITER', libelle: 'A traiter'},
                {valeur: 'EN_COURS', libelle: 'En cours'},
                {valeur: 'TRAITEE', libelle: 'Traitee'},
                {valeur: 'SUPPRIMEE', libelle: 'Supprimee'},
                {valeur: 'ANNULEE', libelle: 'Annulee'}
            ], 135),
            combo('fCategorie', 'Les deux sens', [
                {valeur: 'RAYON', libelle: 'Vers le rayon'},
                {valeur: 'RESERVE', libelle: 'Vers la reserve'}
            ], 135),
            combo('fOrigine', 'Toutes origines', [
                {valeur: 'MANUELLE', libelle: 'Manuelle'},
                {valeur: 'AUTOMATIQUE', libelle: 'Automatique'},
                {valeur: 'SYSTEME', libelle: 'Systeme'}
            ], 130),
            {
                xtype: 'combo', itemId: 'fUser', emptyText: 'Tous les utilisateurs', width: 175,
                editable: false, queryMode: 'local', displayField: 'nom', valueField: 'lg_USER_ID',
                store: storeUsers,
                listeners: {select: function () {
                        me.onRechercher();
                    }}
            },
            {
                xtype: 'combo', itemId: 'fMotif', emptyText: 'Tous les motifs', width: 165,
                editable: false, queryMode: 'local', displayField: 'libelle', valueField: 'id',
                store: storeMotifs,
                listeners: {select: function () {
                        me.onRechercher();
                    }}
            },
            '-',
            {xtype: 'datefield', itemId: 'fDebut', emptyText: 'Du', format: 'd/m/Y', width: 100,
                listeners: {select: function () {
                        me.onRechercher();
                    }}},
            {xtype: 'datefield', itemId: 'fFin', emptyText: 'Au', format: 'd/m/Y', width: 100,
                listeners: {select: function () {
                        me.onRechercher();
                    }}}
        ];

        // Seconde ligne : les actions. La barre unique etait pleine, les boutons finissaient
        // hors du champ visible des que la fenetre retrecissait.
        // Ergonomie (07/10) : le controle et le tri y passent aussi ; en 1366 px ils sortaient
        // de la premiere ligne.
        var actions = [
            combo('fControle', 'Controle : tous', [
                {valeur: 'N', libelle: 'A controler'},
                {valeur: 'O', libelle: 'Controlees'}
            ], 140),
            '-',
            combo('fTri', 'Tri : date', [
                {valeur: 'date', libelle: 'Tri : date'},
                {valeur: 'statut', libelle: 'Tri : statut'},
                {valeur: 'utilisateur', libelle: 'Tri : utilisateur'}
            ], 130),
            '-',
            {text: 'Rechercher', scope: me, handler: me.onRechercher},
            {text: 'Reinitialiser', scope: me, handler: me.onReinitialiser},
            '-',
            {text: 'Creer un inventaire', scope: me, handler: me.onCreateInventaireLibre},
            '-',
            /* Plan du 08/11, point 9a : suppression des suggestions cochees, un seul motif, confirmation dans le bouton */
            {xtype: 'textfield', itemId: 'fMotifSuppression', emptyText: 'Motif de suppression', width: 190, maxLength: 500},
            {text: 'Supprimer la sélection', itemId: 'btnSupprimerSelection', disabled: true, scope: me,
                handler: me.onSupprimerSelection}
        ];

        // Boutons a icone, sur le meme modele que la suppression.
        var colOuvrir = {
            xtype: 'actioncolumn', header: '', width: 30, align: 'center',
            sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/page_white_edit.png',
                    tooltip: '<div style=\'white-space:normal;width:230px;line-height:1.5\'><b>Ouvrir la suggestion</b><br>Pour la consulter ou la traiter.</div>',
                    handler: function (g, rowIndex) {
                        me.ouvrir(g.getStore().getAt(rowIndex));
                    }
                }]
        };

        var colInventaire = {
            xtype: 'actioncolumn', header: '', width: 30, align: 'center',
            sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/inventaire.png',
                    tooltip: '<div style=\'white-space:normal;width:230px;line-height:1.5\'><b>Inventaire de cette suggestion</b><br>Cree un inventaire reserve portant sur ses produits.</div>',
                    handler: function (g, rowIndex) {
                        me.onCreerInventaire(g.getStore().getAt(rowIndex));
                    }
                }]
        };

        // Impression : le compte rendu si la suggestion a ete traitee, la suggestion sinon.
        var colImprimer = {
            xtype: 'actioncolumn', header: '', width: 30, align: 'center',
            sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/printer.png',
                    tooltip: '<div style=\'white-space:normal;width:230px;line-height:1.5\'><b>Imprimer</b><br>La suggestion tant qu\'elle est a traiter, le compte rendu une fois traitee.</div>',
                    handler: function (g, rowIndex) {
                        me.onImprimerLigne(g.getStore().getAt(rowIndex));
                    }
                }]
        };

        var colAnnuler = {
            xtype: 'actioncolumn', header: '', width: 30, align: 'center',
            sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/control_rewind.png',
                    tooltip: '<div style=\'white-space:normal;width:230px;line-height:1.5\'><b>Annuler les mouvements</b><br>Un mouvement inverse est cree : rien n\'est efface de l\'historique.</div>',
                    getClass: function (v, m, rec) {
                        // Rien a annuler tant que rien n'a ete deplace, et action reservee
                        // aux detenteurs du privilege.
                        return (rec.get('str_STATUT') === 'TRAITEE' && me.peutAnnuler)
                                ? '' : 'x-hidden';
                    },
                    handler: function (g, rowIndex) {
                        me.onAnnuler(g.getStore().getAt(rowIndex));
                    }
                }]
        };

        // Validation du controle : confirme que le deplacement a bien ete fait dans les rayons.
        // Une suggestion deja controlee affiche la coche verte, sans action possible : le nom du
        // premier controleur ne doit pas pouvoir etre remplace.
        var colControler = {
            xtype: 'actioncolumn', header: '', width: 30, align: 'center',
            sortable: false, menuDisabled: true,
            items: [{
                    getClass: function (v, m, rec) {
                        // Seule une suggestion traitee peut etre controlee ; une fois controlee,
                        // la coche reste visible mais l'action ne fait plus rien.
                        return (rec.get('str_STATUT') === 'TRAITEE') ? '' : 'x-hidden';
                    },
                    getTip: function (v, m, rec) {
                        return rec.get('bl_CONTROLEE')
                                ? 'Controlee par ' + (rec.get('str_USER_CONTROLE') || '')
                                        + ' le ' + (rec.get('dt_CONTROLE') || '')
                                : 'Confirmer que le deplacement a bien ete realise';
                    },
                    icon: 'resources/images/icons/fam/accept.png',
                    handler: function (g, rowIndex) {
                        me.onControler(g.getStore().getAt(rowIndex));
                    }
                }]
        };

        // Colonne separee, avec une marge : plus de confusion possible avec l'action d'ouverture.
        var colSupprimer = {
            xtype: 'actioncolumn', header: '', width: 40, align: 'center',
            sortable: false, menuDisabled: true,
            items: [
                {
                    icon: 'resources/images/icons/fam/delete.png',
                    tooltip: '<div style=\'white-space:normal;width:230px;line-height:1.5\'><b>Supprimer la suggestion</b><br>Suggestion manuelle : sans motif ; l\'icône passe au rouge, cliquez encore pour confirmer.<br>Impossible dès qu\'une ligne a été traitée.</div>',
                    getClass: function (v, m, rec) {
                        // Une suggestion cloturee ne peut plus etre supprimee : l'icone disparait.
                        var s = rec.get('str_STATUT');
                        if (s === 'TRAITEE' || s === 'SUPPRIMEE' || s === 'ANNULEE') {
                            return 'x-hidden';
                        }
                        return me.aConfirmer === rec.get('lg_SUGGESTION_RESERVE_ID') ? 'sugg-suppr sugg-suppr-confirmer' : 'sugg-suppr';
                    },
                    handler: function (g, rowIndex) {
                        var rec = g.getStore().getAt(rowIndex);
                        /* plan du 10/11, point 3 : une suggestion manuelle se supprime sans motif, confirmee sur l'icone */
                        if (rec && rec.get('str_ORIGINE') === 'MANUELLE') {
                            me.supprimerManuelle(rec);
                        } else {
                            me.onSupprimer(rec);
                        }
                    }
                }
            ]
        };

        Ext.apply(me, {
            store: store,
            // Case a cocher a gauche de la reference : cocher des suggestions puis cliquer
            // "Creer un inventaire" cible directement leurs produits.
            selModel: Ext.create('Ext.selection.CheckboxModel', {checkOnly: true, mode: 'MULTI'}),
            columns: [
                // Reference et date/heure elargies : elles doivent se lire en entier, sans troncature.
                {
                    // Meme code couleur que la colonne du sens : la reference se lit d'un coup
                    // d'oeil sans avoir a parcourir la ligne.
                    header: 'Reference', dataIndex: 'str_REF', width: 175,
                    renderer: function (v, m, rec) {
                        m.style = 'color:' + (rec.get('str_CATEGORIE') === 'RESERVE'
                                ? '#c26500' : '#256b2a') + ';font-weight:bold;';
                        return v;
                    }
                },
                {header: 'Creee le', dataIndex: 'dt_CREATED', width: 150,
                    /* Plan du 08/11, point 9b : une suggestion encore a traiter reste affichee quelle que soit la periode
                       (retour du 03/11) ; si elle est anterieure a la periode choisie, elle le dit. */
                    renderer: function (v, m, rec) {
                        return me.estAnterieure(rec) ? Ext.String.htmlEncode(v || '')
                                + ' <span class="sugg-ancienne" data-qtip="Encore à traiter : affichée quelle que soit la période choisie."'
                                + ' style="background:#fde7c8;color:#8a4b00;border-radius:3px;padding:0 4px;font-size:10px;font-weight:bold">ancienne</span>'
                                : Ext.String.htmlEncode(v || '');
                    }},
                {
                    header: 'Sens du mouvement', dataIndex: 'str_CATEGORIE', flex: 1, minWidth: 200,
                    renderer: function (v, m) {
                        // Meme code couleur que les onglets : reserve en orange, rayon en vert.
                        m.style = 'color:' + (v === 'RESERVE' ? '#c26500' : '#256b2a')
                                + ';font-weight:bold;';
                        return me.libelleCategorie[v] || v;
                    }
                },
                {
                    header: 'Produits', dataIndex: 'nb_produits', width: 70, align: 'center',
                    renderer: function (v, m) {
                        m.style = 'font-weight:bold;';
                        return v === null || v === undefined ? 0 : v;
                    }
                },
                {header: 'Origine', dataIndex: 'str_ORIGINE', width: 100},
                {
                    header: 'Statut', dataIndex: 'str_STATUT', width: 95, align: 'center',
                    renderer: function (v, m) {
                        var s = me.libelleStatut[v] || {texte: v, couleur: '#555555'};
                        m.style = 'color:' + s.couleur + ';font-weight:bold;';
                        return s.texte;
                    }
                },
                {header: 'Motif', dataIndex: 'motif_libelle', flex: 1, minWidth: 140},
                {header: 'Creee par', dataIndex: 'str_USER_CREATEUR', width: 120},
                {header: 'Traitee par', dataIndex: 'str_USER_TRAITANT', width: 120},
                {
                    header: 'Controle par', dataIndex: 'str_USER_CONTROLE', width: 140,
                    renderer: function (v, m, rec) {
                        if (rec.get('bl_CONTROLEE')) {
                            m.style = 'color:#2a6b2e;font-weight:bold;';
                            var obs = rec.get('str_OBSERVATION_CONTROLE');
                            m.tdAttr = 'data-qtip="Controlee le ' + (rec.get('dt_CONTROLE') || '')
                                    + (obs ? ' - ' + Ext.String.htmlEncode(obs) : '') + '"';
                            return v;
                        }
                        // Une suggestion non traitee n'a pas vocation a etre controlee : on ne
                        // signale l'attente que sur celles dont les mouvements sont passes.
                        if (rec.get('str_STATUT') === 'TRAITEE') {
                            m.style = 'color:#b06000;font-weight:bold;';
                            return 'A controler';
                        }
                        return '';
                    }
                },
                colOuvrir,
                colInventaire,
                colImprimer,
                colControler,
                colAnnuler,
                colSupprimer
            ],
            dockedItems: [
                {xtype: 'toolbar', dock: 'top', items: filtres},
                {xtype: 'toolbar', dock: 'top', items: actions},
                {xtype: 'pagingtoolbar', store: store, dock: 'bottom', displayInfo: true}
            ],
            viewConfig: {
                emptyText: 'Aucune suggestion. Utilisez "Voir les suggestions..." depuis les onglets REAPPRO ou REASSORT pour en creer une.',
                deferEmptyText: false
            },
            listeners: {
                itemdblclick: function (g, rec) {
                    me.ouvrir(rec);
                },
                selectionchange: function () {
                    me.majBoutonSuppression();
                }
            }
        });

        me.callParent();
        me.getStore().on('load', me.majBoutonSuppression, me);
    },

    /** Suggestion encore ouverte, creee avant le debut de la periode filtree. */
    estAnterieure: function (rec) {
        var debut = this.down('#fDebut'), d = debut && debut.getValue(), v = rec.get('dt_CREATED') || '',
                m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(v), s = rec.get('str_STATUT');
        if (!d || !m || (s !== 'A_TRAITER' && s !== 'EN_COURS')) {
            return false;
        }
        return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) < Ext.Date.clearTime(d, true);
    },

    /** Suggestions cochees qu'on peut encore supprimer (ni traitee, ni supprimee, ni annulee). */
    selectionSupprimable: function () {
        return Ext.Array.filter(this.getSelectionModel().getSelection() || [], function (r) {
            var s = r.get('str_STATUT');
            return s !== 'TRAITEE' && s !== 'SUPPRIMEE' && s !== 'ANNULEE';
        });
    },

    majBoutonSuppression: function () {
        var b = this.down('#btnSupprimerSelection'), n = this.selectionSupprimable().length;
        if (!b || b.prestigeConfirmation) {
            return;
        }
        b.setText(n > 0 ? 'Supprimer la sélection (' + n + ')' : 'Supprimer la sélection');
        b.setDisabled(n === 0);
    },

    /**
     * Plan du 08/11, point 9a. Premier clic : le bouton demande la confirmation (« Confirmer : supprimer n ? »),
     * second clic : suppression. Motif obligatoire, saisi dans la barre (aucune fenetre surgissante).
     */
    onSupprimerSelection: function (bouton) {
        var me = this, champ = me.down('#fMotifSuppression'), motif = Ext.String.trim(champ.getValue() || ''),
                lignes = me.selectionSupprimable();
        if (!lignes.length) {
            return;
        }
        /* plan du 10/11, point 3 : le motif n'est plus demande quand toutes les suggestions cochees sont manuelles */
        var automatiques = Ext.Array.filter(lignes, function (r) {
            return r.get('str_ORIGINE') !== 'MANUELLE';
        }).length;
        if (!motif && automatiques > 0) {
            champ.markInvalid('Motif obligatoire pour les suggestions automatiques (' + automatiques
                    + ') : il restera le seul moyen de savoir pourquoi elles ont disparu.');
            champ.focus(false, 20);
            return;
        }
        if (motif.length > 500) {
            champ.markInvalid('500 caractères maximum (saisi : ' + motif.length + ').');
            return;
        }
        PrestigeConfirmation.bouton(bouton, 'Confirmer : supprimer ' + lignes.length + ' ?', function () {
            Ext.Ajax.request({
                method: 'POST', url: '../api/v1/suggestion-reserve/supprimer-selection',
                jsonData: {ids: Ext.Array.map(lignes, function (r) {
                        return r.get('lg_SUGGESTION_RESERVE_ID');
                    }), motif: motif},
                success: function (rep) {
                    var o = Ext.JSON.decode(rep.responseText, true) || {}, refus = o.refus || [],
                            msg = (o.supprimees || 0) + ' suggestion(s) supprimée(s)'
                            + (o.ouvertesAilleurs ? ' (dont ' + o.ouvertesAilleurs + ' ouverte(s) sur un autre poste)' : '')
                            + (refus.length ? ', ' + refus.length + ' refusée(s) : '
                            + Ext.Array.map(refus, function (x) {
                                var r = me.getStore().findRecord('lg_SUGGESTION_RESERVE_ID', x.id, 0, false, true, true);
                                return (r ? r.get('str_REF') + ' - ' : '') + x.message;
                            }).join(' ; ') : '') + '.';
                    if (!o.supprimees && !refus.length) {
                        msg = o.message || 'Suppression impossible.';
                    }
                    me.dernierBilanSuppression = msg;
                    if (window.PrestigeToast) {
                        PrestigeToast.afficher(msg, {niveau: refus.length || !o.supprimees ? 'alerte' : 'ok', titre: 'Suppression'});
                    }
                    champ.setValue('');
                    me.getSelectionModel().deselectAll();
                    me.reloadGrid();
                },
                failure: function () {
                    me.dernierBilanSuppression = 'Suppression impossible.';
                    if (window.PrestigeToast) {
                        PrestigeToast.afficher('Suppression impossible.', {niveau: 'alerte', titre: 'Suppression'});
                    }
                }
            });
        });
    },

    /** Applique les filtres actifs puis recharge depuis la premiere page. */
    onRechercher: function () {
        var me = this;
        var params = me.filtresActifs();
        var tri = me.down('#fTri');
        params.tri = (tri && tri.getValue()) ? tri.getValue() : '';
        me.store.getProxy().extraParams = params;
        me.store.loadPage(1);
    },

    onReinitialiser: function () {
        var me = this;
        Ext.each(['fSearch', 'fStatut', 'fCategorie', 'fOrigine', 'fMotif', 'fUser', 'fDebut', 'fFin', 'fControle', 'fTri'],
                function (itemId) {
                    var c = me.down('#' + itemId);
                    if (c) {
                        c.setValue(null);
                    }
                });
        me.store.getProxy().extraParams = {};
        me.store.loadPage(1);
    },

    reloadGrid: function () {
        // Au premier affichage on se limite a la journee en cours : c'est ce qu'on vient
        // consulter dans la quasi-totalite des cas. Les dates restent modifiables pour
        // remonter plus loin. Retour du 03/11 : les suggestions encore a traiter s'affichent
        // toujours (le serveur n'applique les dates qu'aux suggestions closes).
        if (!this.filtreInitialise) {
            this.filtreInitialise = true;
            // Le droit d'annuler est demande une seule fois : il pilote l'affichage de l'icone.
            var grille = this;
            Ext.Ajax.request({
                method: 'GET', url: '../api/v1/reserve/peut-annuler',
                success: function (rep) {
                    var droit = Ext.JSON.decode(rep.responseText, true) || {};
                    grille.peutAnnuler = (droit.autorise === true);
                    grille.getView().refresh();
                }
            });
            var auj = new Date();
            var d = this.down('#fDebut'), fin = this.down('#fFin');
            if (d && !d.getValue()) {
                d.setValue(auj);
            }
            if (fin && !fin.getValue()) {
                fin.setValue(auj);
            }
            this.onRechercher();
            return;
        }
        this.store.loadPage(1);
    },

    ouvrir: function (rec) {
        if (!rec) {
            return;
        }
        Ext.create('testextjs.view.stockmanagement.reserve.action.traitementSuggestion', {
            suggestionid: rec.get('lg_SUGGESTION_RESERVE_ID'),
            parentview: this
        });
    },

    onAnnuler: function (rec) {
        var me = this;
        if (!rec) {
            return;
        }
        Ext.MessageBox.show({
            title: 'Annuler les mouvements',
            msg: 'Motif de l\'annulation pour ' + Ext.String.htmlEncode(rec.get('str_REF') || '') + ' :',
            buttons: Ext.MessageBox.OKCANCEL,
            prompt: true,
            width: 460,
            fn: function (btn, texte) {
                    if (btn !== 'ok') {
                        return;
                    }
                    var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Annulation en cours');
                    Ext.Ajax.request({
                        method: 'PUT',
                        url: '../api/v1/suggestion-reserve/'
                                + encodeURIComponent(rec.get('lg_SUGGESTION_RESERVE_ID')) + '/annuler',
                        jsonData: {motif: texte || ''},
                        success: function (response) {
                            progress.hide();
                            var res = Ext.JSON.decode(response.responseText, true) || {};
                            Ext.MessageBox.alert('Resultat de l\'annulation',
                                    (res.message || '')
                                    + (res.total_refuse > 0
                                        ? '<br><br>Ouvrez la suggestion pour le detail des refus.' : ''));
                            me.reloadGrid();
                        },
                        failure: function () {
                            progress.hide();
                            Ext.MessageBox.alert('Erreur', 'L\'annulation a echoue.');
                        }
                    });
                }
        });
    },

    // Confirme que le deplacement a bien ete realise sur le terrain. L'observation est
    // facultative : elle sert a signaler un ecart constate au moment du controle.
    onControler: function (rec) {
        var me = this;
        if (!rec || rec.get('bl_CONTROLEE')) {
            if (rec && rec.get('bl_CONTROLEE')) {
                Ext.MessageBox.alert('Deja controlee',
                        'Controlee par ' + Ext.String.htmlEncode(rec.get('str_USER_CONTROLE') || '')
                        + ' le ' + Ext.String.htmlEncode(rec.get('dt_CONTROLE') || '') + '.');
            }
            return;
        }
        Ext.MessageBox.show({
            title: 'Confirmer le controle',
            msg: 'Vous confirmez que le deplacement de la suggestion '
                    + Ext.String.htmlEncode(rec.get('str_REF') || '')
                    + ' a bien ete realise.<br>Observation (facultative) :',
            buttons: Ext.MessageBox.OKCANCEL,
            prompt: true,
            width: 480,
            fn: function (btn, texte) {
                    if (btn !== 'ok') {
                        return;
                    }
                    Ext.Ajax.request({
                        method: 'PUT',
                        url: '../api/v1/suggestion-reserve/'
                                + encodeURIComponent(rec.get('lg_SUGGESTION_RESERVE_ID')) + '/controler',
                        jsonData: {observation: texte || ''},
                        success: function (response) {
                            var res = Ext.JSON.decode(response.responseText, true) || {};
                            if (res.success === false) {
                                Ext.MessageBox.alert('Controle impossible', res.message || '');
                                return;
                            }
                            me.reloadGrid();
                        },
                        failure: function () {
                            Ext.MessageBox.alert('Erreur', 'L\'enregistrement du controle a echoue.');
                        }
                    });
                }
        });
    },

    onImprimerLigne: function (rec) {
        if (!rec) {
            return;
        }
        // Une suggestion traitee s'imprime sous forme de compte rendu ; sinon on imprime la
        // suggestion elle-meme, celle qu'on emmene dans les rayons.
        var mode = (rec.get('str_STATUT') === 'TRAITEE') ? 'compte_rendu' : 'suggestion';
        window.open('../webservices/stockmanagement/reserve/ws_generate_pdf_suggestion.jsp?mode='
                + mode + '&id=' + encodeURIComponent(rec.get('lg_SUGGESTION_RESERVE_ID')), '_blank');
    },

    // Inventaire libre, sans partir d'une suggestion : la fenetre de selection porte sa propre
    // recherche par CIP ou par nom. A distinguer de l'icone par ligne, qui inventorie les
    // produits d'une suggestion precise.
    onCreateInventaireLibre: function () {
        var me = this;
        // Suggestions cochees : on part directement sur leurs produits, sans passer par la vue
        // de selection. Sinon la vue s'ouvre sur les produits des suggestions AFFICHEES.
        var cochees = me.getSelectionModel().getSelection() || [];
        if (cochees.length > 0) {
            var ids = [];
            Ext.each(cochees, function (rec) {
                ids.push(rec.get('lg_SUGGESTION_RESERVE_ID'));
            });
            Ext.create('testextjs.view.stockmanagement.reserve.action.inventaireSelection', {
                source: '../api/v1/suggestion-reserve/produits',
                sourceparams: {ids: ids.join(',')},
                soustitre: cochees.length + ' suggestion(s) cochee(s)'
            });
            return;
        }
        Ext.create('testextjs.view.stockmanagement.reserve.action.inventaireSelection', {
            source: '../api/v1/suggestion-reserve/produits',
            sourceparams: me.filtresActifs(),
            soustitre: 'produits des suggestions affichees'
        });
    },

    /** Filtres actifs de l'onglet, partages par la recherche et par la creation d'inventaire. */
    filtresActifs: function () {
        var me = this;
        var val = function (itemId) {
            var c = me.down('#' + itemId);
            return c && c.getValue() ? c.getValue() : '';
        };
        var dateVal = function (itemId) {
            var c = me.down('#' + itemId);
            return (c && c.getValue()) ? Ext.Date.format(c.getValue(), 'Y-m-d') : '';
        };
        return {
            search_value: val('fSearch'),
            statut: val('fStatut'),
            categorie: val('fCategorie'),
            origine: val('fOrigine'),
            motifId: val('fMotif'),
            userId: val('fUser'),
            dtStart: dateVal('fDebut'),
            dtEnd: dateVal('fFin'),
            controle: val('fControle')
        };
    },

    onCreerInventaire: function (rec) {
        var me = this;
        if (!rec) {
            return;
        }
        Ext.MessageBox.confirm('Creer un inventaire',
                'Creer un inventaire reserve sur les ' + (rec.get('nb_produits') || 0)
                + ' produit(s) de la suggestion ' + Ext.String.htmlEncode(rec.get('str_REF') || '') + ' ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/suggestion-reserve/'
                                + encodeURIComponent(rec.get('lg_SUGGESTION_RESERVE_ID')) + '/inventaire',
                        jsonData: {},
                        success: function (response) {
                            progress.hide();
                            var res = Ext.JSON.decode(response.responseText, true) || {};
                            Ext.MessageBox.alert(res.success === false ? 'Message' : 'Inventaire cree',
                                    res.message || res.msg || 'Inventaire cree.');
                        },
                        failure: function () {
                            progress.hide();
                            Ext.MessageBox.alert('Erreur', 'La creation de l\'inventaire a echoue.');
                        }
                    });
                });
    },

    /**
     * Plan du 10/11, point 3 : suppression d'une suggestion MANUELLE, sans motif ni fenetre. Premier clic : l'icone
     * passe au rouge de confirmation (« Cliquez encore pour confirmer ») pendant 5 s ; second clic : suppression.
     * Memes delais que PrestigeConfirmation.bouton (5 s, double clic accidentel de moins de 400 ms ignore).
     */
    supprimerManuelle: function (rec) {
        var me = this, id = rec.get('lg_SUGGESTION_RESERVE_ID'), maintenant = Date.now();
        if (!Ext.get('sugg-suppr-style')) {
            Ext.util.CSS.createStyleSheet('.sugg-suppr-confirmer{background-color:#c0392b !important;border-radius:3px;'
                    + 'box-shadow:0 0 0 3px #c0392b}', 'sugg-suppr-style');
        }
        var rafraichir = function () {
            var i = me.getStore().indexOf(rec);
            if (!me.isDestroyed && i >= 0) {
                me.getView().refreshNode(i);
            }
        };
        if (me.aConfirmer !== id) {
            me.aConfirmer = id;
            me.aConfirmerDepuis = maintenant;
            rafraichir();
            clearTimeout(me.aConfirmerMinuterie);
            me.aConfirmerMinuterie = setTimeout(function () {
                if (me.aConfirmer === id) {
                    me.aConfirmer = null;
                    rafraichir();
                }
            }, 5000);
            return;
        }
        if (maintenant - me.aConfirmerDepuis < 400) {
            return;
        }
        clearTimeout(me.aConfirmerMinuterie);
        me.aConfirmer = null;
        rafraichir();
        Ext.Ajax.request({
            method: 'DELETE',
            url: '../api/v1/suggestion-reserve/' + encodeURIComponent(id),
            success: function (response) {
                var res = Ext.JSON.decode(response.responseText, true) || {};
                if (window.PrestigeToast) {
                    PrestigeToast.afficher(res.success === false ? (res.message || 'Suppression impossible.')
                            : (res.message || 'Suggestion ' + rec.get('str_REF') + ' supprimée.'), {niveau: res.success === false ? 'alerte' : 'ok', titre: 'Suppression'});
                }
                me.dernierBilanSuppression = res.message || '';
                if (res.success !== false) {
                    me.reloadGrid();
                }
            },
            failure: function () {
                if (window.PrestigeToast) {
                    PrestigeToast.afficher('Suppression impossible.', {niveau: 'alerte', titre: 'Suppression'});
                }
            }
        });
    },

    /**
     * @param {Object} rec suggestion a supprimer
     * @param {String} motifPrecedent saisie a reafficher quand on redemande le motif (ne pas la perdre)
     */
    onSupprimer: function (rec, motifPrecedent) {
        var me = this;
        if (!rec) {
            return;
        }
        Ext.MessageBox.show({
            title: 'Supprimer la suggestion',
            msg: 'Motif de la suppression (obligatoire, 500 caractères maximum) :',
            buttons: Ext.MessageBox.OKCANCEL,
            prompt: true,
            value: motifPrecedent || '',
            width: 460,
            fn: function (btn, text) {
                    if (btn !== 'ok') {
                        return;
                    }
                    var motif = (text || '').trim();
                    // Motif obligatoire : une fois la suggestion supprimee, il reste le seul element
                    // permettant de comprendre pourquoi elle a disparu. On redemande en conservant la
                    // saisie plutot que de la faire retaper.
                    if (motif.length === 0) {
                        Ext.MessageBox.alert('Motif obligatoire',
                                'Indiquez le motif de la suppression : il restera le seul moyen de savoir '
                                + 'pourquoi cette suggestion a été supprimée.',
                                function () {
                                    me.onSupprimer(rec, text);
                                });
                        return;
                    }
                    // Borne alignee sur la colonne str_COMMENTAIRE (500) : mieux vaut le dire ici que
                    // laisser le serveur tronquer en silence.
                    if (motif.length > 500) {
                        Ext.MessageBox.alert('Motif trop long',
                                'Le motif ne doit pas dépasser 500 caractères (saisi : ' + motif.length + ').',
                                function () {
                                    me.onSupprimer(rec, text);
                                });
                        return;
                    }
                    Ext.Ajax.request({
                        method: 'DELETE',
                        url: '../api/v1/suggestion-reserve/'
                                + encodeURIComponent(rec.get('lg_SUGGESTION_RESERVE_ID'))
                                + '?motif=' + encodeURIComponent(motif),
                        success: function (response) {
                            var res = Ext.JSON.decode(response.responseText, true) || {};
                            if (res.success === false) {
                                Ext.MessageBox.alert('Suppression impossible', res.message || '');
                                return;
                            }
                            me.dernierBilanSuppression = res.message || '';
                            if (window.PrestigeToast && res.message) {
                                PrestigeToast.afficher(res.message, {niveau: 'ok', titre: 'Suppression'});
                            }
                            me.reloadGrid();
                        },
                        failure: function () {
                            Ext.MessageBox.alert('Erreur', 'Suppression impossible.');
                        }
                    });
                }
        });
    }
});
