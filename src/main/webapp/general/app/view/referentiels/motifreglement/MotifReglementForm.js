/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global Ext */

Ext.define('testextjs.view.referentiels.motifreglement.MotifReglementForm', {
    extend: 'Ext.window.Window',
    xtype: 'motifreglementForm',
    autoShow: false,
    height: 200,
    width: 500,
    modal: true,
    title: 'Motif règlément',
    closeAction: 'hide',
    closable: true,
    layout: {
        type: 'fit',
        align: 'stretch'
    },
    items: [
        {
            xtype: 'form',
            modelValidation: true,
            layout: {
                type: 'fit',
                align: 'stretch'
            },
            items: [

                {
                    title: '',
                    layout: 'fit',
                    defaults: {
                        anchor: 'fit',
                     
                        msgTarget: 'side',
                        labelAlign: 'right',
                        labelWidth: 50
                    },
                    items: [
                        {
                            xtype: 'textareafield',
                            grow: true,
                            fieldLabel: 'Libellé',
                            emptyText: 'Libellé',
                            name: 'libelle',
                            allowBlank: false
                        },
                        {
                            xtype: 'numberfield',
                            name: 'id',
                            value:0,
                            hidden:true

                        }
                    ]
                }

            ]
        }
    ],
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
                    itemId: 'btnsave',
                    text: 'Enregistrer'
                },
                {
                    xtype: 'button',
                    itemId: 'btnCancel',
                    text: 'Annuler'

                }
            ]
        }
    ]
});

