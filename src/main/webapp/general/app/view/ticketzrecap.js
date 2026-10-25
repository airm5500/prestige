/* global Ext */

/*
 * TICKET Z (retours du 25/10, point 3 : plus d'iframe). Ecran ExtJS sur les API existantes, avec ce que faisait la
 * page ticketzview.html (conservee, plus ouverte par le menu) :
 *  - filtres : type (tous les mouvements / ventes uniquement), utilisateur, date et heure de debut et de fin ;
 *  - « Afficher » : un recapitulatif par caissier et le total general (POST caisse/fetch-tickez), charge a l'ouverture ;
 *  - « Envoyer SMS » (POST caisse/send-sms) et « Imprimer » (POST caisse/tickez), etat affiche dans le bouton ;
 *  - « Aperçu » : la page imprimable dans un nouvel onglet, avec l'officine, la periode et les filtres.
 * Declare dans correctifs-affichage.js (ECRANS_COLLES).
 */
Ext.define('testextjs.view.ticketzrecap', {
    extend: 'Ext.panel.Panel',
    xtype: 'ticketzmanager',
    title: 'TICKET Z',
    cls: 'ticketz',
    frame: true,
    width: '98%',
    height: Ext.getBody() ? Ext.getBody().getViewSize().height * 0.80 : 700,
    layout: 'fit',

    initComponent: function () {
        var me = this, aujourdhui = new Date();
        me.styles();
        me.dockedItems = [{
                xtype: 'toolbar', dock: 'top', enableOverflow: true, items: [
                    {xtype: 'combobox', itemId: 'description', fieldLabel: 'Type', labelWidth: 35, width: 210,
                        editable: false, queryMode: 'local', valueField: 'v', displayField: 't', value: 'ALL',
                        store: {fields: ['v', 't'], data: [{v: 'ALL', t: 'Tous les mouvements'}, {v: 'VENTE', t: 'Ventes uniquement'}]}},
                    {xtype: 'combobox', itemId: 'userId', fieldLabel: 'Utilisateur', labelWidth: 65, width: 250,
                        editable: false, queryMode: 'local', valueField: 'v', displayField: 't', value: 'ALL',
                        store: {fields: ['v', 't'], data: [{v: 'ALL', t: 'Tous'}]}},
                    {xtype: 'datefield', itemId: 'dtStart', fieldLabel: 'Du', labelWidth: 22, width: 130,
                        format: 'd/m/Y', value: aujourdhui, allowBlank: false},
                    {xtype: 'timefield', itemId: 'hrStart', width: 75, format: 'H:i', increment: 30, value: '00:00',
                        allowBlank: false},
                    {xtype: 'datefield', itemId: 'dtEnd', fieldLabel: 'au', labelWidth: 20, width: 128,
                        format: 'd/m/Y', value: aujourdhui, allowBlank: false},
                    {xtype: 'timefield', itemId: 'hrEnd', width: 75, format: 'H:i', increment: 30, value: '23:59',
                        allowBlank: false},
                    {xtype: 'button', itemId: 'afficher', text: 'Afficher', iconCls: 'searchicon', handler: function () {
                            me.afficher();
                        }},
                    '-',
                    {xtype: 'button', itemId: 'sms', text: 'Envoyer SMS', handler: function (b) {
                            me.action(b, '../api/v1/caisse/send-sms', 'Envoi…', 'SMS envoyé');
                        }},
                    {xtype: 'button', itemId: 'imprimer', text: 'Imprimer', iconCls: 'printable', handler: function (b) {
                            me.action(b, '../api/v1/caisse/tickez', 'Impression…', 'Envoyé à l\'imprimante');
                        }},
                    {xtype: 'button', itemId: 'apercu', text: 'Aperçu', handler: function () {
                            me.apercu();
                        }}
                ]
            }];
        me.items = [{xtype: 'component', itemId: 'recap', autoScroll: true, html: ''}];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.chargerUtilisateurs();
            me.afficher();
        }, me, {single: true});
    },

    esc: function (v) {
        return Ext.String.htmlEncode(v === null || v === undefined ? '' : String(v));
    },

    styles: function () {
        if (document.getElementById('ticketz-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet(
                '.ticketz-recap{display:flex;flex-wrap:wrap;gap:10px;padding:10px;align-items:flex-start}'
                + '.ticketz-carte{flex:0 1 270px;border:1px solid #d5dbe1;border-top:0;border-radius:8px;background:#fff;overflow:hidden}'
                /* retours du 25/10 (point 1) : en-tete de chaque recapitulatif en couleur (une par caissier, en boucle),
                   lignes de total et total general en couleur */
                + '.ticketz-carte h6{margin:0;padding:7px 10px;font-size:12px;font-weight:bold;color:#fff;text-transform:uppercase;background:#1f6fb2}'
                + '.ticketz-carte.c1 h6{background:#16856b}.ticketz-carte.c2 h6{background:#8e44ad}.ticketz-carte.c3 h6{background:#c0612b}'
                + '.ticketz-carte.c4 h6{background:#2c7a9b}.ticketz-carte.c5 h6{background:#b03a5b}'
                + '.ticketz-carte table{width:calc(100% - 20px);margin:6px 10px 8px;border-collapse:collapse}'
                + '.ticketz-carte td,.ticketz-carte th{padding:3px 4px;border-top:1px solid #eef1f4;text-align:left;font-weight:normal}'
                + '.ticketz-carte tr:nth-child(odd) td{background:#f7f9fb}'
                + '.ticketz-carte tr.t th,.ticketz-carte tr.t td{font-weight:bold;background:#e8f5ee;color:#14633f}'
                + '.ticketz-carte.total{flex-basis:420px;border:1px solid #1f3a5f;border-top:0}'
                + '.ticketz-carte.total h6{background:#1f3a5f}'
                + '.ticketz-carte.total td{font-weight:bold;color:#1f3a5f}.ticketz-carte.total tr:nth-child(odd) td{background:#eaf1fa}'
                + '.ticketz-carte .m{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;color:#000}'
                + '.ticketz-carte tr.t .m{color:#14633f}.ticketz-carte.total .m{color:#1f3a5f}'
                + '@media print{.ticketz-carte h6,.ticketz-carte tr.t th,.ticketz-carte tr.t td,.ticketz-carte.total td{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
                + '.ticketz-vide{padding:16px;color:#555}',
                'ticketz-styles');
    },

    chargerUtilisateurs: function () {
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/common/users?excludeAdmin=true', method: 'GET',
            success: function (r) {
                var o = Ext.decode(r.responseText, true), c = me.down('#userId');
                if (!c || !o || !Ext.isArray(o.data)) {
                    return;
                }
                c.getStore().add(Ext.Array.map(o.data, function (u) {
                    return {v: u.lgUSERID, t: u.fullName};
                }));
            }
        });
    },

    /* parametres attendus par les API du ticket Z (memes noms que l'ancienne page) ; null si un champ est invalide */
    params: function () {
        var me = this, champs = ['dtStart', 'hrStart', 'dtEnd', 'hrEnd'], valide = true;
        Ext.each(champs, function (id) {
            valide = me.down('#' + id).isValid() && valide;
        });
        if (!valide) {
            return null;
        }
        var h = function (id) {
            return Ext.Date.format(me.down('#' + id).getValue(), 'H:i');
        };
        return {
            description: me.down('#description').getValue(), userId: me.down('#userId').getValue(),
            dtStart: Ext.Date.format(me.down('#dtStart').getValue(), 'Y-m-d'), hrStart: h('hrStart'),
            dtEnd: Ext.Date.format(me.down('#dtEnd').getValue(), 'Y-m-d'), hrEnd: h('hrEnd')
        };
    },

    afficher: function () {
        var me = this, p = me.params(), recap = me.down('#recap');
        if (!p) {
            return;
        }
        me.setLoading('Recherche…');
        Ext.Ajax.request({
            url: '../api/v1/caisse/fetch-tickez', method: 'POST', jsonData: p,
            success: function (r) {
                me.setLoading(false);
                var o = Ext.decode(r.responseText, true);
                recap.update(me.rendu(o && o.data));
            },
            failure: function () {
                me.setLoading(false);
                recap.update('<div class="ticketz-vide">Le ticket Z n\'a pas pu être lu. Réessayez.</div>');
            }
        });
    },

    /* une carte par caissier (modes de reglement puis totaux en gras), puis le total general */
    rendu: function (t) {
        var me = this;
        var lignes = function (liste, gras) {
            return Ext.Array.map(liste || [], function (l) {
                var c = gras ? 'th' : 'td';
                return '<tr' + (gras ? ' class="t"' : '') + '><' + c + '>' + me.esc(l.modeLibelle) + '</' + c + '><td class="m">' + me.esc(l.montant) + '</td></tr>';
            }).join('');
        };
        if (!t || (!Ext.isArray(t.datas) || !t.datas.length) && !t.totaux) {
            return '<div class="ticketz-vide">Aucun mouvement sur la période.</div>';
        }
        var html = '<div class="ticketz-recap">';
        Ext.each(t.datas || [], function (u, i) {
            html += '<div class="ticketz-carte c' + (i % 6) + '"><h6>Récapitulatif de ' + me.esc(u.user) + '</h6><table>'
                    + lignes(u.modePaymentAmounts) + lignes(u.totaux, true) + '</table></div>';
        });
        if (t.totaux) {
            html += '<div class="ticketz-carte total"><h6>Total général</h6><table>' + lignes(t.totaux) + '</table></div>';
        }
        return html + '</div>';
    },

    /* SMS et impression : l'etat s'affiche dans le bouton lui-meme, sans fenetre */
    action: function (b, url, enCours, fait) {
        var me = this, p = me.params(), texte = b.initialConfig.text;
        if (!p) {
            return;
        }
        var finir = function (message) {
            b.setText(message);
            Ext.defer(function () {
                if (!b.isDestroyed) {
                    b.setText(texte);
                    b.enable();
                }
            }, 2500);
        };
        b.disable();
        b.setText(enCours);
        Ext.Ajax.request({
            url: url, method: 'POST', jsonData: p,
            success: function () {
                finir(fait);
            },
            failure: function () {
                finir('Échec : réessayer');
            }
        });
    },

    /* page imprimable dans un nouvel onglet : officine, date d'impression, periode, filtres et recapitulatif */
    apercu: function () {
        var me = this, p = me.params();
        if (!p) {
            return;
        }
        var w = window.open('', 'PRINT_PREVIEW', 'width=1024,height=768');
        if (!w) {
            me.down('#apercu').setText('Autorisez les pop-ups');
            return;
        }
        var ecrire = function (officine) {
            var fr = function (d) {
                return d.split('-').reverse().join('/');
            };
            var u = me.down('#userId'), enr = u.getStore().findRecord('v', p.userId, 0, false, true, true);
            var filtres = (p.description === 'ALL' ? 'Tous les mouvements' : 'Ventes uniquement') + ' · '
                    + (p.userId === 'ALL' ? 'Tous utilisateurs' : 'Utilisateur : ' + (enr ? enr.get('t') : p.userId));
            var styles = Ext.Array.map(['ticketz-styles'], function (id) {
                var s = document.getElementById(id);
                return s ? s.innerHTML : '';
            }).join('');
            w.document.open();
            w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Aperçu - Ticket Z</title>'
                    + '<style>@page{size:A4 portrait;margin:12mm}body{margin:0;padding:1rem;font:13px Arial,sans-serif}'
                    + '.entete{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding-bottom:6px;margin-bottom:10px}'
                    + '.nom{font-weight:bold;font-size:16px}.meta{font-size:12px;color:#555;text-align:right}'
                    + '.boutons{margin-bottom:8px}@media print{.boutons{display:none}body{padding:0}}' + styles + '</style></head><body>'
                    + '<div class="boutons"><button onclick="window.print()">Imprimer</button> <button onclick="window.close()">Fermer</button></div>'
                    + '<div class="entete"><div><div class="nom">' + me.esc(officine.nom || 'Pharmacie') + '</div>'
                    + '<div class="meta" style="text-align:left">' + (officine.responsable ? 'Resp. : ' + me.esc(officine.responsable) : 'Ticket Z — Récapitulatif') + '</div></div>'
                    + '<div class="meta">Imprimé le ' + me.esc(new Date().toLocaleString('fr-FR')) + '<br><b>Période : du '
                    + fr(p.dtStart) + ' ' + p.hrStart + ' au ' + fr(p.dtEnd) + ' ' + p.hrEnd + '</b><br>' + me.esc(filtres) + '</div></div>'
                    + me.down('#recap').getEl().dom.innerHTML + '</body></html>');
            w.document.close();
            w.focus();
        };
        Ext.Ajax.request({
            url: '../api/v1/officine', method: 'GET',
            success: function (r) {
                var o = Ext.decode(r.responseText, true), off = Ext.isArray(o) && o.length ? o[0] : {};
                ecrire({nom: off.nomComplet || off.fullName, responsable: off.fullName});
            },
            failure: function () {
                ecrire({});
            }
        });
    }
});
