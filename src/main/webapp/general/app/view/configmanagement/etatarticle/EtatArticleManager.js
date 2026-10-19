var url_services_data_etatarticle = '../webservices/configmanagement/etatarticle/ws_data.jsp';
var url_services_transaction_etatarticle = '../webservices/configmanagement/etatarticle/ws_transaction.jsp?mode=';
var Me_Workflow;
Ext.define('testextjs.view.configmanagement.etatarticle.EtatArticleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'etatarticlemanager',
    id: 'etatarticlemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.EtatArticle',
        'testextjs.view.configmanagement.etatarticle.action.add',
        'Ext.ux.ProgressBarPager'
    ],
    title: 'Gestion des Etat Article',
     plain: true,
        maximizable: true,
      //  tools: [{type: "pin"}],
      //  closable: true,
    frame: true,
    initComponent: function() {


    Me_Workflow = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.EtatArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_etatarticle,
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
            width:'98%',
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_ETAT_ARTICLE_ID',
                    dataIndex: 'lg_ETAT_ARTICLE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Code etat article',
                    dataIndex: 'str_CODE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Libelle',
                    dataIndex: 'str_LIBELLEE',
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
                }, {
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
                    iconCls: 'searchicon',
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
                url: url_services_transaction_etatarticle + 'update',
                params: {
                    
                    lg_ETAT_ARTICLE_ID: e.record.data.lg_ETAT_ARTICLE_ID,                    
                    str_CODE: e.record.data.str_CODE,
                    str_LIBELLEE: e.record.data.str_LIBELLEE
                    
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
        new testextjs.view.configmanagement.etatarticle.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter EtatArticle"
        });
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_etatarticle + 'delete',
                            params: {
                                lg_ETAT_ARTICLE_ID: rec.get('lg_ETAT_ARTICLE_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                     Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLEE') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLEE') + ']', 'Suppression effectuee avec succes');
//                                    
                                }
                                grid.getStore().reload();
                            },
                            failure: function(response)
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
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.etatarticle.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification EtatArticle [" + rec.get('str_LIBELLEE') + "]"
        });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_etatarticle);
    }

});