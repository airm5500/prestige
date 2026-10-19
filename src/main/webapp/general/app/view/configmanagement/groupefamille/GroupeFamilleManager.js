var url_services_data_groupefamille = '../webservices/configmanagement/groupefamille/ws_data.jsp';
var url_services_transaction_groupefamille = '../webservices/configmanagement/groupefamille/ws_transaction.jsp?mode=';
var url_services_pdf_groupefamille = '../webservices/configmanagement/groupefamille/ws_generate_pdf.jsp';

Ext.define('testextjs.view.configmanagement.groupefamille.GroupeFamilleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'groupefamillemanager',
    id: 'groupefamillemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.GroupeFamille',
        'testextjs.view.configmanagement.groupefamille.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des Groupes de Familles',
    plain: true,
    maximizable: true,
   // tools: [{type: "pin"}],
    //closable: true,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.GroupeFamille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_groupefamille,
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
                    header: 'lg_GROUPE_FAMILLE_ID',
                    dataIndex: 'lg_GROUPE_FAMILLE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Code groupe',
                    dataIndex: 'str_CODE_GROUPE_FAMILLE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                },
                {
                    header: 'Libelle du groupe de famille',
                    dataIndex: 'str_LIBELLE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                },
                {
                    header: 'Commentaires',
                    dataIndex: 'str_COMMENTAIRE',
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
                    handler: this.onPdfClick
                }, {
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'groupefamille',
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
                        url: url_services_transaction_groupefamille + 'update',
                        params: {
                            lg_GROUPE_FAMILLE_ID: e.record.data.lg_GROUPE_FAMILLE_ID,
                            str_CODE_GROUPE_FAMILLE: e.record.data.str_CODE_GROUPE_FAMILLE,
                            str_NAME: e.record.data.str_NAME,
                            str_DESCRIPTION: e.record.data.str_DESCRIPTION
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
    onAddClick: function () {

        new testextjs.view.configmanagement.groupefamille.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Groupe Famille"
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
        var linkUrl = url_services_pdf_groupefamille;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "groupefamillemanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "groupefamillemanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_groupefamille + 'delete',
                            params: {
                                lg_GROUPE_FAMILLE_ID: rec.get('lg_GROUPE_FAMILLE_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE') + ']', 'Suppression effectuee avec succes');
//                                    
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                //alert("non ok");
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


        new testextjs.view.configmanagement.groupefamille.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Groupe Famille  [" + rec.get('str_NAME') + "]"
        });



    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_groupefamille);
    }

});