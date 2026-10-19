//var url_services ='../webservices/configmanagement/institution';
var url_services_data_eventlog = '../webservices/configmanagement/eventlog/ws_data.jsp';
var url_services_transaction_eventlog= '../webservices/configmanagement/eventlog/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.configmanagement.eventlog.EventLogManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'eventlogmanager',
    id: 'eventlogmanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.EventLog',
    'testextjs.view.configmanagement.eventlog.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gest.EventLog',  
     plain: true,
        maximizable: true,
        tools: [{type: "pin"}],
        closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.EventLog',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_eventlog,
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
                header: 'lg_EVENT_LOG_ID',
                dataIndex: 'lg_EVENT_LOG_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }
                },{
                header: 'Matricule Eleve',
                dataIndex: 'MATRICULE_ELEVE',
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
                header: 'Creer Par',
                dataIndex: 'str_CREATED_BY',
                flex: 1,
                editor: {
                    allowBlank: false
                }   
                },{
                header: 'Modifier Par',
                dataIndex: 'str_UPDATED_BY',
                flex: 1,
                editor: {
                    allowBlank: false
                }
                },{
                header: 'Table concerne',
                dataIndex: 'str_TABLE_CONCERN',
                flex: 1,
                editor: {
                    allowBlank: false
                }
                },{
                header: 'Module concerne',
                dataIndex: 'str_MODULE_CONCERN',
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
                    tooltip: 'supprimer',
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
                name: 'eventlog',

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
        }),


        this.on('edit', function(editor, e) {

            Ext.Ajax.request({
                url: url_services_transaction_eventlog+'update',
                params: {
                    lg_EVENT_LOG_ID : e.record.data.lg_EVENT_LOG_ID,
                    MATRICULE_ELEVE : e.record.data.MATRICULE_ELEVE,
                    str_DESCRIPTION : e.record.data.str_DESCRIPTION,
                    str_CREATED_BY : e.record.data.str_CREATED_BY,
                    str_UPDATED_BY : e.record.data.str_UPDATED_BY,
                    str_STATUT : e.record.data.str_STATUT,
                    str_TABLE_CONCERN : e.record.data.str_TABLE_CONCERN,
                    str_MODULE_CONCERN : e.record.data.str_MODULE_CONCERN
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
        var rec = new testextjs.model.EventLog({
            lg_EVENT_LOG_ID: 'init',
            MATRICULE_ELEVE: '',
            str_DESCRIPTION: '',
            str_CREATED_BY: '',
            str_UPDATED_BY: '',
            str_STATUT: '',
            str_TABLE_CONCERN: '',
            str_MODULE_CONCERN: ''            

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },


    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_eventlog+'delete',
                        params: {
                            lg_EVENT_LOG_ID : rec.get('lg_EVENT_LOG_ID')
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
        }, url_services_data_eventlog);
    }

});