/* global Ext */

Ext.define('testextjs.view.notification.SmsFournisseurForm', {
    extend: 'Ext.window.Window',
    xtype: 'smsfournisseurForm',
    autoShow: false,
    width: 560,
    modal: true,
    title: 'Fournisseur SMS',
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
            bodyPadding: 10,
            autoScroll: true,
            maxHeight: 520,
            layout: {
                type: 'anchor'
            },
            defaults: {
                anchor: '100%',
                msgTarget: 'side',
                labelAlign: 'right',
                labelWidth: 160
            },
            items: [
                {
                    xtype: 'textfield',
                    name: 'id',
                    hidden: true
                },
                {
                    xtype: 'textfield',
                    fieldLabel: 'Code',
                    name: 'code',
                    itemId: 'codeField',
                    emptyText: 'Ex. LETEXTO',
                    allowBlank: false
                },
                {
                    xtype: 'textfield',
                    fieldLabel: 'Libellé',
                    name: 'libelle',
                    emptyText: 'Nom affiché du fournisseur',
                    allowBlank: false
                },
                {
                    xtype: 'combobox',
                    fieldLabel: 'Suivi des accusés (DLR)',
                    name: 'dlrMode',
                    itemId: 'dlrModeField',
                    editable: false,
                    forceSelection: true,
                    queryMode: 'local',
                    displayField: 'libelle',
                    valueField: 'valeur',
                    value: 'POLLING',
                    store: {
                        fields: ['valeur', 'libelle'],
                        data: [
                            {valeur: 'POLLING', libelle: 'Interrogation à la demande (recommandé)'},
                            {valeur: 'CALLBACK', libelle: 'Callback (URL publique requise)'}
                        ]
                    }
                },
                {
                    xtype: 'textfield',
                    fieldLabel: 'URL de callback DLR',
                    name: 'dlrCallbackUrl',
                    itemId: 'dlrCallbackUrlField',
                    emptyText: 'https://mondomaine.com/prestige/api/v1/sms/dr-callback',
                    hidden: true
                },
                {
                    // Renseigné dynamiquement par le contrôleur selon le fournisseur
                    // (paramètres attendus renvoyés par le serveur).
                    xtype: 'fieldset',
                    itemId: 'paramsFieldset',
                    title: 'Paramètres du fournisseur',
                    defaults: {
                        anchor: '100%',
                        msgTarget: 'side',
                        labelAlign: 'right',
                        labelWidth: 160
                    },
                    items: []
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
