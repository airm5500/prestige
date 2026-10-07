/* global Ext */

/*
 * MONOGRAPHIE (DS Pharmagora / VIDAL) d'un article : posologie, composition, contre-indications, interactions...
 * Une rangee de rubriques ; la fiche s'affiche dans le panneau (aucune fenetre). Le site n'est jamais appele par le
 * navigateur : le serveur le lit et garde chaque fiche (v1/monographie). Le panneau se masque si le service est coupe.
 */
Ext.define('testextjs.view.configmanagement.famille.MonographiePanel', {
    extend: 'Ext.panel.Panel',
    xtype: 'monographiepanel',
    cls: 'mono-panel',
    familleId: null,
    /** rubrique ouverte au depart : 1 = posologie */
    rubrique: 1,
    bodyPadding: 0,
    border: false,

    initComponent: function () {
        var me = this;
        me.html = '<div class="mono"><div class="mono-rubriques"></div><div class="mono-etat"></div>'
                + '<div class="mono-corps"><div class="mono-vide">Chargement…</div></div></div>';
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.getEl().on('click', function (e) {
                var b = e.getTarget('[data-rub]');
                if (b) {
                    me.charger(parseInt(b.getAttribute('data-rub'), 10), false);
                } else if (e.getTarget('.mono-relire')) {
                    me.charger(me.rubrique, true);
                }
            });
            me.demarrer();
        });
    },

    demarrer: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/monographie/etat',
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (me.isDestroyed) {
                    return;
                }
                if (!o.success || !o.actif) {
                    me.hide();
                    var parent = me.up('fieldset');
                    if (parent && parent.itemId === 'monographieSection') {
                        parent.hide();
                    }
                    return;
                }
                me.rubriques = o.rubriques || [];
                me.dessinerRubriques();
                me.charger(me.rubrique, false);
            }
        });
    },

    zone: function (cls) {
        return this.getEl() ? this.getEl().down('.' + cls) : null;
    },

    dessinerRubriques: function () {
        var me = this, h = '';
        Ext.each(me.rubriques, function (r) {
            h += '<button type="button" class="mono-rub' + (r.numero === me.rubrique ? ' actif' : '')
                    + '" data-rub="' + r.numero + '">' + Ext.String.htmlEncode(r.libelle) + '</button>';
        });
        var z = me.zone('mono-rubriques');
        if (z) {
            z.setHTML(h);
        }
    },

    charger: function (rub, relire) {
        var me = this, corps = me.zone('mono-corps');
        if (!me.familleId || !corps) {
            return;
        }
        me.rubrique = rub;
        me.dessinerRubriques();
        corps.setHTML('<div class="mono-vide">Chargement…</div>');
        me.zone('mono-etat').setHTML('');
        me.demande = (me.demande || 0) + 1;
        var n = me.demande;
        Ext.Ajax.request({
            method: 'GET', timeout: 70000,
            url: '../api/v1/monographie/fiche/' + encodeURIComponent(me.familleId),
            params: {rubrique: rub, relire: relire ? 'true' : 'false'},
            success: function (r) {
                if (me.isDestroyed || n !== me.demande) {
                    return; /* une autre rubrique a ete demandee entre-temps */
                }
                me.afficher(Ext.decode(r.responseText, true) || {success: false, msg: 'Réponse illisible.'});
            },
            failure: function () {
                if (!me.isDestroyed && n === me.demande) {
                    me.afficher({success: false, msg: 'Le serveur ne répond pas.'});
                }
            }
        });
    },

    afficher: function (o) {
        var me = this, enc = Ext.String.htmlEncode, corps = me.zone('mono-corps'), etat = me.zone('mono-etat');
        if (!o.success) {
            corps.setHTML('<div class="mono-vide mono-erreur">' + enc(o.msg || 'Erreur') + '</div>');
            etat.setHTML('<a class="mono-relire" href="javascript:void(0)">Réessayer</a>');
            return;
        }
        if (!o.trouve) {
            corps.setHTML('<div class="mono-vide">' + enc(o.msg) + '</div>');
            etat.setHTML('<a class="mono-relire" href="javascript:void(0)">Chercher à nouveau</a>');
            return;
        }
        var f = o.fiche || {}, h = '';
        h += '<div class="mono-titre">' + enc(f.titre || '') + '<span>' + enc(f.libelleRubrique || '') + '</span></div>';
        if (f.rubrique === 3) {
            h += me.htmlInteractions(f.interactions || []);
        } else {
            var p = f.paragraphes || [];
            if (!p.length) {
                h += '<div class="mono-vide">Rien n\'est indiqué dans cette rubrique.</div>';
            }
            Ext.each(p, function (l) {
                var m = /^([A-ZÀÂÉÈÊËÎÏÔÙÛÇ' ]{4,}) :\s*(.*)$/.exec(l);
                h += m ? '<p><b>' + enc(m[1]) + '</b>' + (m[2] ? ' : ' + enc(m[2]) : '') + '</p>' : '<p>' + enc(l) + '</p>';
            });
        }
        if (f.accentsPerdus) {
            h += '<div class="mono-note">Certaines lettres accentuées sont remplacées par « ? » dans la source.</div>';
        }
        corps.setHTML(h);
        etat.setHTML('Source DS Pharmagora (VIDAL) · lue le ' + Ext.Date.format(new Date(o.lueLe), 'd/m/Y à H:i')
                + (o.ancienne ? ' · <b class="mono-ancienne">service injoignable : dernière fiche connue</b>' : '')
                + ' · <a class="mono-relire" href="javascript:void(0)" data-qtip="Relire la fiche sur le service maintenant">Relire</a>');
    },

    htmlInteractions: function (classes) {
        var enc = Ext.String.htmlEncode, h = '', total = 0;
        Ext.each(classes, function (c) {
            var avec = (c.avec || []).slice().sort(function (a, b) {
                return (b.gravite || 0) - (a.gravite || 0);
            });
            total += avec.length;
            h += '<div class="mono-classe">Classe : <b>' + enc(c.classe) + '</b> · ' + avec.length + ' interaction(s)</div>';
            Ext.each(avec, function (x) {
                h += '<div class="mono-inter g' + (x.gravite || 0) + '"><div class="mono-inter-tete"><span class="mono-niveau">'
                        + enc(x.niveau || '') + '</span><b>' + enc(x.classe) + '</b></div>';
                if (x.analyse) {
                    h += '<p>' + enc(x.analyse) + '</p>';
                }
                if (x.conseilDispensateur && x.conseilDispensateur === x.conseilPrescripteur) {
                    h += '<p><i>Conseil (dispensateur et prescripteur) :</i> ' + enc(x.conseilDispensateur) + '</p>';
                    h += '</div>';
                    return;
                }
                if (x.conseilDispensateur) {
                    h += '<p><i>Conseil au dispensateur :</i> ' + enc(x.conseilDispensateur) + '</p>';
                }
                if (x.conseilPrescripteur) {
                    h += '<p><i>Conseil au prescripteur :</i> ' + enc(x.conseilPrescripteur) + '</p>';
                }
                h += '</div>';
            });
        });
        return total ? h : '<div class="mono-vide">Aucune interaction signalée.</div>';
    }
});
