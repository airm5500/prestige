/* global Ext */

/*
 * STABILITE DU SERVEUR (besoins du 11/10, lot 4), Centre de support, API v1/support/serveur.
 *  - Etat : releve en cours (memoire du serveur Java, fils HTTP, processeur, memoire de la machine, base) et courbes
 *    des dernieres 24 h (releves toutes les 2 minutes) ; derniere cause d'arret brutal ;
 *  - Arrets : demarrages et arrets du serveur, propre ou brutal, avec la cause probable et le conseil ;
 *  - Reglages : reglages en place et conseilles pour la machine (memoire, processeurs, nombre de postes), bloc my.ini et
 *    commandes asadmin a copier. Lecture seule : l'ecran ne modifie ni Payara ni MariaDB.
 * Aucune fenetre.
 */
Ext.define('testextjs.view.support.SupportServeur', {
    extend: 'Ext.tab.Panel',
    xtype: 'supportserveur',
    title: 'Stabilité du serveur',
    frame: true,
    width: '98%',
    height: 700,
    cls: 'supportserveur',
    URL: '../api/v1/support/serveur/',
    config: {nameintern: '', titre: '', odatasource: ''},

    NIVEAUX: {OK: ['srv-ok', 'Correct'], A_AJUSTER: ['srv-ajuster', 'À ajuster'], CRITIQUE: ['srv-critique', 'Critique']},

    initComponent: function () {
        var me = this;
        me.styles();
        me.items = [me.ongletEtat(), me.ongletArrets(), me.ongletReglages()];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.chargerEtat();
        });
        me.on('tabchange', function (p, t) {
            if (t.itemId === 'ongletEtat') {
                me.chargerEtat();
            } else if (t.itemId === 'ongletArrets') {
                me.chargerArrets();
            } else if (t.itemId === 'ongletReglages') {
                me.chargerReglages();
            }
        });
    },

    styles: function () {
        if (document.getElementById('srv-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet(
                '.srv-tuiles{display:flex;flex-wrap:wrap;gap:10px;padding:10px}'
                + '.srv-tuile{flex:1 1 170px;min-width:170px;border:1px solid #d5dbe1;border-left:5px solid #1f6fb2;border-radius:8px;background:#fff;padding:8px 10px}'
                + '.srv-tuile .t{font-size:11px;color:#5d6d7e;text-transform:uppercase;letter-spacing:.3px}'
                + '.srv-tuile .n{font-size:20px;font-weight:bold;color:#1b2631;margin-top:2px}.srv-tuile .s{font-size:11px;color:#5d6d7e}'
                + '.srv-tuile.alerte{border-left-color:#c0392b}.srv-tuile.alerte .n{color:#c0392b}.srv-tuile.attention{border-left-color:#e67e22}'
                + '.srv-cause{margin:10px;padding:10px 12px;border-radius:6px;background:#fdecea;color:#7b241c;border:1px solid #f5b7b1}'
                + '.srv-cause.WARN{background:#fff4e0;color:#7a4b00;border-color:#f8c471}'
                + '.srv-ok{color:#1e8449;font-weight:bold}.srv-ajuster{color:#b9770e;font-weight:bold}.srv-critique{color:#c0392b;font-weight:bold}'
                + '.srv-brutal{color:#c0392b;font-weight:bold}.srv-propre{color:#1e8449}.srv-encours{color:#1f6fb2}'
                + '.srv-etat{padding:4px 10px;min-height:22px;color:#34495e}'
                + '.srv-code textarea{font-family:Consolas,monospace !important;font-size:12px !important}', 'srv-styles');
    },

    esc: function (v) {
        return Ext.String.htmlEncode(v === null || v === undefined ? '' : String(v));
    },

    nombre: function (v) {
        return v === null || v === undefined || v === '' ? '—' : String(Math.round(Number(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    },

    appel: function (methode, chemin, corps, rappel) {
        Ext.Ajax.request({
            url: this.URL + chemin, method: methode, jsonData: corps || undefined,
            success: function (r) {
                rappel(Ext.decode(r.responseText, true) || {success: false, message: 'Réponse illisible.'});
            },
            failure: function (r) {
                rappel({success: false, message: r.status === 401 ? 'Session expirée.' : 'Le serveur ne répond pas.'});
            }
        });
    },

    /* ============================================================================================ etat */

    ongletEtat: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {fields: ['quand', {name: 'memoirePct', type: 'float'}, {name: 'cpuMachine', type: 'float'},
                {name: 'cpuServeur', type: 'float'}, {name: 'filsHttp', type: 'int'}, {name: 'bddConnexions', type: 'int'}], data: []});
        return {
            title: 'État', itemId: 'ongletEtat', iconCls: 'fa fa-heartbeat', layout: {type: 'vbox', align: 'stretch'}, autoScroll: true,
            mesures: store,
            tbar: [{text: 'Actualiser', iconCls: 'fa fa-refresh', handler: function () {
                        me.chargerEtat();
                    }}, '->', {xtype: 'tbtext', itemId: 'machine', text: ''}],
            items: [
                {xtype: 'component', itemId: 'cause', html: ''},
                {xtype: 'component', itemId: 'tuiles', html: ''},
                {xtype: 'chart', itemId: 'courbes', height: 300, margin: '0 10 10 10', store: store, animate: false, shadow: false,
                    legend: {position: 'top'},
                    axes: [{type: 'Numeric', position: 'left', fields: ['memoirePct', 'cpuMachine', 'cpuServeur'], minimum: 0, maximum: 100, title: '%', grid: true},
                        {type: 'Category', position: 'bottom', fields: ['quand'], label: {renderer: function (v) {
                                    return String(v).substr(11, 5);
                                }, rotate: {degrees: 0}}}],
                    series: [
                        {type: 'line', axis: 'left', xField: 'quand', yField: 'memoirePct', title: 'Mémoire du serveur Java', showMarkers: false, style: {'stroke-width': 2}},
                        {type: 'line', axis: 'left', xField: 'quand', yField: 'cpuMachine', title: 'Processeur de la machine', showMarkers: false, style: {'stroke-width': 1.5}},
                        {type: 'line', axis: 'left', xField: 'quand', yField: 'cpuServeur', title: 'Processeur du serveur Java', showMarkers: false, style: {'stroke-width': 1.5}}
                    ]},
                {xtype: 'component', itemId: 'etat', cls: 'srv-etat'}
            ]
        };
    },

    tuile: function (titre, valeur, sous, classe) {
        return '<div class="srv-tuile ' + (classe || '') + '"><div class="t">' + titre + '</div><div class="n">' + valeur + '</div>'
                + (sous ? '<div class="s">' + sous + '</div>' : '') + '</div>';
    },

    chargerEtat: function () {
        var me = this, o = me.down('#ongletEtat');
        me.appel('GET', 'etat', null, function (r) {
            if (!r.success) {
                o.down('#etat').update(me.esc(r.message));
                return;
            }
            var pct = r.memoireMaxMo ? Math.round(r.memoireMo * 100 / r.memoireMaxMo) : null;
            var ramPct = r.ramTotaleMo ? Math.round((r.ramTotaleMo - r.ramLibreMo) * 100 / r.ramTotaleMo) : null;
            o.down('#machine').setText(me.esc(r.hote) + ' · Java ' + me.esc(r.java) + ' · ' + r.processeurs + ' processeur(s)');
            o.down('#tuiles').update('<div class="srv-tuiles">'
                    + me.tuile('En marche depuis', me.esc(r.depuis))
                    + me.tuile('Mémoire du serveur Java', pct === null ? '—' : pct + ' %', me.nombre(r.memoireMo) + ' / ' + me.nombre(r.memoireMaxMo) + ' Mo',
                            pct >= 90 ? 'alerte' : pct >= 75 ? 'attention' : '')
                    + me.tuile('Mémoire de la machine', ramPct === null ? '—' : ramPct + ' %', me.nombre(r.ramLibreMo) + ' Mo libres',
                            ramPct >= 92 ? 'alerte' : ramPct >= 85 ? 'attention' : '')
                    + me.tuile('Processeur', r.cpuMachine === null ? '—' : Math.round(r.cpuMachine) + ' %', 'dont serveur Java ' + (r.cpuServeur === null ? '—' : Math.round(r.cpuServeur) + ' %'))
                    + me.tuile('Requêtes en traitement', me.nombre(r.filsHttp), me.nombre(r.fils) + ' fils au total')
                    + me.tuile('Connexions à la base', me.nombre(r.bddConnexions), me.nombre(r.bddActives) + ' actives')
                    + me.tuile('Interblocages (base)', me.nombre(r.bddInterblocages), 'depuis le démarrage de MariaDB', r.bddInterblocages > 0 ? 'attention' : '')
                    + '</div>');
            var c = r.derniereCause;
            o.down('#cause').update(c ? '<div class="srv-cause ' + me.esc(c.niveau) + '"><b><i class="fa fa-exclamation-triangle"></i> Dernier arrêt brutal : '
                    + me.esc(c.libelle) + '</b><br>' + me.esc(c.explication) + '<br><i>Conseil : ' + me.esc(c.conseil) + '</i></div>' : '');
        });
        me.appel('GET', 'mesures?heures=24', null, function (r) {
            if (!r.success) {
                return;
            }
            var l = Ext.Array.map(r.data || [], function (x) {
                return {quand: x.quand, memoirePct: x.memoireMaxMo ? Math.round(x.memoireMo * 1000 / x.memoireMaxMo) / 10 : 0,
                    cpuMachine: x.cpuMachine || 0, cpuServeur: x.cpuServeur || 0, filsHttp: x.filsHttp || 0, bddConnexions: x.bddConnexions || 0};
            });
            o.mesures.loadData(l);
            o.down('#etat').update(l.length ? l.length + ' relevé(s) sur 24 h (toutes les 2 minutes).' : 'Aucun relevé pour l\'instant : le premier arrive dans 2 minutes.');
        });
    },

    /* ============================================================================================ arrets */

    ongletArrets: function () {
        var me = this;
        return {
            title: 'Arrêts', itemId: 'ongletArrets', iconCls: 'fa fa-power-off', layout: 'fit',
            items: [{xtype: 'gridpanel', itemId: 'arrets', columnLines: true,
                    store: Ext.create('Ext.data.Store', {fields: ['id', 'hote', 'demarre', 'dernierSigne', 'arrete', 'arret', 'cause', 'explication', 'conseil', 'indisponibilite', 'java', 'memoireMaxMo'], data: []}),
                    viewConfig: {emptyText: '<div style="padding:20px;color:#7f8c8d">Aucun démarrage enregistré.</div>', deferEmptyText: false},
                    columns: [
                        {text: 'Démarré le', dataIndex: 'demarre', width: 130},
                        {text: 'Dernier signe de vie', dataIndex: 'dernierSigne', width: 160},
                        {text: 'Arrêt', dataIndex: 'arret', width: 100, renderer: function (v) {
                                return v === 'BRUTAL' ? '<span class="srv-brutal">Brutal</span>' : v === 'PROPRE' ? '<span class="srv-propre">Propre</span>' : '<span class="srv-encours">En marche</span>';
                            }},
                        {text: 'Cause probable', dataIndex: 'cause', width: 260, renderer: function (v, m, r) {
                                if (r.get('explication')) {
                                    m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(me.esc(r.get('explication'))) + '"';
                                }
                                return me.esc(v);
                            }},
                        {text: 'Indispo. (min)', dataIndex: 'indisponibilite', width: 100, align: 'right'},
                        {text: 'Conseil', dataIndex: 'conseil', flex: 1, minWidth: 250, renderer: function (v, m) {
                                m.style = 'white-space:normal';
                                return me.esc(v);
                            }},
                        {text: 'Machine', dataIndex: 'hote', width: 120},
                        {text: 'Mémoire Java (Mo)', dataIndex: 'memoireMaxMo', width: 140, align: 'right'}
                    ]}],
            dockedItems: [{xtype: 'component', dock: 'top', html: '<div style="padding:8px 10px;color:#5d6d7e">Chaque démarrage du serveur est enregistré. '
                            + 'Après un arrêt brutal, la cause est déduite au redémarrage : journal Windows, fin du journal du serveur, rapport de plantage, '
                            + 'mémoire et disque juste avant l\'arrêt. Le détail complet est dans « Diagnostic & bugs ».</div>'}]
        };
    },

    chargerArrets: function () {
        var me = this;
        me.appel('GET', 'historique?limit=200', null, function (r) {
            if (r.success) {
                me.down('#arrets').getStore().loadData(r.data || []);
            }
        });
    },

    /* ============================================================================================ reglages */

    ongletReglages: function () {
        var me = this;
        var copier = function (id) {
            return {xtype: 'button', text: 'Copier', iconCls: 'fa fa-copy', handler: function () {
                    var t = me.down('#' + id).getValue();
                    var fait = function () {
                        me.down('#etatReglages').update('<span class="srv-ok">Copié.</span>');
                    };
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(t).then(fait, function () {
                            me.down('#' + id).selectText();
                        });
                    } else {
                        me.down('#' + id).selectText();
                    }
                }};
        };
        return {
            title: 'Réglages conseillés', itemId: 'ongletReglages', iconCls: 'fa fa-sliders', layout: {type: 'vbox', align: 'stretch'},
            tbar: [{xtype: 'numberfield', itemId: 'postes', fieldLabel: 'Postes (caisses, terminaux, téléphones)', labelWidth: 250, width: 330,
                    minValue: 1, maxValue: 200, allowDecimals: false},
                {text: 'Recalculer', iconCls: 'fa fa-refresh', handler: function () {
                        me.enregistrerPostes();
                    }},
                '->', {xtype: 'tbtext', itemId: 'machineReglages', text: ''}],
            items: [
                {xtype: 'gridpanel', itemId: 'reglages', flex: 3, columnLines: true,
                    store: Ext.create('Ext.data.Store', {fields: ['domaine', 'cle', 'libelle', 'actuel', 'conseille', 'niveau', 'explication', 'ligne'], data: [],
                        sorters: [{sorterFn: function (a, b) {
                                    var o = {CRITIQUE: 0, A_AJUSTER: 1, OK: 2};
                                    return o[a.get('niveau')] - o[b.get('niveau')];
                                }}]}),
                    columns: [
                        {text: 'Où', dataIndex: 'domaine', width: 90, renderer: function (v) {
                                return {MARIADB: 'MariaDB', PAYARA: 'Payara', JAVA: 'Serveur Java', MACHINE: 'Machine'}[v] || v;
                            }},
                        {text: 'Réglage', dataIndex: 'libelle', width: 300, renderer: function (v, m) {
                                m.style = 'white-space:normal';
                                return me.esc(v);
                            }},
                        {text: 'En place', dataIndex: 'actuel', width: 160},
                        {text: 'Conseillé', dataIndex: 'conseille', width: 130},
                        {text: 'État', dataIndex: 'niveau', width: 90, renderer: function (v) {
                                var n = me.NIVEAUX[v] || ['', v];
                                return '<span class="' + n[0] + '">' + n[1] + '</span>';
                            }},
                        {text: 'Pourquoi', dataIndex: 'explication', flex: 1, minWidth: 260, renderer: function (v, m) {
                                m.style = 'white-space:normal';
                                return me.esc(v);
                            }}
                    ]},
                {xtype: 'container', flex: 2, layout: {type: 'hbox', align: 'stretch'}, padding: '8 0 0 0', items: [
                        {xtype: 'panel', flex: 1, title: 'MariaDB : bloc à reporter dans my.ini (puis redémarrer MariaDB)', layout: 'fit', tools: [copier('myIni')],
                            items: [{xtype: 'textarea', itemId: 'myIni', readOnly: true, cls: 'srv-code'}]},
                        {xtype: 'panel', flex: 1, margin: '0 0 0 8', title: 'Payara : commandes asadmin (dossier bin de Payara)', layout: 'fit', tools: [copier('asadmin')],
                            items: [{xtype: 'textarea', itemId: 'asadmin', readOnly: true, cls: 'srv-code'}]}
                    ]},
                {xtype: 'component', itemId: 'etatReglages', cls: 'srv-etat'}
            ]
        };
    },

    chargerReglages: function () {
        var me = this, o = me.down('#ongletReglages');
        o.setLoading('Lecture des réglages...');
        me.appel('GET', 'reglages', null, function (r) {
            o.setLoading(false);
            if (!r.success) {
                me.down('#etatReglages').update('<span class="srv-critique">' + me.esc(r.message) + '</span>');
                return;
            }
            o.down('#postes').setValue(r.postes);
            o.down('#machineReglages').setText('Machine : ' + me.esc(r.ram) + ' de mémoire, ' + r.processeurs + ' processeur(s) · MariaDB ' + me.esc(r.mariadb));
            o.down('#reglages').getStore().loadData(r.data || []);
            o.down('#myIni').setValue(r.myIni || '');
            o.down('#asadmin').setValue(r.asadmin || (r.payaraLu ? 'Aucun réglage Payara à appliquer.' : 'Configuration de Payara illisible.'));
            var n = {CRITIQUE: 0, A_AJUSTER: 0};
            Ext.each(r.data || [], function (x) {
                if (n[x.niveau] !== undefined) {
                    n[x.niveau]++;
                }
            });
            me.down('#etatReglages').update((n.CRITIQUE ? '<span class="srv-critique">' + n.CRITIQUE + ' réglage(s) critique(s)</span> · ' : '')
                    + (n.A_AJUSTER ? '<span class="srv-ajuster">' + n.A_AJUSTER + ' à ajuster</span> · ' : '')
                    + 'Calcul pour ' + r.postes + ' poste(s). L\'écran ne modifie rien : les réglages s\'appliquent avec les blocs ci-dessus.');
        });
    },

    enregistrerPostes: function () {
        var me = this, p = me.down('#ongletReglages #postes').getValue();
        me.appel('POST', 'postes', {postes: p}, function (r) {
            if (!r.success) {
                me.down('#etatReglages').update('<span class="srv-critique">' + me.esc(r.message) + '</span>');
                return;
            }
            me.chargerReglages();
        });
    }
});
