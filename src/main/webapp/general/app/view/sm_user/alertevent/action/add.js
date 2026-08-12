var url_services_data_role = '../webservices/sm_user/role/ws_data.jsp';
var url_services_data_skin = '../webservices/sm_user/skin/ws_data.jsp';
var url_services_data_language = '../webservices/sm_user/language/ws_data.jsp';
var url_services_data_alertevent = '../webservices/sm_user/alertevent/ws_data.jsp';
var url_services_transaction_alertevent = '../webservices/sm_user/alertevent/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;

var OmyuserGrid;


Ext.define('testextjs.view.sm_user.alertevent.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addalertevent',
    id: 'alerteventID',
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
                    title: 'Information Utilisateur',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        //str_IDS
                        {
                            xtype: 'textareafield',
                            grow: true,
                            name: 'str_SMS_French_Text',
                            fieldLabel: 'Sms fr',
                            id: 'str_SMS_French_Text',
                            anchor: '100%',
                            emptyText: 'Saisiser votre Sms ( 160  caracter pour un sms)'

                        },
                        {
                            xtype: 'textareafield',
                            grow: true,
                            name: 'str_MAIL_French_Text',
                            fieldLabel: 'Mail fr',
                            id: 'str_MAIL_French_Text',
                            anchor: '100%',
                            emptyText: 'Saisiser votre Mail'

                        }, {
                            xtype: 'displayfield',
                            //allowBlank: false,
                            fieldLabel: 'Role',
                            name: 'str_INFOS',
                            id: 'str_INFOS'
                                    //emptyText: 'lg_ROLE_ID'
                        }


                    ]
                }]
        });



        //Initialisation des valeur
        if (Omode === "update") {

            ref = this.getOdatasource().str_Event;

            Ext.getCmp('str_SMS_French_Text').setValue(this.getOdatasource().str_SMS_French_Text);
            Ext.getCmp('str_MAIL_French_Text').setValue(this.getOdatasource().str_MAIL_French_Text);
            Ext.getCmp('str_INFOS').setValue("NB ne pas suppimer les param [X_VALUE]");



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


        if (Omode === "create") {
            internal_url = url_services_transaction_alertevent + 'create';
        } else {
            internal_url = url_services_transaction_alertevent + 'update&str_Event=' + ref;
        }

 

//alert(internal_url);
        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_SMS_French_Text: Ext.getCmp('str_SMS_French_Text').getValue(),
                str_MAIL_French_Text: Ext.getCmp('str_MAIL_French_Text').getValue()
                

            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);

                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
                Oview.getStore().reload();

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