
Ext.define('testextjs.view.sm_user.mvtcaisse.action.Detail', {
    extend: 'Ext.window.Window',
    xtype: 'mvtcaissemanagerDetail',
    autoShow: false,
    minHeight: 300,
    width: '50%',
    modal: true,
    iconCls: 'icon-grid',
    closeAction: 'hide',
    closable: true,
    maximizable: false,
    config: {
        data: null

    },
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    initComponent: function () {
        const me = this;
        const data = me.getData();

        const labelWith = 130;
        this.title = "Detail de du mouvement  [" + data.tiket + "]";
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
                            itemId: 'btnCancel',
                            text: 'Fermer',
                            handler: me.cancel

                        }
                    ]
                }

            ],

            items: [
                {
                    xtype: 'container',
                    flex: 1,
                    itemId: 'itemContainer',
                    bodyPadding: 2,
                    layout: {
                        type: 'hbox',
                        align: 'stretch'
                    },
                    items: [

                        {
                            xtype: 'container',
                            flex: 1,
                            layout: {
                                type: 'hbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    title: "Infos",
                                    layout: 'vbox',
                                    flex: 1,
                                    defaults: {
                                        xtype: 'displayfield',
                                        fieldStyle: "color:blue;font-weight:bold;font-size:1em",
                                        labelWidth: labelWith

                                    },
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            fieldLabel: 'Référence',
                                            flex: 1,
                                            value: data.tiket

                                        },
                                        {
                                            fieldLabel: 'Type mouvement',
                                            flex: 1,
                                            value: data.typeMvtCaisse

                                        },
                                        {
                                            fieldLabel: 'Numero.Comptable',
                                            flex: 1,
                                            value: data.numCompte
                                        },
                                        {
                                            fieldLabel: 'Mode règlement',
                                            flex: 1,
                                            value: data.modeReglement
                                        }



                                    ]
                                },
                                {
                                    xtype: 'fieldset',
                                    title: "Infos",
                                    layout: 'vbox',
                                    flex: 1,
                                    defaults: {
                                        xtype: 'displayfield',
                                        fieldStyle: "color:blue;font-weight:bold;font-size:1em",
                                        labelWidth: labelWith

                                    },
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            fieldLabel: 'Montant',
                                            flex: 1,
                                            value: data.montant,
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            }
                                        },
                                        {
                                            fieldLabel: 'Date',
                                            flex: 1,
                                            value: data.dateOpreration

                                        },
                                        {
                                            fieldLabel: 'Heure',
                                            flex: 1,
                                            value: data.heureOpreration

                                        }
                                    ]
                                }
                            ]
                        }

                    ]
                }

            ]

        });
        me.callParent(arguments);
    },
    cancel: function () {
        this.up('window').destroy();

    }

});

