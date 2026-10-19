//var url_services ='../webservices/configmanagement/institution';
var url_services_data_tranche = '../webservices/configmanagement/tranche/ws_data.jsp';
var url_services_transaction_tranche= '../webservices/configmanagement/tranche/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.configmanagement.tranche.TrancheManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'tranchemanager',
    id: 'tranchemanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Tranche',
    'testextjs.view.configmanagement.tranche.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion des Tranches', 
     plain: true,
        maximizable: true,
       // tools: [{type: "pin"}],
       // closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Tranche',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tranche,
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
            width: '98%',
            height: 580,
            plugins: [this.cellEditing],
            store: store,

            columns: [{
                header: 'lg_TRANCHE_ID',
                dataIndex: 'lg_TRANCHE_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }

                },{
                header: 'Montant Minimun',
                dataIndex: 'int_MONTANT_MIN',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Montant Maximum',
                dataIndex: 'int_MONTANT_MAX',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Pourcentage de la tranche',
                dataIndex: 'dbl_POURCENTAGE_TRANCHE',
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
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onEditClick
                        }]
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
                name: 'tranche',

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
                url: url_services_transaction_tranche+'update',
                params: {
                    lg_TRANCHE_ID : e.record.data.lg_TRANCHE_ID,
                    int_MONTANT_MIN : e.record.data.int_MONTANT_MIN,
                    int_MONTANT_MAX : e.record.data.int_MONTANT_MAX,
                    dbl_POURCENTAGE_TRANCHE : e.record.data.dbl_POURCENTAGE_TRANCHE
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

        new testextjs.view.configmanagement.tranche.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Tranche"
        });
    },

//    onAddClick: function(){
//        // Create a model instance
//        var rec = new testextjs.model.Tranche({
//            lg_TRANCHE_ID: 'init',
//            int_MONTANT_MIN: '',
//            int_MONTANT_MAX: '',
//            dbl_POURCENTAGE_TRANCHE: ''
//            
//
//        });
//
//        this.getStore().insert(0, rec);
//        this.cellEditing.startEditByPosition({
//            row: 0,
//            column: 0
//        });
//    },

    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_tranche+'delete',
                        params: {
                            lg_TRANCHE_ID : rec.get('lg_TRANCHE_ID')
                        },
                        success: function(response)
                        {
                            var object = Ext.JSON.decode(response.responseText,false);
                            if(object.success === 0){
                                Ext.MessageBox.alert('Suppression tranche ' + '[' + rec.get('int_MONTANT_MIN') +'-'+ rec.get('int_MONTANT_MAX') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression tranche ' + '[' + rec.get('int_MONTANT_MIN') + '-' + rec.get('int_MONTANT_MAX') +']', 'Suppression effectuee avec succes');
//                                    
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

       
        new testextjs.view.configmanagement.tranche.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification  Tranche  ["+rec.get('int_MONTANT_MIN') +'-'+ rec.get('int_MONTANT_MAX')+"]"
        });

  

    },


    onRechClick:function(){
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_tranche);
    }

});