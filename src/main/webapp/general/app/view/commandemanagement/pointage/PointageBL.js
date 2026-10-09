/* global Ext */
/*
 * Retours du 09/10 (5) : pointage des BL et avoirs grossistes, puis rapprochement avec le releve du grossiste (PDF).
 *  - onglet « Pointage » : BL et avoirs du grossiste sur la periode ; case « Pointe », N° de sequence (BL) et reference
 *    d'avoir (retour) modifies directement dans la liste ; totaux ;
 *  - onglet « Rapprochement » : import du releve PDF, compteurs Rapproches / Ecarts / Absents chez nous / Absents du
 *    releve (cliquables), totaux des deux cotes, pointage en un clic des pieces rapprochees ; releves deja importes.
 * API v1/pointage-bl.
 */
Ext.define('testextjs.view.commandemanagement.pointage.PointageBL', {
    extend: 'Ext.panel.Panel',
    xtype: 'pointagebl',
    title: 'Pointage BL / avoirs',
    layout: 'fit',
    cls: 'pb-ecran',
    config: {nameintern: '', titre: '', data: null},

    STATUTS: [
        {cle: 'RAPPROCHE', texte: 'Rapprochés', couleur: '#17795f', fond: '#e3f6ef', info: 'Même numéro et même montant des deux côtés'},
        {cle: 'ECART', texte: 'Écarts de montant', couleur: '#b26a00', fond: '#fff4e0', info: 'Même numéro, montants différents'},
        {cle: 'ABSENT_PRESTIGE', texte: 'Absents chez nous', couleur: '#b42318', fond: '#fde7e6', info: 'Sur le relevé du grossiste, pas dans Prestige : à saisir ou à vérifier'},
        {cle: 'ABSENT_RELEVE', texte: 'Absents du relevé', couleur: '#1f5f9e', fond: '#e4effa', info: 'Dans Prestige, pas sur le relevé : à réclamer ou à vérifier auprès du grossiste'}
    ],
    TYPES: {BL: 'BL', RETOUR: 'Avoir (retour)', RECEPTION: 'Avoir (manquants à la réception)'},
    /* champs du releve a designer (ReleveModele.Champ) */
    CHAMPS: [
        {champ: 'NUMERO', libelle: 'N° BL *', requis: true},
        {champ: 'DATE', libelle: 'Date *', requis: true},
        {champ: 'MONTANT', libelle: 'Montant HT (avoirs négatifs)'},
        {champ: 'TYPE', libelle: 'Type (BL / avoir)'},
        {champ: 'SEQUENCE', libelle: 'N° séquence'},
        {champ: 'MONTANT_BL', libelle: 'ou Montant BL (débit)'},
        {champ: 'MONTANT_AVOIR', libelle: 'et Montant avoir (crédit)'}
    ],

    initComponent: function () {
        var me = this, enc = Ext.String.htmlEncode;
        /* le format d'ExtJS ne groupe pas les milliers d'un nombre negatif : signe ajoute a part */
        var nombre = function (v) {
            return v === null || v === undefined || v === '' ? '' : (v < 0 ? '-' : '') + Ext.util.Format.number(Math.abs(v), '0,000');
        };
        var montant = function (v) {
            return v === null || v === undefined || v === '' ? '' : '<span style="' + (v < 0 ? 'color:#b42318' : '') + '">' + nombre(v) + '</span>';
        };
        me.filtreReleve = Ext.Array.map(me.STATUTS, function (s) {
            return s.cle;
        });
        me.pieces = Ext.create('Ext.data.Store', {
            fields: ['type', 'id', 'cle', 'reference', 'referenceAvoir', 'sequence', 'statut', 'date', {name: 'montantHt', type: 'number'},
                {name: 'pointable', type: 'boolean'}, {name: 'pointe', type: 'boolean'}, 'pointeLe', 'pointePar'],
            proxy: {type: 'ajax', url: '../api/v1/pointage-bl', reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    st.getProxy().extraParams = me.criteres();
                },
                load: function (st, r, succes) {
                    me.majTotauxPointage(st.getProxy().getReader().rawData, succes);
                }
            }
        });
        me.lignesReleve = Ext.create('Ext.data.Store', {
            fields: ['statut', 'type', 'numero', 'sequence', 'date', {name: 'montantReleve', useNull: true}, 'pieceType', 'pieceId',
                'pieceReference', {name: 'montantPrestige', useNull: true}, {name: 'ecart', useNull: true}],
            proxy: {type: 'memory', reader: {type: 'json'}}
        });
        me.releves = Ext.create('Ext.data.Store', {
            fields: ['id', 'fichier', 'du', 'au', 'lignes', 'importeLe', {name: 'libelle', convert: function (v, r) {
                        return r.get('importeLe') + ' — ' + r.get('fichier') + ' (' + r.get('du') + ' au ' + r.get('au') + ')';
                    }}],
            proxy: {type: 'ajax', url: '../api/v1/pointage-bl/releves', reader: {type: 'json', root: 'data'}}
        });
        var grossistes = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'], pageSize: 9999, autoLoad: true,
            proxy: {type: 'ajax', url: '../api/v1/common/grossiste', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        var debutMois = Ext.Date.getFirstDateOfMonth(new Date());
        Ext.apply(me, {
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'barrePointage',
                    items: [
                        {xtype: 'combobox', itemId: 'grossiste', fieldLabel: 'Grossiste', labelWidth: 65, width: 270, store: grossistes,
                            valueField: 'id', displayField: 'libelle', queryMode: 'local', typeAhead: true, forceSelection: true, anyMatch: true,
                            emptyText: 'Choisir le grossiste', maxLength: 100, listeners: {select: function () {
                                    me.chargerTout();
                                }}},
                        {xtype: 'datefield', itemId: 'du', fieldLabel: 'Du', labelWidth: 22, width: 130, format: 'd/m/Y', submitFormat: 'Y-m-d', value: debutMois},
                        {xtype: 'datefield', itemId: 'au', fieldLabel: 'Au', labelWidth: 22, width: 130, format: 'd/m/Y', submitFormat: 'Y-m-d', value: new Date()},
                        {xtype: 'combobox', itemId: 'etat', width: 160, editable: false, queryMode: 'local', value: 'TOUS',
                            store: [['TOUS', 'Toutes les pièces'], ['NON_POINTES', 'Non pointées'], ['POINTES', 'Pointées']],
                            listeners: {select: function () {
                                    me.charger();
                                }}},
                        {text: 'Rechercher', itemId: 'rechercherPointage', cls: 'btn-primary', iconCls: 'searchicon', handler: function () {
                                me.charger();
                            }}
                    ]
                }],
            items: [{
                    xtype: 'tabpanel', itemId: 'ongletsPointage', plain: true, border: false,
                    items: [{
                            title: 'Pointage', itemId: 'ongletPointage', layout: 'fit', border: false,
                            dockedItems: [{xtype: 'container', dock: 'top', itemId: 'totauxPointage', cls: 'pb-bandeau', padding: '6 8', html: 'Choisissez un grossiste.'}],
                            items: [{
                                    xtype: 'grid', itemId: 'grillePointage', store: me.pieces, columnLines: true,
                                    viewConfig: {emptyText: 'Aucun BL ni avoir pour ce grossiste sur la période.', deferEmptyText: false},
                                    plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1, listeners: {
                                                beforeedit: function (ed, e) {
                                                    /* N° de sequence : BL ; reference d'avoir : retour */
                                                    return (e.field === 'sequence' && e.record.get('type') === 'BL')
                                                            || (e.field === 'referenceAvoir' && e.record.get('type') === 'RETOUR');
                                                },
                                                edit: function (ed, e) {
                                                    me.enregistrer(e.record, e.field, e.value, e.originalValue);
                                                }
                                            }})],
                                    columns: [
                                        {xtype: 'checkcolumn', text: 'Pointé', dataIndex: 'pointe', width: 72, itemId: 'colPointe',
                                            listeners: {
                                                beforecheckchange: function (col, i) {
                                                    return me.pieces.getAt(i).get('pointable');
                                                },
                                                checkchange: function (col, i, coche) {
                                                    me.pointer(me.pieces.getAt(i), coche);
                                                }
                                            },
                                            renderer: function (v, m, r) {
                                                if (!r.get('pointable')) {
                                                    m.tdAttr = 'data-qtip="Pointé avec son BL"';
                                                    return '—';
                                                }
                                                return Ext.grid.column.CheckColumn.prototype.renderer.apply(this, arguments);
                                            }},
                                        {text: 'Type', dataIndex: 'type', width: 150, renderer: function (v) {
                                                return enc(me.TYPES[v] || v);
                                            }},
                                        {text: 'N° BL', dataIndex: 'reference', width: 120},
                                        {text: 'N° séq.', tooltip: 'N° de séquence client imprimé sur le BL (cliquer pour saisir)', dataIndex: 'sequence', width: 80,
                                            editor: {xtype: 'textfield', maxLength: 20, enforceMaxLength: true, maskRe: /[A-Za-z0-9 .\/-]/},
                                            renderer: function (v, m, r) {
                                                if (r.get('type') === 'BL') {
                                                    m.tdCls = 'pb-modifiable';
                                                }
                                                return enc(v);
                                            }},
                                        {text: 'Réf. avoir', tooltip: 'Référence de l\'avoir du grossiste, ex. VRI 683562 2 (cliquer pour saisir)', dataIndex: 'referenceAvoir', width: 130,
                                            editor: {xtype: 'textfield', maxLength: 40, enforceMaxLength: true, maskRe: /[A-Za-z0-9 .\/-]/},
                                            renderer: function (v, m, r) {
                                                if (r.get('type') === 'RETOUR') {
                                                    m.tdCls = 'pb-modifiable';
                                                }
                                                return enc(v);
                                            }},
                                        {text: 'Date', dataIndex: 'date', width: 95},
                                        {text: 'Montant HT', dataIndex: 'montantHt', width: 115, align: 'right', renderer: montant},
                                        {text: 'Statut', dataIndex: 'statut', flex: 1, minWidth: 140, renderer: function (v) {
                                                return enc(v);
                                            }},
                                        {text: 'Pointé le / par', dataIndex: 'pointeLe', width: 200, renderer: function (v, m, r) {
                                                return v ? enc(v + ' — ' + r.get('pointePar')) : '';
                                            }}
                                    ]
                                }]
                        }, {
                            title: 'Rapprochement avec le relevé', itemId: 'ongletRapprochement', layout: 'card', border: false,
                            dockedItems: [{
                                    xtype: 'toolbar', dock: 'top', itemId: 'barreReleve',
                                    items: [
                                        {xtype: 'form', itemId: 'formReleve', border: false, bodyStyle: 'background:transparent', layout: 'hbox',
                                            items: [{xtype: 'hiddenfield', name: 'grossiste', itemId: 'grossisteReleve'},
                                                {xtype: 'filefield', name: 'releve', itemId: 'fichierReleve', buttonOnly: true, hideLabel: true,
                                                    buttonText: 'Importer le relevé (PDF)', buttonConfig: {cls: 'btn-primary', iconCls: 'importicon'},
                                                    listeners: {change: function (f, v) {
                                                            if (v) {
                                                                me.importer();
                                                            }
                                                        }}}]},
                                        {xtype: 'combobox', itemId: 'relevesImportes', store: me.releves, valueField: 'id', displayField: 'libelle', width: 360,
                                            queryMode: 'local', editable: false, emptyText: 'Relevés déjà importés', listeners: {select: function (c, r) {
                                                    me.chargerReleve(r[0].get('id'));
                                                }}},
                                        {text: 'Régler les colonnes', itemId: 'reglerColonnes', disabled: true,
                                            tooltip: 'Désigner les colonnes du relevé importé (chaque grossiste présente son relevé à sa manière) ; le réglage est mémorisé pour ce grossiste',
                                            handler: function () {
                                                me.ouvrirReconnaissance('');
                                            }},
                                        {xtype: 'tbtext', itemId: 'etatModele', text: ''},
                                        {text: 'Revenir au format standard', itemId: 'oublierModele', hidden: true,
                                            tooltip: 'Oublier le réglage des colonnes mémorisé pour ce grossiste', handler: function () {
                                                me.oublierModele();
                                            }},
                                        '->',
                                        {text: 'Pointer les pièces rapprochées', itemId: 'pointerRapproches', cls: 'btn-primary', disabled: true,
                                            tooltip: 'Coche « Pointé » sur les BL et avoirs rapprochés de ce relevé (non encore pointés)', handler: function () {
                                                me.pointerRapproches();
                                            }}
                                    ]
                                }, {
                                    xtype: 'container', dock: 'top', itemId: 'bandeauReleve', cls: 'pb-bandeau', padding: '6 8',
                                    html: 'Importez le relevé PDF du grossiste. Un relevé présenté autrement que le format standard'
                                            + ' (Type, Numéro BL / Séq client, Date BL, Montant HT) se règle une fois : désignez ses colonnes, le réglage est mémorisé pour ce grossiste.',
                                    listeners: {afterrender: function (c) {
                                            c.getEl().on('click', function (e) {
                                                var t = e.getTarget('.pb-filtre');
                                                if (t) {
                                                    me.basculer(t.getAttribute('data-statut'));
                                                }
                                            });
                                        }}
                                }],
                            items: [{
                                    xtype: 'grid', itemId: 'grilleReleve', store: me.lignesReleve, columnLines: true,
                                    viewConfig: {emptyText: 'Aucun relevé chargé.', deferEmptyText: false},
                                    columns: [
                                        {text: 'Statut', dataIndex: 'statut', width: 150, renderer: function (v) {
                                                var s = Ext.Array.findBy(me.STATUTS, function (x) {
                                                    return x.cle === v;
                                                }) || {texte: v, couleur: '#333', fond: '#eee', info: ''};
                                                return '<span class="pb-pastille" data-statut="' + enc(v) + '" data-qtip="' + enc(s.info) + '" style="color:' + s.couleur + ';background:' + s.fond + '">' + enc(s.texte) + '</span>';
                                            }},
                                        {text: 'Type', dataIndex: 'type', width: 70},
                                        {text: 'N° relevé', dataIndex: 'numero', width: 130},
                                        {text: 'Séq.', dataIndex: 'sequence', width: 70},
                                        {text: 'Date', dataIndex: 'date', width: 95},
                                        {text: 'Montant relevé', dataIndex: 'montantReleve', width: 145, align: 'right', renderer: montant},
                                        {text: 'Pièce Prestige', dataIndex: 'pieceReference', flex: 1, minWidth: 150, renderer: function (v, m, r) {
                                                return v ? enc((me.TYPES[r.get('pieceType')] || '') + ' ' + v) : '';
                                            }},
                                        {text: 'Montant Prestige', dataIndex: 'montantPrestige', width: 158, align: 'right', renderer: montant},
                                        {text: 'Écart', dataIndex: 'ecart', width: 100, align: 'right', renderer: function (v) {
                                                return v ? '<b style="color:#b42318">' + nombre(v) + '</b>' : '';
                                            }}
                                    ]
                                }, {
                                    xtype: 'panel', itemId: 'reconnaissance', layout: 'fit', border: false, cls: 'pb-reconnaissance',
                                    dockedItems: [{
                                            xtype: 'container', dock: 'top', itemId: 'recoInfo', cls: 'pb-bandeau', padding: '6 8', html: ''
                                        }, {
                                            xtype: 'container', dock: 'top', itemId: 'recoChamps', layout: 'column', padding: '4 8 2 8',
                                            defaults: {columnWidth: 0.25, labelWidth: 135, padding: '0 10 4 0'},
                                            items: Ext.Array.map(me.CHAMPS, function (c) {
                                                return {xtype: 'combobox', itemId: 'champ-' + c.champ, fieldLabel: c.libelle, queryMode: 'local', editable: false,
                                                    valueField: 'rang', displayField: 'libelle', value: -1, cls: c.requis ? 'pb-champ-requis' : '',
                                                    store: Ext.create('Ext.data.Store', {fields: ['rang', 'libelle']}),
                                                    listeners: {select: function () {
                                                            me.majEntetesApercu();
                                                            me.essayerBuffer();
                                                        }}};
                                            }).concat([{xtype: 'textfield', itemId: 'marqueursAvoir', fieldLabel: 'Texte d\'un avoir (colonne Type)', value: 'AV',
                                                    maxLength: 60, enforceMaxLength: true, maskRe: /[A-Za-z0-9\/ ,;-]/,
                                                    listeners: {change: function () {
                                                            me.essayerBuffer();
                                                        }}}])
                                        }, {
                                            xtype: 'toolbar', dock: 'bottom', items: ['->',
                                                {text: 'Annuler', itemId: 'annulerReconnaissance', handler: function () {
                                                        me.down('#ongletRapprochement').getLayout().setActiveItem(0);
                                                    }},
                                                {text: 'Appliquer et mémoriser pour ce grossiste', itemId: 'appliquerModele', cls: 'btn-primary', handler: function () {
                                                        me.appliquerModele();
                                                    }}]
                                        }],
                                    items: [{xtype: 'grid', itemId: 'grilleApercu', columnLines: true, store: Ext.create('Ext.data.Store', {fields: ['n']}), columns: [],
                                            viewConfig: {getRowClass: function (r) {
                                                    return r.get('lu') ? 'pb-reconnue' : 'pb-ignoree';
                                                }}}]
                                }]
                        }]
                }]
        });
        me.callParent(arguments);
    },

    criteres: function () {
        var me = this;
        return {grossiste: me.down('#grossiste').getValue() || '', du: me.down('#du').getSubmitValue() || '',
            au: me.down('#au').getSubmitValue() || '', etat: me.down('#etat').getValue() || 'TOUS'};
    },

    chargerTout: function () {
        var me = this, g = me.down('#grossiste').getValue();
        me.charger();
        me.releves.load({params: {grossiste: g || ''}});
        me.down('#relevesImportes').clearValue();
        me.lignesReleve.removeAll();
        me.releveCourant = null;
        me.down('#pointerRapproches').disable();
        me.down('#bandeauReleve').update('Importez le relevé PDF du grossiste. Un relevé présenté autrement que le format standard'
                + ' (Type, Numéro BL / Séq client, Date BL, Montant HT) se règle une fois : désignez ses colonnes, le réglage est mémorisé pour ce grossiste.');
        me.jeton = null;
        me.down('#reglerColonnes').disable();
        me.down('#ongletRapprochement').getLayout().setActiveItem(0);
        me.majEtatModele();
    },

    charger: function () {
        var me = this;
        if (!me.down('#grossiste').getValue()) {
            me.down('#totauxPointage').update('Choisissez un grossiste.');
            me.pieces.removeAll();
            return;
        }
        if (!me.down('#du').isValid() || !me.down('#au').isValid()) {
            return;
        }
        me.pieces.load();
    },

    majTotauxPointage: function (o, succes) {
        var b = this.down('#totauxPointage'), n = function (v) {
            return (v < 0 ? '-' : '') + Ext.util.Format.number(Math.abs(v || 0), '0,000');
        };
        if (!b) {
            return;
        }
        if (!succes || !o || o.success === false) {
            b.update('<span style="color:#b42318">' + Ext.String.htmlEncode((o && o.msg) || 'Chargement impossible.') + '</span>');
            return;
        }
        b.update('BL : <b>' + n(o.totalBl) + '</b> &nbsp;·&nbsp; Avoirs : <b style="color:#b42318">' + n(o.totalAvoirs) + '</b> &nbsp;·&nbsp; Net HT : <b>' + n(o.net)
                + '</b> &nbsp;·&nbsp; Pointées : <b>' + o.pointes + '</b> &nbsp;·&nbsp; À pointer : <b>' + o.nonPointes + '</b>');
    },

    /* modification directe : en cas de refus, la valeur d'origine revient */
    appel: function (url, enCasDEchec, apres) {
        Ext.Ajax.request({
            url: url, method: 'PUT',
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    enCasDEchec();
                    Ext.MessageBox.alert('Pointage', Ext.String.htmlEncode(o.msg || 'Modification refusée.'));
                } else if (apres) {
                    apres(o);
                }
            },
            failure: function () {
                enCasDEchec();
                Ext.MessageBox.alert('Pointage', 'Le serveur ne répond pas.');
            }
        });
    },

    pointer: function (rec, coche) {
        var me = this;
        me.appel('../api/v1/pointage-bl/pointer/' + encodeURIComponent(rec.get('type')) + '/' + encodeURIComponent(rec.get('id')) + '?pointe=' + (coche ? 'true' : 'false'),
                function () {
                    rec.set('pointe', !coche);
                    rec.commit();
                }, function () {
            rec.commit();
            me.charger();
        });
    },

    enregistrer: function (rec, champ, valeur, avant) {
        if ((valeur || '') === (avant || '')) {
            return;
        }
        var url = champ === 'sequence' ? '../api/v1/pointage-bl/sequence/' : '../api/v1/pointage-bl/avoir/';
        this.appel(url + encodeURIComponent(rec.get('id')) + '?valeur=' + encodeURIComponent(Ext.String.trim(valeur || '')), function () {
            rec.set(champ, avant);
            rec.commit();
        }, function () {
            rec.commit();
        });
    },

    importer: function () {
        var me = this, g = me.down('#grossiste').getValue(), f = me.down('#formReleve');
        if (!g) {
            Ext.MessageBox.alert('Relevé du grossiste', 'Choisissez d\'abord le grossiste du relevé.');
            me.down('#fichierReleve').reset();
            return;
        }
        me.down('#grossisteReleve').setValue(g);
        f.getForm().submit({
            url: '../api/v1/pointage-bl/releve', waitMsg: 'Lecture du relevé...',
            success: function (form, action) {
                me.down('#fichierReleve').reset();
                me.jeton = action.result.jeton;
                me.down('#reglerColonnes').setDisabled(!me.jeton);
                me.down('#ongletRapprochement').getLayout().setActiveItem(0);
                me.afficherReleve(action.result);
                me.releves.load({params: {grossiste: g}});
                me.majEtatModele(action.result.lecture);
            },
            failure: function (form, action) {
                me.down('#fichierReleve').reset();
                var o = action.result || {};
                if (o.reconnaissance && o.jeton) {
                    /* releve presente autrement : l'operateur designe les colonnes (pas de fenetre) */
                    me.jeton = o.jeton;
                    me.down('#reglerColonnes').setDisabled(false);
                    me.ouvrirReconnaissance(o.msg);
                    return;
                }
                Ext.MessageBox.alert('Relevé du grossiste', Ext.String.htmlEncode(o.msg || 'Le relevé n\'a pas pu être importé.'));
            }
        });
    },

    chargerReleve: function (id) {
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/pointage-bl/releve/' + encodeURIComponent(id), method: 'GET',
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (o.success) {
                    me.afficherReleve(o);
                } else {
                    Ext.MessageBox.alert('Relevé du grossiste', Ext.String.htmlEncode(o.msg || 'Relevé introuvable.'));
                }
            }
        });
    },

    afficherReleve: function (o) {
        var me = this;
        me.releveCourant = o;
        me.down('#pointerRapproches').setDisabled(!(o.compteurs && o.compteurs.RAPPROCHE));
        me.filtrerReleve();
    },

    basculer: function (cle) {
        var me = this;
        if (Ext.Array.contains(me.filtreReleve, cle)) {
            if (me.filtreReleve.length > 1) {
                Ext.Array.remove(me.filtreReleve, cle);
            }
        } else {
            me.filtreReleve.push(cle);
        }
        me.filtrerReleve();
    },

    filtrerReleve: function () {
        var me = this, o = me.releveCourant, enc = Ext.String.htmlEncode, n = function (v) {
            return (v < 0 ? '-' : '') + Ext.util.Format.number(Math.abs(v || 0), '0,000');
        };
        if (!o) {
            return;
        }
        me.lignesReleve.loadData(Ext.Array.filter(o.data || [], function (l) {
            return Ext.Array.contains(me.filtreReleve, l.statut);
        }));
        var c = o.compteurs || {}, t = o.totaux || {};
        var filtres = Ext.Array.map(me.STATUTS, function (s) {
            var actif = Ext.Array.contains(me.filtreReleve, s.cle);
            return '<span class="pb-filtre' + (actif ? ' pb-actif' : '') + '" data-statut="' + s.cle + '" data-qtip="' + enc(s.info) + ' — cliquer pour afficher ou masquer"'
                    + ' style="border-color:' + s.couleur + ';' + (actif ? 'background:' + s.couleur + ';color:#fff' : 'color:' + s.couleur + ';background:' + s.fond) + '">'
                    + enc(s.texte) + ' <b>' + (c[s.cle] || 0) + '</b></span>';
        }).join('');
        me.down('#bandeauReleve').update('<div class="pb-entete">Relevé <b>' + enc(o.grossiste) + '</b> du ' + enc(o.du) + ' au ' + enc(o.au) + ' — ' + enc(o.fichier)
                + ' (' + o.lignes + ' ligne(s), importé le ' + enc(o.importeLe) + ')</div><div class="pb-filtres">' + filtres + '</div>'
                + '<div class="pb-totaux">Relevé : BL <b>' + n(t.releveBl) + '</b>, avoirs <b>' + n(t.releveAvoirs) + '</b>, net <b>' + n(t.releveNet) + '</b>'
                + ' &nbsp;|&nbsp; Prestige : BL <b>' + n(t.prestigeBl) + '</b>, avoirs <b>' + n(t.prestigeAvoirs) + '</b>, net <b>' + n(t.prestigeNet) + '</b>'
                + ' &nbsp;|&nbsp; Écart net : <b style="color:' + (t.ecartNet ? '#b42318' : '#17795f') + '">' + n(t.ecartNet) + '</b></div>');
    },

    /* ------------------------------------------------ reglage des colonnes du releve (par grossiste) */

    majEtatModele: function (lecture) {
        var me = this, g = me.down('#grossiste').getValue(), etat = me.down('#etatModele');
        if (!g) {
            etat.setText('');
            me.down('#oublierModele').hide();
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/pointage-bl/modele', method: 'GET', params: {grossiste: g},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                var lu = lecture === 'MODELE' ? 'Relevé lu avec le réglage mémorisé' : lecture === 'STANDARD' ? 'Relevé lu au format standard' : '';
                etat.setText(Ext.String.htmlEncode(lu || (o.memorise ? 'Réglage des colonnes mémorisé' : ''))
                        + (o.memorise && o.majLe ? ' <span class="pb-discret">(réglé le ' + Ext.String.htmlEncode(o.majLe) + ')</span>' : ''));
                me.down('#oublierModele').setVisible(!!o.memorise);
            }
        });
    },

    ouvrirReconnaissance: function (msg) {
        var me = this;
        if (!me.jeton) {
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/pointage-bl/releve/apercu', method: 'GET', params: {jeton: me.jeton},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    Ext.MessageBox.alert('Relevé du grossiste', Ext.String.htmlEncode(o.msg || 'Relevé à réimporter.'));
                    return;
                }
                me.apercu = o;
                me.messageReco = msg || '';
                me.construireApercu(o);
                me.down('#ongletRapprochement').getLayout().setActiveItem(1);
                me.essayer();
            }
        });
    },

    construireApercu: function (o) {
        var me = this, cols = o.colonnes || [], fields = ['n', 'lu', 'resume'], data = [];
        var choix = [{rang: -1, libelle: '(aucune)'}].concat(Ext.Array.map(cols, function (c) {
            return {rang: c.rang, libelle: 'C' + (c.rang + 1) + (c.entete ? ' · ' + c.entete : '')};
        }));
        Ext.Array.each(me.CHAMPS, function (c) {
            var combo = me.down('#champ-' + c.champ), v = o.champs ? o.champs[c.champ] : undefined;
            combo.getStore().loadData(choix);
            combo.setValue(v === undefined || v === null ? -1 : v);
        });
        me.down('#marqueursAvoir').suspendEvents();
        me.down('#marqueursAvoir').setValue(o.marqueursAvoir || 'AV');
        me.down('#marqueursAvoir').resumeEvents();
        Ext.Array.each(cols, function (c) {
            fields.push('c' + c.rang);
        });
        Ext.Array.each(o.lignes || [], function (l) {
            var x = {n: l.n, lu: false, resume: ''};
            Ext.Array.each(l.valeurs, function (v, i) {
                x['c' + i] = v;
            });
            data.push(x);
        });
        var store = Ext.create('Ext.data.Store', {fields: fields, data: data});
        var colonnes = [{text: 'Lu', dataIndex: 'resume', width: 230, renderer: function (v, m, r) {
                    return r.get('lu') ? '<span class="pb-lu">' + Ext.String.htmlEncode(v) + '</span>' : '<span class="pb-discret">ignorée</span>';
                }}].concat(Ext.Array.map(cols, function (c) {
            return {itemId: 'apercu-c' + c.rang, dataIndex: 'c' + c.rang, minWidth: 90, flex: 1, sortable: false, menuDisabled: true,
                tooltip: Ext.String.htmlEncode('C' + (c.rang + 1) + (c.entete ? ' · ' + c.entete : '')), renderer: Ext.String.htmlEncode};
        }));
        me.down('#grilleApercu').reconfigure(store, colonnes);
        me.majEntetesApercu();
    },

    /* en-tete de chaque colonne : numero, en-tete du releve et champ designe */
    majEntetesApercu: function () {
        var me = this, o = me.apercu, enc = Ext.String.htmlEncode;
        if (!o) {
            return;
        }
        Ext.Array.each(o.colonnes || [], function (c) {
            var col = me.down('#grilleApercu').down('#apercu-c' + c.rang), champs = [];
            Ext.Array.each(me.CHAMPS, function (ch) {
                if (me.down('#champ-' + ch.champ).getValue() === c.rang) {
                    champs.push(ch.libelle.replace(/^(ou|et) /, '').replace(' *', ''));
                }
            });
            if (col) {
                col.setText('C' + (c.rang + 1) + (c.entete ? ' · ' + enc(c.entete) : '')
                        + (champs.length ? '<br><b class="pb-champ">' + enc(champs.join(' + ')) + '</b>' : '<br><span class="pb-discret">—</span>'));
            }
        });
    },

    choixColonnes: function () {
        var me = this, champs = {};
        Ext.Array.each(me.CHAMPS, function (c) {
            var v = me.down('#champ-' + c.champ).getValue();
            if (v !== null && v !== undefined && v >= 0) {
                champs[c.champ] = v;
            }
        });
        return {jeton: me.jeton, champs: champs, marqueursAvoir: me.down('#marqueursAvoir').getValue()};
    },

    essayerBuffer: function () {
        var me = this;
        if (!me.essaiDiffere) {
            me.essaiDiffere = Ext.Function.createBuffered(me.essayer, 250, me);
        }
        me.essaiDiffere();
    },

    essayer: function () {
        var me = this, n = function (v) {
            return (v < 0 ? '-' : '') + Ext.util.Format.number(Math.abs(v || 0), '0,000');
        };
        Ext.Ajax.request({
            url: '../api/v1/pointage-bl/releve/essai', method: 'POST', jsonData: me.choixColonnes(),
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {}, parN = {}, store = me.down('#grilleApercu').getStore(), enc = Ext.String.htmlEncode;
                if (o.success === false) {
                    me.down('#recoInfo').update('<b style="color:#b42318">' + enc(o.msg || 'Relevé à réimporter.') + '</b>');
                    return;
                }
                Ext.Array.each(o.reconnues || [], function (x) {
                    parN[x.n] = x;
                });
                store.suspendEvents();
                store.each(function (rec) {
                    var x = parN[rec.get('n')];
                    rec.set('lu', !!x);
                    rec.set('resume', x ? (x.type === 'AVOIR' ? 'Avoir ' : 'BL ') + x.numero + (x.sequence ? ' / ' + x.sequence : '') + ' · ' + x.date + ' · ' + n(x.montantHt) : '');
                    rec.commit(true);
                });
                store.resumeEvents();
                me.down('#grilleApercu').getView().refresh();
                me.lignesLues = o.nombre || 0;
                me.down('#recoInfo').update((me.messageReco ? '<div class="pb-entete">' + enc(me.messageReco) + '</div>' : '')
                        + '<div>Fichier <b>' + enc(me.apercu.fichier || '') + '</b> — désignez la colonne de chaque champ (N° BL, date et un montant au moins).'
                        + ' Les lignes lues sont en vert, les en-têtes et totaux sont ignorés.</div>'
                        + (o.msg ? '<div><b style="color:#b26a00">' + enc(o.msg) + '</b></div>'
                                : '<div class="pb-totaux"><b>' + o.nombre + '</b> ligne(s) lue(s) : BL <b>' + n(o.totalBl) + '</b>, avoirs <b>' + n(o.totalAvoirs) + '</b>'
                                + (me.apercu.tronque ? ' (aperçu limité aux 400 premières lignes)' : '') + '</div>'));
                me.down('#appliquerModele').setDisabled(!!o.msg || !o.nombre);
            }
        });
    },

    appliquerModele: function () {
        var me = this, g = me.down('#grossiste').getValue();
        Ext.Ajax.request({
            url: '../api/v1/pointage-bl/releve/modele', method: 'POST', jsonData: me.choixColonnes(),
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    me.down('#recoInfo').update('<b style="color:#b42318">' + Ext.String.htmlEncode(o.msg || 'Réglage impossible.') + '</b>');
                    return;
                }
                me.down('#ongletRapprochement').getLayout().setActiveItem(0);
                me.afficherReleve(o);
                if (g) {
                    me.releves.load({params: {grossiste: g}});
                }
                me.majEtatModele('MODELE');
            }
        });
    },

    oublierModele: function () {
        var me = this, g = me.down('#grossiste').getValue();
        if (!g) {
            return;
        }
        Ext.MessageBox.confirm('Relevé du grossiste', 'Oublier le réglage des colonnes de ce grossiste ? Ses relevés seront de nouveau lus au format standard.', function (b) {
            if (b !== 'yes') {
                return;
            }
            Ext.Ajax.request({
                url: '../api/v1/pointage-bl/modele?grossiste=' + encodeURIComponent(g), method: 'DELETE',
                success: function () {
                    me.majEtatModele();
                }
            });
        });
    },

    pointerRapproches: function () {
        var me = this, o = me.releveCourant;
        if (!o) {
            return;
        }
        Ext.MessageBox.confirm('Pointage', 'Pointer les ' + (o.compteurs.RAPPROCHE || 0) + ' pièce(s) rapprochée(s) de ce relevé ?', function (b) {
            if (b !== 'yes') {
                return;
            }
            Ext.Ajax.request({
                url: '../api/v1/pointage-bl/releve/' + encodeURIComponent(o.id) + '/pointer', method: 'PUT',
                success: function (r) {
                    var x = Ext.decode(r.responseText, true) || {};
                    Ext.MessageBox.alert('Pointage', Ext.String.htmlEncode(x.msg || (x.success ? 'Pièces pointées.' : 'Pointage impossible.')));
                    me.charger();
                }
            });
        });
    }
});
