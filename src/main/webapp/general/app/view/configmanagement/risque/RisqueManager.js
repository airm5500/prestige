var url_services_data_risque = '../webservices/configmanagement/risque/ws_data.jsp';
var url_services_transaction_risque = '../webservices/configmanagement/risque/ws_transaction.jsp?mode=';


Ext.define('testextjs.view.configmanagement.risque.RisqueManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'risquemanager',
    id: 'risquemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Risque',
        'testextjs.view.configmanagement.risque.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des Risques',
    plain: true,
    maximizable: true,
  //  tools: [{type: "pin"}],
   // closable: true,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Risque',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_risque,
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
                    header: 'lg_RISQUE_ID',
                    dataIndex: 'lg_RISQUE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Code risque',
                    dataIndex: 'str_CODE_RISQUE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Libelle',
                    dataIndex: 'str_LIBELLE_RISQUE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },
                {
                    header: 'Risque Officiel',
                    dataIndex: 'str_RISQUE_OFFICIEL',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },
                {
                    header: 'Type risque',
                    dataIndex: 'lg_TYPERISQUE_ID',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, /*{
                 header: 'Risque officiel',
                 dataIndex: '',
                 flex: 1,
                 editor: {
                 allowBlank: false  
                 }
                 },*/{
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
//                {
//                    xtype: 'actioncolumn',
//                    width: 30,
//                    sortable: false,
//                    menuDisabled: true,
//                    items: [{
//                            icon: 'resources/images/icons/fam/cog_edit.png',
//                            tooltip: 'Edit password',
//                            scope: this,
//                            handler: this.onEditpwdClick
//                        }]
//                },
//                {
//                    xtype: 'actioncolumn',
//                    width: 30,
//                    sortable: false,
//                    menuDisabled: true,
//                    items: [{
//                            icon:  'resources/images/icons/fam/folder_go.png',
//                            tooltip: 'Associer Numero',
//                            scope: this,
//                            handler: this.onManageFoneClick
//                        }]
//                },
                {
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
                    name: 'risque',
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

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        }),
                this.on('edit', function (editor, e) {



                    Ext.Ajax.request({
                        url: url_services_transaction_risque + 'update',
                        params: {
                            lg_RISQUE_ID: e.record.data.lg_RISQUE_ID,
                            str_CODE_RISQUE: e.record.data.str_CODE_RISQUE,
                            str_LIBELLE_RISQUE: e.record.data.str_LIBELLE_RISQUE,
                            // str_RISQUE_OFFICIEL
                            str_RISQUE_OFFICIEL: e.record.data.str_RISQUE_OFFICIEL,
                            lg_TYPERISQUE_ID: e.record.data.lg_TYPERISQUE_ID


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
    onManageFoneClick: function (grid, rowIndex) {

//        var rec = grid.getStore().getAt(rowIndex);
//        var xtype = "userphonemanager";
//        var  alias ='widget.' + xtype;
//        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype,"",rec.get('str_FIRST_NAME'),rec.data);
//        
    },
    onAddClick: function () {

        new testextjs.view.configmanagement.risque.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Risque"
        });
    },
    onPrintClick: function () {

        //alert("print");
        /*Ext.ux.grid.Printer.printAutomatically = false;
         Ext.ux.grid.Printer.print(grid);*/
        window.print();
        body :{
            visibility:visible
        }
        print: {
            visibility:visible
        }


    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_risque + 'delete',
                            params: {
                                lg_RISQUE_ID: rec.get('lg_RISQUE_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_RISQUE') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_RISQUE') + ']', 'Suppression effectuee avec succes');
//                                    
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                // alert("non ok");
                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });


    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.risque.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification  Risque  [" + rec.get('str_LIBELLE_RISQUE') + "]"
        });



    },
    onEditpwdClick: function (grid, rowIndex) {
//        var rec = grid.getStore().getAt(rowIndex);
//
//
//        new testextjs.view.sm_user.user.action.addpwd({
//            odatasource: rec.data,
//            parentview: this,
//            mode: "update",
//            titre: "Modification Groupe Risque  ["+rec.get('str_LibelleGroup')+"]"
//        });


    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_risque);
    }

});