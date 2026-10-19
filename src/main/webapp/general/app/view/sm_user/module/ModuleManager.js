//var url_services ='../webservices/sm_user/module';
//var url_services_data = url_services+'/ws_data.jsp';
var url_services_data_module ='../webservices/sm_user/module/ws_data.jsp';
var url_services_transaction_module= '../webservices/sm_user/module/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.module.ModuleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'modulemanager',
    id: 'modulemanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Module',
    'testextjs.view.sm_user.module.action.add',
    'Ext.ux.ProgressBarPager',

    ],
    title: 'Gest.Module',
    frame: true,
    initComponent: function() {


        var store = new Ext.data.Store({
            model: 'testextjs.model.Module',
            proxy: {
                type: 'ajax',
                url: url_services_data_module
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
                header: 'lg_MODULE_ID',
                dataIndex: 'lg_MODULE_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Nom',
                dataIndex: 'str_VALUE',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Description',
                dataIndex: 'str_DESCRIPTION',
                flex: 1,
                editor: {
                    allowBlank: false
                }

            },{
                header: 'Type',
                dataIndex: 'str_TYPE',
                hidden:true,
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
            },'-',{
                xtype: 'textfield',
                id:'rechecher',
                name: 'user',

                emptyText: 'Rech'
            },{
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
                url: url_services_transaction_module+'update',
                params: {
                    lg_MODULE_ID : e.record.data.lg_MODULE_ID,
                    str_VALUE : e.record.data.str_VALUE,
                    str_DESCRIPTION : e.record.data.str_DESCRIPTION,
                    str_TYPE : e.record.data.str_TYPE
                },
                success: function(response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function(response)
                {
                    console.log("Bug "+response.responseText);
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

    onStoreLoad: function(){
    },

    onAddClick: function(){
        // Create a model instance
         var rec = new testextjs.model.Module({
            lg_MODULE_ID: 'init',
            str_VALUE: '',
            str_DESCRIPTION:'',
            str_TYPE: ''

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },


    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_module+'delete',
                        params: {
                            lg_MODULE_ID : rec.get('lg_MODULE_ID')
                        },
                        success: function(response)
                        {
                            var object = Ext.JSON.decode(response.responseText,false);
                            if(object.success == 0){
                                 Ext.MessageBox.alert('Error Message', object.errors);
                                return;
                            }
                            grid.getStore().reload();
                        },
                        failure: function(response)
                        {

                            var object = Ext.JSON.decode(response.responseText,false);
                          //  alert(object);

                            console.log("Bug "+response.responseText);
                            Ext.MessageBox.alert('Error Message', response.responseText);

                        }
                    });
                    return;
                });


    },


    onRechClick:function(){
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_module);
    }

});