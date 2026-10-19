var url_services_data_specialite = '../webservices/configmanagement/specialite/ws_data.jsp';
var url_services_transaction_specialite = '../webservices/configmanagement/specialite/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.configmanagement.specialite.SpecialiteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'specialitemanager',
    id: 'specialitemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Specialite',
        'testextjs.view.configmanagement.specialite.action.add',
        'Ext.ux.ProgressBarPager'
    ],
    title: 'Gestion des Specialites',
     plain: true,
        maximizable: true,
       // tools: [{type: "pin"}],
       // closable: true,
    frame: true,
    initComponent: function() {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Specialite',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_specialite,
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
                    header: 'lg_SPECIALITE_ID',
                    dataIndex: 'lg_SPECIALITE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
                    header: 'Code Specialite',
                    dataIndex: 'str_CODESPECIALITE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
                    header: 'Libelle',
                    dataIndex: 'str_LIBELLESPECIALITE',
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
                url: url_services_transaction_specialite + 'update',
                params: {
        
                    lg_SPECIALITE_ID: e.record.data.lg_SPECIALITE_ID, 
                    str_CODESPECIALITE: e.record.data.str_CODESPECIALITE,    
                    str_LIBELLESPECIALITE: e.record.data.str_LIBELLESPECIALITE                   
                   
                   
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
        new testextjs.view.configmanagement.specialite.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Specialite"
        });
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_specialite + 'delete',
                            params: {
                                lg_SPECIALITE_ID: rec.get('lg_SPECIALITE_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                     Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLESPECIALITE') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLESPECIALITE') + ']', 'Suppression effectuee avec succes');
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

        new testextjs.view.configmanagement.specialite.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Specialite [" + rec.get('str_LIBELLESPECIALITE') + "]"
        });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_specialite);
    }

});