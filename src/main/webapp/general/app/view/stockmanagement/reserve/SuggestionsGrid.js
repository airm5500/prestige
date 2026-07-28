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
        SUPPRIMEE: {texte: 'Supprimee', couleur: '#999999'}
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

        // Motifs charges depuis le referentiel : ajouter un motif en base suffit a le voir ici.
        var storeMotifs = new Ext.data.Store({
            fields: ['id', 'libelle'],
            proxy: {type: 'ajax', url: baseUrl + 'motifs', reader: {type: 'json'}}
        });
        storeMotifs.load();

        // Tous les filtres sur UNE seule ligne, separes par de vrais separateurs.
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
                        buffer: 400,
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
                {valeur: 'SUPPRIMEE', libelle: 'Supprimee'}
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
                    }}},
            '-',
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
            '->',
            {text: 'Creer un inventaire', scope: me, handler: me.onCreateInventaireLibre}
        ];

        // Boutons a icone, sur le meme modele que la suppression.
        var colOuvrir = {
            xtype: 'actioncolumn', header: '', width: 30, align: 'center',
            sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/page_white_edit.png',
                    tooltip: 'Ouvrir la suggestion pour la consulter ou la traiter',
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
                    tooltip: 'Creer un inventaire reserve sur les produits de cette suggestion',
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
                    tooltip: 'Imprimer (compte rendu si la suggestion est traitee)',
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
                    tooltip: 'Annuler les mouvements par mouvement inverse',
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
                    tooltip: 'Supprimer la suggestion',
                    getClass: function (v, m, rec) {
                        // Une suggestion cloturee ne peut plus etre supprimee : l'icone disparait.
                        var s = rec.get('str_STATUT');
                        return (s === 'TRAITEE' || s === 'SUPPRIMEE') ? 'x-hidden' : '';
                    },
                    handler: function (g, rowIndex) {
                        me.onSupprimer(g.getStore().getAt(rowIndex));
                    }
                }
            ]
        };

        Ext.apply(me, {
            store: store,
            columns: [
                // Reference et date/heure elargies : elles doivent se lire en entier, sans troncature.
                {header: 'Reference', dataIndex: 'str_REF', width: 175},
                {header: 'Creee le', dataIndex: 'dt_CREATED', width: 135},
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
                {xtype: 'pagingtoolbar', store: store, dock: 'bottom', displayInfo: true}
            ],
            viewConfig: {
                emptyText: 'Aucune suggestion. Utilisez "Voir les suggestions..." depuis les onglets REAPPRO ou REASSORT pour en creer une.',
                deferEmptyText: false
            },
            listeners: {
                itemdblclick: function (g, rec) {
                    me.ouvrir(rec);
                }
            }
        });

        me.callParent();
    },

    /** Applique les filtres actifs puis recharge depuis la premiere page. */
    onRechercher: function () {
        var me = this;
        var val = function (itemId) {
            var c = me.down('#' + itemId);
            return c && c.getValue() ? c.getValue() : '';
        };
        var dateVal = function (itemId) {
            var c = me.down('#' + itemId);
            return (c && c.getValue()) ? Ext.Date.format(c.getValue(), 'Y-m-d') : '';
        };
        me.store.getProxy().extraParams = {
            search_value: val('fSearch'),
            statut: val('fStatut'),
            categorie: val('fCategorie'),
            origine: val('fOrigine'),
            motifId: val('fMotif'),
            dtStart: dateVal('fDebut'),
            dtEnd: dateVal('fFin'),
            controle: val('fControle'),
            tri: val('fTri')
        };
        me.store.loadPage(1);
    },

    onReinitialiser: function () {
        var me = this;
        Ext.each(['fSearch', 'fStatut', 'fCategorie', 'fOrigine', 'fMotif', 'fDebut', 'fFin', 'fControle', 'fTri'],
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
        // remonter plus loin.
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
        Ext.MessageBox.prompt('Annuler les mouvements',
                'Motif de l\'annulation pour ' + Ext.String.htmlEncode(rec.get('str_REF') || '') + ' :',
                function (btn, texte) {
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
        Ext.MessageBox.prompt('Confirmer le controle',
                'Vous confirmez que le deplacement de la suggestion '
                + Ext.String.htmlEncode(rec.get('str_REF') || '')
                + ' a bien ete realise.<br>Observation (facultative) :',
                function (btn, texte) {
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
        Ext.create('testextjs.view.stockmanagement.reserve.action.inventaireSelection', {
            typetransaction: 'ALL'
        });
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

    onSupprimer: function (rec) {
        var me = this;
        if (!rec) {
            return;
        }
        Ext.MessageBox.prompt('Supprimer la suggestion',
                'Motif de la suppression (facultatif) :',
                function (btn, text) {
                    if (btn !== 'ok') {
                        return;
                    }
                    Ext.Ajax.request({
                        method: 'DELETE',
                        url: '../api/v1/suggestion-reserve/'
                                + encodeURIComponent(rec.get('lg_SUGGESTION_RESERVE_ID'))
                                + '?motif=' + encodeURIComponent(text || ''),
                        success: function (response) {
                            var res = Ext.JSON.decode(response.responseText, true) || {};
                            if (res.success === false) {
                                Ext.MessageBox.alert('Suppression impossible', res.message || '');
                                return;
                            }
                            me.reloadGrid();
                        },
                        failure: function () {
                            Ext.MessageBox.alert('Erreur', 'Suppression impossible.');
                        }
                    });
                });
    }
});
