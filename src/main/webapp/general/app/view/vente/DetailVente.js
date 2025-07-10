
Ext.define('testextjs.view.vente.DetailVente', {
    extend: 'Ext.window.Window',
    xtype: 'salesItem',
    autoShow: false,
    minHeight: 500,
    width: '80%',
    modal: true,
    iconCls: 'icon-grid',
    closeAction: 'hide',
    closable: true,
    maximizable: true,
    config: {
        vente: null

    },
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    initComponent: function () {
        const me = this;
        const vente = me.getVente();
        const client = vente.client;
        const items = vente.items;
        const assurances = vente.assurances;
        const reglement = vente.reglement;
        const typeVente = vente.typeVente;
        const ayantDroit = vente.ayantDroit;
        const labelWith = 130;
        const reglements = vente.reglements;
        this.title = "Detail de la vente  [" + vente.strREF + "]";

        const detailsStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {
                            name: 'id',
                            type: 'string'
                        },

                        {
                            name: 'intPRICE',
                            type: 'number'
                        }, {
                            name: 'produit',
                            type: 'auto'
                        },
                        {
                            name: 'intQUANTITY',
                            type: 'number'
                        },
                        {
                            name: 'intPRICEUNITAIR',
                            type: 'number'
                        }

                    ],

            pageSize: 100,
            data: items

        });
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
                            text: 'Fermer'

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
                                type: 'fit',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    collapsible: false,
                                    bodyPadding: 5,
                                    title: "Infos.Generales de la vente",
                                    layout: {
                                        type: 'vbox',
                                        align: 'stretch'
                                    },
                                    items: [
                                        {
                                            xtype: 'fieldset',
                                            title: "Infos.vente",
                                            layout: 'vbox',
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em",
                                                labelWidth: labelWith

                                            },
                                            margin: '0 0 5 0',
                                            items: [
                                                {
                                                    fieldLabel: 'Type vente',
                                                    flex: 1,
                                                    value: typeVente.libelle

                                                },
                                                {
                                                    fieldLabel: 'Référence',
                                                    flex: 1,
                                                    value: vente.strREF
                                                },
                                                {
                                                    fieldLabel: 'Numéro ticket',
                                                    flex: 1,
                                                    value: vente.strREFTICKET
                                                },
                                                {
                                                    fieldLabel: 'Numéro de bon',
                                                    flex: 1,
                                                    hidden: !vente.strREFBON,
                                                    value: vente.strREFBON

                                                },
                                                {
                                                    fieldLabel: 'Montant total',
                                                    flex: 1,
                                                    value: vente.intPRICE,
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                }, {
                                                    fieldLabel: 'Remise',
                                                    flex: 1,
                                                    hidden: !vente.intPRICEREMISE,
                                                    value: vente.intPRICEREMISE,
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                }, {
                                                    fieldLabel: 'Montant net',
                                                    flex: 1,
                                                    value: vente.intPRICE - vente.intPRICEREMISE,
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                }
                                                ,
                                                {
                                                    fieldLabel: 'Montant différé',
                                                    flex: 1,
                                                    hidden: !reglement || reglement?.montantRestant === 0,
                                                    value: reglement.montantRestant,
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                }
                                            ]
                                        },
                                        {
                                            xtype: 'fieldset',
                                            title: "Mode de règlements",
                                            layout: 'vbox',
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em",
                                                labelWidth: labelWith
                                            },
                                            margin: '0 0 5 0',
                                            items: me.buildReglements(reglements)

                                            
                                        },

                                        {
                                            xtype: 'fieldset',
                                            title: "Infos.Client",
                                            layout: 'vbox',
                                            hidden: !client,
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em",
                                                labelWidth: labelWith
                                            },
                                            margin: '0 0 5 0',
                                            items: [

                                                {
                                                    fieldLabel: 'Nom du client',
                                                    flex: 1,
                                                    value: client?.strFIRSTNAME

                                                },
                                                {
                                                    fieldLabel: 'Prénon du client',
                                                    flex: 1,
                                                    value: client?.strLASTNAME

                                                },
                                                {
                                                    fieldLabel: 'Part du client',
                                                    flex: 1,
                                                    hidden: vente.strTYPEVENTE === 'VNO',
                                                    value: vente.intCUSTPART,
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                }


                                            ]
                                        },

                                        {
                                            xtype: 'fieldset',
                                            title: "Infos. ayant droit",
                                            hidden: !ayantDroit,
                                            layout: 'vbox',
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em",
                                                labelWidth: labelWith
                                            },
                                            margin: '0 0 5 0',
                                            items: [
                                                {
                                                    fieldLabel: 'Nom Ayant droit',
                                                    flex: 1,
                                                    value: ayantDroit?.strFIRSTNAME

                                                }, {
                                                    fieldLabel: 'Prénom Ayant droit',
                                                    flex: 1,
                                                    value: ayantDroit?.strLASTNAME

                                                }

                                            ]
                                        },
                                        {
                                            xtype: 'fieldset',
                                            title: "Infos. Tiers-payant",
                                            layout: 'vbox',
                                            hidden: assurances.length === 0,
                                            defaults: {
                                                xtype: 'displayfield',
                                                fieldStyle: "color:blue;font-weight:bold;font-size:1em",
                                                labelWidth: labelWith
                                            },

                                            margin: '0 0 5 0',
                                            items: me.buildTiersPayantItems(assurances)
                                        }

                                    ]
                                }
                            ]
                        },
                        {
                            xtype: 'fieldset',
                            flex: 1.5,
                            title: 'Ligne produits',
                            layout: {
                                type: 'fit',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'gridpanel',
                                    store: detailsStore,
                                    viewConfig: {
                                        forceFit: true,
                                        columnLines: true

                                    },
                                    columns: [

                                        {
                                            xtype: 'rownumberer',
                                            text: 'LG',
                                            width: 40,
                                            sortable: true
                                        },
                                        {
                                            text: 'Nom',
                                            flex: 2,
                                            sortable: true,
                                            tpl: '{produit.strNAME}',
                                            xtype: 'templatecolumn'

                                        }, {
                                            text: 'Cip',
                                            flex: 1,
                                            sortable: true,
                                            tpl: '{produit.intCIP}',
                                            xtype: 'templatecolumn'

                                        },

                                        {
                                            header: 'Quantité',
                                            dataIndex: 'intQUANTITY',
                                            flex: 0.5,
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            }

                                        },
                                        {
                                            header: 'Prix.Vente',
                                            dataIndex: 'intPRICEUNITAIR',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5

                                        },
                                        {
                                            header: 'Montant.Vente',
                                            dataIndex: 'intPRICE',
                                            align: 'right',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 0.5

                                        }

                                    ],
                                    selModel: {
                                        selType: 'rowmodel',
                                        mode: 'SINGLE'
                                    }

                                }



                            ]}
                    ]
                }

            ]

        });
        me.callParent(arguments);
    },
    buildTiersPayantItems: function (items) {
        let datas = [];
        if (items && items.length > 0) {
            Ext.each(items, function (item) {
                datas.push({
                    fieldLabel: 'Tiers payant',
                    flex: 1,
                    value: item.tiersPayant.strFULLNAME
                },
                        {
                            fieldLabel: 'Motant',
                            flex: 1,
                            value: item.intPRICE,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        },
                        {
                            fieldLabel: 'Taux',
                            flex: 1,
                            value: item.intPERCENT

                        });

            });
        }
        return datas;
    },

    buildReglements: function (reglements) {
        let datas = [];
        if (reglements && reglements.length > 0) {
            Ext.each(reglements, function (item) {
                datas.push(
                        {
                            fieldLabel: item.libelle,
                            flex: 1,
                            value: item.montant,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        }
                        );

            });
        }
        return datas;
    }

});