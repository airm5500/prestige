
Ext.define('testextjs.view.vente.PreventeDetail', {
    extend: 'Ext.window.Window',
    xtype: 'preventeDetail',
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
        const items = vente.items;
        const typeVente = vente.typeVente;
        const labelWith = 100;
        
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

            pageSize: 9999,
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
                           hidden:true,
                            flex: 0.8,
                            layout: {
                                type: 'fit',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    collapsible: false,
                                    bodyPadding: 1,
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
                                                    fieldLabel: 'Montant total',
                                                    flex: 1,
                                                    value: vente.intPRICE,
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.');
                                                    }
                                                }
                                               
                                            ]
                                        }

                                    ]
                                }
                            ]
                        },
                        {
                            xtype: 'fieldset',
                            flex: 1.8,
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
    }

});