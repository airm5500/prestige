/* global Ext */

/*
 * GESTION DES COMMANDES > « Pré-saisie des BL » (plan avoir du 08/11, point 6, phase 1 : « pas encore actif »).
 * On préenregistre les BL reçus (mêmes champs que la fenêtre « Saisie du bon de livraison » de « Commande en cours »,
 * plus le grossiste et la commande, facultative) pour que les employés ne les saisissent pas plusieurs fois.
 * Un BL pré-saisi est « À saisir » ; quand le BL de même grossiste et de même numéro est créé depuis « Commande en
 * cours », il passe à « Traité » et disparaît de la liste par défaut. Un même grossiste et un même numéro ne se
 * pré-saisissent qu'une fois. Modification et suppression (avec un motif) tant que « À saisir » ; la confirmation se
 * fait dans le bouton (aucune fenêtre). Routes : ../api/v1/presaisie-bl (droit P_SM_PRESAISIE_BL).
 */
Ext.define('testextjs.view.commandemanagement.presaisie.PresaisieBl', {
    extend: 'Ext.panel.Panel',
    xtype: 'presaisiebl',
    layout: 'border',
    border: false,
    header: false,
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    URL: '../api/v1/presaisie-bl',
    ETATS: [{code: 'A_SAISIR', libelle: 'À saisir'}, {code: 'TRAITE', libelle: 'Traité'}, {code: 'SUPPRIME', libelle: 'Supprimé'},
        {code: 'TOUS', libelle: 'À saisir et traités'}],

    statics: {
        nombre: function (v) {
            return String(Math.round(Number(v) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        },
        jour: function (v) {
            return v && v.length >= 10 ? v.substr(8, 2) + '/' + v.substr(5, 2) + '/' + v.substr(0, 4) + (v.length > 10 ? ' ' + v.substr(11, 5) : '') : (v || '');
        }
    },

    initComponent: function () {
        var me = this, C = testextjs.view.commandemanagement.presaisie.PresaisieBl, aujourdhui = new Date();
        me.selection = null;
        var grossistes = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'], autoLoad: true,
            proxy: {type: 'ajax', url: me.URL + '/grossistes', reader: {type: 'json', root: 'data'}}
        });
        var grossistesFiltre = Ext.create('Ext.data.Store', {fields: ['id', 'libelle']});
        grossistes.on('load', function (st) {
            grossistesFiltre.loadData([{id: '', libelle: 'Tous les grossistes'}].concat(Ext.Array.pluck(st.getRange(), 'data')));
        });
        me.commandes = Ext.create('Ext.data.Store', {
            fields: ['id', 'reference', 'date', 'libelle'],
            proxy: {type: 'ajax', url: me.URL + '/commandes', reader: {type: 'json', root: 'data'}}
        });
        me.lignes = Ext.create('Ext.data.Store', {
            fields: ['id', 'grossisteId', 'grossiste', 'numero', 'date', {name: 'montantHt', type: 'int'}, {name: 'montantTva', type: 'int'},
                {name: 'montantTtc', type: 'int'}, 'sequence', 'commandeId', 'commandeRef', 'etat', 'etatLibelle', 'creePar', 'creeLe',
                'modifieLe', 'traiteLe', 'traitePar', 'bonLivraisonId', 'bonLivraisonRef', 'supprimeLe', 'supprimePar', 'motifSuppression'],
            pageSize: 50, remoteSort: false,
            proxy: {type: 'ajax', url: me.URL, reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    st.getProxy().extraParams = me.filtres();
                },
                load: function (st) {
                    var o = st.getProxy().getReader().rawData || {}, t = o.totaux || {};
                    if (o.success === false) {
                        me.message(o.msg || 'Lecture impossible.', true);
                    }
                    me.down('#psTotaux').update('<b>' + (o.total || 0) + '</b> BL — HT <b>' + C.nombre(t.montantHt) + '</b> · TVA <b>'
                            + C.nombre(t.montantTva) + '</b> · TTC <b>' + C.nombre(t.montantTtc) + '</b> F CFA');
                }
            }
        });
        var montant = function (itemId, libelle) {
            return {xtype: 'numberfield', itemId: itemId, fieldLabel: libelle, allowDecimals: false, minValue: 0, hideTrigger: true,
                keyNavEnabled: false, mouseWheelEnabled: false, value: 0, listeners: {change: function () {
                        me.majTtc();
                    }}};
        };
        Ext.apply(me, {
            items: [{
                    region: 'west', xtype: 'form', itemId: 'psFormulaire', width: 380, split: true, bodyPadding: 10, autoScroll: true,
                    title: 'Saisie du bon de livraison',
                    fieldDefaults: {labelAlign: 'right', labelWidth: 120, anchor: '100%', msgTarget: 'under'},
                    items: [
                        {xtype: 'component', itemId: 'psMode', margin: '0 0 8 0', html: ''},
                        {xtype: 'combobox', itemId: 'psGrossiste', fieldLabel: 'Grossiste', store: grossistes, queryMode: 'local',
                            displayField: 'libelle', valueField: 'id', forceSelection: true, allowBlank: false, anyMatch: true,
                            emptyText: 'Choisir le grossiste',
                            listeners: {change: function (c, v) {
                                    me.chargerCommandes(v);
                                }}},
                        {xtype: 'combobox', itemId: 'psCommande', fieldLabel: 'Commande', store: me.commandes, queryMode: 'local',
                            displayField: 'libelle', valueField: 'id', forceSelection: true, editable: false, emptyText: 'Facultative',
                            trigger2Cls: Ext.baseCSSPrefix + 'form-clear-trigger', onTrigger2Click: function () {
                                this.clearValue();
                            }},
                        {xtype: 'textfield', itemId: 'psNumero', fieldLabel: 'NUMERO BL', emptyText: 'NUMERO BL', allowBlank: false,
                            maxLength: 20, enforceMaxLength: true, fieldStyle: 'text-transform:uppercase'},
                        {xtype: 'textfield', itemId: 'psSequence', fieldLabel: 'N° SÉQUENCE', emptyText: 'Facultatif (ex. 48)',
                            maxLength: 20, enforceMaxLength: true, maskRe: /[A-Za-z0-9 .\/-]/},
                        {xtype: 'datefield', itemId: 'psDate', fieldLabel: 'Date BL', format: 'd/m/Y', submitFormat: 'Y-m-d',
                            allowBlank: false, maxValue: aujourdhui, value: aujourdhui},
                        montant('psHt', 'Montant Hors Taxe'),
                        montant('psTva', 'Montant TVA'),
                        {xtype: 'displayfield', itemId: 'psTtc', fieldLabel: 'Montant TTC', value: '0', fieldStyle: 'font-weight:bold'},
                        {xtype: 'component', itemId: 'psMessage', margin: '8 0 8 0', html: ''},
                        {xtype: 'container', layout: {type: 'hbox'}, defaults: {margin: '0 6 0 0'}, items: [
                                {xtype: 'button', itemId: 'psEnregistrer', text: 'Enregistrer', minWidth: 110, handler: function (b) {
                                        me.enregistrer(b);
                                    }},
                                {xtype: 'button', itemId: 'psNouveau', text: 'Nouvelle saisie', handler: function () {
                                        me.nouveau();
                                    }}
                            ]},
                        {xtype: 'fieldset', itemId: 'psZoneSuppression', title: 'Supprimer cette pré-saisie', hidden: true, margin: '14 0 0 0',
                            items: [
                                {xtype: 'textfield', itemId: 'psMotif', fieldLabel: 'Motif', labelWidth: 50, emptyText: 'Obligatoire (ex. saisi en double)',
                                    maxLength: 200, enforceMaxLength: true},
                                {xtype: 'button', itemId: 'psSupprimer', text: 'Supprimer', margin: '0 0 6 55', handler: function (b) {
                                        me.supprimer(b);
                                    }}
                            ]},
                        {xtype: 'component', itemId: 'psDetail', margin: '10 0 0 0', html: ''}
                    ]
                }, {
                    region: 'center', xtype: 'gridpanel', itemId: 'psGrille', store: me.lignes, columnLines: true,
                    viewConfig: {emptyText: '<div style="padding:20px;color:#7f8c8d">Aucun BL pré-saisi pour ces filtres.</div>', deferEmptyText: false},
                    columns: [
                        {text: 'Grossiste', dataIndex: 'grossiste', width: 140},
                        {text: 'N° BL', dataIndex: 'numero', width: 110},
                        {text: 'Date BL', dataIndex: 'date', width: 85, renderer: C.jour},
                        {text: 'HT', dataIndex: 'montantHt', width: 90, align: 'right', renderer: C.nombre},
                        {text: 'TVA', dataIndex: 'montantTva', width: 80, align: 'right', renderer: C.nombre},
                        {text: 'TTC', dataIndex: 'montantTtc', width: 95, align: 'right', renderer: C.nombre},
                        {text: 'Séq.', dataIndex: 'sequence', width: 55},
                        {text: 'Commande', dataIndex: 'commandeRef', width: 110},
                        {text: 'État', dataIndex: 'etat', width: 85, renderer: function (v, m, r) {
                                var c = v === 'A_SAISIR' ? '#b45309' : (v === 'TRAITE' ? '#15803d' : '#64748b');
                                return '<span style="color:' + c + ';font-weight:600">' + r.get('etatLibelle') + '</span>';
                            }},
                        {text: 'BL créé', dataIndex: 'bonLivraisonRef', width: 100},
                        {text: 'Traité le', dataIndex: 'traiteLe', width: 115, renderer: C.jour},
                        {text: 'Saisi par', dataIndex: 'creePar', width: 120},
                        {text: 'Saisi le', dataIndex: 'creeLe', width: 115, renderer: C.jour},
                        {text: 'Motif', dataIndex: 'motifSuppression', flex: 1, minWidth: 100, renderer: Ext.util.Format.htmlEncode}
                    ],
                    listeners: {
                        select: function (sm, rec) {
                            me.ouvrir(rec);
                        }
                    },
                    dockedItems: [{
                            xtype: 'toolbar', dock: 'top', itemId: 'psFiltres', items: [
                                {xtype: 'combobox', itemId: 'fGrossiste', fieldLabel: 'Grossiste', labelWidth: 60, width: 230, store: grossistesFiltre,
                                    queryMode: 'local', displayField: 'libelle', valueField: 'id', value: '', editable: false,
                                    emptyText: 'Tous les grossistes', listeners: {select: function () {
                                            me.rechercher();
                                        }}},
                                {xtype: 'combobox', itemId: 'fEtat', fieldLabel: 'État', labelWidth: 32, width: 190, editable: false, queryMode: 'local',
                                    displayField: 'libelle', valueField: 'code', value: 'A_SAISIR',
                                    store: Ext.create('Ext.data.Store', {fields: ['code', 'libelle'], data: me.ETATS}),
                                    listeners: {select: function () {
                                            me.rechercher();
                                        }}}
                            ]
                        }, {
                            /* seconde ligne de filtres : tout reste visible a 1366 px (pas de menu de debordement) */
                            xtype: 'toolbar', dock: 'top', itemId: 'psFiltres2', items: [
                                {xtype: 'datefield', itemId: 'fDu', fieldLabel: 'Du', labelWidth: 22, width: 130, format: 'd/m/Y', submitFormat: 'Y-m-d'},
                                {xtype: 'datefield', itemId: 'fAu', fieldLabel: 'au', labelWidth: 20, width: 128, format: 'd/m/Y', submitFormat: 'Y-m-d'},
                                {xtype: 'textfield', itemId: 'fNumero', emptyText: 'N° de BL', width: 110, enableKeyEvents: true,
                                    listeners: {specialkey: function (f, e) {
                                            if (e.getKey() === e.ENTER) {
                                                me.rechercher();
                                            }
                                        }}},
                                {xtype: 'button', itemId: 'fRechercher', text: 'Rechercher', iconCls: 'searchicon', handler: function () {
                                        me.rechercher();
                                    }}
                            ]
                        }, {
                            xtype: 'pagingtoolbar', dock: 'bottom', store: me.lignes, displayInfo: false,
                            items: ['-', {xtype: 'component', itemId: 'psTotaux', html: ''}]
                        }]
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.nouveau();
            me.lignes.load();
        }, me, {single: true});
    },

    filtres: function () {
        var me = this, v = function (id) {
            return me.down('#' + id);
        };
        return {
            grossiste: v('fGrossiste').getValue() || '',
            etat: v('fEtat').getValue() || 'A_SAISIR',
            du: v('fDu').getSubmitValue() || '',
            au: v('fAu').getSubmitValue() || '',
            numero: Ext.String.trim(v('fNumero').getValue() || '')
        };
    },

    rechercher: function () {
        this.lignes.loadPage(1);
    },

    chargerCommandes: function (grossisteId, puis) {
        var me = this, cmd = me.down('#psCommande'), garder = cmd.getValue();
        if (!grossisteId) {
            me.commandes.removeAll();
            cmd.clearValue();
            return;
        }
        me.commandes.load({params: {grossiste: grossisteId}, callback: function () {
                if (puis) {
                    puis();
                } else if (garder && !me.commandes.findRecord('id', garder, 0, false, false, true)) {
                    cmd.clearValue();
                }
            }});
    },

    majTtc: function () {
        var C = testextjs.view.commandemanagement.presaisie.PresaisieBl,
                ht = Number(this.down('#psHt').getValue()) || 0, tva = Number(this.down('#psTva').getValue()) || 0;
        this.down('#psTtc').setValue(C.nombre(ht + tva));
    },

    message: function (texte, erreur) {
        var m = this.down('#psMessage');
        if (m) {
            m.update(texte ? '<div class="ps-message" style="padding:6px 8px;border-radius:6px;' + (erreur
                    ? 'background:#fef2f2;color:#b91c1c;border:1px solid #fecaca'
                    : 'background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0') + '">' + Ext.String.htmlEncode(texte) + '</div>' : '');
        }
    },

    /** Confirmation dans le bouton : premier clic -> « Confirmer … » (rouge) ; second clic dans les 5 s -> action. */
    deuxTemps: function (b, texte, action) {
        if (b.psArme && Date.now() - b.psArme > 400) {
            clearTimeout(b.psMinuterie);
            b.psArme = 0;
            b.setText(b.psTexte);
            b.removeCls('ps-confirmer');
            action();
            return;
        }
        if (b.psArme) {
            return;
        }
        b.psTexte = b.psTexte || b.getText();
        b.psArme = Date.now();
        b.setText(texte);
        b.addCls('ps-confirmer');
        b.psMinuterie = setTimeout(function () {
            if (!b.isDestroyed) {
                b.psArme = 0;
                b.setText(b.psTexte);
                b.removeCls('ps-confirmer');
            }
        }, 5000);
    },

    valeurs: function () {
        var me = this, v = function (id) {
            return me.down('#' + id);
        };
        return {
            grossisteId: v('psGrossiste').getValue() || '',
            commandeId: v('psCommande').getValue() || '',
            numero: Ext.String.trim(v('psNumero').getValue() || '').toUpperCase(),
            sequence: Ext.String.trim(v('psSequence').getValue() || ''),
            date: v('psDate').getSubmitValue() || '',
            montantHt: v('psHt').getValue() === null ? 0 : v('psHt').getValue(),
            montantTva: v('psTva').getValue() === null ? 0 : v('psTva').getValue()
        };
    },

    nouveau: function () {
        var me = this;
        me.selection = null;
        me.down('#psGrille').getSelectionModel().deselectAll(true);
        Ext.each(['psGrossiste', 'psCommande', 'psNumero', 'psSequence', 'psDate', 'psHt', 'psTva'], function (id) {
            me.down('#' + id).setReadOnly(false);
        });
        me.down('#psGrossiste').clearValue();
        me.down('#psCommande').clearValue();
        me.down('#psNumero').setValue('');
        me.down('#psSequence').setValue('');
        me.down('#psDate').setValue(new Date());
        me.down('#psHt').setValue(0);
        me.down('#psTva').setValue(0);
        me.down('#psMotif').setValue('');
        me.down('#psZoneSuppression').hide();
        me.down('#psEnregistrer').show().setText('Enregistrer');
        me.down('#psEnregistrer').psTexte = 'Enregistrer';
        me.down('#psMode').update('<b>Nouvelle pré-saisie</b>');
        me.down('#psDetail').update('');
        me.down('#psFormulaire').getForm().clearInvalid();
        me.majTtc();
    },

    ouvrir: function (rec) {
        var me = this, C = testextjs.view.commandemanagement.presaisie.PresaisieBl, d = rec.data, modifiable = d.etat === 'A_SAISIR';
        me.selection = d;
        me.message('');
        Ext.each(['psGrossiste', 'psCommande', 'psNumero', 'psSequence', 'psDate', 'psHt', 'psTva'], function (id) {
            me.down('#' + id).setReadOnly(!modifiable);
        });
        me.down('#psGrossiste').suspendEvents();
        me.down('#psGrossiste').setValue(d.grossisteId);
        me.down('#psGrossiste').resumeEvents();
        me.chargerCommandes(d.grossisteId, function () {
            if (d.commandeId && !me.commandes.findRecord('id', d.commandeId, 0, false, false, true)) {
                me.commandes.add({id: d.commandeId, reference: d.commandeRef, libelle: d.commandeRef});
            }
            me.down('#psCommande').setValue(d.commandeId || null);
        });
        me.down('#psNumero').setValue(d.numero);
        me.down('#psSequence').setValue(d.sequence);
        me.down('#psDate').setValue(Ext.Date.parse(d.date, 'Y-m-d'));
        me.down('#psHt').setValue(d.montantHt);
        me.down('#psTva').setValue(d.montantTva);
        me.down('#psMotif').setValue('');
        me.down('#psZoneSuppression').setVisible(modifiable);
        me.down('#psEnregistrer').setVisible(modifiable);
        me.down('#psEnregistrer').psTexte = 'Enregistrer les modifications';
        me.down('#psEnregistrer').setText('Enregistrer les modifications');
        me.down('#psMode').update(modifiable ? '<b>Modification du BL ' + Ext.String.htmlEncode(d.numero) + '</b> (à saisir)'
                : '<b>BL ' + Ext.String.htmlEncode(d.numero) + ' : ' + d.etatLibelle.toLowerCase() + '</b> (consultation)');
        var detail = 'Pré-saisi par ' + Ext.String.htmlEncode(d.creePar) + ' le ' + C.jour(d.creeLe)
                + (d.modifieLe ? '<br>Modifié le ' + C.jour(d.modifieLe) : '');
        if (d.etat === 'TRAITE') {
            detail += '<br>Traité le ' + C.jour(d.traiteLe) + (d.traitePar ? ' par ' + Ext.String.htmlEncode(d.traitePar) : '')
                    + ' : BL créé <b>' + Ext.String.htmlEncode(d.bonLivraisonRef || d.bonLivraisonId) + '</b>';
        } else if (d.etat === 'SUPPRIME') {
            detail += '<br>Supprimé le ' + C.jour(d.supprimeLe) + (d.supprimePar ? ' par ' + Ext.String.htmlEncode(d.supprimePar) : '')
                    + ' : ' + Ext.String.htmlEncode(d.motifSuppression);
        }
        me.down('#psDetail').update('<div style="color:#475569;font-size:12px;line-height:1.5">' + detail + '</div>');
        me.majTtc();
    },

    appeler: function (methode, url, corps, fini) {
        var me = this;
        Ext.Ajax.request({
            url: url, method: methode, headers: {'Content-Type': 'application/json'}, jsonData: corps,
            success: function (r) {
                fini(Ext.decode(r.responseText, true) || {success: false, msg: 'Réponse illisible.'});
            },
            failure: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                fini({success: false, msg: o.msg || ('Serveur injoignable (' + r.status + ').')});
            }
        });
    },

    enregistrer: function (b) {
        var me = this, val = me.valeurs(), modif = me.selection && me.selection.etat === 'A_SAISIR';
        if (!me.down('#psFormulaire').getForm().isValid()) {
            me.message('Renseignez le grossiste, le numéro et la date du BL.', true);
            return;
        }
        var faire = function () {
            b.disable();
            me.appeler(modif ? 'PUT' : 'POST', modif ? me.URL + '/' + encodeURIComponent(me.selection.id) : me.URL, val, function (o) {
                b.enable();
                if (!o.success) {
                    me.message(o.msg || 'Enregistrement refusé.', true);
                    return;
                }
                me.message(o.msg);
                if (modif) {
                    me.lignes.load({callback: function () {
                            var r = me.lignes.findRecord('id', o.data.id, 0, false, false, true);
                            if (r) {
                                me.down('#psGrille').getSelectionModel().select(r);
                            } else {
                                me.nouveau();
                            }
                            me.message(o.msg);
                        }});
                } else {
                    var garder = val.grossisteId;
                    me.nouveau();
                    /* saisie en série chez le même grossiste : le grossiste reste choisi */
                    me.down('#psGrossiste').setValue(garder);
                    me.message(o.msg);
                    me.lignes.load();
                    me.down('#psNumero').focus(false, 50);
                }
            });
        };
        if (modif) {
            me.deuxTemps(b, 'Confirmer la modification', faire);
        } else {
            faire();
        }
    },

    supprimer: function (b) {
        var me = this, motif = Ext.String.trim(me.down('#psMotif').getValue() || '');
        if (!me.selection) {
            return;
        }
        if (motif.length < 3) {
            me.message('Le motif de la suppression est obligatoire (3 caractères au moins).', true);
            me.down('#psMotif').focus(false, 50);
            return;
        }
        me.deuxTemps(b, 'Confirmer la suppression', function () {
            b.disable();
            me.appeler('POST', me.URL + '/' + encodeURIComponent(me.selection.id) + '/suppression', {motif: motif}, function (o) {
                b.enable();
                if (!o.success) {
                    me.message(o.msg || 'Suppression refusée.', true);
                    return;
                }
                me.nouveau();
                me.message(o.msg);
                me.lignes.load();
            });
        });
    }
});

Ext.util.CSS.createStyleSheet('.ps-confirmer.x-btn{background:#c0392b !important;border-color:#a93226 !important}'
        + '.ps-confirmer.x-btn .x-btn-inner{color:#fff !important;font-weight:bold}', 'presaisie-bl-styles');
