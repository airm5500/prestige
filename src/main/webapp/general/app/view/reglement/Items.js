/* global Ext */

Ext.define('testextjs.view.reglement.Items', {
    extend: 'Ext.window.Window',
    xtype: 'itemswindow',
    autoShow: true,
    height: 450,
    width: '65%',
    modal: true,
    title: 'DETAILS DU REGLEMENT',
    iconCls: 'icon-grid',
    closeAction: 'hide',
    closable: true,
    maximizable: true,
    bodyPadding: '10px',
    layout: {
        type: 'fit',
        align: 'stretch'
    },
    config: {
        ref: null
    },
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
                    text: 'Annuler'
                }
            ]
        }
    ],
    initComponent: function () {
        var liste = new Ext.data.Store({
            fields: [
                {
                    name: 'reference',
                    type: 'string'
                },
                {
                    name: 'heure',
                    type: 'string'
                },
                {
                    name: 'dateOp',
                    type: 'string'
                },

                {
                    name: 'montantRegle',
                    type: 'number'
                }
            ],
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/reglement/details',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }

            }
        });


        var me = this;
        liste.load({
            params: {
                ref: me.getRef()
            }
        });
        Ext.applyIf(me, {

            items: [
                {
                    xtype: 'fieldset',
                    title: 'Detail du reglement',
                    collapsible: false,
                    flex: 1,
                    defaultType: 'textfield',
                    layout: 'fit',
                    items: [
                        {
                            xtype: 'gridpanel',
                            border: true,
                            store: liste,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true

                            },
                            columns: [

                                {
                                    header: 'Réference',
                                    dataIndex: 'reference',
                                    flex: 1

                                },
                                {
                                    header: 'Date',
                                    dataIndex: 'dateOp',
                                    flex: 1

                                },
                                {
                                    header: 'Heure',
                                    dataIndex: 'heure',
                                    flex: 1

                                },
                                {
                                    xtype: 'numbercolumn',
                                    header: 'Montant Réglé',
                                    format: '0,000.',
                                    dataIndex: 'montantRegle',
                                    flex: 1,
                                    align: 'right'
                                }
                            ],
                            selModel: {
                                selType: 'cellmodel'
                            },
                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: liste,
                                pageSize: 999,
                                dock: 'bottom',
                                displayInfo: true

                            }
                        }
                    ]
                }
            ]

        });
        me.callParent(arguments);
    }
});


