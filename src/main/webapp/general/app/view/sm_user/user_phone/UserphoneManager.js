//var url_services ='../webservices/sm_user/institution';
var url_services_data_userphone = '../webservices/sm_user/userphone/ws_data.jsp';
var url_services_transaction_userphone = '../webservices/sm_user/userphone/ws_transaction.jsp?mode=';

var Oname_intern = "";
Ext.define('testextjs.view.sm_user.user_phone.UserphoneManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'userphonemanager',
    id: 'userphonemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.UserPhone',
        // 'testextjs.view.sm_user.produit.action.add',
        // 'testextjs.view.sm_user.produit.action.addupload',
        'Ext.ux.ProgressBarPager',
    ],
    title: 'User Phone',
    frame: true,
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        nameintern: ''
    },
    initComponent: function () {



        Oview = this.getParentview();
        Omode = this.getMode();

        url_services_data_userphone = '../webservices/sm_user/userphone/ws_data.jsp';
        this.setTitle("Numero de Telelephe de :" + this.getOdatasource().str_LAST_NAME + "  " + this.getOdatasource().str_FIRST_NAME);

        url_services_data_userphone = url_services_data_userphone + "?lg_USER_ID=" + this.getOdatasource().lg_USER_ID;

        //alert(url_services_data_userphone);

        Oname_intern = this.getNameintern();

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.UserPhone',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_userphone,
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
                    header: 'lg_USER_FONE_ID',
                    dataIndex: 'lg_USER_FONE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Telephone',
                    dataIndex: 'str_PHONE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Statut',
                    dataIndex: 'str_STATUT',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }/*,{
                 header: 'Prix',
                 dataIndex: 'int_PRICE',
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 
                 },{
                 header: 'Stock de Securite',
                 dataIndex: 'int_STOCK_MINIMAL',
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 
                 },{
                 header: 'Image',
                 dataIndex: 'str_PIC_SMALL',
                 flex: 1
                 
                 },{
                 header: 'Statut',
                 dataIndex: 'str_STATUT'
                 /* flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 
                 }*/, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.gif',
                            tooltip: 'Upload Image',
                            scope: this,
                            handler: this.onUploadClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Edit',
                            scope: this,
                            handler: this.onEditClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'Delete Plant',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    text: 'Retour',
                    scope: this,
                    handler: this.onRetourReportClick
                },
                {
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
        })


        this.on('edit', function (editor, e) {

            Ext.Ajax.request({
                url: url_services_transaction_userphone + 'update',
                params: {
                    lg_USER_FONE_ID: e.record.data.lg_USER_FONE_ID,
                    str_PHONE: e.record.data.str_PHONE,
                    str_STATUT: e.record.data.str_STATUT/*,
                     int_PRICE : e.record.data.int_PRICE,
                     int_STOCK_MINIMAL : e.record.data.int_STOCK_MINIMAL,
                     str_PIC_SMALL : e.record.data.str_PIC_SMALL,
                     str_STATUT : e.record.data.str_STATUT*/
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
    onRetourReportClick: function () {
        //  var rec = grid.getStore().getAt(rowIndex);
        //alert(Oref_intern);
        var xtype = "usermanager";
        var alias = 'widget.' + xtype;

        testextjs.app.getController('App').onLoadNewComponent(xtype, "", "");
    },
    onStoreLoad: function () {
    },
    onAddClick: function () {

        new testextjs.view.sm_user.user_phone.action.add({
            odatasource: this.getOdatasource(),
            parentview: this,
            mode: "create",
            titre: "Ajouter un numero"
        });


        /* this.getStore().insert(0, rec);
         this.cellEditing.startEditByPosition({
         row: 0,
         column: 0
         });*/
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.user_phone.action.add({
            odatasource: this.getOdatasource(),
            odatasourceinternal: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification telephone  [" + rec.get('str_PHONE') + "]"
        });


    },
    onUploadClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.produit.action.addupload({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Upload Image"
        });


    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_userphone + 'delete',
                            params: {
                                lg_USER_FONE_ID: rec.get('lg_USER_FONE_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
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
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_userphone);
    }

})