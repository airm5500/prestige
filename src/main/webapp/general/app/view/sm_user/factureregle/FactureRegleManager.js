//var url_services ='../webservices/sm_user/menu';
var url_services_data_facturation = '../webservices/sm_user/facturation/ws_data.jsp';
var url_services_transaction_facturation = '../webservices/sm_user/facturation/ws_transaction.jsp?mode=';
var url_services_pdf_tiers_payant = '../webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp?lg_FACTURE_ID=';
var url_services_pdf_fournisseurs = '../webservices/sm_user/facturation/ws_rp_facture_fournisseur.jsp?lg_FACTURE_ID=';
var url_services_data_tiers_payant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';


function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.sm_user.factureregle.FactureRegleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'facturereglemanager',
    id: 'facturereglemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Facture',
        'testextjs.view.sm_user.editfacture.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Liste facture reglee',
    frame: true,
    initComponent: function () {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Facture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_facturation,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_tier_payant = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tiers_payant,
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
            width: "98%",
            height: 520,
            plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_FACTURE_ID',
                    dataIndex: 'lg_FACTURE_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Code Facture',
                    dataIndex: 'str_CODE_FACTURE',
                    flex: 1

                }, {
                    header: 'Type Facture',
                    dataIndex: 'lg_TYPE_FACTURE_ID',
                    flex: 1

                }, {
                    header: 'Organisme',
                    dataIndex: 'str_CUSTOMER_NAME',
                    flex: 1
                }, {
                    header: 'Periode',
                    dataIndex: 'str_PERIODE',
                    flex: 2

                }, {
                    header: 'Nombre de Dossier',
                    dataIndex: 'int_NB_DOSSIER',
                    flex: 1,
                    align: 'right'
                }, {
                    header: 'Montant',
                    dataIndex: 'dbl_MONTANT_CMDE',
                    flex: 1,
                    renderer: amountformat,
                    align: 'right'
                },
                {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1

                },{
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Delete',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/grid.png',
                            tooltip: 'Detail Bordereau',
                            scope: this,
                            handler: this.viewdetailFacture
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Imprimer Bordereau',
                            scope: this,
                            handler: this.onPdfClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Regler Facture',
                            scope: this,
                            handler: this.onPaidFactureClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddCreate
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Rech'
                }, , {
                    xtype: 'combobox',
                    //fieldLabel: 'Tiers payant',
                    //allowBlank: false,
                    name: 'lg_TIERS_PAYANT_ID',
                    margins: '0 0 0 10',
                    id: 'lg_TIERS_PAYANT_ID',
                    store: store_tier_payant,
                    //disabled: true,
                    valueField: 'lg_TIERS_PAYANT_ID',
                    displayField: 'str_NAME',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    emptyText: 'Selectionner tiers payant...',
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            customer_id = value;
                          
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
                          
                            valdatefin = me.getSubmitValue();
                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }, {
                    text: 'Imprimer',
                    tooltip: 'Imprimer',
                    scope: this,
                    handler: this.onPrint
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
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
    onAddCreate: function () {
        var xtype = "addeditfacture";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Creer une facture", "0");

    }, viewdetailFacture: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);

        var typeFacture = rec.get('lg_TYPE_FACTURE_ID');
        // alert(typeFacture);
        if (typeFacture == "tiers payant") {
            var xtype = "detailfacture";
            var alias = 'widget.' + xtype;
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Detail Bordereau", rec.get('lg_FACTURE_ID'), rec.data);

        } else if (typeFacture == "fournisseur") {
            // alert("detailfacturefournisseur");
            var xtype = "detailfacturefournisseur";
            var alias = 'widget.' + xtype;
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Detail Bordereau", rec.get('lg_FACTURE_ID'), rec.data);

        } else {
            alert('type facture inconnu');
        }




    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion',
                function (btn) {
                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_facturation + 'delete',
                            params: {
                                lg_customer_id: rec.get('lg_FACTURE_ID'),
                                mode: 'delete'
                            },
                            success: function (response)
                            {
                                // alert('success');
                                var object = Ext.JSON.decode(response.responseText, false);

                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                // alert('failure');
                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        //alert('edit');

        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "addeditfacture";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Edition de facture", rec.get('lg_FACTURE_ID'), rec.data);



    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value,
                lg_customer_id: Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dt_fin: Ext.getCmp('datefin').getValue(),
                dt_debut: Ext.getCmp('datedebut').getValue()
            }
        }, url_services_data_facturation);
    },
    onPdfClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        var typeFacture = rec.get('lg_TYPE_FACTURE_ID');
        var lg_FACTURE_ID = rec.get('lg_FACTURE_ID');



        if (typeFacture == "tiers payant") {
            var linkUrl = url_services_pdf_tiers_payant + lg_FACTURE_ID;
            window.open(linkUrl);

        } else {
            var linkUrl = url_services_pdf_fournisseurs + lg_FACTURE_ID;
            window.open(linkUrl);
        }


    }, onPrint: function () {
        var linkUrl = url_services_pdf_tiers_payant + lg_FACTURE_ID;
        window.open(linkUrl);

    }
})