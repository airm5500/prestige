var url_services_data_famillearticle = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_transaction_famillearticle = '../webservices/configmanagement/famillearticle/ws_transaction.jsp?mode=';
var Me_Workflow;

Ext.define('testextjs.view.configmanagement.famillearticle.FamilleArticleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'famillearticlemanager',
    id: 'famillearticlemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.FamilleArticle',
        'testextjs.view.configmanagement.famillearticle.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion des Familles',
    plain: true,
    maximizable: true,
    //tools: [{type: "pin"}],
    //closable: true,
    frame: true,
    initComponent: function() {
        Me_Workflow = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famillearticle,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store,
            columns: [{
                    header: 'lg_FAMILLEARTICLE_ID',
                    dataIndex: 'lg_FAMILLEARTICLE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Code Famille',
                    dataIndex: 'str_CODE_FAMILLE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Libelle de la famille',
                    dataIndex: 'str_LIBELLE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },
                {
                    header: 'Groupe Famille',
                    dataIndex: 'lg_GROUPE_FAMILLE_ID',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Commentaires',
                    dataIndex: 'str_COMMENTAIRE',
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
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
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
                url: url_services_transaction_famillearticle + 'update',
                params: {
                    lg_FAMILLEARTICLE_ID: e.record.data.lg_FAMILLEARTICLE_ID,
                    str_CODE_FAMILLE: e.record.data.str_CODE_FAMILLE,
                    str_LIBELLE: e.record.data.str_LIBELLE,
                    str_COMMENTAIRE: e.record.data.str_COMMENTAIRE,
                    lg_GROUPE_FAMILLE_ID: e.record.data.lg_GROUPE_FAMILLE_ID
                },
                success: function(response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function(response)
                {
                    console.log("Bug " + response.responseText);
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
    onStoreLoad: function() {
    },
    onAddClick: function() {

        new testextjs.view.configmanagement.famillearticle.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Famille"
        });
    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.famillearticle.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Famille  [" + rec.get('str_LIBELLE') + "]"
        });

    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_famillearticle + 'delete',
                            params: {
                                lg_FAMILLEARTICLE_ID: rec.get('lg_FAMILLEARTICLE_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Information', object.errors);
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
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_famillearticle);
    }

});