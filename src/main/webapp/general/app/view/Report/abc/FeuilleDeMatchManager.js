/* global Ext */

// Feuille de match : partie du menu Classification ABC. Regroupe les n meilleurs
// produits (quantite par defaut, marge ou chiffre d'affaires), n defini par
// l'utilisateur, avec recherche CIP/nom et filtres grossiste / emplacement /
// famille / classe ABC combinables. Impression PDF (frequences d'achat du mois
// en cours + 3 derniers mois), exports Excel/CSV, inventaire et suggestion.
Ext.define('testextjs.view.Report.abc.FeuilleDeMatchManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'feuilledematch',
    title: 'Feuille de match',
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
                beforeload: function (store) {
                    const proxy = store.getProxy();
                    const v = function (id) {
                        const c = me.down('#' + id);
                        return c && c.getValue() ? c.getValue() : '';
                    };
                    proxy.setExtraParam('dtStart', me.down('#dtStart').getSubmitValue());
                    proxy.setExtraParam('dtEnd', me.down('#dtEnd').getSubmitValue());
                    proxy.setExtraParam('type', v('comboType') || 'QTY');
                    proxy.setExtraParam('classe', v('comboClasse') || 'ALL');
                    proxy.setExtraParam('topN', v('topN'));
                    proxy.setExtraParam('search', v('searchField'));
                    proxy.setExtraParam('codeRayon', v('rayons'));
                    proxy.setExtraParam('codeGrossiste', v('grossiste'));
                    proxy.setExtraParam('codeFamille', v('codeFamile'));
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
                {id: 'QTY', libelle: "Quantité"},
                {id: 'MARGE', libelle: "Marge"},
                {id: 'CA', libelle: "Chiffre d'Affaires"}
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
                        {xtype: 'combobox', flex: 1, margin: '0 5 0 0', labelWidth: 5, itemId: 'codeFamile', store: familles, pageSize: 999, valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'remote', minChars: 2, emptyText: 'Famille'},
                        {xtype: 'numberfield', itemId: 'topN', width: 90, minValue: 1, allowDecimals: false, emptyText: 'Top N', margin: '0 5 0 0',
                            fieldStyle: 'background-color:#FFA500;color:#000;font-weight:bold;',
                            listeners: {specialkey: function (f, e) { if (e.getKey() === e.ENTER) { me.gridStore.loadPage(1); } }}}
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {xtype: 'combo', value: 'QTY', flex: 1, itemId: 'comboType', labelWidth: 1, editable: false, store: filtreType, valueField: 'id', displayField: 'libelle',
                            fieldStyle: 'color:#d10000;font-weight:bold',
                            listeners: {
                                select: function (cmb) {
                                    const t = cmb.getValue();
                                    cmb.setFieldStyle('color:' + (t === 'MARGE' ? '#0000ff' : '#d10000') + ';font-weight:bold');
                                }
                            }},
                        {xtype: 'combo', value: 'ALL', flex: 1, itemId: 'comboClasse', labelWidth: 1, editable: false, store: filtreClasse, valueField: 'id', displayField: 'libelle'},
                        {xtype: 'textfield', flex: 1.4, itemId: 'searchField', emptyText: 'Code CIP ou nom du produit',
                            fieldStyle: 'border:2px solid #1565C0;'},
                        {text: 'Rechercher', itemId: 'rechercher', iconCls: 'searchicon', scope: this},
                        '->',
                        {text: 'Imprimer', itemId: 'imprimer', iconCls: 'printable', tooltip: 'Imprimer la feuille de match (PDF) : fréquences et quantités d\'achat du mois en cours et des 3 derniers mois'},
                        {
                            xtype: 'splitbutton', text: 'Exporter', itemId: 'btnExporter', iconCls: 'export_excel_icon',
                            tooltip: 'Exporter le résultat filtré',
                            menu: [
                                {text: 'Exporter Excel', itemId: 'exporterExcel', iconCls: 'export_excel_icon'},
                                {text: 'Exporter CSV', itemId: 'exporterCsv', iconCls: 'export_csv_icon'}
                            ]
                        },
                        {
                            xtype: 'splitbutton', text: 'Créer suggestion', itemId: 'creerSuggestion',
                            iconCls: 'suggestionreapro',
                            tooltip: 'Créer des suggestions de commande à partir du résultat filtré',
                            handler: function (b) { b.showMenu(); },
                            menu: [
                                {text: 'Suggérer les quantités de réappro', itemId: 'suggReappro', iconCls: 'suggestionreapro'},
                                {text: 'Suggérer les quantités vendues', itemId: 'suggVendues', iconCls: 'suggestionreapro'}
                            ]
                        },
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
                        {header: 'CIP', dataIndex: 'cip', width: 90},
                        {header: 'Libellé', dataIndex: 'libelle', flex: 1.8},
                        {header: 'Classe', dataIndex: 'classe', width: 60, align: 'center',
                            renderer: function (v) {
                                const map = {A: '#1a7e1a', B: '#e67e00', C: '#d10000'};
                                return '<span style="color:' + (map[v] || '#000') + ';font-weight:bold">' + (v || '') + '</span>';
                            }},
                        {header: 'Famille', dataIndex: 'famille', flex: 1},
                        {header: 'Rayon', dataIndex: 'rayon', flex: 1},
                        {header: 'Stock', dataIndex: 'stockDisponible', width: 70, align: 'right', renderer: moneyRenderer},
                        {header: 'Seuil', dataIndex: 'seuilMini', width: 70, align: 'right', renderer: moneyRenderer},
                        {header: 'Qté réappro', dataIndex: 'quantiteReappro', width: 85, align: 'right', renderer: moneyRenderer},
                        {header: 'Qté vendue', dataIndex: 'quantiteVendue', width: 85, align: 'right',
                            renderer: function (v) {
                                const cmp = me.down('#comboType');
                                const t = (cmp && cmp.getValue()) || 'QTY';
                                const c = (t === 'MARGE') ? '#0000ff' : (t === 'CA') ? '#1a7e1a' : '#d10000';
                                return '<span style="color:' + c + ';font-weight:bold">' + Ext.util.Format.number(v, '0,000.') + '</span>';
                            }},
                        {header: "Chiffre d'Affaires", dataIndex: 'chiffreAffaires', flex: 1, align: 'right', renderer: moneyRenderer},
                        {header: 'Marge', dataIndex: 'marge', flex: 1, align: 'right', renderer: moneyRenderer}
                    ],
                    selModel: {selType: 'cellmodel'},
                    bbar: {xtype: 'pagingtoolbar', store: data, dock: 'bottom', displayInfo: true}
                }
            ]
        });

        me.callParent(arguments);
    }
});
