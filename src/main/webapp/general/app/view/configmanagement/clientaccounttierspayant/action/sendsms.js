var url_services_transaction_clientsms= '../webservices/sm_user/client/ws_transaction.jsp?mode=';

var  Oview;
var Omode;
var Me;
var ref;



Ext.define('testextjs.view.sm_user.client.action.sendsms', {
    extend: 'Ext.window.Window',
    xtype: 'addsms',
    id: 'addsmsID',
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
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                xtype: 'fieldset',
                //   width: 55,
                title: 'Information Sms',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [
                {
                    xtype: 'textareafield',
                    grow: true,
                    name: 'MESSAGE',
                    fieldLabel: 'Message',
                    id: 'MESSAGE',
                    anchor: '100%',
                    //fieldLabel: 'Nom',
                    emptyText: 'Saisiser votre Sms ( 160  caracter pour un sms)'
                // name: 'MESSAGE',
                // id:'MESSAGE'
                }
                ]
            }]
        });



        //Initialisation des valeur


        if (Omode == "envoimsg") {

            ref = this.getOdatasource().lg_CUSTOMER_ID;

            Ext.getCmp('MESSAGE').setValue(this.getOdatasource().MESSAGE);



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
                text: 'Envoyer',
                handler: this.onbtnsave
            }, {
                text: 'Annuler',
                handler: function() {
                    win.close()
                }
            }]
        });

    },
    onbtnsave: function() {
        var internal_url = "";
        if (Omode == "envoimsg") {
            internal_url = url_services_transaction_clientsms + 'envoimsg&lg_CUSTOMER_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                MESSAGE: Ext.getCmp('MESSAGE').getValue()
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
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
        this.up('window').close();

    }
});


