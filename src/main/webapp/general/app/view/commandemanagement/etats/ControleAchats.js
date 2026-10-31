/* global Ext */

/*
 * Retours du 10/10 (Q7) : « État de contrôle des achats » en deux onglets, comme Commandes en cours :
 *  - Liste des BL : l'ecran existant (etatscontrolemanager), sans changement de fonctionnement ;
 *  - Tableau de bord : BL saisis dans le delai (date de saisie − date du BL ≤ seuil, parametrable) ou en retard,
 *    BL controles / total, et la repartition par groupe de grossistes et par grossiste du groupe.
 * Le menu ouvre ce conteneur (App.ecranReel) ; la liste garde ses identifiants, ses gestionnaires et ses tests.
 */
Ext.define('testextjs.view.commandemanagement.etats.ControleAchats', {
    extend: 'Ext.panel.Panel',
    xtype: 'controleachats',
    requires: ['testextjs.view.commandemanagement.etats.EtatControleManager'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub ca-hub',
    config: {
        nameintern: '',
        titre: ''
    },

    /* retour du 31/10 : onglet « BL annulés » (retours complets de BL) */
    ONGLETS: [{cle: 'liste', texte: 'Liste des BL'}, {cle: 'tableau', texte: 'Tableau de bord'}, {cle: 'annules', texte: 'BL annulés'}],

    initComponent: function () {
        var me = this;
        me.liste = Ext.create('testextjs.view.commandemanagement.etats.EtatControleManager', {
            nameintern: me.nameintern, titre: me.titre, header: false
        });
        me.habiller(me.liste);
        me.tableau = me.creerTableau();
        me.annules = me.creerAnnules();
        Ext.apply(me, {
            items: [me.liste, me.tableau, me.annules],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsCa', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'ca-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'ca-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'liste', handler: function () {
                                me.afficher(o.cle);
                            }};
                    })
                }]
        });
        me.callParent(arguments);
    },

    habiller: function (ecran) {
        var A = window.PrestigeAffichage;
        if (!A) {
            return;
        }
        if (Ext.Array.some(A.ECRANS_STYLE_VENTE || [], function (x) {
            return ecran.isXType(x);
        }) || A.THEME_PARTOUT) {
            A.habillerStyleVente(ecran);
        }
    },

    afficher: function (cle) {
        var me = this;
        Ext.each(me.ONGLETS, function (x) {
            var b = me.down('#ca-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        if (cle === 'tableau') {
            me.getLayout().setActiveItem(me.tableau);
            me.reprendreCriteres();
            me.chargerTableau();
            return me.tableau;
        }
        if (cle === 'annules') {
            me.getLayout().setActiveItem(me.annules);
            me.reprendreCriteresAnnules();
            me.annules.getStore().load();
            return me.annules;
        }
        me.getLayout().setActiveItem(me.liste);
        return me.liste;
    },

    /* ------------------------------------------------------------------ BL annules (retour du 31/10) */

    creerAnnules: function () {
        var me = this, aujourdhui = new Date();
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'refBl', 'refCommande', 'grossiste', 'dateBl', 'saisiLe', 'annuleLe', {name: 'montantHt', type: 'int'},
                {name: 'montantTtc', type: 'int'}, 'annulePar'],
            proxy: {type: 'ajax', url: '../api/v1/etat-control-bon/annules', reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {beforeload: function (s) {
                    var g = me.annules;
                    s.getProxy().extraParams = {
                        dtStart: Ext.Date.format(g.down('#anDebut').getValue() || aujourdhui, 'Y-m-d'),
                        dtEnd: Ext.Date.format(g.down('#anFin').getValue() || aujourdhui, 'Y-m-d'),
                        search: g.down('#anRecherche').getValue() || ''
                    };
                }, load: function (s, recs, ok) {
                    var t = 0;
                    s.each(function (r) {
                        t += r.get('montantTtc');
                    });
                    me.annules.down('#anTotal').setText(s.getCount() + ' BL annulé(s) · ' + Ext.util.Format.number(t, '0,000') + ' TTC');
                }}
        });
        var montant = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        return Ext.create('Ext.grid.Panel', {
            itemId: 'gridAnnules', store: store, cls: 'ca-annules',
            viewConfig: {emptyText: 'Aucun BL annulé sur la période.', deferEmptyText: false},
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'barreAnnules', items: [
                        {xtype: 'datefield', itemId: 'anDebut', fieldLabel: 'Annulés du', labelWidth: 70, width: 183, format: 'd/m/Y',
                            value: Ext.Date.getFirstDateOfMonth(aujourdhui), maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'anFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y',
                            value: aujourdhui, maxValue: aujourdhui},
                        {xtype: 'textfield', itemId: 'anRecherche', width: 260, emptyText: 'Référence BL, commande ou grossiste (contient)',
                            enableKeyEvents: true, listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        store.load();
                                    }
                                }}},
                        {text: 'Rechercher', itemId: 'anRechercher', iconCls: 'searchicon', handler: function () {
                                store.load();
                            }},
                        '->', {xtype: 'tbtext', itemId: 'anTotal', text: ''}]}],
            columns: [
                {text: 'Réf. BL', dataIndex: 'refBl', width: 130},
                {text: 'Réf. commande', dataIndex: 'refCommande', width: 140},
                {text: 'Grossiste', dataIndex: 'grossiste', flex: 1, minWidth: 160},
                {text: 'Date du BL', dataIndex: 'dateBl', width: 95},
                {text: 'Saisi le', dataIndex: 'saisiLe', width: 125},
                {text: 'Annulé le', dataIndex: 'annuleLe', width: 125},
                {text: 'Annulé par', dataIndex: 'annulePar', width: 170},
                {text: 'Montant HT', dataIndex: 'montantHt', width: 110, align: 'right', renderer: montant},
                {text: 'Montant TTC', dataIndex: 'montantTtc', width: 115, align: 'right', renderer: montant}
            ]
        });
    },

    /** A la premiere ouverture : meme periode et meme recherche que la liste. */
    reprendreCriteresAnnules: function () {
        var me = this, g = me.annules, c = window.criteresControleAchat ? window.criteresControleAchat() : {};
        if (me.criteresAnnulesRepris) {
            return;
        }
        me.criteresAnnulesRepris = true;
        if (c.dtStart) {
            g.down('#anDebut').setValue(Ext.Date.parse(c.dtStart, 'Y-m-d'));
        }
        if (c.dtEnd) {
            g.down('#anFin').setValue(Ext.Date.parse(c.dtEnd, 'Y-m-d'));
        }
        if (c.search) {
            g.down('#anRecherche').setValue(c.search);
        }
    },

    /* ------------------------------------------------------------------ tableau de bord */

    creerTableau: function () {
        var me = this, aujourdhui = new Date();
        return Ext.create('Ext.panel.Panel', {
            itemId: 'tableauControle', autoScroll: true, bodyPadding: 12, cls: 'ca-tableau',
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'barreTableau', items: [
                        {xtype: 'datefield', itemId: 'tbDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.getFirstDateOfMonth(aujourdhui), maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'tbFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui},
                        {xtype: 'combobox', itemId: 'tbGroupe', width: 180, editable: false, queryMode: 'local', valueField: 'id', displayField: 'libelle',
                            emptyText: 'Groupe de grossistes...', tooltip: 'Groupe de grossistes : remplace le choix du grossiste',
                            store: Ext.create('Ext.data.Store', {fields: [{name: 'id', type: 'string'}, 'libelle'], autoLoad: true,
                                proxy: {type: 'ajax', url: '../api/v1/common/groupefournisseurs', reader: {type: 'json', root: 'data'}},
                                listeners: {load: function (st) {
                                        st.insert(0, {id: '', libelle: 'Tous les groupes'});
                                    }}}),
                            listeners: {select: function (c) {
                                    var g = me.tableau.down('#tbGrossiste');
                                    if (c.getValue()) {
                                        g.clearValue();
                                    }
                                    g.setDisabled(!!c.getValue());
                                    me.chargerTableau();
                                }}},
                        {xtype: 'combobox', itemId: 'tbGrossiste', width: 190, editable: false, queryMode: 'local', valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE', emptyText: 'Tous les grossistes',
                            store: Ext.create('Ext.data.Store', {model: 'testextjs.model.Grossiste', autoLoad: true, pageSize: 999,
                                proxy: {type: 'ajax', url: '../api/v1/grossiste/all', reader: {type: 'json', root: 'results', totalProperty: 'total'}},
                                listeners: {load: function (st) {
                                        st.insert(0, {lg_GROSSISTE_ID: '', str_LIBELLE: 'Tous les grossistes'});
                                    }}}),
                            listeners: {select: function () {
                                    me.chargerTableau();
                                }}},
                        {text: 'Actualiser', iconCls: 'refresh', handler: function () {
                                me.chargerTableau();
                            }},
                        '->',
                        {xtype: 'numberfield', itemId: 'tbSeuil', fieldLabel: 'Délai de saisie toléré', labelWidth: 135, width: 200, minValue: 0, maxValue: 60,
                            allowDecimals: false, readOnly: true, hideTrigger: true,
                            afterSubTpl: '', tooltip: 'Un BL saisi plus de ce nombre de jours après la date du BL du grossiste est en retard'},
                        {xtype: 'tbtext', text: 'jour(s)'},
                        {text: 'Enregistrer', itemId: 'tbEnregistrerSeuil', iconCls: 'save', hidden: true,
                            tooltip: 'Enregistrer le délai de saisie toléré', handler: function () {
                                me.enregistrerSeuil();
                            }}]}],
            items: [{xtype: 'component', itemId: 'tbContenu', html: '<div style="color:#7f8c8d">Chargement…</div>'}]
        });
    },

    /** A l'ouverture du tableau : memes criteres que la liste (periode, groupe, grossiste). */
    reprendreCriteres: function () {
        var me = this, t = me.tableau, c = window.criteresControleAchat ? window.criteresControleAchat() : {};
        if (me.criteresRepris) {
            return;
        }
        me.criteresRepris = true;
        if (c.dtStart) {
            t.down('#tbDebut').setValue(Ext.Date.parse(c.dtStart, 'Y-m-d'));
        }
        if (c.dtEnd) {
            t.down('#tbFin').setValue(Ext.Date.parse(c.dtEnd, 'Y-m-d'));
        }
        if (c.groupeId) {
            t.down('#tbGroupe').setValue(c.groupeId);
            t.down('#tbGrossiste').setDisabled(true);
        } else if (c.grossisteId) {
            t.down('#tbGrossiste').setValue(c.grossisteId);
        }
    },

    criteresTableau: function () {
        var t = this.tableau;
        return {dtStart: t.down('#tbDebut').getSubmitValue(), dtEnd: t.down('#tbFin').getSubmitValue(), dateType: 'LIVRAISON',
            groupeId: t.down('#tbGroupe').getValue() || '', grossisteId: t.down('#tbGroupe').getValue() ? '' : (t.down('#tbGrossiste').getValue() || '')};
    },

    chargerTableau: function () {
        var me = this, t = me.tableau, contenu = t.down('#tbContenu');
        t.setLoading('Calcul…');
        Ext.Ajax.request({url: '../api/v1/etat-control-bon/tableau-bord', method: 'GET', params: me.criteresTableau(), timeout: 240000,
            success: function (r) {
                t.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    contenu.update('<span style="color:#b42318">' + Ext.String.htmlEncode(o.msg || 'Tableau indisponible') + '</span>');
                    return;
                }
                me.donnees = o;
                var s = t.down('#tbSeuil');
                s.setValue(o.seuil);
                s.setReadOnly(!o.modifiable);
                s.setHideTrigger(!o.modifiable);
                t.down('#tbEnregistrerSeuil').setVisible(!!o.modifiable);
                contenu.update(me.htmlTableau(o));
            },
            failure: function (r) {
                t.setLoading(false);
                contenu.update('<span style="color:#b42318">Le serveur n\'a pas répondu (' + r.status + ').</span>');
            }});
    },

    htmlTableau: function (o) {
        var enc = Ext.String.htmlEncode, tot = o.total || {}, nb = function (v) {
            return Ext.util.Format.number(v || 0, '0,000').replace(/,/g, ' ');
        };
        var tuile = function (cls, titre, valeur, detail, aide) {
            return '<div class="pml-tuile ' + cls + '" data-qtip="' + enc(aide) + '"><div class="pml-tuile-valeur">' + valeur + '</div>'
                    + '<div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        var html = '<div class="pml-tuiles ca-tuiles">'
                + tuile('info', 'BL de la période', nb(tot.bons), nb(tot.montant) + ' F TTC', 'BL entrés en stock sur la période (date du BL)')
                + tuile(tot.pctControles >= 80 ? 'ok' : 'alerte', 'BL contrôlés', tot.controles + ' / ' + tot.bons,
                        '<b>' + tot.pctControles + ' %</b> contrôlés', 'Contrôle terminé (quantités comptées) sur le nombre de BL')
                + tuile('ok', 'Saisis dans le délai', nb(tot.dansDelai), tot.pctDansDelai + ' % · ≤ ' + o.seuil + ' j',
                        'Date de saisie − date du BL du grossiste ≤ ' + o.seuil + ' jour(s) : bon')
                + tuile(tot.enRetard ? 'critique' : 'ok', 'Saisis en retard', nb(tot.enRetard), '> ' + o.seuil + ' j',
                        'Date de saisie − date du BL du grossiste > ' + o.seuil + ' jour(s) : mauvais')
                + tuile('', 'Délai moyen de saisie', String(tot.delaiMoyen).replace('.', ',') + ' j',
                        tot.delaiInconnu ? tot.delaiInconnu + ' BL sans date' : 'tous datés', 'Moyenne de (date de saisie − date du BL)')
                + '</div>';
        var ligne = function (c, cls, libelle) {
            return '<tr class="' + cls + '"><td>' + libelle + '</td><td class="n">' + c.bons + '</td><td class="n">' + c.controles
                    + '</td><td class="n">' + c.pctControles + ' %</td><td class="n ca-bon">' + c.dansDelai + '</td><td class="n ca-retard">'
                    + c.enRetard + '</td><td class="n">' + c.pctDansDelai + ' %</td><td class="n">' + String(c.delaiMoyen).replace('.', ',')
                    + ' j</td><td class="n">' + nb(c.montant) + '</td></tr>';
        };
        var corps = '';
        Ext.each(o.groupes || [], function (g) {
            corps += ligne(g, 'ca-groupe', enc(g.libelle));
            Ext.each(g.grossistes || [], function (f) {
                corps += ligne(f, 'ca-grossiste', '<span class="ca-retrait">' + enc(f.libelle) + '</span>');
            });
        });
        html += '<div class="ac-bloc-t" style="margin-top:14px">Par groupe de grossistes et par grossiste du groupe</div>'
                + '<table class="ac-table ca-repartition"><tr><th>Groupe / grossiste</th><th class="n">BL</th><th class="n">Contrôlés</th>'
                + '<th class="n">% contrôlés</th><th class="n">Dans le délai</th><th class="n">En retard</th><th class="n">% dans le délai</th>'
                + '<th class="n">Délai moyen</th><th class="n">Montant TTC</th></tr>'
                + (corps || '<tr><td colspan="9" style="color:#7f8c8d">Aucun BL sur la période.</td></tr>') + '</table>';
        return html;
    },

    enregistrerSeuil: function () {
        var me = this, c = me.tableau.down('#tbSeuil');
        if (!c.isValid()) {
            Ext.MessageBox.alert('Délai de saisie', 'Valeur entre 0 et 60 jours.');
            return;
        }
        Ext.Ajax.request({url: '../api/v1/etat-control-bon/tableau-bord/delai', method: 'POST', jsonData: {jours: c.getValue()},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    Ext.MessageBox.alert('Délai de saisie', Ext.String.htmlEncode(o.msg || 'Refusé'));
                    return;
                }
                me.chargerTableau();
            }});
    }
});
