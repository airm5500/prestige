/* global Ext */

var url_services_data_client_displayCust_final = '../webservices/configmanagement/client/ws_data.jsp';


var Oview;
var Omode;
var Me_displayCust;
var ref_add;
//var LaborexWorkFlow;
var str_path_displayCust;
var itemsPerPage = 20;
var OCustomerDisplaygridpanelID;
var win_add_displayCust;
var OCustomer_search_display;
var OCustomer_vente_display;
var OCust_num_ss;
var OCust_str_nom;
var OCust_phone;
var OFieldProduct;
var OCust_str_prenom;
var OCust_str_id;
var OCust_compte_id;



Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.sm_user.dovente.action.displayCustomer', {
    extend: 'Ext.window.Window',
    xtype: 'displayCustomer',
    id: 'displayCustomerID',
    requires: [
        //  'Ext.selection.CellModel',
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.model.CompteClient'

    ],
    config: {
        odatasource: '',
        o2ndatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: ''
    },
    title: 'CLIENT(S) CORRESPONDANT(S) A LA RECHERCHE',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {
        Me_displayCust = this;
        Me_displayCust.InitializeDisplayArticle();

        var store_client_displayCust = LaborexWorkFlow.BuildStore('testextjs.model.CompteClient', itemsPerPage, url_services_data_client_displayCust_final);
        LaborexWorkFlow.venteTierspayant = [];

        var form_displayCust = new Ext.form.Panel({
            width: 1050,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },

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
                    id: 'CustomerDisplaygridpanelID',
                    store: store_client_displayCust,
                    height: 200,
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
                            text: 'isCustSolvable',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'isCustSolvable'
                        }, {
                            text: 'Nom',
                            flex: 1,
                            dataIndex: 'str_FIRST_NAME'
                        }, {
                            text: 'Prenom',
                            flex: 1,
                            dataIndex: 'str_LAST_NAME'
                        }, {
                            text: 'No RO',
                            flex: 1,
                            dataIndex: 'RO'
                        }, {
                            text: 'dbl_total_differe',
                            flex: 1,
                            hidden: true,
                            dataIndex: 'dbl_total_differe'
                        }],
                    tbar: [
                        {
                            text: 'Creer',
                            scope: this,
                            hidden: true,
                            iconCls: 'addicon',
                            handler: this.onAddClick
                        }, '-',
                        {
                            xtype: 'textfield',
                            id: 'rechercher_adddisplay',
                            name: 'user',
                            emptyText: 'Recherche',
                            listeners: {
                                'render': function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) {
                                            Me_displayCust.onRechClick();

                                        }
                                    });
                                }
                            }
                        }, {
                            text: 'rechercher',
                            iconCls: 'searchicon',
                            tooltip: 'rechercher',
                            scope: this,
                            handler: this.onRechClick
                        }],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store_client_displayCust,
                        dock: 'bottom',
                        displayInfo: true
                    },
                    listeners: {
                        scope: this,
                        selectionchange: this.onSelectionChange
                    }
                }]
        });
        this.callParent();
        win_add_displayCust = new Ext.window.Window({
            autoShow: true,
            id: 'CustdisplayArtwinID',
            title: this.getTitre(),
            width: 500,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form_displayCust,
            buttons: [{
                    text: 'OK',
                    id: 'btn_displayCust_saveID',
                    hidden: true,
                    handler: function () {
                        win_add_displayCust.onbtnsave_addclt();
                    }
                }, {
                    text: 'Annuler',
                    id: 'btn_displayCust_anulerID',
                    hidden: true,
                    handler: function () {
                        win_add_displayCust.close();
                    }
                }]

        });

        Me_displayCust.ViewLoading();

    },
    loadStore: function () {
        OCustomerDisplaygridpanelID.load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onRechClick: function () {
        var val = Ext.getCmp('rechercher_adddisplay');
        //   alert(Ext.getCmp('rechercher_adddisplay').getValue() + url_services_data_client_displayCust_final)
        var str_type_client;
        if (OCustomer_vente_display === "2") {
            str_type_client = "1";
        } else if (OCustomer_vente_display === "3") {
            str_type_client = "2";
        } else if (OCustomer_vente_display === "1" || OCustomer_vente_display === "AU COMPTANT") {
            str_type_client = "6";
        }

        if (str_type_client === "6") {
            url_services_data_client_displayCust_final = "../webservices/sm_user/diffclient/ws_customer_data.jsp?lg_TYPE_CLIENT_ID=" + str_type_client;
        }
        OCustomerDisplaygridpanelID.getStore().getProxy().url = url_services_data_client_displayCust_final;
        OCustomerDisplaygridpanelID.getStore().reload({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_client_displayCust_final);


    },
    onSelectionChange: function (model, records) {

        var rec = records[0];
       
        var str_cust_num_social = rec.get('str_NUMERO_SECURITE_SOCIAL');
        var str_cust_addresse = rec.get('str_ADRESSE');
        var str_cust_firstname = rec.get('str_FIRST_NAME');
        var str_cust_lastname = rec.get('str_LAST_NAME');
        var str_cust_id = rec.get('lg_CLIENT_ID');
        var str_compte_cust_id = rec.get('lg_COMPTE_CLIENT_ID');
        var lg_AYANTS_DROITS_ID = rec.get('lg_AYANTS_DROITS_ID');


//        alert("lg_AYANTS_DROITS_ID ----"+lg_AYANTS_DROITS_ID);


        OCust_num_ss.setValue(str_cust_num_social);
        OCust_str_nom.setValue(str_cust_lastname);
        OCust_phone.setValue(str_cust_addresse);
        OCust_str_prenom.setValue(str_cust_firstname);
        /*OFieldProduct.focus(true, 100, function () {
         OFieldProduct.selectText(0, 1);
         });*/
        OCust_str_id.setValue(str_cust_id);
        OCust_compte_id.setValue(str_compte_cust_id);

        LaborexWorkFlow.SetComponentValue('str_FIRST_NAME_AD', str_cust_firstname);
        LaborexWorkFlow.SetComponentValue('str_LAST_NAME_AD', str_cust_lastname);
        LaborexWorkFlow.SetComponentValue('str_LAST_NAME_AD', str_cust_lastname);
        LaborexWorkFlow.SetComponentValue('lg_AYANTS_DROITS_ID', lg_AYANTS_DROITS_ID);
        LaborexWorkFlow.SetComponentValue('str_NUMERO_SECURITE_SOCIAL_AD', str_cust_num_social);

        /*alert(rec.get('dbl_PLAFOND_RO') + "****" + rec.get('dbl_QUOTA_CONSO_MENSUELLE_RO') + "*****" + rec.get('dbl_PLAFOND_QUOTA_DIFFERENCE_RO'));
         return;*/

        /* commenté le 20 04 2017 pour la gestion du plafond
         *   if (rec.get('dbl_PLAFOND_RO_ID') != 0 && rec.get('dbl_PLAFOND_QUOTA_DIFFERENCE_RO_ID') < 0) {
         Ext.MessageBox.alert('Message d\'erreur', 'Impossible de poursuivre la vente. Le plafond du client est atteint',
         function (btn) {
         Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
         Ext.getCmp('lg_CLIENT_ID').selectText(0, Ext.getCmp('lg_CLIENT_ID').getValue().length);
         Ext.getCmp('dbl_PLAFOND_CONSO_DIFFERENCE').setValue(rec.get('dbl_PLAFOND_QUOTA_DIFFERENCE_RO_ID'));
         Ext.getCmp('dbl_PLAFOND').setValue(rec.get('dbl_PLAFOND_RO_ID'));
         });
         //                                                         
         
         });
         return;
         } else {
         Ext.getCmp('dbl_PLAFOND_CONSO_DIFFERENCE').setValue(0);
         Ext.getCmp('dbl_PLAFOND').setValue(0);
         }*/


        /*20 04 2017 */
        var data = rec.get('COMPTCLTTIERSPAYANT')[0];
        if (data !== undefined && data !== null) {
            LaborexWorkFlow.ClientJSON = data;
            LaborexWorkFlow.ClientData = Object.keys(data).map(function (k) {
                return data[k];
            });
        }
        var _length = LaborexWorkFlow.ClientData.length;
        switch (_length) {
            case (_length === 1):
                Me_displayCust.canContinue();
//         LaborexWorkFlow.DoGetTierePayantRO(rec.get('RO'), rec.get('RO_TAUX'), rec.get('lg_COMPTE_CLIENT_TIERS_PAYANT_RO_ID'), rec.get('dbl_PLAFOND_RO'), rec.get('dbl_QUOTA_CONSO_MENSUELLE_RO'), rec.get('dbl_PLAFOND_QUOTA_DIFFERENCE_RO'));

                break;
            case (_length > 1) :
                Me_displayCust.canContinue2();
                break;
            default:

                break;
        }

        /* 20 04 2017 */
        if (rec.get('TYPECLIENT') === '6') {
            LaborexWorkFlow.displayDiff(rec);
        } else {
            LaborexWorkFlow.DoGetTierePayantRO(rec.get('RO'), rec.get('RO_TAUX'), rec.get('lg_COMPTE_CLIENT_TIERS_PAYANT_RO_ID'), rec.get('dbl_PLAFOND_RO'), rec.get('dbl_QUOTA_CONSO_MENSUELLE_RO'), rec.get('dbl_PLAFOND_QUOTA_DIFFERENCE_RO'));
        }



        /* if (_length > 0) {
         LaborexWorkFlow.venteTierspayant.push({"IDTIERSPAYANT": LaborexWorkFlow.ClientJSON.RO.IDTIERSPAYANT, "TAUX": LaborexWorkFlow.ClientJSON.RO.TAUX, "ID": str_cust_id, "NAME": LaborexWorkFlow.ClientJSON.RO.NAME});
         }*/
        win_add_displayCust.close();

    },
    InitializeDisplayArticle: function () {
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        OCustomer_search_display = Me_displayCust.getOdatasource();
        OCustomer_vente_display = Me_displayCust.getO2ndatasource();
       
        var str_type_client = '';
        if (OCustomer_vente_display === "2") {
            str_type_client = "1";
        } else if (OCustomer_vente_display === "3") {
            str_type_client = "2";
        } else if (OCustomer_vente_display === "1" || OCustomer_vente_display === "AU COMPTANT") {
            str_type_client = "6";
        }
        url_services_data_client_displayCust_final = "../webservices/sm_user/diffclient/ws_customer_data.jsp?search_value=" + OCustomer_search_display + "&lg_TYPE_CLIENT_ID=" + str_type_client;
        /* if (str_type_client !== "6") {
         url_services_data_client_displayCust_final = "../webservices/sm_user/diffclient/ws_customer_data.jsp?search_value=" + OCustomer_search_display + "&lg_TYPE_CLIENT_ID=" + str_type_client;
         
         } else {
         url_services_data_client_displayCust_final = "../webservices/configmanagement/client/ws_data.jsp?search_value=" + OCustomer_search_display;
         }*/


        Oview = this.getParentview();
        Omode = this.getMode();

    },
    ViewLoading: function () {
        // url_services_data_client_displayCust_final = url_services_data_client_displayCust;

        OCustomerDisplaygridpanelID = Ext.getCmp('CustomerDisplaygridpanelID');
        OCust_num_ss = Ext.getCmp('str_NUMERO_SECURITE_SOCIAL');
        OCust_str_prenom = Ext.getCmp('str_FIRST_NAME');
        OCust_str_nom = Ext.getCmp('str_LAST_NAME');
        OCust_phone = Ext.getCmp('TELEPHONECLIENT');
        OFieldProduct = Ext.getCmp('str_NAME');
        OCust_str_id = Ext.getCmp('lg_CLIENT_ID_FIND');
        OCust_compte_id = Ext.getCmp('lg_COMPTE_CLIENT_ID');

    }
    ,
    canContinue: function () {
        var data = LaborexWorkFlow.ClientJSON.RO;


        if (!data.bCANBEUSE) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 400,
                msg: data.message,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
                        });
                    }
                }
            });
            return;
        } else if (!data.bCANBEUSETP) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 400,
                msg: data.messageTP,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
                        });
                    }
                }
            });
            return;
        }


    },
    canContinue2: function () {
        var data = LaborexWorkFlow.ClientJSON.RO;
        if (!data.bCANBEUSE) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 400,
                msg: data.message,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
                        });
                    }
                }
            });

            //return ;


        } else if (!data.bCANBEUSETP) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 400,
                msg: data.messageTP,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
                        });
                    }
                }
            });
            // return;
        }


    }
});