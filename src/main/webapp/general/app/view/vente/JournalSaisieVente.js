/* global Ext */

/*
 * Cahier des charges du 24/11, point 2 : menu « Journal des ventes en saisie » (SERVICE CLIENT), droit
 * P_SM_JOURNAL_SAISIE_VENTE. Preuve de chaque geste sur une vente en saisie : début de saisie, mise en attente,
 * Retour et choix fait, reprise, interruption et sa cause, abandon, et chaque REFUS (droit manquant, vente ouverte
 * ailleurs), avec utilisateur, poste, heure, nombre de lignes et montant. Chaque ligne porte l'empreinte de la
 * précédente : l'en-tête dit si la chaîne est intacte ou à quelle ligne elle est rompue. Export CSV des mêmes lignes.
 */
Ext.define('testextjs.view.vente.JournalSaisieVente', {
    extend: 'Ext.panel.Panel',
    xtype: 'journalsaisievente',
    cls: 'jsv-ecran',
    layout: 'fit',
    bodyPadding: 8,

    GESTES: {DEBUT_SAISIE: 'Début de saisie', METTRE_EN_ATTENTE: 'Mise en attente', REPRENDRE_ATTENTE: 'Rappel d\'une vente en attente',
        RETOUR_SUPPRIMER: 'Retour : vente supprimée', INTERROMPRE: 'Saisie interrompue', SIGNAL_RETROUVE: 'Signal retrouvé',
        REPRENDRE_INTERROMPUE: 'Reprise d\'une saisie interrompue', EXPIRER: 'Abandon au changement de jour',
        SUPPRIMER_ATTENTE: 'Suppression d\'une vente en attente', CLOTURER: 'Clôture'},
    ETATS: {EN_COURS: 'En cours', EN_ATTENTE: 'En attente', INTERROMPUE: 'Interrompue', ABANDONNEE: 'Abandonnée', CLOTUREE: 'Clôturée'},

    initComponent: function () {
        var me = this, aujourdhui = new Date(), e = function (t) {
            return Ext.String.htmlEncode(t === undefined || t === null ? '' : String(t));
        };
        me.journal = Ext.create('Ext.data.Store', {
            fields: ['id', 'le', 'numero', 'depot', 'geste', 'etatAvant', 'etatApres', 'admis', 'motif', 'cause', 'utilisateur',
                'poste', 'lignes', 'montant', 'empreinte'],
            proxy: {type: 'ajax', url: '../api/v1/vente-saisie/journal', timeout: 120000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (s) {
                    s.getProxy().extraParams = me.filtres();
                },
                load: function (s, recs, ok) {
                    var o = s.getProxy().getReader().rawData || {}, c = me.down('#jsvChaine');
                    if (!c) {
                        return;
                    }
                    if (!ok) {
                        c.update('<span style="color:#b91c1c">Journal indisponible (droit ou connexion).</span>');
                    } else if (o.intact) {
                        c.update('<span class="jsv-intact" style="color:#15803d;font-weight:600">Chaîne d\'empreintes intacte</span> ('
                                + o.lignesControlees + ' lignes contrôlées)');
                    } else {
                        c.update('<span class="jsv-rompue" style="color:#b91c1c;font-weight:700">CHAÎNE ROMPUE à la ligne n° '
                                + e(o.rupture) + ' : une ligne a été modifiée ou retirée en base.</span>');
                    }
                }
            },
            autoLoad: true
        });
        Ext.applyIf(me, {
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'jsvDu', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', value: aujourdhui, maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'jsvAu', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', value: aujourdhui, maxValue: aujourdhui},
                        {xtype: 'button', itemId: 'jsvChercher', text: 'Rechercher', iconCls: 'searchicon', handler: function () {
                                me.journal.load();
                            }},
                        {xtype: 'component', itemId: 'jsvChaine', margin: '0 0 0 12', html: ''},
                        '->',
                        {xtype: 'button', itemId: 'jsvExport', text: 'Export CSV', iconCls: 'excel', handler: function () {
                                var f = me.filtres();
                                window.location.href = '../api/v1/vente-saisie/journal/export?du=' + encodeURIComponent(f.du) + '&au=' + encodeURIComponent(f.au);
                            }}
                    ]}],
            items: [{
                    xtype: 'gridpanel', itemId: 'jsvGrille', store: me.journal,
                    viewConfig: {emptyText: '<div style="padding:12px;color:#64748b">Aucun geste sur la période.</div>', deferEmptyText: false},
                    columns: [
                        {header: 'N°', dataIndex: 'id', width: 70, menuDisabled: true},
                        {header: 'Date et heure', dataIndex: 'le', width: 140, menuDisabled: true},
                        {header: 'Vente', dataIndex: 'numero', width: 115, menuDisabled: true, renderer: function (v, m, r) {
                                return e(v) + (r.get('depot') ? ' <span style="color:#64748b">(dépôt)</span>' : '');
                            }},
                        {header: 'Geste', dataIndex: 'geste', width: 210, menuDisabled: true, renderer: function (v) {
                                return e(me.GESTES[v] || v);
                            }},
                        {header: 'Résultat', dataIndex: 'admis', width: 85, menuDisabled: true, renderer: function (v) {
                                return v ? '<span style="color:#15803d">Fait</span>' : '<span style="color:#b91c1c;font-weight:600">Refusé</span>';
                            }},
                        {header: 'État', dataIndex: 'etatApres', width: 160, menuDisabled: true, renderer: function (v, m, r) {
                                var a = me.ETATS[r.get('etatAvant')] || '', b = me.ETATS[v] || '';
                                return e(a && b && a !== b ? a + ' → ' + b : b || a);
                            }},
                        {header: 'Motif / cause', dataIndex: 'motif', flex: 1, minWidth: 160, menuDisabled: true, renderer: function (v, m, r) {
                                var t = v || r.get('cause');
                                if (t) {
                                    m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(e(t)) + '"';
                                }
                                return e(t);
                            }},
                        {header: 'Utilisateur', dataIndex: 'utilisateur', width: 150, menuDisabled: true, renderer: function (v) {
                                return v ? e(v) : '<span style="color:#94a3b8">Serveur</span>';
                            }},
                        {header: 'Poste', dataIndex: 'poste', width: 120, menuDisabled: true, renderer: e},
                        {header: 'Lignes', dataIndex: 'lignes', width: 60, align: 'right', menuDisabled: true},
                        {header: 'Montant', dataIndex: 'montant', width: 90, align: 'right', menuDisabled: true, renderer: function (v) {
                                return v === null || v === undefined || v === '' ? '' : Ext.util.Format.number(v, '0,000').replace(/,/g, ' ');
                            }}
                    ]
                }]
        });
        me.callParent(arguments);
    },

    filtres: function () {
        var du = this.down('#jsvDu'), au = this.down('#jsvAu');
        return {du: du ? Ext.Date.format(du.getValue() || new Date(), 'Y-m-d') : '', au: au ? Ext.Date.format(au.getValue() || new Date(), 'Y-m-d') : ''};
    }
});
