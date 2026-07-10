/* global Ext */

/**
 * Suivi global de la consommation des clients : pour chaque client ayant
 * achete sur la periode, nombre d'achats, montant cumule, dernier achat,
 * frequence moyenne d'achat et habitude (mensuel, bimensuel, ponctuel,
 * dormant), avec filtres, exports CSV/Excel et impressions (liste globale
 * et fiche par client).
 */
Ext.define('testextjs.view.configmanagement.client.action.consommationClients', {
    extend: 'Ext.window.Window',
    xtype: 'consommationClients',
    id: 'consommationClientsID',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'Ext.grid.*',
        'testextjs.view.configmanagement.client.action.consommationClient'
    ],
    config: {
        parentview: ''
    },
    initComponent: function () {
        var me = this;
        var unAnAvant = Ext.Date.add(new Date(), Ext.Date.MONTH, -12);

        var storeHabitude = Ext.create('Ext.data.Store', {
            fields: ['value', 'libelle'],
            data: [
                {value: '', libelle: 'Toutes les habitudes'},
                {value: 'Mensuel', libelle: 'Mensuel'},
                {value: 'Bimensuel', libelle: 'Bimensuel'},
                {value: 'Ponctuel', libelle: 'Ponctuel'},
                {value: 'Dormant', libelle: 'Dormant'}
            ]
        });

        var store = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'clientId', type: 'string'},
                {name: 'client', type: 'string'},
                {name: 'nbAchats', type: 'number'},
                {name: 'montant', type: 'number'},
                {name: 'dernierAchat', type: 'string'},
                {name: 'premierAchat', type: 'string'},
                {name: 'frequenceJours', type: 'number'},
                {name: 'habitude', type: 'string'}
            ],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/consommation/globale',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        me.consoStore = store;

        Ext.apply(me, {
            title: 'Suivi de consommation des clients',
            width: 1100,
            height: 600,
            layout: 'fit',
            autoShow: true,
            items: [
                {
                    xtype: 'gridpanel',
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    itemId: 'dtStart',
                                    labelWidth: 20,
                                    flex: 1,
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    format: 'd/m/Y',
                                    value: unAnAvant
                                }, '-', {
                                    xtype: 'datefield',
                                    fieldLabel: 'Au',
                                    itemId: 'dtEnd',
                                    labelWidth: 20,
                                    flex: 1,
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    format: 'd/m/Y',
                                    value: new Date()
                                }, '-', {
                                    xtype: 'textfield',
                                    itemId: 'query',
                                    flex: 1,
                                    emptyText: 'Nom du client',
                                    enableKeyEvents: true,
                                    listeners: {
                                        specialkey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                me.doSearch();
                                            }
                                        }
                                    }
                                }, '-', {
                                    xtype: 'combobox',
                                    itemId: 'habitude',
                                    flex: 1,
                                    store: storeHabitude,
                                    valueField: 'value',
                                    displayField: 'libelle',
                                    queryMode: 'local',
                                    editable: false,
                                    emptyText: 'Toutes les habitudes',
                                    listeners: {
                                        select: function () {
                                            me.doSearch();
                                        }
                                    }
                                }, '-', {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    iconCls: 'searchicon',
                                    handler: function () {
                                        me.doSearch();
                                    }
                                }
                            ]
                        },
                        {
                            xtype: 'toolbar',
                            dock: 'bottom',
                            ui: 'footer',
                            items: ['->', {
                                    text: 'Exporter CSV',
                                    tooltip: 'Exporter la liste en CSV',
                                    iconCls: 'export_csv_icon',
                                    handler: function () {
                                        window.location = '../api/v1/client/consommation/globale/csv?' + me.buildParams();
                                    }
                                }, {
                                    text: 'Exporter EXCEL',
                                    tooltip: 'Exporter la liste en Excel',
                                    iconCls: 'export_excel_icon',
                                    handler: function () {
                                        window.location = '../api/v1/client/consommation/globale/excel?' + me.buildParams();
                                    }
                                }, {
                                    text: 'Imprimer',
                                    tooltip: 'Imprimer la liste',
                                    iconCls: 'printable',
                                    handler: function () {
                                        window.open('../api/v1/client/consommation/globale/pdf?' + me.buildParams());
                                    }
                                }]
                        }
                    ],
                    columns: [
                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 40
                        }, {
                            header: 'Client',
                            dataIndex: 'client',
                            flex: 2
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Nb achats',
                            dataIndex: 'nbAchats',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.6
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Montant cumul&eacute;',
                            dataIndex: 'montant',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.9,
                            renderer: function (v, metaData) {
                                metaData.style = 'font-weight:700;';
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        }, {
                            header: 'Dernier achat',
                            dataIndex: 'dernierAchat',
                            align: 'center',
                            flex: 0.8
                        }, {
                            header: 'Fr&eacute;quence achat',
                            dataIndex: 'frequenceJours',
                            align: 'right',
                            flex: 0.8,
                            renderer: function (v, metaData, record) {
                                if (record.get('nbAchats') < 2) {
                                    return '-';
                                }
                                return Ext.util.Format.number(v, '0,000.') + ' jour(s)';
                            }
                        }, {
                            header: 'Habitude',
                            dataIndex: 'habitude',
                            align: 'center',
                            flex: 0.7,
                            renderer: function (v) {
                                var colors = {
                                    'Mensuel': '#2E7D32',
                                    'Bimensuel': '#0D47A1',
                                    'Ponctuel': '#E65100',
                                    'Dormant': '#9E9E9E'
                                };
                                var color = colors[v] || '#333';
                                return '<span style="color:' + color + ';font-weight:700;">' + v + '</span>';
                            }
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/chart_bar.png',
                                    tooltip: 'Voir la consommation par m&eacute;dicament',
                                    scope: me,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);
                                        new testextjs.view.configmanagement.client.action.consommationClient({
                                            odatasource: {lg_CLIENT_ID: rec.get('clientId')},
                                            parentview: me,
                                            titre: "Suivi de consommation : [" + rec.get('client') + "]"
                                        });
                                    }
                                }]
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Imprimer la fiche de consommation de ce client',
                                    scope: me,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);
                                        window.open('../api/v1/client/consommation/pdf?clientId=' + rec.get('clientId')
                                                + '&dtStart=' + me.down('#dtStart').getSubmitValue()
                                                + '&dtEnd=' + me.down('#dtEnd').getSubmitValue());
                                    }
                                }]
                        }
                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        pageSize: 20,
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
            proxy.setExtraParam('query', me.down('#query').getValue());
            proxy.setExtraParam('habitude', me.down('#habitude').getValue() || '');
        });
        me.on('afterrender', function () {
            store.load();
        }, me, {single: true, delay: 1});
    },
    buildParams: function () {
        var me = this;
        return 'dtStart=' + me.down('#dtStart').getSubmitValue()
                + '&dtEnd=' + me.down('#dtEnd').getSubmitValue()
                + '&query=' + encodeURIComponent(me.down('#query').getValue() || '')
                + '&habitude=' + encodeURIComponent(me.down('#habitude').getValue() || '');
    },
    doSearch: function () {
        this.consoStore.loadPage(1);
    }
});
