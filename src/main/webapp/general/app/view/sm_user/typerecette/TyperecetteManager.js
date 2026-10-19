var url_services_data_typerecette = '../webservices/sm_user/typerecette/ws_data.jsp';
var url_services_transaction_typerecette= '../webservices/sm_user/typerecette/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.typerecette.TyperecetteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'typerecettemanager',
    id: 'typerecettemanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Typerecette',
    'testextjs.view.sm_user.typerecette.action.add',
    'Ext.ux.ProgressBarPager',

    ],
    title: 'Gest.Type Recette',
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Typerecette',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typerecette,
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
                header: 'lg_TYPE_RECETTE_ID',
                dataIndex: 'lg_TYPE_RECETTE_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Type Recette',
                dataIndex: 'str_TYPE_RECETTE',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Numero Compte',
                dataIndex: 'str_NUMERO_COMPTE',
                flex: 1  ,
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
                store: store,   // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


        this.on('edit', function(editor, e) {

            Ext.Ajax.request({
                url: url_services_transaction_typerecette+'update',
                params: {
                    lg_TYPE_RECETTE_ID : e.record.data.lg_TYPE_RECETTE_ID,
                    str_TYPE_RECETTE : e.record.data.str_TYPE_RECETTE,
                    str_NUMERO_COMPTE : e.record.data.str_NUMERO_COMPTE
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
        var rec = new testextjs.view.sm_user.typerecette.action.add({
            lg_TYPE_RECETTE_ID: 'init',
            str_TYPE_RECETTE: '',
            str_NUMERO_COMPTE:''

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
                        url: url_services_transaction_typerecette+'delete',
                        params: {
                            lg_TYPE_RECETTE_ID : rec.get('lg_TYPE_RECETTE_ID')
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
        }, url_services_data_typerecette);
    }

})