
/* global Ext */

Ext.define('testextjs.view.vente.user.ClientLambda', 
{
    extend: 'Ext.window.Window',
    xtype: 'clientLambda',
    autoShow: false,
    height: 340,
    width: '60%',
    modal: true,
    title: 'AJOUTER UN CLIENT A LA VENTE ',
    closeAction: 'hide',
    closable: false,
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    items: [
        {
            xtype: 'form',
            hidden: true,
            itemId: 'clientLambdaform',
            bodyPadding: 5,
            modelValidation: true,
            layout: {
                type: 'fit',
                align: 'stretch'
            },
            items: [

                {
                    xtype: 'fieldset',
                    title: 'Information sur le client',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%',
                        xtype: 'textfield',
                        msgTarget: 'side',
                        labelAlign: 'right',
                        labelWidth: 115
                    },
                    items: [
                        {
                            fieldLabel: 'Nom',
                            emptyText: 'Nom',
                            name: 'strFIRSTNAME',
                            height: 30,
                            allowBlank: false,
                            enableKeyEvents: true

                        }, {
                            fieldLabel: 'Prénom',
                            emptyText: 'Prénom',
                            name: 'strLASTNAME',
                            height: 30,
                            allowBlank: false,
                            enableKeyEvents: true

                        },
                      
                        {
                            fieldLabel: 'Téléphone',
                            emptyText: 'Téléphone',
                            name: 'strADRESSE',
                            height: 30,
                            regex: /[0-9.]/,
                            allowBlank: false,
                            enableKeyEvents: true
                        },  {
                            fieldLabel: 'E-mail',
                            emptyText: 'E-mail',
                            name: 'email',
                            height: 30,
                            hidden:true,
                            vtype: 'email',
                            allowBlank: true,
                            enableKeyEvents: true

                        },
                        {
                            xtype: 'hiddenfield',
                            name: 'lgTYPECLIENTID',
                            value: '6',
                            allowBlank: false
                        },
                        {
                            /* Point 2 : consentement aux SMS / WhatsApp, enregistre sur la fiche */
                            xtype: 'checkbox',
                            name: 'consentSms',
                            itemId: 'consentSms',
                            fieldLabel: 'SMS / WhatsApp',
                            boxLabel: 'le client accepte d\'être contacté',
                            inputValue: 'true',
                            uncheckedValue: 'false',
                            checked: true
                        },

                        {
                            xtype: "radiogroup",
                            fieldLabel: "Genre",
                            allowBlank: true,
                            vertical: true,
                            items: [
                                {boxLabel: 'Féminin', name: 'strSEXE', inputValue: 'F'},
                                {boxLabel: 'Masculin', name: 'strSEXE', inputValue: 'M'}
                            ]
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
                    itemId: 'btnNewLambda',
                    disabled: true,
                    text: 'Enregistrer'
                },
                {
                    xtype: 'button',
                    itemId: 'btnCancelLambda',
                    text: 'Annuler'

                }
            ]
        }
    ]
});

