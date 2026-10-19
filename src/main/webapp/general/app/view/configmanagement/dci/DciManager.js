var url_services_data_dci = '../webservices/configmanagement/dci/ws_data.jsp';
var url_services_transaction_dci = '../webservices/configmanagement/dci/ws_transaction.jsp?mode=';



Ext.define('testextjs.view.configmanagement.dci.DciManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'dcimanager',
    id: 'dcimanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Dci',
        'testextjs.view.configmanagement.dci.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion DCI',
    closable: true,
    frame: true,
    initComponent: function () {
        var test = 0;


        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Dci',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_dci,
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
            columns: [{
                    header: 'lg_DCI_ID',
                    dataIndex: 'lg_DCI_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },{
                    header: 'Code DCI',
                    dataIndex: 'str_CODE',                    
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
                    header: 'DCI',
                    dataIndex: 'str_NAME',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
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
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'Delete Plant',
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


        this.on('edit', function (editor, e) {

            Ext.Ajax.request({
                url: url_services_transaction_dci + 'update',
                params: {
                    lg_DCI_ID: e.record.data.lg_DCI_ID,
                    str_NAME: e.record.data.str_NAME,
                    str_CODE: e.record.data.str_CODE
                    
                },
                success: function (response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function (response)
                {
                    console.log("Bug " + response.responseText);
                    alert(response.responseText);
                }
            });
        });


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });

    },
    onStoreLoad: function () {
    },    
   
    onAddClick: function(){

        new testextjs.view.configmanagement.dci.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Dci"
        });
    },
    
    
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_dci + 'delete',
                            params: {
                                lg_DCI_ID: rec.get('lg_DCI_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_NAME') + ']', 'Suppression effectuee avec succes');
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
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
    
    onEditClick: function(grid, rowIndex){
        
        var rec = grid.getStore().getAt(rowIndex);        
       
        new testextjs.view.configmanagement.dci.action.add({ 
            odatasource: rec.data,
            parentview: this,
            mode: "update",          
            titre: "Modification Dci  ["+rec.get('str_NAME')+"]"
        });

  

    },
    
    
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_dci);
    }

});