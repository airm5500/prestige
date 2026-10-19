var url_services_data_client = '../webservices/configmanagement/client/ws_data.jsp';
var url_services_transaction_client = '../webservices/configmanagement/client/ws_transaction.jsp?mode=';
var url_services_pdf_client = '../webservices/configmanagement/client/ws_generate_pdf.jsp';
var url_services_data_typetierspayant = '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp';

var Me_Workflow;
var lg_TYPE_CLIENT_ID = "";
Ext.define('testextjs.view.configmanagement.client.ClientDesactiveManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'clientdesactive',
    id: 'clientdesactiveID',
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
    title: 'Gestion des Clients D&eacute;sactiv&eacute;s',
    closable: false,
    frame: true,
    initComponent: function() {

        Me_Workflow = this;
        lg_TYPE_CLIENT_ID = "";

        url_services_data_client = '../webservices/configmanagement/client/ws_data.jsp?str_STATUT=disable';
        url_services_pdf_client = '../webservices/configmanagement/client/ws_generate_pdf.jsp?str_STATUT=disable';

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_client,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        var store_type_tp = new Ext.data.Store({
            model: 'testextjs.model.TypeTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typetierspayant,
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
            id: 'OGrid',
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
                }, {
                    header: 'Type de Client',
                    dataIndex: 'lg_TYPE_CLIENT_ID',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, /*{
                 header: 'Tiers payant',
                 dataIndex: 'str_FULLNAME',
                 flex: 1
                 }, {
                 header: 'Taux couverture(%)',
                 dataIndex: 'int_POURCENTAGE',
                 flex: 1
                 },*/ {
                    header: 'Encours',
                    dataIndex: 'dbl_SOLDE',
                    align: 'center',
//                    hidden: true,
                    flex: 1,
                    renderer: function(val) {
                        var result = "<div style='text-align: right; font-weight: bold;'>" + val + "</div>";
                        /*if(val > 0) {
                         result = "<span style='text-align: right; font-weight: bold; color: red;'>"+val+"</span>";
                         }*/
                        return result;
                    }
                }, {
                    header: 'Genre',
                    dataIndex: 'str_SEXE',
//                    hidden: false,
                    flex: 1,
                    align: 'center'



                }, {
                    header: 'Securite Sociale',
                    dataIndex: 'str_NUMERO_SECURITE_SOCIAL',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
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
                            icon: 'resources/images/icons/fam/enable.png',
                            tooltip: 'Activer ce client',
                            scope: this,
                            handler: this.onEnableClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'combobox',
                    fieldLabel: 'Type Client',
                    name: 'lg_TYPE_CLIENT_FILTER_ID',
                    id: 'lg_TYPE_CLIENT_FILTER_ID',
                    store: store_type_tp,
                    flex: 1,
                    valueField: 'lg_TYPE_TIERS_PAYANT_ID',
                    displayField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
//                    typeAhead: true,
                    editable: false,
                    queryMode: 'remote',
                    emptyText: 'Choisir un type client ...',
                    listeners: {
                        select: function(cmp) {
                            lg_TYPE_CLIENT_ID = cmp.getValue();
                            Ext.getCmp('OGrid').getStore().getProxy().url = url_services_data_client + "&lg_TYPE_CLIENT_ID=" + lg_TYPE_CLIENT_ID;
                            Me_Workflow.onRechClick();
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Workflow.onRechClick();

                                }
                            });
                        }
                    }

                }, '-', {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }, '-', {
                    text: 'Imprimer',
                    id: 'P_BT_PRINT',
                    iconCls: 'printable',
                    handler: this.onPrintClick
                }/*, '-', {
                    text: 'Importer',
                    tooltip: 'Importer',
                    id: 'btn_import',
                    iconCls: 'importicon',
                    scope: this,
                    handler: this.onbtnimport
                }, '-',
                {
                    text: 'Exporter CSV',
                    tooltip: 'EXPORTER CSV',
                    scope: this,
                    iconCls: 'export_csv_icon',
                    handler: this.onbtnexportCsv
                }, '-',
                {
                    text: 'Exporter EXCEL',
                    tooltip: 'EXPORTER EXCEL',
                    scope: this,
                    iconCls: 'export_excel_icon',
                    handler: this.onbtnexportExcel
                }*/],
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
    onbtnimport: function() {
        new testextjs.view.configmanagement.famille.action.importOrder({
            odatasource: 'TABLE_CLIENT',
            parentview: this,
            mode: "importfile",
            titre: "Importation des differents articles de l'officine"
        });
    },
    onPrintClick: function() {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];

        var linkUrl = url_services_pdf_client + '&search_value=' + Ext.getCmp('rechecher').getValue() + "&lg_TYPE_CLIENT_ID=" + lg_TYPE_CLIENT_ID;
        testextjs.app.getController('App').onGeneratePdfFile(linkUrl);
    },
    onbtnexportCsv: function() {
        var extension = "csv";
        window.location = '../MigrationServlet?table_name=TABLE_CLIENT' + "&extension=" + extension;
    },
    onbtnexportExcel: function() {
        var extension = "xls";
        window.location = '../MigrationServlet?table_name=TABLE_CLIENT' + "&extension=" + extension;
    },
    onAddClick: function() {

        // new testextjs.view.configmanagement.client.action.addClient({
        new testextjs.view.configmanagement.client.action.addClientLast({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Client",
            type: "clientmanager"
        });
    },
    onAyantDroitView: function(grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.client.action.addcltayantdroit({
            obtntext: "Client",
            odatasource: rec.data,
            nameintern: "Ayant droit",
            parentview: this,
            mode: "detail",
            titre: "Gestion des ayants droits du client [" + rec.get('str_FIRST_LAST_NAME') + "]",
        });

    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_client + 'delete',
                            params: {
                                lg_CLIENT_ID: rec.get('lg_CLIENT_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }

                            },
                            failure: function(response)
                            {

                                testextjs.app.getController('App').StopWaitingProcess();
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
//        new testextjs.view.configmanagement.client.action.addClient({
        new testextjs.view.configmanagement.client.action.addClientLast({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            type: "clientmanager",
            titre: "Modification Client  [" + rec.get('str_FIRST_LAST_NAME') + "]"
        });
    },
    onManageTierPayantClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.client.action.showclttierspayant({
            obtntext: "Client",
            odatasource: rec.data,
            nameintern: "Tiers payants",
            parentview: this,
            mode: "associertierspayant",
            titre: "Gestion des tiers payants du client [" + rec.get('str_FIRST_LAST_NAME') + "]"
        });

    }, onManageMedecinClick: function(grid, rowIndex) {
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
    onVenteClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "doventecarnetmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Faire une vente carnet", rec.get('str_FIRST_NAME'), rec.data);
    },
    onDiffereClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "diffmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "by_customer", rec.get('str_FIRST_NAME'), rec.data);
    },
    onCompteClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.client.action.infoCompte({
            odatasource: rec.data,
            parentview: this,
            mode: "updateInfoCompte",
            titre: "Modification du compte du Client  [" + rec.get('str_LAST_NAME') + "]"
        });
    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.getValue(),
                lg_TYPE_CLIENT_ID: lg_TYPE_CLIENT_ID
            }
        }, url_services_data_client);
    },
    onDesableClick: function(grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        PrestigeConfirmation.ligne('Message', "Voulez-vous d&eacute;sactiver le client " + "<br><b>" + rec.get('str_FIRST_LAST_NAME') + "</b>", function () {
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_client + 'disable',
                            params: {
                                lg_COMPTE_CLIENT_ID: rec.get('lg_COMPTE_CLIENT_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {

                                    Ext.MessageBox.show({
                                        title: 'Message d\'erreur',
                                        width: 320,
                                        msg: object.errors,
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.WARNING
                                    });
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }

                            },
                            failure: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });


    },
     onEnableClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        PrestigeConfirmation.ligne('Message', 'Activer le client ' + "<br><b>" + rec.get('str_FIRST_LAST_NAME')+"</b>", function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_client + 'enable',
                            params: {
                                lg_COMPTE_CLIENT_ID: rec.get('lg_COMPTE_CLIENT_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {

                                    Ext.MessageBox.show({
                                        title: 'Message d\'erreur',
                                        width: 320,
                                        msg: object.errors,
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.WARNING
                                    });
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }
                            },
                            failure: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });


    }

})