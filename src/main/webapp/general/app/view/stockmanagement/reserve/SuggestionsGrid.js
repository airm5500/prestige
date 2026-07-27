/* global Ext */

// Onglet SUGGESTIONS : espace de consultation et de traitement des suggestions de reserve.
// Une suggestion y est un objet durable, recherchable et auditable, et non plus un calcul
// affiche puis perdu.
Ext.define('testextjs.view.stockmanagement.reserve.SuggestionsGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'reservesuggestionsgrid',
    requires: [
        'testextjs.view.stockmanagement.reserve.action.traitementSuggestion'
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
                'dt_CREATED', 'dt_UPDATED', 'dt_TRAITEE', 'dt_CLOTURE'
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
                })
            };
        };

        // Motifs charges depuis le referentiel : ajouter un motif en base suffit a le voir ici.
        var storeMotifs = new Ext.data.Store({
            fields: ['id', 'libelle'],
            proxy: {type: 'ajax', url: baseUrl + 'motifs', reader: {type: 'json'}}
        });
        storeMotifs.load();

        var filtres1 = [
            {xtype: 'textfield', itemId: 'fSearch', emptyText: 'Produit ou CIP', width: 160},
            combo('fStatut', 'Tous les statuts', [
                {valeur: 'A_TRAITER', libelle: 'A traiter'},
                {valeur: 'EN_COURS', libelle: 'En cours'},
                {valeur: 'TRAITEE', libelle: 'Traitee'},
                {valeur: 'SUPPRIMEE', libelle: 'Supprimee'}
            ]),
            combo('fCategorie', 'Les deux sens', [
                {valeur: 'RAYON', libelle: 'Vers le rayon'},
                {valeur: 'RESERVE', libelle: 'Vers la reserve'}
            ]),
            combo('fOrigine', 'Toutes origines', [
                {valeur: 'MANUELLE', libelle: 'Manuelle'},
                {valeur: 'AUTOMATIQUE', libelle: 'Automatique'},
                {valeur: 'SYSTEME', libelle: 'Systeme'}
            ], 140)
        ];

        var filtres2 = [
            {
                xtype: 'combo', itemId: 'fMotif', emptyText: 'Tous les motifs', width: 190,
                editable: false, queryMode: 'local', displayField: 'libelle', valueField: 'id',
                store: storeMotifs
            },
            {xtype: 'datefield', itemId: 'fDebut', emptyText: 'Du', format: 'd/m/Y', width: 110},
            {xtype: 'datefield', itemId: 'fFin', emptyText: 'Au', format: 'd/m/Y', width: 110},
            combo('fTri', 'Tri : date', [
                {valeur: 'date', libelle: 'Tri : date'},
                {valeur: 'statut', libelle: 'Tri : statut'},
                {valeur: 'utilisateur', libelle: 'Tri : utilisateur'}
            ], 140),
            {text: 'Rechercher', scope: me, handler: me.onRechercher},
            {text: 'Reinitialiser', scope: me, handler: me.onReinitialiser}
        ];

        var colAction = {
            xtype: 'actioncolumn', header: 'Actions', width: 60, sortable: false, menuDisabled: true,
            items: [
                {
                    icon: 'resources/images/icons/fam/application_form_edit.png',
                    tooltip: 'Ouvrir et traiter',
                    handler: function (g, rowIndex) {
                        me.ouvrir(g.getStore().getAt(rowIndex));
                    }
                },
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
                {header: 'Reference', dataIndex: 'str_REF', width: 130},
                {header: 'Creee le', dataIndex: 'dt_CREATED', width: 115},
                {
                    header: 'Sens du mouvement', dataIndex: 'str_CATEGORIE', flex: 1, minWidth: 200,
                    renderer: function (v) {
                        return me.libelleCategorie[v] || v;
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
                colAction
            ],
            dockedItems: [
                {xtype: 'toolbar', dock: 'top', items: filtres1},
                {xtype: 'toolbar', dock: 'top', items: filtres2},
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
        me.on('afterlayout', me.reloadGrid, me, {delay: 1, single: true});
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
            tri: val('fTri')
        };
        me.store.loadPage(1);
    },

    onReinitialiser: function () {
        var me = this;
        Ext.each(['fSearch', 'fStatut', 'fCategorie', 'fOrigine', 'fMotif', 'fDebut', 'fFin', 'fTri'],
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
