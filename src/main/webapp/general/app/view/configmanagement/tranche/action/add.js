var url_services_data_tranche = '../webservices/configmanagement/tranche/ws_data.jsp';
var url_services_transaction_tranche = '../webservices/configmanagement/tranche/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.tranche.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addtranche',
    id: 'addtrancheID',
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

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 140,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Information Medecin',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        // int_MONTANT_MIN
                        {
                            fieldLabel: 'Min Montant',
                            emptyText: 'Min Montant',
                            name: 'int_MONTANT_MIN',
                            id: 'int_MONTANT_MIN',
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        },
                        // int_MONTANT_MAX
                        {
                            fieldLabel: 'Max Montant',
                            emptyText: 'Max Montant',
                            name: 'int_MONTANT_MAX',
                            id: 'int_MONTANT_MAX',
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        },
                        // dbl_POURCENTAGE_TRANCHE
                        {
                            fieldLabel: 'Pourcentage',
                            emptyText: 'Pourcentage',
                            name: 'dbl_POURCENTAGE_TRANCHE',
                            id: 'dbl_POURCENTAGE_TRANCHE',
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        }

                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_TRANCHE_ID;

            Ext.getCmp('int_MONTANT_MIN').setValue(this.getOdatasource().int_MONTANT_MIN);
            Ext.getCmp('int_MONTANT_MAX').setValue(this.getOdatasource().int_MONTANT_MAX);
            Ext.getCmp('dbl_POURCENTAGE_TRANCHE').setValue(this.getOdatasource().dbl_POURCENTAGE_TRANCHE);
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


        //  alert(Ext.getCmp('int_MONTANT_MAX').getValue());

        var internal_url = "";


        if (Omode === "create") {
            //alert("create");
            internal_url = url_services_transaction_tranche + 'create';

        } else {
            //alert("update");
            internal_url = url_services_transaction_tranche + 'update&lg_TRANCHE_ID=' + ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                int_MONTANT_MIN: Ext.getCmp('int_MONTANT_MIN').getValue(),
                int_MONTANT_MAX: Ext.getCmp('int_MONTANT_MAX').getValue(),
                dbl_POURCENTAGE_TRANCHE: Ext.getCmp('dbl_POURCENTAGE_TRANCHE').getValue()
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
                Oview.getStore().reload();
            },
            failure: function(response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                //  alert(object);

                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

        this.up('window').close();
    }
});


