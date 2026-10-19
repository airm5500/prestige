var url_services_data_tauxrembourssement = '../webservices/configmanagement/tauxrembourssement/ws_data.jsp';
var url_services_transaction_tauxrembourssement = '../webservices/configmanagement/tauxrembourssement/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.configmanagement.tauxrembourssement.TauxrembourssementManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'tauxrembourssementmanager',
    id: 'tauxrembourssementmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Tauxrembourssement',
        'testextjs.view.configmanagement.tauxrembourssement.action.add',
        'Ext.ux.ProgressBarPager'
    ],
    title: 'Gestion des Taux de Rembourssements',
     plain: true,
        maximizable: true,
        tools: [{type: "pin"}],
        closable: true,
    frame: true,
    initComponent: function() {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Tauxrembourssement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tauxrembourssement,
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
                    header: 'lg_TAUX_REMBOUR_ID',
                    dataIndex: 'lg_TAUX_REMBOUR_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Code taux rembourssement',
                    dataIndex: 'str_CODE_REMB',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
                    header: 'Libelle',
                    dataIndex: 'str_LIBELLEE',
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
        }),


        this.on('edit', function(editor, e) {
            Ext.Ajax.request({
                url: url_services_transaction_tauxrembourssement + 'update',
                params: {
                   lg_TAUX_REMBOUR_ID: e.record.data.lg_TAUX_REMBOUR_ID,                    
                    str_CODE_REMB: e.record.data.str_CODE_REMB,
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
        new testextjs.view.configmanagement.tauxrembourssement.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Taux de Rembourssement"
        });
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_tauxrembourssement + 'delete',
                            params: {
                                lg_TAUX_REMBOUR_ID: rec.get('lg_TAUX_REMBOUR_ID')
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

        // alert(rec.data.str_DESCRIPTION);

        new testextjs.view.configmanagement.tauxrembourssement.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Taux de Rembourssement [" + rec.get('str_LIBELLEE') + "]"
        });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_tauxrembourssement);
    }

});