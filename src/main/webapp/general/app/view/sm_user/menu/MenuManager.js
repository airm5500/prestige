//var url_services ='../webservices/sm_user/menu';
var url_services_data_menu = '../webservices/sm_user/menu/ws_data.jsp';
var url_services_transaction_menu= '../webservices/sm_user/menu/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.menu.MenuManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'menumanager',
    id: 'menumanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Menu',
    'testextjs.view.sm_user.menu.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gest.Menu',
    frame: true,
    initComponent: function() {
      
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Menu',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_menu,
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
                header: 'lg_MENU_ID',
                dataIndex: 'lg_MENU_ID',
                hidden:true,
                flex: 1/*,
                editor: {
                    allowBlank: false
                }*/

                 },{
                header: 'Description',
                dataIndex: 'str_DESCRIPTION',
                flex: 1

                 } ,{
                header: 'Valeur',
                dataIndex: 'str_VALUE',
                flex: 1

                 },{
                header: 'Key',
                dataIndex: 'P_KEY',
                flex: 1

                 },{
                header: 'Priorite',
                dataIndex: 'int_PRIORITY',
                flex: 1


            },{
                header: 'Type',
                dataIndex: 'str_TYPE',
                hidden:true,
                flex: 1

            },{
                header: 'Module',
                dataIndex: 'lg_MODULE_ID',
                flex: 1



            },{
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                    icon: 'resources/images/icons/fam/page_white_edit.png',
                    tooltip: 'Edit',
                    scope: this,
                    handler: this.onEditClick
                }]
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
        });


        this.on('edit', function(editor, e) {
            


            Ext.Ajax.request({
                url: url_services_transaction_menu+'update',
                params: {
                    lg_MENU_ID : e.record.data.lg_MENU_ID,
                    lg_MODULE_ID : e.record.data.lg_MODULE_ID,
                    P_KEY : e.record.data.P_KEY,
                    str_DESCRIPTION : e.record.data.str_DESCRIPTION,
                    str_VALUE :e.record.data.str_VALUE,
                    str_TYPE : e.record.data.str_TYPE,
                   // str_Status:e.record.data.str_Status,
                    int_PRIORITY:e.record.data.int_PRIORITY
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
         /*var xtype = "menumetromanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "","","");*/

        
       new testextjs.view.sm_user.menu.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Menu"
        });
    },


    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_menu+'delete',
                        params: {
                            lg_MENU_ID : rec.get('lg_MENU_ID')
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
    onEditClick: function(grid, rowIndex){
        var rec = grid.getStore().getAt(rowIndex);

        // alert(rec.data.str_DESCRIPTION);

        new testextjs.view.sm_user.menu.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Menu ["+rec.get('str_DESCRIPTION')+"]"
        });



    },


    onRechClick:function(){
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_menu);
    }

});