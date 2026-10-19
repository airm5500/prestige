//var url_services ='../webservices/sm_user/institution';
var url_services_data_etatstock = '../webservices/sm_user/etatstock/ws_data.jsp';
var url_services_transaction_etatstock= '../webservices/sm_user/etatstock/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.etatstock.EtatstockManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'etatstockmanager',
    id: 'etatstockmanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Productitemstock',
    'Ext.ux.ProgressBarPager'
 
    ],
    title: 'Stock Par Produit',
     plain: true,
        maximizable: true,
        tools: [{type: "pin"}],
        closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Productitemstock',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_etatstock,
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
                header: 'lg_FAMILLE_STOCK_ID',
                dataIndex: 'lg_FAMILLE_STOCK_ID',
                hidden:true,
                flex: 1
            },        
            {
                header: 'CIP',
                dataIndex: 'int_CIP',
                flex: 1
            },
            {
                header: 'Article',
                dataIndex: 'str_NAME',
                width: 200,
                flex: 1
            }
            ,
            {
                header: 'Prix',
                dataIndex: 'int_PRICE',
                flex: 1
            }
            ,
            {
                header: 'Total en stock',
                dataIndex: 'int_NUMBER',
                flex: 1
            },
            {
                header: 'Total disponible',
                dataIndex: 'int_NUMBER_AVAILABLE',
                flex: 1
            }
        ],
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
            },'-',{
                text: 'Exporter',
                tooltip: 'Exporter',
                scope: this,
                handler: this.onExportClick
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
        });


        this.on('edit', function(editor, e) {

            });


    },


    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },

    onStoreLoad: function(){
    },

    /* onAddClick: function(){
        // Create a model instance
        var rec = new testextjs.view.sm_user.produit.action.add({
            str_NAME: 'init',
            str_NAME: '',
            str_DESCRIPTION:'',
            int_PRICE: '',
            str_STATUT: ''

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },
*/

    /* onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_etatstock+'delete',
                        params: {
                            lg_FAMILLE_STOCK_ID : rec.get('lg_FAMILLE_STOCK_ID')
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
        }, url_services_data_etatstock);
    },
    onExportClick:function(){
        alert("Exporte");
    }

});