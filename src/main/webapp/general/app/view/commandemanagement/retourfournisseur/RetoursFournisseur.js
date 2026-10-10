/* global Ext */

/*
 * Retours du 10/10 (point 7) : « Retours fournisseur » en deux onglets, comme le contrôle des achats :
 *  - Liste des retours : l'ecran existant (retourfrsmanager), sans changement de fonctionnement ;
 *  - Tableau de bord : retours par mois, produits les plus retournes, motifs les plus utilises (retours clotures de la
 *    periode, meme perimetre que la liste).
 * Le menu ouvre ce conteneur (App.ecranReel) ; la liste garde ses identifiants, ses gestionnaires et ses tests.
 */
Ext.define('testextjs.view.commandemanagement.retourfournisseur.RetoursFournisseur', {
    extend: 'Ext.panel.Panel',
    xtype: 'retoursfournisseur',
    requires: ['testextjs.view.commandemanagement.retourfournisseur.retourFrsManager'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub rf-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    ONGLETS: [{cle: 'liste', texte: 'Liste des retours'}, {cle: 'tableau', texte: 'Tableau de bord'}],

    initComponent: function () {
        var me = this;
        me.liste = Ext.create('testextjs.view.commandemanagement.retourfournisseur.retourFrsManager', {
            nameintern: me.nameintern, titre: me.titre, header: false
        });
        me.habiller(me.liste);
        me.tableau = me.creerTableau();
        Ext.apply(me, {
            items: [me.liste, me.tableau],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsRf', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'center'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'rf-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'rf-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'liste', tooltip: o.cle === 'liste' ? 'Retours fournisseur de la période'
                                    : 'Retours par mois, produits les plus retournés, motifs les plus utilisés', handler: function () {
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
            var b = me.down('#rf-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        if (cle === 'tableau') {
            me.getLayout().setActiveItem(me.tableau);
            me.chargerTableau();
            return me.tableau;
        }
        me.getLayout().setActiveItem(me.liste);
        return me.liste;
    },

    /* ------------------------------------------------------------------ tableau de bord */

    creerTableau: function () {
        var me = this, aujourdhui = new Date();
        return Ext.create('Ext.panel.Panel', {
            itemId: 'tableauRetours', autoScroll: true, bodyPadding: 12, cls: 'rf-tableau',
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'barreTableau', items: [
                        {xtype: 'datefield', itemId: 'tbDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.add(Ext.Date.getFirstDateOfMonth(aujourdhui), Ext.Date.MONTH, -5), maxValue: aujourdhui,
                            tooltip: 'Début de la période (date de clôture du retour)'},
                        {xtype: 'datefield', itemId: 'tbFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui, tooltip: 'Fin de la période'},
                        {xtype: 'combobox', itemId: 'tbGrossiste', width: 200, editable: false, queryMode: 'local', valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE', emptyText: 'Tous les grossistes', tooltip: 'Limiter le tableau à un grossiste',
                            store: Ext.create('Ext.data.Store', {model: 'testextjs.model.Grossiste', autoLoad: true, pageSize: 999,
                                proxy: {type: 'ajax', url: '../api/v1/grossiste/all', reader: {type: 'json', root: 'results', totalProperty: 'total'}},
                                listeners: {load: function (st) {
                                        st.insert(0, {lg_GROSSISTE_ID: '', str_LIBELLE: 'Tous les grossistes'});
                                    }}}),
                            listeners: {select: function () {
                                    me.chargerTableau();
                                }}},
                        {xtype: 'combobox', itemId: 'tbLimite', width: 150, editable: false, queryMode: 'local', fieldLabel: 'Top produits', labelWidth: 78,
                            valueField: 'v', displayField: 'v', value: 20, tooltip: 'Nombre de produits les plus retournés affichés',
                            store: Ext.create('Ext.data.Store', {fields: ['v'], data: [{v: 10}, {v: 20}, {v: 50}, {v: 100}]}),
                            listeners: {select: function () {
                                    me.chargerTableau();
                                }}},
                        {text: 'Actualiser', itemId: 'tbActualiser', iconCls: 'refresh', tooltip: 'Recalculer le tableau sur la période choisie', handler: function () {
                                me.chargerTableau();
                            }}]}],
            items: [{xtype: 'component', itemId: 'tbContenu', html: '<div style="color:#7f8c8d">Chargement…</div>'}]
        });
    },

    criteresTableau: function () {
        var t = this.tableau;
        return {dtStart: t.down('#tbDebut').getSubmitValue(), dtEnd: t.down('#tbFin').getSubmitValue(),
            fourId: t.down('#tbGrossiste').getValue() || '', limite: t.down('#tbLimite').getValue()};
    },

    chargerTableau: function () {
        var me = this, t = me.tableau, contenu = t.down('#tbContenu'), c = me.criteresTableau();
        if (c.dtStart && c.dtEnd && c.dtStart > c.dtEnd) {
            contenu.update('<span style="color:#b42318">La date de début doit précéder la date de fin.</span>');
            return;
        }
        t.setLoading('Calcul…');
        Ext.Ajax.request({url: '../api/v1/retourfournisseur/tableau-bord', method: 'GET', params: c, timeout: 240000,
            success: function (r) {
                if (t.isDestroyed) {
                    return;
                }
                t.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    contenu.update('<span style="color:#b42318">' + Ext.String.htmlEncode(o.msg || 'Tableau indisponible') + '</span>');
                    return;
                }
                me.donnees = o;
                contenu.update(me.htmlTableau(o));
            },
            failure: function (r) {
                if (t.isDestroyed) {
                    return;
                }
                t.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                contenu.update('<span style="color:#b42318">' + Ext.String.htmlEncode(o.msg || ('Le serveur n\'a pas répondu (' + r.status + ').')) + '</span>');
            }});
    },

    MOIS: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],

    libelleMois: function (m) {
        var p = String(m || '').split('-');
        return p.length === 2 ? this.MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0] : m;
    },

    htmlTableau: function (o) {
        var me = this, enc = Ext.String.htmlEncode, tot = o.total || {}, nb = function (v) {
            /* separateur de milliers fixe : la liste des retours change Ext.util.Format.thousandSeparator */
            return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        };
        var tuile = function (cls, titre, valeur, detail, aide) {
            return '<div class="pml-tuile ' + cls + '" data-qtip="' + enc(aide) + '"><div class="pml-tuile-valeur">' + valeur + '</div>'
                    + '<div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        var pctAccepte = tot.quantite ? Math.round(tot.acceptee * 100 / tot.quantite) : 0;
        var html = '<div class="pml-tuiles rf-tuiles">'
                + tuile('info', 'Retours', nb(tot.retours), nb(tot.lignes) + ' ligne(s) · ' + nb(tot.produits) + ' produit(s)', 'Retours clôturés sur la période')
                + tuile('', 'Quantité retournée', nb(tot.quantite), 'unités', 'Total des quantités retournées')
                + tuile(pctAccepte >= 80 ? 'ok' : 'alerte', 'Acceptée en avoir', nb(tot.acceptee), pctAccepte + ' % du retourné',
                        'Quantités acceptées par le fournisseur (réponse saisie)')
                + tuile('', 'Montant retourné', nb(tot.montant) + ' F', 'au prix d\'achat', 'Somme de (prix d\'achat × quantité retournée)')
                + '</div>';
        var max = 0;
        Ext.each(o.mois || [], function (m) {
            max = Math.max(max, m.quantite);
        });
        var lignes = '';
        Ext.each(o.mois || [], function (m) {
            var l = max ? Math.max(2, Math.round(m.quantite * 100 / max)) : 0;
            lignes += '<tr class="rf-mois"><td>' + enc(me.libelleMois(m.mois)) + '</td><td class="n">' + m.retours + '</td><td class="n">' + m.lignes
                    + '</td><td class="n">' + nb(m.quantite) + '</td><td class="n">' + nb(m.acceptee) + '</td><td class="n">' + nb(m.montant)
                    + '</td><td class="rf-barre"><div style="width:' + l + '%"></div></td></tr>';
        });
        html += '<div class="ac-bloc-t" style="margin-top:14px">Retours par mois</div>'
                + '<table class="ac-table rf-par-mois"><tr><th>Mois</th><th class="n">Retours</th><th class="n">Lignes</th><th class="n">Qté retournée</th>'
                + '<th class="n">Qté acceptée</th><th class="n">Montant</th><th style="width:30%"></th></tr>'
                + (lignes || '<tr><td colspan="7" style="color:#7f8c8d">Aucun retour sur la période.</td></tr>') + '</table>';
        lignes = '';
        Ext.each(o.produits || [], function (p, i) {
            lignes += '<tr class="rf-produit"><td class="n">' + (i + 1) + '</td><td>' + enc(p.cip || '') + '</td><td>' + enc(p.libelle || '')
                    + '</td><td class="n">' + p.retours + '</td><td class="n">' + nb(p.quantite) + '</td><td class="n">' + nb(p.acceptee)
                    + '</td><td class="n">' + nb(p.montant) + '</td></tr>';
        });
        html += '<div class="rf-deux"><div class="rf-col"><div class="ac-bloc-t" style="margin-top:14px">Produits les plus retournés</div>'
                + '<table class="ac-table rf-produits"><tr><th class="n">#</th><th>CIP</th><th>Produit</th><th class="n">Retours</th><th class="n">Qté retournée</th>'
                + '<th class="n">Qté acceptée</th><th class="n">Montant</th></tr>'
                + (lignes || '<tr><td colspan="7" style="color:#7f8c8d">Aucun produit retourné.</td></tr>') + '</table></div>';
        lignes = '';
        Ext.each(o.motifs || [], function (m) {
            lignes += '<tr class="rf-motif"><td>' + enc(m.libelle || '') + '</td><td class="n">' + m.lignes + '</td><td class="n">' + nb(m.quantite)
                    + '</td><td class="n">' + String(m.part).replace('.', ',') + ' %</td><td class="rf-barre"><div style="width:'
                    + Math.max(2, Math.round(m.part)) + '%"></div></td></tr>';
        });
        html += '<div class="rf-col"><div class="ac-bloc-t" style="margin-top:14px">Motifs les plus utilisés</div>'
                + '<table class="ac-table rf-motifs"><tr><th>Motif</th><th class="n">Lignes</th><th class="n">Qté</th><th class="n">Part</th><th style="width:30%"></th></tr>'
                + (lignes || '<tr><td colspan="5" style="color:#7f8c8d">Aucun motif.</td></tr>') + '</table></div></div>';
        return html;
    }
});
