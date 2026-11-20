/* global Ext, PrestigeConfirmation, PrestigeChargement */

/*
 * Plan du 19/11, point 16 : onglet « Règlements fournisseurs » de l'état de contrôle des achats (API REST
 * v1/reglements-fournisseurs, aucune JSP).
 *  - bandeau : « Suivi des règlements depuis le JJ/MM/AAAA », date et « Appliquer » (confirmation dans le bouton) pour
 *    qui a le droit P_REGLEMENT_FRS_DATE_DEPART, lecture seule sinon ;
 *  - À régler : dû par grossiste, en tranches d'âge (0-30, 31-60, 61-90, plus de 90 jours) ;
 *  - Saisir : grossiste, montant, date, mode, référence ; réparti sur les BL les plus anciens, ou sur ceux cochés
 *    (colonne « Part du règlement » : la répartition qui sera enregistrée) ; confirmation dans le bouton ;
 *  - Historique : règlements et leur répartition, annulation (confirmation dans le bouton), relevé Excel et PDF par
 *    grossiste.
 */
Ext.define('testextjs.view.commandemanagement.etats.ReglementsFournisseurs', {
    extend: 'Ext.panel.Panel',
    xtype: 'reglementsfournisseurs',
    layout: 'fit',
    border: false,
    cls: 'ca-reglements-frs',

    URL: '../api/v1/reglements-fournisseurs/',
    MODES: [['ESPECES', 'Espèces'], ['CHEQUE', 'Chèque'], ['VIREMENT', 'Virement'], ['MOBILE_MONEY', 'Mobile money']],

    initComponent: function () {
        var me = this;
        me.storeARegler = Ext.create('Ext.data.Store', {
            fields: ['grossisteId', 'grossiste', {name: 'nombre', type: 'int'}, {name: 't0', type: 'int'}, {name: 't1', type: 'int'},
                {name: 't2', type: 'int'}, {name: 't3', type: 'int'}, {name: 'total', type: 'int'}],
            proxy: {type: 'ajax', url: me.URL + 'a-regler', reader: {type: 'json', root: 'data'}},
            listeners: {load: function (s, r, ok) {
                    var raw = s.getProxy().getReader().rawData || {};
                    me.majTotalARegler(ok === false ? null : raw);
                }}
        });
        me.storeBls = Ext.create('Ext.data.Store', {
            fields: ['id', 'numero', 'date', 'dateIso', {name: 'age', type: 'int'}, 'tranche', {name: 'ttc', type: 'int'},
                {name: 'regle', type: 'int'}, {name: 'restant', type: 'int'}, 'statut', {name: 'part', type: 'int'}],
            proxy: {type: 'ajax', url: me.URL + 'bls', reader: {type: 'json', root: 'data'}},
            listeners: {beforeload: function (s) {
                    s.getProxy().extraParams = {grossisteId: me.down('#rfGrossiste').getValue() || ''};
                }, load: function () {
                    me.repartir();
                }}
        });
        me.storeReglements = Ext.create('Ext.data.Store', {
            fields: ['id', 'reference', {name: 'montant', type: 'int'}, 'date', 'dateIso', 'mode', 'libelleMode', 'referencePaiement',
                'saisiLe', {name: 'annule', type: 'boolean'}, 'annuleLe', 'annulePar', {name: 'sortieCaisse', type: 'boolean'},
                'grossisteId', 'grossiste', 'auteur', {name: 'nombreBl', type: 'int'}, 'bls', 'parts'],
            proxy: {type: 'ajax', url: me.URL + 'historique', reader: {type: 'json', root: 'data'}},
            listeners: {beforeload: function (s) {
                    s.getProxy().extraParams = me.criteresHistorique();
                }, load: function (s, r, ok) {
                    var raw = s.getProxy().getReader().rawData || {};
                    me.down('#rfHistoTotal').setText(ok === false ? 'Chargement impossible'
                            : (raw.actifs || 0) + ' règlement(s) · ' + me.montant(raw.montant) + (raw.total > raw.actifs
                            ? ' · ' + (raw.total - raw.actifs) + ' annulé(s)' : ''));
                    me.storeParts.removeAll();
                    me.majBoutonAnnuler();
                }}
        });
        me.storeParts = Ext.create('Ext.data.Store', {
            fields: ['blId', 'numero', 'dateBl', {name: 'ttc', type: 'int'}, {name: 'montant', type: 'int'}]
        });
        me.storeGrossistes = Ext.create('Ext.data.Store', {
            fields: ['lg_GROSSISTE_ID', 'str_LIBELLE'], pageSize: 999,
            proxy: {type: 'ajax', url: '../api/v1/grossiste/all', reader: {type: 'json', root: 'results', totalProperty: 'total'}}
        });
        Ext.apply(me, {
            dockedItems: [me.creerBandeau()],
            items: [{xtype: 'tabpanel', itemId: 'rfOnglets', border: false, plain: true,
                    items: [me.creerARegler(), me.creerSaisie(), me.creerHistorique()],
                    listeners: {tabchange: function (tp, onglet) {
                            me.afficherOnglet(onglet.itemId);
                        }}}]
        });
        me.callParent(arguments);
    },

    montant: function (v) {
        return Ext.util.Format.number(v || 0, '0,000');
    },

    texte: function (v) {
        return Ext.String.htmlEncode(v || '');
    },

    /** Appel JSON ; rappel(ok, reponse). */
    appeler: function (methode, chemin, corps, rappel) {
        Ext.Ajax.request({
            url: this.URL + chemin, method: methode, jsonData: corps || undefined, headers: {'Content-Type': 'application/json'},
            success: function (r) {
                var o = {};
                try {
                    o = Ext.decode(r.responseText);
                } catch (e) {
                    o = {success: false, msg: 'Réponse illisible du serveur.'};
                }
                rappel(o.success === true, o);
            },
            failure: function (r) {
                rappel(false, {msg: 'Le serveur ne répond pas (code ' + r.status + ').'});
            }
        });
    },

    message: function (cmp, ok, texte) {
        var t = this.down(cmp);
        if (t) {
            t.setText('<span style="color:' + (ok ? '#1e7e34' : '#c0392b') + ';font-weight:bold">' + Ext.String.htmlEncode(texte || '') + '</span>');
        }
    },

    /** Premier affichage, puis à chaque retour sur l'onglet. */
    charger: function () {
        var me = this;
        me.chargerDepart();
        var onglet = me.down('#rfOnglets').getActiveTab();
        me.afficherOnglet(onglet ? onglet.itemId : 'rfARegler');
    },

    afficherOnglet: function (id) {
        var me = this;
        if (id === 'rfARegler') {
            me.storeARegler.load();
        } else if (id === 'rfSaisir') {
            me.storeARegler.load();
            if (me.down('#rfGrossiste').getValue()) {
                me.storeBls.load();
            }
        } else if (id === 'rfHistorique') {
            me.storeReglements.load();
        }
    },

    /* ------------------------------------------------------------------ bandeau : date de départ */

    creerBandeau: function () {
        var me = this;
        return {xtype: 'toolbar', dock: 'top', itemId: 'rfBandeau', cls: 'rf-bandeau', style: 'background:#fdf6e3',
            items: [{xtype: 'tbtext', itemId: 'rfDepartTexte', text: 'Suivi des règlements depuis le …'},
                {xtype: 'datefield', itemId: 'rfDepart', width: 110, format: 'd/m/Y', maxValue: new Date(), hidden: true},
                {xtype: 'button', itemId: 'rfAppliquer', text: 'Appliquer', hidden: true, handler: function (b) {
                        me.appliquerDepart(b);
                    }},
                {xtype: 'tbtext', itemId: 'rfDepartAide', text: ''},
                '->', {xtype: 'tbtext', itemId: 'rfDepartMessage', text: ''}]};
    },

    chargerDepart: function () {
        var me = this;
        me.appeler('GET', 'depart', null, function (ok, o) {
            if (!ok) {
                me.message('#rfDepartMessage', false, o.msg);
                return;
            }
            me.depart = o;
            me.down('#rfDepartTexte').setText('<b>Suivi des règlements depuis le ' + o.affiche + '</b>');
            var champ = me.down('#rfDepart'), bouton = me.down('#rfAppliquer');
            champ.setVisible(o.modifiable === true);
            bouton.setVisible(o.modifiable === true);
            champ.setValue(Ext.Date.parse(o.depart, 'Y-m-d'));
            me.down('#rfDepartAide').setText(o.modifiable ? 'les BL d\'avant sont considérés comme réglés'
                    : '(lecture seule : les BL d\'avant sont considérés comme réglés)');
        });
    },

    appliquerDepart: function (b) {
        var me = this, d = me.down('#rfDepart').getValue();
        if (!d || !me.down('#rfDepart').isValid()) {
            me.message('#rfDepartMessage', false, 'Indiquez une date de départ valide.');
            return;
        }
        if (me.depart && Ext.Date.format(d, 'Y-m-d') === me.depart.depart) {
            me.message('#rfDepartMessage', true, 'Date inchangée.');
            return;
        }
        PrestigeConfirmation.bouton(b, 'Confirmer : les BL avant le ' + Ext.Date.format(d, 'd/m/Y') + ' seront considérés comme réglés', function () {
            me.appeler('POST', 'depart', {date: Ext.Date.format(d, 'Y-m-d')}, function (ok, o) {
                me.message('#rfDepartMessage', ok, ok ? 'Date de départ appliquée : ' + o.affiche : o.msg);
                if (ok) {
                    me.charger();
                    var liste = me.up('controleachats');
                    if (liste && liste.liste && liste.liste.getStore && liste.liste.getStore()) {
                        liste.liste.getStore().load();
                    }
                }
            });
        });
    },

    /* ------------------------------------------------------------------ à régler */

    creerARegler: function () {
        var me = this, m = function (v) {
            return v ? me.montant(v) : '';
        };
        return {xtype: 'grid', itemId: 'rfARegler', title: 'À régler', store: me.storeARegler, columnLines: true,
            viewConfig: {emptyText: 'Aucun BL à régler depuis la date de départ.', deferEmptyText: false},
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {text: 'Actualiser', itemId: 'rfActualiser', iconCls: 'refresh', handler: function () {
                                me.storeARegler.load();
                            }},
                        {text: 'Régler ce grossiste', itemId: 'rfReglerGrossiste', handler: function () {
                                var r = me.down('#rfARegler').getSelectionModel().getSelection()[0];
                                if (r) {
                                    me.reglerGrossiste(r.get('grossisteId'));
                                }
                            }},
                        '->', {xtype: 'tbtext', itemId: 'rfTotalARegler', text: ''}]}],
            listeners: {itemdblclick: function (v, r) {
                    me.reglerGrossiste(r.get('grossisteId'));
                }},
            columns: [
                {text: 'Grossiste', dataIndex: 'grossiste', flex: 1, minWidth: 200, renderer: me.texte},
                {text: 'BL', dataIndex: 'nombre', width: 60, align: 'right'},
                {text: '0-30 j', dataIndex: 't0', width: 115, align: 'right', renderer: m},
                {text: '31-60 j', dataIndex: 't1', width: 115, align: 'right', renderer: m},
                {text: '61-90 j', dataIndex: 't2', width: 115, align: 'right', renderer: m},
                {text: 'Plus de 90 j', dataIndex: 't3', width: 115, align: 'right', renderer: m},
                {text: 'Total dû', dataIndex: 'total', width: 130, align: 'right', renderer: function (v) {
                        return '<b>' + me.montant(v) + '</b>';
                    }}
            ]};
    },

    majTotalARegler: function (raw) {
        var t = this.down('#rfTotalARegler');
        if (!raw) {
            t.setText('Chargement impossible');
            return;
        }
        t.setText((raw.nombre || 0) + ' BL · 0-30 j ' + this.montant(raw.t0) + ' · 31-60 j ' + this.montant(raw.t1)
                + ' · 61-90 j ' + this.montant(raw.t2) + ' · plus de 90 j ' + this.montant(raw.t3)
                + ' · <b>total dû ' + this.montant(raw.total) + '</b>');
    },

    reglerGrossiste: function (id) {
        var me = this;
        me.down('#rfOnglets').setActiveTab(me.down('#rfSaisir'));
        me.down('#rfGrossiste').setValue(id);
        me.storeBls.load();
    },

    /* ------------------------------------------------------------------ saisie */

    creerSaisie: function () {
        var me = this, aujourdhui = new Date();
        var maj = {change: function () {
                me.repartir();
            }};
        return {xtype: 'grid', itemId: 'rfSaisir', title: 'Saisir un règlement', store: me.storeBls, columnLines: true,
            selModel: Ext.create('Ext.selection.CheckboxModel', {checkOnly: true, listeners: {selectionchange: function () {
                        me.repartir();
                    }}}),
            viewConfig: {emptyText: 'Choisissez un grossiste : ses BL à régler s\'affichent ici, les plus anciens d\'abord.', deferEmptyText: false},
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'rfFormulaire', items: [
                        {xtype: 'combobox', itemId: 'rfGrossiste', fieldLabel: 'Grossiste', labelWidth: 60, width: 290,
                            store: me.storeARegler, valueField: 'grossisteId', displayField: 'grossiste', queryMode: 'local',
                            forceSelection: true, editable: true, typeAhead: true, emptyText: 'Grossiste avec des BL à régler',
                            listeners: {select: function () {
                                    me.storeBls.load();
                                }}},
                        {xtype: 'numberfield', itemId: 'rfMontant', fieldLabel: 'Montant', labelWidth: 50, width: 175, minValue: 1,
                            allowDecimals: false, hideTrigger: true, enableKeyEvents: true, listeners: Ext.apply({keyup: function () {
                                    me.repartir();
                                }}, maj)},
                        {xtype: 'button', itemId: 'rfToutRegler', text: 'Tout le dû', tooltip: 'Montant = reste à payer des BL cochés (ou de tous)',
                            handler: function () {
                                me.down('#rfMontant').setValue(me.du());
                            }},
                        {xtype: 'datefield', itemId: 'rfDate', fieldLabel: 'Date', labelWidth: 32, width: 140, format: 'd/m/Y',
                            value: aujourdhui, maxValue: aujourdhui},
                        {xtype: 'combobox', itemId: 'rfMode', fieldLabel: 'Mode', labelWidth: 36, width: 165, queryMode: 'local',
                            store: me.MODES, value: 'ESPECES', forceSelection: true, editable: false},
                        {xtype: 'textfield', itemId: 'rfReference', fieldLabel: 'Référence', labelWidth: 62, width: 210,
                            emptyText: 'N° chèque, virement…'},
                        {xtype: 'button', itemId: 'rfEnregistrer', text: 'Enregistrer le règlement', handler: function (b) {
                                me.enregistrer(b);
                            }}]},
                {xtype: 'toolbar', dock: 'bottom', items: [{xtype: 'tbtext', itemId: 'rfRepartition', text: ''}, '->',
                        {xtype: 'tbtext', itemId: 'rfMessage', text: ''}]}],
            columns: [
                {text: 'N° BL', dataIndex: 'numero', width: 140, renderer: me.texte},
                {text: 'Date du BL', dataIndex: 'date', width: 95},
                {text: 'Âge (j)', dataIndex: 'age', width: 70, align: 'right'},
                {text: 'Tranche', dataIndex: 'tranche', width: 75},
                {text: 'TTC', dataIndex: 'ttc', width: 115, align: 'right', renderer: me.montant},
                {text: 'Déjà réglé', dataIndex: 'regle', width: 115, align: 'right', renderer: me.montant},
                {text: 'Reste à payer', dataIndex: 'restant', width: 120, align: 'right', renderer: me.montant},
                {text: 'Part du règlement', dataIndex: 'part', itemId: 'colPart', width: 135, align: 'right', renderer: function (v) {
                        return v ? '<b style="color:#1e7e34">' + me.montant(v) + '</b>' : '';
                    }},
                {text: 'Reste après', width: 120, align: 'right', renderer: function (v, m, r) {
                        return me.montant(r.get('restant') - (r.get('part') || 0));
                    }}
            ]};
    },

    /** BL concernés : ceux cochés (dans l'ordre de la liste, les plus anciens d'abord), sinon tous. */
    blsConcernes: function () {
        var me = this, coches = me.down('#rfSaisir').getSelectionModel().getSelection(), l = [];
        me.storeBls.each(function (r) {
            if (!coches.length || Ext.Array.contains(coches, r)) {
                l.push(r);
            }
        });
        return l;
    },

    du: function () {
        var d = 0;
        Ext.each(this.blsConcernes(), function (r) {
            d += r.get('restant');
        });
        return d;
    },

    /** Même règle que le serveur : chaque part = min(reste à répartir, reste à payer du BL). */
    repartir: function () {
        var me = this, reste = me.down('#rfMontant').getValue() || 0, concernes = me.blsConcernes(), n = 0, du = me.du();
        me.storeBls.each(function (r) {
            r.set('part', 0);
        });
        if (reste > 0 && reste <= du) {
            Ext.each(concernes, function (r) {
                var p = Math.min(reste, r.get('restant'));
                if (p > 0) {
                    r.set('part', p);
                    reste -= p;
                    n++;
                }
            });
        }
        me.storeBls.commitChanges();
        var coches = me.down('#rfSaisir').getSelectionModel().getCount();
        var montant = me.down('#rfMontant').getValue() || 0;
        me.down('#rfRepartition').setText(me.storeBls.getCount() ? (coches ? coches + ' BL coché(s)' : 'Les plus anciens d\'abord')
                + ' · dû ' + me.montant(du) + (montant > du ? ' · <span style="color:#c0392b">le montant dépasse le dû</span>'
                : montant > 0 ? ' · réparti sur ' + n + ' BL' : '') : '');
    },

    enregistrer: function (b) {
        var me = this, g = me.down('#rfGrossiste'), montant = me.down('#rfMontant').getValue(), date = me.down('#rfDate').getValue(),
                mode = me.down('#rfMode').getValue(), du = me.du(), coches = me.down('#rfSaisir').getSelectionModel().getSelection();
        var refus = !g.getValue() ? 'Choisissez le grossiste.' : !(montant > 0) ? 'Indiquez le montant du règlement.'
                : montant > du ? 'Le montant (' + me.montant(montant) + ') dépasse le total dû (' + me.montant(du) + ').'
                : !date || !me.down('#rfDate').isValid() ? 'Indiquez la date du règlement.' : !mode ? 'Choisissez le mode.' : null;
        if (refus) {
            me.message('#rfMessage', false, refus);
            return;
        }
        var n = 0;
        me.storeBls.each(function (r) {
            n += r.get('part') > 0 ? 1 : 0;
        });
        var libelleMode = Ext.Array.findBy(me.MODES, function (x) {
            return x[0] === mode;
        })[1];
        PrestigeConfirmation.bouton(b, 'Confirmer : régler ' + me.montant(montant) + ' à ' + g.getRawValue() + ' (' + n + ' BL, '
                + libelleMode.toLowerCase() + ')', function () {
            me.message('#rfMessage', true, 'Enregistrement…');
            me.appeler('POST', 'regler', {grossisteId: g.getValue(), montant: montant, date: Ext.Date.format(date, 'Y-m-d'), mode: mode,
                reference: me.down('#rfReference').getValue() || '', bls: Ext.Array.map(coches, function (r) {
                    return r.get('id');
                })}, function (ok, o) {
                me.message('#rfMessage', ok, o.msg);
                if (ok) {
                    me.dernierReglement = o;
                    me.down('#rfMontant').setValue(null);
                    me.down('#rfReference').setValue('');
                    me.down('#rfSaisir').getSelectionModel().deselectAll();
                    me.storeARegler.load();
                    me.storeBls.load();
                }
            });
        });
    },

    /* ------------------------------------------------------------------ historique */

    creerHistorique: function () {
        var me = this, aujourdhui = new Date();
        var entree = {specialkey: function (f, e) {
                if (e.getKey() === e.ENTER) {
                    me.storeReglements.load();
                }
            }};
        var parts = Ext.create('Ext.grid.Panel', {
            itemId: 'rfParts', store: me.storeParts, region: 'south', height: 170, split: true, title: 'Répartition du règlement',
            viewConfig: {emptyText: 'Sélectionnez un règlement pour voir sa répartition.', deferEmptyText: false},
            columns: [
                {text: 'N° BL', dataIndex: 'numero', width: 150, renderer: me.texte},
                {text: 'Date du BL', dataIndex: 'dateBl', width: 100},
                {text: 'TTC du BL', dataIndex: 'ttc', width: 120, align: 'right', renderer: me.montant},
                {text: 'Part du règlement', dataIndex: 'montant', width: 140, align: 'right', renderer: me.montant}
            ]
        });
        var reglements = Ext.create('Ext.grid.Panel', {
            itemId: 'rfReglements', store: me.storeReglements, region: 'center', columnLines: true,
            viewConfig: {emptyText: 'Aucun règlement sur la période.', deferEmptyText: false, getRowClass: function (r) {
                    return r.get('annule') ? 'rf-annule' : '';
                }},
            listeners: {selectionchange: function (sm, sel) {
                    me.storeParts.loadData(sel.length ? (sel[0].get('parts') || []) : []);
                    me.majBoutonAnnuler();
                }},
            columns: [
                {text: 'Date', dataIndex: 'date', width: 90},
                {text: 'Règlement', dataIndex: 'reference', width: 135},
                {text: 'Grossiste', dataIndex: 'grossiste', flex: 1, minWidth: 160, renderer: me.texte},
                {text: 'Mode', dataIndex: 'libelleMode', width: 95},
                {text: 'Référence', dataIndex: 'referencePaiement', width: 120, renderer: me.texte},
                {text: 'Montant', dataIndex: 'montant', width: 115, align: 'right', renderer: function (v, m, r) {
                        return r.get('annule') ? '<s>' + me.montant(v) + '</s>' : '<b>' + me.montant(v) + '</b>';
                    }},
                {text: 'BL réglés', dataIndex: 'bls', flex: 1, minWidth: 160, renderer: me.texte},
                {text: 'Caisse', dataIndex: 'sortieCaisse', width: 70, renderer: function (v) {
                        return v ? 'Sortie' : '';
                    }},
                {text: 'Saisi le', dataIndex: 'saisiLe', width: 120},
                {text: 'Par', dataIndex: 'auteur', width: 140, renderer: me.texte},
                {text: 'État', dataIndex: 'annule', width: 190, renderer: function (v, m, r) {
                        return v ? '<span style="color:#c0392b">Annulé le ' + r.get('annuleLe') + ' par ' + me.texte(r.get('annulePar')) + '</span>' : 'Actif';
                    }}
            ]
        });
        return {xtype: 'panel', itemId: 'rfHistorique', title: 'Historique', layout: 'border', border: false,
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'rfBarreHistorique', items: [
                        {xtype: 'datefield', itemId: 'rfDu', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y',
                            value: Ext.Date.getFirstDateOfMonth(aujourdhui), maxValue: aujourdhui, listeners: entree},
                        {xtype: 'datefield', itemId: 'rfAu', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y',
                            value: aujourdhui, maxValue: aujourdhui, listeners: entree},
                        {xtype: 'combobox', itemId: 'rfHistoGrossiste', width: 230, store: me.storeGrossistes, valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE', queryMode: 'remote', minChars: 1, typeAhead: true, emptyText: 'Tous les grossistes',
                            listeners: Ext.apply({select: function () {
                                    me.storeReglements.load();
                                }}, entree)},
                        {text: 'Rechercher', itemId: 'rfRechercher', iconCls: 'searchicon', handler: function () {
                                me.storeReglements.load();
                            }},
                        {text: 'Relevé', itemId: 'rfReleve', menu: [
                                {text: 'Excel', itemId: 'rfReleveExcel', handler: function () {
                                        me.releve('excel');
                                    }},
                                {text: 'PDF', itemId: 'rfRelevePdf', handler: function () {
                                        me.releve('pdf');
                                    }}]},
                        {text: 'Annuler le règlement', itemId: 'rfAnnuler', disabled: true, handler: function (b) {
                                me.annuler(b);
                            }},
                        '->', {xtype: 'tbtext', itemId: 'rfHistoMessage', text: ''}, {xtype: 'tbtext', itemId: 'rfHistoTotal', text: ''}]}],
            items: [reglements, parts]};
    },

    criteresHistorique: function () {
        var me = this, aujourdhui = new Date();
        return {dtStart: Ext.Date.format(me.down('#rfDu').getValue() || Ext.Date.getFirstDateOfMonth(aujourdhui), 'Y-m-d'),
            dtEnd: Ext.Date.format(me.down('#rfAu').getValue() || aujourdhui, 'Y-m-d'),
            grossisteId: me.down('#rfHistoGrossiste').getValue() || ''};
    },

    majBoutonAnnuler: function () {
        var me = this, r = me.down('#rfReglements').getSelectionModel().getSelection()[0];
        me.down('#rfAnnuler').setDisabled(!r || r.get('annule'));
    },

    annuler: function (b) {
        var me = this, r = me.down('#rfReglements').getSelectionModel().getSelection()[0];
        if (!r || r.get('annule')) {
            return;
        }
        PrestigeConfirmation.bouton(b, 'Confirmer : annuler ' + r.get('reference') + ' (' + me.montant(r.get('montant')) + ')'
                + (r.get('sortieCaisse') ? ', rendu à la caisse' : ''), function () {
            me.appeler('POST', 'annuler/' + encodeURIComponent(r.get('id')), {}, function (ok, o) {
                me.message('#rfHistoMessage', ok, o.msg);
                if (ok) {
                    me.storeReglements.load();
                    me.storeARegler.load();
                }
            });
        });
    },

    releve: function (format) {
        var me = this, c = me.criteresHistorique();
        if (!c.grossisteId) {
            me.message('#rfHistoMessage', false, 'Choisissez le grossiste du relevé.');
            return;
        }
        var url = me.URL + 'releve/' + format + '?' + Ext.Object.toQueryString(c);
        if (format === 'pdf') {
            window.open(url);
            return;
        }
        PrestigeChargement.telecharger(me.down('#rfReleve'), url, 'Préparation du relevé', 'releve_fournisseur.xlsx');
    }
});
