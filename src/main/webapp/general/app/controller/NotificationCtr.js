/* global Ext */

Ext.define('testextjs.controller.NotificationCtr', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.model.caisse.ClientAssurance'
    ],
    views: ['testextjs.view.notification.Notification', 'testextjs.view.notification.NotificationForm'],
    refs: [{
            ref: 'menunotificationlist',
            selector: 'menunotification'
        },

        {
            ref: 'queryBtn',
            selector: 'menunotification #rechercher'
        },

        {
            ref: 'menunotificationGrid',
            selector: 'menunotification gridpanel'
        },
        {
            ref: 'notificationFormGrid',
            selector: 'notificationForm gridpanel'
        }
        ,

        {
            ref: 'pagingtoolbar',
            selector: 'menunotification gridpanel pagingtoolbar'
        }
        , {
            ref: 'addBtn',
            selector: 'menunotification #addBtn'
        },
        {
            ref: 'typeNotification',
            selector: 'menunotification #typeNotification'
        },
        {
            ref: 'canal',
            selector: 'menunotification #canal'
        },
        {
            ref: 'dtStart',
            selector: 'menunotification #dtStart'
        },
        {
            ref: 'dtEnd',
            selector: 'menunotification #dtEnd'
        }

    ],
    config: {
        data: null
    },
    init: function (application) {
        this.control({
            'menunotification gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },

            /*  'notificationForm': {
             render: this.onReady
             },*/
            'menunotification #rechercher': {
                click: this.doSearch
            },
            'menunotification #typeNotification': {
                select: this.doSearch
            }, 'menunotification #canal': {
                select: this.doSearch
            },

            'menunotification gridpanel': {
                viewready: this.doInitStore
            },
            /*
             'menunotification #query': {
             specialkey: this.onSpecialKey
             },
             
             */
            "menunotification gridpanel actioncolumn": {
                editer: this.toItem,
                renvoyer: this.onRenvoyer

            },
            'menunotification #addBtn': {
                click: this.onAddClick
            }

        });
    },

    onAddClick: function () {
        const me = this;
        Ext.create('testextjs.view.notification.NotificationForm', {data: null, grid: me.getMenunotificationGrid()}).show();

    },
    toItem: function (view, rowIndex, colIndex, item, e, record, row) {

        Ext.create('testextjs.view.notification.NotificationForm', {data: record, grid: view}).show();

    },

    onRenvoyer: function (view, rowIndex, colIndex, item, e, record) {
        const me = this;
        const id = record.get('id');
        Ext.Msg.confirm('Renvoi SMS', 'Renvoyer ce SMS maintenant ?', function (btn) {
            if (btn !== 'yes') {
                return;
            }
            const grid = me.getMenunotificationGrid();
            grid.setLoading('Renvoi en cours...');
            Ext.Ajax.request({
                url: '../api/v1/notifications/' + encodeURIComponent(id) + '/resend',
                method: 'POST',
                success: function (response) {
                    grid.setLoading(false);
                    let res = {};
                    try {
                        res = Ext.decode(response.responseText);
                    } catch (ex) {
                        res = {};
                    }
                    if (res.success) {
                        Ext.Msg.alert('Renvoi SMS', res.msg || 'SMS accepté par Orange (201)');
                    } else {
                        Ext.Msg.alert('Renvoi SMS', res.msg || 'Le renvoi a échoué.');
                    }
                    grid.getStore().reload();
                },
                failure: function () {
                    grid.setLoading(false);
                    Ext.Msg.alert('Renvoi SMS', 'Erreur lors de la communication avec le serveur.');
                }
            });
        });
    },

    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getMenunotificationGrid().getStore().getProxy();

        myProxy.params = {
            query: null,
            dtStart: null,
            dtEnd: null,
            typeNotification: null,
            canal: null

        };
        myProxy.setExtraParam('canal', me.getCanal().getValue());
        myProxy.setExtraParam('typeNotification', me.getTypeNotification().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());


    },

    doInitStore: function () {
        const me = this;
        me.doSearch();

    },
    onReady: function () {
        const me = this;
        me.data = null;

    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.doSearch();
        }
    },

    doSearch: function () {
        const me = this;
        me.getMenunotificationGrid().getStore().load({
            params: {
                "typeNotification": me.getTypeNotification().getValue(),
                'dtStart': me.getDtStart().getSubmitValue(),
                'dtEnd': me.getDtEnd().getSubmitValue(),
                'canal': me.getCanal().getValue()
            }
        });
    }

});