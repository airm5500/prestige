/* global Ext */
/*
 * Retours du 09/10 (6) : fidelite clients parametrable.
 *  - onglet « Clients » : soldes de points, valeur, palier, points qui expirent ; historique du client choisi ;
 *    utilisation et ajustement des points saisis directement sous la liste (pas de fenetre) ;
 *  - onglet « Parametres » : activation, montant pour 1 point, valeur d'un point, seuil d'utilisation, expiration,
 *    ventes assurance, date de debut ; paliers modifies dans la liste ; categories de produits exclues (cases).
 * Les points sont tires des ventes cloturees (« Mettre a jour les points »), sans rien changer a la vente.
 * Retours du 10/10 (section 15) : libelle « Points fidélité » ; editions PDF / Excel (clients, historique, analyse) ;
 * exclusions par familles d'articles OU par emplacements (zone geographique / rayon), jamais les deux ; onglet Analyse.
 * API v1/fidelite.
 */
Ext.define('testextjs.view.configmanagement.client.fidelite.FideliteClients', {
    extend: 'Ext.panel.Panel',
    xtype: 'fideliteclients',
    title: 'Points fidélité',
    layout: 'fit',
    cls: 'fid-ecran',
    config: {nameintern: '', titre: '', data: null},

    TYPES: {
        GAIN: {texte: 'Achat', couleur: '#17795f'},
        ANNULATION: {texte: 'Vente annulée / modifiée', couleur: '#b42318'},
        EXPIRATION: {texte: 'Expiration', couleur: '#8a94a0'},
        UTILISATION: {texte: 'Utilisation', couleur: '#1f5f9e'},
        AJUSTEMENT: {texte: 'Ajustement', couleur: '#b26a00'},
        RESTITUTION: {texte: 'Points rendus (vente annulée)', couleur: '#17795f'}
    },

    initComponent: function () {
        var me = this, enc = Ext.String.htmlEncode;
        var nombre = function (v) {
            return v === null || v === undefined || v === '' ? '' : (v < 0 ? '-' : '') + Ext.util.Format.number(Math.abs(v), '0,000');
        };
        me.nombre = nombre;
        me.clients = Ext.create('Ext.data.Store', {
            fields: ['id', 'nom', 'telephone', {name: 'solde', type: 'int'}, {name: 'valeur', type: 'int'}, {name: 'acquis12Mois', type: 'int'},
                'palier', 'prochainPalier', {name: 'manque', type: 'int'}, {name: 'expireBientot', type: 'int'}, {name: 'utilisable', type: 'boolean'},
                'derniereOperation'],
            pageSize: 50, remoteSort: false,
            proxy: {type: 'ajax', url: '../api/v1/fidelite/clients', reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    st.getProxy().extraParams = {query: me.down('#recherche').getValue() || ''};
                }
            }
        });
        me.historiqueStore = Ext.create('Ext.data.Store', {
            fields: ['type', {name: 'points', type: 'int'}, 'restants', 'base', 'coefficient', 'reference', 'motif', 'valeur', 'date', 'expiration', 'par'],
            proxy: {type: 'memory', reader: {type: 'json'}}
        });
        me.paliers = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', {name: 'seuil', type: 'int'}, {name: 'coefficient', type: 'float'}],
            proxy: {type: 'memory', reader: {type: 'json'}}
        });
        me.categories = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', {name: 'produits', type: 'int'}, {name: 'exclue', type: 'boolean'}],
            proxy: {type: 'memory', reader: {type: 'json'}}
        });
        me.emplacements = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', 'code', {name: 'produits', type: 'int'}, {name: 'exclue', type: 'boolean'}],
            proxy: {type: 'memory', reader: {type: 'json'}}
        });
        var colonneExclue = function (store, faire) {
            return {xtype: 'checkcolumn', text: 'Exclue', dataIndex: 'exclue', width: 75, itemId: 'colExclue',
                listeners: {
                    beforecheckchange: function () {
                        return !!(me.droits && me.droits.parametrer);
                    },
                    checkchange: function (c, i, coche) {
                        faire.call(me, store.getAt(i), coche);
                    }
                }};
        };
        Ext.apply(me, {
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'barreFidelite',
                    items: [
                        {xtype: 'textfield', itemId: 'recherche', width: 300, emptyText: 'Nom, prénom, téléphone ou code du client', maxLength: 60,
                            enableKeyEvents: true, listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.chercher();
                                    }
                                }}},
                        {text: 'Rechercher', itemId: 'rechercher', cls: 'btn-primary', iconCls: 'searchicon', tooltip: 'Rechercher un client (nom, téléphone, code)',
                            handler: function () {
                                me.chercher();
                            }},
                        '-',
                        {text: 'Imprimer', itemId: 'clientsPdf', iconCls: 'printable', tooltip: 'Imprimer la liste des clients et de leurs points (PDF, même recherche)',
                            handler: function () {
                                me.editer('clients/pdf', {query: me.down('#recherche').getValue() || ''});
                            }},
                        {text: 'Excel', itemId: 'clientsExcel', iconCls: 'export_excel_icon', tooltip: 'Exporter la liste des clients et de leurs points (Excel, même recherche)',
                            handler: function () {
                                me.editer('clients/excel', {query: me.down('#recherche').getValue() || ''});
                            }},
                        '->',
                        {text: 'Mettre à jour les points', itemId: 'synchroniser',
                            tooltip: 'Compte les points des ventes clôturées, retire ceux des ventes annulées ou modifiées et ceux qui ont expiré', handler: function () {
                                me.synchroniser(true);
                            }}
                    ]
                }, {
                    xtype: 'container', dock: 'top', itemId: 'bandeau', cls: 'pb-bandeau', padding: '6 8', html: ''
                }],
            items: [{
                    xtype: 'tabpanel', itemId: 'onglets', plain: true, border: false,
                    items: [{
                            title: 'Clients', itemId: 'ongletClients', layout: 'border', border: false,
                            items: [{
                                    region: 'center', xtype: 'grid', itemId: 'grilleClients', store: me.clients, columnLines: true,
                                    viewConfig: {emptyText: 'Aucun client avec des points. Recherchez un client par son nom ou son téléphone.', deferEmptyText: false},
                                    columns: [
                                        {text: 'Client', dataIndex: 'nom', flex: 1, minWidth: 180, renderer: enc},
                                        {text: 'Téléphone', dataIndex: 'telephone', width: 120, renderer: enc},
                                        {text: 'Points', dataIndex: 'solde', width: 90, align: 'right', renderer: function (v) {
                                                return '<b style="color:' + (v < 0 ? '#b42318' : '#17795f') + '">' + nombre(v) + '</b>';
                                            }},
                                        {text: 'Valeur (FCFA)', dataIndex: 'valeur', width: 115, align: 'right', renderer: nombre},
                                        {text: 'Palier', dataIndex: 'palier', width: 100, renderer: function (v, m, r) {
                                                if (r.get('prochainPalier')) {
                                                    m.tdAttr = 'data-qtip="' + enc(r.get('manque') + ' point(s) de plus sur 12 mois pour « ' + r.get('prochainPalier') + ' »') + '"';
                                                }
                                                return v ? '<span class="pb-pastille" style="color:#1f5f9e;background:#e4effa">' + enc(v) + '</span>' : '';
                                            }},
                                        {text: 'Acquis sur 12 mois', dataIndex: 'acquis12Mois', width: 145, align: 'right', renderer: nombre},
                                        {text: 'Expirent sous 30 j', dataIndex: 'expireBientot', width: 140, align: 'right', renderer: function (v) {
                                                return v ? '<b style="color:#b26a00">' + nombre(v) + '</b>' : '';
                                            }},
                                        {text: 'Dernière opération', dataIndex: 'derniereOperation', width: 150}
                                    ],
                                    dockedItems: [{xtype: 'pagingtoolbar', dock: 'bottom', store: me.clients, displayInfo: true}],
                                    listeners: {select: function (s, r) {
                                            me.choisir(r);
                                        }}
                                }, {
                                    region: 'south', split: true, height: 300, xtype: 'grid', itemId: 'grilleHistorique', store: me.historiqueStore,
                                    columnLines: true, title: 'Historique des points', collapsible: false,
                                    viewConfig: {emptyText: 'Choisissez un client dans la liste.', deferEmptyText: false},
                                    dockedItems: [{
                                            xtype: 'toolbar', dock: 'top', itemId: 'barreHistorique', disabled: true,
                                            items: ['->',
                                                {text: 'Imprimer l\'historique', itemId: 'historiquePdf', iconCls: 'printable', tooltip: 'Imprimer l\'historique des points du client choisi (PDF)',
                                                    handler: function () {
                                                        me.editerHistorique('pdf');
                                                    }},
                                                {text: 'Excel', itemId: 'historiqueExcel', iconCls: 'export_excel_icon', tooltip: 'Exporter l\'historique des points du client choisi (Excel)',
                                                    handler: function () {
                                                        me.editerHistorique('excel');
                                                    }}]
                                        }, {
                                            xtype: 'toolbar', dock: 'top', itemId: 'barreActions', disabled: true,
                                            items: [
                                                {xtype: 'tbtext', itemId: 'clientChoisi', text: ''},
                                                '-',
                                                {xtype: 'numberfield', itemId: 'pointsUtiliser', width: 90, minValue: 1, allowDecimals: false, hideTrigger: true, emptyText: 'Points'},
                                                {xtype: 'textfield', itemId: 'referenceUtiliser', width: 150, emptyText: 'N° ticket ou bon', maxLength: 60, enforceMaxLength: true},
                                                {text: 'Utiliser', itemId: 'utiliser', cls: 'btn-primary', tooltip: 'Retirer des points du client (bon d\'achat, remise accordée)', handler: function () {
                                                        me.utiliser();
                                                    }},
                                                '-',
                                                {xtype: 'numberfield', itemId: 'pointsAjuster', width: 90, allowDecimals: false, hideTrigger: true, emptyText: '+/- points'},
                                                {xtype: 'textfield', itemId: 'motifAjuster', width: 200, emptyText: 'Motif (obligatoire)', maxLength: 150, enforceMaxLength: true},
                                                {text: 'Ajuster', itemId: 'ajuster', tooltip: 'Ajouter (geste commercial) ou retirer des points, avec un motif', handler: function () {
                                                        me.ajuster();
                                                    }}
                                            ]
                                        }],
                                    columns: [
                                        {text: 'Date', dataIndex: 'date', width: 135},
                                        {text: 'Opération', dataIndex: 'type', width: 180, renderer: function (v) {
                                                var t = me.TYPES[v] || {texte: v, couleur: '#333'};
                                                return '<span style="color:' + t.couleur + ';font-weight:600">' + enc(t.texte) + '</span>';
                                            }},
                                        {text: 'Points', dataIndex: 'points', width: 85, align: 'right', renderer: function (v) {
                                                return '<b style="color:' + (v < 0 ? '#b42318' : '#17795f') + '">' + (v > 0 ? '+' : '') + nombre(v) + '</b>';
                                            }},
                                        {text: 'Référence', dataIndex: 'reference', width: 150, renderer: enc},
                                        {text: 'Détail', dataIndex: 'motif', flex: 1, minWidth: 180, renderer: function (v, m, r) {
                                                var d = [];
                                                if (r.get('type') === 'GAIN') {
                                                    d.push('Achat de ' + nombre(r.get('base')) + ' FCFA éligibles' + (r.get('coefficient') && r.get('coefficient') !== 1 ? ' × ' + r.get('coefficient') : ''));
                                                }
                                                if (r.get('valeur')) {
                                                    d.push(nombre(r.get('valeur')) + ' FCFA');
                                                }
                                                if (v) {
                                                    d.push(v);
                                                }
                                                return enc(d.join(' — '));
                                            }},
                                        {text: 'Expire le', dataIndex: 'expiration', width: 95},
                                        {text: 'Par', dataIndex: 'par', width: 140, renderer: enc}
                                    ]
                                }]
                        }, {
                            title: 'Paramètres', itemId: 'ongletParametres', layout: {type: 'vbox', align: 'stretch'}, border: false, autoScroll: true,
                            items: [{
                                    xtype: 'container', itemId: 'formParametres', layout: 'column', padding: '10 10 0 10',
                                    defaults: {columnWidth: 0.33, labelWidth: 210, padding: '0 16 8 0'},
                                    items: [
                                        {xtype: 'checkbox', itemId: 'actif', fieldLabel: 'Fidélité activée', boxLabel: 'les ventes rapportent des points'},
                                        {xtype: 'numberfield', itemId: 'montantPoint', fieldLabel: 'Montant d\'achat pour 1 point (FCFA)', minValue: 1, maxValue: 1000000, allowDecimals: false,
                                            listeners: {change: function () {
                                                    me.exemple();
                                                }}},
                                        {xtype: 'numberfield', itemId: 'valeurPoint', fieldLabel: 'Valeur d\'un point (FCFA)', minValue: 0, maxValue: 100000, allowDecimals: false,
                                            listeners: {change: function () {
                                                    me.exemple();
                                                }}},
                                        {xtype: 'numberfield', itemId: 'seuil', fieldLabel: 'Points minimum pour utiliser', minValue: 0, allowDecimals: false},
                                        {xtype: 'numberfield', itemId: 'expirationMois', fieldLabel: 'Expiration des points (mois, 0 = jamais)', minValue: 0, maxValue: 120, allowDecimals: false},
                                        {xtype: 'datefield', itemId: 'debut', fieldLabel: 'Ventes prises en compte à partir du', format: 'd/m/Y', maxValue: new Date()},
                                        {xtype: 'checkbox', itemId: 'assurance', fieldLabel: 'Ventes assurance', boxLabel: 'points sur la part payée par le client'},
                                        {xtype: 'container', itemId: 'exemple', columnWidth: 0.67, html: ''}
                                    ]
                                }, {
                                    xtype: 'toolbar', items: [{text: 'Enregistrer les paramètres', itemId: 'enregistrerParametres', cls: 'btn-primary', handler: function () {
                                                me.enregistrerParametres();
                                            }}, {xtype: 'tbtext', itemId: 'infoParametres', text: ''}]
                                }, {
                                    xtype: 'container', layout: {type: 'hbox', align: 'stretch'}, height: 320, padding: '6 10 10 10',
                                    items: [{
                                            xtype: 'grid', itemId: 'grillePaliers', title: 'Paliers (points acquis sur 12 mois)', store: me.paliers, flex: 1, margin: '0 10 0 0',
                                            columnLines: true,
                                            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1, listeners: {
                                                        beforeedit: function () {
                                                            return me.droits && me.droits.parametrer;
                                                        },
                                                        edit: function (ed, e) {
                                                            if (e.value !== e.originalValue) {
                                                                me.enregistrerPalier(e.record);
                                                            }
                                                        }
                                                    }})],
                                            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [{text: 'Ajouter un palier', itemId: 'ajouterPalier', handler: function () {
                                                                me.ajouterPalier();
                                                            }}, {xtype: 'tbtext', text: 'Cliquez une valeur pour la modifier.'}]}],
                                            columns: [
                                                {text: 'Palier', dataIndex: 'libelle', flex: 1, editor: {xtype: 'textfield', allowBlank: false, maxLength: 40, enforceMaxLength: true}, renderer: enc},
                                                {text: 'À partir de (points)', dataIndex: 'seuil', width: 160, align: 'right', editor: {xtype: 'numberfield', minValue: 0, allowDecimals: false}},
                                                {text: 'Points × ', dataIndex: 'coefficient', width: 100, align: 'right', editor: {xtype: 'numberfield', minValue: 0.1, maxValue: 10, decimalPrecision: 2}},
                                                {xtype: 'actioncolumn', width: 40, items: [{iconCls: 'act-ico act-supprimer', tooltip: 'Supprimer ce palier', handler: function (g, i) {
                                                                me.supprimerPalier(me.paliers.getAt(i));
                                                            }}]}
                                            ]
                                        }, {
                                            /* retours du 10/10 : exclusions par familles OU par emplacements, jamais les deux */
                                            xtype: 'panel', itemId: 'panneauExclusions', flex: 1, layout: 'card', border: true,
                                            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'barreExclusions', items: [
                                                        {xtype: 'tbtext', text: 'Exclure des points par :'},
                                                        {text: 'Familles d\'articles', itemId: 'modeFamilles', toggleGroup: 'fid-mode-' + me.id, allowDepress: false, pressed: true,
                                                            tooltip: 'Les produits des familles cochées ne rapportent pas de points', handler: function () {
                                                                me.changerMode('FAMILLES');
                                                            }},
                                                        {text: 'Emplacements (rayons)', itemId: 'modeEmplacements', toggleGroup: 'fid-mode-' + me.id, allowDepress: false,
                                                            tooltip: 'Les produits rangés dans les emplacements cochés (zone géographique / rayon) ne rapportent pas de points',
                                                            handler: function () {
                                                                me.changerMode('EMPLACEMENTS');
                                                            }}]},
                                                {xtype: 'container', dock: 'top', itemId: 'infoExclusions', cls: 'pb-bandeau', padding: '4 8', html: ''}],
                                            items: [{
                                                    xtype: 'grid', itemId: 'grilleCategories', title: 'Catégories de produits exclues des points', store: me.categories,
                                                    columnLines: true,
                                                    columns: [
                                                        colonneExclue(me.categories, me.exclure),
                                                        {text: 'Catégorie', dataIndex: 'libelle', flex: 1, renderer: enc},
                                                        {text: 'Produits', dataIndex: 'produits', width: 90, align: 'right'}
                                                    ]
                                                }, {
                                                    xtype: 'grid', itemId: 'grilleEmplacements', title: 'Emplacements (zone géographique / rayon) exclus des points',
                                                    store: me.emplacements, columnLines: true,
                                                    columns: [
                                                        colonneExclue(me.emplacements, me.exclureEmplacement),
                                                        {text: 'Emplacement', dataIndex: 'libelle', flex: 1, renderer: enc},
                                                        {text: 'Code', dataIndex: 'code', width: 90, renderer: enc},
                                                        {text: 'Produits', dataIndex: 'produits', width: 90, align: 'right'}
                                                    ]
                                                }]
                                        }]
                                }]
                        }, me.creerAnalyse()]
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.demarrer();
        }, me, {single: true});
    },

    appel: function (url, methode, donnees, succes) {
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/fidelite/' + url, method: methode, jsonData: donnees || undefined,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                succes.call(me, o);
            },
            failure: function () {
                Ext.MessageBox.alert('Fidélité', 'Le serveur ne répond pas.');
            }
        });
    },

    demarrer: function () {
        var me = this;
        me.appel('droits', 'GET', null, function (o) {
            me.droits = o.success ? o : {utiliser: false, parametrer: false};
            me.down('#barreActions').setVisible(!!me.droits.utiliser);
            me.down('#modeFamilles').setDisabled(!me.droits.parametrer);
            me.down('#modeEmplacements').setDisabled(!me.droits.parametrer);
            Ext.Array.each(['actif', 'montantPoint', 'valeurPoint', 'seuil', 'expirationMois', 'debut', 'assurance'], function (i) {
                me.down('#' + i).setReadOnly(!me.droits.parametrer);
            });
            me.down('#enregistrerParametres').setVisible(!!me.droits.parametrer);
            me.down('#ajouterPalier').setVisible(!!me.droits.parametrer);
            me.chargerParametres();
            me.synchroniser(false);
        });
    },

    synchroniser: function (message) {
        var me = this;
        me.appel('synchroniser', 'POST', null, function (o) {
            if (message && o.success) {
                Ext.MessageBox.alert('Fidélité', o.actif ? (o.gains + ' vente(s) comptée(s), ' + o.annulations + ' annulation(s), ' + o.expirations + ' expiration(s).'
                        + (o.suite ? ' D\'autres ventes restent à compter : relancez la mise à jour.' : '')) : 'La fidélité n\'est pas activée (onglet Paramètres).');
            }
            me.majBandeau();
            me.clients.loadPage(1);
        });
    },

    majBandeau: function () {
        var me = this, n = me.nombre;
        me.appel('synthese', 'GET', null, function (o) {
            if (!o.success) {
                me.down('#bandeau').update(Ext.String.htmlEncode(o.msg || ''));
                return;
            }
            me.down('#bandeau').update((o.actif ? '<b style="color:#17795f">Fidélité activée</b>' : '<b style="color:#b42318">Fidélité désactivée</b> (onglet Paramètres)')
                    + ' &nbsp;|&nbsp; <b>' + n(o.clients) + '</b> client(s) avec des points &nbsp;|&nbsp; <b>' + n(o.points) + '</b> points, soit <b>' + n(o.valeur) + '</b> FCFA'
                    + ' &nbsp;|&nbsp; expirent sous 30 jours : <b>' + n(o.expirent30j) + '</b>'
                    + (o.synchro ? ' &nbsp;|&nbsp; <span class="pb-discret">mis à jour le ' + Ext.String.htmlEncode(o.synchro) + '</span>' : ''));
        });
    },

    chercher: function () {
        var me = this;
        me.historiqueStore.removeAll();
        me.clientCourant = null;
        /* sinon la selection gardee au rechargement ne declenche plus le choix du client */
        me.down('#grilleClients').getSelectionModel().deselectAll(true);
        me.down('#barreActions').disable();
        me.down('#barreHistorique').disable();
        me.down('#clientChoisi').setText('');
        me.clients.loadPage(1);
    },

    choisir: function (r) {
        var me = this;
        me.clientCourant = r;
        me.down('#barreActions').enable();
        me.down('#barreHistorique').enable();
        me.down('#clientChoisi').setText('<b>' + Ext.String.htmlEncode(r.get('nom')) + '</b> : ' + me.nombre(r.get('solde')) + ' point(s)');
        me.chargerHistorique();
    },

    chargerHistorique: function () {
        var me = this, r = me.clientCourant;
        if (!r) {
            return;
        }
        me.appel('client/' + encodeURIComponent(r.get('id')) + '/historique', 'GET', null, function (o) {
            me.historiqueStore.loadData(o.data || []);
        });
    },

    /* apres une operation : solde a jour dans la liste et l'historique, client garde selectionne */
    apresOperation: function (o) {
        var me = this, r = me.clientCourant;
        if (!o.success) {
            Ext.MessageBox.alert('Fidélité', Ext.String.htmlEncode(o.msg || 'Opération impossible.'));
            return;
        }
        r.set('solde', o.solde);
        r.set('valeur', o.valeur);
        r.commit();
        me.down('#clientChoisi').setText('<b>' + Ext.String.htmlEncode(r.get('nom')) + '</b> : ' + me.nombre(o.solde) + ' point(s)');
        me.chargerHistorique();
        me.majBandeau();
    },

    utiliser: function () {
        var me = this, r = me.clientCourant, pts = me.down('#pointsUtiliser').getValue();
        if (!r || !pts || pts <= 0) {
            Ext.MessageBox.alert('Fidélité', 'Indiquez le nombre de points à utiliser.');
            return;
        }
        Ext.MessageBox.confirm('Fidélité', 'Utiliser ' + pts + ' point(s) de ' + Ext.String.htmlEncode(r.get('nom')) + ' ?', function (b) {
            if (b !== 'yes') {
                return;
            }
            me.appel('client/' + encodeURIComponent(r.get('id')) + '/utiliser', 'POST',
                    {points: pts, reference: me.down('#referenceUtiliser').getValue() || ''}, function (o) {
                if (o.success) {
                    me.down('#pointsUtiliser').reset();
                    me.down('#referenceUtiliser').reset();
                }
                me.apresOperation(o);
            });
        });
    },

    ajuster: function () {
        var me = this, r = me.clientCourant, pts = me.down('#pointsAjuster').getValue(), motif = Ext.String.trim(me.down('#motifAjuster').getValue() || '');
        if (!r || !pts) {
            Ext.MessageBox.alert('Fidélité', 'Indiquez les points à ajouter (ou à retirer, avec un signe moins).');
            return;
        }
        if (motif.length < 3) {
            Ext.MessageBox.alert('Fidélité', 'Indiquez le motif de l\'ajustement.');
            return;
        }
        Ext.MessageBox.confirm('Fidélité', (pts > 0 ? 'Ajouter ' : 'Retirer ') + Math.abs(pts) + ' point(s) à ' + Ext.String.htmlEncode(r.get('nom')) + ' ?', function (b) {
            if (b !== 'yes') {
                return;
            }
            me.appel('client/' + encodeURIComponent(r.get('id')) + '/ajuster', 'POST', {points: pts, motif: motif}, function (o) {
                if (o.success) {
                    me.down('#pointsAjuster').reset();
                    me.down('#motifAjuster').reset();
                }
                me.apresOperation(o);
            });
        });
    },

    /* ------------------------------------------------ parametres */

    chargerParametres: function () {
        var me = this;
        me.appel('parametres', 'GET', null, function (o) {
            if (o.success) {
                me.afficherParametres(o);
            }
        });
    },

    afficherParametres: function (o) {
        var me = this;
        me.parametres = o;
        me.down('#actif').setValue(!!o.actif);
        me.down('#montantPoint').setValue(o.montantPoint);
        me.down('#valeurPoint').setValue(o.valeurPoint);
        me.down('#seuil').setValue(o.seuil);
        me.down('#expirationMois').setValue(o.expirationMois);
        me.down('#assurance').setValue(!!o.assurance);
        me.down('#debut').setValue(o.debut ? Ext.Date.parse(o.debut, 'Y-m-d') : null);
        me.paliers.loadData(o.paliers || []);
        me.categories.loadData(o.categories || []);
        me.emplacements.loadData(o.emplacements || []);
        me.afficherMode(o.modeExclusion || 'FAMILLES');
        me.exemple();
    },

    exemple: function () {
        var me = this, m = me.down('#montantPoint').getValue(), v = me.down('#valeurPoint').getValue(), n = me.nombre;
        if (!m || v === null || v === undefined) {
            me.down('#exemple').update('');
            return;
        }
        var pts = Math.floor(10000 / m);
        me.down('#exemple').update('<div class="pb-bandeau" style="padding:6px 8px">Exemple : un achat de <b>10 000</b> FCFA rapporte <b>' + n(pts) + '</b> point(s),'
                + ' soit <b>' + n(pts * v) + '</b> FCFA rendus au client (' + Ext.util.Format.number(100 * v / m, '0.00') + ' % de ses achats, avant palier).</div>');
    },

    enregistrerParametres: function () {
        var me = this, d = me.down('#debut').getValue();
        me.appel('parametres', 'PUT', {
            actif: me.down('#actif').getValue(), montantPoint: me.down('#montantPoint').getValue(), valeurPoint: me.down('#valeurPoint').getValue(),
            seuil: me.down('#seuil').getValue(), expirationMois: me.down('#expirationMois').getValue(), assurance: me.down('#assurance').getValue(),
            debut: d ? Ext.Date.format(d, 'Y-m-d') : ''
        }, function (o) {
            if (!o.success) {
                Ext.MessageBox.alert('Fidélité', Ext.String.htmlEncode(o.msg || 'Enregistrement impossible.'));
                return;
            }
            me.afficherParametres(o);
            me.down('#infoParametres').setText('<span style="color:#17795f">Paramètres enregistrés.</span>');
            me.synchroniser(false);
        });
    },

    enregistrerPalier: function (rec) {
        var me = this;
        me.appel('palier', 'PUT', {id: rec.get('id') || '', libelle: rec.get('libelle'), seuil: rec.get('seuil'), coefficient: rec.get('coefficient')}, function (o) {
            if (!o.success) {
                Ext.MessageBox.alert('Fidélité', Ext.String.htmlEncode(o.msg || 'Palier refusé.'));
                me.paliers.loadData((me.parametres && me.parametres.paliers) || []);
                return;
            }
            me.parametres = o;
            me.paliers.loadData(o.paliers || []);
        });
    },

    ajouterPalier: function () {
        var me = this, max = 0;
        me.paliers.each(function (r) {
            max = Math.max(max, r.get('seuil'));
        });
        me.appel('palier', 'PUT', {libelle: 'Nouveau palier', seuil: max + 500, coefficient: 1}, function (o) {
            if (!o.success) {
                Ext.MessageBox.alert('Fidélité', Ext.String.htmlEncode(o.msg || 'Palier refusé.'));
                return;
            }
            me.parametres = o;
            me.paliers.loadData(o.paliers || []);
            var r = me.paliers.findRecord('id', o.palierId), g = me.down('#grillePaliers');
            if (r) {
                g.plugins[0].startEdit(r, g.columns[0]);
            }
        });
    },

    supprimerPalier: function (rec) {
        var me = this;
        if (!me.droits || !me.droits.parametrer || !rec) {
            return;
        }
        Ext.MessageBox.confirm('Fidélité', 'Supprimer le palier « ' + Ext.String.htmlEncode(rec.get('libelle')) + ' » ?', function (b) {
            if (b !== 'yes') {
                return;
            }
            me.appel('palier/' + encodeURIComponent(rec.get('id')), 'DELETE', null, function (o) {
                if (o.success) {
                    me.parametres = o;
                    me.paliers.loadData(o.paliers || []);
                } else {
                    Ext.MessageBox.alert('Fidélité', Ext.String.htmlEncode(o.msg || 'Suppression impossible.'));
                }
            });
        });
    },

    exclure: function (rec, coche) {
        var me = this;
        me.appel('exclusion/' + encodeURIComponent(rec.get('id')) + '?exclue=' + (coche ? 'true' : 'false'), 'PUT', null, function (o) {
            if (o.success) {
                rec.commit();
            } else {
                rec.reject();
                Ext.MessageBox.alert('Fidélité', Ext.String.htmlEncode(o.msg || 'Modification impossible.'));
            }
        });
    },

    /* ------------------------------------------------ retours du 10/10 (section 15) */

    /** Edition PDF / Excel : ouverte dans un nouvel onglet du navigateur (lecture seule). */
    editer: function (chemin, params) {
        window.open('../api/v1/fidelite/' + chemin + (params ? '?' + Ext.Object.toQueryString(params) : ''), '_blank');
    },

    editerHistorique: function (format) {
        var r = this.clientCourant;
        if (r) {
            this.editer('client/' + encodeURIComponent(r.get('id')) + '/historique/' + format);
        }
    },

    MODES: {
        FAMILLES: 'Exclusions par <b>familles d\'articles</b> : les emplacements cochés ne s\'appliquent pas tant que ce mode est choisi.',
        EMPLACEMENTS: 'Exclusions par <b>emplacements</b> (zone géographique / rayon) : les familles cochées ne s\'appliquent pas tant que ce mode est choisi.'
    },

    afficherMode: function (mode) {
        var me = this, p = me.down('#panneauExclusions');
        me.down('#modeFamilles').toggle(mode !== 'EMPLACEMENTS', true);
        me.down('#modeEmplacements').toggle(mode === 'EMPLACEMENTS', true);
        p.getLayout().setActiveItem(me.down(mode === 'EMPLACEMENTS' ? '#grilleEmplacements' : '#grilleCategories'));
        me.down('#infoExclusions').update('<span style="font-size:11px">' + me.MODES[mode === 'EMPLACEMENTS' ? 'EMPLACEMENTS' : 'FAMILLES']
                + ' Les points déjà acquis ne changent pas.</span>');
    },

    changerMode: function (mode) {
        var me = this, actuel = (me.parametres && me.parametres.modeExclusion) || 'FAMILLES';
        if (mode === actuel) {
            me.afficherMode(mode);
            return;
        }
        me.appel('mode-exclusion?mode=' + mode, 'PUT', null, function (o) {
            if (!o.success) {
                me.afficherMode(actuel);
                Ext.MessageBox.alert('Fidélité', Ext.String.htmlEncode(o.msg || 'Modification impossible.'));
                return;
            }
            me.afficherParametres(o);
            me.down('#infoParametres').setText('<span style="color:#17795f">' + Ext.String.htmlEncode(o.msg || '') + '</span>');
        });
    },

    exclureEmplacement: function (rec, coche) {
        var me = this;
        me.appel('exclusion-emplacement/' + encodeURIComponent(rec.get('id')) + '?exclue=' + (coche ? 'true' : 'false'), 'PUT', null, function (o) {
            if (o.success) {
                rec.commit();
            } else {
                rec.reject();
                Ext.MessageBox.alert('Fidélité', Ext.String.htmlEncode(o.msg || 'Modification impossible.'));
            }
        });
    },

    creerAnalyse: function () {
        var me = this, aujourdhui = new Date();
        return {
            title: 'Analyse', itemId: 'ongletAnalyse', autoScroll: true, bodyPadding: 12, cls: 'fid-analyse',
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'barreAnalyse', items: [
                        {xtype: 'datefield', itemId: 'anDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.add(Ext.Date.getFirstDateOfMonth(aujourdhui), Ext.Date.MONTH, -11), maxValue: aujourdhui,
                            tooltip: 'Début de la période (date des opérations de points)'},
                        {xtype: 'datefield', itemId: 'anFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui, tooltip: 'Fin de la période'},
                        {text: 'Actualiser', itemId: 'anActualiser', iconCls: 'refresh', tooltip: 'Recalculer l\'analyse sur la période', handler: function () {
                                me.chargerAnalyse();
                            }},
                        '->',
                        {text: 'Imprimer', itemId: 'analysePdf', iconCls: 'printable', tooltip: 'Imprimer l\'analyse (PDF, même période)', handler: function () {
                                me.editer('analyse/pdf', me.criteresAnalyse());
                            }},
                        {text: 'Excel', itemId: 'analyseExcel', iconCls: 'export_excel_icon', tooltip: 'Exporter l\'analyse (Excel, même période)', handler: function () {
                                me.editer('analyse/excel', me.criteresAnalyse());
                            }}]}],
            items: [{xtype: 'component', itemId: 'anContenu', html: '<div style="color:#7f8c8d">Chargement…</div>'}],
            listeners: {activate: function () {
                    me.chargerAnalyse();
                }}
        };
    },

    criteresAnalyse: function () {
        return {dtStart: this.down('#anDebut').getSubmitValue(), dtEnd: this.down('#anFin').getSubmitValue()};
    },

    chargerAnalyse: function () {
        var me = this, onglet = me.down('#ongletAnalyse'), contenu = me.down('#anContenu'), c = me.criteresAnalyse();
        if (c.dtStart && c.dtEnd && c.dtStart > c.dtEnd) {
            contenu.update('<span style="color:#b42318">La date de début doit précéder la date de fin.</span>');
            return;
        }
        onglet.setLoading('Calcul…');
        me.analyseDonnees = null;
        Ext.Ajax.request({url: '../api/v1/fidelite/analyse', method: 'GET', params: c, timeout: 120000,
            success: function (r) {
                if (onglet.isDestroyed) {
                    return;
                }
                onglet.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    contenu.update('<span style="color:#b42318">' + Ext.String.htmlEncode(o.msg || 'Analyse indisponible') + '</span>');
                    return;
                }
                me.analyseDonnees = o;
                contenu.update(me.htmlAnalyse(o));
            },
            failure: function (r) {
                if (!onglet.isDestroyed) {
                    onglet.setLoading(false);
                    contenu.update('<span style="color:#b42318">Le serveur n\'a pas répondu (' + r.status + ').</span>');
                }
            }});
    },

    MOIS: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],

    htmlAnalyse: function (o) {
        var me = this, enc = Ext.String.htmlEncode, t = o.total || {}, nb = function (v) {
            return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }, dec = function (v) {
            return String(v || 0).replace('.', ',');
        };
        var tuile = function (cls, titre, valeur, detail, aide) {
            return '<div class="pml-tuile ' + cls + '" data-qtip="' + enc(aide) + '"><div class="pml-tuile-valeur">' + valeur + '</div>'
                    + '<div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        var html = '<div class="pml-tuiles fid-tuiles">'
                + tuile('info', 'Clients actifs', nb(t.clientsActifs), 'une opération sur la période', 'Clients ayant gagné, utilisé, perdu ou reçu des points sur la période')
                + tuile('ok', 'Points gagnés', nb(t.gagnes), nb(t.annules) + ' annulé(s)', 'Points des achats, moins ceux des ventes annulées ou modifiées')
                + tuile('', 'Points utilisés', nb(t.utilises), dec(t.tauxUtilisation) + ' % des gagnés', 'Taux d\'utilisation : points utilisés ÷ points gagnés')
                + tuile(t.expires ? 'alerte' : 'ok', 'Points expirés', nb(t.expires), 'perdus par les clients', 'Points arrivés à expiration sans être utilisés')
                + tuile('', 'Coût des points', nb(t.cout) + ' F', 'valeur des points utilisés', 'Valeur en FCFA des points utilisés (bons, paiements)')
                + tuile('', 'Ajustements', nb(t.ajustements), 'gestes commerciaux', 'Points ajoutés ou retirés à la main')
                + '</div>';
        var lignes = '';
        Ext.each(o.mois || [], function (m) {
            var p = String(m.mois).split('-');
            lignes += '<tr class="fid-mois"><td>' + (p.length === 2 ? me.MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0] : enc(m.mois)) + '</td><td class="n fid-plus">' + nb(m.gagnes)
                    + '</td><td class="n">' + nb(m.annules) + '</td><td class="n fid-moins">' + nb(m.utilises) + '</td><td class="n">' + nb(m.expires)
                    + '</td><td class="n">' + nb(m.ajustements) + '</td><td class="n">' + nb(m.cout) + '</td><td class="n">' + dec(m.tauxUtilisation) + ' %</td></tr>';
        });
        html += '<div class="ac-bloc-t" style="margin-top:14px">Points par mois</div>'
                + '<table class="ac-table fid-par-mois"><tr><th>Mois</th><th class="n">Gagnés</th><th class="n">Annulés</th><th class="n">Utilisés</th>'
                + '<th class="n">Expirés</th><th class="n">Ajustements</th><th class="n">Coût (F)</th><th class="n">Taux d\'utilisation</th></tr>'
                + (lignes || '<tr><td colspan="8" style="color:#7f8c8d">Aucune opération sur la période.</td></tr>') + '</table>';
        lignes = '';
        Ext.each(o.paliers || [], function (p) {
            lignes += '<tr class="fid-palier"><td>' + enc(p.palier) + '</td><td class="n">' + p.clients + '</td><td class="n">' + dec(p.part) + ' %</td>'
                    + '<td class="rf-barre"><div style="width:' + Math.max(p.clients ? 2 : 0, Math.round(p.part)) + '%"></div></td></tr>';
        });
        var meilleurs = '';
        Ext.each(o.meilleurs || [], function (c, i) {
            meilleurs += '<tr class="fid-meilleur"><td class="n">' + (i + 1) + '</td><td>' + enc(c.nom) + '</td><td>' + enc(c.palier || '') + '</td><td class="n">'
                    + nb(c.gagnes) + '</td><td class="n">' + nb(c.utilises) + '</td><td class="n">' + nb(c.solde) + '</td></tr>';
        });
        html += '<div class="rf-deux"><div class="rf-col"><div class="ac-bloc-t" style="margin-top:14px">Clients actifs par palier</div>'
                + '<table class="ac-table fid-paliers"><tr><th>Palier</th><th class="n">Clients</th><th class="n">Part</th><th style="width:40%"></th></tr>'
                + (lignes || '<tr><td colspan="4" style="color:#7f8c8d">Aucun client actif.</td></tr>') + '</table></div>'
                + '<div class="rf-col"><div class="ac-bloc-t" style="margin-top:14px">Meilleurs clients (points gagnés)</div>'
                + '<table class="ac-table fid-meilleurs"><tr><th class="n">#</th><th>Client</th><th>Palier</th><th class="n">Gagnés</th><th class="n">Utilisés</th>'
                + '<th class="n">Solde</th></tr>' + (meilleurs || '<tr><td colspan="6" style="color:#7f8c8d">Aucun client actif.</td></tr>') + '</table></div></div>';
        return html;
    }
});
