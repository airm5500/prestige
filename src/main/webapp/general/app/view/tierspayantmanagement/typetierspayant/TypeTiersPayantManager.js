var url_services_data_typetierspayant = '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp';
var url_services_transaction_typetierspayant= '../webservices/tierspayantmanagement/typetierspayant/ws_transaction.jsp?mode=';

       
Ext.define('testextjs.view.tierspayantmanagement.typetierspayant.TypeTiersPayantManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'typetierspayantmanager',
    id: 'typetierspayantmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.TypeTiersPayant',
        'testextjs.view.tierspayantmanagement.typetierspayant.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gest.TypeTiersPayant',
    closable: true,
    frame: true,
    initComponent: function() {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.TypeTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typetierspayant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
   
        Ext.apply(this, {
            width: 950,
            height: 580,
//            plugins: [this.cellEditing],
            store: store,

            columns: [{
                    header: 'lg_TYPE_TIERS_PAYANT_ID',
                    dataIndex: 'lg_TYPE_TIERS_PAYANT_ID',
                    hidden:true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },{
                    header: 'LIBELLE',
                    dataIndex: 'str_LIBELLE_TYPE_TIERS_PAYANT',
                    flex: 1/*,
                    editor: {
                        allowBlank: false
                    }*/
                },
                {
                    header: 'DESCRIPTION',
                    dataIndex: 'str_CODE_TYPE_TIERS_PAYANT',
                    flex: 1/*,
                    editor: {
                        allowBlank: false
                    }*/
                },{
                    header: 'Date Creation',
                    dataIndex: 'dt_CREATED',
                    flex: 1/*,
                    editor: {
                        allowBlank: false
                    }*/
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
                    text: 'Print',
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler : this.onPrintClick
                },{
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                },'-',{
                    xtype: 'textfield',
                    id:'rechecher',
                    name: 'tierspayant',

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
        }),


        this.on('edit', function(editor, e) {
            
            Ext.Ajax.request({
                url: url_services_transaction_typetierspayant+'update',
                params: {
                    lg_TYPE_TIERS_PAYANT_ID : e.record.data.lg_TYPE_TIERS_PAYANT_ID,
                    str_CODE_TYPE_TIERS_PAYANT : e.record.data.str_CODE_TYPE_TIERS_PAYANT,
                    str_LIBELLE_TYPE_TIERS_PAYANT : e.record.data.str_LIBELLE_TYPE_TIERS_PAYANT,
                    
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
    onManageFoneClick: function(grid, rowIndex){
           
    },

    onAddClick: function(){

        new testextjs.view.tierspayantmanagement.typetierspayant.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Type Tiers Payant"
        });
    },
    onPrintClick: function(){
       
        //alert("print");
        /*Ext.ux.grid.Printer.printAutomatically = false;
        Ext.ux.grid.Printer.print(grid);*/
        window.print();
         body :{
            visibility:visible
        }
        print: {
            visibility:visible
        }
          
               
    },


    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                var rec = grid.getStore().getAt(rowIndex);
                Ext.Ajax.request({
                    url: url_services_transaction_typetierspayant+'delete',
                    params: {
                        lg_TYPE_TIERS_PAYANT_ID : rec.get('lg_TYPE_TIERS_PAYANT_ID')
                    },
                    success: function(response)
                    {
                        var object = Ext.JSON.decode(response.responseText,false);
                        if(object.success === 0){
                            Ext.MessageBox.alert('Error Message', object.errors);
                            return;
                        }
                        grid.getStore().reload();
                    },
                    failure: function(response)
                    {
                        //alert("non ok");
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

       
        new testextjs.view.tierspayantmanagement.typetierspayant.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Type tiers payant  ["+rec.get('str_LIBELLE_TYPE_TIERS_PAYANT')+"]"
        });

   

    },
    onEditpwdClick: function(grid, rowIndex){

    },


    onRechClick:function(){
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_typetierspayant);
    }

});