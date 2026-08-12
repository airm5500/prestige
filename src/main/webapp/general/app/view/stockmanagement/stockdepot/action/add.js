var url_services_transaction_reserve = '../webservices/stockmanagement/reserve/ws_transaction.jsp?mode=';


var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.stockmanagement.stockdepot.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'adddepot',
    id: 'adddepotID',
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
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;

        str_DESCRIPTION = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Designation:',
                    name: 'str_DESCRIPTION',
                    id: 'str_DESCRIPTION',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        int_NUMBER = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Quantite stock:',
                    name: 'int_NUMBER',
                    id: 'int_NUMBER',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information destockage stock',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        str_DESCRIPTION,
                        int_NUMBER,
                        {
                            fieldLabel: 'Quantite destockage',
                            emptyText: 'Quantite destockage',
                            name: 'int_NUMBER_REASSORT',
                            id: 'int_NUMBER_REASSORT',
                            maxValue: Ext.getCmp('int_NUMBER').getValue(),
                            minValue: 0,
                            xtype: 'numberfield'
                        }
                    ]
                }
            ]
        });



        //Initialisation des valeur 


        if (Omode === "destockage") {
            ref = this.getOdatasource().lg_FAMILLE_ID;
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('int_NUMBER').setValue(this.getOdatasource().int_NUMBER);
            Ext.getCmp('int_NUMBER_REASSORT').setValue(this.getOdatasource().int_NUMBER);
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
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function () {

        var internal_url = "";

        if (Omode === "destockage") {
            internal_url = url_services_transaction_reserve + 'destockage';
        } 

        Ext.Ajax.request({
            url: internal_url,
            params: {
                lg_FAMILLE_ID: ref,
                int_NUMBER: Ext.getCmp('int_NUMBER_REASSORT').getValue()
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                // alert(object.success);
                if (object.success == 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    Oview.getStore().reload();
                }


            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

        this.up('window').close();
    }
});
