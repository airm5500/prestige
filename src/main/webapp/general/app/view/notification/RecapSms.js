/* global Ext */

Ext.define('testextjs.view.notification.RecapSms', {
    extend: 'Ext.panel.Panel',
    xtype: 'smsRecap',
    frame: true,
    title: 'Envoi SMS de Récaptilatif activité',
    iconCls: 'icon-grid',
    width: 450,
    height: 'auto',
    minHeight: 170,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        const canaux = Ext.create('Ext.data.ArrayStore', {
            data: [['SMS'], ['EMAIL']],
            fields: [{name: 'canal', type: 'string'}]
        });
        const me = this;
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
                            text: 'Envoyer',
                            handler: me.onSave
                        }

                    ]
                }
            ],
            items: [
                {
                    xtype: 'form',
                    bodyPadding: 5,
                    modelValidation: true,
                    layout: 'anchor',

                    items: [
                        {
                            xtype: 'fieldset',
                            collapsible: false,
                            bodyPadding: 5,
                            flex: 0.5,
                            title: '<span style="color:blue;">Envoi SMS/Mail de Récaptilatif activité</span>',
                            layout: 'anchor',
                            items: [
                                {
                                    xtype: 'fieldcontainer',
                                    layout: 'vbox',

                                    items: [

                                        {
                                            labelWidth: 120,
                                            flex: 1,
                                            xtype: 'datefield',
                                            fieldLabel: 'Choisir une date',
                                            name: 'dateActivite',
                                            submitFormat: 'Y-m-d',
                                            format: 'd/m/Y',
                                            value: new Date()

                                        },
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Canal',
                                            labelWidth: 120,
                                            name: 'canal',
                                            store: canaux,
                                            flex: 1,
                                            valueField: 'canal',
                                            displayField: 'canal',
                                            typeAhead: false,
                                            mode: 'local',
                                            value: 'SMS'
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
    onSave: function (btn) {
        const wind = btn.up('panel');
        const form = wind.down('form');
        if (form.isValid()) {
            const values = form.getValues();
            const data = {"dateActivite": values.dateActivite,"canal": values.canal};
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/notifications/sms-recap',
                params: Ext.JSON.encode(data),
                success: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'Message envoyé');

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'Un problème avec le serveur');
                }
            });
        }


    }
});


