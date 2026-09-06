var url_services_data_outboudmessage = '../webservices/sm_user/outboudmessage/ws_data.jsp';
var url_services_transaction_outboudmessage = '../webservices/sm_user/outboudmessage/ws_transaction.jsp?mode=';

var Me;
Ext.define('testextjs.view.sm_user.outboudmessage.OutboudmessageManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'outboudmessagemanager',
    id: 'outboudmessageID',
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
    title: 'Gestion Notification sortantes',
    closable: false,
    frame: true,
    initComponent: function() {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Outboudmessage',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_outboudmessage,
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

        Me = this;

        Ext.apply(this, {
            width: '98%',
            height: 580,
            id: 'GridPanel',
            plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'Ref',
                    dataIndex: 'lg_OUTBOUND_MESSAGE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Telephone',
                    dataIndex: 'str_PHONE',
                    flex: 0.7
                }, {
                    header: 'Message',
                    dataIndex: 'str_MESSAGE',
                    flex: 2
                }, {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1
                },
                {
                    header: 'Statut',
                    dataIndex: 'str_STATUT',
                    flex: 1
                },
                {
                    header: 'Mail en',
                    dataIndex: 'dt_UPDATED',
                    hidden: true,
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/cog_edit.png',
                            tooltip: 'Renvoyer le Messages',
                            scope: this,
                            handler: this.onReloadSmsClick,
                            getClass: function(value, metadata, record) {
                                if (record.get('etat') == "is_Waiting") {  //read your condition from the record
                                    return '';
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
                    hidden: true,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
//                    hidden: true,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/paste_plain.png',
                            tooltip: 'Voir le detail',
                            scope: this,
                            handler: this.ModifyClick
                        }]
                }

            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Print',
                    id: 'P_BT_usermanager_PRINT',
                    hidden: true,
                    iconCls: 'resources/images/icons/fam/printer.png',
                    // disabled: true,
                    handler: this.onPrintClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'TXT_SEARCH',
                    name: 'user',
                    emptyText: 'Rech',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                }, {
                    text: 'Rechercher',
                    tooltip: 'rechercher',
                    // id: 'P_BT_usermanager_FIND',
                    scope: this,
                    // disabled: true,
                    handler: this.onRechClick
                }, '-', {
                    text: 'Renvoyer',
                    tooltip: 'Renvoyer les notifications en attentes',
                    scope: this,
                    handler: this.onReloadAllClick
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


        this.on('edit', function(editor, e) {



            Ext.Ajax.request({
                url: url_services_transaction_outboudmessage + 'update',
                params: {
                    lg_OUTBOUND_MESSAGE_ID: e.record.data.lg_OUTBOUND_MESSAGE_ID,
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

        new testextjs.view.sm_user.alertevent.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Utilisateur"
        });
    },
    onPrintClick: function() {

        window.print();
        body :{
            visibility:visible
        }
        print: {
            visibility:visible
        }


    },
    ModifyClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.outboudmessage.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Detail du message"
        });
    },
    onReloadAllClick: function() {
        Ext.MessageBox.confirm('Message',
                'Voulez-vous renvoyer les notifications en attente',
                function(btn) {
                    if (btn === 'yes') {
                        Ext.Ajax.request({
                            url: url_services_transaction_outboudmessage + 'reloadall',
                            params: {
                                search_value: Ext.getCmp('TXT_SEARCH').getValue()
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    Ext.getCmp('GridPanel').getStore().reload();
                                }

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
                    }
                });


    },
    onReloadSmsClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Voulez-vous renvoyer la notification',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_outboudmessage + 'reload',
                            params: {
                                lg_OUTBOUND_MESSAGE_ID: rec.get('lg_OUTBOUND_MESSAGE_ID')
                            },
                            success: function(response)
                            {
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
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_outboudmessage + 'delete',
                            params: {
                                lg_OUTBOUND_MESSAGE_ID: rec.get('lg_OUTBOUND_MESSAGE_ID')
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
                    }
                });


    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.alertevent.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Model Notif  [" + rec.get('str_MESSAGE') + "]"
        });



    },
    onEditpwdClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.alertevent.action.adduserphonealertevent({
            obtntext: "Client",
            odatasource: rec.data,
            nameintern: "Ayant droit",
            parentview: this,
            mode: "detail",
            titre: "Gestion utilisateur a associer [" + rec.get('str_MESSAGE') + "]",
        });


    },
    onRechClick: function() {
        var val = Ext.getCmp('TXT_SEARCH');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_outboudmessage);
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