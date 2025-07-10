/* global Ext */

Ext.define('testextjs.view.notification.Notification', {
    extend: 'Ext.panel.Panel',
    xtype: 'menunotification',
    frame: true,
    title: 'Notifications',
    iconCls: 'icon-grid',
    width: '95%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        /*
         var typeTp = Ext.create('Ext.data.Store', {
         autoLoad: true,
         fields: ['value', 'name', "code"],
         data: [
         {"value": "1", "name": "Assurance", "code": '01'},
         {"value": "2", "name": "Carnet", "code": '02'}
         ]
         });
         */
        const dataStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {
                            name: 'id',
                            type: 'string'
                        },
                        {
                            name: 'message',
                            type: 'string'
                        }
                        ,
                        {
                            name: 'statut',
                            type: 'string'
                        },
                        {
                            name: 'canal',
                            type: 'string'
                        },
                        {
                            name: 'typeNotification',
                            type: 'string'
                        }
                        ,
                        {
                            name: 'modfiedAt',
                            type: 'string'
                        },
                        {
                            name: 'userTo',
                            type: 'string'
                        }
                        ,
                        {
                            name: 'clients',
                            type: 'auto'
                        }, {
                            name: 'resume',
                            type: 'string'
                        }


                    ],
            autoLoad: false,
            pageSize: 18,

            proxy: {
                type: 'ajax',
                url: '../api/v1/notifications/all',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }


            }
        });
        const canalStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: true,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/notifications/canaux',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        const typesNotification = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: true,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/notifications/types',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        const me = this;
        Ext.applyIf(me, {
            dockedItems: [

                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            text: 'Nouveau',
                            scope: this,
                            itemId: 'addBtn',
                            iconCls: 'addicon'

                        }, {
                            xtype: 'tbseparator'
                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            submitFormat: 'Y-m-d',

                            labelWidth: 17,
                            format: 'd/m/Y'

                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 17,

                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        }
                        ,
                        {xtype: 'tbseparator'},
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type',
                            itemId: 'typeNotification',
                            store: typesNotification,
                            forceselection: true,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            flex: 1,

                            triggerAction: 'all',
                            queryMode: 'local',
                            labelWidth: 40,
                            enableKeyEvents: true,
                            emptyText: 'Choisir un type...'

                        }, {xtype: 'tbseparator'},
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Canal',
                            itemId: 'canal',
                            store: canalStore,
                            forceselection: true,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            flex: 1,
                            triggerAction: 'all',
                            queryMode: 'local',
                            labelWidth: 40,
                            enableKeyEvents: true,
                            emptyText: 'Choisir un canal...'

                        }, {xtype: 'tbseparator'},
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',

                    store: dataStore,

                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [

                        {
                            header: 'message',
                            dataIndex: 'message',
                            flex: 2

                        },
                        {
                            header: 'Canal',
                            dataIndex: 'canal',
                            flex: 0.2

                        },
                        {
                            header: 'Date',
                            dataIndex: 'modfiedAt',
                            flex: 0.4

                        },
                        {
                            header: 'type Notification',
                            dataIndex: 'typeNotification',
                            flex: 0.6

                        },
                        {
                            header: 'Destinataire',
                            flex: 1,
                            dataIndex: 'userTo',
                            renderer: function (v, m, r) {
                                const data = r.data;
                                let user = v;

                                if (user !== '') {
                                    return user;
                                } else if (data.clients.length > 0) {

                                    Ext.each(data.clients, function (us) {
                                        user += us.firstName + " " + us.lastName + " au " + us.clientPhone + "<br>";

                                    });
                                }

                                return user;

                            }

                        }

                        /* , {
                         xtype: 'actioncolumn',
                         width: 30,
                         sortable: false,
                         menuDisabled: true,
                         
                         items: [{
                         icon: 'resources/images/icons/fam/rss_go.png',
                         tooltip: 'Renvoyer',
                         menuDisabled: true,
                         handler: function (view, rowIndex, colIndex, item, e, record, row) {
                         this.fireEvent('editer', view, rowIndex, colIndex, item, e, record, row);
                         }
                         
                         }]
                         }*/
                    ],
                    selModel: {
                        selType: 'cellmodel'

                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: dataStore,
                        dock: 'bottom',
                        pageSize: 15,
                        displayInfo: true

                    }
                }]

        });
        me.callParent(arguments);
    }
});


