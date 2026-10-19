//var url_services ='../webservices/sm_user/institution';
var url_services_data_language = '../webservices/sm_user/language/ws_data.jsp';
var url_services_transaction_language= '../webservices/sm_user/language/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.language.LanguageManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'languagemanager',
    id: 'languagemanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Language',
    'testextjs.view.sm_user.language.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion Language',
    closable: true,
    frame: true,
    
    initComponent: function() {


        var store = new Ext.data.Store({
            model: 'testextjs.model.Language',
            proxy: {
                type: 'ajax',
                url: url_services_data_language
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
                header: 'lg_Language_ID',
                dataIndex: 'lg_Language_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }

                },{
                header: 'Description',
                dataIndex: 'str_Description',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Local City',
                dataIndex: 'str_Local_Cty',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Local Lg',
                dataIndex: 'str_Local_Lg',
                flex: 1,
                editor: {
                    allowBlank: false
                }
          
            },{
                header: 'Code',
                dataIndex: 'str_Code',
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
                url: url_services_transaction_language+'update',
                params: {
                    lg_Language_ID : e.record.data.lg_Language_ID,
                    str_Local_Cty : e.record.data.str_Local_Cty,
                    str_Local_Lg : e.record.data.str_Local_Lg,
                    str_Code : e.record.data.str_Code,
                    str_Description : e.record.data.str_Description
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
        var rec = new testextjs.model.Language({
            lg_Language_ID: 'init',
            str_Local_Cty: '',
            str_Local_Lg:'',
            str_Code: '',
            str_Description: ''

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
                        url: url_services_transaction_language+'delete',
                        params: {
                            lg_Language_ID : rec.get('lg_Language_ID')
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
        }, url_services_data_language);
    }

})