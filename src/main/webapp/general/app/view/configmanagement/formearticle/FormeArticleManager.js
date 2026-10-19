var url_services_data_formearticle = '../webservices/configmanagement/formearticle/ws_data.jsp';
var url_services_transaction_formearticle = '../webservices/configmanagement/formearticle/ws_transaction.jsp?mode=';
var Me_Workflow;


Ext.define('testextjs.view.configmanagement.formearticle.FormeArticleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'formearticlemanager',
    id: 'formearticlemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Formearticle',
        'testextjs.view.configmanagement.formearticle.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion Forme Article',
   // closable: true,
    frame: true,
    initComponent: function () {
       Me_Workflow = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Formearticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_formearticle,
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
                    header: 'lg_FORME_ARTICLE_ID',
                    dataIndex: 'lg_FORME_ARTICLE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },{
                    header: 'Code DCI',
                    dataIndex: 'str_CODE',                    
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
                    header: 'Forme Article',
                    dataIndex: 'str_LIBELLE',
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
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
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
                    scope: this,
                    iconCls: 'searchicon',
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: itemsPerPage,
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
                url: url_services_transaction_formearticle + 'update',
                params: {
                    lg_FORME_ARTICLE_ID: e.record.data.lg_FORME_ARTICLE_ID,
                    str_LIBELLE: e.record.data.str_LIBELLE,
                    str_CODE: e.record.data.str_CODE
                    
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
   
    onAddClick: function(){

        new testextjs.view.configmanagement.formearticle.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Forme d'article"
        });
    },
    
    
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_formearticle + 'delete',
                            params: {
                                lg_FORME_ARTICLE_ID: rec.get('lg_FORME_ARTICLE_ID')
                            },
                            success: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    grid.getStore().reload();
                                }
                                
                            },
                            failure: function (response)
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
    
    onEditClick: function(grid, rowIndex){
        
        var rec = grid.getStore().getAt(rowIndex);        
       
        new testextjs.view.configmanagement.formearticle.action.add({ 
            odatasource: rec.data,
            parentview: this,
            mode: "update",          
            titre: "Modification Formearticle  ["+rec.get('str_LIBELLE')+"]"
        });

  

    },
    
    
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_formearticle);
    }

});