/* global Ext */
/*
 * Retours du 09/10 (6) : fidelite clients parametrable.
 *  - onglet « Clients » : soldes de points, valeur, palier, points qui expirent ; historique du client choisi ;
 *    utilisation et ajustement des points saisis directement sous la liste (pas de fenetre) ;
 *  - onglet « Parametres » : activation, montant pour 1 point, valeur d'un point, seuil d'utilisation, expiration,
 *    ventes assurance, date de debut ; paliers modifies dans la liste ; categories de produits exclues (cases).
 * Les points sont tires des ventes cloturees (« Mettre a jour les points »), sans rien changer a la vente.
 * API v1/fidelite.
 */
Ext.define('testextjs.view.configmanagement.client.fidelite.FideliteClients', {
    extend: 'Ext.panel.Panel',
    xtype: 'fideliteclients',
    title: 'Fidélité clients',
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
                        {text: 'Rechercher', itemId: 'rechercher', cls: 'btn-primary', iconCls: 'searchicon', handler: function () {
                                me.chercher();
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
                                            xtype: 'grid', itemId: 'grilleCategories', title: 'Catégories de produits exclues des points', store: me.categories, flex: 1,
                                            columnLines: true,
                                            columns: [
                                                {xtype: 'checkcolumn', text: 'Exclue', dataIndex: 'exclue', width: 75, itemId: 'colExclue',
                                                    listeners: {
                                                        beforecheckchange: function () {
                                                            return !!(me.droits && me.droits.parametrer);
                                                        },
                                                        checkchange: function (c, i, coche) {
                                                            me.exclure(me.categories.getAt(i), coche);
                                                        }
                                                    }},
                                                {text: 'Catégorie', dataIndex: 'libelle', flex: 1, renderer: enc},
                                                {text: 'Produits', dataIndex: 'produits', width: 90, align: 'right'}
                                            ]
                                        }]
                                }]
                        }]
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
        me.down('#clientChoisi').setText('');
        me.clients.loadPage(1);
    },

    choisir: function (r) {
        var me = this;
        me.clientCourant = r;
        me.down('#barreActions').enable();
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
    }
});
