var url_services_data_optimisationquantite = '../webservices/configmanagement/optimisationquantite/ws_data.jsp';
var url_services_transaction_optimisationquantite = '../webservices/configmanagement/optimisationquantite/ws_transaction.jsp?mode=';



Ext.define('testextjs.view.configmanagement.optimisationquantite.OptimisationQuantiteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'optimisationquantitemanager',
    id: 'optimisationquantitemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.OptimisationQuantite',
        'testextjs.view.configmanagement.optimisationquantite.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion Optimisation quantite',
   // closable: true,
    frame: true,
    initComponent: function () {
        var test = 0;


        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.OptimisationQuantite',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_optimisationquantite,
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
                    header: 'lg_OPTIMISATION_QUANTITE_ID',
                    dataIndex: 'lg_OPTIMISATION_QUANTITE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Code Optimisation',
                    dataIndex: 'str_CODE_OPTIMISATION',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Libelle Optimisation',
                    dataIndex: 'str_LIBELLE_OPTIMISATION',
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
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Rech'
                }, {
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


        this.on('edit', function (editor, e) {

            Ext.Ajax.request({
                url: url_services_transaction_optimisationquantite + 'update',
                params: {
                    lg_VILLE_ID: e.record.data.lg_VILLE_ID,
                    STR_NAME: e.record.data.STR_NAME,
                    STR_CODE_POSTAL: e.record.data.STR_CODE_POSTAL,
                    STR_BUREAU_DISTRIBUTEUR: e.record.data.STR_BUREAU_DISTRIBUTEUR
                },
                success: function (response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function (response)
                {
                    console.log("Bug " + response.responseText);
                    alert(response.responseText);
                }
            });
        });


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });

    },
    onStoreLoad: function () {
    },
    
   /* onAddClick: function () {
        // Create a model instance
        var rec = new testextjs.model.OptimisationQuantite({
            lg_VILLE_ID: 'init',
            STR_NAME: '',
            STR_CODE_POSTAL: '',
            STR_BUREAU_DISTRIBUTEUR: ''

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },*/
    onAddClick: function(){

        new testextjs.view.configmanagement.optimisationquantite.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Optimisation Quantite"
        });
    },
    
    
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_optimisationquantite + 'delete',
                            params: {
                                lg_OPTIMISATION_QUANTITE_ID: rec.get('lg_OPTIMISATION_QUANTITE_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_OPTIMISATION') + ']', 'Suppression effectuee avec succes');
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });


    },
    
    onEditClick: function(grid, rowIndex){
        var rec = grid.getStore().getAt(rowIndex);

       
        new testextjs.view.configmanagement.optimisationquantite.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Optimisation Quantite  ["+rec.get('str_LIBELLE_OPTIMISATION')+"]"
        });

  

    },
    
    
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_optimisationquantite);
    }

});