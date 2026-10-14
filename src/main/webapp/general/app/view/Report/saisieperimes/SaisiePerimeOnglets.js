/* global Ext */

/*
 * Besoins du 11/10 (point 2) : « Saisie des périmés » en deux onglets :
 *  - Liste : l'ecran existant (saisieperime), sans changement de fonctionnement ;
 *  - Analyse : emplacements les plus touches, produits qui se periment le plus, evolution par mois et ratio
 *    valeur perimee / chiffre d'affaires de la periode (ex. perimes 2026 / CA 2026).
 * Le menu ouvre ce conteneur (App.ecranReel) ; la liste garde ses identifiants et ses tests.
 */
Ext.define('testextjs.view.Report.saisieperimes.SaisiePerimeOnglets', {
    extend: 'Ext.panel.Panel',
    xtype: 'saisieperimeonglets',
    requires: ['testextjs.view.Report.saisieperimes.SaisiePerimeManager', 'testextjs.view.commun.RaccourcisPeriode'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub sp-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    ONGLETS: [{cle: 'liste', texte: 'Liste', aide: 'Saisies de périmés'},
        {cle: 'analyse', texte: 'Analyse', aide: 'Emplacements et produits les plus touchés, ratio périmés / chiffre d\'affaires'}],

    initComponent: function () {
        var me = this;
        me.liste = Ext.create('testextjs.view.Report.saisieperimes.SaisiePerimeManager', {header: false});
        me.habiller(me.liste);
        me.analyse = me.creerAnalyse();
        Ext.apply(me, {
            items: [me.liste, me.analyse],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsSp', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'sp-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'sp-onglets-' + me.id,
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
        if (A && (A.THEME_PARTOUT || Ext.Array.some(A.ECRANS_STYLE_VENTE || [], function (x) {
            return ecran.isXType(x);
        }))) {
            A.habillerStyleVente(ecran);
        }
    },

    afficher: function (cle) {
        var me = this;
        Ext.each(me.ONGLETS, function (x) {
            var b = me.down('#sp-' + x.cle);
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
            itemId: 'analysePerimes', autoScroll: true, bodyPadding: 12, cls: 'sp-analyse',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'spDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: new Date(aujourdhui.getFullYear(), 0, 1), maxValue: aujourdhui, tooltip: 'Périmés saisis à partir du'},
                        {xtype: 'datefield', itemId: 'spFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui, tooltip: 'Périmés saisis jusqu\'au',
                            plugins: [{ptype: 'raccourcisperiode', debut: 'spDebut', declencher: 'spActualiser'}]},
                        {text: 'Actualiser', itemId: 'spActualiser', iconCls: 'refresh', tooltip: 'Recalculer l\'analyse', handler: function () {
                                me.chargerAnalyse();
                            }},
                        /* retours du 13/10 (point 4) : intervalle d'evolution reglable */
                        {xtype: 'tbseparator'}, {xtype: 'tbtext', text: 'Par'},
                        {xtype: 'combobox', itemId: 'spPas', width: 105, editable: false, queryMode: 'local', displayField: 'l', valueField: 'v', value: 'mois',
                            tooltip: 'Intervalle de l\'évolution', store: Ext.create('Ext.data.Store', {fields: ['v', 'l'],
                                data: [{v: 'semaine', l: 'semaine'}, {v: 'mois', l: 'mois'}, {v: 'trimestre', l: 'trimestre'}, {v: 'annee', l: 'année'}]}),
                            listeners: {select: function () {
                                    me.chargerAnalyse();
                                }}},
                        /* produits : par valeur ou par frequence */
                        {xtype: 'tbseparator'}, {xtype: 'tbtext', text: 'Produits'},
                        {xtype: 'button', itemId: 'spTriValeur', text: 'Par valeur', toggleGroup: 'sp-tri-' + me.id, allowDepress: false, pressed: true,
                            tooltip: 'Produits dont la valeur périmée est la plus forte', handler: function () {
                                me.redessiner();
                            }},
                        {xtype: 'button', itemId: 'spTriFrequence', text: 'Les plus fréquents', toggleGroup: 'sp-tri-' + me.id, allowDepress: false,
                            tooltip: 'Produits qui se périment le plus souvent (nombre de saisies)', handler: function () {
                                me.redessiner();
                            }},
                        '->',
                        /* objectif du taux de peremption */
                        {xtype: 'numberfield', itemId: 'spObjectif', fieldLabel: 'Objectif taux &lt;', labelSeparator: '', labelWidth: 96, width: 150, labelStyle: 'white-space:nowrap', minValue: 0.01, maxValue: 20,
                            decimalPrecision: 2, step: 0.1, decimalSeparator: ',', hideTrigger: true, tooltip: 'Taux de péremption à ne pas dépasser (%)'},
                        {xtype: 'tbtext', text: '%'},
                        {xtype: 'button', itemId: 'spObjectifEnregistrer', text: 'Enregistrer l\'objectif', tooltip: 'Garder cet objectif pour les prochaines analyses',
                            handler: function (b) {
                                me.enregistrerObjectif(b);
                            }}]}],
            items: [{xtype: 'component', itemId: 'spContenu', html: '<div style="color:#7f8c8d">Chargement…</div>'}]
        });
    },

    chargerAnalyse: function () {
        var me = this, a = me.analyse, contenu = a.down('#spContenu');
        var debut = a.down('#spDebut').getSubmitValue(), fin = a.down('#spFin').getSubmitValue();
        if (debut && fin && debut > fin) {
            contenu.update('<span style="color:#b42318">La date de début doit précéder la date de fin.</span>');
            return;
        }
        a.setLoading('Calcul…');
        me.donnees = null;
        Ext.Ajax.request({url: '../api/v1/gestionperime/analyse', method: 'GET', params: {dtStart: debut, dtEnd: fin, pas: a.down('#spPas').getValue()}, timeout: 120000,
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
                var obj = a.down('#spObjectif');
                if (obj && !obj.hasFocus && !obj.isDirty()) {
                    obj.setValue(o.objectif);
                    obj.resetOriginalValue();
                }
                contenu.update(me.htmlAnalyse(o));
            },
            failure: function (r) {
                if (!a.isDestroyed) {
                    a.setLoading(false);
                    contenu.update('<span style="color:#b42318">Le serveur n\'a pas répondu (' + r.status + ').</span>');
                }
            }});
    },

    redessiner: function () {
        var me = this;
        if (me.donnees) {
            me.analyse.down('#spContenu').update(me.htmlAnalyse(me.donnees));
        }
    },

    enregistrerObjectif: function (b) {
        var me = this, champ = me.analyse.down('#spObjectif'), v = champ.getValue();
        if (v === null || !champ.isValid()) {
            var fin0 = PrestigeChargement.occuper(b, 'Objectif');
            fin0('Entre 0,01 et 20 %', false);
            return;
        }
        var fin = PrestigeChargement.occuper(b, 'Enregistrement');
        Ext.Ajax.request({url: '../api/v1/gestionperime/analyse/objectif', method: 'POST', jsonData: {valeur: v},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    fin(o.msg || 'Refusé', false);
                    return;
                }
                fin('Objectif enregistré', true);
                champ.setValue(o.objectif);
                champ.resetOriginalValue();
                if (me.donnees) {
                    me.donnees.objectif = o.objectif;
                    me.donnees.total.objectif = o.objectif;
                    me.donnees.total.objectifAtteint = me.donnees.total.ratio < o.objectif;
                    me.redessiner();
                }
            },
            failure: function (r) {
                fin('Le serveur n\'a pas répondu (' + r.status + ')', false);
            }});
    },

    libellePeriode: function (pas, v) {
        var me = this, p = String(v).split('-');
        if (pas === 'mois' && p.length === 2) {
            return me.MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0];
        }
        if (pas === 'semaine' && p.length === 2) {
            return 'Semaine ' + p[1].replace('S', '') + ' ' + p[0];
        }
        if (pas === 'trimestre' && p.length === 2) {
            return p[1].replace('T', '') + (p[1] === 'T1' ? 'er' : 'e') + ' trimestre ' + p[0];
        }
        return Ext.String.htmlEncode(String(v));
    },

    MOIS: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],

    htmlAnalyse: function (o) {
        var me = this, enc = Ext.String.htmlEncode, t = o.total || {}, objectif = typeof o.objectif === 'number' ? o.objectif : null;
        var parFrequence = !!(me.analyse && me.analyse.down('#spTriFrequence') && me.analyse.down('#spTriFrequence').pressed);
        var couleur = function (ratio) {
            return objectif === null ? '' : (ratio < objectif ? 'color:#1e8449;font-weight:bold' : 'color:#c0392b;font-weight:bold');
        };
        var entier = function (v) {
            return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }, pct = function (v) {
            return String(v || 0).replace('.', ',') + ' %';
        };
        var tuile = function (cls, titre, valeur, detail, aide) {
            return '<div class="pml-tuile ' + cls + '" data-qtip="' + enc(aide) + '"><div class="pml-tuile-valeur">' + valeur + '</div>'
                    + '<div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        var html = '<div class="pml-tuiles sp-tuiles">'
                + tuile(t.valeur ? 'critique' : 'ok', 'Valeur périmée', entier(t.valeur) + ' F', 'achat : ' + entier(t.valeurAchat) + ' F',
                        'Quantités périmées × prix de vente (achat : × prix d\'achat)')
                + tuile('info', 'Chiffre d\'affaires', entier(t.ca) + ' F', 'même période', 'Ventes clôturées de la période')
                + tuile((objectif === null ? t.ratio >= 1 : !(t.ratio < objectif)) ? 'critique sp-hors-objectif' : 'ok sp-objectif-atteint', 'Taux de péremption (périmés / CA)', pct(t.ratio),
                        'objectif &lt; ' + pct(objectif === null ? 0.5 : objectif) + ' · ' + entier(t.valeur) + ' ÷ ' + entier(t.ca),
                        'Valeur périmée ÷ chiffre d\'affaires de la période ; vert sous l\'objectif, rouge au-dessus')
                + tuile('', 'Produits périmés', entier(t.produits), entier(t.saisies) + ' saisie(s) · ' + entier(t.quantite) + ' unité(s)',
                        'Produits distincts, saisies et quantités de la période')
                + '</div>';
        var tableau = function (titre, cls, entete, lignes, colonnes, vide) {
            return '<div class="ac-bloc-t" style="margin-top:14px">' + titre + '</div><table class="ac-table ' + cls + '"><tr>' + entete + '</tr>'
                    + (lignes || '<tr><td colspan="' + colonnes + '" style="color:#7f8c8d">' + vide + '</td></tr>') + '</table>';
        };
        var l = '';
        Ext.each(o.zones || [], function (z) {
            l += '<tr class="sp-zone"><td>' + enc(z.libelle) + '</td><td class="n">' + entier(z.saisies) + '</td><td class="n">' + entier(z.produits)
                    + '</td><td class="n">' + entier(z.quantite) + '</td><td class="n">' + entier(z.valeur) + '</td><td class="n">' + pct(z.part) + '</td></tr>';
        });
        html += tableau('Emplacements les plus touchés', 'sp-par-zone', '<th>Emplacement</th><th class="n">Saisies</th><th class="n">Produits</th>'
                + '<th class="n">Quantité</th><th class="n">Valeur</th><th class="n">Part</th>', l, 6, 'Aucun périmé sur la période.');
        l = '';
        Ext.each((parFrequence ? o.frequents : o.produits) || o.produits || [], function (p) {
            l += '<tr class="sp-produit"><td>' + enc(p.cip) + '</td><td>' + enc(p.libelle) + '</td><td>' + enc(p.emplacement) + '</td><td class="n">'
                    + entier(p.fois) + '</td><td class="n">' + entier(p.quantite) + '</td><td class="n">' + entier(p.valeur) + '</td><td class="n">'
                    + pct(p.part) + '</td></tr>';
        });
        html += tableau(parFrequence ? 'Produits qui se périment le plus souvent (50 premiers, par nombre de saisies)'
                : 'Produits qui se périment le plus (50 premiers, par valeur)', 'sp-par-produit' + (parFrequence ? ' sp-frequents' : ''), '<th>CIP</th><th>Produit</th><th>Emplacement</th>'
                + '<th class="n">Fois</th><th class="n">Quantité</th><th class="n">Valeur</th><th class="n">Part</th>', l, 7, 'Aucun périmé sur la période.');
        l = '';
        var pas = o.pas || 'mois', noms = {semaine: 'semaine', mois: 'mois', trimestre: 'trimestre', annee: 'année'};
        Ext.each(o.periodes || o.mois || [], function (m) {
            var v = m.periode || m.mois;
            l += '<tr class="sp-mois sp-periode"><td>' + me.libellePeriode(pas, v) + '</td><td class="n">'
                    + entier(m.valeur) + '</td><td class="n">' + entier(m.ca) + '</td><td class="n" style="' + couleur(m.ratio) + '">' + pct(m.ratio) + '</td></tr>';
        });
        html += tableau('Par ' + noms[pas] + ' : valeur périmée, chiffre d\'affaires et taux (vert sous l\'objectif, rouge au-dessus)', 'sp-par-mois sp-par-' + pas,
                '<th>' + Ext.String.capitalize(noms[pas]) + '</th><th class="n">Valeur périmée</th>'
                + '<th class="n">Chiffre d\'affaires</th><th class="n">Taux</th>', l, 4, 'Aucune donnée sur la période.');
        return html;
    }
});
