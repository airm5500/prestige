var url_services_data_clientaccount_tierspayant = '../webservices/configmanagement/compteclienttierspayant/ws_data.jsp';
var url_services_transaction_clientaccount_tierspayant = "";

function amountfarmat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.configmanagement.clientaccounttierspayant.ClientAccountTPManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'clientaccounttpmanager',
    id: 'clientaccounttpmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.CompteClientTierspayant',
        'Ext.ux.ProgressBarPager'
    ], config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
        tools: [{type: "pin"}],
        closable: true,
        nameintern: ''
    },
    title: 'CompteClient.TiersPayant',
    frame: true,
    closable: true,
    initComponent: function() {
        ref = this.getOdatasource().lg_CLIENT_ID;
  
        url_services_data_clientaccount = '../webservices/configmanagement/compteclient/ws_data.jsp?lg_CLIENT_ID=' + ref;

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.CompteClientTierspayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_clientaccount_tierspayant,
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
            width: 950,
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            viewConfig: {
                stripeRows: true
            },
            stateful: true,
            columns: [{
                    header: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID',
                    dataIndex: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Nom',
                    dataIndex: 'str_LAST_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/


                }, {
                    header: 'Prenom',
                    dataIndex: 'str_FIRST_NAME',
                    flex: 1
                }, {
                    header: 'Tiers.Payant',
                    dataIndex: 'str_TIERS_PAYANT_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Taux.Couverture',
                    dataIndex: 'int_POURCENTAGE',
                    flex: 1,
                    renderer: amountfarmat/*,
                     editor: {
                     allowBlank: false
                     }*/
                }/*, {
                    header: 'Solde de Securite',
                    dataIndex: 'int_SOLDE_MINIMAL',
                    flex: 1,
                    renderer: amountfarmat,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Statut',
                    dataIndex: 'str_STATUT',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }*/, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [
                        {
                            icon: 'resources/images/icons/fam/information.png',
                            tooltip: 'Facture Non Payee ',
                            scope: this,
                            handler: this.onFactureClientClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/locked.png',
                            tooltip: '<b>This order is CLOSED</b>, to reopen it please click on this icon.',
                            handler: function(grid, rowIndex, colIndex) {
                                var rec = grid.getStore().getAt(rowIndex);
                                grid.getSelectionModel().select(rowIndex);
                                grid.getStore().getAt(rowIndex).set('str_STATUT', "enable");
                                grid.removeRowCls(grid.getNode(rowIndex), 'line-through');

                                Ext.Ajax.request({
                                    url: url_services_transaction_clientaccount + 'enable',
                                    params: {
                                        lg_CUSTOMER_ACCOUNT_ID: rec.get('lg_CUSTOMER_ACCOUNT_ID')
                                    },
                                    success: function(response)
                                    {
                                        var object = Ext.JSON.decode(response.responseText, false);
                                        if (object.success == 0) {
                                            Ext.MessageBox.alert('Error Message', object.errors);
                                            return;
                                        }
                                        grid.getStore().reload();
                                    },
                                    failure: function(response)
                                    {

                                        var object = Ext.JSON.decode(response.responseText, false);
                                        //  alert(object);

                                        console.log("Bug " + response.responseText);
                                        Ext.MessageBox.alert('Error Message', response.responseText);

                                    }
                                });
                                return;
                            },
                            style: 'margin-left:5px',
                            getClass: function(value, metadata, record) {
                                var closed = record.get('str_STATUT');
                                if (closed == "enable") {
                                    return 'x-hide-display';
                                } else {
                                    return 'x-grid-center-icon';
                                }

                            }
                        }, {
                            icon: 'resources/images/icons/fam/unlocked.png',
                            tooltip: '<b>This request is OPEN</b>. Please click the lock to close this request.',
                            handler: function(grid, rowIndex, colIndex) {
                                var rec = grid.getStore().getAt(rowIndex);
                                grid.getStore().getAt(rowIndex).set('str_STATUT', "disable");
                                grid.addRowCls(grid.getNode(rowIndex), 'line-through');

                                Ext.Ajax.request({
                                    url: url_services_transaction_clientaccount + 'disable',
                                    params: {
                                        lg_CUSTOMER_ACCOUNT_ID: rec.get('lg_CUSTOMER_ACCOUNT_ID')
                                    },
                                    success: function(response)
                                    {
                                        var object = Ext.JSON.decode(response.responseText, false);
                                        if (object.success == 0) {
                                            Ext.MessageBox.alert('Error Message', object.errors);
                                            return;
                                        }
                                        grid.getStore().reload();
                                    },
                                    failure: function(response)
                                    {

                                        var object = Ext.JSON.decode(response.responseText, false);
                                        //  alert(object);

                                        console.log("Bug " + response.responseText);
                                        Ext.MessageBox.alert('Error Message', response.responseText);

                                    }
                                });
                                return;


                            },
                            style: 'margin-left:5px',
                            getClass: function(value, metadata, record) {
                                var closed = record.get('str_STATUT');
                                if (closed == "disable") {
                                    return 'x-hide-display';
                                } else {

                                    return 'x-grid-center-icon';
                                }

                            }
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                /*{
                 text: 'Creer',
                 scope: this,
                 handler: this.onAddClick
                 }, '-',*/ {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Rech'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
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


        this.on('edit', function(editor, e) {



            Ext.Ajax.request({
                url: url_services_transaction_clientaccount + 'update',
                params: {
                    lg_CUSTOMER_ACCOUNT_ID: e.record.data.lg_CUSTOMER_ACCOUNT_ID,
                    int_SOLDE_MINIMAL: e.record.data.int_SOLDE_MINIMAL
                },
                success: function(response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function(response)
                {
                    console.log("Bug " + response.responseText);
                    alert(response.responseText);
                }
            });
        });

    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
    },
    onAddClick: function() {
        // Create a model instance
        var rec = new testextjs.view.sm_user.clientaccount.action.add({
            lg_CUSTOMER_ACCOUNT_ID: 'init',
            int_SOLDE_MINIMAL: ''
        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },
    onCommandeClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "registerordermanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "BY_CUSTOMER", rec.get('str_FIRST_NAME'), rec.data)
    },
    onFactureClientClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "orderCustomeraccountmanager";
        var alias = 'widget.' + xtype;

        // alert(rec.get('lg_CUSTOMER_ACCOUNT_ID'));

        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "BY_CUSTOMER", rec.get('str_FIRST_NAME'), rec.data)
    },
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirmer la suppresssion',
                function(btn) {
                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);

                        Ext.Ajax.request({
                            url: url_services_transaction_clientaccount + 'delete',
                            params: {
                                lg_CUSTOMER_ACCOUNT_ID: rec.get('lg_CUSTOMER_ACCOUNT_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();
                            },
                            failure: function(response)
                            {

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
    /*  onEditClick: function(grid, rowIndex) {
     var rec = grid.getStore().getAt(rowIndex);
     
     
     new testextjs.view.sm_user.client.action.add({
     odatasource: rec.data,
     parentview: this,
     mode: "update",
     titre: "Modification Client  [" + rec.get('str_LAST_NAME') + "]"
     });
     
     
     },
     onEditinstitClick: function(grid, rowIndex) {
     var rec = grid.getStore().getAt(rowIndex);
     
     
     
     new testextjs.view.sm_user.client.action.addInstitution({
     odatasource: rec.data,
     parentview: this,
     mode: "update",
     titre: "Attribution des institutions pour le client[" + rec.get('str_LAST_NAME') + "]"
     });
     },*/
    /*onEditpwdClick: function(grid, rowIndex) {
     var rec = grid.getStore().getAt(rowIndex);
     
     
     new testextjs.view.sm_user.client.action.addpwd({
     odatasource: rec.data,
     parentview: this,
     mode: "update",
     titre: "Modification Client  [" + rec.get('str_LAST_NAME') + "]"
     });
     
     
     },*/
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_clientaccount);
    }

})
