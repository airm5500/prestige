// Lignes de la balance agee recapitulative, en REST. Memes methodes metier et memes cles JSON
// que la JSP ws_data_balance_agee.jsp qu'elle remplace.
var url_services_data_balanceagee = '../api/v1/balance-agee/recap/liste';

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.tierspayantmanagement.balanceagee.BalanceageeManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'balanceagee',
    id: 'balanceageeID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des balances ag&eacute;es recapitulatives',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;

        var store = new Ext.data.Store({
            model: 'testextjs.model.BalanceAgee',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_balanceagee,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });


        Ext.apply(this, {
            width: '98%',
            height: 500,
           
            store: store,
            id: 'GridBalanceAgeeID',
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    hidden: true,
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: 'Periode',
                    dataIndex: 'str_PERIOD',
//                    hidden: true,
                    flex: 1.5
                },
                {
                    header: 'Nombre</br>Factures',
                    dataIndex: 'int_NUMBER_PRODUCT',
                    align: 'right',
                    renderer: amountformat,
                    flex:0.5
                },
                {
                    header: 'Nb.Dossiers</br>Factur&eacute;s',
                    dataIndex: 'int_NUMBER_TRANSACTION',
                    align: 'right',
                    renderer: amountformat,
                    flex: 0.6
                },
               {
                    header: 'Nb.Dossiers</br>Non.Factur&eacute;s',
                    dataIndex: 'int_NBDOSSIER7',
                    align: 'right',
                    renderer: amountformat,
                    flex: 1
                }, 
                {
                    header:  '<span style="color:#333;font-weight:900;">Total.Dossiers</span>',
                    dataIndex: 'int_TOTAL1',
                    align: 'right',
                    flex: 1,
                    renderer: function(val, meta, record, rowIndex){
                        var value=Number(record.get('int_NUMBER_TRANSACTION'))+record.get('int_NBDOSSIER7');
                      return '<span style="color:#333;font-weight:900;">'+amountformat(value)+'</span>';
                    }
                    
                }, 
                
                
                
                {
                    header: 'Montant</br> Factur&eacute;',
                    dataIndex: 'int_MONTANT',
                    align: 'right',
                    renderer: amountformat,
                   
                    flex: 1
                },
                {
                    header: " <span>Montant</span></br><span>Non.Factur&eacute;</span>" ,
                    dataIndex: 'int_MONTANTNONFACTURE7',
                    align: 'right',
                    renderer: amountformat,
                   
                    flex: 1
                },
                {
                    header:  '<span style="color:#333;font-weight:900;">Total.Montant</span>',
//                    dataIndex: '',
                    align: 'right',
                    flex: 1,
                    renderer: function(val, meta, record, rowIndex){
                        var value=Number(record.get('int_MONTANT'))+record.get('int_MONTANTNONFACTURE7');
                      return '<span style="color:#333;font-weight:900;">'+amountformat(value)+'</span>';
                    }
                    
                },
                
                
                
                
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/grid.png',
                            tooltip: 'Voir le detail des balances',
                            scope: this,
                            handler: this.onDetailTransactionClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                '->', {
                    text: 'Exporter CSV',
                    tooltip: 'Exporter la balance ag&eacute;e r&eacute;capitulative en CSV',
                    iconCls: 'export_csv_icon',
                    scope: this,
                    handler: this.onExportCsvClick
                }, '-', {
                    text: 'Exporter EXCEL',
                    tooltip: 'Exporter la balance ag&eacute;e r&eacute;capitulative en Excel',
                    iconCls: 'export_excel_icon',
                    scope: this,
                    handler: this.onExportExcelClick
                }, '-', {
                    text: 'Imprimer',
                    tooltip: 'Imprimer la balance ag&eacute;e r&eacute;capitulative',
                    iconCls: 'printable',
                    scope: this,
                    handler: this.onImprimerClick
                }
            ],
            /*tbar: [
                {
                    xtype: 'combobox',
                    //fieldLabel: 'Tiers payant',
                    //allowBlank: false,
                    name: 'lg_TIERS_PAYANT_ID',
                    margins: '0 0 0 10',
                    id: 'lg_TIERS_PAYANT_ID',
                    store: store_tierspayant,
                    valueField: 'lg_TIERS_PAYANT_ID',
                    displayField: 'str_FULLNAME',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    emptyText: 'Sectionner tiers payant...',
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var lg_TIERS_PAYANT_ID = value;

                            var OGrid = Ext.getCmp('GridBalanceAgeeID');
                            OGrid.getStore().getProxy().url = url_services_data_balanceagee
                                    + "?lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID;
                            OGrid.getStore().reload();

                        }
                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            // alert(me.getSubmitValue());
                            valdatedebut = me.getSubmitValue();
                        }
                    }
                }, {
                    xtype: 'datefield',
                    id: 'datefin',
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            //alert(me.getSubmitValue());
                            valdatefin = me.getSubmitValue();
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Rech'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }],*/
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onExportCsvClick: function () {
        window.location = '../api/v1/balance-agee/recap/csv';
    },
    onExportExcelClick: function () {
        window.location = '../api/v1/balance-agee/recap/excel';
    },
    onImprimerClick: function () {
        window.open('../api/v1/balance-agee/recap/pdf');
    },
//    onRemoveClick: function (grid, rowIndex) {
//        Ext.MessageBox.confirm('Message',
//                'confirmer la suppresssion',
//                function (btn) {
//                    if (btn === 'yes') {
//                        var rec = grid.getStore().getAt(rowIndex);
//                        Ext.Ajax.request({
//                            url: url_services_transaction_tierspayant + 'delete',
//                            params: {
//                                lg_TIERS_PAYANT_ID: rec.get('lg_TIERS_PAYANT_ID')
//                            },
//                            success: function (response)
//                            {
//                                var object = Ext.JSON.decode(response.responseText, false);
//                                if (object.success === 0) {
//                                    Ext.MessageBox.alert('Error Message', object.errors);
//                                    return;
//                                }
//                                grid.getStore().reload();
//                            },
//                            failure: function (response)
//                            {
//                                // alert("non ok");
//                                var object = Ext.JSON.decode(response.responseText, false);
//                                //  alert(object);
//
//                                console.log("Bug " + response.responseText);
//                                Ext.MessageBox.alert('Error Message', response.responseText);
//
//                            }
//                        });
//                        return;
//                    }
//                });
//
//
//    },
    onDetailTransactionClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "balanceageerecapitulatifdetail";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Balance agee detaillee", "", rec.data);
    }/*,
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        var lg_TIERS_PAYANT_ID = "";

        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() == null) {
            lg_TIERS_PAYANT_ID = "";
        } else {
            lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        }

        if (new Date(valdatedebut) > new Date(valdatefin)) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }

        this.getStore().load({
            params: {
                search_value: val.value,
                datedebut: valdatedebut,
                datefin: valdatefin,
                lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID
            }
        }, url_services_data_balanceagee);
    }*/

});