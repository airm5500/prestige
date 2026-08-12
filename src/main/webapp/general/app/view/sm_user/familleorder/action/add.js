var url_services_transaction_familleorder = '../webservices/sm_user/familleorder/ws_transaction.jsp?mode=';



var int_MY_NUMBER;
var ref;
var int_NUMBER_DISPLAY;


Ext.define('testextjs.view.sm_user.familleorder.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addfamilleorder',
    id: 'addfamilleorderID',
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


        int_MY_NUMBER = 0;


        int_NUMBER_DISPLAY = this.getOdatasource().int_NUMBER;
        ref = this.getOdatasource().lg_FAMILLE_ID;
      
        int_MY_NUMBER = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Qte.Proposee :',
                    name: 'int_NUMBER_DISPLAY',
                    id: 'int_NUMBER_DISPLAY',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: int_NUMBER_DISPLAY

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
                    //   width: 55,
                    title: 'Information Produit',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        int_MY_NUMBER,
                        {
                            xtype: 'numberfield',
                            regex: /[0-9.]/,
                            fieldLabel: 'Qte.A.Cder',
                            name: 'int_NUMBER',
                            allowBlank: false,
                            id: 'int_NUMBER'
                        }
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode == "create") {

            ref = this.getOdatasource().lg_FAMILLE_ID;

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

        internal_url = url_services_transaction_familleorder + 'create&lg_FAMILLE_ID=' + ref;


        Ext.Ajax.request({
            url: internal_url,
            params: {
                int_NUMBER: Ext.getCmp('int_NUMBER').getValue()


            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success ===0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
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








});