/* global Ext */

Ext.define('testextjs.controller.AbcManagerCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Report.abc.AbcManager'],
    refs: [
        {ref: 'abc', selector: 'abcmanager'},
        {ref: 'grid', selector: 'abcmanager gridpanel'}
    ],

    init: function () {
        this.control({
            'abcmanager gridpanel': {
                viewready: this.doInitStore
            },
            'abcmanager #rechercher': {
                click: this.doSearch
            },
            'abcmanager #rayons': {select: this.doSearch},
            'abcmanager #grossiste': {select: this.doSearch},
            'abcmanager #codeFamile': {select: this.doSearch},
            'abcmanager #comboType': {select: this.doSearch},
            'abcmanager #comboClasse': {select: this.doSearch},
            'abcmanager #searchField': {specialkey: this.onSearchKey},
            'abcmanager #recalculer': {click: this.onRecalculer},
            'abcmanager #appliquer': {click: this.onAppliquer},
            'abcmanager #evolution': {click: this.onEvolution},
            'abcmanager #parametrerClasses': {click: this.onParametrerClasses},
            'abcmanager #imprimer': {click: this.onImprimer},
            'abcmanager #btnExporter': {click: this.onExportExcel},
            'abcmanager #exporterExcel': {click: this.onExportExcel},
            'abcmanager #exporterCsv': {click: this.onExportCsv},
            'abcmanager #suggReappro': {click: this.onSuggReappro},
            'abcmanager #suggVendues': {click: this.onSuggVendues},
            'abcmanager #creerInventaire': {click: this.onCreerInventaire}
        });
    },

    // Tous les filtres courants (utilises par exports / inventaire)
    buildExportParams: function () {
        const me = this, abc = me.getAbc();
        const v = function (id) {
            const c = abc.down('#' + id);
            return c && c.getValue() ? c.getValue() : '';
        };
        return {
            dtStart: abc.down('#dtStart').getSubmitValue(),
            dtEnd: abc.down('#dtEnd').getSubmitValue(),
            type: v('comboType') || 'QTY',
            classe: v('comboClasse') || 'ALL',
            stockFilter: v('comboStock') || 'ALL',
            stockMin: v('stockValue'),
            topN: v('topN'),
            search: v('searchField'),
            codeFamille: v('codeFamile'),
            codeRayon: v('rayons'),
            codeGrossiste: v('grossiste')
        };
    },

    // Garde : rien a traiter si la grille n'affiche aucun produit (evite un appel serveur inutile)
    hasRows: function () {
        const grid = this.getGrid();
        return !!(grid && grid.getStore() && grid.getStore().getCount() > 0);
    },

    guardEmpty: function () {
        if (!this.hasRows()) {
            Ext.Msg.alert('Information', 'Aucun produit à traiter.');
            return false;
        }
        return true;
    },

    onImprimer: function () {
        if (!this.guardEmpty()) { return; }
        window.open('../api/v1/articles/abc/print?' + Ext.Object.toQueryString(this.buildExportParams()));
    },

    onExportExcel: function () {
        if (!this.guardEmpty()) { return; }
        window.open('../api/v1/articles/abc/excel?' + Ext.Object.toQueryString(this.buildExportParams()));
    },

    onExportCsv: function () {
        if (!this.guardEmpty()) { return; }
        window.open('../api/v1/articles/abc/csv?' + Ext.Object.toQueryString(this.buildExportParams()));
    },

    onSuggReappro: function () { this.onCreerSuggestion(true); },
    onSuggVendues: function () { this.onCreerSuggestion(false); },

    onCreerSuggestion: function (isReappro) {
        const me = this;
        if (!me.guardEmpty()) { return; }
        const reappro = isReappro === true;
        const params = Ext.apply({}, me.buildExportParams());
        params.isReappro = reappro;
        const libelle = reappro ? 'quantités de réappro' : 'quantités vendues';
        Ext.MessageBox.confirm('Confirmation',
                'Créer des suggestions (' + libelle + ') à partir du résultat ABC filtré ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Création des suggestions');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/articles/abc/suggestion?' + Ext.Object.toQueryString(params),
                        timeout: 2400000,
                        success: function (response) {
                            progress.hide();
                            const r = Ext.JSON.decode(response.responseText, true) || {};
                            if (r.success) {
                                Ext.Msg.alert('Suggestion ABC',
                                        'Suggestions créées pour ' + (r.count || 0) + ' produits.');
                            } else {
                                Ext.Msg.alert('Suggestion ABC', 'Aucune suggestion créée.');
                            }
                        },
                        failure: function (response) {
                            progress.hide();
                            Ext.Msg.alert('Erreur', 'Échec de la création. Code HTTP : ' + response.status);
                        }
                    });
                });
    },

    onCreerInventaire: function () {
        const me = this;
        if (!me.guardEmpty()) { return; }
        Ext.MessageBox.confirm('Confirmation',
                'Créer un inventaire à partir du résultat ABC filtré ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Création de l\'inventaire');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/articles/abc/inventaire?' + Ext.Object.toQueryString(me.buildExportParams()),
                        timeout: 2400000,
                        success: function (response) {
                            progress.hide();
                            const r = Ext.JSON.decode(response.responseText, true) || {};
                            Ext.Msg.alert('Inventaire ABC',
                                    'Inventaire créé avec ' + (r.count || 0) + ' produits.');
                        },
                        failure: function (response) {
                            progress.hide();
                            Ext.Msg.alert('Erreur', 'Échec de la création. Code HTTP : ' + response.status);
                        }
                    });
                });
    },

    doInitStore: function () {
        this.doSearch();
    },

    onSearchKey: function (field, e) {
        if (e.getKey() === e.ENTER) {
            this.doSearch();
        }
    },

    doSearch: function () {
        // loadPage(1) declenche beforeload (extraParams positionnes dans la vue)
        this.getGrid().getStore().loadPage(1);
    },

    buildParams: function () {
        const me = this, abc = me.getAbc();
        const v = function (id) {
            const c = abc.down('#' + id);
            return c && c.getValue() ? c.getValue() : '';
        };
        return {
            dtStart: abc.down('#dtStart').getSubmitValue(),
            dtEnd: abc.down('#dtEnd').getSubmitValue(),
            type: v('comboType') || 'QTY',
            codeFamille: v('codeFamile'),
            codeRayon: v('rayons'),
            codeGrossiste: v('grossiste')
        };
    },

    onRecalculer: function () {
        const me = this;
        if (!me.guardEmpty()) { return; }
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Recalcul de la classification ABC');
        Ext.Ajax.request({
            method: 'POST',
            // parametres en query string (le endpoint lit des @QueryParam -> evite le 415)
            url: '../api/v1/articles/abc/recalculate?' + Ext.Object.toQueryString(me.buildParams()),
            timeout: 2400000,
            success: function (response) {
                progress.hide();
                const r = Ext.JSON.decode(response.responseText, true) || {};
                const s = r.summary || {};
                const line = function (c) {
                    const x = s[c] || {};
                    return c + ' : ' + (x.nbProduits || 0) + ' produits';
                };
                // 1) Resume, puis 2) au clic OK on propose d'appliquer aux fiches
                Ext.Msg.alert('Classification ABC',
                        'Recalcul effectué sur ' + (r.total || 0) + ' produits.<br/><br/>'
                        + line('A') + '<br/>' + line('B') + '<br/>' + line('C'),
                        function () {
                            Ext.MessageBox.confirm('Appliquer aux fiches',
                                    'Souhaitez-vous appliquer cette classification aux fiches articles ?',
                                    function (btn) {
                                        if (btn === 'yes') {
                                            me.doApply();
                                        } else {
                                            me.doSearch();
                                        }
                                    });
                        });
            },
            failure: function (response) {
                progress.hide();
                Ext.Msg.alert('Erreur', 'Échec du recalcul. Code HTTP : ' + response.status);
            }
        });
    },

    onAppliquer: function () {
        const me = this;
        if (!me.guardEmpty()) { return; }
        Ext.MessageBox.confirm('Confirmation',
                'Appliquer la classification ABC calculée sur les fiches articles ?',
                function (btn) {
                    if (btn === 'yes') {
                        me.doApply();
                    }
                });
    },

    // Coeur de l'application aux fiches (reutilise par Appliquer et par Recalculer->Oui)
    doApply: function () {
        const me = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Application aux fiches articles');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/articles/abc/apply?' + Ext.Object.toQueryString(me.buildParams()),
            timeout: 2400000,
            success: function (response) {
                progress.hide();
                const r = Ext.JSON.decode(response.responseText, true) || {};
                Ext.Msg.alert('Classification ABC',
                        'Classes appliquées sur ' + (r.count || 0) + ' fiches articles.');
                me.doSearch();
            },
            failure: function (response) {
                progress.hide();
                Ext.Msg.alert('Erreur', 'Échec de l\'application. Code HTTP : ' + response.status);
            }
        });
    },

    onEvolution: function () {
        const me = this;
        if (!me.guardEmpty()) { return; }
        const baseParams = me.buildExportParams();

        const store = Ext.create('Ext.data.Store', {
            fields: ['month', {name: 'A', type: 'number'}, {name: 'B', type: 'number'}, {name: 'C', type: 'number'}],
            proxy: {
                type: 'ajax',
                url: '../api/v1/articles/abc/evolution',
                extraParams: Ext.apply({indicator: 'CA'}, baseParams),
                reader: {type: 'json', root: 'months'}
            },
            autoLoad: true
        });

        const lineSerie = function (field, title, color) {
            return {
                type: 'line', axis: 'left', xField: 'month', yField: field, title: title,
                style: {stroke: color, 'stroke-width': 2}, markerConfig: {type: 'circle', size: 4, fill: color},
                tips: {trackMouse: true, width: 180, height: 28,
                    renderer: function (rec, item) {
                        this.setTitle(title + ' - ' + rec.get('month') + ' : ' + Ext.util.Format.number(rec.get(field), '0,000.'));
                    }}
            };
        };

        Ext.create('Ext.window.Window', {
            title: 'Évolution mensuelle des classes ABC',
            modal: true, width: 820, height: 480, layout: 'fit', plain: true,
            tbar: [
                'Indicateur :',
                {
                    xtype: 'combo', width: 220, editable: false, value: 'CA', queryMode: 'local',
                    valueField: 'id', displayField: 'libelle',
                    store: Ext.create('Ext.data.Store', {
                        fields: ['id', 'libelle'],
                        data: [
                            {id: 'CA', libelle: "Chiffre d'affaires"},
                            {id: 'QTY', libelle: 'Quantité vendue'},
                            {id: 'MARGE', libelle: 'Marge'},
                            {id: 'COUNT', libelle: 'Nombre de produits'}
                        ]
                    }),
                    listeners: {
                        select: function (combo, records) {
                            const v = (records && records[0]) ? records[0].get('id') : combo.getValue();
                            store.getProxy().setExtraParam('indicator', v);
                            store.load();
                        }
                    }
                }
            ],
            items: [{
                xtype: 'chart', animate: true, shadow: true, store: store, style: 'background:#fff',
                legend: {position: 'bottom'},
                axes: [
                    {type: 'Numeric', position: 'left', fields: ['A', 'B', 'C'], minimum: 0, grid: true},
                    {type: 'Category', position: 'bottom', fields: ['month']}
                ],
                series: [
                    lineSerie('A', 'Classe A', '#1a7e1a'),
                    lineSerie('B', 'Classe B', '#e67e00'),
                    lineSerie('C', 'Classe C', '#d10000')
                ]
            }]
        }).show();
    },

    onParametrerClasses: function () {
        const me = this;

        const store = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'id', type: 'string'},
                {name: 'code', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'q1', type: 'int'},
                {name: 'q2', type: 'int'},
                {name: 'q3', type: 'int'},
                {name: 'unite', type: 'string'},
                {name: 'seuilMin', type: 'number'},
                {name: 'seuilMax', type: 'number'},
                {name: 'statut', type: 'string'}
            ],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/articles/abc/classes',
                reader: {type: 'json', root: 'data'}
            }
        });

        const uniteStore = Ext.create('Ext.data.Store', {
            fields: ['id'],
            data: [{id: 'SEMAINE'}, {id: 'JOUR'}]
        });
        const statutStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            data: [{id: 'enable', libelle: 'Actif'}, {id: 'disable', libelle: 'Inactif'}]
        });

        const cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1});

        // Validation immediate de la cellule sur Entree (champs numeriques)
        const enterCompletes = {
            specialkey: function (f, e) {
                if (e.getKey() === e.ENTER) {
                    cellEditing.completeEdit();
                }
            }
        };

        // Q3 (mois) -> nombre reel de jours des Q3 derniers mois clotures (longueurs reelles)
        const q3Days = function (q3) {
            const n = parseInt(q3, 10) || 0;
            const d = new Date();
            let total = 0;
            for (let i = 1; i <= n; i++) {
                total += new Date(d.getFullYear(), d.getMonth() - i + 1, 0).getDate();
            }
            return total;
        };

        const saveRow = function (rec) {
            Ext.Ajax.request({
                method: 'POST',
                url: '../api/v1/articles/abc/classes/update?' + Ext.Object.toQueryString({
                    id: rec.get('id'),
                    q1: rec.get('q1'),
                    q2: rec.get('q2'),
                    q3: rec.get('q3'),
                    unite: rec.get('unite'),
                    seuilMin: rec.get('seuilMin'),
                    seuilMax: rec.get('seuilMax'),
                    statut: rec.get('statut')
                }),
                success: function (response) {
                    const r = Ext.JSON.decode(response.responseText, true) || {};
                    if (r.success) {
                        rec.commit();
                    } else {
                        Ext.Msg.alert('Erreur', r.message || 'Mise à jour impossible');
                        rec.reject();
                    }
                },
                failure: function (response) {
                    Ext.Msg.alert('Erreur', 'Échec de la mise à jour. Code HTTP : ' + response.status);
                    rec.reject();
                }
            });
        };

        Ext.create('Ext.window.Window', {
            title: 'Paramétrage des classes ABC',
            modal: true,
            width: 880,
            height: 260,
            layout: 'fit',
            plain: true,
            items: [{
                xtype: 'gridpanel',
                store: store,
                plugins: [cellEditing],
                viewConfig: {columnLines: true},
                columns: [
                    {header: 'Code', dataIndex: 'code', width: 60, align: 'center'},
                    {header: 'Libellé', dataIndex: 'libelle', flex: 1},
                    {header: 'Q1', dataIndex: 'q1', width: 60, align: 'right', editor: {xtype: 'numberfield', minValue: 0, allowBlank: false, listeners: enterCompletes}},
                    {header: 'Q2', dataIndex: 'q2', width: 60, align: 'right', editor: {xtype: 'numberfield', minValue: 0, allowBlank: false, listeners: enterCompletes}},
                    {header: 'Q3 (mois)', dataIndex: 'q3', width: 80, align: 'right', editor: {xtype: 'numberfield', minValue: 1, allowBlank: false, listeners: enterCompletes}},
                    {header: 'Q3 (≈ j)', dataIndex: 'q3', width: 70, align: 'right', sortable: false,
                        renderer: function (v) { return q3Days(v) + ' j'; }},
                    {header: 'Unité Q1/Q2', dataIndex: 'unite', width: 110, editor: {xtype: 'combobox', store: uniteStore, valueField: 'id', displayField: 'id', editable: false, forceSelection: true,
                        listeners: {select: function () { cellEditing.completeEdit(); }}}},
                    {header: 'Cumul min %', dataIndex: 'seuilMin', width: 95, align: 'right', editor: {xtype: 'numberfield', minValue: 0, maxValue: 100, listeners: enterCompletes}},
                    {header: 'Cumul max %', dataIndex: 'seuilMax', width: 95, align: 'right', editor: {xtype: 'numberfield', minValue: 0, maxValue: 100, listeners: enterCompletes}},
                    {header: 'Statut', dataIndex: 'statut', width: 80, renderer: function (v) { return v === 'enable' ? 'Actif' : 'Inactif'; }, editor: {xtype: 'combobox', store: statutStore, valueField: 'id', displayField: 'libelle', editable: false, forceSelection: true,
                        listeners: {select: function () { cellEditing.completeEdit(); }}}}
                ],
                listeners: {
                    edit: function (editor, e) {
                        // Conversion automatique Q1/Q2 au changement d'unite (1 semaine = 7 jours)
                        if (e.field === 'unite' && e.value !== e.originalValue) {
                            const q1 = e.record.get('q1') || 0, q2 = e.record.get('q2') || 0;
                            if (e.value === 'JOUR' && e.originalValue === 'SEMAINE') {
                                e.record.set('q1', q1 * 7);
                                e.record.set('q2', q2 * 7);
                            } else if (e.value === 'SEMAINE' && e.originalValue === 'JOUR') {
                                e.record.set('q1', Math.max(1, Math.round(q1 / 7)));
                                e.record.set('q2', Math.max(1, Math.round(q2 / 7)));
                            }
                        }
                        saveRow(e.record);
                    }
                }
            }],
            buttons: [
                {text: 'Fermer', handler: function (b) {
                    b.up('window').close();
                    // recharge la grille ABC pour refleter d'eventuels changements de bornes
                    if (me.getGrid()) {
                        me.doSearch();
                    }
                }}
            ]
        }).show();
    }
});
