/* global Ext */

/*
 * AUDIT & RAPPROCHEMENTS (besoins du 11/10, point 6). Onglet Analyse, en lecture seule (API v1/audit/analyse) :
 * une tuile par controle (vert : concorde ; rouge : ecarts), le detail de la tuile choisie dessous, sans fenetre.
 * L'analyse affichee a l'ouverture n'est pas conservee ; « Lancer l'analyse » la conserve dans les rapports.
 * Onglet Rapports : rapports conserves, relecture (dans l'onglet Analyse), comparaison de deux rapports (ecarts
 * apparus, disparus, persistants), PDF et Excel.
 * Onglet Regularisations : corrections d'historique et caisses oubliees, appliquees une par une apres validation
 * (droit P_AUDIT_REGULARISER, commentaire obligatoire, journal) ; les autres ecarts renvoient a leur ecran habituel.
 */
Ext.define('testextjs.view.audit.AuditRapprochements', {
    extend: 'Ext.tab.Panel',
    xtype: 'auditrapprochements',
    id: 'auditrapprochementsID',
    title: 'Audit & rapprochements',
    frame: true,
    width: '98%',
    height: 680,
    cls: 'auditrapprochements',

    /* colonnes du detail, par section : [champ, titre, largeur, nombre] */
    COLONNES: {
        STOCK: [['cip', 'CIP', 90], ['libelle', 'Produit', 0], ['emplacement', 'Emplacement', 150], ['stockReel', 'Stock réel', 90, 1],
            ['stockHistorique', 'Stock historique', 110, 1], ['ecart', 'Écart', 80, 1], ['dernierMouvement', 'Dernier mouvement', 130]],
        STOCK_NEGATIF: [['cip', 'CIP', 90], ['libelle', 'Produit', 0], ['emplacement', 'Emplacement', 150], ['stockReel', 'Stock', 90, 1]],
        CAISSES_OUVERTES: [['caissier', 'Caissier', 0], ['ouverture', 'Ouverte le', 140], ['jours', 'Jours', 80, 1]],
        BILLETAGE: [['caissier', 'Caissier', 0], ['ouverture', 'Ouverture', 130], ['fermeture', 'Fermeture', 130], ['attendu', 'Attendu', 110, 1],
            ['billetage', 'Billetage', 110, 1], ['ecart', 'Écart', 100, 1]],
        DIFFERES: [['client', 'Client', 0], ['ventes', 'Ventes différées', 120, 1], ['reglements', 'Règlements', 110, 1],
            ['soldeReleve', 'Solde du relevé', 120, 1], ['resteDu', 'Reste dû enregistré', 140, 1], ['ecart', 'Écart', 100, 1]],
        CARNETS: [['depot', 'Dépôt', 0], ['solde', 'Solde du carnet', 120, 1], ['ventes', 'Ventes', 110, 1], ['reglements', 'Règlements', 110, 1],
            ['retours', 'Retours', 100, 1], ['soldeCalcule', 'Solde calculé', 120, 1], ['ecart', 'Écart', 100, 1]],
        CONTROLES: [['module', 'Module', 110], ['libelle', 'Contrôle', 0], ['cas', 'Cas', 80, 1], ['erreur', 'Remarque', 200]]
    },

    initComponent: function () {
        var me = this;
        me.styles();
        me.items = [me.ongletAnalyse(), me.ongletRapports(), me.ongletRegularisations()];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.lancer(false);
        });
        me.on('tabchange', function (p, t) {
            if (t.itemId === 'ongletRapports') {
                me.chargerRapports();
            } else if (t.itemId === 'ongletRegularisations') {
                me.chargerRegularisations();
            }
        });
    },

    esc: function (v) {
        return Ext.String.htmlEncode(v === null || v === undefined ? '' : String(v));
    },

    nombre: function (v) {
        var n = Math.round(Number(v || 0));
        return (n < 0 ? '−' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    },

    styles: function () {
        if (document.getElementById('audit-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet(
                '.audit-tuiles{display:flex;flex-wrap:wrap;gap:10px;padding:10px}'
                + '.audit-tuile{flex:1 1 200px;min-width:200px;max-width:320px;border-radius:8px;padding:10px 12px;cursor:pointer;'
                + 'border:1px solid #d5dbe1;border-left:6px solid #1e8449;background:#fff;transition:box-shadow .15s,transform .15s}'
                + '.audit-tuile:hover{box-shadow:0 2px 8px rgba(0,0,0,.15);transform:translateY(-1px)}'
                + '.audit-tuile.ecart{border-left-color:#c0392b}.audit-tuile.erreur{border-left-color:#e67e22}'
                + '.audit-tuile.choisie{outline:2px solid #1f6fb2}'
                + '.audit-tuile .t{font-weight:bold;color:#2c3e50;margin-bottom:4px}'
                + '.audit-tuile .n{font-size:22px;font-weight:bold;color:#1e8449}.audit-tuile.ecart .n{color:#c0392b}'
                + '.audit-tuile .m{color:#555;font-size:12px}'
                + '.audit-explication{padding:6px 10px;color:#444;background:#f4f6f8;border-radius:6px;margin:0 10px}'
                + '.audit-bandeau{padding:6px 10px;margin:8px 10px 0;border-radius:6px;background:#fff4e0;color:#7a4b00}'
                + '.audit-bandeau a{color:#1f6fb2;cursor:pointer;text-decoration:underline;margin-left:8px}'
                + '.audit-comp{padding:8px 10px}.audit-comp table{border-collapse:collapse;width:100%;margin-bottom:10px}'
                + '.audit-comp th,.audit-comp td{border:1px solid #d5dbe1;padding:4px 8px;text-align:left;vertical-align:top}'
                + '.audit-comp th{background:#1f3a5f;color:#fff}.audit-comp .plus{color:#c0392b}.audit-comp .moins{color:#1e8449}'
                + '.audit-comp ul{margin:2px 0 2px 18px;padding:0}'
                + '.audit-renvois{padding:4px 10px}.audit-renvoi{display:flex;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid #eef1f4}'
                + '.audit-renvoi .n{min-width:60px;text-align:right;font-weight:bold;color:#c0392b}'
                + '.audit-renvoi a{color:#1f6fb2;cursor:pointer;text-decoration:underline;white-space:nowrap}'
                + '.audit-titre{font-weight:bold;color:#1f3a5f;padding:8px 10px 2px}',
                'audit-styles');
    },

    ongletAnalyse: function () {
        var me = this;
        var debut = Ext.Date.getFirstDateOfMonth(new Date());
        return {
            xtype: 'panel', title: 'Analyse', itemId: 'ongletAnalyse', layout: {type: 'vbox', align: 'stretch'},
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'debut', fieldLabel: 'Billetage du', labelWidth: 80, width: 200,
                            format: 'd/m/Y', submitFormat: 'Y-m-d', value: debut},
                        {xtype: 'datefield', itemId: 'fin', fieldLabel: 'au', labelWidth: 25, width: 145,
                            format: 'd/m/Y', submitFormat: 'Y-m-d', value: new Date()},
                        {xtype: 'button', itemId: 'lancer', text: 'Lancer l\'analyse', iconCls: 'searchicon',
                            tooltip: 'Relance tous les contrôles et conserve le résultat dans les rapports',
                            handler: function () {
                                me.lancer(true);
                            }},
                        '->',
                        {xtype: 'tbtext', itemId: 'resume', text: ''}
                    ]
                }],
            items: [
                {xtype: 'component', itemId: 'bandeau', html: '', hidden: true},
                {xtype: 'component', itemId: 'tuiles', html: '', autoScroll: true},
                {xtype: 'component', itemId: 'explication', html: '', margin: '0 0 6 0'},
                {xtype: 'container', itemId: 'detail', flex: 1, layout: 'fit', margin: '0 10 10 10'}
            ]
        };
    },

    /* conserver : true pour « Lancer l'analyse » (rapport enregistre), false a l'ouverture */
    lancer: function (conserver) {
        var me = this, a = me.down('#ongletAnalyse');
        var d = a.down('#debut').getValue(), f = a.down('#fin').getValue();
        if (!d || !f) {
            return;
        }
        a.setLoading('Analyse en cours…');
        var periode = '?dtStart=' + Ext.Date.format(d, 'Y-m-d') + '&dtEnd=' + Ext.Date.format(f, 'Y-m-d');
        Ext.Ajax.request({
            url: (conserver ? '../api/v1/audit/rapports' : '../api/v1/audit/analyse') + periode,
            method: conserver ? 'POST' : 'GET',
            success: function (response) {
                a.setLoading(false);
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    me.afficherMessage(r.msg || 'Analyse refusée.');
                    return;
                }
                me.resultat = r;
                a.down('#bandeau').hide();
                me.afficherTuiles(r);
                if (r.rapportId) {
                    a.down('#resume').setText((r.sectionsEnEcart ? r.sectionsEnEcart + ' contrôle(s) en écart' : 'Tout concorde')
                            + ' — rapport conservé');
                    me.rapportsAJour = false;
                }
            },
            failure: function () {
                a.setLoading(false);
                me.afficherMessage('Le serveur n\'a pas répondu.');
            }
        });
    },

    afficherMessage: function (texte) {
        var a = this.down('#ongletAnalyse');
        a.down('#tuiles').update('<div class="audit-explication" style="margin:10px">' + this.esc(texte) + '</div>');
    },

    afficherTuiles: function (r) {
        var me = this, a = me.down('#ongletAnalyse'), html = '<div class="audit-tuiles">';
        Ext.each(r.sections || [], function (s) {
            var cls = s.erreur ? 'erreur' : (s.nb > 0 ? 'ecart' : ''), m = '';
            if (s.erreur) {
                m = me.esc(s.erreur);
            } else if (s.nb === 0) {
                m = 'Concorde';
            } else if (s.montant) {
                m = me.nombre(s.montant) + ' F d\'écart';
            } else if (s.quantite) {
                m = me.nombre(s.quantite) + ' unités d\'écart';
            } else {
                m = 'À contrôler';
            }
            html += '<div class="audit-tuile ' + cls + '" data-code="' + me.esc(s.code) + '" title="' + me.esc(s.explication) + '">'
                    + '<div class="t">' + me.esc(s.titre) + '</div><div class="n">' + me.nombre(s.nb) + '</div>'
                    + '<div class="m">' + m + '</div></div>';
        });
        a.down('#tuiles').update(html + '</div>');
        a.down('#resume').setText(r.sectionsEnEcart ? r.sectionsEnEcart + ' contrôle(s) en écart' : 'Tout concorde');
        Ext.each(a.down('#tuiles').getEl().query('.audit-tuile'), function (el) {
            Ext.get(el).on('click', function () {
                me.choisir(el.getAttribute('data-code'));
            });
        });
        var premier = Ext.Array.findBy(r.sections || [], function (s) {
            return s.nb > 0;
        }) || (r.sections || [])[0];
        if (premier) {
            me.choisir(premier.code);
        }
    },

    /* tous les champs des lignes (identifiants compris, utiles aux regularisations), pas seulement les colonnes */
    champs: function (lignes, cols) {
        var vus = {};
        Ext.each(cols, function (c) {
            vus[c[0]] = true;
        });
        Ext.each(lignes, function (l) {
            Ext.Object.each(l, function (k) {
                vus[k] = true;
            });
        });
        return Ext.Object.getKeys(vus);
    },

    choisir: function (code) {
        var me = this, a = me.down('#ongletAnalyse');
        var s = Ext.Array.findBy(me.resultat.sections || [], function (x) {
            return x.code === code;
        });
        if (!s) {
            return;
        }
        me.sectionChoisie = code;
        Ext.each(a.down('#tuiles').getEl().query('.audit-tuile'), function (el) {
            Ext.get(el)[el.getAttribute('data-code') === code ? 'addCls' : 'removeCls']('choisie');
        });
        var plus = (s.lignes || []).length < s.nb && code !== 'CONTROLES' ? ' (' + s.lignes.length + ' premières lignes sur ' + me.nombre(s.nb) + ')' : '';
        a.down('#explication').update('<div class="audit-explication"><b>' + me.esc(s.titre) + '</b> : ' + me.esc(s.explication || '') + plus + '</div>');
        var cols = me.COLONNES[code] || [];
        var colonnes = Ext.Array.map(cols, function (c) {
            var col = {text: c[1], dataIndex: c[0], sortable: true, renderer: function (v) {
                    return c[3] ? me.nombre(v) : me.esc(v);
                }};
            if (c[2]) {
                col.width = c[2];
            } else {
                col.flex = 1;
            }
            if (c[3]) {
                col.align = 'right';
            }
            return col;
        });
        var detail = a.down('#detail');
        detail.removeAll();
        detail.add({
            xtype: 'grid', itemId: 'grilleDetail', columns: colonnes,
            store: Ext.create('Ext.data.Store', {fields: me.champs(s.lignes || [], cols), data: s.lignes || []}),
            viewConfig: {emptyText: '<div style="padding:10px;color:#1e8449">Aucun écart : les deux sources concordent.</div>', deferEmptyText: false}
        });
    },

    /* ------------------------------------------------------------------ onglet Rapports */

    ongletRapports: function () {
        var me = this;
        var nb = function (code, titre) {
            return {text: titre, width: 96, align: 'right', sortable: false, renderer: function (v, m, rec) {
                    var n = (rec.get('resume') || {})[code];
                    if (n === undefined) {
                        return '';
                    }
                    m.style = n > 0 ? 'color:#c0392b;font-weight:bold' : 'color:#1e8449';
                    return me.nombre(n);
                }};
        };
        return {
            xtype: 'panel', title: 'Rapports', itemId: 'ongletRapports', layout: {type: 'vbox', align: 'stretch'},
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'button', itemId: 'voir', text: 'Voir le rapport', disabled: true, handler: function () {
                                me.voirRapport();
                            }},
                        {xtype: 'button', itemId: 'comparer', text: 'Comparer les 2 rapports cochés', disabled: true, handler: function () {
                                me.comparer();
                            }},
                        '-',
                        {xtype: 'button', itemId: 'pdf', text: 'PDF', iconCls: 'printable', disabled: true, handler: function () {
                                me.edition('pdf');
                            }},
                        {xtype: 'button', itemId: 'excel', text: 'Excel', disabled: true, handler: function () {
                                me.edition('excel');
                            }},
                        '->', {xtype: 'tbtext', text: 'Cochez un rapport pour le voir ou l\'imprimer, deux pour les comparer'}
                    ]
                }],
            items: [{
                    xtype: 'grid', itemId: 'grilleRapports', flex: 1, margin: '0 10 6 10',
                    selModel: Ext.create('Ext.selection.CheckboxModel', {mode: 'SIMPLE'}),
                    store: Ext.create('Ext.data.Store', {fields: ['id', 'date', 'auteur', 'periode', 'sectionsEnEcart', 'resume'], data: []}),
                    columns: [
                        {text: 'Date', dataIndex: 'date', width: 130},
                        {text: 'Auteur', dataIndex: 'auteur', width: 150, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Période du billetage', dataIndex: 'periode', flex: 1},
                        {text: 'En écart', dataIndex: 'sectionsEnEcart', width: 75, align: 'right'},
                        nb('STOCK', 'Stock'), nb('STOCK_NEGATIF', 'Négatifs'), nb('CAISSES_OUVERTES', 'Caisses'),
                        nb('BILLETAGE', 'Billetage'), nb('DIFFERES', 'Différés'), nb('CARNETS', 'Carnets'), nb('CONTROLES', 'Contrôles')
                    ],
                    viewConfig: {emptyText: '<div style="padding:10px">Aucun rapport : « Lancer l\'analyse » en conserve un.</div>', deferEmptyText: false},
                    listeners: {
                        selectionchange: function (sm, sel) {
                            var t = me.down('#ongletRapports');
                            t.down('#voir').setDisabled(sel.length !== 1);
                            t.down('#pdf').setDisabled(sel.length !== 1);
                            t.down('#excel').setDisabled(sel.length !== 1);
                            t.down('#comparer').setDisabled(sel.length !== 2);
                        },
                        itemdblclick: function (g, rec) {
                            me.voirRapport(rec.get('id'));
                        }
                    }
                }, {
                    xtype: 'component', itemId: 'comparaison', flex: 1, autoScroll: true, html: ''
                }]
        };
    },

    chargerRapports: function () {
        var me = this, t = me.down('#ongletRapports');
        Ext.Ajax.request({
            url: '../api/v1/audit/rapports', method: 'GET',
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    t.down('#comparaison').update('<div class="audit-explication" style="margin:10px">' + me.esc(r.msg) + '</div>');
                    return;
                }
                t.down('#grilleRapports').getStore().loadData(r.data || []);
            }
        });
    },

    selection: function () {
        return this.down('#ongletRapports #grilleRapports').getSelectionModel().getSelection();
    },

    voirRapport: function (id) {
        var me = this, sel = me.selection();
        id = id || (sel.length ? sel[0].get('id') : null);
        if (!id) {
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/audit/rapports/' + encodeURIComponent(id), method: 'GET',
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    return;
                }
                var a = me.down('#ongletAnalyse');
                me.setActiveTab(a);
                me.resultat = r;
                me.afficherTuiles(r);
                a.down('#bandeau').update('<div class="audit-bandeau">Rapport conservé du <b>' + me.esc(r.date) + '</b>'
                        + (r.auteur ? ' par ' + me.esc(r.auteur) : '') + ' : ce n\'est pas la situation actuelle.'
                        + '<a class="audit-retour">Revenir à l\'analyse du jour</a></div>');
                a.down('#bandeau').show();
                Ext.get(a.down('#bandeau').getEl().query('.audit-retour')[0]).on('click', function () {
                    me.lancer(false);
                });
            }
        });
    },

    comparer: function () {
        var me = this, sel = me.selection(), t = me.down('#ongletRapports');
        if (sel.length !== 2) {
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/audit/rapports/comparer', method: 'GET',
            params: {a: sel[0].get('id'), b: sel[1].get('id')},
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    t.down('#comparaison').update('<div class="audit-explication" style="margin:10px">' + me.esc(r.msg) + '</div>');
                    return;
                }
                t.down('#comparaison').update(me.htmlComparaison(r));
            }
        });
    },

    htmlComparaison: function (r) {
        var me = this, liste = function (l, cls) {
            if (!l.length) {
                return '<span style="color:#888">—</span>';
            }
            var h = '<ul class="' + cls + '">';
            Ext.each(l.slice(0, 50), function (x) {
                h += '<li>' + me.esc(x) + '</li>';
            });
            return h + (l.length > 50 ? '<li>… et ' + (l.length - 50) + ' autre(s)</li>' : '') + '</ul>';
        };
        var h = '<div class="audit-comp"><div class="audit-explication" style="margin:0 0 8px">Du rapport du <b>' + me.esc(r.a)
                + '</b> au rapport du <b>' + me.esc(r.b) + '</b></div><table><tr><th>Contrôle</th><th>Avant</th><th>Après</th>'
                + '<th>Persistants</th><th>Nouveaux écarts</th><th>Écarts résolus</th></tr>';
        Ext.each(r.sections || [], function (s) {
            h += '<tr><td><b>' + me.esc(s.titre) + '</b>' + (s.complet ? '' : '<br><i style="color:#888">sur les premières lignes conservées</i>')
                    + '</td><td>' + me.nombre(s.nbA) + '</td><td>' + me.nombre(s.nbB) + '</td><td>' + me.nombre(s.persistants)
                    + '</td><td>' + liste(s.apparus, 'plus') + '</td><td>' + liste(s.disparus, 'moins') + '</td></tr>';
        });
        return h + '</table></div>';
    },

    edition: function (format) {
        var sel = this.selection();
        if (sel.length !== 1) {
            return;
        }
        /* ouverte dans le clic : un onglet du navigateur, jamais une fenetre bloquee */
        window.open('../api/v1/audit/rapports/' + encodeURIComponent(sel[0].get('id')) + '/' + format, '_blank');
    },

    /* ------------------------------------------------------------------ onglet Regularisations */

    /* ecarts corriges dans leur ecran habituel : [ecran (xtype du menu), titre de l'ecran] */
    RENVOIS: {
        STOCK: ['ajustementmanager', 'Ajustement du stock'],
        STOCK_NEGATIF: ['ajustementmanager', 'Ajustement du stock'],
        BILLETAGE: ['gestcaissemanager', 'Gestion caisse'],
        DIFFERES: ['delayed', 'Gestion des différés'],
        CARNETS: ['reglementdepot', 'Gestion carnet dépôt'],
        CONTROLES: ['supportdiagnostic', 'Diagnostic & bugs']
    },

    ongletRegularisations: function () {
        var me = this;
        return {
            xtype: 'panel', title: 'Régularisations', itemId: 'ongletRegularisations', layout: {type: 'vbox', align: 'stretch'}, autoScroll: false,
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'textfield', itemId: 'commentaire', fieldLabel: 'Commentaire', labelWidth: 85, width: 420, maxLength: 1000,
                            emptyText: 'Obligatoire : motif de la régularisation'},
                        {xtype: 'numberfield', itemId: 'montant', fieldLabel: 'Montant compté', labelWidth: 105, width: 230, minValue: 0,
                            hideTrigger: true, disabled: true, emptyText: 'caisse seulement'},
                        {xtype: 'button', itemId: 'valider', text: 'Valider la sélection', disabled: true, handler: function () {
                                me.valider();
                            }},
                        '->', {xtype: 'tbtext', itemId: 'etat', text: ''}
                    ]
                }],
            items: [
                {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, items: [
                        {xtype: 'component', html: '<div class="audit-titre">À appliquer après validation</div>'},
                        {xtype: 'combobox', itemId: 'filtreType', margin: '6 0 0 16', width: 360, editable: false, queryMode: 'local',
                            displayField: 't', valueField: 'v', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['v', 't'], data: [{v: '', t: 'Toutes les régularisations'}]}),
                            listeners: {change: function (c, v) {
                                    var st = me.down('#ongletRegularisations #grilleRegul').getStore();
                                    st.clearFilter();
                                    if (v) {
                                        st.filter('type', v);
                                    }
                                }}}
                    ]},
                {xtype: 'grid', itemId: 'grilleRegul', flex: 3, margin: '0 10 4 10',
                    selModel: Ext.create('Ext.selection.CheckboxModel', {mode: 'SIMPLE'}),
                    store: Ext.create('Ext.data.Store', {fields: ['type', 'typeLibelle', 'cle', 'objet', 'lignes', 'montantRequis', 'effet'], data: []}),
                    columns: [
                        {text: 'Régularisation', dataIndex: 'typeLibelle', width: 330, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Objet', dataIndex: 'objet', flex: 1, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Lignes', dataIndex: 'lignes', width: 70, align: 'right'},
                        {text: 'Ce qui sera fait', dataIndex: 'effet', flex: 1, renderer: function (v, m) {
                                m.tdAttr = 'data-qtip="' + me.esc(v) + '"';
                                return me.esc(v);
                            }}
                    ],
                    viewConfig: {emptyText: '<div style="padding:10px;color:#1e8449">Aucune régularisation à appliquer.</div>', deferEmptyText: false},
                    listeners: {selectionchange: function () {
                            me.majBoutons();
                        }}},
                {xtype: 'component', html: '<div class="audit-titre">À corriger dans l\'écran habituel</div>'},
                {xtype: 'component', itemId: 'renvois', html: '', autoScroll: true, maxHeight: 170},
                {xtype: 'component', html: '<div class="audit-titre">Journal des régularisations</div>'},
                {xtype: 'grid', itemId: 'grilleJournal', flex: 2, margin: '0 10 10 10',
                    store: Ext.create('Ext.data.Store', {fields: ['date', 'auteur', 'type', 'objet', 'lignes', 'montant', 'commentaire'], data: []}),
                    columns: [
                        {text: 'Date', dataIndex: 'date', width: 120},
                        {text: 'Validée par', dataIndex: 'auteur', width: 140, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Régularisation', dataIndex: 'type', width: 300, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Objet', dataIndex: 'objet', flex: 1, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Lignes', dataIndex: 'lignes', width: 65, align: 'right'},
                        {text: 'Montant', dataIndex: 'montant', width: 90, align: 'right', renderer: function (v) {
                                return v === '' || v === null ? '' : me.nombre(v);
                            }},
                        {text: 'Commentaire', dataIndex: 'commentaire', flex: 1, renderer: function (v) {
                                return me.esc(v);
                            }}
                    ],
                    viewConfig: {emptyText: '<div style="padding:10px">Aucune régularisation n\'a encore été appliquée.</div>', deferEmptyText: false}}
            ]
        };
    },

    chargerRegularisations: function () {
        var me = this, t = me.down('#ongletRegularisations');
        Ext.Ajax.request({
            url: '../api/v1/audit/regularisations', method: 'GET',
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    t.down('#etat').setText(me.esc(r.msg));
                    return;
                }
                me.peutValider = !!r.peutValider;
                var types = [{v: '', t: 'Toutes les régularisations'}], vus = {};
                Ext.each(r.data || [], function (x) {
                    vus[x.type] = vus[x.type] || {v: x.type, t: x.typeLibelle, n: 0};
                    vus[x.type].n++;
                });
                Ext.Object.each(vus, function (k, x) {
                    types.push({v: x.v, t: x.t + ' (' + x.n + ')'});
                });
                var filtre = t.down('#filtreType'), garde = filtre.getValue();
                filtre.getStore().loadData(types);
                var st = t.down('#grilleRegul').getStore();
                st.clearFilter(true);
                st.loadData(r.data || []);
                filtre.setValue(vus[garde] ? garde : '');
                if (vus[garde]) {
                    st.filter('type', garde);
                }
                t.down('#etat').setText(me.peutValider ? (r.data || []).length + ' régularisation(s) proposée(s)'
                        : 'Consultation seule : la validation demande le droit « Valider les régularisations »');
                me.majBoutons();
            }
        });
        Ext.Ajax.request({
            url: '../api/v1/audit/regularisations/journal', method: 'GET',
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                t.down('#grilleJournal').getStore().loadData(r.data || []);
            }
        });
        me.afficherRenvois();
    },

    afficherRenvois: function () {
        var me = this, t = me.down('#ongletRegularisations'), h = '<div class="audit-renvois">', n = 0;
        Ext.each((me.resultat || {}).sections || [], function (s) {
            var r = me.RENVOIS[s.code];
            if (!r || !(s.nb > 0)) {
                return;
            }
            n++;
            h += '<div class="audit-renvoi"><span class="n">' + me.nombre(s.nb) + '</span><span style="flex:1">' + me.esc(s.titre)
                    + '</span><a data-ecran="' + r[0] + '" data-titre="' + me.esc(r[1]) + '">Ouvrir « ' + me.esc(r[1]) + ' »</a></div>';
        });
        t.down('#renvois').update(n ? h + '</div>' : '<div class="audit-renvois" style="color:#1e8449">Aucun écart à corriger ailleurs dans la dernière analyse.</div>');
        Ext.each(t.down('#renvois').getEl().query('a[data-ecran]'), function (a) {
            Ext.get(a).on('click', function () {
                testextjs.app.getController('App').onLoadNewComponent(a.getAttribute('data-ecran'), a.getAttribute('data-titre'), '');
            });
        });
    },

    majBoutons: function () {
        var me = this, t = me.down('#ongletRegularisations');
        var sel = t.down('#grilleRegul').getSelectionModel().getSelection();
        var caisses = Ext.Array.filter(sel, function (r) {
            return r.get('montantRequis');
        });
        /* une caisse se ferme seule, avec son montant compte */
        var caisseSeule = sel.length === 1 && caisses.length === 1;
        t.down('#montant').setDisabled(!caisseSeule);
        t.down('#valider').setDisabled(!me.peutValider || sel.length === 0 || (caisses.length > 0 && !caisseSeule));
        if (caisses.length > 0 && !caisseSeule) {
            t.down('#etat').setText('Une caisse se ferme seule : décochez les autres lignes');
        }
    },

    valider: function () {
        var me = this, t = me.down('#ongletRegularisations');
        var sel = t.down('#grilleRegul').getSelectionModel().getSelection();
        var commentaire = Ext.String.trim(t.down('#commentaire').getValue() || '');
        if (commentaire.length < 3) {
            t.down('#etat').setText('<span style="color:#c0392b">Le commentaire est obligatoire.</span>');
            t.down('#commentaire').focus();
            return;
        }
        var montant = t.down('#montant').getValue();
        if (sel.length === 1 && sel[0].get('montantRequis') && (montant === null || montant === undefined || montant === '')) {
            t.down('#etat').setText('<span style="color:#c0392b">Indiquez le montant compté dans la caisse.</span>');
            t.down('#montant').focus();
            return;
        }
        var restant = sel.slice(), faites = 0, refus = [];
        t.setLoading('Application…');
        var suivante = function () {
            var r = restant.shift();
            if (!r) {
                t.setLoading(false);
                t.down('#etat').setText(faites + ' régularisation(s) appliquée(s)' + (refus.length ? ' ; refusée(s) : ' + me.esc(refus.join(' ; ')) : ''));
                t.down('#commentaire').setValue('');
                t.down('#montant').setValue(null);
                me.chargerRegularisations();
                return;
            }
            Ext.Ajax.request({
                url: '../api/v1/audit/regularisations/appliquer', method: 'POST',
                jsonData: {type: r.get('type'), cle: r.get('cle'), commentaire: commentaire,
                    montant: r.get('montantRequis') ? montant : null},
                success: function (response) {
                    var x = Ext.JSON.decode(response.responseText, true) || {};
                    if (x.success) {
                        faites++;
                    } else {
                        refus.push(r.get('objet') + ' : ' + (x.msg || 'refusée'));
                    }
                    suivante();
                },
                failure: function () {
                    refus.push(r.get('objet') + ' : le serveur n\'a pas répondu');
                    suivante();
                }
            });
        };
        suivante();
    }
});
