/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global Ext */

Ext.define('testextjs.view.depot.Export', {
    extend: 'Ext.panel.Panel',
    xtype: 'exportdepotvents',
    title: 'Exportation de ventes format json',
    width: '55%',
    height: 200,
    layout: 'anchor',
    bodyPadding: 15,
    initComponent: function () {
        var me = this;
        Ext.applyIf(me, {

            items: [

                {
                    xtype: 'form',
                    bodyPadding: 10,
                    modelValidation: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    buttons: [
                        {
                            text: 'Exporter',
                            formBind: true,
                            handler: me.onExportToJson
                        }
                    ],
                    items: [

                        {

                            xtype: 'fieldset',
//                            bodyPadding: 20,
//                            margin: '0 0 10 0',
                            title: 'Exportation de ventes VO',
                            layout: {type: 'hbox'},

                            items: [
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    itemId: 'dtStart',
                                    allowBlank: false,
                                    flex: 1,
                                    margin: '10 10 10 0',
                                    labelWidth: 30,
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    format: 'd/m/Y',
                                    value: new Date()

                                }, {
                                    xtype: 'datefield',
                                    fieldLabel: 'Au',
                                    itemId: 'dtEnd',
                                    allowBlank: false,
                                    flex: 1,
                                    margin: '10 0 10 0',
                                    labelWidth: 30,
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    format: 'd/m/Y',
                                    value: new Date()

                                }

                            ]

                        }

                    ]
                }
            ]
        });
        me.callParent(arguments);

    },

    onExportToJson: function (btn) {
        let form = btn.up('form');
        var dtStart = form.down('#dtStart').getSubmitValue(),
                dtEnd = form.down('#dtEnd').getSubmitValue();
        window.location = '../api/v1/vente-depot/export-ventestojson?dtStart=' + dtStart + '&dtEnd=' + dtEnd;
    }


});

