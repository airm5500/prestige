var url_services_data_role = '../webservices/sm_user/role/ws_data.jsp';
var url_services_data_skin = '../webservices/sm_user/skin/ws_data.jsp';
var url_services_data_language = '../webservices/sm_user/language/ws_data.jsp';
var url_services_data_utilisateur = '../webservices/sm_user/utilisateur/ws_data.jsp';
var url_services_transaction_utilisateur = '../webservices/sm_user/utilisateur/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;

var OmyuserGrid;


Ext.define('testextjs.view.sm_user.user.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'adduser',
    id: 'adduserID',
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
        var store = new Ext.data.Store({
            model: 'testextjs.model.Role',
            proxy: {
                type: 'ajax',
                url: url_services_data_role
            }
        });
        var storeskin = new Ext.data.Store({
            model: 'testextjs.model.Skin',
            proxy: {
                type: 'ajax',
                url: url_services_data_skin
            }
        });
        var storelanguage = new Ext.data.Store({
            model: 'testextjs.model.Language',
            proxy: {
                type: 'ajax',
                url: url_services_data_language
            }
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
                    title: 'Information Utilisateur',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        //str_IDS
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Indice de Securite',
                            name: 'str_IDS',
                            id: 'str_IDS',
                            store: ['1', '2','3', '4','5', '6','7', '8','9'],
                            valueField: 'str_IDS',
                            displayField: 'str_IDS',
                            typeAhead: true,
                            queryMode: 'local',
                            emptyText: 'Choisir un indice...'
                        },
                        {
                            fieldLabel: 'Nom',
                            emptyText: 'Nom',
                            name: 'str_FIRST_NAME',
                            id: 'str_FIRST_NAME'
                        }, {
                            fieldLabel: 'Prenom',
                            emptyText: 'Prenom',
                            name: 'str_LAST_NAME',
                            id: 'str_LAST_NAME'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Language',
                            name: 'lg_Language_ID',
                            id: 'lg_Language_ID',
                            store: storelanguage,
                            valueField: 'lg_Language_ID',
                            displayField: 'str_Description',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un langage...'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Role',
                            name: 'lg_ROLE_ID',
                            id: 'lg_ROLE_ID',
                            store: store,
                            valueField: 'lg_ROLE_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un role...'
                        },
                        {
                            fieldLabel: 'Login',
                            emptyText: 'LOGIN',
                            name: 'str_LOGIN',
                            id: 'str_LOGIN'
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Mot de passe',
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

            Ext.getCmp('str_FIRST_NAME').setValue(this.getOdatasource().str_FIRST_NAME);
            Ext.getCmp('str_LAST_NAME').setValue(this.getOdatasource().str_LAST_NAME);
            Ext.getCmp('str_LOGIN').setValue(this.getOdatasource().str_LOGIN);
            Ext.getCmp('lg_Language_ID').setValue(this.getOdatasource().lg_Language_ID);
            Ext.getCmp('lg_ROLE_ID').setValue(this.getOdatasource().lg_ROLE_ID);
            Ext.getCmp('str_IDS').setValue(this.getOdatasource().str_IDS);
            
            Ext.getCmp('str_PASSWORDnew').hide();
            Ext.getCmp('str_PASSWORDn').hide();
            

        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 400,
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

        if (Ext.getCmp('str_PASSWORDnew').getValue() === Ext.getCmp('str_PASSWORDn').getValue()) {

            var internal_url = "";


            if (Omode === "create") {
                internal_url = url_services_transaction_utilisateur + 'create';

            } else {
                internal_url = url_services_transaction_utilisateur + 'update&lg_USER_ID=' + ref;
            }

            Ext.Ajax.request({
                url: internal_url,
                params: {
                    lg_ROLE_ID: Ext.getCmp('lg_ROLE_ID').getValue(),
                    str_FIRST_NAME: Ext.getCmp('str_FIRST_NAME').getValue(),
                    str_LAST_NAME: Ext.getCmp('str_LAST_NAME').getValue(),
                    str_LOGIN: Ext.getCmp('str_LOGIN').getValue(),
                    lg_Language_ID: Ext.getCmp('lg_Language_ID').getValue(),
                    str_PASSWORD : Ext.getCmp('str_PASSWORDn').getValue(),
                    // str_IDS
                    str_IDS : Ext.getCmp('str_IDS').getValue()
                  
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
        else {
            Ext.MessageBox.alert('erreur', 'mot de passe differents');

        }

    }
});