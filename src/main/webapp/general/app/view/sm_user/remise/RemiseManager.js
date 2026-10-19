var url_services_data_remise = '../webservices/sm_user/sous_menu/ws_data.jsp';
var url_services_transaction_remise = '../webservices/sm_user/sous_menu/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.remise.RemiseManager', {
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
        'testextjs.view.sm_user.remise.action.add',
        'Ext.ux.ProgressBarPager',
    ],
    title: 'Gest.Remise',
    frame: true,
    initComponent: function() {



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
            width: 950,
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'LG_REMISE_ID',
                    dataIndex: 'LG_REMISE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Nom',
                    dataIndex: 'STR_NAME',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Code',
                    dataIndex: 'STR_CODE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, /*{
                    header: 'Statut',
                    dataIndex: 'str_Status',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },*/ {
                    header: 'Taux',
                    dataIndex: 'INT_TAUX',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }



                }, {
                    header: 'Type remise',
                    dataIndex: 'LG_TYPE_REMISE_ID',
                    flex: 1



                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Edit',
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
                            tooltip: 'Delete',
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


        this.on('edit', function(editor, e) {
            Ext.Ajax.request({
                url: url_services_transaction_remise + 'update',
                params: {
                    LG_TYPE_REMISE_ID: e.record.data.LG_TYPE_REMISE_ID,
                    LG_REMISE_ID: e.record.data.LG_REMISE_ID,
                    STR_NAME: e.record.data.STR_NAME,
                    STR_CODE: e.record.data.STR_CODE,
                   // str_Status: e.record.data.str_Status,
                    INT_TAUX: e.record.data.INT_TAUX
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
        new testextjs.view.sm_user.remise.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Remise"
        });
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_remise + 'delete',
                            params: {
                                LG_REMISE_ID: rec.get('LG_REMISE_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
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

        // alert(rec.data.str_DESCRIPTION);

        new testextjs.view.sm_user.remise.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Remise [" + rec.get('STR_NAME') + "]"
        });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_remise);
    }

})