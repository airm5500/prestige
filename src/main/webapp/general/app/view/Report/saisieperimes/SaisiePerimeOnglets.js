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
        Ext.Ajax.request({url: '../api/v1/gestionperime/analyse', method: 'GET', params: {dtStart: debut, dtEnd: fin}, timeout: 120000,
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
        var me = this, enc = Ext.String.htmlEncode, t = o.total || {};
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
                + tuile(t.ratio >= 1 ? 'critique' : t.ratio >= 0.5 ? 'alerte' : 'ok', 'Ratio périmés / CA', pct(t.ratio),
                        entier(t.valeur) + ' ÷ ' + entier(t.ca), 'Valeur périmée ÷ chiffre d\'affaires de la période')
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
        Ext.each(o.produits || [], function (p) {
            l += '<tr class="sp-produit"><td>' + enc(p.cip) + '</td><td>' + enc(p.libelle) + '</td><td>' + enc(p.emplacement) + '</td><td class="n">'
                    + entier(p.fois) + '</td><td class="n">' + entier(p.quantite) + '</td><td class="n">' + entier(p.valeur) + '</td><td class="n">'
                    + pct(p.part) + '</td></tr>';
        });
        html += tableau('Produits qui se périment le plus (50 premiers, par valeur)', 'sp-par-produit', '<th>CIP</th><th>Produit</th><th>Emplacement</th>'
                + '<th class="n">Fois</th><th class="n">Quantité</th><th class="n">Valeur</th><th class="n">Part</th>', l, 7, 'Aucun périmé sur la période.');
        l = '';
        Ext.each(o.mois || [], function (m) {
            var p = String(m.mois).split('-');
            l += '<tr class="sp-mois"><td>' + (p.length === 2 ? me.MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0] : enc(m.mois)) + '</td><td class="n">'
                    + entier(m.valeur) + '</td><td class="n">' + entier(m.ca) + '</td><td class="n">' + pct(m.ratio) + '</td></tr>';
        });
        html += tableau('Par mois : valeur périmée et chiffre d\'affaires', 'sp-par-mois', '<th>Mois</th><th class="n">Valeur périmée</th>'
                + '<th class="n">Chiffre d\'affaires</th><th class="n">Ratio</th>', l, 4, 'Aucune donnée sur la période.');
        return html;
    }
});
