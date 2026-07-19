
/* global Ext */

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.configmanagement.logfile.logGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.logfile-grid',
    requires: [
        'testextjs.store.Statistics.logStore',
        'testextjs.model.caisse.User'
    ],
    initComponent: function () {
        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 100,
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
            fields: [
                {
                    name: 'dtCREATED', type: 'string'
                },
                {
                    name: 'HEURE', type: 'string'
                },
                {
                    name: 'strDESCRIPTION', type: 'string'
                },
                {
                    name: 'typeLog', type: 'string'
                },
                {
                    name: 'userFullName', type: 'string'
                },
                {
                    name: 'strTYPELOG', type: 'string'
                }
            ],
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/logs',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000

            }
        });

        var filters = Ext.create('Ext.data.Store', {
            fields: [
                {
                    name: 'order', type: 'number'
                },
                {
                    name: 'strDESCRIPTION', type: 'string'
                }

            ],
            autoLoad: false,
            pageSize: 999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/log-filtres',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        store.load();
        Ext.apply(this, {

            id: 'logfileGrid',
            store: store,
            viewConfig: {
                forceFit: true,
                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
            },

            features: [
                {
                    ftype: 'rowbody',
                    getAdditionalData: function (data) {
                        return {
                            rowBody: "<p style='margin-left:5%;font-size:14px;font-weight:700;'>" + data.strDESCRIPTION + "</p>",
                            rowBodyColspan: 3
                        };
                    }
                }],

            columns: [

                {
                    header: 'ACTION',
                    dataIndex: 'typeLog',
                    flex: 1

                },

                {
                    header: 'DATE',
                    dataIndex: 'dtCREATED',
                    flex: 0.8

                },
                {
                    header: 'HEURE',
                    dataIndex: 'HEURE',
                    flex: 0.6

                },

                {
                    header: 'Opérateur',
                    dataIndex: 'userFullName',
                    flex: 1

                }

            ],
            selModel: {
                selType: 'cellmodel'
            },
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            id: 'dt_log_start',
                            labelWidth: 15,
                            flex: 1,
                            emptyText: 'Du',
                            value: new Date(),
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'



                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            id: 'dt_end_log',
                            labelWidth: 15,
                            flex: 1,
                            emptyText: 'Au',
                            submitFormat: 'Y-m-d',
                            value: new Date(),
                            format: 'd/m/Y'



                        }

                        , {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'textfield',
                            id: 'rechlog',
                            flex: 0.8,
                            emptyText: 'Recherche',
                            listeners: {
                                specialKey: function (field, e, Familletion) {
                                    if (e.getKey() === e.ENTER) {
                                        var grid = Ext.getCmp('logfileGrid');
                                        var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                                        var cmbousers = Ext.getCmp('cmbousers').getValue();
                                        if (!cmbologfile && cmbologfile == null) {
                                            cmbologfile = -1;
                                        }
                                        grid.getStore().load({
                                            params: {
                                                query: Ext.getCmp('rechlog').getValue(),
                                                criteria: cmbologfile,
                                                dtEnd: Ext.getCmp('dt_end_log').getSubmitValue(),
                                                dtStart: Ext.getCmp('dt_log_start').getSubmitValue(),
                                                userId: cmbousers
                                            }
                                        });
                                    }

                                }
                            }
                        }, {
                            xtype: 'tbseparator'
                        }
                        ,
                        {
                            xtype: 'combo',
                            emptyText: 'Actions',
//                    fieldLabel: 'Action',
                            labelWidth: 50,
                            flex: 1.5,
                            id: 'cmbologfile',
                            valueField: 'order',
                            displayField: 'strDESCRIPTION',
                            store: filters,
                            listeners: {
                                select: function (cmp) {
                                    var grid = Ext.getCmp('logfileGrid');
                                    var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                                    var cmbousers = Ext.getCmp('cmbousers').getValue();
                                    if (!cmbologfile && cmbologfile == null) {
                                        cmbologfile = -1;
                                    }
                                    grid.getStore().load({
                                        params: {
                                            query: Ext.getCmp('rechlog').getValue(),
                                            criteria: cmbologfile,
                                            dtEnd: Ext.getCmp('dt_end_log').getSubmitValue(),
                                            dtStart: Ext.getCmp('dt_log_start').getSubmitValue(),
                                            userId: cmbousers
                                        }
                                    });
                                }
                            }

                        }
                        ,
                        {
                            xtype: 'combo',
                            emptyText: 'Sélectionner un utilisateur',
                            flex: 1.5,
                            id: 'cmbousers',
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            pageSize: null,
                            store: storeUser,

                            listeners: {
                                select: function (cmp) {
                                    var grid = Ext.getCmp('logfileGrid');
                                    var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                                    var cmbousers = Ext.getCmp('cmbousers').getValue();
                                    if (!cmbologfile && cmbologfile == null) {
                                        cmbologfile = -1;
                                    }
                                    grid.getStore().load({
                                        params: {
                                            query: Ext.getCmp('rechlog').getValue(),
                                            criteria: cmbologfile,
                                            dtEnd: Ext.getCmp('dt_end_log').getSubmitValue(),
                                            dtStart: Ext.getCmp('dt_log_start').getSubmitValue(),
                                            userId: cmbousers
                                        }
                                    });
                                }
                            }

                        }

                        , {
                            xtype: 'tbseparator'
                        },
                        {
                            // flex: 0.4,
                            width: 95,
                            xtype: 'button',
                            iconCls: 'searchicon',
                            text: 'Rechercher',
                            listeners: {
                                click: function () {
                                    var grid = Ext.getCmp('logfileGrid');
                                    var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                                    var cmbousers = Ext.getCmp('cmbousers').getValue();
                                    if (!cmbologfile && cmbologfile == null) {
                                        cmbologfile = -1;
                                    }


                                    grid.getStore().load({
                                        params: {
                                            query: Ext.getCmp('rechlog').getValue(),
                                            criteria: cmbologfile,
                                            dtEnd: Ext.getCmp('dt_end_log').getSubmitValue(),
                                            dtStart: Ext.getCmp('dt_log_start').getSubmitValue(),
                                            userId: cmbousers
                                        }
                                    });
                                }
                            }


                        }, {
                            xtype: 'tbseparator'
                        }
                        ,
                        {
                            width: 85,
                            xtype: 'button',
                            text: 'Imprimer',
                            iconCls: 'printable',
//                    glyph: 0xf1c1,
                            listeners: {
                                click: function () {

                                    var rech = Ext.getCmp('rechlog').getValue();
                                    var user = Ext.getCmp('cmbousers').getValue();

                                    var dt_end = Ext.getCmp('dt_end_log').getSubmitValue(),
                                            dt_start = Ext.getCmp('dt_log_start').getSubmitValue();
                                    var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                                    if (cmbologfile == null) {
                                        cmbologfile = -1;
                                    }

                                    if (user == null) {
                                        user = '';
                                    }
                                    // parametres encodes : espaces, accents et & dans la recherche
                                    var linkUrl = '../FacturePdfServlet?' + Ext.Object.toQueryString({
                                        mode: 'LOG',
                                        dtStart: dt_start,
                                        dtEnd: dt_end,
                                        userId: user,
                                        criteria: cmbologfile,
                                        query: rech || ''
                                    });
                                    window.open(linkUrl);

                                }
                            }


                        }


                    ]
                },

                {
                    xtype: 'pagingtoolbar',
                    store: store,
                    pageSize: 15,
                    dock: 'bottom',
                    displayInfo: true,

                    listeners: {
                        beforechange: function (page, currentPage) {
                            var myProxy = this.store.getProxy();
                            myProxy.params = {
                                dtStart: '',
                                query: '',
                                dtEnd: '',
                                criteria: -1,
                                userId: ''
                            };

                            var rech = Ext.getCmp('rechlog').getValue();
                            var user = Ext.getCmp('cmbousers').getValue();

                            var dt_end = Ext.getCmp('dt_end_log').getSubmitValue(),
                                    dt_start = Ext.getCmp('dt_log_start').getSubmitValue();
                            var cmbologfile = Ext.getCmp('cmbologfile').getValue();
                            // 0 (Deconditionnement) est une valeur valide : ne pas la remplacer par -1
                            if (cmbologfile == null) {
                                cmbologfile = -1;
                            }


                            myProxy.setExtraParam('dtEnd', dt_end);
                            myProxy.setExtraParam('dtStart', dt_start);
                            myProxy.setExtraParam('criteria', cmbologfile);
                            myProxy.setExtraParam('query', rech);
                            myProxy.setExtraParam('userId', user);


                        }

                    }
                }]
        });
        this.callParent();
    }
});


