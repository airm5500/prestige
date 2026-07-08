var url_services_data_utilisateur = '../webservices/sm_user/utilisateur/ws_data.jsp';
var url_services_transaction_utilisateur = '../webservices/sm_user/utilisateur/ws_transaction.jsp?mode=';
var Me_Workflow;
var url_services_pdf_fiche_utilisateur = '../webservices/sm_user/utilisateur/ws_generate_pdf.jsp';


Ext.define('testextjs.view.sm_user.user.UserManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'usermanager',
    id: 'usermanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Utilisateur',
        'testextjs.view.sm_user.user.action.add',
        
        'testextjs.view.sm_user.user.action.addpwd',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des Utilisateurs',
    closable: false,
    frame: true,
    initComponent: function() {

        Me_Workflow = this;

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Utilisateur',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_utilisateur + "?etat="+true,
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
            columns: [{
                    header: 'lg_USER_ID',
                    dataIndex: 'lg_USER_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'IDS',
                    dataIndex: 'str_IDS',
                    flex: 0.5
                },
                {
                    header: 'Nom',
                    dataIndex: 'str_FIRST_NAME',
                    flex: 1
                },
                {
                    header: 'Prenom',
                    dataIndex: 'str_LAST_NAME',
                    flex: 1
                },
                {
                    header: 'Date.Dern.Connex',
                    dataIndex: 'str_LAST_CONNECTION_DATE',
                    flex: 1
                },
                {
                    header: 'Heure.Dern.Connex',
                    dataIndex: 'str_LAST_CONNECTION_TIME',
                    flex: 1
                }, {
                    header: 'Language',
                    dataIndex: 'lg_Language_ID',
                    flex: 1,
                    hidden: true
                }, {
                    header: 'Login',
                    dataIndex: 'str_LOGIN',
                    flex: 1
                }, {
                    header: 'str_PASSWORD',
                    dataIndex: 'str_PASSWORD',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'STATUT',
                    dataIndex: 'str_STATUT',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Profil',
                    dataIndex: 'lg_ROLE_ID',
                    flex: 2
                }, {
                    header: 'Lieu travail',
                    dataIndex: 'str_LIEU_TRAVAIL',
                    flex: 1
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
                            icon: 'resources/images/icons/fam/cog_edit.png',
                            tooltip: 'Reinitialiser Mot de passe',
                            scope: this,
                            handler: this.onEditpwdClick,
                            getClass: function(value, metadata, record) {
                                if (record.get('P_BT_MODIFICATION_USER') === 'false') {
                                    return 'x-hide-display';
                                }


                            }
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Associer Numero',
                            scope: this,
                            //handler: this.onManageFoneClick
                            handler: this.onAssocPhoneClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    hidden: true,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/table_refresh.png',
                            tooltip: 'Attribution d\'imprimante',
                            scope: this,
                            handler: this.onAssocPrintClick
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
                    text: 'Creer',
                    iconCls: 'addicon',
                    //id: 'P_BT_usermanager_CREATE',
                    scope: this,
                    // disabled: true,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'TXT_SEARCH',
                    name: 'user',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Workflow.onRechClick();

                                }/* else {
                                 alert("key "+e.getKey());
                                 }*/
                            });
                        }
                    }
                }, {
                    text: 'rechercher',
                    iconCls: 'searchicon',
                    tooltip: 'rechercher',
                    // id: 'P_BT_usermanager_FIND',
                    scope: this,
                    // disabled: true,
                    handler: this.onRechClick
                },{
                    text: 'Imprimer',
                    id: 'P_BT_usermanager_PRINT',
                    iconCls: 'printable',
                    // disabled: true,
                    handler: this.onPrintClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            },
//            listeners: {
//                specialkey: function(field, e) {
//                    if (e.getKey() == e.ENTER)
//                        alert("ok");  // call your function to submit the form
//                }
//            }
        });

        this.callParent();
        //this.checkPrivilegeToUI();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });




        this.on('edit', function(editor, e) {



            Ext.Ajax.request({
                url: url_services_transaction_utilisateur + 'update',
                params: {
                    lg_USER_ID: e.record.data.lg_USER_ID,
                    lg_ROLE_ID: e.record.data.lg_ROLE_ID,
                    str_LOGIN: e.record.data.str_LOGIN,
                    str_LAST_NAME: e.record.data.str_LAST_NAME,
                    str_FIRST_NAME: e.record.data.str_FIRST_NAME,
                    lg_SKIN_ID: e.record.data.lg_SKIN_ID,
                    lg_Language_ID: e.record.data.lg_Language_ID,
                    str_IDS: e.record.data.str_IDS

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
        //  this.checkPrivilegeToUI();
    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onManageFoneClick: function(grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "userphonemanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", rec.get('str_FIRST_NAME'), rec.data);

    },
    onStoreLoad: function() {
    },
    onAddClick: function() {
//new testextjs.view.sm_user.user.action.addStandardUser({});
       new testextjs.view.sm_user.user.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Utilisateur"
        });
    },
    onPrintClick: function() {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_fiche_utilisateur + '?search_value=' + Ext.getCmp('TXT_SEARCH').getValue() + "&etat="+true;

        // testextjs.app.getController('App').onLunchPrinter(linkUrl);
        testextjs.app.getController('App').onGeneratePdfFile(linkUrl);



    },
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_utilisateur + 'delete',
                            params: {
                                lg_USER_ID: rec.get('lg_USER_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Information', object.errors);
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
                    }
                });


    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.user.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Utilisateur  [" + rec.get('str_LAST_NAME') + "]"
        });



    },
    onAssocPrintClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.user.action.addPrinter({
            odatasource: rec.data,
            parentview: this,
            mode: "assocprinter",
            titre: "Associer des imprimantes l'utilisateur  [" + rec.get('str_LAST_NAME') + "]"
        });



    },
    onAssocPhoneClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.user.action.addUserPhone({
            odatasource: rec.data,
            parentview: this,
            mode: "assocnumber",
            titre: "Associer des numeros a l'utilisateur  [" + rec.get('str_LAST_NAME') + "]"
        });



    },
    onEditpwdClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.user.action.addpwd({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Reinitialisation du Mot de passe  [" + rec.get('str_LAST_NAME') + "]"
        });


    },
    onRechClick: function() {
        var val = Ext.getCmp('TXT_SEARCH');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_utilisateur);
    }

    , checkPrivilegeToUI: function() {

        var url_services_data_ws_get_privilege_by_bt = '../webservices/sm_user/privilege/ws_get_privilege_by_bt.jsp';
        var storePrivilege = new Ext.data.Store({
            model: 'testextjs.model.Privilege',
            // pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_ws_get_privilege_by_bt,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });



        storePrivilege.load({
            callback: function() {
                var index;
                var tab_component = new Array(
                        "P_BT_PRINT",
                        "P_BT_usermanager_FIND",
                        "P_BT_usermanager_CREATE"
                        );
                var tab_privilege = [];
                for (i = 0; i < storePrivilege.getCount(); i++) {
                    tab_privilege[i] = storePrivilege.getAt(i).get('str_NAME');
                }
                for (i = 0; i < tab_component.length; ++i) {
                    Ext.getCmp(tab_component[i]).disable();
                    console.log(tab_component[i]);
                    for (k = 0; k < tab_privilege.length; ++k) {
                        if (tab_component[i] === tab_privilege[k]) {
                            //Activer le component
                            Ext.getCmp(tab_component[i]).enable();
                            // return;
                        }
                    }
                }
            }
        });
        storePrivilege.load({});
    }


});