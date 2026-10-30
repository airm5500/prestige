/* global Ext */

/*
 * STABILITE DU SERVEUR (besoins du 11/10, lot 4), Centre de support, API v1/support/serveur.
 *  - Etat : releve en cours (memoire du serveur Java, fils HTTP, processeur, memoire de la machine, base) et courbes
 *    des dernieres 24 h (releves toutes les 2 minutes) ; derniere cause d'arret brutal ;
 *  - Arrets : demarrages et arrets du serveur, propre ou brutal, avec la cause probable et le conseil ;
 *  - Reglages : reglages en place et conseilles pour la machine (memoire, processeurs, nombre de postes), bloc my.ini et
 *    commandes asadmin a copier. Super administrateur : « Appliquer à chaud » (SET GLOBAL des reglages de MariaDB
 *    modifiables sans redemarrage), confirme dans le bouton lui-meme.
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
        me.items = [me.ongletEtat(), me.ongletExperience(), me.ongletArrets(), me.ongletReglages(), me.ongletLexique()];
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
                me.etatJetonVeille();
            } else if (t.itemId === 'ongletExperience') {
                me.chargerExperience();
            } else if (t.itemId === 'ongletLexique') {
                me.afficherLexique();
            }
        });
        /* monitoring en direct : l'onglet Etat se rafraichit toutes les 15 s tant qu'il est affiche */
        me.minuteur = setInterval(function () {
            var t = me.getActiveTab(), auto = me.down('#auto');
            if (!me.isDestroyed && t && t.itemId === 'ongletEtat' && auto && auto.getValue() && me.isVisible(true)) {
                me.chargerEtat(true);
            }
        }, 15000);
        me.on('destroy', function () {
            clearInterval(me.minuteur);
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
                + '.srv-code textarea{font-family:Consolas,monospace !important;font-size:12px !important}'
                + '.srv-lex-image{padding:10px 12px;background:#eaf2f8;border-radius:6px;color:#1b4f72;margin-bottom:6px}'
                + '.srv-lex-groupe{margin:16px 0 6px;color:#1f6fb2;font-size:15px}'
                + '.srv-lex{border:1px solid #d5dbe1;border-left:5px solid #1f6fb2;border-radius:8px;background:#fff;padding:10px 12px;margin-bottom:10px;line-height:1.55}'
                + '.srv-lex>div{margin-top:3px}.srv-lex-terme{font-weight:bold;font-size:14px;color:#1b2631}'
                + '.srv-lex-ici{background:#f4f6f8;border-radius:4px;padding:1px 6px;margin-left:6px}'
                + '.srv-confirmer,.srv-confirmer .x-btn-inner{background:#c0392b !important;color:#fff !important}'
                + '.srv-compte-rendu{margin:4px 0 4px 18px;padding:0}.srv-compte-rendu li{margin:2px 0}'
                + '.srv-jeton{font-family:Consolas,monospace;background:#f4f6f8;padding:2px 6px;border-radius:4px;user-select:all}', 'srv-styles');
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
                    }}, {xtype: 'checkbox', itemId: 'auto', boxLabel: 'Actualisation automatique (15 s)', checked: true, margin: '0 0 0 10'},
                {xtype: 'tbtext', itemId: 'heure', text: ''}, '->', {xtype: 'tbtext', itemId: 'machine', text: ''}],
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

    chargerEtat: function (silencieux) {
        var me = this, o = me.down('#ongletEtat');
        me.appel('GET', 'etat', null, function (r) {
            if (!r.success) {
                o.down('#etat').update(me.esc(r.message));
                return;
            }
            var pct = r.memoireMaxMo ? Math.round(r.memoireMo * 100 / r.memoireMaxMo) : null;
            var ramPct = r.ramTotaleMo ? Math.round((r.ramTotaleMo - r.ramLibreMo) * 100 / r.ramTotaleMo) : null;
            o.down('#machine').setText(me.esc(r.role) + ' ' + me.esc(r.hote) + ' · Java ' + me.esc(r.java) + ' · ' + r.processeurs + ' processeur(s)');
            o.down('#heure').setText('Mesuré à ' + Ext.Date.format(new Date(), 'H:i:s'));
            var pool = r.pool || {};
            o.down('#tuiles').update('<div class="srv-tuiles">'
                    + me.tuile('En marche depuis', me.esc(r.depuis))
                    + me.tuile('Mémoire du serveur Java', pct === null ? '—' : pct + ' %', me.nombre(r.memoireMo) + ' / ' + me.nombre(r.memoireMaxMo) + ' Mo',
                            pct >= 90 ? 'alerte' : pct >= 75 ? 'attention' : '')
                    + me.tuile('Mémoire de la machine', ramPct === null ? '—' : ramPct + ' %', me.nombre(r.ramLibreMo) + ' Mo libres',
                            ramPct >= 92 ? 'alerte' : ramPct >= 85 ? 'attention' : '')
                    + me.tuile('Processeur', r.cpuMachine === null ? '—' : Math.round(r.cpuMachine) + ' %', 'dont serveur Java ' + (r.cpuServeur === null ? '—' : Math.round(r.cpuServeur) + ' %'))
                    + me.tuile('Requêtes en traitement', me.nombre(r.filsHttp), me.nombre(r.fils) + ' fils au total')
                    + me.tuile('Pool de connexions', r.poolMs < 0 ? 'En échec' : r.poolMs + ' ms', me.esc(pool.etat || '')
                            + (pool.reparationsDepuisDemarrage ? ' · ' + pool.reparationsDepuisDemarrage + ' réparation(s)' : ''),
                            r.poolMs < 0 ? 'alerte' : r.poolMs > 500 ? 'attention' : '')
                    + me.tuile('Connexions à la base', me.nombre(r.bddConnexions), me.nombre(r.bddActives) + ' actives (tous postes)')
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

    /* ============================================================================================ experience (RUM) */

    grilleRum: function (itemId, titre, cle) {
        var me = this;
        return {xtype: 'gridpanel', itemId: itemId, title: titre, flex: 1, margin: 4, columnLines: true,
            store: Ext.create('Ext.data.Store', {fields: ['cle', 'nombre', 'moyenneMs', 'maxMs', 'echecs', 'postes'], data: []}),
            viewConfig: {emptyText: '<div style="padding:10px;color:#7f8c8d">Aucune mesure sur la période.</div>', deferEmptyText: false},
            columns: [{text: cle, dataIndex: 'cle', flex: 1, minWidth: 200, renderer: function (v) {
                        return me.esc(v);
                    }},
                {text: 'Fois', dataIndex: 'nombre', width: 70, align: 'right', renderer: me.nombre},
                {text: 'Moyenne', dataIndex: 'moyenneMs', width: 90, align: 'right', renderer: function (v) {
                        return me.duree(v);
                    }},
                {text: 'Pire', dataIndex: 'maxMs', width: 90, align: 'right', renderer: function (v) {
                        return me.duree(v);
                    }},
                {text: 'Échecs', dataIndex: 'echecs', width: 70, align: 'right', renderer: function (v) {
                        return v > 0 ? '<span class="srv-critique">' + me.nombre(v) + '</span>' : '0';
                    }}]};
    },

    duree: function (ms) {
        ms = Number(ms || 0);
        var t = ms >= 1000 ? (Math.round(ms / 100) / 10).toString().replace('.', ',') + ' s' : Math.round(ms) + ' ms';
        return ms >= 5000 ? '<span class="srv-critique">' + t + '</span>' : ms >= 2000 ? '<span class="srv-ajuster">' + t + '</span>' : t;
    },

    ongletExperience: function () {
        var me = this;
        var serie = Ext.create('Ext.data.Store', {fields: ['t', {name: 'appelMoyenMs', type: 'int'}, {name: 'ecranMoyenMs', type: 'int'}, {name: 'erreurs', type: 'int'}], data: []});
        return {
            title: 'Expérience utilisateur', itemId: 'ongletExperience', iconCls: 'fa fa-users', autoScroll: true,
            layout: {type: 'vbox', align: 'stretch'}, serie: serie,
            tbar: [{xtype: 'combobox', itemId: 'periodeRum', fieldLabel: 'Période', labelWidth: 55, width: 200, editable: false, queryMode: 'local', value: 24,
                    displayField: 't', valueField: 'v', store: Ext.create('Ext.data.Store', {fields: ['v', 't'], data: [{v: 1, t: 'Dernière heure'}, {v: 6, t: '6 heures'},
                            {v: 24, t: '24 heures'}, {v: 168, t: '7 jours'}, {v: 336, t: '14 jours'}]}), listeners: {select: function () {
                            me.chargerExperience();
                        }}},
                {xtype: 'combobox', itemId: 'posteRum', fieldLabel: 'Poste', labelWidth: 40, width: 280, editable: false, queryMode: 'local', value: '',
                    displayField: 't', valueField: 'v', store: Ext.create('Ext.data.Store', {fields: ['v', 't'], data: [{v: '', t: 'Tous les postes'}]}),
                    listeners: {select: function () {
                            me.chargerExperience();
                        }}},
                {text: 'Actualiser', iconCls: 'fa fa-refresh', handler: function () {
                        me.chargerExperience();
                    }},
                '->', {xtype: 'tbtext', text: 'Ce que vivent les utilisateurs dans leur navigateur : écrans, appels au serveur, erreurs.'}],
            items: [
                {xtype: 'chart', itemId: 'courbeRum', height: 240, margin: '6 10', store: serie, animate: false, shadow: false, legend: {position: 'top'},
                    axes: [{type: 'Numeric', position: 'left', fields: ['appelMoyenMs', 'ecranMoyenMs'], minimum: 0, title: 'ms', grid: true},
                        {type: 'Category', position: 'bottom', fields: ['t'], label: {renderer: function (v) {
                                    return String(v).substr(11, 5) || String(v).substr(5, 5);
                                }}}],
                    series: [{type: 'line', axis: 'left', xField: 't', yField: 'ecranMoyenMs', title: 'Ouverture d\'écran (moyenne)', showMarkers: false, style: {'stroke-width': 2}},
                        {type: 'line', axis: 'left', xField: 't', yField: 'appelMoyenMs', title: 'Appel au serveur (moyenne)', showMarkers: false, style: {'stroke-width': 2}}]},
                {xtype: 'gridpanel', itemId: 'postesRum', title: 'Par poste', height: 170, margin: '0 4', columnLines: true,
                    store: Ext.create('Ext.data.Store', {fields: ['poste', 'utilisateurs', 'appels', 'appelMoyenMs', 'echecs', 'erreursJs', 'ecrans', 'ecranMoyenMs', 'derniereActivite'], data: []}),
                    columns: [{text: 'Poste', dataIndex: 'poste', flex: 1},
                        {text: 'Utilisateurs', dataIndex: 'utilisateurs', width: 90, align: 'right'},
                        {text: 'Écrans ouverts', dataIndex: 'ecrans', width: 110, align: 'right', renderer: me.nombre},
                        {text: 'Ouverture moy.', dataIndex: 'ecranMoyenMs', width: 110, align: 'right', renderer: function (v) {
                                return me.duree(v);
                            }},
                        {text: 'Appels', dataIndex: 'appels', width: 90, align: 'right', renderer: me.nombre},
                        {text: 'Appel moy.', dataIndex: 'appelMoyenMs', width: 100, align: 'right', renderer: function (v) {
                                return me.duree(v);
                            }},
                        {text: 'Appels en échec', dataIndex: 'echecs', width: 120, align: 'right', renderer: function (v) {
                                return v > 0 ? '<span class="srv-critique">' + me.nombre(v) + '</span>' : '0';
                            }},
                        {text: 'Erreurs JS', dataIndex: 'erreursJs', width: 90, align: 'right'},
                        {text: 'Dernière activité', dataIndex: 'derniereActivite', width: 130}]},
                {xtype: 'container', height: 300, layout: {type: 'hbox', align: 'stretch'}, items: [
                        me.grilleRum('ecransRum', 'Écrans les plus lents à s\'ouvrir', 'Écran'),
                        me.grilleRum('apisRum', 'Appels les plus lents', 'Appel')]},
                {xtype: 'container', height: 260, layout: {type: 'hbox', align: 'stretch'}, items: [
                        me.grilleRum('echecsRum', 'Appels en échec', 'Appel'),
                        me.grilleRum('erreursRum', 'Erreurs JavaScript', 'Erreur')]}
            ]
        };
    },

    chargerExperience: function () {
        var me = this, o = me.down('#ongletExperience'), h = o.down('#periodeRum').getValue(), p = o.down('#posteRum').getValue() || '';
        me.appel('GET', 'rum?heures=' + h + '&poste=' + encodeURIComponent(p), null, function (r) {
            if (!r.success) {
                return;
            }
            o.serie.loadData(r.serie || []);
            o.down('#postesRum').getStore().loadData(r.postes || []);
            o.down('#ecransRum').getStore().loadData(r.ecrans || []);
            o.down('#apisRum').getStore().loadData(r.apis || []);
            o.down('#echecsRum').getStore().loadData(Ext.Array.filter(r.apisEchecs || [], function (x) {
                return x.echecs > 0;
            }));
            o.down('#erreursRum').getStore().loadData(r.erreurs || []);
            var c = o.down('#posteRum'), l = [{v: '', t: 'Tous les postes'}];
            if (!p) {
                Ext.each(r.postes || [], function (x) {
                    l.push({v: x.poste, t: x.poste});
                });
                c.getStore().loadData(l);
            }
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
                '-', {itemId: 'jetonVeille', text: 'Jeton Prestige Veille', iconCls: 'fa fa-key',
                    tooltip: 'Prestige Veille (outil de surveillance installé sur le serveur) lit l\'état de Prestige avec ce jeton.',
                    handler: function (b) {
                        me.genererJetonVeille(b);
                    }},
                {xtype: 'tbtext', itemId: 'etatJetonVeille', text: ''},
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
                            tbar: [{itemId: 'appliquerMariadb', text: 'Appliquer à chaud', iconCls: 'fa fa-bolt', hidden: true,
                                    tooltip: 'Change tout de suite, sans redémarrer MariaDB, les réglages à ajuster qui le permettent.',
                                    handler: function (b) {
                                        me.appliquerMariadb(b);
                                    }},
                                {xtype: 'tbtext', itemId: 'droitsMariadb', text: ''}],
                            items: [{xtype: 'textarea', itemId: 'myIni', readOnly: true, cls: 'srv-code'}]},
                        {xtype: 'panel', flex: 1, margin: '0 0 0 8', title: 'Payara : commandes asadmin (dossier bin de Payara)', layout: 'fit', tools: [copier('asadmin')],
                            items: [{xtype: 'textarea', itemId: 'asadmin', readOnly: true, cls: 'srv-code'}]}
                    ]},
                {xtype: 'component', itemId: 'etatReglages', cls: 'srv-etat'}
            ]
        };
    },

    chargerReglages: function (ensuite) {
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
            me.reglages = {};
            Ext.each(r.data || [], function (x) {
                me.reglages[x.cle] = x;
            });
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
                    + 'Calcul pour ' + r.postes + ' poste(s). ' + (r.superAdmin ? 'Les boutons « Appliquer » changent les réglages à ajuster ; le reste s\'applique avec les blocs ci-dessus.'
                            : 'L\'écran ne modifie rien : les réglages s\'appliquent avec les blocs ci-dessus.'));
            me.afficherBoutonsReglages(r);
            if (ensuite) {
                ensuite();
            }
        });
    },

    /* MariaDB a chaud : super administrateur, MariaDB sur cette machine ; droit SUPER manquant signale */
    afficherBoutonsReglages: function (r) {
        var me = this, b = me.down('#appliquerMariadb'), t = me.down('#droitsMariadb'), d = r.droitsMariadb;
        var aFaire = me.mariadbAFaire();
        b.setVisible(!!(r.superAdmin && r.mariadbLocale));
        b.setDisabled(!d || !d.ok || !aFaire.length);
        t.update(!r.superAdmin || !r.mariadbLocale ? '' : d && !d.ok ? '<span class="srv-critique">Droit SUPER manquant</span>'
                : aFaire.length ? aFaire.length + ' réglage(s) à ajuster' : '<span class="srv-ok">Rien à ajuster</span>');
        if (d && !d.ok) {
            me.down('#etatReglages').update('<span class="srv-critique">' + me.esc(d.message) + '</span>');
        }
    },

    mariadbAFaire: function () {
        return Ext.Array.filter(Ext.Object.getValues(this.reglages || {}), function (x) {
            return x.domaine === 'MARIADB' && x.niveau !== 'OK';
        });
    },

    /* confirmation dans le bouton : 1er clic arme (texte et couleur), 2e clic dans les 6 s execute */
    confirmerDansBouton: function (b, texteConfirmation, action) {
        if (!b.arme) {
            b.arme = true;
            b.texteNormal = b.texteNormal || b.getText();
            b.setText(texteConfirmation);
            b.addCls('srv-confirmer');
            b.minuteur = setTimeout(function () {
                if (!b.isDestroyed) {
                    b.arme = false;
                    b.setText(b.texteNormal);
                    b.removeCls('srv-confirmer');
                }
            }, 6000);
            return;
        }
        clearTimeout(b.minuteur);
        b.arme = false;
        b.setText(b.texteNormal);
        b.removeCls('srv-confirmer');
        action();
    },

    ETATS_APPLICATION: {APPLIQUE: ['srv-ok', 'appliqué'], MY_INI: ['srv-ajuster', 'au prochain redémarrage (my.ini)'],
        REFUSE: ['srv-critique', 'refusé'], ECHEC: ['srv-critique', 'échec'], A_FAIRE: ['', 'non appliqué']},

    appliquerMariadb: function (b) {
        var me = this, l = me.mariadbAFaire(), long = Ext.Array.some(l, function (x) {
            return x.cle === 'innodb_buffer_pool_size';
        });
        me.confirmerDansBouton(b, 'Confirmer : ' + l.length + ' réglage(s)' + (long ? ' (tampon InnoDB : plusieurs minutes)' : ''), function () {
            var o = me.down('#ongletReglages');
            o.setLoading('Application des réglages de MariaDB...');
            me.appel('POST', 'reglages/mariadb', {}, function (r) {
                o.setLoading(false);
                if (!r.success) {
                    me.down('#etatReglages').update('<span class="srv-critique">' + me.esc(r.message) + '</span>');
                    return;
                }
                me.chargerReglages(function () {
                    me.down('#etatReglages').update(me.compteRendu('MariaDB, à chaud', r.data, r.redimensionnement));
                });
            });
        });
    },

    compteRendu: function (titre, l, redimensionnement) {
        var me = this, html = '<b>' + me.esc(titre) + ' :</b><ul class="srv-compte-rendu">';
        Ext.each(l || [], function (x) {
            var e = me.ETATS_APPLICATION[x.etat] || ['', x.etat];
            html += '<li><b>' + me.esc(x.libelle || x.cle) + '</b> : ' + me.esc(x.avant) + ' → '
                    + me.esc(x.etat === 'APPLIQUE' ? x.apres : x.conseille) + ' <span class="' + e[0] + '">' + e[1] + '</span>'
                    + (x.refus ? ' : ' + me.esc(x.refus) : '') + (x.message && x.etat !== 'MY_INI' ? ' : ' + me.esc(x.message) : '')
                    + (x.avertissement && x.etat === 'APPLIQUE' ? '<br><i>' + me.esc(x.avertissement) + '</i>' : '') + '</li>';
        });
        return html + '</ul>' + (redimensionnement ? '<i>Tampon InnoDB : ' + me.esc(redimensionnement) + '</i>' : '');
    },

    /* ============================================================================================ lexique */

    ongletLexique: function () {
        var me = this;
        return {
            title: 'Lexique', itemId: 'ongletLexique', iconCls: 'fa fa-book', autoScroll: true, bodyPadding: 10,
            tbar: [{xtype: 'textfield', itemId: 'filtreLexique', emptyText: 'Chercher un terme (ex. tampon, pool, coupure)', width: 360,
                    listeners: {change: {buffer: 250, fn: function () {
                                me.afficherLexique();
                            }}}}],
            items: [{xtype: 'component', itemId: 'lexique', html: ''}]
        };
    },

    afficherLexique: function () {
        var me = this, L = testextjs.view.support.LexiqueServeur, f = (me.down('#filtreLexique').getValue() || '').toLowerCase();
        if (!me.reglages && !me.lexiqueDemande) {
            /* valeurs conseillees POUR CETTE MACHINE : lues une fois dans l'onglet Reglages */
            me.lexiqueDemande = true;
            me.appel('GET', 'reglages', null, function (r) {
                if (r.success) {
                    me.reglages = {};
                    Ext.each(r.data || [], function (x) {
                        me.reglages[x.cle] = x;
                    });
                    me.afficherLexique();
                }
            });
        }
        var html = '<div class="srv-lex-image">' + me.esc(L.IMAGE) + '</div>', groupe = null;
        Ext.each(L.ENTREES, function (e) {
            var texte = (e.terme + ' ' + e.image + ' ' + e.prestige + ' ' + e.conseil + ' ' + e.groupe).toLowerCase();
            if (f && texte.indexOf(f) < 0) {
                return;
            }
            if (e.groupe !== groupe) {
                groupe = e.groupe;
                html += '<h3 class="srv-lex-groupe">' + me.esc(groupe) + '</h3>';
            }
            var r = me.reglages && e.cle ? me.reglages[e.cle] : null, n = r ? me.NIVEAUX[r.niveau] : null;
            html += '<div class="srv-lex">'
                    + '<div class="srv-lex-terme">' + me.esc(e.terme) + (n ? ' <span class="' + n[0] + '">· ' + n[1] + ' ici</span>' : '') + '</div>'
                    + '<div><b>En clair :</b> ' + me.esc(e.image) + '</div>'
                    + '<div><b>Dans Prestige :</b> ' + me.esc(e.prestige) + '</div>'
                    + '<div><b>Valeur conseillée :</b> ' + me.esc(e.conseil)
                    + (r ? ' <span class="srv-lex-ici">Sur cette machine : en place <b>' + me.esc(r.actuel) + '</b>, conseillé <b>' + me.esc(r.conseille) + '</b></span>' : '') + '</div>'
                    + '<div><b>Si c\'est mal réglé :</b> ' + me.esc(e.risque) + '</div>'
                    + '</div>';
        });
        me.down('#lexique').update(html);
    },

    /* Prestige Veille : nouveau jeton, confirme dans le bouton (l'ancien cesse de fonctionner), affiche une seule fois */
    etatJetonVeille: function () {
        var me = this;
        me.appel('GET', 'veille-jeton', null, function (r) {
            var t = me.down('#etatJetonVeille');
            if (t && r.success) {
                t.update(r.configure ? '<span class="srv-ok">renseigné</span>' : '<span class="srv-ajuster">non renseigné</span>');
            }
        });
    },

    genererJetonVeille: function (b) {
        var me = this;
        if (!b.arme) {
            b.arme = true;
            b.setText(me.etatJetonVeilleConfigure() ? 'Confirmer : l\'ancien jeton cessera de fonctionner' : 'Confirmer la création du jeton');
            b.addCls('srv-confirmer');
            b.minuteur = setTimeout(function () {
                if (!b.isDestroyed) {
                    b.arme = false;
                    b.setText('Jeton Prestige Veille');
                    b.removeCls('srv-confirmer');
                }
            }, 6000);
            return;
        }
        clearTimeout(b.minuteur);
        b.arme = false;
        b.setText('Jeton Prestige Veille');
        b.removeCls('srv-confirmer');
        me.appel('POST', 'veille-jeton', {}, function (r) {
            var e = me.down('#etatReglages');
            if (!r.success) {
                e.update('<span class="srv-critique">' + me.esc(r.message) + '</span>');
                return;
            }
            e.update('Jeton de Prestige Veille : <code class="srv-jeton" id="srvJetonVeille">' + me.esc(r.jeton) + '</code> '
                    + '<a href="#" class="srv-copier-jeton">Copier</a><br>À coller dans Prestige Veille &gt; Réglages &gt; « Jeton de veille ». '
                    + 'Il ne sera plus affiché : en cas de perte, en créer un nouveau.');
            var a = e.getEl().down('.srv-copier-jeton');
            a.on('click', function (ev) {
                ev.preventDefault();
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(r.jeton).then(function () {
                        a.update('Copié');
                    }, function () {
                        a.update('Sélectionner le jeton puis Ctrl+C');
                    });
                } else {
                    a.update('Sélectionner le jeton puis Ctrl+C');
                }
            });
            me.etatJetonVeille();
        });
    },

    etatJetonVeilleConfigure: function () {
        var t = this.down('#etatJetonVeille');
        return !!(t && t.getEl() && /renseigné/.test(t.getEl().dom.textContent) && !/non renseigné/.test(t.getEl().dom.textContent));
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
