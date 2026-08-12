var url_services_data_userphone = '../webservices/sm_user/userphone/ws_data.jsp';
var url_services_transaction_userphone = '../webservices/sm_user/userphone/ws_transaction.jsp?mode=';



var OCltgridpanelID;
var Oview;
var Omode;
var Me;
var str_inventaire_chosen;
var str_commentaire_chosen;
var user_chosen;
var dt_created_chosen;
var ref;
var listProductSelected;

Ext.define('testextjs.view.sm_user.user.action.addUserPhone', {
    extend: 'Ext.window.Window',
    xtype: 'addUserPhone',
    id: 'addUserPhoneID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    title: 'Saisie de numero de telephone',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        ref = this.getOdatasource().lg_USER_ID;

        listProductSelected = [];

        var itemsPerPage = 20;


        var store = new Ext.data.Store({
            model: 'testextjs.model.UserPhone',
            pageSize: itemsPerPage,
            autoLoad: true,
//            proxy: proxy
            proxy: {
                type: 'ajax',
                url: url_services_data_userphone + "?lg_USER_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 180000
            }
//            autoLoad: true

        });



        str_inventaire_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Nom',
                    name: 'str_inventaire_chosen',
                    id: 'str_inventaire_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Nom'
                });

        str_commentaire_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Prenom(s)',
                    name: 'str_commentaire_chosen',
                    id: 'str_commentaire_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Prenom(s)'
                });


        user_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Role',
                    name: 'user_chosen',
                    id: 'user_chosen',
                    emptyText: 'Role',
                    fieldStyle: "color:blue;",
                    align: 'right'

                });


        dt_created_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Lieu de travail',
                    name: 'dt_created_chosen',
                    id: 'dt_created_chosen',
                    emptyText: 'Lieu de travail',
                    fieldStyle: "color:blue;",
                    align: 'right'

                });

        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        var form = new Ext.form.Panel({
            width: 1050,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
//            items: ['CltgridpanelID', 'info_imprimante'],
            autoHeight: true,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            items: [{
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    flex: 1.5,
                    id: 'CltgridpanelID',
                    store: store,
                    height: 400,
                    columns: [{
                            text: 'lg_USER_FONE_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_USER_FONE_ID'
                        }, {
                            text: 'Numero',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'str_PHONE'
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
                    tbar: [{
                            text: 'Creer',
                            scope: this,
                            handler: this.onAddClick
                        }, '-', {
                            xtype: 'textfield',
                            id: 'rechercher',
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
                        store: store,
                        dock: 'bottom',
                        displayInfo: true
                    }
                }, {
                    columnWidth: 0.35,
                    margin: '10 10 10 10',
                    xtype: 'fieldset',
                    title: 'Information sur l\'utilisateur',
                    id: 'info_utilisateur',
                    layout: 'anchor',
                    defaultType: 'textfield',
                    items: [str_inventaire_chosen,
                        str_commentaire_chosen,
                        user_chosen,
                        dt_created_chosen
                    ]

                }]
        });

        this.callParent();
        OCltgridpanelID = Ext.getCmp('CltgridpanelID');
        if (Omode === "assocnumber") {
            ref = this.getOdatasource().lg_USER_ID;
            //alert("ref " + ref);
            Ext.getCmp('str_inventaire_chosen').setValue(this.getOdatasource().str_FIRST_NAME);
            Ext.getCmp('str_commentaire_chosen').setValue(this.getOdatasource().str_LAST_NAME);
            Ext.getCmp('user_chosen').setValue(this.getOdatasource().lg_ROLE_ID);
            Ext.getCmp('dt_created_chosen').setValue(this.getOdatasource().str_LIEU_TRAVAIL);
        }

        var win = new Ext.window.Window({
            autoShow: true,
            id: 'cltwinID',
            title: this.getTitre(),
            width: 1150,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    hidden: true,
                    handler: function() {
                        win.close();
                    }
                    // handler: this.onbtnsave
                }, {
                    text: 'Fermer',
                    handler: function() {
                        win.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function() {
                    //alert('im cancelling the window closure by returning false...');
                    //return false;
                }
            }
        });


    },
    onAddClick: function() {

        new testextjs.view.sm_user.user_phone.action.add({
            odatasource: this.getOdatasource(),
            parentview: this,
            mode: "create",
            titre: "Ajouter un numero"
        });

    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.user_phone.action.add({
//            odatasource: this.getOdatasource(),
//            odatasourceinternal: rec.data,
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification telephone  [" + rec.get('str_PHONE') + "]"
        });


    },
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function(btn) {


                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_userphone + 'delete',
                            params: {
                                lg_USER_FONE_ID: rec.get('lg_USER_FONE_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
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
});