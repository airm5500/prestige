var url_services_data_alertevent = '../webservices/sm_user/alertevent/ws_data.jsp';
var url_services_transaction_alertevent = '../webservices/sm_user/alertevent/ws_transaction.jsp?mode=';


Ext.define('testextjs.view.sm_user.alertevent.AlerteventManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'alerteventmanager',
    id: 'alerteventmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Alertevent',
        'testextjs.view.sm_user.user.action.add',
        'testextjs.view.sm_user.user.action.addpwd',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion Model de notification',
    closable: true,
    frame: true,
    initComponent: function () {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Alertevent',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_alertevent,
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
                    header: 'Ref',
                    dataIndex: 'str_Event',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },{
                    header: 'Description',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1
                }, 
                
                {
                    header: 'Sms fr',
                    dataIndex: 'str_SMS_French_Text',
                    flex: 1
                }, 
                {
                    header: 'Mail fr',
                    dataIndex: 'str_MAIL_French_Text',
                    flex: 1
                },{
                    header: 'Sms en',
                    dataIndex: 'str_SMS_English_Text',
                    flex: 1
                }, 
                {
                    header: 'Mail en',
                    dataIndex: 'str_MAIL_English_Text',
                    flex: 1
                },  {
                    header: 'Fonction',
                    dataIndex: 'str_FONCTION',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Type',
                    dataIndex: 'str_TYPE',
                    hidden: true,
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
                            tooltip: 'Executer la commande',
                            scope: this,
                            handler: this.onEditpwdClick
                        }]
                }
               /* 
                ,{
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon:  'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Associer Numero',
                            scope: this,
                            handler: this.onManageFoneClick
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
                }
            */
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Print',
                    id: 'P_BT_usermanager_PRINT',
                    iconCls: 'resources/images/icons/fam/printer.png',
                   // disabled: true,
                    handler: this.onPrintClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'TXT_SEARCH',
                    name: 'user',
                    emptyText: 'Rech'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                   // id: 'P_BT_usermanager_FIND',
                    scope: this,
                   // disabled: true,
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
        //this.checkPrivilegeToUI();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });


        this.on('edit', function (editor, e) {



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
        //  this.checkPrivilegeToUI();
    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onManageFoneClick: function(grid, rowIndex){
    
        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "userphonemanager";
        var  alias ='widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype,"",rec.get('str_FIRST_NAME'),rec.data);
        
    },
    onStoreLoad: function () {
    },
    onAddClick: function () {

        new testextjs.view.sm_user.alertevent.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Utilisateur"
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
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_alertevent + 'delete',
                            params: {
                                lg_USER_ID: rec.get('lg_USER_ID')
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


        new testextjs.view.sm_user.alertevent.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Model Notif  [" + rec.get('str_DESCRIPTION') + "]"
        });



    },
    onEditpwdClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

       
        new testextjs.view.sm_user.alertevent.action.adduserphonealertevent({
            obtntext: "Client",
            odatasource: rec.data,
            nameintern: "Ayant droit",
            parentview: this,
            mode: "detail",
            titre: "Gestion utilisateur a associer [" + rec.get('str_DESCRIPTION') + "]",
            
        });
      

    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_alertevent);
    }

    , checkPrivilegeToUI: function () {

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
            callback: function () {
                var index;
                var tab_component = new Array(
                        "P_BT_usermanager_PRINT",
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