//var url_services ='../webservices/sm_user/institution';
var url_services_data_typeremise = '../webservices/configmanagement/typeremise/ws_data.jsp';
var url_services_transaction_typeremise= '../webservices/sm_user/typeremise/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.typeremise.TypeRemiseManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'typeremisemanager',
    id: 'typeremisemanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.TypeRemise',
    'testextjs.view.sm_user.typeremise.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gest.TypeRemise',    
    frame: true,
    initComponent: function() {


        var store = new Ext.data.Store({
            model: 'testextjs.model.TypeRemise',
            proxy: {
                type: 'ajax',
                url: url_services_data_typeremise
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
                header: 'LG_TYPE_REMISE_ID',
                dataIndex: 'LG_TYPE_REMISE_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }

                },{
                header: 'Nom',
                dataIndex: 'STR_NAME',
                flex: 1,
                editor: {
                    allowBlank: false
                }
                },{
                header: 'Description',
                dataIndex: 'STR_DESCRIPTION',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            }
            

            ,{
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
                name: 'typeremise',

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
                url: url_services_transaction_typeremise+'update',
                params: {
                    LG_TYPE_REMISE_ID : e.record.data.LG_TYPE_REMISE_ID,
                    STR_NAME : e.record.data.STR_NAME,
                    STR_DESCRIPTION : e.record.data.STR_DESCRIPTION
                    
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
        var rec = new testextjs.view.sm_user.typeremise.action.add({
            LG_TYPE_REMISE_ID: 'init',
            STR_NAME: '',
            STR_DESCRIPTION:''
            

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
                        url: url_services_transaction_typeremise+'delete',
                        params: {
                            LG_TYPE_REMISE_ID : rec.get('LG_TYPE_REMISE_ID')
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
        }, url_services_data_typeremise);
    }

})