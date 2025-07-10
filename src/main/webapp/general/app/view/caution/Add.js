Ext.define('testextjs.view.caution.Add', {
    extend: 'Ext.window.Window',
    xtype: 'cautionAddForm',
    autoShow: false,
    height: 200,
    width: 500,
    modal: true,
    title: 'Ajouter une caution',
    closeAction: 'hide',
    closable: true,
    layout: 'fit',
    items: [
        {
            xtype: 'form',
            bodyPadding: 20,
            border: 0,
            modelValidation: true,
            layout: 'fit',
            items: [

                {
                    title: '',
                    layout: 'anchor',
                    border: 0,
                    defaults: {
                        anchor: '100%',

                        msgTarget: 'side',
                        labelAlign: 'left',
                        labelWidth: 115
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Tiers-payants',
                            name: 'tiersPayantId',
                            itemId: 'tiersPayantId',
                            flex: 2,
                            store: Ext.create('Ext.data.Store', {
                                idProperty: 'lgTIERSPAYANTID',
                                fields:
                                        [
                                            {name: 'lgTIERSPAYANTID',
                                                type: 'string'

                                            },

                                            {name: 'strFULLNAME',
                                                type: 'string'

                                            }

                                        ],
                                autoLoad: false,
                                pageSize: 999,
                                proxy: {
                                    type: 'ajax',
                                    url: '../api/v1/client/tiers-payants/carnet',
                                    reader: {
                                        type: 'json',
                                        root: 'data',
                                        totalProperty: 'total'
                                    }

                                }

                            }),
                            pageSize: 999,
                            valueField: 'lgTIERSPAYANTID',
                            displayField: 'strFULLNAME',
                            minChars: 2,
                            queryMode: 'remote',
                            enableKeyEvents: true,
                            allowBlank: false,
                            emptyText: 'Selectionner tiers payant...'
                                 
                        },

                        {
                            xtype: 'numberfield',
                            fieldLabel: 'Montant',
                            minValue: 5,
                            maskRe: /[0-9.]/,
                            selectOnFocus: true,
                            hideTrigger: true,
                            name: 'montant',
                            allowBlank: false
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

