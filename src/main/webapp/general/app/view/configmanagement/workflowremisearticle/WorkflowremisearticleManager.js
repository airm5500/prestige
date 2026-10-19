var url_services_data_workflowremisearticle = '../webservices/configmanagement/workflowremisearticle/ws_data.jsp';
var url_services_transaction_workflowremisearticle = '../webservices/configmanagement/workflowremisearticle/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.configmanagement.workflowremisearticle.WorkflowremisearticleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'workflowremisearticlemanager',
    id: 'workflowremisearticlemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Workflowremisearticle',
        'testextjs.view.configmanagement.workflowremisearticle.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion des Work flow remise articles',
    plain: true,
    maximizable: true,
    tools: [{type: "pin"}],
    closable: true,
    frame: true,
    initComponent: function () {

//url_services_data_workflowremisearticle = '../webservices/configmanagement/workflowremisearticle/ws_data.jsp';


        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Workflowremisearticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_workflowremisearticle,
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
            store: store,
            columns: [{
                    header: 'lg_WORKFLOW_REMISE_ARTICLE_ID',
                    dataIndex: 'lg_WORKFLOW_REMISE_ARTICLE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Description',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Code Remise',
                    dataIndex: 'str_CODE_REMISE_ARTICLE',                    
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },         
              
                {
                    header: 'Code Grille VO',
                    dataIndex: 'str_CODE_GRILLE_VO',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                 {
                    header: 'Code Grille VNO',
                    dataIndex: 'str_CODE_GRILLE_VNO',
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
                    name: 'workflowremisearticle',
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
        }),
                this.on('edit', function (editor, e) {

                    Ext.Ajax.request({
                        url: url_services_transaction_workflowremisearticle + 'update',
                        params: {
                            lg_WORKFLOW_REMISE_ARTICLE_ID: e.record.data.lg_WORKFLOW_REMISE_ARTICLE_ID,                           
                            str_DESCRIPTION: e.record.data.str_DESCRIPTION,                            
                            str_CODE_REMISE_ARTICLE: e.record.data.str_CODE_REMISE_ARTICLE,
                            str_CODE_GRILLE_VO: e.record.data.str_CODE_GRILLE_VO,
                            str_CODE_GRILLE_VNO: e.record.data.str_CODE_GRILLE_VNO                       
            
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
    
    onAddClick: function () {

        new testextjs.view.configmanagement.workflowremisearticle.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Work flow remise article"
        });
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.workflowremisearticle.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Work flow remise article  [" + rec.get('str_DESCRIPTION') + "]"
        });

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_workflowremisearticle + 'delete',
                            params: {
                                lg_WORKFLOW_REMISE_ARTICLE_ID: rec.get('lg_WORKFLOW_REMISE_ARTICLE_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_DESCRIPTION') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_DESCRIPTION') + ']', 'Suppression effectuee avec succes');
//                                    

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
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_workflowremisearticle);
    }

});