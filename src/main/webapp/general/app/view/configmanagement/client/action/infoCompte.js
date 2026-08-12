var url_services_transaction_client = '../webservices/configmanagement/client/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;


//var dbl_SOLDE;


Ext.define('testextjs.view.configmanagement.client.action.infoCompte', {
    extend: 'Ext.window.Window',
    xtype: 'infoCompte',
    id: 'infoCompteID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.TypeClient'

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
        var itemsPerPage = 20;
        

       





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
                    id: 'InfosCpteCltID',
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
                                    //Ext.getCmp('dbl_SOLDE').setValue(int_solde + ' CFA');
                                    //Ext.getCmp('dbl_SOLDE').setValue(int_solde);
                                }

                            }
                        }, {
                            name: 'dbl_QUOTA_CONSO_MENSUELLE',
                            id: 'dbl_QUOTA_CONSO_MENSUELLE',
                            fieldLabel: 'Quota.Conso',
                            flex: 1,
                            emptyText: 'Quota Conso',
                            maskRe: /[0-9.]/
                        }, {
                            name: 'dbl_SOLDE',
                            id: 'dbl_SOLDE',
                            fieldLabel: 'Solde',
                            flex: 1,
                            emptyText: 'Solde',
                            maskRe: /[0-9.]/
                        }]
                }]
        });



        //Initialisation des valeur 


        if (Omode == "updateInfoCompte") {

            ref = this.getOdatasource().lg_COMPTE_CLIENT_ID;
          //  alert("ref "+ref + "    ----- "+this.getOdatasource().dbl_SOLDE + "   ***** "+this.getOdatasource().dbl_CAUTION+ " //////// "+ this.getOdatasource().dbl_QUOTA_CONSO_MENSUELLE);
            Ext.getCmp('dbl_SOLDE').setValue(this.getOdatasource().dbl_SOLDE);
            
            Ext.getCmp('dbl_CAUTION').setValue(this.getOdatasource().dbl_CAUTION);
            Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').setValue(this.getOdatasource().dbl_QUOTA_CONSO_MENSUELLE);

            //alert("dbl_SOLDE "+this.getOdatasource().dbl_SOLDE+" dbl_CAUTION "+this.getOdatasource().dbl_CAUTION+" dbl_QUOTA_CONSO_MENSUELLE "+this.getOdatasource().dbl_QUOTA_CONSO_MENSUELLE);
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 250,
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

        var internal_url = url_services_transaction_client + 'updateInfoCompte&lg_COMPTE_CLIENT_ID=' + ref;
        //alert("internal_url "+internal_url);

       Ext.Ajax.request({
            url: internal_url,
            params: {
                dbl_SOLDE: Me.onsplitovalue(Ext.getCmp('dbl_SOLDE').getValue()),
                dbl_QUOTA_CONSO_MENSUELLE: Me.onsplitovalue(Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').getValue()),
                dbl_CAUTION: Ext.getCmp('dbl_CAUTION').getValue()


            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
               // alert(object.success);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                }
                Oview.getStore().reload();

            },
            failure: function(response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

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