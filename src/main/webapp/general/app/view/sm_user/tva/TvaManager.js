var url_services_data_tva = '../webservices/sm_user/tva/ws_data.jsp';
var url_services_transaction_tva= '../webservices/sm_user/tva/ws_transaction.jsp?mode=';
 function amountfarmat(val) {
    return Ext.util.Format.number(val, '0,000.')   ;
}
Ext.define('testextjs.view.sm_user.tva.TvaManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'tvamanager',
    id: 'tvamanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Parameter',
   'testextjs.view.sm_user.tva.action.add',
    'Ext.ux.ProgressBarPager',

    ],
    title: 'Gest.TVA',
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Parameter',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tva,
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
                header: 'str_KEY',
                dataIndex: 'str_KEY',
               // hidden:true,
                flex: 1/*,
                editor: {
                    allowBlank: false
                }*/
            },{
                header: 'Description',
                dataIndex: 'str_DESCRIPTION',
             flex: 1/*,
                editor: {
                    allowBlank: false
                }*/

            },{
                header: 'Valeur',
                dataIndex: 'str_VALUE',
                flex: 1,
                renderer : amountfarmat,
                editor: {
                    allowBlank: false
                }
            }/*,{
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
            }*/,{
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
            }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
           /* {
                text: 'Creer',
                scope: this,
                handler: this.onAddClick
            },'-',*/{
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
                url: url_services_transaction_tva+'update',
                params: {
                    str_KEY : e.record.data.str_KEY,
                    str_VALUE : e.record.data.str_VALUE
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
   onEditClick: function(grid, rowIndex){
 
   var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.tva.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
         titre: "Modification Donnees  ["+rec.get('str_KEY')+"]"
        });


    },
  /*onAddClick: function(){
        // Create a model instance
        var rec = new testextjs.view.sm_user.table.action.add({
            lg_TABLE_ID: 'init',
            str_NAME: '',
            str_STATUT:''

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },*/


    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_tva+'delete',
                        params: {
                            str_KEY : rec.get('str_KEY')
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
        }, url_services_data_tva);
    }

})