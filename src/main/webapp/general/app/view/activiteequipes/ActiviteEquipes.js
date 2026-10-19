/* global Ext */

/*
 * Menu « Activité des équipes » (ANALYSE DE GESTION), demande du 13/10 : tout ce que fait chaque employé.
 *  - Données & recherches : journal des actions de la période (ventes, préventes, annulations, modifications, BL,
 *    commandes, ajustements, inventaires, retours, connexions), pastilles par type qui filtrent, recherche,
 *    pagination, export CSV ;
 *  - Analyses : productivité et aide à la décision (graphiques).
 * Barre commune : période (raccourcis), employé, Actualiser. Lectures seules : ../api/v1/activite-equipes/...
 */
Ext.define('testextjs.view.activiteequipes.ActiviteEquipes', {
    extend: 'Ext.panel.Panel',
    xtype: 'activiteequipes',
    requires: ['testextjs.view.commun.RaccourcisPeriode', 'Ext.chart.*'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub ae-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    ONGLETS: [{cle: 'donnees', texte: 'Données & recherches', aide: 'Journal de tout ce que fait chaque employé, filtres et recherche'},
        {cle: 'analyses', texte: 'Analyses', aide: 'Productivité, affluence, saisie des BL, actions sensibles et aide à la décision'}],

    /* couleur de chaque type d'action (pastilles, colonne Action, graphiques) */
    COULEURS: {VENTE: '#1b7f3b', VENDEUR: '#2563eb', ANNULATION: '#c62828', MODIFICATION: '#e67e22', BL: '#7c3aed',
        COMMANDE: '#0891b2', AJUSTEMENT: '#b45309', INVENTAIRE: '#475569', RETOUR: '#be185d', CONNEXION: '#64748b'},

    statics: {
        styles: function () {
            if (Ext.get('activite-equipes-styles')) {
                return;
            }
            Ext.util.CSS.createStyleSheet(
                    '.ae-pastilles{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px 2px}'
                    + '.ae-pastille{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:14px;border:1px solid #d0d7e2;'
                    + 'background:#fff;cursor:pointer;font-size:12px;transition:transform .15s,box-shadow .15s,background .15s;animation:ae-entree .35s ease both}'
                    + '.ae-pastille:hover{transform:translateY(-1px);box-shadow:0 2px 6px rgba(15,23,42,.15)}'
                    + '.ae-pastille b{font-variant-numeric:tabular-nums}'
                    + '.ae-pastille i{width:9px;height:9px;border-radius:50%;display:inline-block}'
                    + '.ae-pastille.ae-active{color:#fff;border-color:transparent}'
                    + '.ae-pastille.ae-vide{opacity:.45}'
                    + '.ae-type{display:inline-block;padding:1px 8px;border-radius:10px;color:#fff;font-size:11px;white-space:nowrap}'
                    + '@keyframes ae-entree{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}',
                    'activite-equipes-styles');
        }
    },

    initComponent: function () {
        var me = this, aujourdhui = new Date();
        testextjs.view.activiteequipes.ActiviteEquipes.styles();
        me.typeActif = '';
        me.employes = Ext.create('Ext.data.Store', {
            fields: ['id', 'nom', 'actif'],
            proxy: {type: 'ajax', url: '../api/v1/activite-equipes/employes', reader: {type: 'json', root: 'data'}},
            autoLoad: true,
            listeners: {
                /* premier choix de la liste : revenir a tous les employes (vider le champ ne suffisait pas) */
                load: function (st) {
                    st.insert(0, {id: '', nom: 'Tous les employés', actif: true});
                }
            }
        });
        me.donnees = me.creerDonnees();
        me.analyses = Ext.create('Ext.panel.Panel', {itemId: 'aeAnalyses', autoScroll: true, bodyPadding: 12,
            items: [{xtype: 'component', itemId: 'aeAnalysesContenu', html: ''}]});
        Ext.apply(me, {
            items: [me.donnees, me.analyses],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsAe', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'ae-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'ae-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'donnees', tooltip: o.aide, handler: function () {
                                me.afficher(o.cle);
                            }};
                    })
                }, {
                    xtype: 'toolbar', dock: 'top', itemId: 'aeFiltres', items: [
                        {xtype: 'datefield', itemId: 'aeDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.getFirstDateOfMonth(aujourdhui), maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'aeFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui, plugins: [{ptype: 'raccourcisperiode', debut: 'aeDebut', declencher: 'aeActualiser'}]},
                        {xtype: 'combobox', itemId: 'aeEmploye', fieldLabel: 'Employé', labelWidth: 55, width: 270, store: me.employes,
                            queryMode: 'local', displayField: 'nom', valueField: 'id', emptyText: 'Tous les employés', forceSelection: true,
                            anyMatch: true, editable: true, typeAhead: true,
                            tpl: Ext.create('Ext.XTemplate', '<tpl for="."><div class="x-boundlist-item">{nom:htmlEncode}'
                                    + '<tpl if="!actif"> <span style="color:#94a3b8">(inactif)</span></tpl></div></tpl>'),
                            listeners: {
                                select: function () {
                                    me.actualiser();
                                }
                            }},
                        {text: 'Actualiser', itemId: 'aeActualiser', iconCls: 'refresh', tooltip: 'Relire la période', handler: function () {
                                me.actualiser();
                            }}
                    ]
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.actualiser();
        }, me, {single: true});
    },

    /* filtres communs, au format des routes */
    filtres: function () {
        var me = this, e = me.down('#aeEmploye').getValue();
        return {debut: me.down('#aeDebut').getSubmitValue(), fin: me.down('#aeFin').getSubmitValue(), employeId: e || ''};
    },

    creerDonnees: function () {
        var me = this;
        me.journal = Ext.create('Ext.data.Store', {
            fields: ['date', 'type', 'libelleType', 'employeId', 'employe', 'reference', {name: 'montant', type: 'int', useNull: true}, 'detail'],
            pageSize: 50,
            remoteSort: false,
            proxy: {type: 'ajax', url: '../api/v1/activite-equipes/journal', timeout: 180000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    var f = me.filtres();
                    f.type = me.typeActif;
                    f.q = me.down('#aeRecherche') ? me.down('#aeRecherche').getValue() : '';
                    st.getProxy().extraParams = f;
                },
                load: function (st, recs, ok) {
                    var o = st.getProxy().getReader().rawData || {};
                    me.dessinerPastilles(ok ? (o.compteurs || []) : []);
                }
            }
        });
        return Ext.create('Ext.panel.Panel', {
            itemId: 'aeDonnees', layout: {type: 'vbox', align: 'stretch'},
            items: [{xtype: 'component', itemId: 'aePastilles', cls: 'ae-pastilles', html: '',
                    listeners: {
                        afterrender: function (c) {
                            c.getEl().on('click', function (ev, t) {
                                var p = Ext.fly(t).up('.ae-pastille', 3) || (Ext.fly(t).hasCls('ae-pastille') ? Ext.fly(t) : null);
                                if (p) {
                                    var type = p.getAttribute('data-type');
                                    me.typeActif = me.typeActif === type ? '' : type;
                                    me.journal.loadPage(1);
                                }
                            });
                        }
                    }},
                {xtype: 'gridpanel', itemId: 'aeJournal', flex: 1, store: me.journal, cls: 'ae-journal',
                    viewConfig: {emptyText: '<div style="padding:12px;color:#64748b">Aucune action sur la période et les filtres choisis.</div>', deferEmptyText: false},
                    columns: [
                        {header: 'Date', dataIndex: 'date', width: 125},
                        {header: 'Employé', dataIndex: 'employe', flex: 1, minWidth: 150, renderer: Ext.util.Format.htmlEncode},
                        {header: 'Action', dataIndex: 'libelleType', width: 175, renderer: function (v, m, r) {
                                return '<span class="ae-type" style="background:' + (me.COULEURS[r.get('type')] || '#64748b') + '">' + Ext.String.htmlEncode(v || '') + '</span>';
                            }},
                        {header: 'Référence', dataIndex: 'reference', width: 150, renderer: Ext.util.Format.htmlEncode},
                        {header: 'Montant', dataIndex: 'montant', width: 105, align: 'right', renderer: function (v) {
                                return v === null || v === undefined ? '' : Ext.util.Format.number(v, '0,000').replace(/,/g, ' ');
                            }},
                        {header: 'Détail', dataIndex: 'detail', flex: 2, minWidth: 200, renderer: function (v, m) {
                                var t = Ext.String.htmlEncode(v || '');
                                m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(t) + '"';
                                return t;
                            }}
                    ],
                    dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                                {xtype: 'textfield', itemId: 'aeRecherche', emptyText: 'Rechercher une référence, un grossiste, un poste…', width: 330,
                                    enableKeyEvents: true, listeners: {
                                        specialkey: function (f, e) {
                                            if (e.getKey() === e.ENTER) {
                                                me.journal.loadPage(1);
                                            }
                                        }
                                    }},
                                {text: 'Rechercher', itemId: 'aeChercher', iconCls: 'searchicon', handler: function () {
                                        me.journal.loadPage(1);
                                    }},
                                '->',
                                {text: 'Export CSV', itemId: 'aeExport', iconCls: 'excel', tooltip: 'Le journal filtré, toutes pages', handler: function (b) {
                                        me.exporter(b);
                                    }}]},
                        {xtype: 'pagingtoolbar', dock: 'bottom', store: me.journal, displayInfo: true,
                            displayMsg: 'Actions {0} à {1} sur {2}', emptyMsg: 'Aucune action'}]
                }]
        });
    },

    dessinerPastilles: function (compteurs) {
        var me = this, c = me.down('#aePastilles');
        if (!c || !c.rendered) {
            return;
        }
        var html = Ext.Array.map(compteurs, function (x, i) {
            var couleur = me.COULEURS[x.type] || '#64748b', actif = me.typeActif === x.type;
            return '<span class="ae-pastille' + (actif ? ' ae-active' : '') + (x.nombre ? '' : ' ae-vide') + '" data-type="' + x.type + '"'
                    + ' style="animation-delay:' + (i * 30) + 'ms' + (actif ? ';background:' + couleur : '') + '"'
                    + ' data-qtip="' + (actif ? 'Cliquer pour voir toutes les actions' : 'Cliquer pour ne voir que : ' + Ext.String.htmlEncode(x.libelle)) + '">'
                    + '<i style="background:' + (actif ? '#fff' : couleur) + '"></i>' + Ext.String.htmlEncode(x.libelle)
                    + ' <b>' + Ext.util.Format.number(x.nombre, '0,000').replace(/,/g, ' ') + '</b></span>';
        }).join('');
        c.update(html);
    },

    exporter: function (bouton) {
        var me = this, f = me.filtres();
        f.type = me.typeActif;
        f.q = me.down('#aeRecherche').getValue() || '';
        var url = '../api/v1/activite-equipes/journal/csv?' + Ext.Object.toQueryString(f);
        if (window.PrestigeChargement && PrestigeChargement.telecharger) {
            PrestigeChargement.telecharger(bouton, url, 'Export…');
        } else {
            window.open(url);
        }
    },

    actualiser: function () {
        var me = this, f = me.filtres();
        if (f.debut && f.fin && f.debut > f.fin) {
            if (window.PrestigeToast) {
                PrestigeToast.afficher('La date de début doit précéder la date de fin.', {niveau: 'alerte'});
            }
            return;
        }
        me.journal.loadPage(1);
        if (me.getLayout().getActiveItem() === me.analyses) {
            me.chargerAnalyses();
        }
    },

    afficher: function (cle) {
        var me = this;
        Ext.each(me.ONGLETS, function (x) {
            var b = me.down('#ae-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        if (cle === 'analyses') {
            me.getLayout().setActiveItem(me.analyses);
            me.chargerAnalyses();
            return me.analyses;
        }
        me.getLayout().setActiveItem(me.donnees);
        return me.donnees;
    },

    chargerAnalyses: function () {
        /* etape suivante : graphiques de productivite */
    }
});
