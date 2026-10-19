
var Me_Workflow;

Ext.define('testextjs.view.configmanagement.categoryclient.CategoryClientManger', {
    extend: 'Ext.grid.Panel',
    xtype: 'categorymanager',
    id: 'categorymanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.CategoryClient',
        'testextjs.view.configmanagement.categoryclient.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion des Categorie Client',
    urlData:'../webservices/configmanagement/categoryclient/ws_data.jsp',
    urlTransaction:'../webservices/configmanagement/categoryclient/ws_transaction.jsp',
    plain: true,
    maximizable: true,
   
    frame: true,
    initComponent: function() {
        Me_Workflow = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.CategoryClient',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: this.urlData,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store,
            columns: [{
                    header: 'lg_CATEGORY_CLIENT_ID',
                    dataIndex: 'lg_CATEGORY_CLIENT_ID',
                    hidden: true,
                    flex: 1
                 
                },
                {
                    header: 'Libell&eacute;',
                    dataIndex: 'str_LIBELLE',
                    
                    flex: 1
                   
                },
                {
                    header: 'Taux de couverture',
                    dataIndex: 'int_taux',
                    align:'right',
                    flex: 1
                   
                },
                
                {
                    header: 'Description',
                    dataIndex: 'str_ESCRIPTION',
                    flex: 1
                   

                },
                
                {
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
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecherCat',
                    name: 'famillearticle',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Workflow.onRechClick();

                                }
                            });
                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 20,
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


    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
    },
    onAddClick: function() {

        new testextjs.view.configmanagement.categoryclient.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Cr&eacute;ation d'une Cat&eacute;gorie de client"
        });
    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.categoryclient.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification   [" + rec.get('str_LIBELLE') + "]"
        });

    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: Me_Workflow.urlTransaction ,
                            params: {
                                lg_CATEGORY_CLIENT_ID: rec.get('lg_CATEGORY_CLIENT_ID'),
                                mode:'delete'
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', "Echec de suppression");
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Information', "Suppression effectuee");
                                    grid.getStore().reload();
                                }
                            },
                            failure: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecherCat');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        });
    }

});