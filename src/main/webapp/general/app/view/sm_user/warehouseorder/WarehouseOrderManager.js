//var url_services ='../webservices/sm_user/institution';
var url_services_data_warehouseorder = '../webservices/sm_user/warehouseorder/ws_data.jsp';
var url_services_transaction_warehouseorder= '../webservices/sm_user/warehouseorder/ws_transaction.jsp?mode=';
var url_services_pdf_warehouseorder = '../webservices/sm_user/warehouseorder/ws_generate_pdf.jsp';

Ext.define('testextjs.view.sm_user.warehouseorder.WarehouseOrderManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'warehouseorder',
    id: 'warehouseorderID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Warehouseorder',
    'testextjs.view.sm_user.warehouseorder.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion Transaction Commande',  
    closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Warehouseorder',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_warehouseorder,
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
                header: 'lg_WAREHOUSE_ORDER_ID',
                dataIndex: 'lg_WAREHOUSE_ORDER_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }

                },{
                header: 'Utilisateur',
                dataIndex: 'lg_USER_ID',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Produit',
                dataIndex: 'lg_FAMILLE_ID',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },
            {
                header: 'Qte Commandee',
                dataIndex: 'int_NUMBER',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },
            {
                header: 'Date',
                dataIndex: 'dt_CREATED',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },
                
                {
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
                    text: 'Imprimer',
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler : this.onPdfClick
                },'-',{
                xtype: 'textfield',
                id:'rechecher',
                name: 'warehouseorder',

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
                url: url_services_transaction_warehouseorder+'update',
                params: {
                    lg_WAREHOUSE_ORDER_ID : e.record.data.lg_WAREHOUSE_ORDER_ID,
                    lg_USER_ID : e.record.data.lg_USER_ID,
                    lg_FAMILLE_ID : e.record.data.lg_FAMILLE_ID,
                    int_NUMBER : e.record.data.int_NUMBER,
                    dt_CREATED : e.record.data.dt_CREATED
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

 onPdfClick: function () {
        // alert("ref  " + ref);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_warehouseorder;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "warehouseorder";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "warehouseorder";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    
    onAddClick: function(){
        // Create a model instance
        var rec = new testextjs.view.sm_user.warehouseorder.action.add({
            lg_WAREHOUSE_ORDER_ID: 'init',
            lg_USER_ID: '',
            lg_FAMILLE_ID: ''
            

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
                        url: url_services_transaction_warehouseorder+'delete',
                        params: {
                            lg_WAREHOUSE_ORDER_ID : rec.get('lg_WAREHOUSE_ORDER_ID')
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
        }, url_services_data_warehouseorder);
    }

});