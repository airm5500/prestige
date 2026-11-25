/* global Ext, testextjs */

/*
 * Cahier des charges du 24/11, point 2 : menu « Ventes en cours de saisie et saisies interrompues » (SERVICE CLIENT),
 * droit P_VENTE_VOIR_EN_COURS. Ventes du jour en cours de saisie sur un poste (lecture seule : elles ne se rappellent
 * jamais d'ici) et saisies interrompues (navigateur fermé, menu quitté, poste ou réseau coupé : plus de signal depuis
 * 2 minutes). « Reprendre la vente interrompue » : le jour même, par son auteur, ou avec le droit de reprendre celle
 * d'un autre ; le second clic confirme (aucune fenêtre). Rafraîchi toutes les 15 s.
 */
Ext.define('testextjs.view.vente.VentesEnCoursSaisie', {
    extend: 'Ext.panel.Panel',
    xtype: 'ventesencourssaisie',
    cls: 'vcs-ecran',
    layout: 'fit',
    bodyPadding: 8,

    CAUSES: {MENU: 'Menu quitté', FERMETURE: 'Navigateur fermé', ECRAN_QUITTE: 'Autre vente ouverte',
        SIGNAL_PERDU: 'Plus de signal (poste ou réseau coupé)', DECONNEXION: 'Déconnexion'},

    initComponent: function () {
        var me = this, e = function (t) {
            return Ext.String.htmlEncode(t === undefined || t === null ? '' : String(t));
        };
        me.armes = {};
        me.ventes = Ext.create('Ext.data.Store', {
            fields: ['id', 'numero', 'etat', 'libelle', 'poste', 'dernierSignal', 'cause', 'montant', 'lignes',
                'utilisateur', 'depot', 'ecran', 'depotId', 'commencee', 'reprenable'],
            proxy: {type: 'ajax', url: '../api/v1/vente-saisie/en-cours', reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            /* retours du 25/11 (1.4) : en onglet du menu « Ventes », chargee a la premiere ouverture de l'onglet */
            autoLoad: !me.chargerALaDemande
        });
        if (me.chargerALaDemande) {
            me.on('activate', function () {
                me.ventes.load();
            });
        }
        Ext.applyIf(me, {
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'component', itemId: 'vcsResume', html: ''},
                        '->',
                        {xtype: 'button', itemId: 'vcsActualiser', text: 'Actualiser', iconCls: 'refresh', handler: function () {
                                me.ventes.load();
                            }}
                    ]}],
            items: [{
                    xtype: 'gridpanel', itemId: 'vcsGrille', store: me.ventes,
                    viewConfig: {emptyText: '<div style="padding:12px;color:#64748b">Aucune vente en cours de saisie ni de saisie interrompue aujourd\'hui.</div>',
                        deferEmptyText: false, markDirty: false},
                    columns: [
                        {header: 'Vente', dataIndex: 'numero', width: 120, menuDisabled: true, renderer: function (v, m, r) {
                                return e(v) + (r.get('depot') ? ' <span style="color:#64748b">(dépôt)</span>' : '');
                            }},
                        {header: 'État', dataIndex: 'libelle', width: 150, menuDisabled: true, renderer: function (v, m, r) {
                                var c = r.get('etat') === 'INTERROMPUE' ? '#b45309;background:#fef3c7' : '#1d4ed8;background:#dbeafe';
                                return '<span class="vcs-etat" style="padding:2px 8px;border-radius:10px;color:' + c + '">' + e(v) + '</span>';
                            }},
                        {header: 'Utilisateur', dataIndex: 'utilisateur', flex: 1, minWidth: 140, menuDisabled: true, renderer: e},
                        {header: 'Poste', dataIndex: 'poste', width: 140, menuDisabled: true, renderer: e},
                        {header: 'Commencée à', dataIndex: 'commencee', width: 95, menuDisabled: true, renderer: e},
                        {header: 'Dernier signal', dataIndex: 'dernierSignal', width: 105, menuDisabled: true, renderer: e},
                        {header: 'Cause', dataIndex: 'cause', width: 200, menuDisabled: true, renderer: function (v) {
                                return e(me.CAUSES[v] || v);
                            }},
                        {header: 'Lignes', dataIndex: 'lignes', width: 70, align: 'right', menuDisabled: true},
                        {header: 'Montant', dataIndex: 'montant', width: 100, align: 'right', menuDisabled: true, renderer: function (v) {
                                return Ext.util.Format.number(v || 0, '0,000').replace(/,/g, ' ');
                            }},
                        {header: '', itemId: 'vcsColReprendre', width: 230, menuDisabled: true, renderer: function (v, m, r) {
                                if (!r.get('reprenable')) {
                                    return '';
                                }
                                var arme = me.armes[r.get('id')];
                                return '<button type="button" class="vcs-reprendre' + (arme ? ' psv-arme' : '') + '" data-id="' + e(r.get('id'))
                                        + '">' + (arme ? 'Confirmer la reprise ?' : 'Reprendre la vente interrompue') + '</button>';
                            }}
                    ],
                    listeners: {afterrender: function (g) {
                            g.getEl().on('click', function (ev, t) {
                                me.reprendre(t.getAttribute('data-id'));
                            }, null, {delegate: '.vcs-reprendre'});
                        }}
                }]
        });
        me.ventes.on('load', function (s, recs, ok) {
            var c = me.down('#vcsResume'), n = {EN_COURS: 0, INTERROMPUE: 0};
            Ext.Array.forEach(recs || [], function (r) {
                n[r.get('etat')] = (n[r.get('etat')] || 0) + 1;
            });
            if (c) {
                c.update(ok ? '<b>' + n.EN_COURS + '</b> en cours de saisie, <b>' + n.INTERROMPUE + '</b> interrompue(s)'
                        : '<span style="color:#b91c1c">Liste indisponible (droit ou connexion).</span>');
            }
        });
        me.callParent(arguments);
        me.minuteur = setInterval(function () {
            if (!me.isDestroyed && me.isVisible(true) && !Ext.Object.getSize(me.armes)) {
                me.ventes.load();
            }
        }, 15000);
        me.on('destroy', function () {
            clearInterval(me.minuteur);
        });
    },

    reprendre: function (id) {
        var me = this, r = me.ventes.findRecord('id', id, 0, false, true, true);
        if (!r) {
            return;
        }
        if (!me.armes[id]) {
            /* premier clic : le bouton demande confirmation ; 5 s pour confirmer */
            me.armes[id] = true;
            me.down('#vcsGrille').getView().refreshNode(me.ventes.indexOf(r));
            setTimeout(function () {
                if (me.armes[id] && !me.isDestroyed) {
                    delete me.armes[id];
                    me.down('#vcsGrille').getView().refresh();
                }
            }, 5000);
            return;
        }
        delete me.armes[id];
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/vente-saisie/' + encodeURIComponent(id) + '/reprendre',
            success: function (rep) {
                var d = Ext.JSON.decode(rep.responseText, true) || {};
                if (!d.success) {
                    me.down('#vcsResume').update('<span style="color:#b91c1c">' + Ext.String.htmlEncode(d.msg || 'Reprise refusée.') + '</span>');
                    me.ventes.load();
                    return;
                }
                /* la vente se rouvre sur l'écran où elle a été saisie : vente en dépôt dans « Gestion dépôts
                 * extensions », sur son dépôt ; sinon l'écran de vente de l'officine */
                if (r.get('ecran') === 'depot') {
                    testextjs.app.getController('App').onRedirectTo('depotextension', {repriseVente: id, depot: r.get('depotId')});
                    return;
                }
                var data = {isEdit: true, record: {lgPREENREGISTREMENTID: id}, isDevis: false, categorie: 'VENTE'};
                testextjs.app.getController('App').onRedirectTo('doventemanager', data);
            },
            failure: function () {
                me.down('#vcsResume').update('<span style="color:#b91c1c">Serveur injoignable : réessayez.</span>');
            }
        });
    }
});
