
var url_services_data_utilisateur = '../webservices/sm_user/utilisateur/ws_data.jsp';
var url_services_transaction_utilisateur = '../webservices/sm_user/utilisateur/ws_transaction.jsp?mode=';
var url_services_rest_utilisateur = '../api/v1/utilisateurs/'; // update-password en REST
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.sm_user.user.action.addpwd', {
    extend: 'Ext.window.Window',
    xtype: 'adduserpwd',
    id: 'adduserpwdID',
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
                    title: 'Information Utilisateur',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Nouveau mot de passe',
                            name: 'str_PASSWORD',
                            allowBlank: false,
                            id: 'str_PASSWORDnew',
                            inputType: 'password'
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Confirmer',
                            name: 'str_PASSWORD',
                            allowBlank: false,
                            id: 'str_PASSWORDn',
                            inputType: 'password'
                        }
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_USER_ID;

            //  Ext.getCmp('str_PASSWORDn').setValue(this.getOdatasource().str_PASSWORD);

        }



        var win = new Ext.window.Window({
            modal: true,
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
    onbtnsave: function(button) {

        var pass1 = Ext.getCmp('str_PASSWORDnew').getValue();
        var pass2 = Ext.getCmp('str_PASSWORDn').getValue();
        var nbCaractere = pass1.length;

        if (pass1 === pass2 && (nbCaractere >= 8)) {
            var internal_url = "";

            internal_url = url_services_rest_utilisateur + 'update-password';

            Ext.Ajax.request({
                url: internal_url,
                method: 'POST',
                params: {
                    lg_USER_ID: ref,
                    str_PASSWORD: Ext.getCmp('str_PASSWORDn').getValue()
                },
                success: function(response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        Ext.MessageBox.alert('Confirmation', object.errors);
                        // Oview.getStore().reload();
                        // La fenetre est deja fermee juste apres l'envoi (this.up('window').close()) :
                        // le bouton est alors detruit et button.up('window') renvoie undefined.
                        var bouton = button.up('window');
                        if (bouton) {
                            bouton.close();
                        }
                        testextjs.app.getController('App').onLoadNewComponent("usermanager", "Utilisateur", "");
                    }

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
        else {

            if (pass1 === pass2) {
                Ext.MessageBox.alert('ERREUR', 'mot de passe minimum 8 caracteres');
            }
            else {
                Ext.MessageBox.alert('ERREUR', 'mot de passe differents');
            }

            Ext.getCmp('str_PASSWORDnew').setValue("");
            Ext.getCmp('str_PASSWORDn').setValue("");
        }

    }

});