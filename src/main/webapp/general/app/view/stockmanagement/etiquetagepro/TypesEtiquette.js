/* global Ext */
/*
 * Etiquettage Pro, onglet « Types d'étiquette » (retours du 11/10) :
 *  - les types d'etiquette de Prestige (t_typeetiquette, porte par la fiche article) ; chaque nouveau type designe un
 *    code (code-barres, DataMatrix, QR, DataMatrix+, QR+) ; les types d'origine sont gardes tels quels (sans code : ils
 *    s'impriment comme avant) ; creation et modification dans l'ecran ;
 *  - mise a jour selective : filtres (zone geographique, famille, grossiste, type actuel, recherche), produits a cocher
 *    ou tout le filtre, nouveau type, confirmation dans l'ecran ; chaque mise a jour est tracee et peut etre annulee.
 * Modification reservee au droit P_SM_ETIQUETTE_TYPE (administrateur par defaut) ; sinon lecture seule. Aucune fenetre.
 * API v1/etiquetage-pro/types...
 */
Ext.define('testextjs.view.stockmanagement.etiquetagepro.TypesEtiquette', {
    extend: 'Ext.panel.Panel',
    xtype: 'etqtypes',
    requires: ['testextjs.view.commun.FiltresMulti'],
    border: false,
    layout: {type: 'hbox', align: 'stretch'},

    initComponent: function () {
        var me = this;
        me.typesStore = Ext.create('Ext.data.Store', {fields: ['id', 'nom', 'description', 'code', {name: 'ancien', type: 'boolean'},
                {name: 'actif', type: 'boolean'}, {name: 'produits', type: 'int'}], proxy: {type: 'memory'}});
        me.typesCibleStore = Ext.create('Ext.data.Store', {fields: ['id', 'nom', 'code'], proxy: {type: 'memory'}});
        me.typesFiltreStore = Ext.create('Ext.data.Store', {fields: ['id', 'nom'], proxy: {type: 'memory'}});
        me.codesStore = Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], proxy: {type: 'memory'}});
        me.zonesStore = Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], proxy: {type: 'memory'}});
        me.famillesStore = Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], proxy: {type: 'memory'}});
        me.grossistesStore = Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], proxy: {type: 'memory'}});
        me.journalStore = Ext.create('Ext.data.Store', {fields: ['lot', 'le', 'par', {name: 'produits', type: 'int'}, 'type',
                {name: 'annule', type: 'boolean'}], proxy: {type: 'memory'}});
        me.produitsStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'cip', 'designation', 'zone', 'famille', 'grossiste', 'type', 'code', 'typeId'],
            pageSize: 50, remoteSort: false,
            proxy: {type: 'ajax', url: '../api/v1/etiquetage-pro/types/produits', actionMethods: {read: 'POST'},
                paramsAsJson: true, reader: {type: 'json', root: 'data', totalProperty: 'total'},
                buildRequest: function (operation) {
                    var req = Ext.data.proxy.Ajax.prototype.buildRequest.apply(this, arguments);
                    req.jsonData = {filtres: me.filtres(), start: operation.start || 0, limit: operation.limit || 50};
                    req.params = {};
                    return req;
                }}
        });
        var combo = function (id, label, store, largeur) {
            return {xtype: 'combobox', itemId: id, fieldLabel: label, labelWidth: label.length * 6 + 10, width: largeur, store: store,
                valueField: 'id', displayField: 'libelle', queryMode: 'local', forceSelection: true, anyMatch: true, editable: true,
                emptyText: 'Tous', margin: '0 8 0 0'};
        };
        me.items = [
            {xtype: 'panel', width: 430, layout: {type: 'vbox', align: 'stretch'}, border: false, items: [
                    {xtype: 'gridpanel', itemId: 'typesGrille', title: 'Types d\'étiquette', flex: 1, store: me.typesStore, columnLines: true,
                        columns: [
                            {text: 'Type', dataIndex: 'nom', flex: 1, renderer: function (v, m, r) {
                                    return Ext.String.htmlEncode(v) + (r.get('ancien') ? ' <span style="color:#5b6b7b">(d\'origine)</span>' : '')
                                            + (r.get('actif') ? '' : ' <span style="color:#b42318">(désactivé)</span>');
                                }},
                            {text: 'Code imprimé', dataIndex: 'code', width: 150, renderer: function (v, m, r) {
                                    return r.get('ancien') ? '<span style="color:#5b6b7b">celui de l\'impression</span>' : Ext.String.htmlEncode(me.libelleCode(v));
                                }},
                            {text: 'Produits', dataIndex: 'produits', width: 70, align: 'right'}
                        ],
                        listeners: {select: function (sm, r) {
                                me.editerType(r);
                            }}},
                    {xtype: 'form', itemId: 'typeForm', title: 'Nouveau type', bodyPadding: 10, defaults: {anchor: '100%', labelWidth: 95},
                        items: [
                            {xtype: 'hiddenfield', itemId: 'typeId'},
                            {xtype: 'textfield', itemId: 'typeNom', fieldLabel: 'Nom', allowBlank: false, maxLength: 40, enforceMaxLength: true,
                                blankText: 'Le nom est obligatoire', enableKeyEvents: true, listeners: {specialkey: function (f, e) {
                                        if (e.getKey() === e.ENTER) {
                                            me.down('#typeDescription').focus(true);
                                        }
                                    }}},
                            {xtype: 'textfield', itemId: 'typeDescription', fieldLabel: 'Description', maxLength: 100, enforceMaxLength: true,
                                listeners: {specialkey: function (f, e) {
                                        if (e.getKey() === e.ENTER) {
                                            me.down('#typeCode').focus(true);
                                        }
                                    }}},
                            {xtype: 'combobox', itemId: 'typeCode', fieldLabel: 'Code imprimé', store: me.codesStore, valueField: 'id',
                                displayField: 'libelle', queryMode: 'local', editable: false, allowBlank: false, blankText: 'Choisissez le code'},
                            {xtype: 'checkbox', itemId: 'typeActif', boxLabel: 'Actif (proposé sur la fiche article)', checked: true}
                        ],
                        buttons: [{text: 'Nouveau', itemId: 'typeNouveau', handler: function () {
                                    me.nouveauType();
                                }},
                            {text: 'Enregistrer', itemId: 'typeEnregistrer', cls: 'btn-primary', handler: function () {
                                    me.enregistrerType();
                                }}]},
                    {xtype: 'gridpanel', itemId: 'journalGrille', title: 'Dernières mises à jour', height: 200, store: me.journalStore,
                        columnLines: true, columns: [
                            {text: 'Le', dataIndex: 'le', width: 110},
                            {text: 'Par', dataIndex: 'par', width: 70},
                            {text: 'Produits', dataIndex: 'produits', width: 62, align: 'right'},
                            {text: 'Vers', dataIndex: 'type', flex: 1, renderer: function (v, m, r) {
                                    return Ext.String.htmlEncode(v) + (r.get('annule') ? ' <span style="color:#5b6b7b">(annulée)</span>' : '');
                                }},
                            {text: '', width: 70, itemId: 'colAnnuler', renderer: function (v, m, r) {
                                    return r.get('annule') || !me.peutAffecter ? '' : '<span class="etqp-annuler-texte" style="color:#0b5e78;cursor:pointer;text-decoration:underline">Annuler</span>';
                                }}
                        ],
                        listeners: {cellclick: function (g, td, ci, r, tr, ri, e) {
                                if (e.getTarget('.etqp-annuler-texte')) {
                                    me.annuler(r);
                                }
                            }}}
                ]},
            {xtype: 'gridpanel', itemId: 'produitsGrille', title: 'Mise à jour sélective du type d\'étiquette des produits', flex: 1,
                margin: '0 0 0 8', store: me.produitsStore, columnLines: true,
                selModel: Ext.create('Ext.selection.CheckboxModel', {checkOnly: true, listeners: {selectionchange: function () {
                            me.majBoutons();
                        }}}),
                dockedItems: [
                    /* retours du 25/10 (point 7) : une seule ligne ; zone geo, famille et grossiste passent au filtre a
                       cases a cocher (celui des ecrans d'analyse), qui prend la place de ces trois listes */
                    {xtype: 'toolbar', dock: 'top', itemId: 'barreFiltres', items: [
                            combo('filtreZone', 'Zone géo.', me.zonesStore, 230),
                            combo('filtreFamille', 'Famille', me.famillesStore, 220),
                            combo('filtreGrossiste', 'Grossiste', me.grossistesStore, 230),
                            {xtype: 'combobox', itemId: 'filtreType', fieldLabel: 'Type actuel', labelWidth: 75, width: 260, store: me.typesFiltreStore,
                                valueField: 'id', displayField: 'nom', queryMode: 'local', editable: false, emptyText: 'Tous', margin: '0 8 0 0'},
                            {xtype: 'textfield', itemId: 'filtreRecherche', emptyText: 'CIP ou désignation', width: 200, enableKeyEvents: true,
                                listeners: {specialkey: function (f, e) {
                                        if (e.getKey() === e.ENTER) {
                                            me.rechercher();
                                        }
                                    }}},
                            {text: 'Rechercher', itemId: 'rechercher', handler: function () {
                                    me.rechercher();
                                }},
                            {text: 'Effacer les filtres', itemId: 'effacerFiltres', handler: function () {
                                    ['#filtreZone', '#filtreFamille', '#filtreGrossiste', '#filtreType', '#filtreRecherche'].forEach(function (s) {
                                        me.down(s).setValue(null);
                                    });
                                    me.rechercher();
                                }}
                        ]},
                    {xtype: 'toolbar', dock: 'bottom', itemId: 'barreAffecter', items: [
                            {xtype: 'combobox', itemId: 'typeCible', fieldLabel: 'Nouveau type', labelWidth: 85, width: 300, store: me.typesCibleStore,
                                valueField: 'id', displayField: 'nom', queryMode: 'local', editable: false, emptyText: 'Choisir le type',
                                listeners: {change: function () {
                                        me.majBoutons();
                                    }}},
                            {text: 'Appliquer aux produits cochés', itemId: 'appliquerCoches', handler: function () {
                                    me.preparer(false);
                                }},
                            {text: 'Appliquer à tout le filtre', itemId: 'appliquerFiltre', handler: function () {
                                    me.preparer(true);
                                }}
                        ]},
                    {xtype: 'container', dock: 'bottom', itemId: 'confirmation', hidden: true, padding: '8 10',
                        style: 'background:#fff4e0;border-top:1px solid #f0c98a', layout: {type: 'hbox', align: 'middle'}, items: [
                            {xtype: 'component', itemId: 'confirmationTexte', flex: 1, html: ''},
                            {xtype: 'button', text: 'Confirmer', itemId: 'confirmer', cls: 'btn-primary', margin: '0 8 0 0', handler: function () {
                                    me.appliquer();
                                }},
                            {xtype: 'button', text: 'Annuler', itemId: 'abandonner', handler: function () {
                                    me.down('#confirmation').hide();
                                    me.attente = null;
                                }}
                        ]},
                    {xtype: 'pagingtoolbar', dock: 'bottom', store: me.produitsStore, displayInfo: true,
                        displayMsg: 'Produits {0} à {1} sur {2}', emptyMsg: 'Aucun produit'}
                ],
                columns: [
                    {text: 'CIP', dataIndex: 'cip', width: 90},
                    {text: 'Désignation', dataIndex: 'designation', flex: 1, renderer: 'htmlEncode'},
                    {text: 'Zone géo.', dataIndex: 'zone', width: 140, renderer: 'htmlEncode'},
                    {text: 'Famille', dataIndex: 'famille', width: 120, renderer: 'htmlEncode'},
                    {text: 'Grossiste', dataIndex: 'grossiste', width: 120, renderer: 'htmlEncode'},
                    {text: 'Type actuel', dataIndex: 'type', width: 130, renderer: function (v, m, r) {
                            return v ? Ext.String.htmlEncode(v) + (r.get('code') ? '' : ' <span style="color:#5b6b7b">(d\'origine)</span>')
                                    : '<span style="color:#5b6b7b">aucun</span>';
                        }}
                ]}
        ];
        me.callParent(arguments);
        me.produitsStore.on('load', function () {
            me.majBoutons();
        });
        me.on('afterrender', function () {
            var filtre = testextjs.view.commun.FiltresMulti.remplacer(me, {rayon: '#filtreZone', famille: '#filtreFamille', grossiste: '#filtreGrossiste'});
            if (filtre) {
                Ext.each(['#filtreZone', '#filtreFamille', '#filtreGrossiste'], function (s) {
                    me.down(s).on('select', function () {
                        me.rechercher();
                    });
                });
            }
        }, me, {single: true});
    },

    libelleCode: function (code) {
        var r = this.codesStore.findRecord('id', code, 0, false, true, true);
        return r ? r.get('libelle') : code;
    },

    /** Appelee par l'ecran a l'ouverture de l'onglet. */
    ouvrir: function () {
        var me = this;
        me.ecran.appel('types', null, function (o) {
            me.peutAffecter = o.peutAffecter;
            me.codesStore.loadData(o.codes);
            me.typesStore.loadData(o.types);
            me.typesCibleStore.loadData(Ext.Array.filter(o.types, function (t) {
                return t.actif;
            }));
            me.typesFiltreStore.loadData([{id: '', nom: 'Tous'}, {id: 'AUCUN', nom: '(aucun type)'}].concat(o.types.map(function (t) {
                return {id: t.id, nom: t.nom};
            })));
            me.zonesStore.loadData(o.filtres.zones);
            me.famillesStore.loadData(o.filtres.familles);
            me.grossistesStore.loadData(o.filtres.grossistes);
            me.journalStore.loadData(o.journal);
            me.down('#typeForm').setVisible(o.peutAffecter);
            me.down('#barreAffecter').setVisible(o.peutAffecter);
            me.down('#produitsGrille').setTitle('Mise à jour sélective du type d\'étiquette des produits'
                    + (o.peutAffecter ? '' : ' <span style="font-weight:normal;color:#5b6b7b">(lecture seule : réservée à l\'administrateur)</span>'));
            if (!me.dejaCharge) {
                me.dejaCharge = true;
                me.nouveauType();
                me.rechercher();
            } else {
                me.produitsStore.loadPage(me.produitsStore.currentPage || 1);
            }
        });
    },

    filtres: function () {
        var me = this, v = function (s) {
            var x = me.down(s) && me.down(s).getValue();
            return x === null || x === undefined ? '' : String(x);
        };
        return {zone: v('#filtreZone'), famille: v('#filtreFamille'), grossiste: v('#filtreGrossiste'), type: v('#filtreType'),
            recherche: v('#filtreRecherche')};
    },

    rechercher: function () {
        var me = this;
        me.down('#confirmation').hide();
        me.attente = null;
        me.produitsStore.loadPage(1);
    },

    majBoutons: function () {
        var me = this, n = me.down('#produitsGrille').getSelectionModel().getCount(), total = me.produitsStore.getTotalCount() || 0;
        var cible = !!me.down('#typeCible').getValue();
        me.down('#appliquerCoches').setText('Appliquer aux produits cochés (' + n + ')');
        me.down('#appliquerCoches').setDisabled(!cible || !n);
        me.down('#appliquerFiltre').setText('Appliquer à tout le filtre (' + total + ')');
        me.down('#appliquerFiltre').setDisabled(!cible || !total);
    },

    /** Confirmation dans l'ecran : combien de produits, vers quel type. */
    preparer: function (toutLeFiltre) {
        var me = this, cible = me.typesCibleStore.findRecord('id', me.down('#typeCible').getValue(), 0, false, true, true);
        if (!cible) {
            return;
        }
        var ids = toutLeFiltre ? [] : me.down('#produitsGrille').getSelectionModel().getSelection().map(function (r) {
            return r.get('id');
        });
        var n = toutLeFiltre ? me.produitsStore.getTotalCount() : ids.length;
        me.attente = {type: cible.get('id'), produits: ids, toutLeFiltre: toutLeFiltre, filtres: me.filtres()};
        me.down('#confirmationTexte').update('<b>' + n + ' produit(s)</b> ' + (toutLeFiltre ? 'du filtre' : 'cochés') + ' passeront au type <b>'
                + Ext.String.htmlEncode(cible.get('nom')) + '</b> (ceux qui l\'ont déjà ne changent pas). La mise à jour est notée et peut être annulée.');
        me.down('#confirmation').show();
        me.down('#confirmer').focus(false, 50);
    },

    appliquer: function () {
        var me = this, a = me.attente;
        if (!a) {
            return;
        }
        me.down('#confirmation').hide();
        me.attente = null;
        me.ecran.appel('types/affecter', a, function (o) {
            me.ecran.message(o.msg);
            me.down('#produitsGrille').getSelectionModel().deselectAll();
            me.ouvrir();
        });
    },

    annuler: function (r) {
        var me = this;
        if (!r || r.get('annule') || !me.peutAffecter) {
            return;
        }
        me.ecran.appel('types/annuler', {lot: r.get('lot')}, function (o) {
            me.ecran.message(o.msg);
            me.ouvrir();
        });
    },

    nouveauType: function () {
        var me = this, f = me.down('#typeForm');
        f.setTitle('Nouveau type');
        me.down('#typeId').setValue('');
        me.down('#typeNom').setValue('');
        me.down('#typeDescription').setValue('');
        me.down('#typeCode').setValue(null);
        me.down('#typeActif').setValue(true);
        f.getForm().clearInvalid();
        me.down('#typeEnregistrer').setDisabled(false);
        me.down('#typesGrille').getSelectionModel().deselectAll(true);
    },

    editerType: function (r) {
        var me = this, f = me.down('#typeForm');
        if (r.get('ancien')) {
            f.setTitle('Type d\'origine « ' + Ext.String.htmlEncode(r.get('nom')) + ' » (gardé tel quel)');
            me.down('#typeEnregistrer').setDisabled(true);
        } else {
            f.setTitle('Modifier « ' + Ext.String.htmlEncode(r.get('nom')) + ' »');
            me.down('#typeEnregistrer').setDisabled(false);
        }
        me.down('#typeId').setValue(r.get('id'));
        me.down('#typeNom').setValue(r.get('nom'));
        me.down('#typeDescription').setValue(r.get('description'));
        me.down('#typeCode').setValue(r.get('code') || null);
        me.down('#typeActif').setValue(r.get('actif'));
    },

    enregistrerType: function () {
        var me = this, f = me.down('#typeForm');
        if (!f.getForm().isValid()) {
            me.ecran.message('Complétez le nom et le code du type.', true);
            return;
        }
        me.ecran.appel('types/enregistrer', {id: me.down('#typeId').getValue(), nom: me.down('#typeNom').getValue(),
            description: me.down('#typeDescription').getValue(), code: me.down('#typeCode').getValue(),
            actif: me.down('#typeActif').getValue()}, function (o) {
            me.ecran.message(o.msg);
            me.nouveauType();
            me.ouvrir();
        });
    }
});
