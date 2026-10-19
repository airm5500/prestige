//var url_services ='../webservices/configmanagement/institution';
var url_services_data_dossiertierspayant = '../webservices/configmanagement/dossiertierspayant/ws_data.jsp';
var url_services_transaction_dossiertierspayant= '../webservices/configmanagement/dossiertierspayant/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.configmanagement.dossiertierspayant.DossierTiersPayantManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'dossiertierspayantmanager',
    id: 'dossiertierspayantmanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.DossierTiersPayant',
    'testextjs.view.configmanagement.dossiertierspayant.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gest.DossierTierspayant', 
     plain: true,
        maximizable: true,
        tools: [{type: "pin"}],
        closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.DossierTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_dossiertierspayant,
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
                header: 'lg_DOSSIER_TIERS_PAYANT_ID',
                dataIndex: 'lg_DOSSIER_TIERS_PAYANT_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }

                },{
                header: 'Numero de tri',
                dataIndex: 'str_NUMERO_TRI',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Libelle du dossier',
                dataIndex: 'str_LIBELLE_DOSSIER',
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
                name: 'dossiertierspayant',

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
                url: url_services_transaction_dossiertierspayant+'update',
                params: {
                    lg_DOSSIER_TIERS_PAYANT_ID : e.record.data.lg_DOSSIER_TIERS_PAYANT_ID,
                    str_NUMERO_TRI : e.record.data.str_NUMERO_TRI,
                    str_LIBELLE_DOSSIER : e.record.data.str_LIBELLE_DOSSIER
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
        var rec = new testextjs.view.configmanagement.dossiertierspayant.action.add({
            lg_DOSSIER_TIERS_PAYANT_ID: 'init',
            str_NUMERO_TRI: '',
            str_LIBELLE_DOSSIER: ''
            

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
                        url: url_services_transaction_dossiertierspayant+'delete',
                        params: {
                            lg_DOSSIER_TIERS_PAYANT_ID : rec.get('lg_DOSSIER_TIERS_PAYANT_ID')
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
        }, url_services_data_dossiertierspayant);
    }

});