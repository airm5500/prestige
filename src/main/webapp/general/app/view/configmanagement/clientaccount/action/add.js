var url_services_data_clientaccount = '../webservices/configmanagement/compteclient/ws_data.jsp';
var url_services_transaction_clientaccount = '../webservices/configmanagement/compteclient/ws_transaction.jsp?mode=';


var Ref_clt;

Ext.define('testextjs.view.configmanagement.clientaccount.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addclientaccount',
    id: 'addclientaccountID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;

        Ref_clt = ref;
        alert("Ref_clt  " + Ref_clt);

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Infos.Compte.Client',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            name: 'dbl_CAUTION',
                            id: 'dbl_CAUTION',
                            fieldLabel: 'Caution',
                            flex: 1,
                            emptyText: 'Caution',
                            maskRe: /[0-9.]/,
                            listeners: {
                                change: function() {
                                    var int_solde = Ext.getCmp('dbl_CAUTION').getValue();
                                    Ext.getCmp('dbl_SOLDE').setValue(int_solde + ' CFA');
                                }

                            }
                        }, {
                            name: 'dbl_QUOTA_CONSO_MENSUELLE',
                            id: 'dbl_QUOTA_CONSO_MENSUELLE',
                            fieldLabel: 'Quota.Conso',
                            flex: 1,
                            emptyText: 'Quota Conso',
                            maskRe: /[0-9.]/
                        }]
                }]
        });
        OmyGridClt = Ext.getCmp('adddoventeID');
//Initialisation des valeur 


        if (Omode === "updatecarnet") {

            ref = this.getOdatasource().lg_CUSTOMER_ACCOUNT_ID;

            Ext.getCmp('dbl_CAUTION').setValue(this.getOdatasource().dbl_CAUTION);
            Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').setValue(this.getOdatasource().dbl_QUOTA_CONSO_MENSUELLE);

        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 300,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function() {
                        win.close();
                    }
                }]
        });
    },
    onbtnsave: function() {

        var internal_url = "";

        if (Omode === "createcarnet") {
            internal_url = url_services_transaction_clientaccount + 'create';
        } else {
            internal_url = url_services_transaction_clientaccount + 'update&lg_CUSTOMER_ACCOUNT_ID=' + ref;
        }



        Ext.Ajax.request({
        url: internal_url,
                params: {
                dbl_CAUTION: Ext.getCmp('dbl_CAUTION').getValue(),
                        dbl_QUOTA_CONSO_MENSUELLE: Me.onsplitovalue(Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').getValue()),
                        lg_CLIENT_ID:Ref_clt
                },
                success: function(response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success === 0) {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    }
                    Oview.getStore().reload();
                }
        ,
                failure: function(response)
                {

                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                    }
        }
        );
                this.up('window').close();
    }

    ,
    onsplitovalue: function(Ovalue) {
        var int_ovalue;
        var string = Ovalue.split(" ");
        int_ovalue = string[0];
        return int_ovalue;
    }
});