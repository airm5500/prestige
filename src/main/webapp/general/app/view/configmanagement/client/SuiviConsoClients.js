/* global Ext */

/**
 * Onglet "Suivi de consommation" de la gestion des clients : pour chaque
 * client ayant achete sur la periode, nombre d'achats, montant cumule,
 * dernier achat, frequence moyenne d'achat, contact et habitude (mensuel,
 * bimensuel, ponctuel, dormant), avec filtres (periode, client, type de
 * client, habitude, tri), exports CSV/Excel et impressions (liste globale
 * et fiche par client).
 */
Ext.define('testextjs.view.configmanagement.client.SuiviConsoClients', {
    extend: 'Ext.panel.Panel',
    xtype: 'suiviconsoclients',
    requires: [
        'testextjs.view.configmanagement.client.action.consommationClient'
    ],

    frame: true,
    title: 'Suivi de consommation',
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

        var storeTri = Ext.create('Ext.data.Store', {
            fields: ['value', 'libelle'],
            data: [
                {value: 'montant', libelle: 'Montant d\'achat'},
                {value: 'nbAchats', libelle: 'Nombre d\'achats'}
            ]
        });

        /* types de tiers payant (assurance, carnet...) + choix 'Clients standards' */
        var storeTypeClient = Ext.create('Ext.data.Store', {
            fields: ['lg_TYPE_TIERS_PAYANT_ID', 'str_LIBELLE_TYPE_TIERS_PAYANT'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            listeners: {
                load: function (store) {
                    store.insert(0, [
                        {lg_TYPE_TIERS_PAYANT_ID: '', str_LIBELLE_TYPE_TIERS_PAYANT: 'Tous les clients'},
                        {lg_TYPE_TIERS_PAYANT_ID: 'STANDARD', str_LIBELLE_TYPE_TIERS_PAYANT: 'Clients standards'}
                    ]);
                }
            }
        });

        var store = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'clientId', type: 'string'},
                {name: 'client', type: 'string'},
                {name: 'contact', type: 'string'},
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
                            itemId: 'typeClient',
                            flex: 1,
                            store: storeTypeClient,
                            valueField: 'lg_TYPE_TIERS_PAYANT_ID',
                            displayField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
                            queryMode: 'local',
                            editable: false,
                            emptyText: 'Tous les clients',
                            listeners: {
                                select: function () {
                                    me.doSearch();
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
                            xtype: 'combobox',
                            fieldLabel: 'Tri',
                            labelWidth: 25,
                            itemId: 'sortBy',
                            flex: 1,
                            store: storeTri,
                            valueField: 'value',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            value: 'montant',
                            listeners: {
                                select: function () {
                                    me.doSearch();
                                }
                            }
                        }, '-', {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            iconCls: 'searchicon',
                            scope: me,
                            handler: me.doSearch
                        }, '-', {
                            text: 'CSV',
                            tooltip: 'Exporter la liste en CSV',
                            iconCls: 'export_csv_icon',
                            handler: function () {
                                window.location = '../api/v1/client/consommation/globale/csv?' + me.buildParams();
                            }
                        }, {
                            text: 'Excel',
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
                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'gridpanel',
                    itemId: 'consoGrid',
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 40
                        }, {
                            header: 'Client',
                            dataIndex: 'client',
                            flex: 1.8
                        }, {
                            header: 'Contact',
                            dataIndex: 'contact',
                            flex: 1.2
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
                                if (v < 1) {
                                    return '&lt; 1 jour';
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
            proxy.setExtraParam('query', me.down('#query').getValue());
            proxy.setExtraParam('habitude', me.down('#habitude').getValue() || '');
            proxy.setExtraParam('typeClient', me.down('#typeClient').getValue() || '');
            proxy.setExtraParam('sortBy', me.down('#sortBy').getValue() || 'montant');
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
                + '&habitude=' + encodeURIComponent(me.down('#habitude').getValue() || '')
                + '&typeClient=' + encodeURIComponent(me.down('#typeClient').getValue() || '')
                + '&sortBy=' + encodeURIComponent(me.down('#sortBy').getValue() || 'montant');
    },
    doSearch: function () {
        this.consoStore.loadPage(1);
    }
});
