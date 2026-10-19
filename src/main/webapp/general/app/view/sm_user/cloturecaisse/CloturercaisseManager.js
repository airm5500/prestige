var url_services_data_preenregistrement = '../webservices/sm_user/preenregistrement/ws_data.jsp';
var url_services_transaction_preenregistrement = '../webservices/sm_user/preenregistrement/ws_transaction.jsp?mode=';


Ext.define('testextjs.view.sm_user.cloturecaisse.CloturercaisseManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'cloturercaissemanager',
    id: 'cloturercaissemanagerID',
    /* requires: [
     'Ext.selection.CellModel',
     'Ext.grid.*',
     'Ext.window.Window',
     'Ext.data.*',
     'Ext.util.*',
     'Ext.form.*',
     'Ext.JSON.*',
     'testextjs.model.Preenregistrement',
     // 'testextjs.view.sm_user.user.action.add',
     // 'testextjs.view.sm_user.user.action.addpwd',
     'Ext.ux.ProgressBarPager',
     'Ext.ux.grid.Printer',
     
     ],*/
    //  title: 'Pre Enregistrer',
    frame: true,
    collapsible: true,
    animCollapse: false,
    title: 'Cloturer Vente',
     plain: true,
        maximizable: true,
        tools: [{type: "pin"}],
        closable: true,
    iconCls: 'icon-grid',
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {str_FAMILLE_ITEM}</p>',
                    {
                        formatChange: function(v) {
                            var color = v >= 0 ? 'green' : 'red';
                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                        }
                    })
        }],
    initComponent: function() {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Preenregistrement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_preenregistrement,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        /*this.cellEditing = new Ext.grid.plugin.CellEditing({
         clicksToEdit: 1
         });*/


        Ext.apply(this, {
            width: 950,
            height: 580,
            //  plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_PREENREGISTREMENT_ID',
                    dataIndex: 'lg_PREENREGISTREMENT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Reference',
                    dataIndex: 'str_REF',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Prix',
                    dataIndex: 'int_PRICE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Date Creation',
                    dataIndex: 'dt_CREATED',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Vendeur',
                    dataIndex: 'lg_USER_ID',
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
                            icon: 'resources/images/icons/fam/image_add.png',
                            tooltip: 'Cloturer',
                            scope: this,
                            handler: this.onClotureVenteClick
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
               /* {
                    text: 'Print',
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler: this.onPrintClick
                },*/ {
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

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });


        this.on('edit', function(editor, e) {



            Ext.Ajax.request({
                url: url_services_transaction_preenregistrement + 'update',
                params: {
                    lg_PREENREGISTREMENT_ID: e.record.data.lg_PREENREGISTREMENT_ID,
                    str_REF: e.record.data.str_REF,
                    lg_USER_ID: e.record.data.lg_USER_ID,
                    int_PRICE: e.record.data.int_PRICE

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
    onClotureVenteClick: function(grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
         new testextjs.view.sm_user.cloturecaisse.action.cloturevente({
         odatasource: rec.data,
         parentview: this,
         mode: "update",
         titre: "Modification Preenregistrement  ["+rec.get('str_REF')+"]"
         });

    },
    onAddClick: function() {
        new testextjs.view.sm_user.cloturecaisse.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Produit"
        });
    },
    onPrintClick: function() {

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
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_preenregistrement + 'delete',
                            params: {
                                lg_PREENREGISTREMENT_ID: rec.get('lg_PREENREGISTREMENT_ID')
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
         new testextjs.view.sm_user.cloturecaisse.action.add({
         odatasource: rec.data,
         parentview: this,
         mode: "update",
         titre: "Modification Preenregistrement  ["+rec.get('str_REF')+"]"
         });



    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_preenregistrement);
    }

});