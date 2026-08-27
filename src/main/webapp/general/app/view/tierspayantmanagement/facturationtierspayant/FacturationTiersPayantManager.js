var url_services_data_facturetierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data_facturation.jsp';
var url_services_data_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';
var url_services_data_client = '../webservices/configmanagement/client/ws_data_compteclttierspayants.jsp';
var url_services_transaction_facturetierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_transaction.jsp?mode=';
var lg_TIERS_PAYANT_ID = "";
var lg_COMPTE_CLIENT_ID = "";

var valdatedebut;
var valdatefin;
var title;
Ext.define('testextjs.view.tierspayantmanagement.facturationtierspayant.FacturationTiersPayantManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'facturationtierspayant',
    id: 'facturationtierspayantID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.FacturationClientTierspayant',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion de la facturation Tiers-Payant',
    plain: true,
    maximizable: true,
    tools: [{type: "pin"}],
    closable: true,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;


        var store_type_facture = new Ext.data.Store({
            fields: ['str_NAME_FACTURE', 'str_STATUT_FACTURE'],
            data: [{str_NAME_FACTURE: 'Dossier en attente', str_STATUT_FACTURE: 'is_Waiting'}, {str_NAME_FACTURE: 'Dossier en cours de reglement', str_STATUT_FACTURE: 'is_Process'}, {str_NAME_FACTURE: 'Dossier regle', str_STATUT_FACTURE: 'enable'}]
        });


        var store = new Ext.data.Store({
            model: 'testextjs.model.FacturationClientTierspayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_facturetierspayant + "?lg_COMPTE_CLIENT_ID=" + lg_COMPTE_CLIENT_ID + "&lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_tierspayant = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                // URL en dur : la globale url_services_data_tierspayant est redefinie par d'autres
                // ecrans selon l'ordre de chargement et pointait vers une JSP inexistante
                url: '../api/v1/reglement-facture/tierspayants',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_client = new Ext.data.Store({
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


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });


        Ext.apply(this, {
            width: 1100,
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            id: 'GridFacturationID',
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: 'lg_SNAPSHOT_PREENREGISTREMENT_COMPTECLIENT_TIERSPAENT_ID',
                    dataIndex: 'lg_SNAPSHOT_PREENREGISTREMENT_COMPTECLIENT_TIERSPAENT_ID',
                     hidden: true,
                    flex: 1
                }, {
                    header: 'Numero facture',
                    dataIndex: 'str_REF',
                    flex: 1
                },
                {
                    header: 'Montant/Client',
                    dataIndex: 'int_PRICE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                },
                {
                    header: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID',
                    dataIndex: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID',
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Nombre transaction',
                    dataIndex: 'int_NUMBER_TRANSACTION',
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
                    header: 'Prenom(s)',
                    dataIndex: 'str_LAST_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false  
                     }*/
                }, {
                    header: 'Tiers payant',
                    dataIndex: 'str_FULLNAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false  
                     }*/
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/grid.png',
                            tooltip: 'Voir le detail des transactions',
                            scope: this,
                            handler: this.onDetailTransactionClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Envoyer le dossier en litige',
                            scope: this,
                            handler: this.onSendToLitigeClick
                        }]
                }/*, {
                 xtype: 'actioncolumn',
                 width: 30,
                 sortable: false,
                 menuDisabled: true,
                 items: [{
                 icon: 'resources/images/icons/fam/user.png',
                 tooltip: 'Modifier la photo',
                 scope: this,
                 handler: this.onEditPhotoClick
                 }]
                 }*/],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    xtype: 'combobox',
                    name: 'str_STATUT_FACTURE',
                    margins: '0 0 0 10',
                    id: 'str_STATUT_FACTURE',
                    store: store_type_facture,
                    valueField: 'str_STATUT_FACTURE',
                    displayField: 'str_NAME_FACTURE',
                    typeAhead: true,
                    queryMode: 'local',
                    flex: 1,
                    emptyText: 'Type de facture...',
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var str_STATUT = value;


                            //reloadGridByTierspayant(lg_TIERS_PAYANT_ID);
                            // alert("lg_TIERS_PAYANT_ID " + lg_TIERS_PAYANT_ID);
                            var OGrid = Ext.getCmp('GridFacturationID');
                            var url_services_data_facturetierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data_facturation.jsp';
                            OGrid.getStore().getProxy().url = url_services_data_facturetierspayant + "?str_STATUT=" + str_STATUT;
                            OGrid.getStore().reload();


                        }
                    }
                }, '-', {
                    xtype: 'combobox',
                    //fieldLabel: 'Tiers payant',
                    //allowBlank: false,
                    name: 'lg_TIERS_PAYANT_ID',
                    margins: '0 0 0 10',
                    id: 'lg_TIERS_PAYANT_ID',
                    store: store_tierspayant,
                    valueField: 'lg_TIERS_PAYANT_ID',
                    displayField: 'str_FULLNAME',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    emptyText: 'Sectionner tiers payant...',
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var lg_TIERS_PAYANT_ID = value;
                            var str_STATUT_FACTURE = "";
                            //reloadGridByTierspayant(lg_TIERS_PAYANT_ID);
                            // alert("lg_TIERS_PAYANT_ID " + lg_TIERS_PAYANT_ID);
                            if (Ext.getCmp('str_STATUT_FACTURE').getValue() == null) {
                                str_STATUT_FACTURE = "";
                            } else {
                                str_STATUT_FACTURE = Ext.getCmp('str_STATUT_FACTURE').getValue();
                            }
                            var OGrid = Ext.getCmp('GridFacturationID');
                            var url_services_data_facturetierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data_facturation.jsp';
                            OGrid.getStore().getProxy().url = url_services_data_facturetierspayant + "?lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID + "&str_STATUT=" + str_STATUT_FACTURE;
                            OGrid.getStore().reload();


                            var lg_COMPTE_CLIENT_ID = Ext.getCmp('lg_COMPTE_CLIENT_ID');
                            //lg_COMPTE_CLIENT_ID.enable();
                            var url_services_data_client = '../webservices/configmanagement/client/ws_data_compteclttierspayants.jsp';
                            lg_COMPTE_CLIENT_ID.getStore().getProxy().url = url_services_data_client + "?lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID;
                            lg_COMPTE_CLIENT_ID.getStore().reload();
                        }
                    }
                }, '-', {
                    xtype: 'combobox',
                    //fieldLabel: 'Tiers payant',
                    //allowBlank: false,
                    name: 'lg_COMPTE_CLIENT_ID',
                    margins: '0 0 0 10',
                    id: 'lg_COMPTE_CLIENT_ID',
                    store: store_client,
                    //disabled: true,
                    valueField: 'lg_COMPTE_CLIENT_ID',
                    displayField: 'str_FIRST_LAST_NAME',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    emptyText: 'Sectionner client...',
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var lg_COMPTE_CLIENT_ID = value;
                            var lg_TIERS_PAYANT_ID = "";
                            var str_STATUT_FACTURE = "";

                            if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() == null) {
                                lg_TIERS_PAYANT_ID = "";
                            } else {
                                lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                            }
                            if (Ext.getCmp('str_STATUT_FACTURE').getValue() == null) {
                                str_STATUT_FACTURE = "";
                            } else {
                                str_STATUT_FACTURE = Ext.getCmp('str_STATUT_FACTURE').getValue();
                            }


                            var OGrid = Ext.getCmp('GridFacturationID');
                            var url_services_data_facturetierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data_facturation.jsp';
                            OGrid.getStore().getProxy().url = url_services_data_facturetierspayant + "?lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID + "&lg_COMPTE_CLIENT_ID=" + lg_COMPTE_CLIENT_ID + "&str_STATUT=" + str_STATUT_FACTURE;
                            OGrid.getStore().reload();
                        }
                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            // alert(me.getSubmitValue());
                            valdatedebut = me.getSubmitValue();
                        }
                    }
                }, {
                    xtype: 'datefield',
                    id: 'datefin',
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            //alert(me.getSubmitValue());
                            valdatefin = me.getSubmitValue();
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
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
        })


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onAddClick: function () {

        new testextjs.view.tierspayantmanagement.tierspayant.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Tiers payant"
        });
    },
    onPrintClick: function () {

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
        var linkUrl = url_services_pdf_tierspayant;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "Gerer Tiers Payant") {
            xtype = "facturationtierspayant";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "facturationtierspayant";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: '../api/v1/tierspayant/gestion/delete', // meme metier et meme reponse que la JSP historique
                            params: {
                                lg_TIERS_PAYANT_ID: rec.get('lg_TIERS_PAYANT_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
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
                    }
                });


    },
    onDetailTransactionClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.tierspayantmanagement.facturationtierspayant.action.detailTransactionClient({
            odatasource: rec.data,
            parentview: this,
            mode: "detail_transaction",
            titre: "Detail transaction du client  [" + rec.get('str_FIRST_NAME') + " " + rec.get('str_LAST_NAME') + "]"
        });
    },
    onEditPhotoClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.tierspayantmanagement.tierspayant.action.addPhoto({
            odatasource: rec.data,
            parentview: this,
            mode: "updatephoto",
            titre: "Modification photo Tiers Payant  [" + rec.get('str_NAME') + "]"
        });
    },
    onSendToLitigeClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.litige.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "createlitige",
            titre: "Creation d'un litige pour le dossier  [" + rec.get('str_FIRST_NAME') + " " + rec.get('str_LAST_NAME') + "]"
        });
    },
    onEditpwdClick: function (grid, rowIndex) {

    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        var lg_TIERS_PAYANT_ID = "";
        var lg_COMPTE_CLIENT_ID = "";

        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() == null) {
            lg_TIERS_PAYANT_ID = "";
        } else {
            lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        }
        if (Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue() == null) {
            lg_COMPTE_CLIENT_ID = "";
        } else {
            lg_COMPTE_CLIENT_ID = Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue();
        }
        if (new Date(valdatedebut) > new Date(valdatefin)) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }
        var str_STATUT_FACTURE = "";
        //reloadGridByTierspayant(lg_TIERS_PAYANT_ID);
        // alert("lg_TIERS_PAYANT_ID " + lg_TIERS_PAYANT_ID);
        if (Ext.getCmp('str_STATUT_FACTURE').getValue() == null) {
            str_STATUT_FACTURE = "";
        } else {
            str_STATUT_FACTURE = Ext.getCmp('str_STATUT_FACTURE').getValue();
        }

        this.getStore().load({
            params: {
                search_value: val.value,
                datedebut: valdatedebut,
                datefin: valdatefin,
                lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID,
                lg_COMPTE_CLIENT_ID: lg_COMPTE_CLIENT_ID,
                str_STATUT: str_STATUT_FACTURE
            }
        }, url_services_data_facturetierspayant);
    }

});