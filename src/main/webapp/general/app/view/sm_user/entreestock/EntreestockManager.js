//var url_services ='../webservices/sm_user/institution';
var url_services_data_entreestock = '../webservices/sm_user/entreestock/ws_data.jsp';
var url_services_transaction_entreestock= '../webservices/sm_user/entreestock/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.entreestock.EntreestockManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'entreestockmanager',
    id: 'entreestockmanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Warehouse',
    'testextjs.view.sm_user.entreestock.action.add',
    'Ext.ux.ProgressBarPager',

    ],
    title: 'Entree en Stock',
     plain: true,
        maximizable: true,
        tools: [{type: "pin"}],
        closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Warehouse',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_entreestock,
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
                header: 'lg_WAREHOUSE_ID',
                dataIndex: 'lg_WAREHOUSE_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Utilisateur',
                dataIndex: 'lg_USER_ID',
                flex: 1/*,
                editor: {
                    allowBlank: false
                }*/
            },/*{
                header: 'Description',
                dataIndex: 'str_DESCRIPTION',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },*/{
                header: 'Produit',
                dataIndex: 'lg_PRODUCT_ITEM_ID',
                flex: 1/*,
                editor: {
                    allowBlank: false
                }*/

            },{
                header: 'Quantite',
                dataIndex: 'int_NUMBER',
            flex: 1 /*,
                editor: {
                    allowBlank: false
                }*/

            },{
                header: 'Date',
                dataIndex: 'dt_CREATED',
            flex: 1 /*,
                editor: {
                    allowBlank: false
                }*/

            },{
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [/*{
                    icon: 'resources/images/icons/fam/delete.gif',
                    tooltip: 'Delete Plant',
                    scope: this,
                    handler: this.onRemoveClick
                }*/]
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

            /*   Ext.Ajax.request({
                url: url_services_transaction_produit+'update',
                params: {
                    lg_PRODUCT_ITEM_ID : e.record.data.lg_PRODUCT_ITEM_ID,
                    str_NAME : e.record.data.str_NAME,
                    str_DESCRIPTION : e.record.data.str_DESCRIPTION,
                    int_PRICE : e.record.data.int_PRICE,
                    str_STATUT : e.record.data.str_STATUT
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
            });*/
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
        new testextjs.view.sm_user.entreestock.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Entree en Stock"
        });

       /* this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });*/
    },


   /* onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_entreestock+'delete',
                        params: {
                            lg_WAREHOUSE_ID : rec.get('lg_WAREHOUSE_ID')
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


    },*/


    onRechClick:function(){
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_entreestock);
    }

})