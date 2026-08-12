var url_services_data_userphonealertevent = '../webservices/sm_user/userphonealertevent/ws_data.jsp';

var url_services_transaction_client_addclt_ayantdroit = '../webservices/sm_user/ayantdroit/ws_transaction.jsp?mode=';


var OCltgridpanelID;
var Oview;
var Omode;
var Me;
var ref_add;
var cust_name;
var cust_id;
var cust_account_id;
var Ogrid;
var OmyType;
var OcustGrid;
var str_Event;
var ref_vente;



Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.alertevent.action.adduserphonealertevent', {
    extend: 'Ext.window.Window',
    xtype: 'adduserphonealertevent',
    id: 'adduserphonealerteventID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.CompteClient',
        'testextjs.view.sm_user.dovente.action.add'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: ''
    },
    title: 'Choix.Client',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {

        url_services_data_userphonealertevent = '../webservices/sm_user/userphonealertevent/ws_data.jsp';

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        Ogrid = this.getObtntext();


        //ref_add = this.getOdatasource();
        ref_vente = this.getNameintern();

        // alert("Ogrid   " + Ogrid);





        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Userphonealertevent',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_userphonealertevent + "?str_Event=" + this.getOdatasource().str_Event,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });




        var form = new Ext.form.Panel({
            width: 500,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            items: ['CltgridpanelID'],
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
                    id: 'CltgridpanelID',
                    store: store,
                    height: 400,
                    columns: [{
                            text: 'lg_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_ID'
                        }, {
                            text: 'str_Event',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'str_Event'
                        }, {
                            text: 'Utilisateur',
                            flex: 1,
                            dataIndex: 'lg_USER_FONE_ID'
                        }, {
                            text: 'Telephone',
                            flex: 1,
                            dataIndex: 'str_LIST_PHONE'
                        }, {
                            header: 'Statut',
                            dataIndex: 'str_STATUT',
                            flex: 1

                        }/*, {
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
                         }*/, /* {
                          xtype: 'actioncolumn',
                          width: 30,
                          sortable: false,
                          menuDisabled: true,
                          items: [{
                          icon: 'resources/images/icons/fam/add.gif',
                          tooltip: 'Choisir Client',
                          scope: this,
                          handler: this.onChooseCustomerClick
                          }]
                          },*/ {
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
                        }/*, {
                         xtype: 'actioncolumn',
                         width: 30,
                         sortable: false,
                         menuDisabled: true,
                         items: [{
                         icon: 'resources/images/icons/fam/application_view_list.png',
                         tooltip: 'Tiers.Payant',
                         scope: this,
                         handler: this.onChooseTiersClick,
                         getClass: function () {
                         if (Ogrid === "Client") {
                         return 'x-hide-display';
                         } else if (Ogrid === "Tiers.Payant") {
                         return 'x-display-hide';
                         }
                         }
                         }]
                         }*/],
                    tbar: [
                        {
                            text: 'Creer',
                            scope: this,
                            handler: this.onAddClick
                        }, '-', {
                            xtype: 'textfield',
                            id: 'rechercher',
                            name: 'user',
                            emptyText: 'Rech'}, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            handler: this.onRechClick
                        }],
                    listeners: {
                        scope: this},
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true
                    }
                }/*, {
                 columnWidth: 0.35,
                 margin: '10 10 10 10',
                 xtype: 'fieldset',
                 title: 'Information du client',
                 id: 'info_client',
                 layout: 'anchor',
                 defaultType: 'textfield',
                 items: [id_customer_chosen,
                 str_customer_chosen,
                 solde_customer_chosen
                 
                 ]
                 
                 }*/]
        });

        this.callParent();
        OCltgridpanelID = Ext.getCmp('CltgridpanelID');
        str_Event = this.getOdatasource().str_Event;
        if (Omode === "detail") {
            str_Event = this.getOdatasource().str_Event;


        }
        /* if (Ogrid === "Tiers.Payant") {
         Ext.getCmp('info_client').hide(); 
         
         }*/

        var win = new Ext.window.Window({
            autoShow: true,
            id: 'cltwinID',
            title: this.getTitre(),
            width: 600,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Envoyer des notification',
                    //handler: this.onbtnsave
                    handler: function () {


                        var url_services_notify = '../webservices/sm_user/alertevent/ws_transaction.jsp?mode=notify';
                        Ext.Ajax.request({
                            url: url_services_notify,
                            params: {
                                str_Event: str_Event,
                                // str_Event: ref
                            },
                            success: function (response)
                            {
                                //alert("succes");
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Infos Message', 'CREER AVEC SUCCES');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('  Message', object.errors);
                                }
                                Oview.getStore().reload();
                            },
                            failure: function (response)
                            {
                                //alert("echec");
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('  Message', response.responseText);
                            }
                        });
                        win.close();
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });
    },
    onChooseCustomerClick: function (grid, rowIndex) {


    },
    onbtnsave: function () {
        var xtype = "doventemanager";
        this.up('window').close();
        testextjs.app.getController('App').onLoadNewComponentWith2DataSource(xtype, "by_cloturer_vente_add", cust_name, ref_add, cust_account_id);

        /* if (Ogrid === "Tiers.Payant"){
         testextjs.app.getController('App').onLoadNewComponentWith2DataSource(xtype, "by_cloturer_vente_add", cust_name, ref_add, cust_account_id);
         } else if (Ogrid === "Client") {
         testextjs.app.getController('App').onLoadNewComponentWith2DataSource(xtype, "by_cloturer_vente_add", cust_name, ref_add, cust_account_id);
         }*/

    }, onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.ayantdroit.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            type: "clientmanager",
            titre: "Modification de l'ayant droit du client [" + this.getOdatasource().str_FIRST_LAST_NAME + "]"
        });
    },
    onChooseTiersClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.dovente.action.addTiersPayant({
            odatasource: rec.data,
            parentview: this,
            mode: "updatecarnet",
            titre: "Tiers.Payant  Client  [" + rec.get('str_LAST_NAME') + "]"
        });
    },
    onAddClick: function () {

        new testextjs.view.sm_user.alertevent.action.adduserphonetoalert({
            odatasource: this.getOdatasource(),
            parentview: this,
            mode: "createayantdroitByclt",
            titre: "Ajouter un numero utilisateur [" + this.getOdatasource().str_Event + "]",
            type: "clientmanager"
        });
    }, onRemoveClick: function (grid, rowIndex) {
        var str_Event = this.getOdatasource().str_Event;
        Ext.MessageBox.confirm('Message',
                'Confirmation de la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        
                         var url_services_userphonealertevent_transaction_delete = '../webservices/sm_user/userphonealertevent/ws_transaction.jsp?mode=';
                        
                        
                        Ext.Ajax.request({
                            url: url_services_userphonealertevent_transaction_delete + 'delete',
                            params: {
                              //  lg_AYANTS_DROITS_ID: rec.get('lg_AYANTS_DROITS_ID'),
                                lg_ID: rec.get('lg_ID')
                               
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('confirmation', object.errors);
                                    var OGrid = Ext.getCmp('CltgridpanelID');

                                    OGrid.getStore().reload();
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
    onRechClick: function () {

        var val = Ext.getCmp('rechercher');
        OCltgridpanelID.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_client_addclt_ayantdroit);
    }
});