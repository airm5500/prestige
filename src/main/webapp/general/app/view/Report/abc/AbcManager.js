/* global Ext */

Ext.define('testextjs.view.Report.abc.AbcManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'abcmanager',
    title: 'Classification ABC',
    frame: true,
    width: '98%',
    height: 600,
    minHeight: 570,
    cls: 'custompanel',
    layout: 'fit',
    requires: ['testextjs.model.AbcProduit'],

    initComponent: function () {
        const me = this;

        const moneyRenderer = function (v) {
            return Ext.util.Format.number(v, '0,000.');
        };

        const data = new Ext.data.Store({
            model: 'testextjs.model.AbcProduit',
            pageSize: 50,
            autoLoad: false,
            remoteSort: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/articles/abc',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            },
            listeners: {
                beforeload: function (store, operation) {
                    const proxy = store.getProxy();
                    const v = function (id) {
                        const c = me.down('#' + id);
                        return c && c.getValue() ? c.getValue() : '';
                    };
                    proxy.setExtraParam('dtStart', me.down('#dtStart').getSubmitValue());
                    proxy.setExtraParam('dtEnd', me.down('#dtEnd').getSubmitValue());
                    proxy.setExtraParam('type', v('comboType') || 'CA');
                    proxy.setExtraParam('classe', v('comboClasse') || 'ALL');
                    proxy.setExtraParam('stockFilter', v('comboStock') || 'ALL');
                    proxy.setExtraParam('search', v('searchField'));
                    proxy.setExtraParam('codeRayon', v('rayons'));
                    proxy.setExtraParam('codeGrossiste', v('grossiste'));
                    proxy.setExtraParam('codeFamille', v('codeFamile'));
                },
                load: function (store, records, success, operation) {
                    me.updateSummary(store);
                }
            }
        });
        me.gridStore = data;

        const remoteStore = function (url) {
            return Ext.create('Ext.data.Store', {
                idProperty: 'id',
                fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
                autoLoad: false,
                pageSize: 9999,
                proxy: {type: 'ajax', url: url, reader: {type: 'json', root: 'data', totalProperty: 'total'}}
            });
        };
        const grossiste = remoteStore('../api/v1/common/grossiste');
        const rayons = remoteStore('../api/v1/common/rayons');
        const familles = remoteStore('../api/v1/common/famillearticles');

        const filtreType = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'CA', libelle: "Chiffre d'Affaires"},
                {id: 'QTY', libelle: "Quantité"},
                {id: 'MARGE', libelle: "Marge"}
            ]
        });
        const filtreClasse = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'ALL', libelle: 'Toutes les classes'},
                {id: 'A', libelle: 'Classe A'},
                {id: 'B', libelle: 'Classe B'},
                {id: 'C', libelle: 'Classe C'}
            ]
        });
        const filtreStock = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'ALL', libelle: 'Tous les stocks'},
                {id: 'SUP0', libelle: 'Stock > 0'},
                {id: 'EGAL0', libelle: 'Stock = 0'},
                {id: 'INF_SEUIL', libelle: 'Stock < seuil'},
                {id: 'INF_EGAL_SEUIL', libelle: 'Stock <= seuil'},
                {id: 'NEGATIF', libelle: 'Stock négatif'}
            ]
        });

        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {xtype: 'datefield', fieldLabel: 'Du', itemId: 'dtStart', margin: '0 10 0 0', submitFormat: 'Y-m-d', flex: 1, labelWidth: 20, maxValue: new Date(), value: new Date(), format: 'd/m/Y'},
                        {xtype: 'datefield', fieldLabel: 'Au', itemId: 'dtEnd', labelWidth: 20, flex: 1, maxValue: new Date(), value: new Date(), margin: '0 9 0 0', submitFormat: 'Y-m-d', format: 'd/m/Y'},
                        {xtype: 'combobox', flex: 1, margin: '0 5 0 0', labelWidth: 5, itemId: 'rayons', store: rayons, pageSize: 999, valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'remote', minChars: 2, emptyText: 'Emplacement / rayon'},
                        {xtype: 'combobox', flex: 1, margin: '0 5 0 0', labelWidth: 5, itemId: 'grossiste', store: grossiste, pageSize: 999, valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'remote', minChars: 2, emptyText: 'Grossiste'},
                        {xtype: 'combobox', flex: 1, margin: '0 5 0 0', labelWidth: 5, itemId: 'codeFamile', store: familles, pageSize: 999, valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'remote', minChars: 2, emptyText: 'Famille'}
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {xtype: 'combo', value: 'CA', flex: 1, itemId: 'comboType', labelWidth: 1, editable: false, store: filtreType, valueField: 'id', displayField: 'libelle'},
                        {xtype: 'combo', value: 'ALL', flex: 1, itemId: 'comboClasse', labelWidth: 1, editable: false, store: filtreClasse, valueField: 'id', displayField: 'libelle'},
                        {xtype: 'combo', value: 'ALL', flex: 1, itemId: 'comboStock', labelWidth: 1, editable: false, store: filtreStock, valueField: 'id', displayField: 'libelle'},
                        {xtype: 'textfield', flex: 1, itemId: 'searchField', emptyText: 'CIP, libellé, EAN, code Geo'},
                        {text: 'Rechercher', itemId: 'rechercher', iconCls: 'searchicon', scope: this},
                        {xtype: 'tbseparator'},
                        {text: 'Recalculer classification', itemId: 'recalculer', iconCls: 'suggestionreapro', tooltip: 'Recalcule la classification ABC sur la période'},
                        {text: 'Appliquer aux fiches', itemId: 'appliquer', iconCls: 'printable', tooltip: 'Écrit la classe ABC calculée sur les fiches articles'},
                        {xtype: 'tbseparator'},
                        {text: 'Détail produit', itemId: 'detailProduit', iconCls: 'charticon', tooltip: 'Consommation mensuelle (M à M-6) du produit sélectionné'},
                        {text: 'Paramétrer les classes', itemId: 'parametrerClasses', iconCls: 'configuration', tooltip: 'Modifier Q1, Q2, Q3, unité et bornes des classes A/B/C'}
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {xtype: 'tbtext', itemId: 'summaryLabel', text: 'A: -, B: -, C: -'},
                        '->',
                        {text: 'Imprimer', itemId: 'imprimer', iconCls: 'printable', tooltip: 'Imprimer le résultat filtré (PDF)'},
                        {text: 'Exporter Excel', itemId: 'exportExcel', iconCls: 'export_excel_icon', tooltip: 'Exporter le résultat filtré en Excel'},
                        {text: 'Exporter CSV', itemId: 'exportCsv', iconCls: 'export_csv_icon', tooltip: 'Exporter le résultat filtré en CSV'},
                        {text: 'Créer suggestion', itemId: 'creerSuggestion', iconCls: 'suggestionreapro', tooltip: 'Créer des suggestions de commande à partir du résultat filtré'},
                        {text: 'Créer inventaire', itemId: 'creerInventaire', iconCls: 'addicon', tooltip: 'Créer un inventaire à partir du résultat filtré'}
                    ]
                }
            ],

            items: [
                {
                    xtype: 'gridpanel',
                    store: data,
                    sortableColumns: false,
                    viewConfig: {columnLines: true},
                    columns: [
                        {header: 'Id', width: 40, xtype: 'rownumberer'},
                        {header: 'CIP', dataIndex: 'cip', width: 80},
                        {header: 'EAN', dataIndex: 'ean', width: 100, hidden: true},
                        {header: 'Libellé', dataIndex: 'libelle', flex: 1.6},
                        {header: 'Classe', dataIndex: 'classe', width: 60, align: 'center'},
                        {header: 'Famille', dataIndex: 'famille', flex: 1},
                        {header: 'Rayon', dataIndex: 'rayon', flex: 1},
                        {header: 'Code Geo', dataIndex: 'codeGeoArticle', width: 100},
                        {header: 'Stock', dataIndex: 'stockDisponible', width: 70, align: 'right', renderer: moneyRenderer},
                        {header: 'Seuil', dataIndex: 'seuilMini', width: 70, align: 'right', renderer: moneyRenderer},
                        {header: 'Qté réappro', dataIndex: 'quantiteReappro', width: 80, align: 'right', renderer: moneyRenderer},
                        {header: 'Qté vendue', dataIndex: 'quantiteVendue', width: 80, align: 'right', renderer: moneyRenderer},
                        {header: "Chiffre d'Affaires", dataIndex: 'chiffreAffaires', flex: 1, align: 'right', renderer: moneyRenderer},
                        {header: 'Marge', dataIndex: 'marge', flex: 1, align: 'right', renderer: moneyRenderer},
                        {header: 'Part %', dataIndex: 'partPourcentage', width: 70, align: 'right', renderer: function (v) { return Ext.util.Format.number(v, '0.00'); }},
                        {header: 'Cumul %', dataIndex: 'cumulPourcentage', width: 75, align: 'right', renderer: function (v) { return Ext.util.Format.number(v, '0.00'); }},
                        {header: 'Q1', dataIndex: 'q1', width: 45, align: 'right', hidden: true},
                        {header: 'Q2', dataIndex: 'q2', width: 45, align: 'right', hidden: true},
                        {header: 'Q3', dataIndex: 'q3', width: 45, align: 'right', hidden: true},
                        {header: 'Unité', dataIndex: 'uniteCalcul', width: 80, hidden: true}
                    ],
                    selModel: {selType: 'cellmodel'},
                    bbar: {xtype: 'pagingtoolbar', store: data, dock: 'bottom', displayInfo: true}
                }
            ]
        });

        me.callParent(arguments);
    },

    updateSummary: function (store) {
        const me = this;
        const lbl = me.down('#summaryLabel');
        if (!lbl) {
            return;
        }
        let summary = null;
        try {
            // Le JSON complet (avec "summary") est conserve par le reader du store.
            const reader = store && store.getProxy ? store.getProxy().getReader() : null;
            const raw = reader ? (reader.rawData || reader.jsonData) : null;
            summary = raw ? raw.summary : null;
        } catch (e) {
            summary = null;
        }
        if (!summary) {
            lbl.setText('A: -, B: -, C: -');
            return;
        }
        const fmt = function (c) {
            const colorMap = {A: '#1a7e1a', B: '#e67e00', C: '#d10000'};
            const s = summary[c] || {};
            const nb = s.nbProduits || 0;
            const ca = Ext.util.Format.number(s.chiffreAffaires || 0, '0,000.');
            return '<span style="color:' + colorMap[c] + ';font-weight:bold">Classe ' + c + ':</span> '
                    + '<span style="color:#8B4513;font-weight:bold">' + nb + '</span> -&gt; '
                    + '<span style="color:#0000ff;font-weight:bold">CA ' + ca + ' F.CFA</span>';
        };
        lbl.setText(fmt('A') + '  |  ' + fmt('B') + '  |  ' + fmt('C'));
    }
});
