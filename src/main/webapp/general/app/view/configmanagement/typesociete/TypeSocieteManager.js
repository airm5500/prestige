var url_services_data_typesociete = '../webservices/configmanagement/typesociete/ws_data.jsp';
var url_services_transaction_typesociete = '../webservices/configmanagement/typesociete/ws_transaction.jsp?mode=';
var url_services_pdf_typesociete = '../webservices/configmanagement/typesociete/ws_generate_pdf.jsp';


Ext.define('testextjs.view.configmanagement.typesociete.TypeSocieteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'typesocietemanager',
    id: 'typesocietemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.TypeSociete',
        'testextjs.view.configmanagement.typesociete.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion de Type Societe',
     plain: true,
        maximizable: true,
        //tools: [{type: "pin"}],
       // closable: true,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.TypeSociete',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typesociete,
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
                    header: 'lg_TYPE_SOCIETE',
                    dataIndex: 'lg_TYPE_SOCIETE',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Code Type societe',
                    dataIndex: 'str_CODE_TYPE_SOCIETE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Libelle type societe',
                    dataIndex: 'str_LIBELLE_TYPE_SOCIETE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                },/* {
                    header: 'Escompte societe',
                    dataIndex: 'lg_ESCOMPTE_SOCIETE_ID',
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
                    text: 'Imprimer',
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler: this.onPdfClick
                }, {
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'famille',
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
                        url: url_services_transaction_typesociete + 'update',
                        params: {
                            lg_TYPE_SOCIETE: e.record.data.lg_TYPE_SOCIETE,
                            str_CODE_TYPE_SOCIETE: e.record.data.str_CODE_TYPE_SOCIETE,
                            str_LIBELLE_TYPE_SOCIETE: e.record.data.str_LIBELLE_TYPE_SOCIETE,
                            lg_ESCOMPTE_SOCIETE_ID: e.record.data.lg_ESCOMPTE_SOCIETE_ID
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

        new testextjs.view.configmanagement.typesociete.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Type societe"
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
    onPdfClick: function () {
        // alert("ref  " + ref);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_typesociete;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "typesocietemanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "typesocietemanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_typesociete + 'delete',
                            params: {
                                lg_TYPE_SOCIETE: rec.get('lg_TYPE_SOCIETE')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_TYPE_SOCIETE') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_TYPE_SOCIETE') + ']', 'Suppression effectuee avec succes');
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


        new testextjs.view.configmanagement.typesociete.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification  Code gestion  [" + rec.get('str_LIBELLE_TYPE_SOCIETE') + "]"
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
        }, url_services_data_typesociete);
    }

});