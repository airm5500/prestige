/* global Ext */

var url_services_data_client_addcompteclttierpayant = '../webservices/configmanagement/compteclienttierspayant/ws_data.jsp';

var url_services_transaction_client_addcompteclttierpayant = '../webservices/configmanagement/compteclienttierspayant/ws_transaction_clt.jsp?mode=';

// REST dedie (memes cles JSON et memes regles metier que les JSP ci-dessus)
var url_rest_data_client_tierspayants = '../api/v1/client/gestion/tiers-payants';
var url_rest_transaction_client_tierspayants = '../api/v1/client/gestion/tiers-payants/';


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
var lg_COMPTE_CLIENT_ID;
var ref_vente;



Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.configmanagement.client.action.showclttierspayant', {
    extend: 'Ext.window.Window',
    xtype: 'addshowclttierspayant',
    id: 'addshowclttierspayantID',
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
            model: 'testextjs.model.CompteClientTierspayant',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_rest_data_client_tierspayants + "?lg_COMPTE_CLIENT_ID=" + this.getOdatasource().lg_COMPTE_CLIENT_ID,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

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
                    emptyText: 'Client.Solde',
                    hidden: true,
                    value: 0,
                    renderer: amountformat,
                    fieldStyle: "color:blue;",
                    align: 'right'

                });





        var form = new Ext.form.Panel({
            width: 1050,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
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
                    flex: 2,
                    id: 'CltgridpanelID',
                    store: store,
                    height: 400,
                    columns: [{
                            text: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID'
                        }, {
                            text: 'lg_TIERS_PAYANT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_TIERS_PAYANT_ID'
                        }, {
                            text: 'lg_COMPTE_CLIENT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_COMPTE_CLIENT_ID'
                        }, {
                            text: 'Tier payant',
                            flex: 1,
                            dataIndex: 'str_TIERS_PAYANT_NAME'
                        }, {
                            text: 'Pourcentage',
                            flex: 1,
                            dataIndex: 'int_POURCENTAGE'
                        }
                        , {
                            text: 'Plafond sur encours',
                            flex: 1,
                            dataIndex: 'db_PLAFOND_ENCOURS'
                        }
                        
                        , {
                            text: 'Plafond Vente',
                            flex: 1,
                            dataIndex: 'dbl_PLAFOND'
                        }
                        
                        , {
                            text: 'Conso.Plafond',
                            flex: 1,
                            dataIndex: 'db_CONSOMMATION_MENSUELLE',//db_CONSOMMATION_MENSUELLE,
                            renderer: function(val) {
                                var result = "<div style='text-align: right; font-weight: bold;'>" + val + "</div>";
                                return result;
                            }
                        }, {
                            text: 'R&eacute;gime',
                            flex: 1,
                            dataIndex: 'str_REGIME'
                        }, {
                            text: 'Date de creation',
                            flex: 1,
                            dataIndex: 'dt_CREATED',
                            hidden: true
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
                        }, /* {
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
                                    getClass: function(value, metadata, record) {
                                        if (record.get('BTNDELETE')) {
                                            return 'x-display-hide';
                                        } else {
                                            return 'x-hide-display';
                                        }
                                    },
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
                            iconCls: 'searchicon',
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
                }, {
                    columnWidth: 0.35,
                    margin: '10 10 10 10',
                    xtype: 'fieldset',
                    title: 'Information du client',
                    id: 'info_client',
                    layout: 'anchor',
                    flex: 1,
                    defaultType: 'textfield',
                    // id_customer_chosen (Id.Client) volontairement non affiche : identifiant technique
                    // sans interet pour l'utilisateur (le champ reste alimente en interne)
                    items: [str_customer_chosen,
                        solde_customer_chosen

                    ]

                }]
        });

        this.callParent();
        OCltgridpanelID = Ext.getCmp('CltgridpanelID');

        if (Omode == "associertierspayant") {
            lg_CLIENT_ID = this.getOdatasource().lg_CLIENT_ID;
            //alert("lg_CLIENT_ID "+lg_CLIENT_ID + " nom prenom "+ this.getOdatasource().str_FIRST_LAST_NAME + " lg_COMPTE_CLIENT_ID "+this.getOdatasource().lg_COMPTE_CLIENT_ID);
            Ext.getCmp('id_customer_chosen').setValue(lg_CLIENT_ID);
            Ext.getCmp('str_customer_chosen').setValue(this.getOdatasource().str_FIRST_LAST_NAME);
            Ext.getCmp('solde_customer_chosen').setValue(this.getOdatasource().dbl_SOLDE);


        }
        /* if (Ogrid === "Tiers.Payant") {
         Ext.getCmp('info_client').hide(); 
         
         }*/

        // Fenetre a id fixe : detruire l'instance precedente avant d'en creer une autre.
        if (Ext.getCmp('cltwinID')) {
            Ext.getCmp('cltwinID').destroy();
        }
        var win = new Ext.window.Window({
            modal: true,
            autoShow: true,
            id: 'cltwinID',
            title: this.getTitre(),
            width: '80%',
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
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

        /* if (Ogrid === "Tiers.Payant"){
         testextjs.app.getController('App').onLoadNewComponentWith2DataSource(xtype, "by_cloturer_vente_add", cust_name, ref_add, cust_account_id);
         } else if (Ogrid === "Client") {
         testextjs.app.getController('App').onLoadNewComponentWith2DataSource(xtype, "by_cloturer_vente_add", cust_name, ref_add, cust_account_id);
         }*/

    }, onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.compteclient.action.addclttierspayant({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification de l'association du tiers payant au client [" + this.getOdatasource().str_FIRST_LAST_NAME + "]"
        });
    },
    onChooseTiersClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_CltgridpanelIDuser.dovente.action.addTiersPayant({
            odatasource: rec.data,
            parentview: this,
            mode: "updatecarnet",
            titre: "Tiers.Payant  Client  [" + rec.get('str_LAST_NAME') + "]"
        });
    },
    onAddClick: function() {

        new testextjs.view.configmanagement.compteclient.action.addclttierspayant({
            odatasource: this.getOdatasource(),
            parentview: this,
            mode: "createtierspayantByclt",
            titre: "Ajouter un tiers payant au client [" + this.getOdatasource().str_FIRST_LAST_NAME + "]"
        });
    }, onRemoveClick: function(grid, rowIndex) {

        Ext.MessageBox.confirm('Message',
                'Confirmation de la suppresssion',
                function(btn) {
                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_rest_transaction_client_tierspayants + 'delete',
                            method: 'POST',
                            params: {
                                lg_COMPTE_CLIENT_TIERS_PAYANT_ID: rec.get('lg_COMPTE_CLIENT_TIERS_PAYANT_ID'),
                                // lg_CLIENT_ID: lg_CLIENT_ID
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);

                                if (object.success === "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);

                                } else {
                                    //  alert(object.errors);
                                    Ext.MessageBox.alert('confirmation', object.errors);
                                    /*  var OGrid = Ext.getCmp('CltgridpanelID');
                                     
                                     OGrid.getStore().reload();*/
                                    grid.getStore().reload();
                                }
                                //  grid.getStore().reload();
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
    onRechClick: function() {

        var val = Ext.getCmp('rechercher');
        OCltgridpanelID.getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_client_addcompteclttierpayant);
    }
});