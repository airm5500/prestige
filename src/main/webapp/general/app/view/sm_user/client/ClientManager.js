var url_services_data_clientss = '../webservices/configmanagement/client/ws_data.jsp';
var url_services_transaction_clientss = '../webservices/configmanagement/client/ws_transaction.jsp?mode=';



var OadddoventeID;

Ext.define('testextjs.view.sm_user.client.ClientManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'clientmanagerss',
    id: 'clientmanagerIDss',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Client',
        'testextjs.view.sm_user.client.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'
       // 'testextjs.view.sm_user.dovente.action.add'

    ],
    title: 'Gest.Client',
    closable: true,
    frame: true,
    initComponent: function() {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_clientss,
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
                    header: 'lg_CLIENT_ID',
                    dataIndex: 'lg_CLIENT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Code Interne',
                    dataIndex: 'str_CODE_INTERNE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Prenom',
                    dataIndex: 'str_FIRST_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Nom',
                    dataIndex: 'str_LAST_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Genre',
                    dataIndex: 'str_SEXE',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }



                }, {
                    header: 'Securite.Social',
                    dataIndex: 'str_NUMERO_SECURITE_SOCIAL',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Adresse',
                    dataIndex: 'str_ADRESSE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Code.Postal',
                    dataIndex: 'str_CODE_POSTAL',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Ville',
                    dataIndex: 'lg_VILLE_ID',
                    //hidden:true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/


                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_wrench.png',
                            tooltip: 'Vendre',
                            scope: this,
                            handler: this.onVenteClick
                        }]
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
                    text: 'Print',
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler: this.onPrintClick
                }, {
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
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();
        
        // OadddoventeID = Ext.getCmp('adddoventeID');

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });


        this.on('edit', function(editor, e) {



            Ext.Ajax.request({
                url: url_services_transaction_clientss + 'update',
                params: {
                    lg_CLIENT_ID: e.record.data.lg_CLIENT_ID,
                    str_CODE_INTERNE: e.record.data.str_CODE_INTERNE,
                    str_LAST_NAME: e.record.data.str_LAST_NAME,
                    str_FIRST_NAME: e.record.data.str_FIRST_NAME,
                    str_SEXE: e.record.data.str_SEXE,
                    str_NUMERO_SECURITE_SOCIAL: e.record.data.str_NUMERO_SECURITE_SOCIAL,
                    str_ADRESSE: e.record.data.str_ADRESSE,
                    str_CODE_POSTAL: e.record.data.str_CODE_POSTAL,
                    lg_VILLE_ID: e.record.data.lg_VILLE_ID

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

        new testextjs.view.sm_user.client.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Client"
        });
    }, untest: function() {
        alert("jy suis");
    },
    onPrintClick: function() {

        alert("print");


    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_clientss + 'delete',
                            params: {
                                lg_CLIENT_ID: rec.get('lg_CLIENT_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
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


        new testextjs.view.sm_user.client.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Client  [" + rec.get('str_LAST_NAME') + "]"
        });



    },
    onVenteClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "doventecarnetmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Faire une vente carnet", rec.get('str_FIRST_NAME'), rec.data);
    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_clientss);
    }

});