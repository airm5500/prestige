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
            'abcmanager #comboStock': {select: this.doSearch},
            'abcmanager #searchField': {specialkey: this.onSearchKey},
            'abcmanager #recalculer': {click: this.onRecalculer},
            'abcmanager #appliquer': {click: this.onAppliquer},
            'abcmanager #detailProduit': {click: this.onDetailProduit},
            'abcmanager #parametrerClasses': {click: this.onParametrerClasses},
            'abcmanager #imprimer': {click: this.onImprimer},
            'abcmanager #exportExcel': {click: this.onExportExcel},
            'abcmanager #exportCsv': {click: this.onExportCsv},
            'abcmanager #creerSuggestion': {click: this.onCreerSuggestion},
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
            type: v('comboType') || 'CA',
            classe: v('comboClasse') || 'ALL',
            stockFilter: v('comboStock') || 'ALL',
            search: v('searchField'),
            codeFamille: v('codeFamile'),
            codeRayon: v('rayons'),
            codeGrossiste: v('grossiste')
        };
    },

    onImprimer: function () {
        window.open('../api/v1/articles/abc/print?' + Ext.Object.toQueryString(this.buildExportParams()));
    },

    onExportExcel: function () {
        window.open('../api/v1/articles/abc/excel?' + Ext.Object.toQueryString(this.buildExportParams()));
    },

    onExportCsv: function () {
        window.open('../api/v1/articles/abc/csv?' + Ext.Object.toQueryString(this.buildExportParams()));
    },

    onCreerSuggestion: function () {
        const me = this;
        Ext.MessageBox.confirm('Confirmation',
                'Créer des suggestions de commande à partir du résultat ABC filtré ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Création des suggestions');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/articles/abc/suggestion?' + Ext.Object.toQueryString(me.buildExportParams()),
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
            type: v('comboType') || 'CA',
            codeFamille: v('codeFamile'),
            codeRayon: v('rayons'),
            codeGrossiste: v('grossiste')
        };
    },

    onRecalculer: function () {
        const me = this;
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
                Ext.Msg.alert('Classification ABC',
                        'Recalcul effectué sur ' + (r.total || 0) + ' produits.<br/><br/>'
                        + line('A') + '<br/>' + line('B') + '<br/>' + line('C'));
                me.doSearch();
            },
            failure: function (response) {
                progress.hide();
                Ext.Msg.alert('Erreur', 'Échec du recalcul. Code HTTP : ' + response.status);
            }
        });
    },

    onAppliquer: function () {
        const me = this;
        Ext.MessageBox.confirm('Confirmation',
                'Appliquer la classification ABC calculée sur les fiches articles ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
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
                });
    },

    onDetailProduit: function () {
        const me = this;
        const sel = me.getGrid().getSelectionModel().getSelection();
        if (!sel || sel.length === 0) {
            Ext.Msg.alert('Détail produit', 'Veuillez sélectionner un produit dans la grille.');
            return;
        }
        const rec = sel[0];
        const produitId = rec.get('produitId');
        const libelle = rec.get('libelle');

        const store = Ext.create('Ext.data.Store', {
            fields: [{name: 'mois', type: 'string'}, {name: 'conso', type: 'number'}],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/articles/abc/produit/conso',
                extraParams: {produitId: produitId, months: 7},
                reader: {type: 'json', root: 'data'}
            }
        });

        Ext.create('Ext.window.Window', {
            title: 'Consommation mensuelle - ' + libelle,
            modal: true,
            width: 420,
            height: 320,
            layout: 'fit',
            plain: true,
            items: [{
                xtype: 'gridpanel',
                store: store,
                viewConfig: {columnLines: true},
                columns: [
                    {header: 'Mois', dataIndex: 'mois', flex: 1},
                    {header: 'Conso (équiv. boîte)', dataIndex: 'conso', width: 160, align: 'right',
                        renderer: function (v) { return Ext.util.Format.number(v, '0,000.'); }}
                ]
            }],
            buttons: [{text: 'Fermer', handler: function (b) { b.up('window').close(); }}]
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
            width: 760,
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
                    {header: 'Q1', dataIndex: 'q1', width: 60, align: 'right', editor: {xtype: 'numberfield', minValue: 0, allowBlank: false}},
                    {header: 'Q2', dataIndex: 'q2', width: 60, align: 'right', editor: {xtype: 'numberfield', minValue: 0, allowBlank: false}},
                    {header: 'Q3 (mois)', dataIndex: 'q3', width: 80, align: 'right', editor: {xtype: 'numberfield', minValue: 1, allowBlank: false}},
                    {header: 'Unité Q1/Q2', dataIndex: 'unite', width: 110, editor: {xtype: 'combobox', store: uniteStore, valueField: 'id', displayField: 'id', editable: false, forceSelection: true}},
                    {header: 'Cumul min %', dataIndex: 'seuilMin', width: 95, align: 'right', editor: {xtype: 'numberfield', minValue: 0, maxValue: 100}},
                    {header: 'Cumul max %', dataIndex: 'seuilMax', width: 95, align: 'right', editor: {xtype: 'numberfield', minValue: 0, maxValue: 100}},
                    {header: 'Statut', dataIndex: 'statut', width: 80, renderer: function (v) { return v === 'enable' ? 'Actif' : 'Inactif'; }, editor: {xtype: 'combobox', store: statutStore, valueField: 'id', displayField: 'libelle', editable: false, forceSelection: true}}
                ],
                listeners: {
                    edit: function (editor, e) {
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
