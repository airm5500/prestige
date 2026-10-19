var url_services_data_remise = '../webservices/configmanagement/remise/ws_data.jsp';
var url_services_transaction_remise = '../webservices/configmanagement/remise/ws_transaction.jsp?mode=';
var Me_Workflow;
Ext.define('testextjs.view.configmanagement.remise.RemiseManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'remisemanager',
    id: 'remisemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Remise',
        'testextjs.view.configmanagement.remise.action.add',
        'Ext.ux.ProgressBarPager'
    ],
    title: 'Gestion des Remises',
    plain: true,
    maximizable: true,
//        tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function() {

        Me_Workflow = this;

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Remise',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_remise,
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
                    header: 'lg_REMISE_ID',
                    dataIndex: 'lg_REMISE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Code remise',
                    dataIndex: 'str_CODE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Libelle',
                    dataIndex: 'str_NAME',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Indice de Securite',
                    dataIndex: 'str_IDS',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Taux de remise',
                    dataIndex: 'dbl_TAUX',
//                    hidden: true,
                    flex: 1,
                    renderer: function(value, metadata, record) {
                        var val = "";
                        if (record.get('lg_TYPE_REMISE_ID') == "Remise Client") {
                            val = record.get('dbl_TAUX');
                        }
                        return val;
                    }

                }, {
                    header: 'Type remise',
                    dataIndex: 'lg_TYPE_REMISE_ID',
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
                url: url_services_transaction_remise + 'update',
                params: {
                    lg_TYPE_REMISE_ID: e.record.data.lg_TYPE_REMISE_ID,
                    lg_REMISE_ID: e.record.data.lg_REMISE_ID,
                    str_CODE: e.record.data.str_CODE,
                    str_NAME: e.record.data.str_NAME,
                    str_IDS: e.record.data.str_IDS,
                    dbl_TAUX: e.record.data.dbl_TAUX
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
        new testextjs.view.configmanagement.remise.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Remise"
        });
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_remise + 'delete',
                            params: {
                                lg_REMISE_ID: rec.get('lg_REMISE_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
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
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        // alert(rec.data.str_DESCRIPTION);

        new testextjs.view.configmanagement.remise.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Remise [" + rec.get('str_NAME') + "]"
        });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_remise);
    }

});