/* global Ext */

/**
 * Suivi de la consommation d'un client par medicament : pour chaque produit
 * achete, derniere date d'achat, quantite moyenne, frequence moyenne de
 * renouvellement, nombre d'achats sur la periode, montant cumule et habitude
 * d'achat (mensuel, bimensuel, ponctuel, dormant).
 */
Ext.define('testextjs.view.configmanagement.client.action.consommationClient', {
    extend: 'Ext.window.Window',
    xtype: 'consommationClient',
    id: 'consommationClientID',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'Ext.grid.*'
    ],
    config: {
        odatasource: '',
        parentview: '',
        titre: ''
    },
    initComponent: function () {
        var me = this;
        var clientId = this.getOdatasource().lg_CLIENT_ID;
        var unAnAvant = Ext.Date.add(new Date(), Ext.Date.MONTH, -12);

        var store = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'familleId', type: 'string'},
                {name: 'cip', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'premierAchat', type: 'string'},
                {name: 'dernierAchat', type: 'string'},
                {name: 'nbAchats', type: 'number'},
                {name: 'qteTotale', type: 'number'},
                {name: 'qteMoyenne', type: 'number'},
                {name: 'frequenceJours', type: 'number'},
                {name: 'montant', type: 'number'},
                {name: 'habitude', type: 'string'}
            ],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/consommation',
                extraParams: {
                    clientId: clientId
                },
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        me.consoStore = store;

        Ext.apply(me, {
            title: this.getTitre(),
            width: 1000,
            height: 560,
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
                                    emptyText: 'Produit (nom ou CIP)',
                                    enableKeyEvents: true,
                                    listeners: {
                                        specialkey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                me.doSearch();
                                            }
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
                        }
                    ],
                    columns: [
                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 40
                        }, {
                            header: 'CIP',
                            dataIndex: 'cip',
                            flex: 0.7
                        }, {
                            header: 'Produit',
                            dataIndex: 'name',
                            flex: 2
                        }, {
                            header: 'Dernier achat',
                            dataIndex: 'dernierAchat',
                            align: 'center',
                            flex: 0.8,
                            renderer: function (v) {
                                return v ? Ext.Date.format(Ext.Date.parse(v, 'Y-m-d'), 'd/m/Y') : '';
                            }
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Nb achats',
                            dataIndex: 'nbAchats',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.6
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Qt&eacute; moyenne',
                            dataIndex: 'qteMoyenne',
                            format: '0,000.00',
                            align: 'right',
                            flex: 0.7
                        }, {
                            header: 'Fr&eacute;quence renouv.',
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
                            xtype: 'numbercolumn',
                            header: 'Montant cumul&eacute;',
                            dataIndex: 'montant',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.8
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
        });
        me.on('afterrender', function () {
            store.load();
        }, me, {single: true, delay: 1});
    },
    doSearch: function () {
        this.consoStore.loadPage(1);
    }
});
