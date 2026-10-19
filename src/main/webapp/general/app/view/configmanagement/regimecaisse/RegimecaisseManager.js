var url_services_data_regimecaisse = '../webservices/configmanagement/regimecaisse/ws_data.jsp';
var url_services_transaction_regimecaisse = '../webservices/configmanagement/regimecaisse/ws_transaction.jsp?mode=';


Ext.define('testextjs.view.configmanagement.regimecaisse.RegimecaisseManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'regimecaissemanager',
    id: 'regimecaissemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Regimecaisse',
        'testextjs.view.configmanagement.regimecaisse.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des Regimes de caisse',
    plain: true,
    maximizable: true,
    tools: [{type: "pin"}],
    closable: true,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Regimecaisse',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_regimecaisse,
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
                    header: 'lg_REGIMECAISSE_ID',
                    dataIndex: 'lg_REGIMECAISSE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Code regime caisse',
                    dataIndex: 'str_CODEREGIMECAISSE',
                    flex: 1,
                    maskRe: /[0-9.]/,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Libelle',
                    dataIndex: 'str_LIBELLEREGIMECAISSE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Controle Matricule',
                    dataIndex: 'bool_CONTROLEMATRICULE',
                    flex: 1,
                    renderer: function (val) {
                        if (val === 'true') {
                            val = 'Active';
                        } else {
                            val = 'Desactive';
                        }
                        return val;
                    }

                }, {
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
                    text: 'Imprimer',
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler: this.onPrintClick
                }, {
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'regimecaisse',
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
                        url: url_services_transaction_regimecaisse + 'update',
                        params: {
                            lg_REGIMECAISSE_ID: e.record.data.lg_REGIMECAISSE_ID,
                            str_CODEREGIMECAISSE: e.record.data.str_CODEREGIMECAISSE,
                            str_LIBELLEREGIMECAISSE: e.record.data.str_LIBELLEREGIMECAISSE,
                            bool_CONTROLEMATRICULE: e.record.data.bool_CONTROLEMATRICULE
                                    //str_LibelleGroup : e.record.data.str_LibelleGroup,
                                    //str_Commantaires : e.record.data.str_Commantaires


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

        new testextjs.view.configmanagement.regimecaisse.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Regime Caisse"
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
                            url: url_services_transaction_regimecaisse + 'delete',
                            params: {
                                lg_REGIMECAISSE_ID: rec.get('lg_REGIMECAISSE_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLEREGIMECAISSE') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLEREGIMECAISSE') + ']', 'Suppression effectuee avec succes');
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


        new testextjs.view.configmanagement.regimecaisse.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Regime Caisse  [" + rec.get('str_LIBELLEREGIMECAISSE') + "]"
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
//            titre: "Modification Groupe Famille  ["+rec.get('str_LibelleGroup')+"]"
//        });


    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_regimecaisse);
    }

});