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
        },
        {
            ref: 'smsSoldeLabel',
            selector: 'menunotification #smsSoldeLabel'
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
            },
            'menunotification #refreshSolde': {
                click: this.loadSolde
            },
            'menunotification #drBtn': {
                click: this.onDrClick
            }

        });
    },

    loadSolde: function () {
        const me = this;
        const label = me.getSmsSoldeLabel();
        if (label) {
            label.setText('chargement...');
        }
        Ext.Ajax.request({
            url: '../api/v1/sms/solde',
            method: 'GET',
            success: function (response) {
                let res = {};
                try {
                    res = Ext.decode(response.responseText);
                } catch (ex) {
                    res = {};
                }
                if (!label) {
                    return;
                }
                if (res.success && res.found) {
                    const total = res.totalUnits;
                    const color = (total <= 0) ? 'red' : (total < 50 ? '#e69500' : 'green');
                    let txt = '<span style="color:' + color + ';font-weight:bold;">' + total + ' unité(s)</span>';
                    if (total <= 0) {
                        txt += ' <span style="color:red;">- rechargez votre bundle SMS</span>';
                    }
                    label.setText(txt);
                } else if (res.success && !res.found) {
                    label.setText('<span style="color:#e69500;">solde indisponible (format Orange inattendu)</span>');
                } else {
                    label.setText('<span style="color:red;">' + (res.msg || res.userMessage || 'indisponible') + '</span>');
                }
            },
            failure: function () {
                if (label) {
                    label.setText('<span style="color:red;">erreur serveur</span>');
                }
            }
        });
    },

    onDrClick: function () {
        const me = this;
        const win = Ext.create('Ext.window.Window', {
            title: 'Accusés de réception SMS (Delivery Receipts)',
            modal: true,
            width: 640,
            height: 440,
            layout: 'fit',
            bodyPadding: 10,
            items: [{
                    xtype: 'textarea',
                    itemId: 'drOutput',
                    readOnly: true,
                    value: 'Utilisez les boutons ci-dessous.\n\n'
                            + '- "Créer la souscription" active l\'envoi des accusés vers Prestige '
                            + '(nécessite que l\'URL de callback publique soit configurée côté serveur : smsdrcallbackurl).\n'
                            + '- "Lister" affiche les souscriptions existantes.\n'
                            + '- "Supprimer" retire une souscription via son identifiant.'
                }],
            buttons: [
                {
                    text: 'Créer la souscription',
                    iconCls: 'addicon',
                    handler: function () {
                        me.drRequest(win, 'POST', '../api/v1/sms/dr-subscriptions', 'Création de la souscription DR');
                    }
                },
                {
                    text: 'Lister',
                    iconCls: 'searchicon',
                    handler: function () {
                        me.drRequest(win, 'GET', '../api/v1/sms/dr-subscriptions', 'Souscriptions DR');
                    }
                },
                {
                    text: 'Supprimer...',
                    handler: function () {
                        Ext.Msg.prompt('Supprimer une souscription', 'Identifiant de la souscription :', function (btn, id) {
                            if (btn === 'ok' && id) {
                                me.drRequest(win, 'DELETE', '../api/v1/sms/dr-subscriptions/' + encodeURIComponent(id),
                                        'Suppression de la souscription DR');
                            }
                        });
                    }
                },
                {
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }
            ]
        });
        win.show();
    },

    drRequest: function (win, method, url, label) {
        const output = win.down('#drOutput');
        win.setLoading('Traitement...');
        Ext.Ajax.request({
            url: url,
            method: method,
            callback: function (options, success, response) {
                win.setLoading(false);
                let pretty = response.responseText;
                try {
                    pretty = JSON.stringify(Ext.decode(response.responseText), null, 2);
                } catch (ex) {
                    // on garde le texte brut
                }
                output.setValue(label + ' (HTTP ' + response.status + ') :\n\n' + pretty);
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
        me.loadSolde();

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