
/* global Ext */

Ext.define('testextjs.view.caisseManager.TicketzManager', {
    extend: 'Ext.form.Panel',
    xtype: 'ticketzmanager_old',
    frame: true,
    title: 'TICKET Z',
    bodyPadding: 10,
    width: 500,
    fieldDefaults: {
        labelAlign: 'right',
        labelWidth: 115,
        msgTarget: 'side'
    },
    initComponent: function () {
    const storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 99,
            autoLoad: true,
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
        const store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [{str_TYPE_TRANSACTION: 'ALL', str_desc: 'Tous les mouvements'}, {str_TYPE_TRANSACTION: 'VENTE', str_desc: 'Ventes uniquements'}]
        });
        const me = this;

        Ext.applyIf(me, {
            items: [{
                    xtype: 'fieldset',
                    title: 'Infos sur le TICKET Z',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type d\'option',
                            name: 'description',
                            itemId: 'description',
                            store: store_type,
                            allowBlank: false,
                            valueField: 'str_TYPE_TRANSACTION',
                            displayField: 'str_desc',
                            value: 'ALL',
                            editable: false,
                            queryMode: 'local',
                            emptyText: 'Choisir une option...'
                        },
                        
                         {
                            xtype: 'combobox',
                            fieldLabel: 'Utilisateur',
                            itemId: 'userId',
                            name: 'userId',
                            store: storeUser,
                            pageSize: 999,
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            typeAhead: false,
                            flex: 2,
                            minChars: 2,
                           queryMode: 'local',
                            emptyText: 'Choisir un utilisateur...'

                        },
                        
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Date debut',
                            name: 'dtStart',
                            itemId: 'dtStart',
                            format: 'd/m/Y',
                            value: new Date(),
                            submitFormat: 'Y-m-d',
                            allowBlank: false
                        },
                        {

                            xtype: 'timefield',
                            name: 'hrStart',
                            fieldLabel: 'Heure debut',
                            itemId: 'hrStart',
                            emptyText: 'Heure debut(HH:mm)',
                            increment: 30,
                            value: '00:00',
                            format: 'H:i',
                            allowBlank: false
                        },

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Date fin',
                            name: 'dtEnd',
                            itemId: 'dtEnd',
                            format: 'd/m/Y',
                            value: new Date(),
                            submitFormat: 'Y-m-d',
                            allowBlank: false
                        },
                        {
                            xtype: 'timefield',
                            name: 'hrEnd',
                            fieldLabel: 'Heure fin',
                            itemId: 'hrEnd',
                            emptyText: 'Heure fin (HH:mm)',
                            increment: 30,
                            value: '23:59',
                            format: 'H:i',
                            allowBlank: false
                        }

                    ]
                }],
            buttons: [
                {
                    text: 'Imprimer',
                    itemId: 'btn_savemyaccountID',
                    formBind: true,
                    handler: function (btn) {
                        me.onbtnsave(btn);
                    }

                }]
        });
        this.callParent();

    },

    onbtnsave: function (buton) {
        const form = buton.up('form');
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/caisse/tickez',
            params: Ext.JSON.encode(form.getValues()),
            timeout: 600000,
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (!result.success) {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: result.msg,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });

                }

            },
            failure: function (response, options) {
                progress.hide();
            }

        });

    }
});
