
/* global Ext */

Ext.define('testextjs.view.vente.form.VenteDateForm', {
    extend: 'Ext.window.Window',
    xtype: 'ventedate',
    autoShow: false,
    height: 350,
    width: '40%',
    modal: true,
    title: 'MODIFICATION DE LA DATE DE VENTE',
    closeAction: 'hide',
    closable: false,
    config: {
        vente: null,
        grid: null

    },
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        const me = this;
        const vente = me.getVente().data;
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
                            itemId: 'btnUpdateDate',
                            text: 'Enregistrer',
                            handler: me.onSave
                        },
                        {
                            xtype: 'button',
                            iconCls: 'cancelicon',
                            itemId: 'btnCancelDateForm',
                            text: 'Annuler',
                            handler: me.closeWindow

                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'form',
                    itemId: 'ventedateform',
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
                            flex: 1.2,
                            title: '<span style="color:blue;">Information vente </span>',
                            layout: {
                                type: 'hbox',
                                 align: 'stretch'

                            },
                            items: [
                                {
                                    xtype: 'container',
                                    flex: 1,
                                    layout: {type: 'vbox'},
                                    items: [

                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Référence:',
                                            labelWidth: 70,
                                            value: vente.strREF,
                                            fieldStyle: "color:blue;font-weight: bold;",
                                            margin: '0 10 0 0'
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Total vente:',
                                            value: vente.intPRICE,
                                            labelWidth: 80,
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;",
                                            margin: '0 10 0 0'
                                        },
                                        {xtype: 'splitter'},
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Part client:',
                                            labelWidth: 70,
                                            value: vente.intCUSTPART,
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;",
                                            margin: '0 10 0 0'
                                        }

                                    ]
                                }
                                ,
                                {
                                    xtype: 'container',
                                    flex: 1,
                                    layout: {type: 'vbox'},
                                    items: [

                                        {
                                            xtype: 'displayfield',
                                            labelWidth: 50,
                                            fieldLabel: 'Date:',
                                            value: vente.dtUPDATED,
                                            fieldStyle: "color:blue;font-weight: bold;"

                                        }, {
                                            xtype: 'displayfield',
                                            labelWidth: 50,
                                            fieldLabel: 'Heure:',
                                            value: vente.HEUREVENTE,
                                            fieldStyle: "color:blue;font-weight: bold;"

                                        },
                                        {
                                            xtype: 'displayfield',
                                            labelWidth: 50,
                                            fieldLabel: 'Client:',
                                            value: vente.clientFullName,
                                            fieldStyle: "color:blue;font-weight: bold;"

                                        }

                                    ]
                                }
                            ]
                        },
                        {
                            xtype: 'fieldset',
                            title: '<span style="color:blue;">Formulaire </span>',
                            layout: 'anchor',
                            flex: 0.8,
                            defaults: {
                                anchor: '100%',
                                msgTarget: 'side',
                                labelAlign: 'right',
                                labelWidth: 50
                            },
                            items: [
                                {
                                    xtype: 'hiddenfield',
                                    name: 'venteId',
                                    value: vente.lgPREENREGISTREMENTID,
                                    allowBlank: false
                                },

                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Date',
                                    name: 'date',
                                    allowBlank: false,
                                    submitFormat: 'Y-m-d'

                                }, {
                                    xtype: 'timefield',
                                    format: 'H:i',
                                    increment: 30,
                                    fieldLabel: 'Heure',
                                    name: 'heure',
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
    onSave: function (btn) {

        const wind = btn.up('window');
        const   form = wind.down('form');
        let datas = form.getValues();

        if (form.isValid()) {
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/vente/update-created-date',
                params: Ext.JSON.encode(datas),
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
    },
    closeWindow: function () {
        let me = this;
        let wind = me.up('window');
        wind.destroy();
    }

});

