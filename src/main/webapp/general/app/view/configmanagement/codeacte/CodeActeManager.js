var url_services_data_codeacte = '../webservices/configmanagement/codeacte/ws_data.jsp';
var url_services_transaction_codeacte = '../webservices/configmanagement/codeacte/ws_transaction.jsp?mode=';



Ext.define('testextjs.view.configmanagement.codeacte.CodeActeManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'codeactemanager',
    id: 'codeactemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.CodeActe',
        'testextjs.view.configmanagement.codeacte.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gest.CodeActe',
    closable:true,
    frame: true,
    initComponent: function() {
        var test = 0;


        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.CodeActe',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_codeacte,
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
                    header: 'lg_CODE_ACTE_ID',
                    dataIndex: 'lg_CODE_ACTE_ID',
                    hidden: true,
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

                },{
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
                url: url_services_transaction_codeacte + 'update',
                params: {
                    lg_CODE_ACTE_ID: e.record.data.lg_CODE_ACTE_ID,
                    str_LIBELLEE: e.record.data.str_LIBELLEE,
                   // STR_DESCRIPTION: e.record.data.STR_DESCRIPTION
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
        // Create a model instance
        var rec = new testextjs.model.CodeActe({
            lg_CODE_ACTE_ID: 'init',
            str_LIBELLEE: '',
           // STR_DESCRIPTION: ''

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_codeacte + 'delete',
                            params: {
                                lg_CODE_ACTE_ID: rec.get('lg_CODE_ACTE_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                   Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE') + ']', 'Suppression effectuee avec succes');                                    

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
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_codeacte);
    }

});