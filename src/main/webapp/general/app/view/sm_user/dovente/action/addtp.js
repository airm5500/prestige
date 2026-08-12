var url_services_data_client_addclt = '../webservices/configmanagement/compteclient/ws_data.jsp';


var OClttpgridpanelID;
var Oview;
var Omode;
var Me;
var ref_add;
var tp_name;
var cust_id;
var cust_tp_id;
var Ogrid;
var OmyType;
var str_tp_chosen;
var id_customer_chosen;
var solde_customer_chosen;
var id_tp_chosen;
var OcustGrid;
var ref_vente;



Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}



Ext.define('testextjs.view.sm_user.dovente.action.addtp', {
    extend: 'Ext.window.Window',
    xtype: 'addtp',
    id: 'addtpID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.view.sm_user.dovente.action.addTiersPayant'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: ''
    },
    title: 'Choix Produit',
    bodyPadding: 5,
    layout: 'column',
    collapsible: true,
    animCollapse: false, plain: true,
    maximizable: true,
    tools: [{type: "pin"}],
    closable: true,
    iconCls: 'icon-grid',
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {str_FAMILLE_ITEM}</p>',
                    {
                        formatChange: function(v) {
                            var color = v >= 0 ? 'green' : 'red';
                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                        }
                    })
        }],
    initComponent: function() {

        url_services_data_client_addclt = '../webservices/configmanagement/compteclient/ws_data.jsp';

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        Ogrid = this.getObtntext();
        str_customer_chosen = "";
        id_customer_chosen = "";
        solde_customer_chosen = 0;
        id_tp_chosen = "";

        ref_add = this.getOdatasource();
        ref_vente = this.getNameintern();


        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.CompteClient',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_client_addclt,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });


        str_tp_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Tiers.Payant : ',
                    name: 'str_tp_chosen',
                    id: 'str_tp_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Tiers.Payant'
                });



        id_tp_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Tiers.Payant Id : ',
                    name: 'id_tp_chosen',
                    id: 'id_tp_chosen',
                    fieldStyle: "color:green;",
                    emptyText: 'Tiers.Payant Id'
                });
        /*
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
         value: 0,
         renderer: amountformat,
         fieldStyle: "color:blue;",
         align: 'right'
         
         });
         
         */



        var form = new Ext.form.Panel({
            width: '60%',
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            items: ['ClttpgridpanelID', 'resume_choix'],
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
                    id: 'ClttpgridpanelID',
                    store: store,
                    height: 400,
                    columns: [{
                            text: 'lg_COMPTE_CLIENT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_COMPTE_CLIENT_ID'
                        }, {
                            text: 'lg_CLIENT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_CLIENT_ID'
                        }, {
                            text: 'Prenom',
                            flex: 1,
                            dataIndex: 'str_FIRST_NAME'
                        }, {
                            text: 'Nom',
                            flex: 1,
                            dataIndex: 'str_LAST_NAME'
                        }, {
                            text: 'Sexe',
                            flex: 1,
                            dataIndex: 'str_SEXE'
                        }, {
                            text: 'Securite.Social',
                            flex: 1,
                            dataIndex: 'str_NUMERO_SECURITE_SOCIAL'
                        }, {
                            text: 'Adresse',
                            flex: 1,
                            dataIndex: 'str_ADRESSE'
                        }, {
                            header: 'Solde',
                            dataIndex: 'dbl_SOLDE',
                            flex: 1

                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/folder_wrench.png',
                                    tooltip: 'Attribution',
                                    scope: this,
                                    handler: this.onAttributionClick
                                }]
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/add.gif',
                                    tooltip: 'Choisir Tiers.Payant',
                                    scope: this,
                                    handler: this.onChooseCustomerClick
                                }]
                        }], tbar: [
                        {
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
                    listeners: {
                        scope: this
                    },
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
                    title: 'Resume Choix',
                    id: 'resume_choix',
                    layout: 'anchor',
                    defaultType: 'textfield',
                    items: [
                        str_tp_chosen,
                        id_tp_chosen

                    ]

                }]
        });

        this.callParent();
        OClttpgridpanelID = Ext.getCmp('ClttpgridpanelID');










        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 950,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'OK',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function() {
                        win.close();
                    }
                }]
        });
    },
    onAttributionClick: function(grid, rowIndex) {
        var rec = OClttpgridpanelID.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.dovente.action.addTiersPayant({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Attribution des tiers payants pour le client [" + rec.get('str_FIRST_NAME') + "]"
        });

    },
    onChooseCustomerClick: function() {
        // var rec = OClttpgridpanelID.getStore().getAt(rowIndex);
        // var clt_name = rec.get('str_FIRST_NAME');
        Me.GetCustTP();


    },
    onbtnsave: function() {

        var xtype = "doventemanager";
        this.up('window').close();
        testextjs.app.getController('App').onLoadNewComponentWith2DataSource(xtype, "by_cloturer_vente_addtp", tp_name, ref_add, cust_tp_id);

    },
    onRechClick: function() {

        var val = Ext.getCmp('rechercher');
        OClttpgridpanelID.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_client_addclt);
    },
    GetCustTP: function() {
        Ext.Ajax.request({
            url: '../webservices/configmanagement/compteclient/ws_init_data.jsp',
            params: {
                lg_CLIENT_ID: refclt
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                var list_size = object.total;
                var str_name = "";
                var lg_tp_id = "";
                alert("str_name dbt  " + str_name);
                for (var i = 0; i < list_size; i++) {
                    var OTP = object.results[i];
                    alert("str_NAME  " + OTP.str_NAME);
                    alert("str_name  " + str_name);
                    str_name = OTP.str_NAME + ";" + str_name;
                    lg_tp_id = OTP.lg_TIERS_PAYANT_ID + ";" + lg_tp_id;
                    alert("str_name  " + str_name);
                    alert("lg_tp_id  " + lg_tp_id);
                    alert("str_name mil  " + str_name);

                }
                Ext.getCmp('str_tp_chosen').setValue(str_name);
                Ext.getCmp('id_tp_chosen').setValue(lg_tp_id);
                tp_name = Ext.getCmp('str_tp_chosen').getValue();
                cust_tp_id = Ext.getCmp('id_tp_chosen').getValue();
                alert("tp_name  " + tp_name);
                alert("cust_tp_id  " + cust_tp_id);
                str_name = "";
                alert("str_name fin  " + str_name);

            },
            failure: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }

        });

    }
});