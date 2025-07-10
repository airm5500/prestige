/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global Ext */

Ext.define('testextjs.view.notification.CategorieNotificationForm', {
    extend: 'Ext.window.Window',
    xtype: 'categorieNotificationForm',
    autoShow: false,
    width: '35%',
    height: 210,
    modal: true,
    title: 'Modification de la catégorie de notification',
    closeAction: 'hide',
    closable: true,
    maximizable: false,
    layout: {
        type: 'fit',
        align: 'stretch'
    },
    config: {
        data: null,
        grid: null
    },
    initComponent: function () {
        const me = this;
   
        const canaux = Ext.create('Ext.data.ArrayStore', {
            data: [['SMS'], ['EMAIL'], ['SMS_EMAIL'], ['SMS_MASSE'], ['EMAIL_MASSE']],
            fields: [{name: 'canal', type: 'string'}]
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
                    bodyPadding: 10,
                    modelValidation: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'fieldset',
                            collapsible: false,
                            bodyPadding: 10,

                            title: '<span style="color:blue;">Catégorie notification</span>',
                            layout: {
                                type: 'vbox', align: 'stretch'

                            },
                            items: [
                                {
                                    xtype: 'hiddenfield',
                                    allowBlank: false,
                                    name: 'id',
                                    value: me.getData().id
                                },
                                {
                                    xtype: 'hiddenfield',
                                    allowBlank: false,
                                    name: 'name',
                                    value: me.getData().name
                                },
                                {
                                    xtype: 'textfield',
                                    labelWidth: 70,
                                    fieldLabel: 'Description',
                                    name: 'libelle',
                                    allowBlank: false,
                                    value: me.getData().libelle



                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Canal',
                                    labelWidth: 70,
                                    name: 'canal',
                                    store: canaux,
                                    value: me.getData().canal,
                                    valueField: 'canal',
                                    displayField: 'canal',
                                    typeAhead: false,
                                    mode: 'local',
                                    emptyText: 'Selectionner un canal',
                                    allowBlank: false

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

    onSave: function (btn) {
        const wind = btn.up('window');
        const form = wind.down('form');
        if (form.isValid()) {
            const values = form.getValues();
            const data = {"id": values.id, "name": values.name, "canal": values.canal, "libelle": values.libelle};

            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/categorie-notifications',
                params: Ext.JSON.encode(data),
                success: function (response, options) {
                    progress.hide();
             
                    wind.destroy();
                    wind.getGrid().getStore().reload();
                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'Un problème avec le serveur');
                }
            });
        }


    }
});

