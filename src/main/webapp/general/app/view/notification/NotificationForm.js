/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global Ext */

Ext.define('testextjs.view.notification.NotificationForm', {
    extend: 'Ext.window.Window',
    xtype: 'notificationForm',
    autoShow: false,
    width: '70%',
    height: 600,
    modal: true,
    title: 'Menu notification',
    closeAction: 'hide',
    closable: true,
    maximizable: true,
    layout: {
        type: 'fit',
        align: 'stretch'
    },
    config: {
        data: null,
        grid: null,
        selected: []

    },
    initComponent: function () {
        const me = this;
        const clientStore = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.ClientAssurance',
            autoLoad: true,
            pageSize: 10,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });

        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    layout: {
                        pack: 'end',
                        type: 'hbox'
                    },
                    items: [
                        {
                            xtype: 'button',
                            itemId: 'btnAddSave',
                            text: 'Enregistrer',
                            handler: me.onSave
                        },
                        {
                            xtype: 'button',
                            iconCls: 'cancelicon',
                            itemId: 'btnCancel',
                            text: 'Annuler',
                            handler: me.closeWindow

                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'form',
                    bodyPadding: 5,
                    modelValidation: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },

                    items: [
                        {
                            xtype: 'fieldset',
                            collapsible: false,
                            bodyPadding: 5,
                            flex: 0.5,
                            title: '<span style="color:blue;">Notification</span>',
                            layout: {
                                type: 'fit'

                            },
                            items: [
                                {
                                    xtype: 'fieldcontainer',

                                    layout: {type: 'fit'},
                                    items: [

                                        {
                                            xtype: 'textareafield',
                                            grow: true,
                                            labelWidth: 60,
                                            fieldLabel: 'Message',
                                            emptyText: 'Message',
                                            name: 'message',
                                            allowBlank: false

                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            bodyPadding: 5,
                            flex: 1.4,
                            layout: {
                                type: 'fit'

                            },
                            items: [
                                {
                                    xtype: 'fieldset',

                                    collapsible: false,
                                    bodyPadding: 5,
                                    title: '<span style="color:blue;">Clients</span>',

                                    layout: {
                                        type: 'fit'

                                    },
                                    items: [
                                        {
                                            xtype: 'grid',
                                            listeners: {
                                                select: function (_this) {
                                                    me.onSelect(_this);
                                                },
                                                deselect: function (_this) {
                                                    me.onDeselect(_this);
                                                }
                                            },
                                            selModel: {
                                                selType: 'checkboxmodel',
                                                injectCheckbox: 'last',
                                                pruneRemoved: false
                                            },

                                            bbar: {
                                                xtype: 'pagingtoolbar',
                                                store: clientStore,
                                                dock: 'bottom',
                                                pageSize: 10,
                                                displayInfo: true,
                                                listeners: {
                                                    beforechange: function (page, currentPage) {
                                                        const me = this;
                                                        const myProxy = me.store.getProxy();

                                                        myProxy.params = {
                                                            query: null,
                                                            typeClientId: null

                                                        };

                                                        const query = me.up('grid').down('toolbar #query').getValue();
                                                        myProxy.setExtraParam('query', query);

                                                    }

                                                }

                                            },
                                            dockedItems: [
                                                {
                                                    xtype: 'toolbar',
                                                    dock: 'top',
                                                    layout: {
                                                        pack: 'start',
                                                        type: 'hbox'
                                                    },
                                                    items: [
                                                        {
                                                            xtype: 'textfield',
                                                            itemId: 'query',
                                                            height: 30,
                                                            width: 350,
                                                            enableKeyEvents: true,
                                                            emptyText: 'Taper pour rechercher',
                                                            listeners: {
                                                                specialKey: function (field, e, options) {
                                                                    if (e.getKey() === e.ENTER) {
                                                                        me.onSearch(field.getValue());
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            ],

                                            store: clientStore,
                                            columns: [
                                                {
                                                    text: '',
                                                    hidden: true,
                                                    dataIndex: 'lgCLIENTID'
                                                },

                                                {
                                                    text: 'Client',
                                                    flex: 1.2,
                                                    dataIndex: 'fullName'
                                                },
                                                {
                                                    text: 'Téléphone',
                                                    flex: 0.8,
                                                    dataIndex: 'strADRESSE'
                                                },
                                                {
                                                    text: 'Type',
                                                    flex: 0.8,
                                                    hidden: true,
                                                    dataIndex: 'libelleTypeClient'
                                                }


                                            ]
                                        }
                                    ]
                                }

                            ]
                        }
                    ]



                }
            ]
        });
        me.callParent(arguments);

    },
    closeWindow: function () {
        const me = this;
        const wind = me.up('window');
        wind.destroy();
    },
    onSearch: function (query) {
        const me = this;
        const grid = me.down('grid');
        grid.getStore().load({params: {
                query: query
            }});
    },
    onSave: function (btn) {
        const wind = btn.up('window');
        const form = wind.down('form');
        if (form.isValid()) {
            const values = form.getValues();
            const data = {"clients": wind.getSelected(), "message": values.message};

            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/notifications/send-sms',
                params: Ext.JSON.encode(data),
                success: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'Message envoyé');
                    wind.destroy();
                       wind.getGrid().getStore().reload();
                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'Un problème avec le serveur');
                }
            });
        }


    },

    onSelect: function (_this) {
        const me = this;

        me.selected = [];
        me.selected = _this.getSelection().map(function (e) {
            return {"clientId": e.data.lgCLIENTID};
        });

    },
    onDeselect: function (_this) {

        const me = this;

        me.selected = [];
        me.selected = _this.getSelection().map(function (e) {
            return {"clientId": e.data.lgCLIENTID};
        });

    }
});

