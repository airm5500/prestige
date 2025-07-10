Ext.define('testextjs.view.caution.Edit', {
    extend: 'Ext.window.Window',
    xtype: 'cautionEditForm',
    autoShow: false,
    height: 250,
    width: 500,
    modal: true,
    title: 'Modifier une caution',
    closeAction: 'hide',
    closable: true,
    layout: 'fit',
    config: {
        idCaution: null,
        tiersPayantName: null
    },

    initComponent: function () {
        const me = this;
        const idCaution = me.getIdCaution();
        const tiersPayantName = me.getTiersPayantName();
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
            ],
            items: [
                {
                    xtype: 'form',
                    bodyPadding: 10,
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
                                    fieldLabel: 'Tiers-payant',
                                    xtype: 'displayfield',
                                    fieldStyle: "color:blue;font-weight:700;",
                                    value: tiersPayantName

                                },
                                {

                                    xtype: 'displayfield',
                                    fieldStyle: "color:blue;font-weight:500;",
                                    value: 'Taper par exemple: <br>1) 2000 pour augmenter la caution,<br> 2) -2000 pour corriger la caution à la baisse'

                                },
                                {
                                    xtype: 'numberfield',
                                    fieldLabel: 'Montant',
                                    maskRe: /[0-9.]/,
                                    selectOnFocus: true,
                                    hideTrigger: true,
                                    name: 'montant',
                                    allowBlank: false
                                },
                                {
                                    xtype: 'hiddenfield',
                                    value: idCaution,
                                    name: 'idCaution'

                                }
                            ]
                        }

                    ]
                }
            ]
        });
        me.callParent(arguments);
    }
});
