/* global Ext */

Ext.define('testextjs.view.caisseManager.Cashmovement', {
    extend: 'Ext.panel.Panel',
    xtype: 'cashmovements',
    frame: true,
    title: 'Liste des mouvements',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var storeTypeMvt = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.TypeEcartMvt',
            autoLoad: true,
            pageSize: 999999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/typeMvtCaisse/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            },
            listeners: {
                /* seuls ces types sont listes dans les mouvements de caisse */
                load: function (store) {
                    store.filterBy(function (rec) {
                        return ['1', '2', '3', '4', '5'].indexOf(rec.get('lg_TYPE_MVT_CAISSE_ID')) !== -1;
                    });
                }
            }
        });
        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/users',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var store = Ext.create('Ext.data.Store', {
             idProperty: 'id',
            filds: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'typeMouvement',
                    type: 'string'
                },
                {
                    name: 'typeMvt',
                    type: 'string'
                },
                {
                    name: 'reference',
                    type: 'string'
                },
                {
                    name: 'operateur',
                    type: 'string'
                },
                {
                    name: 'operateurId',
                    type: 'string'
                },
                {
                    name: 'client',
                    type: 'string'
                },
                {
                    name: 'montant',
                    type: 'number'
                },
                {
                    name: 'modeReglement',
                    type: 'string'
                },
                {
                    name: 'modeRegle',
                    type: 'string'
                },
                {
                    name: 'taskDate',
                    type: 'string'
                },
                {
                    name: 'taskHeure',
                    type: 'string'
                },
                {
                    name: 'numeroComptable',
                    type: 'string'
                }

            ],
            autoLoad: false,
            pageSize: 25,
            proxy: {
                type: 'ajax',
                url: '../api/v1/caisse/mvtcaisses',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                }

            }
        });



        var me = this;
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
                             value: new Date(),
                            format: 'd/m/Y'

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

                        },
                        '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Type',
                            itemId: 'typeMvt',
                            store: storeTypeMvt,
                            valueField: 'lg_TYPE_MVT_CAISSE_ID',
                            displayField: 'str_NAME',
                            queryMode: 'local',
                            editable: false,
                            flex: 1.5,
                            labelWidth: 35,
                            emptyText: 'Tous les types...',
                            triggerAction: 'all'
                        }, '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Utilisateur',
                            itemId: 'user',
                            store: storeUser,
                            pageSize: 10,
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            typeAhead: false,
                            flex: 2,
                            minChars: 2,
                            labelWidth: 60,
                            queryMode: 'remote',
                            emptyText: 'Choisir un utilisateur...'

                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-', {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }
                    ]
                }

            ],
            items: [
                {
                    /*tools: [{
                     type: 'refresh',
                     tooltip: 'Actualiser'
                     }],*/
                  xtype:'gridpanel',
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {
                            header: 'Type Mouvement',
                            dataIndex: 'typeMouvement',
                            flex: 1
                        }, {
                            header: 'Numéro.Comptable',
                            dataIndex: 'numeroComptable',
                            flex: 1
                        }
                        , {
                            header: 'Reference',
                            dataIndex: 'reference',
                            flex: 1
                        }
                        , {
                            header: 'Opérateur',
                            dataIndex: 'operateur',
                            flex: 1
                        }

                        , {
                            header: 'Date',
                            dataIndex: 'taskDate',
                            flex: 0.7
                        }, {

                            header: 'Heure',
                            dataIndex: 'taskHeure',
                            flex: 0.7

                        }, {
                            header: 'Mode.R&egrave;gelement',
                            dataIndex: 'modeReglement',
                            flex: 1
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Montant',
                            dataIndex: 'montant',
                            flex: 1,
                            align: 'right',
                            renderer: function (v, metaData, record) {
                                if (v < 0) {
                                    metaData['style'] = 'color:red;';
                                    v = Ext.util.Format.number((-1) * v, '0,000.');
                                    return '-' + v;
                                } else {

                                    return Ext.util.Format.number(v, '0,000.');

                                }

                            }
                        }],

                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        pageSize: 25,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }

            ]

        });
        me.callParent(arguments);
    }
});


