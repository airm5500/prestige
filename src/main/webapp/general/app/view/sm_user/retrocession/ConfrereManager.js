var url_services_data_client_other = '../webservices/configmanagement/client/ws_data_by_type.jsp';
var url_services_transaction_client = '../webservices/configmanagement/client/ws_transaction.jsp?mode=';


Ext.define('testextjs.view.sm_user.retrocession.ConfrereManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'confreremanager',
    id: 'confreremanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Client',
        'testextjs.view.configmanagement.client.action.add',
//        'testextjs.view.configmanagement.client.action.addComptecltTierpayant',
        'testextjs.view.configmanagement.ayantdroit.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des Conf&egrave;res',
    closable: false,
    frame: true,
    initComponent: function () {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_client_other+ "?lg_TYPE_CLIENT_ID=3",
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
            height: valheight,
            plugins: [this.cellEditing],
            store: store,
            id: 'GridclientID',
            columns: [{
                    header: 'lg_COMPTE_CLIENT_ID',
                    dataIndex: 'lg_COMPTE_CLIENT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
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
                    header: 'Nom',
                    dataIndex: 'str_FIRST_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Prenoms',
                    dataIndex: 'str_LAST_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }/*, {
                    header: 'Type de Client',
                    dataIndex: 'lg_TYPE_CLIENT_ID',
                    hidden: false,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }
                }*/, {
                    header: 'Solde',
                    dataIndex: 'dbl_SOLDE',
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     
                     },{
                     header: 'Date de Naissance',
                     dataIndex: 'dt_NAISSANCE',
                     hidden: true,
                     flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Genre',
                    dataIndex: 'str_SEXE',
                    hidden: false,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }



                }, {
                    header: 'Adresse',
                    dataIndex: 'str_ADRESSE',
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Boite Postale',
                    dataIndex: 'str_CODE_POSTAL',
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Ville',
                    dataIndex: 'lg_VILLE_ID',
                    hidden: true,
                    flex: 1


                },
                 {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/application_view_list.png',
                            tooltip: 'Ayants droits',
                            scope: this,
                            handler: this.onAyantDroitView,
                            getClass: function (value, metadata, record) {
                                if (record.get('lg_TYPE_CLIENT_ID') == "Assurance") {  //read your condition from the record
                                    return '';
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }]
                },
//                {
//                    xtype: 'actioncolumn',
//                    width: 30,
//                    sortable: false,
//                    menuDisabled: true,
//                    items: [{
//                            icon: 'resources/images/icons/fam/book.png',
//                            tooltip: 'Compte.Client',
//                            scope: this,
//                            handler: this.onCompteClick
//                        }]
//                },
//                {
//                    xtype: 'actioncolumn',
//                    width: 30,
//                    sortable: false,
//                    menuDisabled: true,
//                    items: [{
//                            icon: 'resources/images/icons/fam/information.png',
//                            tooltip: 'Differes',
//                            scope: this,
//                            handler: this.onDiffereClick
//                        }]
//                },
                {
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
                }, 
//                {
//                    xtype: 'actioncolumn',
//                    width: 30,
//                    sortable: false,
//                    menuDisabled: true,
//                    items: [{
//                            icon: 'resources/images/icons/fam/user.png',
//                            tooltip: 'Tiers payants',
//                            scope: this,
//                            handler: this.onManageTierPayantClick
//                        }]
//                }, 
              /*  {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_wrench.png',
                            tooltip: 'Attribution.Medecin',
                            scope: this,
                            handler: this.onManageMedecinClick
                        }]
                }*/],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
               /* {
                    text: 'Imprimer',
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler: this.onPrintClick
                }, */{
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


        this.on('edit', function (editor, e) {



            Ext.Ajax.request({
                url: url_services_transaction_client + 'update',
                params: {
                    lg_CLIENT_ID: e.record.data.lg_CLIENT_ID,
                    str_CODE_INTERNE: e.record.data.str_CODE_INTERNE,
                    str_LAST_NAME: e.record.data.str_LAST_NAME,
                    str_FIRST_NAME: e.record.data.str_FIRST_NAME,
                    str_SEXE: e.record.data.str_SEXE,
                    dt_NAISSANCE: e.record.data.dt_NAISSANCE,
                    str_NUMERO_SECURITE_SOCIAL: e.record.data.str_NUMERO_SECURITE_SOCIAL,
                    str_ADRESSE: e.record.data.str_ADRESSE,
                    str_CODE_POSTAL: e.record.data.str_CODE_POSTAL,
                    lg_VILLE_ID: e.record.data.lg_VILLE_ID

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

        new testextjs.view.sm_user.retrocession.action.addClient({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Client",
            type: "clientmanager"
        });
    },
    onAyantDroitView: function (grid, rowIndex) {

        rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.client.action.addcltayantdroit({
            obtntext: "Client",
            odatasource: rec.data,
            nameintern: "Ayant droit",
            parentview: this,
            mode: "detail",
            titre: "Gestion des ayants droits du client [" + rec.get('str_FIRST_LAST_NAME') + "]",
        });

    },
    onPrintClick: function () {

        alert("print");


    },
    onChooseCustomerClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        //str_NAME_RESUME.setValue(rec.get('str_NAME'));


        //  var xtype = "doventemanager";
        //  alert("1");
        // OadddoventeID.up('window').close();
        // alert("2");
        // testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "by_cust", rec.get('str_FIRST_NAME'), rec.data);


    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function (btn) {
                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_client + 'delete',
                            params: {
                                lg_CLIENT_ID: rec.get('lg_CLIENT_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.retrocession.action.addClient({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            type: "clientmanager",
            titre: "Modification Client  [" + rec.get('str_FIRST_LAST_NAME') + "]"
        });
    },
    onManageTierPayantClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.client.action.showclttierspayant({
            obtntext: "Client",
            odatasource: rec.data,
            nameintern: "Tiers payants",
            parentview: this,
            mode: "associertierspayant",
            titre: "Gestion des tiers payants du client [" + rec.get('str_FIRST_LAST_NAME') + "]"
        });

    }, onManageMedecinClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        /*  new testextjs.view.configmanagement.client.action.addmedecin({
         odatasource: rec.data,
         parentview: this,
         mode: "update",
         titre: "Attribution des Medecins pour le Client [" + rec.get('str_FIRST_LAST_NAME') + "]"
         });*/
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.client.action.addMedecinClient({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Attribution des medecins pour le medecin [" + rec.get('str_FIRST_LAST_NAME') + "]"
        });
    },
    /*onManageMedecinClick: function(grid, rowIndex) {
     var rec = grid.getStore().getAt(rowIndex);
     
     new testextjs.view.configmanagement.client.action.addmedecin({
     obtntext: "Medecin",
     odatasource: rec.data,
     nameintern: "Medecin",
     parentview: this,
     mode: "associermedecin",
     titre: "Gestion des medecins du client [" + rec.get('str_FIRST_LAST_NAME') + "]"
     });
     
     }*/
    onVenteClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "doventecarnetmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Faire une vente carnet", rec.get('str_FIRST_NAME'), rec.data);
    },
    onDiffereClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "diffmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "by_customer", rec.get('str_FIRST_NAME'), rec.data);
    },
    onCompteClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.client.action.infoCompte({
            odatasource: rec.data,
            parentview: this,
            mode: "updateInfoCompte",
            titre: "Modification du compte du Client  [" + rec.get('str_LAST_NAME') + "]"
        });
    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_client_other);
    }

})