var url_services_data_sousmenu = '../webservices/sm_user/sous_menu/ws_data.jsp';
var url_services_transaction_sousmenu = '../webservices/sm_user/sous_menu/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.sous_menu.SousmenuManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'sousmenumanager',
    id: 'sousmenumanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.SousMenu',
        'testextjs.view.sm_user.sous_menu.action.add',
        'Ext.ux.ProgressBarPager',
    ],
    title: 'Gestion Sous Menu',
    frame: true,
    initComponent: function() {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.SousMenu',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_sousmenu,
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
                    header: 'lg_SOUS_MENU_ID',
                    dataIndex: 'lg_SOUS_MENU_ID',
                    hidden: true,
                    flex: 1

                }, {
                    header: 'Description',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1
                }, {
                    header: 'Valeur',
                    dataIndex: 'str_VALUE',
                    flex: 1
                }, {
                    header: 'Key',
                    dataIndex: 'P_Key',
                    flex: 1
                }, {
                    header: 'Priorite',
                    dataIndex: 'int_PRIORITY',
                    flex: 1
                }, {
                    header: 'Composant',
                    dataIndex: 'str_COMPOSANT',
                    flex: 1
                }, {
                    header: 'Menu',
                    dataIndex: 'lg_MENU_ID',
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
                url: url_services_transaction_sousmenu + 'update',
                params: {
                    lg_MENU_ID: e.record.data.lg_MENU_ID,
                    lg_SOUS_MENU_ID: e.record.data.lg_SOUS_MENU_ID,
                    str_DESCRIPTION: e.record.data.str_DESCRIPTION,
                    P_Key: e.record.data.P_Key,
                   // str_Status: e.record.data.str_Status,
                    str_VALUE: e.record.data.str_VALUE,
                    str_COMPOSANT: e.record.data.str_COMPOSANT,
                    int_PRIORITY: e.record.data.int_PRIORITY
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
        new testextjs.view.sm_user.sous_menu.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Sous_Menu"
        });
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_sousmenu + 'delete',
                            params: {
                                lg_SOUS_MENU_ID: rec.get('lg_SOUS_MENU_ID')
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

        new testextjs.view.sm_user.sous_menu.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Sous-Menu [" + rec.get('str_DESCRIPTION') + "]"
        });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_menu);
    }

})