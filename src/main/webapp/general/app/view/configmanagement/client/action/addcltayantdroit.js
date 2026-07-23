var url_services_data_client_addclt_ayantdroit = '../webservices/configmanagement/ayantdroit/ws_data.jsp';

var url_services_transaction_client_addclt_ayantdroit = '../webservices/configmanagement/ayantdroit/ws_transaction.jsp?mode=';


var OCltgridpanelID;
var Oview;
var Omode;
var Me_Workflow_Detail;
var ref_add;
var cust_name;
var cust_id;
var cust_account_id;
var Ogrid;
var OmyType;
var str_customer_chosen;
var id_customer_chosen;
var solde_customer_chosen;
var OcustGrid;
var lg_CLIENT_ID;
var ref_vente;



Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.configmanagement.client.action.addcltayantdroit', {
    extend: 'Ext.window.Window',
    xtype: 'addcltayantdroit',
    id: 'addcltayantdroitID',
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
    initComponent: function() {



        Oview = this.getParentview();
        Omode = this.getMode();
        Me_Workflow_Detail = this;
        Ogrid = this.getObtntext();
        str_customer_chosen = "";
        id_customer_chosen = "";
        solde_customer_chosen = 0;

        //ref_add = this.getOdatasource();
        ref_vente = this.getNameintern();

        // alert("Ogrid   " + Ogrid);





        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.AyantDroit',
            pageSize: itemsPerPage,
//            autoLoad: false,
            proxy: {
                type: 'ajax',
                // REST : memes cles JSON que la JSP historique ayantdroit/ws_data.jsp
                url: '../api/v1/ayants-droits?lg_CLIENT_ID=' + this.getOdatasource().lg_CLIENT_ID,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });


        str_customer_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Nom.Client : ',
                    name: 'str_customer_chosen',
                    id: 'str_customer_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Client.Name'
                });

        id_customer_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Id.Client : ',
                    name: 'id_customer_chosen',
                    id: 'id_customer_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Client.Id'
                });


        solde_customer_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Solde.Client : ',
                    name: 'solde_customer_chosen',
                    id: 'solde_customer_chosen',
                    hidden: true,
                    emptyText: 'Client.Solde',
                    value: 0,
                    renderer: amountformat,
                    fieldStyle: "color:blue;",
                    align: 'right'

                });





        var form = new Ext.form.Panel({
            width: '70%',
            layout: {
                type: 'hbox'
            },
            /*defaults: {
                flex: 1
            },*/
//            items: ['CltgridpanelID', 'info_client'],
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
                    flex: 2,
                    store: store,
//                    width: '65%',
                    height: 400,
                    columns: [{
                            text: 'lg_AYANTS_DROITS_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_AYANTS_DROITS_ID'
                        }, {
                            text: 'lg_CLIENT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_CLIENT_ID'
                        }, {
                            text: 'Code interne',
                            flex: 1,
                            dataIndex: 'str_CODE_INTERNE'
                        }, {
                            text: 'Matricule',
                            flex: 1,
                            dataIndex: 'str_NUMERO_SECURITE_SOCIAL'
                        }
                        , {
                            text: 'Nom',
                            flex: 1,
                            dataIndex: 'str_FIRST_NAME'
                        },
                        
                        {
                            text: 'Prenom',
                            flex: 1.5,
                            dataIndex: 'str_LAST_NAME'
                        }, {
                            text: 'Sexe',
                            flex: 0.5,
                            dataIndex: 'str_SEXE'
                        }, {
                            text: 'Date de naissance',
                            flex: 1,
                            dataIndex: 'dt_NAISSANCE'
                        }, {
                            text: 'Categorie',
                            flex: 1,
                            hidden: true,
                            dataIndex: 'lg_CATEGORIE_AYANTDROIT_ID'
                        }, {
                            header: 'Ville',
                            dataIndex: 'lg_VILLE_ID',
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
                        }, {
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
                    tbar: [
                        {
                            text: 'Creer',
                            scope: this,
                            iconCls: 'addicon',
                            handler: this.onAddClick
                        }, '-', {
                            xtype: 'textfield',
                            id: 'rechercher',
                            name: 'user',
                            emptyText: 'Recherche',
                            listeners: {
                                'render': function(cmp) {
                                    cmp.getEl().on('keypress', function(e) {
                                        if (e.getKey() === e.ENTER) {
                                            Me_Workflow_Detail.onRechClick();

                                        }
                                    });
                                }
                            }
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon',
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
                }, {
                    columnWidth: 0.35,
                    margin: '10 10 10 10',
                    xtype: 'fieldset',
                    title: 'Information du client',
                    id: 'info_client',
                    layout: 'anchor',
//                    width: '30%',
                    flex: 1,
                    defaultType: 'textfield',
                    items: [id_customer_chosen,
                        str_customer_chosen,
                        solde_customer_chosen

                    ]

                }]
        });

        this.callParent();
        OCltgridpanelID = Ext.getCmp('CltgridpanelID');

        if (Omode === "detail") {
            lg_CLIENT_ID = this.getOdatasource().lg_CLIENT_ID;
            //alert("lg_CLIENT_ID "+lg_CLIENT_ID + " nom prenom "+ this.getOdatasource().str_FIRST_LAST_NAME);
            Ext.getCmp('id_customer_chosen').setValue(lg_CLIENT_ID);
            Ext.getCmp('str_customer_chosen').setValue(this.getOdatasource().str_FIRST_LAST_NAME);
            Ext.getCmp('solde_customer_chosen').setValue(this.getOdatasource().dbl_SOLDE);


        }
        /* if (Ogrid === "Tiers.Payant") {
         Ext.getCmp('info_client').hide(); 
         
         }*/

        var win = new Ext.window.Window({
            autoShow: true,
            id: 'cltwinID',
            title: this.getTitre(),
            width: '80%',
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'OK',
                    //handler: this.onbtnsave
                    handler: function() {
                        win.close();
                    }
                }, {
                    text: 'Retour',
                    handler: function() {
                        win.close();
                    }
                }]
        });
    },
    onChooseCustomerClick: function(grid, rowIndex) {

        var rec = OCltgridpanelID.getStore().getAt(rowIndex);
        str_customer_chosen.setValue(rec.get('str_FIRST_NAME'));
        id_customer_chosen.setValue(rec.get('lg_CLIENT_ID'));
        solde_customer_chosen.setValue(rec.get('dbl_SOLDE'));
        cust_id = rec.get('lg_CLIENT_ID');
        cust_name = rec.get('str_FIRST_NAME');
        cust_account_id = rec.get('lg_COMPTE_CLIENT_ID');
    },
    onbtnsave: function() {
        var xtype = "doventemanager";
        this.up('window').close();
        testextjs.app.getController('App').onLoadNewComponentWith2DataSource(xtype, "by_cloturer_vente_add", cust_name, ref_add, cust_account_id);

        

    }, onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.ayantdroit.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            type: "clientmanager",
            titre: "Modification de l'ayant droit du client [" + this.getOdatasource().str_FIRST_LAST_NAME + "]"
        });
    },
    onChooseTiersClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.dovente.action.addTiersPayant({
            odatasource: rec.data,
            parentview: this,
            mode: "updatecarnet",
            titre: "Tiers.Payant  Client  [" + rec.get('str_LAST_NAME') + "]"
        });
    },
    onAddClick: function() {

        new testextjs.view.configmanagement.ayantdroit.action.add({
            odatasource: this.getOdatasource(),
            parentview: this,
            mode: "createayantdroitByclt",
            titre: "Ajouter d'un ayant droit du client [" + this.getOdatasource().str_FIRST_LAST_NAME + "]",
            type: "clientmanager"
        });
    }, onRemoveClick: function(grid, rowIndex) {
        var lg_CLIENT_ID = this.getOdatasource().lg_CLIENT_ID;
        Ext.MessageBox.confirm('Message',
                'Confirmation de la suppresssion',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_client_addclt_ayantdroit + 'delete',
                            params: {
                                lg_AYANTS_DROITS_ID: rec.get('lg_AYANTS_DROITS_ID'),
                                lg_CLIENT_ID: lg_CLIENT_ID
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('confirmation', object.errors);
                                    var OGrid = Ext.getCmp('CltgridpanelID');

                                    OGrid.getStore().reload();
                                }
                                //  grid.getStore().reload();
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
    onRechClick: function() {

        var val = Ext.getCmp('rechercher');
        OCltgridpanelID.getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_client_addclt_ayantdroit);
    }
});