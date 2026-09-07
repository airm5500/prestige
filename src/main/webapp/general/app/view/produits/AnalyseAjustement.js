/* global Ext */

/**
 * Onglet "Analyse Ajustement de stock" : suivi des produits les plus ajustes
 * sur une periode, avec export CSV/Excel, creation de suggestion/inventaire
 * et impression.
 */
Ext.define('testextjs.view.produits.AnalyseAjustement', {
    extend: 'Ext.panel.Panel',
    xtype: 'analyseajustement',

    frame: true,
    title: 'Analyse Ajustement de stock',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var me = this;
        var premierDuMois = Ext.Date.getFirstDateOfMonth(new Date());
        var store = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'familleId', type: 'string'},
                {name: 'grossisteId', type: 'string'},
                {name: 'cip', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'nbAjustement', type: 'number'},
                {name: 'qtePositive', type: 'number'},
                {name: 'qteNegative', type: 'number'},
                {name: 'qteTotale', type: 'number'}
            ],
            autoLoad: false,
            pageSize: 20,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ajustement/analyse',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        me.analyseStore = store;

        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: premierDuMois
                        }, '-', {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()
                        }, '-', {
                            xtype: 'combobox',
                            itemId: 'motifCombo',
                            emptyText: 'Tous les motifs',
                            flex: 1,
                            valueField: 'id',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            store: Ext.create('Ext.data.Store', {
                                fields: ['id', 'libelle'],
                                autoLoad: true,
                                proxy: {
                                    type: 'ajax',
                                    url: '../api/v1/common/type-ajustements',
                                    reader: {type: 'json', root: 'data'}
                                },
                                listeners: {
                                    load: function (s) {
                                        // choix "Tous" en tete de liste
                                        s.insert(0, {id: '', libelle: 'Tous les motifs'});
                                    }
                                }
                            })
                        }, '-', {
                            text: 'Sortir la liste',
                            tooltip: 'Sortir la liste des produits les plus ajust&eacute;s sur la p&eacute;riode',
                            itemId: 'rechercher',
                            iconCls: 'searchicon',
                            scope: me,
                            handler: me.onRechercher
                        }, '-', {
                            text: 'CSV',
                            itemId: 'exportCsv',
                            iconCls: 'export_csv_icon',
                            tooltip: 'Exporter en CSV',
                            scope: me,
                            handler: me.onExportCsv
                        }, {
                            text: 'Excel',
                            itemId: 'exportExcel',
                            iconCls: 'export_excel_icon',
                            tooltip: 'Exporter en Excel',
                            scope: me,
                            handler: me.onExportExcel
                        }, '-', {
                            text: 'Suggestion',
                            itemId: 'creerSuggestion',
                            iconCls: 'addicon',
                            tooltip: 'Cr&eacute;er une suggestion avec cette liste',
                            scope: me,
                            handler: me.onCreerSuggestion
                        }, {
                            text: 'Inventaire',
                            itemId: 'creerInventaire',
                            iconCls: 'addicon',
                            tooltip: 'Cr&eacute;er un inventaire avec cette liste',
                            scope: me,
                            handler: me.onCreerInventaire
                        }, '-', {
                            text: 'Imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'Imprimer la liste',
                            scope: me,
                            handler: me.onImprimer
                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'gridpanel',
                    itemId: 'analyseGrid',
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 45
                        }, {
                            header: 'CIP',
                            dataIndex: 'cip',
                            flex: 0.8
                        }, {
                            header: 'D&eacute;signation',
                            dataIndex: 'name',
                            flex: 2.5
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Nb ajustements',
                            dataIndex: 'nbAjustement',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.8
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Qt&eacute; augment&eacute;e',
                            dataIndex: 'qtePositive',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.8,
                            renderer: function (v, metaData) {
                                metaData.style = 'color:green;font-weight:600;';
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Qt&eacute; diminu&eacute;e',
                            dataIndex: 'qteNegative',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.8,
                            renderer: function (v, metaData) {
                                metaData.style = 'color:red;font-weight:600;';
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Qt&eacute; totale ajust&eacute;e',
                            dataIndex: 'qteTotale',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.9,
                            renderer: function (v, metaData) {
                                // vert si positif, rouge si negatif, orange si nul
                                var couleur = v > 0 ? 'green' : (v < 0 ? 'red' : 'orange');
                                metaData.style = 'font-weight:700;color:' + couleur + ';';
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/grid.png',
                                    tooltip: 'Voir le d&eacute;tail des ajustements de ce produit sur la p&eacute;riode',
                                    scope: me,
                                    handler: function (grid, rowIndex) {
                                        me.onDetailProduitClick(grid, rowIndex);
                                    }
                                }]
                        }
                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        pageSize: 20,
                        dock: 'bottom',
                        displayInfo: true
                    }
                }
            ]
        });
        me.callParent(arguments);

        store.on('beforeload', function (s) {
            var proxy = s.getProxy();
            proxy.setExtraParam('dtStart', me.down('#dtStart').getSubmitValue());
            proxy.setExtraParam('dtEnd', me.down('#dtEnd').getSubmitValue());
            proxy.setExtraParam('motifId', me.getMotifId());
        });
        me.on('afterrender', function () {
            store.load();
        }, me, {single: true, delay: 1});
    },
    getMotifId: function () {
        var v = this.down('#motifCombo').getValue();
        return (v === null || v === undefined) ? '' : v;
    },
    buildParams: function () {
        var me = this;
        return 'dtStart=' + me.down('#dtStart').getSubmitValue() + '&dtEnd=' + me.down('#dtEnd').getSubmitValue()
                + '&motifId=' + encodeURIComponent(me.getMotifId());
    },
    onRechercher: function () {
        this.analyseStore.loadPage(1);
    },
    onDetailProduitClick: function (grid, rowIndex) {
        var me = this;
        var rec = grid.getStore().getAt(rowIndex);
        var dtStart = me.down('#dtStart').getSubmitValue();
        var dtEnd = me.down('#dtEnd').getSubmitValue();

        var detailStore = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'dateAjustement', type: 'string'},
                {name: 'heure', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'motif', type: 'string'},
                {name: 'operateur', type: 'string'},
                {name: 'stockAvant', type: 'number'},
                {name: 'quantite', type: 'number'},
                {name: 'stockApres', type: 'number'}
            ],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ajustement/analyse/details',
                extraParams: {
                    familleId: rec.get('familleId'),
                    dtStart: dtStart,
                    dtEnd: dtEnd,
                    motifId: me.getMotifId()
                },
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var win = Ext.create('Ext.window.Window', {
            title: 'Ajustements de [' + rec.get('name') + '] du '
                    + Ext.Date.format(me.down('#dtStart').getValue(), 'd/m/Y') + ' au '
                    + Ext.Date.format(me.down('#dtEnd').getValue(), 'd/m/Y'),
            width: 950,
            height: 500,
            layout: 'fit',
            maximizable: true,
            modal: true,
            items: [{
                    xtype: 'gridpanel',
                    store: detailStore,
                    viewConfig: {
                        forceFit: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {xtype: 'rownumberer', text: 'LG', width: 40},
                        {header: 'Date', dataIndex: 'dateAjustement', align: 'center', flex: 0.7},
                        {header: 'Heure', dataIndex: 'heure', align: 'center', flex: 0.5},
                        {header: 'Ajustement', dataIndex: 'libelle', flex: 1.3},
                        {header: 'Motif', dataIndex: 'motif', flex: 1},
                        {header: 'Op&eacute;rateur', dataIndex: 'operateur', flex: 1},
                        {
                            xtype: 'numbercolumn',
                            header: 'Stock avant',
                            dataIndex: 'stockAvant',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.7
                        },
                        {
                            header: 'Quantit&eacute;',
                            dataIndex: 'quantite',
                            align: 'right',
                            flex: 0.7,
                            renderer: function (v) {
                                var style = v < 0 ? 'color:red;font-weight:700;' : 'color:green;font-weight:700;';
                                var txt = v > 0 ? '+' + Ext.util.Format.number(v, '0,000.')
                                        : Ext.util.Format.number(v, '0,000.');
                                return '<span style="' + style + '">' + txt + '</span>';
                            }
                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Stock apr&egrave;s',
                            dataIndex: 'stockApres',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.7
                        }
                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: detailStore,
                        pageSize: 20,
                        displayInfo: true
                    }
                }]
        });
        win.show();
        detailStore.load();
    },
    onExportCsv: function () {
        window.location = '../api/v1/ajustement/analyse/csv?' + this.buildParams();
    },
    onExportExcel: function () {
        window.location = '../api/v1/ajustement/analyse/excel?' + this.buildParams();
    },
    onImprimer: function () {
        window.open('../api/v1/ajustement/analyse/pdf?' + this.buildParams());
    },
    onCreerSuggestion: function () {
        var me = this;
        Ext.MessageBox.confirm('Message',
                'Cr&eacute;er une suggestion avec les produits ajust&eacute;s sur la p&eacute;riode ?',
                function (btn) {
                    if (btn === 'yes') {
                        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                        Ext.Ajax.request({
                            method: 'GET',
                            url: '../api/v1/ajustement/analyse/suggestion?' + me.buildParams(),
                            success: function (response) {
                                progress.hide();
                                var result = Ext.JSON.decode(response.responseText, true);
                                if (result && result.success) {
                                    Ext.MessageBox.alert('Confirmation',
                                            'Suggestion cr&eacute;&eacute;e : ' + result.count + ' produit(s).');
                                } else {
                                    Ext.MessageBox.alert('Message', 'Aucune suggestion cr&eacute;&eacute;e.');
                                }
                            },
                            failure: function (response) {
                                progress.hide();
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                });
    },
    onCreerInventaire: function () {
        var me = this;
        Ext.MessageBox.confirm('Message',
                'Cr&eacute;er un inventaire avec les produits ajust&eacute;s sur la p&eacute;riode ?',
                function (btn) {
                    if (btn === 'yes') {
                        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                        Ext.Ajax.request({
                            method: 'GET',
                            url: '../api/v1/ajustement/analyse/inventaire?' + me.buildParams(),
                            success: function (response) {
                                progress.hide();
                                var result = Ext.JSON.decode(response.responseText, true);
                                if (result && result.success) {
                                    Ext.MessageBox.alert('Confirmation',
                                            'Inventaire cr&eacute;&eacute; : ' + result.count + ' produit(s).');
                                } else {
                                    Ext.MessageBox.alert('Message', 'Aucun inventaire cr&eacute;&eacute;.');
                                }
                            },
                            failure: function (response) {
                                progress.hide();
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                });
    }
});
