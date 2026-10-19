var url_services_data_imprimantemanager = '../webservices/configmanagement/imprimantemanager/ws_data.jsp';
var url_services_transaction_imprimantemanager = '../webservices/configmanagement/imprimantemanager/ws_transaction.jsp?mode=';
var Me;
Ext.define('testextjs.view.configmanagement.imprimantemanager.ImprimanteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'imprimantemanager',
    id: 'imprimantemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager'
    ],
    title: 'Gestion des imprimantes',
    closable: false,
    frame: true,
    initComponent: function() {

        Me = this;

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Imprimante',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_imprimantemanager,
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
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_IMPRIMANTE_ID',
                    dataIndex: 'lg_IMPRIMANTE_ID',
                    hidden: true,
                    flex: 1
                },
                {
                    header: 'Designation',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 2
                },
                {
                    header: 'Action',
                    dataIndex: 'str_NAME',
                    flex: 1
                },
                 {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onEditClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    hidden: true,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Associer des utilisateurs a cette imprimante',
                            scope: this,
                            handler: this.onManagePrintClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Rech',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();
                                    
                                }
                            });
                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();
        //this.checkPrivilegeToUI();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });

    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onManagePrintClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.imprimantemanager.action.addPrint({
            odatasource: "",
            parentview: this,
            mode: "addtouser",
            titre: "Associer un nouvel utilisateur a l'imprimante " + rec.get('str_DESCRIPTION')
        });
    },
    onStoreLoad: function() {
    },
    onAddClick: function() {
        new testextjs.view.configmanagement.imprimantemanager.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter une imprimante"
        });
    },
    
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_imprimantemanager + 'delete',
                            params: {
                                lg_IMPRIMANTE_ID: rec.get('lg_IMPRIMANTE_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }
                                
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
                    });


    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.imprimantemanager.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Imprimante [" + rec.get('str_DESCRIPTION') + "]"
        });



    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_imprimantemanager);
    }

});