/* global Ext */

Ext.define('testextjs.view.commandemanagement.lots.LotsManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'LotStockManager',
    id: 'LotStockManagerID',
    requires: [
        'testextjs.view.commandemanagement.lots.LotGrid',
        'testextjs.store.Lot'
       
   ],
    frame: true,
    title: 'Liste des Lots',
    width: '98%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
    autoScroll: true,
    layout: 'fit',
    items: [{
            xtype: 'lot-grid'

        }

    ], dockedItems: [{
            xtype: 'toolbar',
            dock: 'top',
            items: [
                {
                    xtype: 'textfield',
                    id: 'rechlot',
                    width: 150,
                    emptyText: 'Recherche',
                    listeners: {
                        specialKey: function (field, e, Familletion) {
                            if (e.getKey() === e.ENTER) {
                                var grid = Ext.getCmp('LotGrid');
                                var dt_start_vente = Ext.getCmp('dt_start_lot').getSubmitValue();
                                var dt_end_vente = Ext.getCmp('dt_end_lot').getSubmitValue();

                                grid.getStore().load({
                                    params: {
                                        dtStart: dt_start_vente,
                                        dtEnd: dt_end_vente,
                                        search_value: field.getValue()
                                    }
                                });
                            }

                        }
                    }
                }, {
                    xtype: 'tbseparator'
                },
                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Du',
                    labelWidth: 20,
                    flex: 0.7,
                    id: 'dt_start_lot',
                    listeners: {
                        change: function () {
                            Ext.getCmp('dt_end_lot').setMinValue(this.getValue());
                        }
                    }

                }, {
                    xtype: 'tbseparator'
                }

                ,
                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Au',
                    labelWidth: 20,
                    flex: 0.7,
                    id: 'dt_end_lot',
                    listeners: {
                        change: function () {

                            Ext.getCmp('dt_start_lot').setMaxValue(this.getValue());
                        }
                    }

                }

                , {
                    xtype: 'tbseparator'
                },
                {
                    // flex: 0.4,
                    width: 100,
                    xtype: 'button',
                    iconCls: 'searchicon',
                    text: 'Rechercher',
                    listeners: {
                        click: function () {
                            var grid = Ext.getCmp('LotGrid');
                            var dt_start_vente = Ext.getCmp('dt_start_lot').getSubmitValue();
                            var dt_end_vente = Ext.getCmp('dt_end_lot').getSubmitValue();
                            var search_value = Ext.getCmp('rechlot').getValue();

                            grid.getStore().load({
                                params: {
                                    dtStart: dt_start_vente,
                                    dtEnd: dt_end_vente,
                                    search_value: search_value
                                }
                            });
                        }
                    }


                }, {
                    xtype: 'tbseparator'
                }
              ,
                {
                    width: 100,
                    xtype: 'button',
                    text: 'Imprimer',
                    iconCls: 'printable',
//                    glyph: 0xf1c1,
                    listeners: {
                        click: function () {

                            var dt_start_vente = Ext.getCmp('dt_start_lot').getSubmitValue();
                            var dt_end_vente = Ext.getCmp('dt_end_lot').getSubmitValue();
                            var search_value = Ext.getCmp('rechlot').getValue();
                            var linkUrl = "../webservices/commandemanagement/lots/ws_lot_pdf.jsp" + "?dt_start_vente=" + dt_start_vente + "&dt_end_vente=" + dt_end_vente + "&search_value=" + search_value;
                            window.open(linkUrl);

                        }
                    }


                }


            ]
        }

    ]

});


