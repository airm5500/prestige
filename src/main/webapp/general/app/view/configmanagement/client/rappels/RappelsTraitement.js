/* global Ext */

/*
 * Retours du 10/10 (section 13) : « Rappels traitement » en deux onglets :
 *  - Liste : l'ecran existant (rappelshabitude), sans changement de fonctionnement ;
 *  - Analyse : rappels de la periode (date prevue), a preparer / prepares / ecartes / rachetes, envoyes par canal,
 *    rachetes apres rappel (efficacite) et evolution par mois. Une tuile de statut ouvre la liste correspondante.
 * Le menu ouvre ce conteneur (App.ecranReel) ; la liste garde ses identifiants, ses gestionnaires et ses tests.
 */
Ext.define('testextjs.view.configmanagement.client.rappels.RappelsTraitement', {
    extend: 'Ext.panel.Panel',
    xtype: 'rappelstraitement',
    requires: ['testextjs.view.configmanagement.client.rappels.RappelsHabitudeManager'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub rp-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    ONGLETS: [{cle: 'liste', texte: 'Liste', aide: 'Traitements à préparer et rappels à envoyer'},
        {cle: 'analyse', texte: 'Analyse', aide: 'Rappels préparés, écartés, envoyés par canal, rachetés après rappel, par mois'}],

    CANAUX: {SMS: 'SMS', WHATSAPP: 'WhatsApp', SMS_WHATSAPP: 'WhatsApp (repli SMS)', NON_RENSEIGNE: 'Canal non renseigné'},

    initComponent: function () {
        var me = this;
        me.liste = Ext.create('testextjs.view.configmanagement.client.rappels.RappelsHabitudeManager', {header: false});
        me.habiller(me.liste);
        me.analyse = me.creerAnalyse();
        Ext.apply(me, {
            items: [me.liste, me.analyse],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsRp', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'center'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'rp-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'rp-onglets-' + me.id,
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
            var b = me.down('#rp-' + x.cle);
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

    /** Tuile de statut : la liste de ces rappels sur la meme periode. */
    ouvrirListe: function (statut) {
        var me = this, a = me.analyse, l = me.liste;
        l.down('#statut').setValue(statut);
        l.down('#du').setValue(a.down('#anDebut').getValue());
        l.down('#au').setValue(a.down('#anFin').getValue());
        l.down('#query').setValue('');
        me.afficher('liste');
        l.rechercher();
    },

    creerAnalyse: function () {
        var me = this, aujourdhui = new Date();
        return Ext.create('Ext.panel.Panel', {
            itemId: 'analyseRappels', autoScroll: true, bodyPadding: 12, cls: 'rp-analyse',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'anDebut', fieldLabel: 'Prévus du', labelWidth: 60, width: 175, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.add(Ext.Date.getFirstDateOfMonth(aujourdhui), Ext.Date.MONTH, -5),
                            tooltip: 'Date prévue du prochain achat : début de la période'},
                        {xtype: 'datefield', itemId: 'anFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.add(aujourdhui, Ext.Date.DAY, 30), tooltip: 'Date prévue du prochain achat : fin de la période'},
                        {text: 'Actualiser', itemId: 'anActualiser', iconCls: 'refresh', tooltip: 'Recalculer l\'analyse sur la période', handler: function () {
                                me.chargerAnalyse();
                            }}]}],
            items: [{xtype: 'component', itemId: 'anContenu', html: '<div style="color:#7f8c8d">Chargement…</div>',
                    listeners: {afterrender: function (c) {
                            c.getEl().on('click', function (e) {
                                var t = e.getTarget('[data-statut]');
                                if (t) {
                                    me.ouvrirListe(t.getAttribute('data-statut'));
                                }
                            });
                        }}}]
        });
    },

    criteresAnalyse: function () {
        var a = this.analyse;
        return {dtStart: a.down('#anDebut').getSubmitValue(), dtEnd: a.down('#anFin').getSubmitValue()};
    },

    chargerAnalyse: function () {
        var me = this, a = me.analyse, contenu = a.down('#anContenu'), c = me.criteresAnalyse();
        if (c.dtStart && c.dtEnd && c.dtStart > c.dtEnd) {
            contenu.update('<span style="color:#b42318">La date de début doit précéder la date de fin.</span>');
            return;
        }
        a.setLoading('Calcul…');
        Ext.Ajax.request({url: '../api/v1/rappels-habitude/analyse', method: 'GET', params: c, timeout: 120000,
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
                if (a.isDestroyed) {
                    return;
                }
                a.setLoading(false);
                contenu.update('<span style="color:#b42318">Le serveur n\'a pas répondu (' + r.status + ').</span>');
            }});
    },

    MOIS: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],

    libelleMois: function (m) {
        var p = String(m || '').split('-');
        return p.length === 2 ? this.MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0] : m;
    },

    htmlAnalyse: function (o) {
        var me = this, enc = Ext.String.htmlEncode, t = o.total || {}, pct = function (n, d) {
            return d ? Math.round(n * 100 / d) + ' %' : '—';
        };
        var tuile = function (cls, titre, valeur, detail, aide, statut) {
            return '<div class="pml-tuile ' + cls + (statut ? ' rp-cliquable' : '') + '"' + (statut ? ' data-statut="' + statut + '"' : '')
                    + ' data-qtip="' + enc(aide + (statut ? ' — cliquer pour voir la liste' : '')) + '"><div class="pml-tuile-valeur">' + valeur
                    + '</div><div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        var canaux = [];
        Ext.Object.each(t.canaux || {}, function (k, v) {
            canaux.push(enc(me.CANAUX[k] || k) + ' ' + v);
        });
        var html = '<div class="pml-tuiles rp-tuiles">'
                + tuile('info', 'Rappels', t.total, 'sur la période', 'Rappels dont la date prévue est dans la période', 'TOUS')
                + tuile(t.aPreparer ? 'alerte' : 'ok', 'À préparer', t.aPreparer, pct(t.aPreparer, t.total), 'Encore à préparer', 'A_PREPARER')
                + tuile('ok', 'Préparés', t.prepares, pct(t.prepares, t.total), 'Traitement préparé (pilulier, mise de côté)', 'PREPARE')
                + tuile('', 'Écartés', t.ecartes, pct(t.ecartes, t.total), 'Écartés par l\'équipe', 'ECARTE')
                + tuile('info', 'Envoyés', t.envoyes, canaux.join(' · ') || 'aucun envoi', '« Envoyé » n\'est pas un statut : rappel parti, quel que soit le statut')
                + tuile(t.rachetesApresEnvoi ? 'ok' : '', 'Rachetés après rappel', t.rachetesApresEnvoi, String(t.efficacite).replace('.', ',') + ' % des envoyés',
                        'Efficacité : rachetés après un rappel envoyé ÷ rappels envoyés', 'ACHETE')
                + tuile('', 'Rachetés sans rappel', t.rachetesSansEnvoi, pct(t.rachetesSansEnvoi, t.rachetes) + ' des rachats', 'Rachetés sans qu\'un rappel ait été envoyé')
                + '</div>';
        var lignes = '';
        Ext.each(o.mois || [], function (m) {
            var c = [];
            Ext.Object.each(m.canaux || {}, function (k, v) {
                c.push(enc(me.CANAUX[k] || k) + ' ' + v);
            });
            lignes += '<tr class="rp-mois"><td>' + enc(me.libelleMois(m.mois)) + '</td><td class="n">' + m.total + '</td><td class="n">' + m.aPreparer
                    + '</td><td class="n">' + m.prepares + '</td><td class="n">' + m.ecartes + '</td><td class="n">' + m.envoyes + '</td><td>' + c.join(' · ')
                    + '</td><td class="n">' + m.rachetes + '</td><td class="n">' + m.rachetesApresEnvoi + '</td><td class="n">'
                    + String(m.efficacite).replace('.', ',') + ' %</td></tr>';
        });
        html += '<div class="ac-bloc-t" style="margin-top:14px">Évolution par mois (date prévue)</div>'
                + '<table class="ac-table rp-par-mois"><tr><th>Mois</th><th class="n">Rappels</th><th class="n">À préparer</th><th class="n">Préparés</th>'
                + '<th class="n">Écartés</th><th class="n">Envoyés</th><th>Canaux</th><th class="n">Rachetés</th><th class="n">Après rappel</th>'
                + '<th class="n">Efficacité</th></tr>'
                + (lignes || '<tr><td colspan="10" style="color:#7f8c8d">Aucun rappel sur la période.</td></tr>') + '</table>';
        return html;
    }
});
