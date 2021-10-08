/* global valheight, Ext */

var url_services_data_client = '../webservices/configmanagement/client/ws_data.jsp';
var url_services_transaction_client = '../webservices/configmanagement/client/ws_transaction.jsp?mode=';
var url_services_pdf_client = '../webservices/configmanagement/client/ws_generate_pdf.jsp';
var url_services_data_typetierspayant = '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp';

var Me_Workflow;
var lg_TYPE_CLIENT_ID = "";
Ext.define('testextjs.view.configmanagement.client.ClientManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'clientmanager',
    id: 'clientmanagerID',
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
        'testextjs.view.configmanagement.ayantdroit.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer',
        'testextjs.view.configmanagement.client.action.detailsclient',
        'testextjs.view.configmanagement.client.action.venteClient'


    ],
    title: 'Gestion des Clients',
    closable: false,
    frame: true,
    initComponent: function () {

        Me_Workflow = this;
        lg_TYPE_CLIENT_ID = "";
        var itemsPerPage = 20;
        url_services_data_client = '../webservices/configmanagement/client/ws_data.jsp';
        url_services_pdf_client = '../webservices/configmanagement/client/ws_generate_pdf.jsp';

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
       

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            store: store,
            id: 'OGrid',
            columns: [{
                    header: 'lg_COMPTE_CLIENT_ID',
                    dataIndex: 'lg_COMPTE_CLIENT_ID',
                    hidden: true,
                    flex: 1
                   
                }, {
                    header: 'lg_CLIENT_ID',
                    dataIndex: 'lg_CLIENT_ID',
                    hidden: true,
                    flex: 1
                  
                }, {
                    header: 'Code Interne',
                    dataIndex: 'str_CODE_INTERNE',
                    flex: 0.6
                }, {
                    header: 'Nom',
                    dataIndex: 'str_FIRST_NAME',
                    flex: 0.8

                }, {
                    header: 'Prenoms',
                    dataIndex: 'str_LAST_NAME',
                    flex: 1
                }, {
                    header: 'Type.Client',
                    dataIndex: 'lg_TYPE_CLIENT_ID',
                    flex: 0.7
                }, {
                    header: 'Encours',
                    dataIndex: 'dbl_total_differe',
                    align: 'right',
//                    hidden: true,
                    flex: 0.6,
                    renderer: function (val) {
                        var result = "<div style='text-align: right; font-weight: bold;'>" + amountformat(val) + "</div>";
                        return result;
                    }
                },

                {
                    header: 'Etat.Plafond',
                    dataIndex: 'dbl_QUOTA_CONSO_MENSUELLE',
                    align: 'center',
                    hidden: true,
                    flex: 0.4,
                    renderer: function (val) {
                        var result = "<div style='text-align: right; font-weight: bold;'>" + val + "</div>";
                        return result;
                    }
                }, {
                    header: 'Genre',
                    dataIndex: 'str_SEXE',
                    align: 'center',
                    flex: 0.4
                }, {
                    header: 'Securite Sociale',
                    dataIndex: 'str_NUMERO_SECURITE_SOCIAL',
                    flex: 0.8
                }, {
                    header: 'Adresse',
                    dataIndex: 'str_ADRESSE',
                    hidden: true,
                    flex: 1

                }, {
                    header: 'Boite.Postale',
                    dataIndex: 'str_CODE_POSTAL',
                    hidden: true,
                    flex: 1

                }, {
                    header: 'Ville',
                    dataIndex: 'lg_VILLE_ID',
                    hidden: true,
                    flex: 1


                },
                {
                    header: 'Société',
                    dataIndex: 'lg_COMPANY_ID',
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
                                if (record.get('lg_TYPE_CLIENT_ID') === "Assurance") {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }]
                },

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
                            scope: this, getClass: function (value, metadata, record) {
                                if (record.get('BTNDELETE')) {
                                    return 'x-display-hide';
                                } else {
                                    return 'x-hide-display';
                                }
                            },
                            handler: this.onRemoveClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/user.png',
                            tooltip: 'Ajouter des tiers payants a ce client',
                            scope: this,
                            handler: this.onManageTierPayantClick,
                            getClass: function (value, metadata, record) {

                                //"Standard"
                                if (record.get('lg_TYPE_CLIENT_ID') === "Assurance") {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }]
                },
                {
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
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/disable.png',
                            tooltip: 'Desactiver le client',
                            scope: this, getClass: function (value, metadata, record) {
                                if (record.get('P_BTN_DESACTIVER_CLIENT')) {
                                    return 'x-display-hide';
                                } else {
                                    return 'x-hide-display';
                                }
                            },
                            handler: this.onDesableClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            iconCls: 'detailclients',
                            tooltip: 'Detail du client',
                            scope: this,
                            handler: this.onDetailClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            iconCls: 'cartclient',
                            tooltip: 'Les Ventes du client',
                            scope: this,
                            handler: this.onVentesClick
                        }]
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Cr&eacute;er',
                    scope: this,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
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
                        select: function (cmp) {
                            lg_TYPE_CLIENT_ID = cmp.getValue();/*
                            Ext.getCmp('OGrid').getStore().getProxy().url = url_services_data_client + "?lg_TYPE_CLIENT_ID=" + lg_TYPE_CLIENT_ID;
                           */
                            Me_Workflow.onRechClick();
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
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
                }, '-', {
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
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true,
                 listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            search_value: '',
                            lg_TYPE_CLIENT_ID: ''
                       
                        };
                        var search_value = Ext.getCmp('rechecher').getValue();

                        myProxy.setExtraParam('search_value', search_value);
                        myProxy.setExtraParam('lg_TYPE_CLIENT_ID', Ext.getCmp('lg_TYPE_CLIENT_FILTER_ID').getValue());

                    }

                }
            }
        });

        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
    },
     loadStore: function () {
        this.getStore().load();
    },
    onbtnimport: function () {
        new testextjs.view.configmanagement.famille.action.importOrder({
            odatasource: 'TABLE_CLIENT',
            parentview: this,
            mode: "importfile",
            titre: "Importation des differents articles de l'officine"
        });
    },
    onPrintClick: function () {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var linkUrl = url_services_pdf_client + '?search_value=' + Ext.getCmp('rechecher').getValue() + "&lg_TYPE_CLIENT_ID=" + lg_TYPE_CLIENT_ID;
        testextjs.app.getController('App').onGeneratePdfFile(linkUrl);
    },
    onbtnexportCsv: function () {
        var extension = "csv";
        window.location = '../MigrationServlet?table_name=TABLE_CLIENT' + "&extension=" + extension;
    },
    onbtnexportExcel: function () {
        var extension = "xls";
        window.location = '../MigrationServlet?table_name=TABLE_CLIENT' + "&extension=" + extension;
    },
    onAddClick: function () {
        new testextjs.view.configmanagement.client.action.addClientLast({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Client",
            type: "clientmanager"
        });
    },
    onAyantDroitView: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.client.action.addcltayantdroit({
            obtntext: "Client",
            odatasource: rec.data,
            nameintern: "Ayant droit",
            parentview: this,
            mode: "detail",
            titre: "Gestion des ayants droits du client [" + rec.get('str_FIRST_LAST_NAME') + "]"
        });

    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_client + 'delete',
                            params: {
                                lg_CLIENT_ID: rec.get('lg_CLIENT_ID')
                            },
                            success: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }

                            },
                            failure: function (response)
                            {

                                testextjs.app.getController('App').StopWaitingProcess();
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

        new testextjs.view.configmanagement.client.action.addClientLast({
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
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.client.action.addMedecinClient({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Attribution des medecins pour le medecin [" + rec.get('str_FIRST_LAST_NAME') + "]"
        });
    },
 
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.getValue(),
                lg_TYPE_CLIENT_ID: lg_TYPE_CLIENT_ID
            }
        });
    },
    onDesableClick: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        Ext.MessageBox.confirm('Message',
                "Voulez-vous d&eacute;sactiver le client " + "<br><b>" + rec.get('str_FIRST_LAST_NAME') + "</b>",
                function (btn) {
                    if (btn === 'yes') {
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_client + 'disable',
                            params: {
                                lg_COMPTE_CLIENT_ID: rec.get('lg_COMPTE_CLIENT_ID')
                            },
                            success: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === "0") {

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
                            failure: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    },
    onDetailClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
//       alert(JSON.stringify( rec.data));
        new testextjs.view.configmanagement.client.action.detailsclient({
            odatasource: rec.data,
            parentview: this,
            titre: "Detail du client : [" + rec.get('str_FIRST_LAST_NAME') + "]"
        });
    },
    onVentesClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.client.action.venteClient({
            odatasource: rec.data,
            parentview: this,
            titre: "Detail du client : [" + rec.get('str_FIRST_LAST_NAME') + "]"
        });
    }

});