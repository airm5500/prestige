
/* global Ext */

var store_etiquette;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.commandemanagement.lots.LotGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.lot-grid',
    initComponent: function () {
        var store = Ext.create('testextjs.store.Lot');

        store_etiquette = new Ext.data.Store({
            model: 'testextjs.model.Typeetiquette',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/typeetiquette/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });




        Ext.apply(this, {
            id: 'LotGrid',
            store: store,
            viewConfig: {
                forceFit: true,
                // emptyText: '<h1 style="margin:10px 10px 10px 70px;">Pas de donn&eacute;es</h1>'
            },
            columns: [
                {
                    header: 'id',
                    dataIndex: 'lg_LOT_ID',
                    hidden: true
                },
                {
                    header: 'Code CIP',
                    dataIndex: 'CIP',
                    flex: 1

                },
                {
                    header: 'Etiquette',
                    dataIndex: 'ETIQUETTE',
                    flex: 1,
                    hidden: true,

                },
                {
                    header: 'Libell&eacute;',
                    dataIndex: 'LIBELLE',
                    flex: 2
                },
                {
                    header: 'R&eacute;f.Livraison',
                    dataIndex: 'REFBL',
                    flex: 1
                },
                {
                    header: 'R&eacute;f.CMDE',
                    dataIndex: 'REFCMDE',
                    flex: 1
                },
                {
                    text: 'Num.Lot',
                    dataIndex: 'NUMLOT',
                    flex: 0.5,
                    align: 'right'
                }
                , {
                    header: 'Grossiste',
                    dataIndex: 'GROSSISTE',
                    flex: 1.5,
                },
                {
                    text: 'Qt&eacute;',
                    dataIndex: 'NUMBER',
                    align: 'center',
                    flex: 0.5,
                    renderer: amountformat
                },
                {
                    text: 'Qt&eacute; Gratuite',
                    dataIndex: 'NUMBERGT',
                    align: 'center',
                    flex: 0.5,
                    renderer: amountformat
                },
                {
                    text: 'Date Entr&eaacute;e',
                    dataIndex: 'DATESORTIE',
                    flex: 0.7,
                    align: 'center'
                },
                {
                    text: 'Date P&eacute;remption',
                    dataIndex: 'DATEPEREMPTION',
                    flex: 0.7,
                    align: 'center'
                },
                {
                    xtype: 'actioncolumn',
                    flex: 0.4,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: function (grid, rowIndex) {
                                var record = grid.getStore().getAt(rowIndex);
                                var win = Ext.create("Ext.window.Window", {
                                    title: "Modification",
                                    id: 'lotwindow',
                                    width: 500,
                                    layout: {
                                        type: 'fit'
                                    },
                                    height: 280,
                                    items: [{
                                            xtype: 'form',
                                            id: 'lotform',
                                            bodyPadding: 5,
                                            layout: 'anchor',
                                            modelValidation: true,
                                            items: [
                                                {
                                                    xtype: 'fieldset',
                                                    bodyPadding: 10,
                                                    // title: '',
                                                    layout: 'anchor',
                                                    defaults: {
                                                        anchor: '100%',
                                                        labelAlign: 'right',
                                                        labelWidth: 115,
                                                        msgTarget: 'side'

                                                    },
                                                    items: [
                                                        {xtype: 'displayfield',
                                                            fieldLabel: 'Quantite',
                                                            emptyText: 'Quantite',
                                                            name: 'int_NUMBER',
                                                            value: record.get('NUMBER'),
                                                            allowBlank: false


                                                        },
                                                        {
                                                            xtype: 'displayfield',
                                                            fieldLabel: 'Quantite gratuite',
                                                            name: 'int_QUANTITE_FREE',
                                                            value: record.get('NUMBERGT'),
                                                            allowBlank: false



                                                        }, {
                                                            xtype: 'displayfield',
                                                            fieldLabel: 'Date fabrication',
                                                            name: 'int_SORTIE_USINE',
                                                            value: record.get('DATESORTIE')


                                                        }, {
                                                            xtype: 'datefield',
                                                            fieldLabel: 'Date peremption',
                                                            name: 'str_PEREMPTION',
                                                            value: record.get('DATEPEREMPTION'),
                                                            dateFormat: 'd/m/Y',
                                                            submitFormat: 'Y-m-d',
                                                            minValue: new Date(),
                                                            allowBlank: false

                                                        },
                                                        {
                                                            xtype: 'combobox',
                                                            fieldLabel: 'Type etiquette',
                                                            name: 'lg_TYPEETIQUETTE_ID',

                                                            store: store_etiquette,
                                                            value: record.get('ETIQUETTE'),
                                                            valueField: 'lg_TYPEETIQUETTE_ID',
                                                            displayField: 'str_DESCRIPTION',
                                                            typeAhead: true,
                                                            queryMode: 'remote',
                                                            emptyText: 'Choisir un type d\'etiquette...'
                                                        },
                                                        {
                                                            xtype: 'textfield',
                                                            fieldLabel: 'Reference Lot',
                                                            emptyText: 'Reference Lot',
                                                            name: 'int_NUM_LOT',
                                                            value: record.get('NUMLOT'),
                                                            allowBlank: false
//                                                          
                                                        }
                                                    ]}]

                                        }]
                                    ,
                                    dockedItems: [
                                        {
                                            xtype: 'toolbar',
                                            dock: 'bottom',
                                            ui: 'footer',
                                            layout: {
                                                pack: 'end', //#22
                                                type: 'hbox'
                                            },
                                            items: [
                                                {
                                                    xtype: 'button',
                                                    text: 'Enregistrer',
                                                    listeners: {
                                                        click: function () {
                                                            var form = Ext.getCmp('lotform');

                                                            if (form && form.isValid()) {
                                                                form.submit({
                                                                    clientValidation: true,
                                                                    type: 'json',
                                                                    url: '../webservices/commandemanagement/lots/ws_transaction.jsp?mode=update&lg_LOT_ID=' + record.get('lg_LOT_ID'),
                                                                    scope: this,
                                                                    success: function (response) {
                                                                        Ext.MessageBox.alert('confirmation', "La modification du Lot est &eacute;ffectu&eacute;e avec succ&egrave;s");
                                                                        win.close();
                                                                        Ext.getCmp('LotGrid').getStore().reload();


                                                                    },
                                                                    failure: function (response) {

                                                                        Ext.MessageBox.alert('&eacute;chec', "La modification du Lot a  &eacute;chou&eacute;");
                                                                        win.close();



                                                                    }
                                                                });
                                                            }
                                                        }
                                                    }
                                                },
                                                {
                                                    xtype: 'button',
                                                    text: 'Annuler',
//                   
                                                    listeners: {
                                                        click: function () {
                                                            win.close();
                                                        }

                                                    }
                                                }
                                            ]
                                        }
                                    ]

                                });
                                win.show();











                            }
                        }


                    ]
                }

            ],
            selModel: {
                selType: 'cellmodel'
            },
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true,
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            dtStart: '',
                            dtEnd: '',
                            search_value: ''
                        };
                        var search_value = Ext.getCmp('rechlot').getValue();
                        var dt_start = Ext.getCmp('dt_start_lot').getSubmitValue();
                        var dt_end = Ext.getCmp('dt_end_lot').getSubmitValue();
                        myProxy.setExtraParam('dtStart', dt_start);
                        myProxy.setExtraParam('dtEnd', dt_end);
                        myProxy.setExtraParam('search_value', search_value);

                    }

                }
            }
        });
        this.callParent();
    }




});


