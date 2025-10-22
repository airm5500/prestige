
/* global Ext */
var ImportXLSStore;
var storetype;
Ext.define('testextjs.view.commandemanagement.bonlivraison.ImportXLS', {
    extend: 'Ext.window.Window',
    xtype: 'xlsx-dialog',
    id: 'xlsxdialog',
    autoShow: true,
//    cls:'login',
    height: 220,
    width: 530,
    requires: [
        'testextjs.model.Grossiste'
    ],
//    controller: 'xlsx',
    layout: {
        type: 'fit'
    },

    title: 'Importer',
    closeAction: 'destroy',
    closable: true,
    draggable: true,
    resizable: false,
    initComponent: function () {
        const _this = this;
        storetype = new Ext.data.Store({
            fields: ['name', 'value'],
            data: [{name: 'LABOREX', value: 'Laborex'},
                {name: 'COPHARMED', value: 'Copharmed'},
                {name: 'TEDIS_2', value: 'Tedis'},
                {name: 'DPCI', value: 'DPCI'}
                , {name: 'CIP_QTE', value: 'MODEL CIP-QTE'}
                , {name: 'CIP_QTE_CIP_QTER_PA', value: 'MODEL CIP_QTE_PRIX_ACHAT'}
            ]
        });
        ImportXLSStore = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: 999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });
        _this.items = _this.buildItems();

        this.callParent();
    },

    buildItems: function () {
        return [
            {
                xtype: 'form',
                id: 'formImport',
                method: 'POST',
                fileUpload: true,
                bodyPadding: 15,
//                defaults: {margin: 5},
                layout: {
                    type: "vbox"

                },
                items: [
                    {
                        xtype: 'filefield',
                        name: 'fichier',
                        fieldLabel: 'Fichier',
                        width: '100%',
                        allowBlank: false


                    },
                    {
                        xtype: 'combobox',
                        name: 'modeBL',
                        fieldLabel: 'Modèle de BL',
                        allowBlank: false,
                        store: storetype,
                        valueField: 'name',
                        displayField: 'value',
                        queryMode: 'local',
                        width: '100%',
                        emptyText: 'Choisir le modèle'

                    },
                    {
                        xtype: 'combo',
                        fieldLabel: 'Grossiste',
                        allowBlank: false,
                        name: 'lg_GROSSISTE_ID',
                        width: '100%',
                        valueField: 'lg_GROSSISTE_ID',
                        displayField: 'str_LIBELLE',
                        typeAhead: true,
                        queryMode: 'remote',
                        pageSize: 999,
                        emptyText: 'Choisir un grossiste...',
                        store: ImportXLSStore
                    }


                ],
                buttons: [
                    {
                        xtype: 'button',
                        formBind: true,
//                            iconCls: 'fa fa-sign-in fa-lg',
//                    glyph: 0xf0c7,
                        text: 'Importer',
                        listeners: {
                            click: function () {
                                var form = Ext.getCmp('formImport');

                                form.submit({
                                    clientValidation: true,
                                    url: '../commande?action=import',
                                    waitMsg: 'Patientez...',
                                    timeout: 1800000,
                                    scope: this,
                                    success: function (form, action) {

                                        var result = Ext.JSON.decode(action.response.responseText, false);
                                      
                                        Ext.getCmp('OderGrid').getStore().load();
                                        Ext.getCmp('xlsxdialog').destroy();
                                        if (!result.toBe) {
                                            Ext.MessageBox.show({
                                                title: 'Info',
                                                msg: result.success,
                                                icon: Ext.MessageBox.INFO,
                                                buttons: Ext.MessageBox.OK
                                            });
                                        } else {
                                            Ext.MessageBox.show({
                                                title: 'Info',
                                                msg: result.success,
                                                icon: Ext.MessageBox.INFO,
                                                width: 500,
                                                height: 140,
                                                buttons: Ext.MessageBox.OK
                                            });
                                        }


                                    },
                                    failure: function (form, action) {
                                        var result = Ext.JSON.decode(action.response.responseText, false);
                                        Ext.Msg.show({
                                            title: 'Error!',
                                            msg: "Erreur d'importation ",
                                            icon: Ext.Msg.ERROR,
                                            buttons: Ext.Msg.OK
                                        });
                                    }

                                });
                            }
                        }
                    },
                    {
                        xtype: 'button',
//                            iconCls: 'fa fa-times fa-lg',
//                    glyph: 0xf056,
                        text: 'Annuler',
                        listeners: {
                            click: function (button, e, options) {
//                            Ext.getCmp('formImport').reset();
                                Ext.getCmp('xlsxdialog').destroy();
                                Ext.getCmp('xlsxdialog').close();
                            }
                        }
                    }



                ]


            }
        ];
    }
});