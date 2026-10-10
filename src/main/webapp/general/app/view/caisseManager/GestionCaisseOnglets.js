/* global Ext */

/*
 * Retours du 10/10 (section 16) : « Gestion de caisse » en deux onglets :
 *  - Liste : l'ecran existant (gestcaissemanager), sans changement de fonctionnement ;
 *  - Analyse : ecarts des caisses fermees (ecart = billetage - attendu, regle unique Q9 : negatif = manquant) —
 *    nombre et montant, recurrence par caissier, par semaine, par mois, par jour et heure de fermeture, plus gros
 *    ecarts, tendance et pistes.
 * Le menu ouvre ce conteneur (App.ecranReel) ; la liste garde ses identifiants, son controleur et ses tests.
 */
Ext.define('testextjs.view.caisseManager.GestionCaisseOnglets', {
    extend: 'Ext.panel.Panel',
    xtype: 'gestioncaisseonglets',
    requires: ['testextjs.view.caisseManager.GestionCaisse'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub gc-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    ONGLETS: [{cle: 'liste', texte: 'Liste', aide: 'Caisses ouvertes et fermées, billetage, écart'},
        {cle: 'analyse', texte: 'Analyse', aide: 'Écarts de caisse : manquants, surplus, caissiers, périodes, pistes'}],

    initComponent: function () {
        var me = this;
        me.liste = Ext.create('testextjs.view.caisseManager.GestionCaisse', {header: false});
        me.habiller(me.liste);
        me.analyse = me.creerAnalyse();
        Ext.apply(me, {
            items: [me.liste, me.analyse],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsGc', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'center'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'gc-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'gc-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'liste', tooltip: o.aide, handler: function () {
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
            var b = me.down('#gc-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        if (cle === 'analyse') {
            me.getLayout().setActiveItem(me.analyse);
            me.chargerAnalyse();
            return me.analyse;
        }
        me.getLayout().setActiveItem(me.liste);
        return me.liste;
    },

    creerAnalyse: function () {
        var me = this, aujourdhui = new Date();
        return Ext.create('Ext.panel.Panel', {
            itemId: 'analyseCaisse', autoScroll: true, bodyPadding: 12, cls: 'gc-analyse',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'anDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.add(Ext.Date.getFirstDateOfMonth(aujourdhui), Ext.Date.MONTH, -5), maxValue: aujourdhui,
                            tooltip: 'Caisses ouvertes à partir du'},
                        {xtype: 'datefield', itemId: 'anFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui, tooltip: 'Caisses ouvertes jusqu\'au'},
                        {xtype: 'combobox', itemId: 'anCaissier', width: 210, editable: false, queryMode: 'local', valueField: 'lgUSERID',
                            displayField: 'fullName', emptyText: 'Tous les caissiers', tooltip: 'Limiter l\'analyse à un caissier',
                            store: Ext.create('Ext.data.Store', {model: 'testextjs.model.caisse.User', autoLoad: true, pageSize: 999,
                                proxy: {type: 'ajax', url: '../api/v1/common/users', reader: {type: 'json', root: 'data', totalProperty: 'total'}},
                                listeners: {load: function (st) {
                                        st.insert(0, {lgUSERID: '', fullName: 'Tous les caissiers'});
                                    }}}),
                            listeners: {select: function () {
                                    me.chargerAnalyse();
                                }}},
                        {xtype: 'numberfield', itemId: 'anTolerance', fieldLabel: 'Tolérance (F)', labelWidth: 80, width: 165, minValue: 0, maxValue: 1000000,
                            value: 0, allowDecimals: false, tooltip: 'Un écart égal ou inférieur à ce montant (en valeur absolue) compte comme une caisse juste'},
                        {text: 'Actualiser', itemId: 'anActualiser', iconCls: 'refresh', tooltip: 'Recalculer l\'analyse', handler: function () {
                                me.chargerAnalyse();
                            }}]}],
            items: [{xtype: 'component', itemId: 'anContenu', html: '<div style="color:#7f8c8d">Chargement…</div>'}]
        });
    },

    criteresAnalyse: function () {
        var a = this.analyse;
        return {dtStart: a.down('#anDebut').getSubmitValue(), dtEnd: a.down('#anFin').getSubmitValue(),
            userId: a.down('#anCaissier').getValue() || '', tolerance: a.down('#anTolerance').getValue() || 0};
    },

    chargerAnalyse: function () {
        var me = this, a = me.analyse, contenu = a.down('#anContenu'), c = me.criteresAnalyse();
        if (c.dtStart && c.dtEnd && c.dtStart > c.dtEnd) {
            contenu.update('<span style="color:#b42318">La date de début doit précéder la date de fin.</span>');
            return;
        }
        a.setLoading('Calcul…');
        me.donnees = null;
        Ext.Ajax.request({url: '../api/v1/caisse/analyse-ecarts', method: 'GET', params: c, timeout: 120000,
            success: function (r) {
                if (a.isDestroyed) {
                    return;
                }
                a.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    contenu.update('<span style="color:#b42318">' + Ext.String.htmlEncode(o.msg || 'Analyse indisponible') + '</span>');
                    return;
                }
                me.donnees = o;
                contenu.update(me.htmlAnalyse(o));
            },
            failure: function (r) {
                if (!a.isDestroyed) {
                    a.setLoading(false);
                    contenu.update('<span style="color:#b42318">Le serveur n\'a pas répondu (' + r.status + ').</span>');
                }
            }});
    },

    MOIS: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],

    htmlAnalyse: function (o) {
        var me = this, enc = Ext.String.htmlEncode, t = o.total || {}, nb = function (v) {
            var n = Math.round(v || 0);
            return (n < 0 ? '−' : n > 0 ? '+' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }, entier = function (v) {
            return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }, ecart = function (v) {
            return '<span class="' + (v < 0 ? 'gc-manquant' : v > 0 ? 'gc-surplus' : '') + '">' + nb(v) + '</span>';
        };
        var tuile = function (cls, titre, valeur, detail, aide) {
            return '<div class="pml-tuile ' + cls + '" data-qtip="' + enc(aide) + '"><div class="pml-tuile-valeur">' + valeur + '</div>'
                    + '<div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        var html = '<div class="gc-regle">Écart = billetage − attendu : <b class="gc-manquant">négatif = manquant en caisse</b>,'
                + ' <b class="gc-surplus">positif = surplus</b>' + (t.tolerance ? ' · tolérance ' + entier(t.tolerance) + ' F' : '') + '.</div>'
                + '<div class="pml-tuiles gc-tuiles">'
                + tuile('info', 'Caisses billetées', entier(t.caisses), entier(t.justes) + ' juste(s)', 'Caisses fermées sur la période, avec un billetage')
                + tuile(t.manquants ? 'critique' : 'ok', 'Manquants', entier(t.manquants), nb(t.montantManquant) + ' F', 'Caisses où le billetage est inférieur à l\'attendu')
                + tuile(t.surplus ? 'alerte' : 'ok', 'Surplus', entier(t.surplus), nb(t.montantSurplus) + ' F', 'Caisses où le billetage dépasse l\'attendu')
                + tuile('', 'Écart net', nb(t.net) + ' F', 'manquants + surplus', 'Somme des écarts de la période')
                + tuile(t.sansBilletage ? 'alerte' : 'ok', 'Sans billetage', entier(t.sansBilletage), 'écart non mesurable', 'Caisses fermées sans billetage : non comptées dans les écarts')
                + '</div>';
        var tend = o.tendance || {}, pistes = o.pistes || [];
        html += '<div class="gc-pistes"><div class="gc-tendance gc-' + (tend.sens || 'INCONNUE').toLowerCase() + '"><b>Tendance :</b> ' + enc(tend.texte || '') + '</div>'
                + (pistes.length ? '<ul>' + Ext.Array.map(pistes, function (p) {
                    return '<li>' + enc(p) + '</li>';
                }).join('') + '</ul>' : '<div style="color:#7f8c8d">Aucune piste particulière : pas de manquants récurrents.</div>') + '</div>';
        var tableau = function (titre, cls, entete, lignes, colonnes) {
            return '<div class="rf-col"><div class="ac-bloc-t" style="margin-top:14px">' + titre + '</div><table class="ac-table ' + cls + '"><tr>'
                    + entete + '</tr>' + (lignes || '<tr><td colspan="' + colonnes + '" style="color:#7f8c8d">Aucune caisse.</td></tr>') + '</table></div>';
        };
        var ligneCumul = function (cls, libelle, c) {
            return '<tr class="' + cls + '"><td>' + libelle + '</td><td class="n">' + c.caisses + '</td><td class="n">' + c.manquants + '</td><td class="n">'
                    + ecart(c.montantManquant) + '</td><td class="n">' + c.surplus + '</td><td class="n">' + ecart(c.montantSurplus) + '</td><td class="n">'
                    + ecart(c.net) + '</td><td class="n">' + String(c.recurrence).replace('.', ',') + ' %</td></tr>';
        };
        var entete = '<th></th><th class="n">Caisses</th><th class="n">Manquants</th><th class="n">Montant</th><th class="n">Surplus</th><th class="n">Montant</th>'
                + '<th class="n">Net</th><th class="n">Récurrence</th>';
        var l = '';
        Ext.each(o.caissiers || [], function (c) {
            l += ligneCumul('gc-caissier', enc(c.libelle), c);
        });
        html += '<div class="rf-deux">' + tableau('Par caissier (récurrence = caisses en manquant ÷ caisses)', 'gc-par-caissier', entete.replace('<th></th>', '<th>Caissier</th>'), l, 8);
        l = '';
        Ext.each(o.mois || [], function (m) {
            var p = String(m.mois).split('-');
            l += ligneCumul('gc-mois', p.length === 2 ? me.MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0] : enc(m.mois), m);
        });
        html += tableau('Par mois', 'gc-par-mois', entete.replace('<th></th>', '<th>Mois</th>'), l, 8) + '</div>';
        l = '';
        Ext.each(o.semaines || [], function (s) {
            l += ligneCumul('gc-semaine', enc(s.semaine) + ' <span style="color:#7f8c8d">(' + enc(s.debut) + ')</span>', s);
        });
        var j = '';
        Ext.each(o.jours || [], function (x) {
            j += ligneCumul('gc-jour', enc(x.libelle), x);
        });
        Ext.each(o.heures || [], function (x) {
            j += ligneCumul('gc-heure', 'fermée ' + enc(x.libelle), x);
        });
        html += '<div class="rf-deux">' + tableau('Par semaine', 'gc-par-semaine', entete.replace('<th></th>', '<th>Semaine</th>'), l, 8)
                + tableau('Par jour et heure de fermeture', 'gc-par-moment', entete.replace('<th></th>', '<th>Moment</th>'), j, 8) + '</div>';
        l = '';
        Ext.each(o.plusGros || [], function (g, i) {
            l += '<tr class="gc-gros"><td class="n">' + (i + 1) + '</td><td>' + enc(g.ouverture) + '</td><td>' + enc(g.fermeture) + '</td><td>' + enc(g.caissier)
                    + '</td><td class="n">' + entier(g.attendu) + '</td><td class="n">' + entier(g.billetage) + '</td><td class="n">' + ecart(g.ecart) + '</td></tr>';
        });
        html += '<div class="ac-bloc-t" style="margin-top:14px">Plus gros écarts</div><table class="ac-table gc-plus-gros"><tr><th class="n">#</th><th>Ouverte le</th>'
                + '<th>Fermée le</th><th>Caissier</th><th class="n">Attendu</th><th class="n">Billetage</th><th class="n">Écart</th></tr>'
                + (l || '<tr><td colspan="7" style="color:#7f8c8d">Aucun écart sur la période.</td></tr>') + '</table>';
        return html;
    }
});
