/* global Ext */

/*
 * STABILITE DU SERVEUR (besoins du 11/10, lot 4), Centre de support, API v1/support/serveur.
 *  - Etat : releve en cours (memoire du serveur Java, fils HTTP, processeur, memoire de la machine, base) et courbes
 *    des dernieres 24 h (releves toutes les 2 minutes) ; derniere cause d'arret brutal ;
 *  - Arrets : demarrages et arrets du serveur, propre ou brutal, avec la cause probable et le conseil ;
 *  - Reglages : reglages en place et conseilles pour la machine (memoire, processeurs, nombre de postes), bloc my.ini et
 *    commandes asadmin a copier. Super administrateur : « Appliquer à chaud » (SET GLOBAL des reglages de MariaDB
 *    modifiables sans redemarrage) et « Écrire dans my.ini » (fichier sauvegarde avant, MariaDB jamais redemarre),
 *    confirmes dans le bouton lui-meme ; « Appliquer et redémarrer Payara » (script asadmin detache, verifie au retour ;
 *    sans mot de passe d'administration ni droit de lancer asadmin, le script reste a copier).
 *  - Postes (demande du 02/11) : reglages de Payara de chaque poste (serveur et caisses secondaires qui ont leur propre
 *    Payara), releves par chacun a son demarrage, avec les alertes d'ensemble (pools au-dela de MariaDB, postes non
 *    declares, plusieurs serveurs, poste sans nouvelles). Lecture seule.
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
        me.items = [me.ongletEtat(), me.ongletExperience(), me.ongletArrets(), me.ongletReglages(), me.ongletPostes(), me.ongletSauvegardes(), me.ongletLexique()];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.chargerEtat();
            me.ongletSecuriteSiActif();
        });
        me.on('tabchange', function (p, t) {
            if (t.itemId === 'ongletEtat') {
                me.chargerEtat();
            } else if (t.itemId === 'ongletArrets') {
                me.chargerArrets();
            } else if (t.itemId === 'ongletReglages') {
                me.chargerReglages();
                me.etatJetonVeille();
            } else if (t.itemId === 'ongletPostes') {
                me.chargerPostes();
            } else if (t.itemId === 'ongletExperience') {
                me.chargerExperience();
            } else if (t.itemId === 'ongletSauvegardes') {
                me.chargerSauvegardes(true);
            } else if (t.itemId === 'ongletLexique') {
                me.afficherLexique();
            } else if (t.itemId === 'ongletSecurite') {
                me.chargerSecurite();
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
            clearTimeout(me.minuteurSauvegarde);
        });
    },

    styles: function () {
        if (document.getElementById('srv-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet(
                '.srv-tuiles{display:flex;flex-wrap:wrap;gap:10px;padding:10px}'
                + '.srv-tuile{flex:1 1 170px;min-width:170px;border:1px solid #d5dbe1;border-radius:8px;background:#fff;padding:8px 10px 8px 48px;position:relative}'
                /* retour du 04/11 (style C) : pastille a gauche au lieu du filet de couleur */
                + '.srv-tuile::before{content:"\\2022";position:absolute;left:10px;top:10px;width:28px;height:28px;border-radius:7px;display:flex;'
                + 'align-items:center;justify-content:center;font-size:18px;font-weight:800;background:#e3edf7;color:#1f5f9e}'
                + '.srv-tuile .t{font-size:11px;color:#5d6d7e;text-transform:uppercase;letter-spacing:.3px}'
                + '.srv-tuile .n{font-size:20px;font-weight:bold;color:#1b2631;margin-top:2px}.srv-tuile .s{font-size:11px;color:#5d6d7e}'
                + '.srv-tuile.alerte::before{content:"!";background:#fdeceb;color:#b42318}.srv-tuile.alerte .n{color:#c0392b}.srv-tuile.attention::before{content:"!";background:#fff2e0;color:#a35400}'
                + '.srv-cause{margin:10px;padding:10px 12px;border-radius:6px;background:#fdecea;color:#7b241c;border:1px solid #f5b7b1}'
                + '.srv-cause.WARN{background:#fff4e0;color:#7a4b00;border-color:#f8c471}'
                + '.srv-ok{color:#1e8449;font-weight:bold}.srv-ajuster{color:#b9770e;font-weight:bold}.srv-critique{color:#c0392b;font-weight:bold}'
                + '.srv-brutal{color:#c0392b;font-weight:bold}.srv-propre{color:#1e8449}.srv-encours{color:#1f6fb2}'
                + '.srv-etat{padding:4px 10px;min-height:22px;color:#34495e}'
                + '.srv-code textarea{font-family:Consolas,monospace !important;font-size:12px !important}'
                + '.srv-lex-image{padding:10px 12px;background:#eaf2f8;border-radius:6px;color:#1b4f72;margin-bottom:6px}'
                + '.srv-lex-groupe{margin:16px 0 6px;color:#1f6fb2;font-size:15px}'
                + '.srv-lex{border:1px solid #d5dbe1;border-radius:8px;background:#fff;padding:10px 12px;margin-bottom:10px;line-height:1.55}'
                + '.srv-lex>div{margin-top:3px}.srv-lex-terme{font-weight:bold;font-size:14px;color:#1b2631}'
                + '.srv-lex-ici{background:#f4f6f8;border-radius:4px;padding:1px 6px;margin-left:6px}'
                + '.srv-confirmer,.srv-confirmer .x-btn-inner{background:#c0392b !important;color:#fff !important}'
                + '.srv-compte-rendu{margin:4px 0 4px 18px;padding:0}.srv-compte-rendu li{margin:2px 0}'
                + '.srv-jeton{font-family:Consolas,monospace;background:#f4f6f8;padding:2px 6px;border-radius:4px;user-select:all}'
                /* cas 4, lot 4.B : onglet Securite */
                + '.srv-sec-alerte{margin:6px 10px;padding:8px 12px;border-radius:6px;background:#fdecea;color:#7a1f14;border:1px solid #f5c2bd;border-left:5px solid #c0392b;font-weight:bold}'
                + '.srv-sec-alerte.ok{background:#e8f5e9;color:#1b5e20;border-color:#a5d6a7;border-left-color:#2e7d32}'
                + '.srv-sec-alerte.warn{background:#fff8e1;color:#8a4b00;border-color:#f0d27a;border-left-color:#e07b18}'
                + '.srv-sec-bloc{border:1px solid #d5dbe1;border-radius:8px;background:#fff;padding:8px 12px 10px;margin:6px 10px}'
                + '.srv-sec-bloc h4{margin:0 0 6px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#1e3a5f}'
                + '.srv-sec-ligne{display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid #eef2f6}.srv-sec-ligne:last-child{border-bottom:none}'
                + '.srv-sec-ligne .lib{width:320px;font-weight:bold}.srv-sec-ligne .small{font-size:11px;color:#5a6b7c}'
                + '.srv-sec-etat{display:inline-block;padding:2px 9px;border-radius:12px;font-size:10.5px;font-weight:800;letter-spacing:.05em;color:#fff;background:#5a6b7c}'
                + '.srv-sec-etat.ok{background:#2e7d32}.srv-sec-etat.ko{background:#c0392b}.srv-sec-etat.warn{background:#e07b18}'
                + '.srv-sec-etapes{list-style:none;padding:0;margin:4px 0 0}.srv-sec-etapes li{padding:3px 0 3px 22px;position:relative}'
                + '.srv-sec-etapes li::before{content:"";position:absolute;left:4px;top:7px;width:10px;height:10px;border-radius:50%;background:#c9d5e1}'
                + '.srv-sec-etapes li.ok::before{background:#2e7d32}.srv-sec-etapes li.ko::before{background:#c0392b}'
                + '.srv-sec-mode .x-btn-pressed,.srv-sec-mode .x-btn-pressed .x-btn-inner{background:#1e3a5f !important;color:#fff !important}', 'srv-styles');
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

    /* ============================================================================================ postes */

    ongletPostes: function () {
        var me = this;
        var mo = function (v) {
            return v > 0 ? (v >= 1024 ? String(Math.round(v / 102.4) / 10).replace('.', ',') + ' Go' : v + ' Mo') : '—';
        };
        return {
            title: 'Postes', itemId: 'ongletPostes', iconCls: 'fa fa-desktop', layout: {type: 'vbox', align: 'stretch'},
            tbar: [{text: 'Actualiser', itemId: 'actualiserPostes', iconCls: 'fa fa-refresh', handler: function () {
                        me.chargerPostes();
                    }}, {xtype: 'tbtext', itemId: 'resumePostes', text: ''}],
            items: [
                {xtype: 'component', itemId: 'alertesPostes', html: '', padding: '4 8'},
                {xtype: 'gridpanel', itemId: 'postesPayara', flex: 3, columnLines: true,
                    store: Ext.create('Ext.data.Store', {fields: ['hote', 'domaine', 'serveur', 'mariadbLocale', 'releve', 'ramMo', 'heapMo', 'processeurs',
                            'pool', 'filsHttp', 'aAjuster', 'critiques', 'reglages', 'courant'], data: []}),
                    listeners: {select: function (g, rec) {
                            var d = me.down('#reglagesPoste');
                            d.setTitle('Réglages de Payara de « ' + me.esc(rec.get('hote')) + ' » (' + me.esc(rec.get('domaine')) + ')');
                            d.getStore().loadData(rec.get('reglages') || []);
                        }},
                    columns: [
                        {text: 'Poste', dataIndex: 'hote', width: 190, renderer: function (v, m, rec) {
                                return me.esc(v) + (rec.get('courant') ? ' <span class="srv-ok">(ce poste)</span>' : '');
                            }},
                        {text: 'Domaine', dataIndex: 'domaine', width: 90},
                        {text: 'Rôle', dataIndex: 'serveur', width: 80, renderer: function (v) {
                                return v ? 'Serveur' : 'Caisse';
                            }},
                        {text: 'Base', dataIndex: 'mariadbLocale', width: 100, renderer: function (v) {
                                return v ? 'sur ce poste' : 'à distance';
                            }},
                        {text: 'Relevé le', dataIndex: 'releve', width: 125, renderer: function (v) {
                                var d = v ? Ext.Date.parse(String(v).substring(0, 16), 'Y-m-d\\TH:i') : null;
                                return d ? Ext.Date.format(d, 'd/m/Y H:i') : '';
                            }},
                        {text: 'Mémoire machine', dataIndex: 'ramMo', width: 120, align: 'right', renderer: mo},
                        {text: 'Mémoire Java', dataIndex: 'heapMo', width: 105, align: 'right', renderer: mo},
                        {text: 'Pool', dataIndex: 'pool', width: 60, align: 'right', renderer: function (v) {
                                return v > 0 ? v : '—';
                            }},
                        {text: 'Fils HTTP', dataIndex: 'filsHttp', width: 75, align: 'right', renderer: function (v) {
                                return v > 0 ? v : '—';
                            }},
                        {text: 'État', dataIndex: 'aAjuster', flex: 1, minWidth: 170, renderer: function (v, m, rec) {
                                var c = rec.get('critiques');
                                if (c) {
                                    return '<span class="srv-critique">' + c + ' critique(s)</span>' + (v > c ? ' · ' + (v - c) + ' à ajuster' : '');
                                }
                                return v ? '<span class="srv-ajuster">' + v + ' à ajuster</span>' : '<span class="srv-ok">Correct</span>';
                            }}
                    ]},
                {xtype: 'gridpanel', itemId: 'reglagesPoste', flex: 2, margin: '6 0 0 0', title: 'Choisissez un poste pour voir ses réglages.', columnLines: true,
                    store: Ext.create('Ext.data.Store', {fields: ['cle', 'libelle', 'actuel', 'conseille', 'niveau'], data: []}),
                    columns: [
                        {text: 'Réglage', dataIndex: 'libelle', flex: 1, minWidth: 260, renderer: function (v, m) {
                                m.style = 'white-space:normal';
                                return me.esc(v);
                            }},
                        {text: 'En place', dataIndex: 'actuel', width: 180},
                        {text: 'Conseillé', dataIndex: 'conseille', width: 160},
                        {text: 'État', dataIndex: 'niveau', width: 90, renderer: function (v) {
                                var n = me.NIVEAUX[v] || ['', v];
                                return '<span class="' + n[0] + '">' + n[1] + '</span>';
                            }}
                    ]},
                {xtype: 'component', padding: '4 8', html: '<span style="color:#666">Chaque Payara (le serveur, et chaque caisse qui a le sien) inscrit ses réglages à son démarrage'
                            + ' et à l\'ouverture de l\'onglet « Réglages conseillés ». Pour régler une caisse, ouvrez cet écran sur la caisse elle-même :'
                            + ' les boutons « Appliquer » ne changent que le Payara qui affiche l\'écran.</span>'}
            ]
        };
    },

    chargerPostes: function () {
        var me = this, o = me.down('#ongletPostes');
        o.setLoading('Lecture des postes...');
        me.appel('GET', 'machines', null, function (r) {
            o.setLoading(false);
            if (!r.success) {
                o.down('#alertesPostes').update('<span class="srv-critique">' + me.esc(r.message) + '</span>');
                return;
            }
            o.down('#postesPayara').getStore().loadData(r.data || []);
            o.down('#reglagesPoste').getStore().loadData([]);
            o.down('#reglagesPoste').setTitle('Choisissez un poste pour voir ses réglages.');
            o.down('#resumePostes').setText(r.total + ' poste(s) relevé(s) pour ' + r.postes + ' déclaré(s)'
                    + (r.maxConnexions > 0 ? ' · MariaDB accepte ' + r.maxConnexions + ' connexions' : '')
                    + ' · Tâches planifiées : ' + (r.tachesIci ? 'lancées sur ce poste'
                            : (r.declareServeur ? 'non lancées ici (caisse configurée en serveur)' : 'lancées par le serveur')));
            o.down('#alertesPostes').update((r.alertes || []).length ? Ext.Array.map(r.alertes, function (a) {
                return '<div class="srv-ajuster">⚠ ' + me.esc(a) + '</div>';
            }).join('') : '<span class="srv-ok">Aucune alerte sur l\'ensemble des postes.</span>');
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
                                {xtype: 'checkbox', itemId: 'avecTampon', boxLabel: 'avec le tampon InnoDB (long)', hidden: true,
                                    tooltip: 'Le tampon InnoDB se redimensionne par morceaux pendant plusieurs minutes : à faire hors des heures de vente.'},
                                {xtype: 'tbtext', itemId: 'droitsMariadb', text: ''},
                                {itemId: 'ecrireMyIni', text: 'Écrire dans my.ini', iconCls: 'fa fa-save', hidden: true,
                                    tooltip: 'Écrit les réglages conseillés dans my.ini (copie de sauvegarde avant) ; MariaDB les prendra à son prochain démarrage.',
                                    handler: function (b) {
                                        me.ecrireMyIni(b);
                                    }},
                                {xtype: 'tbtext', itemId: 'etatMyIni', text: ''}],
                            items: [{xtype: 'textarea', itemId: 'myIni', readOnly: true, cls: 'srv-code'}]},
                        {xtype: 'panel', flex: 1, margin: '0 0 0 8', title: 'Payara : commandes asadmin (dossier bin de Payara)', layout: 'fit', tools: [copier('asadmin')],
                            tbar: [{itemId: 'appliquerPayara', text: 'Appliquer et redémarrer Payara', iconCls: 'fa fa-bolt', hidden: true,
                                    tooltip: 'Lance les commandes ci-dessous puis redémarre Payara (environ une minute d\'interruption pour tous les postes).',
                                    handler: function (b) {
                                        me.appliquerPayara(b);
                                    }},
                                {xtype: 'checkbox', itemId: 'avecMemoireJava', boxLabel: 'avec la mémoire du serveur Java', hidden: true, checked: true,
                                    tooltip: '-Xms et -Xmx : à décocher si la machine manque de mémoire en ce moment.'},
                                {xtype: 'tbtext', itemId: 'etatPayara', text: ''}],
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
        /* le tampon InnoDB se redimensionne pendant plusieurs minutes : seulement si on le demande */
        var tampon = me.down('#avecTampon');
        tampon.setVisible(b.isVisible() && Ext.Array.some(aFaire, function (x) {
            return x.cle === 'innodb_buffer_pool_size';
        }));
        tampon.setValue(false);
        t.update(!r.superAdmin || !r.mariadbLocale ? '' : d && !d.ok ? '<span class="srv-critique">Droit SUPER manquant</span>'
                : aFaire.length ? aFaire.length + ' réglage(s) à ajuster' : '<span class="srv-ok">Rien à ajuster</span>');
        if (d && !d.ok) {
            me.down('#etatReglages').update('<span class="srv-critique">' + me.esc(d.message) + '</span>');
        }
        /* my.ini : refuse si sa structure n'est pas comprise (le bloc reste a copier) */
        var f = r.fichierMyIni, bi = me.down('#ecrireMyIni'), ti = me.down('#etatMyIni');
        bi.setVisible(!!(r.superAdmin && r.mariadbLocale && f));
        bi.setDisabled(!f || !!f.refus || !f.changements);
        bi.setTooltip(f && f.chemin ? me.esc(f.chemin) : '');
        ti.update(!f ? '' : f.refus ? '<span class="srv-critique" title="' + me.esc(f.refus) + '">my.ini non modifiable</span>'
                : f.changements ? f.changements + ' ligne(s) à écrire' : '<span class="srv-ok">my.ini à jour</span>');
        me.fichierMyIni = f;
        /* Payara : bouton si asadmin peut etre lance ; etat de la derniere application (verifiee au retour) */
        var py = r.payara, bp = me.down('#appliquerPayara'), tp = me.down('#etatPayara'), aFairePayara = me.payaraAFaire();
        bp.setVisible(!!(r.superAdmin && py && py.lancement));
        bp.setDisabled(!aFairePayara.length || !!(py && py.enCours && !py.enCours.perime));
        me.down('#avecMemoireJava').setVisible(bp.isVisible() && Ext.Array.some(aFairePayara, function (x) {
            return x.cle === 'Xms';
        }));
        var html = '';
        if (py && py.enCours) {
            html = py.enCours.perime ? '<span class="srv-critique">Lancé le ' + me.esc(py.enCours.lance) + ' : Payara n\'a pas redémarré</span>'
                    : '<span class="srv-ajuster">Lancé le ' + me.esc(py.enCours.lance) + ' : redémarrage attendu</span>';
            if (py.enCours.perime && py.enCours.journal) {
                me.down('#etatReglages').update('<b>Journal du script Payara :</b><pre>' + me.esc(py.enCours.journal) + '</pre>');
            }
        } else if (py && py.dernier) {
            var d = py.dernier;
            html = '<span class="' + (d.pris === d.total ? 'srv-ok' : 'srv-critique') + '">Vérifié le ' + me.esc(d.verifie) + ' : '
                    + d.pris + ' / ' + d.total + ' réglage(s) pris</span>';
            me.dernierPayara = d;
        } else if (r.superAdmin && py && !py.lancement) {
            html = 'asadmin introuvable : script à copier';
        }
        tp.update(html);
    },

    payaraAFaire: function () {
        return Ext.Array.filter(Ext.Object.getValues(this.reglages || {}), function (x) {
            return x.domaine === 'PAYARA' && x.niveau !== 'OK' && /^asadmin /.test(x.ligne || '');
        });
    },

    appliquerPayara: function (b) {
        var me = this, avecMemoire = me.down('#avecMemoireJava').getValue();
        var l = Ext.Array.filter(me.payaraAFaire(), function (x) {
            return avecMemoire || x.cle !== 'Xms';
        });
        if (!l.length) {
            me.down('#etatReglages').update('<span class="srv-ajuster">Seule la mémoire du serveur Java reste à ajuster : cocher « avec la mémoire du serveur Java ».</span>');
            return;
        }
        me.confirmerDansBouton(b, 'Confirmer : ' + l.length + ' réglage(s), Payara redémarre', function () {
            var o = me.down('#ongletReglages');
            o.setLoading('Vérification d\'asadmin puis lancement...');
            me.appel('POST', 'reglages/payara', {cles: Ext.Array.pluck(l, 'cle')}, function (r) {
                o.setLoading(false);
                var e = me.down('#etatReglages');
                if (!r.success) {
                    e.update('<span class="srv-critique">' + me.esc(r.message) + '</span>');
                    if (r.aCopier && r.script) {
                        me.down('#asadmin').setValue(r.script);
                    }
                    return;
                }
                b.setDisabled(true);
                me.down('#etatPayara').update('<span class="srv-ajuster">Redémarrage en cours...</span>');
                e.update('<span class="srv-ajuster">' + me.esc(r.message) + '</span>');
                me.attendreRedemarrage(0, false);
            });
        });
    },

    /* suit le redemarrage : le serveur cesse de repondre puis repond de nouveau (la session est alors perdue) */
    attendreRedemarrage: function (n, tombe) {
        var me = this;
        if (me.isDestroyed || n > 72) {
            return;
        }
        setTimeout(function () {
            Ext.Ajax.request({url: me.URL + 'etat', method: 'GET', timeout: 4000,
                success: function () {
                    if (tombe) {
                        me.down('#etatPayara').update('<span class="srv-ok">Payara a redémarré</span>');
                        me.down('#etatReglages').update('Payara a redémarré : reconnectez-vous puis rouvrez « Réglages conseillés » pour voir la vérification.');
                        return;
                    }
                    me.attendreRedemarrage(n + 1, false);
                },
                failure: function () {
                    me.attendreRedemarrage(n + 1, true);
                }});
        }, 5000);
    },

    ecrireMyIni: function (b) {
        var me = this, f = me.fichierMyIni || {}, tampon = me.down('#avecTampon');
        /* case « avec le tampon InnoDB » decochee : le tampon n'est pas ecrit non plus dans my.ini */
        var cles = Ext.Array.filter(f.cles || [], function (c) {
            return c !== 'innodb_buffer_pool_size' || !tampon.isVisible() || tampon.getValue();
        });
        if (!cles.length) {
            me.down('#etatReglages').update('<span class="srv-ajuster">Seul le tampon InnoDB reste à écrire : cocher « avec le tampon InnoDB ».</span>');
            return;
        }
        me.confirmerDansBouton(b, 'Confirmer : ' + cles.length + ' ligne(s) dans my.ini (sauvegardé avant)', function () {
            var o = me.down('#ongletReglages');
            o.setLoading('Écriture de my.ini...');
            me.appel('POST', 'reglages/myini', {cles: cles}, function (r) {
                o.setLoading(false);
                if (!r.success) {
                    me.down('#etatReglages').update('<span class="srv-critique">' + me.esc(r.message) + '</span>');
                    return;
                }
                me.chargerReglages(function () {
                    me.down('#etatReglages').update(me.compteRendu('my.ini (' + r.chemin + ')', r.data)
                            + (r.sauvegarde ? 'Copie de sauvegarde : ' + me.esc(r.sauvegarde) + '<br>' : '') + '<i>' + me.esc(r.message) + '</i>');
                });
            });
        });
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
        var me = this, avecTampon = me.down('#avecTampon').getValue();
        var l = Ext.Array.filter(me.mariadbAFaire(), function (x) {
            return avecTampon || x.cle !== 'innodb_buffer_pool_size';
        });
        if (!l.length) {
            me.down('#etatReglages').update('<span class="srv-ajuster">Seul le tampon InnoDB reste à ajuster : cocher « avec le tampon InnoDB » pour l\'appliquer.</span>');
            return;
        }
        me.confirmerDansBouton(b, 'Confirmer : ' + l.length + ' réglage(s)' + (avecTampon ? ' (tampon InnoDB : plusieurs minutes)' : ''), function () {
            var o = me.down('#ongletReglages');
            o.setLoading('Application des réglages de MariaDB...');
            me.appel('POST', 'reglages/mariadb', {cles: Ext.Array.pluck(l, 'cle')}, function (r) {
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

    /* ============================================================================================ sauvegardes */

    /* retour du 01/11 : sauvegarde de la base toutes les heures (une heure perdue au plus), copie sur un second dossier,
       conservation, historique ; marche a suivre pour restaurer. */
    ongletSauvegardes: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {fields: [{name: 'id', type: 'int'}, 'debut', 'fin', 'origine', 'statut', 'fichier',
                {name: 'tailleMo', type: 'float'}, {name: 'dureeS', type: 'int'}, 'copie', 'message'], data: []});
        var statuts = {REUSSIE: ['srv-ok', 'Réussie'], ECHEC: ['srv-critique', 'Échec'], EN_COURS: ['srv-encours', 'En cours'], INTERROMPUE: ['srv-critique', 'Interrompue']};
        return {
            title: 'Sauvegardes', itemId: 'ongletSauvegardes', iconCls: 'fa fa-database', layout: {type: 'vbox', align: 'stretch'}, autoScroll: true,
            items: [{xtype: 'component', itemId: 'sauvEtat', cls: 'srv-etat', margin: '6 4'},
                {xtype: 'container', padding: '6 10', layout: {type: 'hbox', align: 'top'}, defaults: {labelAlign: 'top'}, items: [
                        {xtype: 'textfield', itemId: 'sauvDossier', fieldLabel: 'Dossier des sauvegardes', flex: 3, margin: '0 8 0 0'},
                        {xtype: 'textfield', itemId: 'sauvCopie', fieldLabel: 'Copie sur un second dossier (autre disque, conseillé)', flex: 3, margin: '0 8 0 0'},
                        {xtype: 'numberfield', itemId: 'sauvGarderHeures', fieldLabel: 'Toutes gardées (heures)', width: 150, minValue: 1, maxValue: 720, allowDecimals: false, margin: '0 8 0 0'},
                        {xtype: 'numberfield', itemId: 'sauvGarderJours', fieldLabel: 'Puis une par jour (jours)', width: 150, minValue: 0, maxValue: 365, allowDecimals: false, margin: '0 8 0 0'},
                        {xtype: 'checkbox', itemId: 'sauvActive', boxLabel: 'Sauvegarde automatique toutes les heures', margin: '24 8 0 0'}]},
                {xtype: 'toolbar', border: false, items: [
                        {xtype: 'button', itemId: 'btnSauvReglages', text: 'Enregistrer les réglages', iconCls: 'fa fa-save', handler: function () {
                            me.enregistrerSauvegardes();
                        }},
                        {xtype: 'button', itemId: 'btnSauvMaintenant', text: 'Sauvegarder maintenant', iconCls: 'fa fa-download', handler: function () {
                            me.sauvegarderMaintenant();
                        }},
                        {xtype: 'tbtext', itemId: 'sauvMessage', text: ''}]},
                {xtype: 'gridpanel', itemId: 'sauvListe', title: 'Historique', height: 300, margin: '4', columnLines: true, store: store,
                    viewConfig: {emptyText: 'Aucune sauvegarde pour l\'instant.', deferEmptyText: false},
                    columns: [{text: 'Début', dataIndex: 'debut', width: 145},
                        {text: 'Origine', dataIndex: 'origine', width: 105, renderer: function (v) {
                                return v === 'MANUELLE' ? 'Manuelle' : 'Automatique';
                            }},
                        {text: 'Résultat', dataIndex: 'statut', width: 95, renderer: function (v) {
                                var s = statuts[v] || ['', v];
                                return '<span class="' + s[0] + '">' + me.esc(s[1]) + '</span>';
                            }},
                        {text: 'Taille (Mo)', dataIndex: 'tailleMo', width: 90, align: 'right'},
                        {text: 'Durée', dataIndex: 'dureeS', width: 80, align: 'right', renderer: function (v, m, r) {
                                return r.get('statut') === 'EN_COURS' ? '' : (v >= 60 ? Math.floor(v / 60) + ' min ' : '') + (v % 60) + ' s';
                            }},
                        {text: 'Copie', dataIndex: 'copie', width: 70, renderer: function (v) {
                                return v === 'OK' ? '<span class="srv-ok">Faite</span>' : v === 'ECHEC' ? '<span class="srv-critique">Échec</span>' : '';
                            }},
                        {text: 'Fichier', dataIndex: 'fichier', width: 290, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Message', dataIndex: 'message', flex: 1, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Stock', width: 95, sortable: false, renderer: function (v, m, r) {
                                return r.get('statut') === 'REUSSIE' ? '<a href="#" class="sauv-valoriser">Valoriser</a>' : '';
                            }}],
                    listeners: {cellclick: function (g, td, i, r, tr, l, e) {
                            if (e.getTarget('.sauv-valoriser')) {
                                e.preventDefault();
                                me.valoriserSauvegarde(r);
                            }
                        }}},
                me.panneauValorisation(),
                {xtype: 'component', itemId: 'sauvRestaurer', margin: '6 10 10 10', html: ''}]
        };
    },

    /* retour du 02/11 : valorisation du stock d'une sauvegarde, sans restaurer la base sur un autre poste */
    panneauValorisation: function () {
        var me = this, montant = function (v) {
            return me.nombre(v);
        };
        var store = Ext.create('Ext.data.Store', {fields: ['code', 'libelle', {name: 'qteRayon', type: 'int'}, {name: 'achatRayon', type: 'int'},
                {name: 'venteRayon', type: 'int'}, {name: 'qteReserve', type: 'int'}, {name: 'achatReserve', type: 'int'}, {name: 'venteReserve', type: 'int'}], data: []});
        var choisir = function () {
            me.afficherValorisation();
        };
        return {xtype: 'panel', itemId: 'sauvValo', title: 'Valorisation du stock de la sauvegarde', margin: '4', hidden: true, layout: {type: 'vbox', align: 'stretch'},
            tbar: [{xtype: 'combobox', itemId: 'sauvValoPar', fieldLabel: 'Par', labelWidth: 30, width: 170, editable: false, queryMode: 'local', value: 1,
                    store: [[1, 'Famille'], [2, 'Rayon'], [3, 'Grossiste']], listeners: {change: choisir}},
                {xtype: 'combobox', itemId: 'sauvValoEmplacement', fieldLabel: 'Emplacement', labelWidth: 85, width: 320, editable: false, queryMode: 'local',
                    hidden: true, displayField: 'nom', valueField: 'id', store: Ext.create('Ext.data.Store', {fields: ['id', 'nom'], data: []}), listeners: {change: choisir}},
                '->', {xtype: 'button', itemId: 'btnSauvValoExport', text: 'Exporter (Excel)', iconCls: 'fa fa-file-excel-o', disabled: true, handler: function () {
                        var a = document.createElement('a');
                        a.href = '../api/v1/support/sauvegardes/valorisation-excel?id=' + me.valorisation.id;
                        a.download = 'valorisation-sauvegarde-' + me.valorisation.id + '.xlsx';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }}],
            items: [{xtype: 'component', itemId: 'sauvValoEntete', cls: 'srv-etat', margin: '4 6'},
                {xtype: 'gridpanel', itemId: 'sauvValoListe', height: 320, columnLines: true, store: store,
                    columns: [{text: 'Code', dataIndex: 'code', width: 110, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Libellé', dataIndex: 'libelle', flex: 1, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Qté rayon', dataIndex: 'qteRayon', width: 90, align: 'right', renderer: montant},
                        {text: 'Achat rayon', dataIndex: 'achatRayon', width: 120, align: 'right', renderer: montant},
                        {text: 'Vente rayon', dataIndex: 'venteRayon', width: 120, align: 'right', renderer: montant},
                        {text: 'Qté réserve', dataIndex: 'qteReserve', width: 95, align: 'right', renderer: montant},
                        {text: 'Achat réserve', dataIndex: 'achatReserve', width: 120, align: 'right', renderer: montant},
                        {text: 'Vente réserve', dataIndex: 'venteReserve', width: 120, align: 'right', renderer: montant}]}]};
    },

    valoriserSauvegarde: function (r) {
        var me = this, o = me.down('#ongletSauvegardes'), p = o.down('#sauvValo'), e = o.down('#sauvValoEntete');
        if (me.valorisationEnCours) {
            return;
        }
        me.valorisationEnCours = true;
        me.valorisation = null;
        p.show();
        p.down('#sauvValoListe').getStore().removeAll();
        p.down('#btnSauvValoExport').disable();
        e.update('<span class="srv-encours">Valorisation de la sauvegarde du ' + me.esc(r.get('debut').substring(0, 16)) + ' en cours : lecture du fichier, une à deux minutes…</span>');
        Ext.Ajax.request({url: '../api/v1/support/sauvegardes/valoriser', method: 'POST', jsonData: {id: r.get('id')}, timeout: 900000,
            success: function (rep) {
                me.valorisationEnCours = false;
                var v = Ext.decode(rep.responseText, true) || {success: false, message: 'Réponse illisible.'};
                if (me.isDestroyed) {
                    return;
                }
                if (!v.success) {
                    e.update('<span class="srv-critique">' + me.esc(v.message) + '</span>');
                    return;
                }
                me.valorisation = v;
                var c = p.down('#sauvValoEmplacement');
                c.getStore().loadData(v.emplacements);
                c.setVisible(v.emplacements.length > 1);
                c.suspendEvents();
                c.setValue(v.emplacements.length ? v.emplacements[0].id : null);
                c.resumeEvents();
                p.down('#btnSauvValoExport').enable();
                me.afficherValorisation();
            },
            failure: function (rep) {
                me.valorisationEnCours = false;
                if (!me.isDestroyed) {
                    e.update('<span class="srv-critique">' + (rep.status === 401 ? 'Session expirée.' : 'Le serveur ne répond pas.') + '</span>');
                }
            }});
    },

    afficherValorisation: function () {
        var me = this, o = me.down('#ongletSauvegardes'), p = o.down('#sauvValo'), v = me.valorisation;
        if (!v) {
            return;
        }
        var emp = p.down('#sauvValoEmplacement').getValue(), mode = p.down('#sauvValoPar').getValue(), e = v.emplacements[0] || null;
        Ext.each(v.emplacements, function (x) {
            if (x.id === emp) {
                e = x;
            }
        });
        var lignes = e ? e.modes[String(mode)] : [], t = {achatRayon: 0, venteRayon: 0, achatReserve: 0, venteReserve: 0};
        Ext.each(lignes, function (l) {
            Ext.Object.each(t, function (k) {
                t[k] += l[k];
            });
        });
        p.down('#sauvValoListe').getStore().loadData(lignes);
        p.down('#sauvValoEntete').update('Valorisation du stock de la sauvegarde du <b>' + me.esc(v.debut) + '</b>' + (e ? ' · ' + me.esc(e.nom) : '')
                + ' · calculée en ' + v.dureeS + ' s<br>Achat : rayon <b>' + me.nombre(t.achatRayon) + '</b> + réserve <b>' + me.nombre(t.achatReserve)
                + '</b> = <b>' + me.nombre(t.achatRayon + t.achatReserve) + '</b> · Vente : rayon <b>' + me.nombre(t.venteRayon) + '</b> + réserve <b>'
                + me.nombre(t.venteReserve) + '</b> = <b>' + me.nombre(t.venteRayon + t.venteReserve) + '</b>');
    },

    chargerSauvegardes: function (reglages) {
        var me = this, o = me.down('#ongletSauvegardes');
        clearTimeout(me.minuteurSauvegarde);
        me.appel('GET', '../sauvegardes/etat', null, function (r) {
            if (me.isDestroyed || !o) {
                return;
            }
            var e = o.down('#sauvEtat');
            if (!r.success) {
                e.update('<span class="srv-critique">' + me.esc(r.message) + '</span>');
                return;
            }
            if (reglages) {
                o.down('#sauvDossier').setValue(r.dossier);
                o.down('#sauvCopie').setValue(r.copie);
                o.down('#sauvGarderHeures').setValue(r.garderHeures);
                o.down('#sauvGarderJours').setValue(r.garderJours);
                o.down('#sauvActive').setValue(r.active);
            }
            var ch = r.chiffrement || {};
            e.update((r.enCours ? '<span class="srv-encours">Sauvegarde en cours depuis ' + me.esc(r.enCoursDepuis.substring(11)) + '…</span><br>' : '')
                    + 'Dernière sauvegarde réussie : ' + (r.derniereReussie ? '<b>' + me.esc(r.derniereReussie) + '</b>' : '<span class="srv-critique">aucune</span>')
                    + (r.active ? '' : ' · <span class="srv-ajuster">sauvegarde automatique coupée</span>')
                    + '<br>Outil de sauvegarde : ' + (r.outil ? me.esc(r.outil) : '<span class="srv-critique">introuvable (mariadb-dump)</span>')
                    + ' · Espace libre : ' + (r.espaceLibreMo === null ? '—' : me.nombre(r.espaceLibreMo) + ' Mo')
                    + '<br>Archives : ' + (ch.actif ? '<span class="srv-ok">chiffrées (AES, clé des archives du pharmacien)</span>'
                    : ch.securite ? '<span class="srv-critique">NON chiffrées : clé absente (' + me.esc(ch.fichierCle) + ', 7-cle-archive.ps1 -Creer)</span>' : 'en clair (sécurité de la base inactive)'));
            o.down('#sauvListe').getStore().loadData(r.liste);
            var dernier = '';
            Ext.each(r.liste, function (l) {
                if (!dernier && l.statut === 'REUSSIE') {
                    dernier = l.fichier;
                }
            });
            var chiffre = /\.aes$/.test(dernier || '') || (!dernier && ch.actif);
            var base = me.esc(r.base), f = me.esc(dernier || 'prestige_' + r.base + '_AAAAMMJJ_HHMM.sql.gz' + (chiffre ? '.aes' : '')), gz = f.replace(/\.aes$/, ''), sql = gz.replace(/\.gz$/, '');
            o.down('#sauvRestaurer').update('<div class="srv-lex"><div class="srv-lex-terme">Restaurer une sauvegarde</div>'
                    + '<div>1. Arrêter Prestige (Payara) sur le serveur : plus aucune vente pendant la restauration.</div>'
                    + (chiffre ? '<div>2. Déchiffrer avec la clé des archives (gardée par le pharmacien) : <code class="srv-jeton">powershell -File outils\\officine\\7-cle-archive.ps1 -Dechiffrer ' + f + '</code>, puis décompresser ' + gz + ' (7-Zip : clic droit &gt; Extraire ici).</div>'
                        : '<div>2. Décompresser le fichier ' + f + ' (7-Zip : clic droit &gt; Extraire ici).</div>')
                    + '<div>3. Dans une invite de commandes, dossier <code>bin</code> de MariaDB, recréer la base puis la recharger :<br>'
                    + '<code class="srv-jeton">mariadb -u root -p -e "DROP DATABASE ' + base + '; CREATE DATABASE ' + base + ' CHARACTER SET utf8mb4"</code><br>'
                    + '<code class="srv-jeton">mariadb -u root -p --default-character-set=utf8mb4 ' + base + ' &lt; ' + sql + '</code></div>'
                    + '<div>4. Redémarrer Prestige. Les opérations faites après l\'heure de la sauvegarde sont à ressaisir.</div>'
                    + '<div>Mesuré le 01/11/2026 : une base de 6,7 Go se recharge en 4 min 30 environ.</div></div>');
            if (r.enCours) {
                me.minuteurSauvegarde = setTimeout(function () {
                    if (!me.isDestroyed && me.getActiveTab() && me.getActiveTab().itemId === 'ongletSauvegardes') {
                        me.chargerSauvegardes(false);
                    }
                }, 3000);
            }
        });
    },

    enregistrerSauvegardes: function () {
        var me = this, o = me.down('#ongletSauvegardes'), m = o.down('#sauvMessage');
        me.appel('POST', '../sauvegardes/reglages', {dossier: o.down('#sauvDossier').getValue(), copie: o.down('#sauvCopie').getValue(),
            active: o.down('#sauvActive').getValue(), garderHeures: o.down('#sauvGarderHeures').getValue(), garderJours: o.down('#sauvGarderJours').getValue()}, function (r) {
            m.setText('<span class="' + (r.success ? 'srv-ok' : 'srv-critique') + '">' + me.esc(r.message) + '</span>');
            if (r.success) {
                me.chargerSauvegardes(true);
            }
        });
    },

    sauvegarderMaintenant: function () {
        var me = this, o = me.down('#ongletSauvegardes'), m = o.down('#sauvMessage');
        me.appel('POST', '../sauvegardes/maintenant', {}, function (r) {
            m.setText('<span class="' + (r.success ? 'srv-ok' : 'srv-critique') + '">' + me.esc(r.message) + '</span>');
            me.chargerSauvegardes(false);
        });
    },

    /* ============================================================================================ securite (cas 4, lot 4.B) */

    /* l'onglet « Sécurité » n'existe que pour le super administrateur et quand KEY_SECURITE_BASE vaut 1 */
    ongletSecuriteSiActif: function () {
        var me = this;
        me.appel('GET', 'securite/etat', null, function (r) {
            if (me.isDestroyed || !r.success || !r.actif || me.down('#ongletSecurite')) {
                return;
            }
            me.insert(me.items.indexOf(me.down('#ongletLexique')), me.ongletSecurite());
            me.etatSecurite = r;
            me.afficherSecurite(r);
        });
    },

    ongletSecurite: function () {
        var me = this;
        var journal = Ext.create('Ext.data.Store', {fields: ['date', 'login', 'action', 'resultat', 'detail'], data: []});
        var actions = {ROTATION: 'Rotation du mot de passe de la base', ALIAS: 'Alias Payara posé sur le pool', PURGE_COPIES: 'Purge des copies de domain.xml',
            CLE_ARCHIVE: 'Clé des archives de sauvegarde (script 7)', ESSAI_RESTAURATION: 'Essai de restauration (script 6)'};
        var resultats = {OK: ['ok', 'OK'], ECHEC: ['ko', 'Échec'], RETOUR_ARRIERE: ['warn', 'Retour arrière'], REFUSE: ['ko', 'Refusé']};
        var mdp = function (itemId, label, largeur) {
            return {xtype: 'textfield', itemId: itemId, inputType: 'password', fieldLabel: label, labelAlign: 'top', width: largeur || 230, margin: '0 10 0 0',
                autoComplete: false, inputAttrTpl: 'autocomplete="new-password"'};
        };
        return {
            title: 'Sécurité', itemId: 'ongletSecurite', iconCls: 'fa fa-shield', layout: {type: 'vbox', align: 'stretch'}, autoScroll: true,
            items: [{xtype: 'component', itemId: 'secAlerte', html: ''},
                {xtype: 'container', layout: {type: 'hbox', align: 'stretch'}, items: [
                        {xtype: 'component', itemId: 'secStockage', flex: 1, html: ''},
                        {xtype: 'component', itemId: 'secRotationEtat', flex: 1, html: ''}]},
                /* actions : la re-saisie du mot de passe de session vaut pour chacune (Q4.1) ; confirmation dans le bouton */
                {xtype: 'panel', cls: 'srv-sec-bloc', itemId: 'secActions', title: 'Actions', bodyPadding: '4 0 0 0', border: false,
                    items: [{xtype: 'container', layout: {type: 'hbox', align: 'bottom'}, items: [
                                mdp('secMdpSession', 'Votre mot de passe Prestige (second facteur, pour chaque action)', 330),
                                {xtype: 'button', itemId: 'btnSecRotation', text: 'Changer le mot de passe de la base…', iconCls: 'fa fa-key', margin: '0 8 0 0', handler: function () {
                                        var f = me.down('#secFormulaire');
                                        f.setVisible(!f.isVisible());
                                        if (f.isVisible()) {
                                            me.down('#secModeGenerer').toggle(true);
                                        }
                                    }},
                                {xtype: 'button', itemId: 'btnSecAlias', text: 'Protéger le mot de passe du pool (alias Payara)', iconCls: 'fa fa-lock', margin: '0 8 0 0', handler: function (b) {
                                        me.confirmerDansBouton(b, 'Confirmer : poser l\'alias (coupure ≈ 10 s)', function () {
                                            me.actionSecurite('alias', {}, 'Pose de l\'alias Payara…');
                                        });
                                    }},
                                {xtype: 'button', itemId: 'btnSecPurger', text: 'Purger les copies de domain.xml', iconCls: 'fa fa-trash', margin: '0 8 0 0', handler: function (b) {
                                        me.confirmerDansBouton(b, 'Confirmer la suppression des copies', function () {
                                            me.actionSecurite('purger-copies', {}, 'Purge des copies…');
                                        });
                                    }}]},
                        {xtype: 'component', itemId: 'secMessage', cls: 'srv-etat', html: ''},
                        {xtype: 'component', padding: '2 10 4 10', html: '<span class="small" style="color:#5a6b7c">Actions réservées au super administrateur, journalisées (qui, quand, quoi : jamais la valeur) ; chacune se confirme dans son bouton. '
                                    + 'La rotation est recommandée à chaque départ d\'un employé et tous les 6 mois.</span>'}]},
                /* vue 2 : rotation en un bouton */
                {xtype: 'panel', cls: 'srv-sec-bloc', itemId: 'secFormulaire', title: 'Changer le mot de passe de la base', hidden: true, border: false, bodyPadding: '4 0 0 0',
                    items: [{xtype: 'container', layout: {type: 'hbox', align: 'top'}, items: [
                                {xtype: 'fieldset', title: '1. Compte d\'administration MariaDB (pour cette opération, jamais conservé)', flex: 1, margin: '0 8 0 0', layout: {type: 'hbox', align: 'bottom'},
                                    items: [{xtype: 'textfield', itemId: 'secCompteRotation', fieldLabel: 'Utilisateur MariaDB', labelAlign: 'top', value: 'root', width: 200, margin: '0 10 0 0'},
                                        mdp('secMdpRotation', 'Son mot de passe')]},
                                {xtype: 'fieldset', title: '2. Nouveau mot de passe de la base', flex: 1, layout: {type: 'vbox', align: 'left'},
                                    items: [{xtype: 'container', cls: 'srv-sec-mode', layout: 'hbox', items: [
                                                {xtype: 'button', itemId: 'secModeGenerer', text: 'Générer (recommandé)', enableToggle: true, toggleGroup: 'secMode', allowDepress: false, pressed: true, margin: '0 6 6 0',
                                                    toggleHandler: function (b, p) {
                                                        if (p) {
                                                            me.modeSecurite('GENERER');
                                                        }
                                                    }},
                                                {xtype: 'button', itemId: 'secModeSaisir', text: 'Saisir moi-même', enableToggle: true, toggleGroup: 'secMode', allowDepress: false, margin: '0 0 6 0',
                                                    toggleHandler: function (b, p) {
                                                        if (p) {
                                                            me.modeSecurite('SAISIR');
                                                        }
                                                    }}]},
                                        {xtype: 'component', itemId: 'secModeTexte', html: ''},
                                        {xtype: 'container', itemId: 'secSaisie', hidden: true, layout: {type: 'hbox', align: 'bottom'}, items: [
                                                Ext.apply(mdp('secNouveau', 'Nouveau mot de passe'), {enableKeyEvents: true, checkChangeBuffer: 50, listeners: {keyup: function () {
                                                            me.forceSecurite();
                                                        }, change: function () {
                                                            me.forceSecurite();
                                                        }}}),
                                                Ext.apply(mdp('secConfirmation', 'Confirmer'), {enableKeyEvents: true, checkChangeBuffer: 50, listeners: {keyup: function () {
                                                            me.forceSecurite();
                                                        }, change: function () {
                                                            me.forceSecurite();
                                                        }}}),
                                                {xtype: 'component', itemId: 'secForce', html: '', margin: '0 0 6 0'}]}]}]},
                        {xtype: 'component', itemId: 'secEtapes', html: ''},
                        {xtype: 'toolbar', border: false, items: [
                                {xtype: 'button', itemId: 'btnSecLancer', text: 'Lancer la rotation', iconCls: 'fa fa-refresh', handler: function (b) {
                                        me.confirmerDansBouton(b, 'Confirmer : changer le mot de passe maintenant (coupure ≈ 10 s)', function () {
                                            me.lancerRotation();
                                        });
                                    }},
                                {xtype: 'button', itemId: 'btnSecAnnuler', text: 'Annuler', handler: function () {
                                        me.viderRotation();
                                        me.down('#secFormulaire').hide();
                                    }},
                                {xtype: 'tbtext', itemId: 'secRotationMessage', text: ''}]}]},
                {xtype: 'gridpanel', itemId: 'secJournal', title: 'Journal des actions de sécurité', height: 220, margin: '6 10 10 10', columnLines: true, store: journal,
                    viewConfig: {emptyText: 'Aucune action pour l\'instant.', deferEmptyText: false},
                    columns: [{text: 'Date', dataIndex: 'date', width: 140},
                        {text: 'Qui', dataIndex: 'login', width: 120, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Action', dataIndex: 'action', width: 250, renderer: function (v) {
                                return me.esc(actions[v] || v);
                            }},
                        {text: 'Résultat', dataIndex: 'resultat', width: 120, renderer: function (v) {
                                var s = resultats[v] || ['', v];
                                return '<span class="srv-sec-etat ' + s[0] + '">' + me.esc(s[1]) + '</span>';
                            }},
                        {text: 'Détail', dataIndex: 'detail', flex: 1, renderer: function (v) {
                                return me.esc(v);
                            }}]}]
        };
    },

    chargerSecurite: function () {
        var me = this;
        me.appel('GET', 'securite/etat', null, function (r) {
            if (me.isDestroyed || !me.down('#ongletSecurite')) {
                return;
            }
            if (!r.success) {
                me.down('#secAlerte').update('<div class="srv-sec-alerte">' + me.esc(r.message) + '</div>');
                return;
            }
            me.etatSecurite = r;
            me.afficherSecurite(r);
        });
    },

    /* vues 1 et 3 : ou vit le mot de passe, sous quelle forme, derniere rotation ; jamais une valeur */
    afficherSecurite: function (r) {
        var me = this, o = me.down('#ongletSecurite');
        if (!o) {
            return;
        }
        var etat = function (cls, t) {
            return '<span class="srv-sec-etat ' + cls + '">' + me.esc(t) + '</span>';
        };
        var ligne = function (lib, badge, small) {
            return '<div class="srv-sec-ligne"><span class="lib">' + lib + '</span>' + badge + (small ? '<span class="small">' + small + '</span>' : '') + '</div>';
        };
        var p = r.pool || {}, c = r.copies || {}, s = r.sauvegarde || {}, a = r.archives || {};
        var clair = (p.forme === 'CLAIR' ? 1 : 0) + (c.enClair || 0);
        /* lot 4.C : archives chiffrees et essai de restauration mensuel obligatoire */
        var alerteArchives = (a.clePresente ? '' : '<div class="srv-sec-alerte">⚠ Archives de sauvegarde NON chiffrées : clé absente (' + me.esc(a.fichierCle) + ') · sur le serveur : <code>7-cle-archive.ps1 -Creer</code>, la clé reste chez le pharmacien.</div>')
                + (a.rappelEssai ? '<div class="srv-sec-alerte warn">Essai de restauration obligatoire chaque mois : ' + (a.dernierEssai ? 'dernier le ' + me.esc(a.dernierEssai) + ' (' + me.esc(a.dernierEssaiResultat || '') + '), plus d\'un mois' : 'jamais fait')
                        + ' · sur le serveur : <code>6-essai-restauration.ps1</code> avec la clé gardée hors du serveur.</div>' : '');
        var alerte = clair > 0 ? '<div class="srv-sec-alerte">⚠ Le mot de passe de la base est lisible en clair à ' + clair + ' endroit(s) sur ce serveur'
                + (r.rappel ? ' · Dernière rotation : ' + (r.derniereRotation ? me.esc(r.derniereRotation) + ' (plus de ' + r.rappelMois + ' mois : rotation recommandée)' : 'jamais') : '') + '.</div>'
                : r.rappel ? '<div class="srv-sec-alerte warn">Aucune copie en clair · Dernière rotation : ' + (r.derniereRotation ? me.esc(r.derniereRotation) + ' (plus de ' + r.rappelMois + ' mois : rotation recommandée)' : 'jamais') + '.</div>'
                : '<div class="srv-sec-alerte ok">✔ Aucune copie en clair du mot de passe de la base sur ce serveur · Dernière rotation : ' + me.esc(r.derniereRotation) + '.</div>';
        o.down('#secAlerte').update(alerte + alerteArchives);
        o.down('#secStockage').update('<div class="srv-sec-bloc"><h4>Où est stocké le mot de passe de la base</h4>'
                + ligne('Pool Payara <code>' + me.esc(p.nom) + '</code> (domain.xml)', p.forme === 'ALIAS' ? etat('ok', 'ALIAS PAYARA') : p.forme === 'CLAIR' ? etat('ko', 'EN CLAIR') : etat('', 'INCONNU'),
                        p.forme === 'ALIAS' ? 'alias ' + me.esc(p.alias) + ' · compte ' + me.esc(p.utilisateur) : p.forme === 'CLAIR' ? 'protection possible : alias Payara · compte ' + me.esc(p.utilisateur) : 'pool non décrit')
                + ligne('Anciens écrans (JSP, éditions)', etat('ok', 'POOL JNDI'), 'plus d\'URL JDBC avec le mot de passe')
                + ligne('Sauvegarde intégrée (toutes les heures)', s.present && s.chiffre ? etat('ok', 'COMPTE DÉDIÉ, FICHIER CHIFFRÉ') : s.present ? etat('warn', 'COMPTE DÉDIÉ, FICHIER EN CLAIR') : etat('ko', 'FICHIER ABSENT'),
                        me.esc(s.fichier) + (s.present ? '' : ' : lancez 2-configurer-mariadb.ps1 -CreerCompte'))
                + ligne('Archives de sauvegarde (<code>.sql.gz</code> de Prestige, <code>.sql.zst</code> et journaux des scripts)', a.clePresente ? etat('ok', 'CHIFFRÉES (AES)') : etat('ko', 'NON CHIFFRÉES'),
                        a.clePresente ? 'clé posée' + (a.cleDate ? ' le ' + me.esc(a.cleDate) : '') + ', gardée hors du serveur par le pharmacien' + (a.derniereArchive ? ' · dernière sauvegarde intégrée : ' + me.esc(a.derniereArchive) + (a.derniereArchiveChiffree ? ' (chiffrée)' : ' (en clair)') : '')
                            : 'clé absente : ' + me.esc(a.fichierCle) + ' · 7-cle-archive.ps1 -Creer')
                + ligne('Dernier essai de restauration (obligatoire chaque mois)', a.dernierEssai ? etat(a.dernierEssaiResultat === 'CONFORME' ? 'ok' : 'ko', me.esc(a.dernierEssai) + ' — ' + me.esc(a.dernierEssaiResultat || '')) : etat('ko', 'JAMAIS FAIT'),
                        a.rappelEssai ? 'à faire maintenant : 6-essai-restauration.ps1 sur le serveur, clé saisie' : 'prochain au plus tard : ' + me.esc(a.prochainEssai))
                + ligne('Copies <code>domain.xml.avant-prestige-*</code>', c.nombre ? etat(c.enClair ? 'ko' : 'warn', c.nombre + ' FICHIER(S)' + (c.enClair ? ', ' + c.enClair + ' EN CLAIR' : '')) : etat('ok', 'AUCUNE'),
                        c.nombre ? 'contiennent l\'ancien mot de passe : à purger après rotation' : me.esc(c.dossier))
                + ligne('Master password de Payara (protège l\'alias)', etat('warn', 'À CHANGER SUR LE SERVEUR'), 'par le pharmacien : <code class="srv-jeton">' + me.esc(r.masterPasswordCommande) + '</code>')
                + '</div>');
        o.down('#secRotationEtat').update('<div class="srv-sec-bloc"><h4>Rotation du mot de passe</h4>'
                + ligne('Dernière rotation', r.derniereRotation ? etat('', me.esc(r.derniereRotation) + (r.derniereRotationPar ? ' — par ' + me.esc(r.derniereRotationPar) : '')) : etat('ko', 'JAMAIS'),
                        r.prochaine ? 'prochaine recommandée : ' + me.esc(r.prochaine) : 'recommandée dès maintenant')
                + ligne('Politique (Q4.6)', etat('', 'À CHAQUE DÉPART + TOUS LES 6 MOIS'), '')
                + ligne('Lancement d\'asadmin depuis Prestige', r.asadmin ? etat('ok', 'POSSIBLE') : etat('ko', 'IMPOSSIBLE'), r.asadmin ? 'rotation et alias depuis cet écran' : 'cet écran ne peut agir que sur le serveur Payara')
                + '</div>');
        var bA = o.down('#btnSecAlias'), bP = o.down('#btnSecPurger');
        bA.setDisabled(p.forme !== 'CLAIR' || !r.asadmin);
        bP.setText(c.nombre ? 'Purger les ' + c.nombre + ' copie(s) de domain.xml' : 'Purger les copies de domain.xml');
        bP.setDisabled(!c.nombre);
        o.down('#btnSecRotation').setDisabled(!r.asadmin);
        o.down('#secJournal').getStore().loadData(r.journal || []);
    },

    modeSecurite: function (mode) {
        var me = this, o = me.down('#ongletSecurite');
        me.modeRotation = mode;
        o.down('#secSaisie').setVisible(mode === 'SAISIR');
        o.down('#secModeTexte').update('<span class="small" style="color:#5a6b7c">' + (mode === 'GENERER'
                ? 'Le serveur tire un mot de passe fort de 24 caractères, jamais affiché ni renvoyé : personne ne le connaît.'
                : '12 caractères minimum, lettres + chiffres + un symbole parmi <code>#*+-./:;=@[]_~</code> ; ni espace, ni &amp; ? \' " % ! ^ | &lt; &gt; ( ) $ { } \\. Transmis une seule fois, jamais journalisé ni renvoyé ; champs vidés après validation.') + '</span>');
        me.afficherEtapesSecurite(null);
    },

    /* controle de force cote ecran (meme regle que le serveur, qui tranche) */
    forceSecurite: function () {
        var me = this, o = me.down('#ongletSecurite'), v = o.down('#secNouveau').getValue() || '', c = o.down('#secConfirmation').getValue() || '', m = '';
        if (v.length < 12) {
            m = ['ko', 'TROP COURT'];
        } else if (!/^[A-Za-z0-9#*+\-./:;=@\[\]_~]+$/.test(v)) {
            m = ['ko', 'CARACTÈRE NON ADMIS'];
        } else if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v) || !/[#*+\-./:;=@\[\]_~]/.test(v)) {
            m = ['warn', 'LETTRES + CHIFFRES + SYMBOLE'];
        } else if (c !== v) {
            m = ['warn', 'CONFIRMATION DIFFÉRENTE'];
        } else {
            m = ['ok', 'FORT'];
        }
        o.down('#secForce').update('<span class="srv-sec-etat ' + m[0] + '">' + m[1] + '</span>');
    },

    afficherEtapesSecurite: function (r) {
        var me = this, o = me.down('#ongletSecurite'), h = '<div class="srv-sec-bloc"><h4>Ce qui sera fait, dans l\'ordre</h4><ul class="srv-sec-etapes">';
        if (!r) {
            var p = (me.etatSecurite || {}).pool || {};
            h += '<li>Vérifier asadmin et la connexion du compte d\'administration (rien n\'est changé avant)</li>'
                    + '<li>' + (me.modeRotation === 'SAISIR' ? 'Prendre le mot de passe saisi' : 'Tirer un mot de passe fort de 24 caractères') + ' — jamais affiché</li>'
                    + '<li><code>ALTER USER \'' + me.esc(p.utilisateur) + '\'@… IDENTIFIED BY …</code></li>'
                    + '<li>Mettre à jour le pool Payara (' + (p.forme === 'ALIAS' ? 'alias ' + me.esc(p.alias) : 'propriété du pool, en clair tant que l\'alias n\'est pas posé') + ') et le redémarrer</li>'
                    + '<li>Tester la nouvelle connexion ; <b>sinon revenir à l\'ancien mot de passe</b></li>'
                    + '<li>Noter la rotation dans le journal (sans la valeur)</li>';
        } else {
            Ext.each(r.etapes || [], function (e) {
                h += '<li class="' + (/refus|échec|inconnu|non rétabli|toujours/i.test(e) ? 'ko' : 'ok') + '">' + me.esc(e) + '</li>';
            });
        }
        o.down('#secEtapes').update(h + '</ul></div>');
    },

    viderRotation: function () {
        var o = this.down('#ongletSecurite');
        Ext.each(['secMdpRotation', 'secNouveau', 'secConfirmation'], function (id) {
            o.down('#' + id).setValue('');
        });
        o.down('#secForce').update('');
    },

    lancerRotation: function () {
        var me = this, o = me.down('#ongletSecurite'), m = o.down('#secRotationMessage'), b = o.down('#btnSecLancer');
        var corps = {motDePasseSession: o.down('#secMdpSession').getValue(), compteRotation: o.down('#secCompteRotation').getValue(),
            motDePasseRotation: o.down('#secMdpRotation').getValue(), mode: me.modeRotation || 'GENERER'};
        if (me.modeRotation === 'SAISIR') {
            corps.nouveauMotDePasse = o.down('#secNouveau').getValue();
            corps.confirmation = o.down('#secConfirmation').getValue();
        }
        if (!corps.motDePasseSession) {
            m.setText('<span class="srv-critique">Saisissez votre mot de passe Prestige (second facteur).</span>');
            return;
        }
        if (!corps.compteRotation || !corps.motDePasseRotation) {
            m.setText('<span class="srv-critique">Compte d\'administration MariaDB et son mot de passe sont obligatoires.</span>');
            return;
        }
        b.disable();
        m.setText('<span class="srv-encours">Rotation en cours : ALTER USER, pool Payara, test de connexion…</span>');
        Ext.Ajax.request({url: me.URL + 'securite/rotation', method: 'POST', jsonData: corps, timeout: 600000,
            success: function (rep) {
                corps = null;
                var r = Ext.decode(rep.responseText, true) || {success: false, message: 'Réponse illisible.'};
                if (me.isDestroyed) {
                    return;
                }
                b.enable();
                /* les champs sont vides apres validation, quel que soit le resultat */
                me.viderRotation();
                m.setText('<span class="' + (r.success ? 'srv-ok' : r.incoherent ? 'srv-critique' : 'srv-ajuster') + '">' + me.esc(r.message) + '</span>');
                if (r.etapes) {
                    me.afficherEtapesSecurite(r);
                }
                if (r.success) {
                    o.down('#secMdpSession').setValue('');
                }
                if (r.redemarrage) {
                    me.redemarrageSecurite();
                } else {
                    me.chargerSecurite();
                }
            },
            failure: function (rep) {
                corps = null;
                if (!me.isDestroyed) {
                    b.enable();
                    me.viderRotation();
                    m.setText('<span class="srv-critique">' + (rep.status === 401 ? 'Session expirée.' : 'Le serveur ne répond pas.') + '</span>');
                }
            }});
    },

    /* Payara redemarre (rotation ou alias reussis) : plus aucune action possible ici, l'utilisateur se reconnecte */
    redemarrageSecurite: function () {
        var me = this, o = me.down('#ongletSecurite');
        Ext.each(['btnSecRotation', 'btnSecAlias', 'btnSecPurger', 'btnSecLancer'], function (id) {
            var b = o.down('#' + id);
            if (b) {
                b.disable();
            }
        });
        o.down('#secAlerte').update('<div class="srv-sec-alerte warn">Payara redémarre (environ une minute) pour reprendre le nouveau réglage du pool :'
                + ' reconnectez-vous ensuite et rouvrez cet onglet pour voir l\'état à jour.</div>');
    },

    actionSecurite: function (chemin, corps, enCours) {
        var me = this, o = me.down('#ongletSecurite'), m = o.down('#secMessage');
        corps.motDePasseSession = o.down('#secMdpSession').getValue();
        if (!corps.motDePasseSession) {
            m.update('<span class="srv-critique">Saisissez votre mot de passe Prestige (second facteur).</span>');
            return;
        }
        m.update('<span class="srv-encours">' + me.esc(enCours) + '</span>');
        Ext.Ajax.request({url: me.URL + 'securite/' + chemin, method: 'POST', jsonData: corps, timeout: 600000,
            success: function (rep) {
                var r = Ext.decode(rep.responseText, true) || {success: false, message: 'Réponse illisible.'};
                if (me.isDestroyed) {
                    return;
                }
                var etapes = '';
                Ext.each(r.etapes || [], function (e) {
                    etapes += '<li>' + me.esc(e) + '</li>';
                });
                m.update('<span class="' + (r.success ? 'srv-ok' : r.incoherent ? 'srv-critique' : 'srv-ajuster') + '">' + me.esc(r.message) + '</span>'
                        + (etapes ? '<ul class="srv-compte-rendu">' + etapes + '</ul>' : ''));
                if (r.success) {
                    o.down('#secMdpSession').setValue('');
                }
                if (r.redemarrage) {
                    me.redemarrageSecurite();
                } else {
                    me.chargerSecurite();
                }
            },
            failure: function (rep) {
                if (!me.isDestroyed) {
                    m.update('<span class="srv-critique">' + (rep.status === 401 ? 'Session expirée.' : 'Le serveur ne répond pas.') + '</span>');
                }
            }});
    },

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
