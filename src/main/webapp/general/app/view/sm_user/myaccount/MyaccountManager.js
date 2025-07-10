/* global Ext */

var OTUser;


var lg_ROLE_ID_REF = 0;

var Me;


Ext.define('testextjs.view.sm_user.myaccount.MyaccountManager', {
    extend: 'Ext.form.Panel',
    xtype: 'myaccountmanager',
    id: 'myaccountmanagerID',
    frame: true,
    title: 'Mon compte',
    closable: true,
    bodyPadding: 10,
    autoScroll: true,
    width: 500,
    fieldDefaults: {
        labelAlign: 'left',
        labelWidth: 115,
        msgTarget: 'side'
    },
    initComponent: function () {

        Me = this;

        const str_FIRST_NAME = new Ext.form.field.Text(
                {
                    xtype: 'textfield',
                    allowBlank: false,
                    fieldLabel: 'Nom',
                    id: 'str_first_name',
                    name: 'str_FIRST_NAME',
                    emptyText: 'Nom'
                });

        const str_LAST_NAME = new Ext.form.field.Text(
                {
                    xtype: 'textfield',
                    allowBlank: false,
                    fieldLabel: 'Prenom',
                    id: 'str_last_name',
                    name: 'str_LAST_NAME',
                    emptyText: 'Prenom'
                });

        const str_STATUT = new Ext.form.field.Hidden(
                {
                    xtype: 'hiddenfield',
                    allowBlank: false,
                    fieldLabel: 'str_STATUT',
                    name: 'str_STATUT',
                    id: 'str_STATUT',
                    emptyText: 'str_STATUT'
                });

        const lg_ROLE_ID = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Role',
                    name: 'lg_ROLE_ID',
                    id: 'lg_ROLE_ID'
                            //emptyText: 'lg_ROLE_ID'
                });


        const str_LOGIN = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Login',
                    name: 'str_LOGIN',
                    id: 'str_LOGIN'
                });

        const str_LAST_CONNECTION_DATE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Derniere.Con',
                    name: 'str_LAST_CONNECTION_DATE',
                    id: 'str_LAST_CONNECTION_DATE'
                            //emptyText: 'str_LAST_CONNECTION_DATE'
                });

        const str_PASSWORD = new Ext.form.field.Text(
                {
                    xtype: 'textfield',
                    allowBlank: false,
                    fieldLabel: 'Mot de passe',
                    name: 'str_PASSWORD',
                    id: 'str_password',
                    emptyText: 'Mot de passe',
                    inputType: 'password'
                });

        const str_PASSWORD_CONF = new Ext.form.field.Text(
                {
                    xtype: 'textfield',
                    allowBlank: false,
                    fieldLabel: 'Confirm.Mot.Passe',
                    name: 'str_PASSWORD_CONF',
                    id: 'str_password_conf',
                    emptyText: 'Confirmation mot de passse',
                    inputType: 'password'
                });

        const lg_USER_ID = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Ref.Utilisateur',
                    name: 'lg_USER_ID',
                    id: 'lg_user_id',
                    emptyText: 'lg_USER_ID'
                });


        this.fetchAccount(str_FIRST_NAME,
                str_LAST_NAME,
                str_LOGIN, lg_ROLE_ID,
                str_PASSWORD,
                str_PASSWORD_CONF,
                str_LAST_CONNECTION_DATE,
                lg_USER_ID,
                str_STATUT);

        this.items = [{
                xtype: 'fieldset',
                title: 'Infos.Utilisateur',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [
                    str_FIRST_NAME,
                    str_LAST_NAME,
                    str_LOGIN

                ]
            },
            {
                xtype: 'fieldset',
                title: 'Detail.Infos.Utilisateur',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [
                    lg_ROLE_ID,
                    str_PASSWORD,
                    str_PASSWORD_CONF,
                    str_LAST_CONNECTION_DATE,
                    lg_USER_ID,
                    str_STATUT
                ]
            }];

        this.callParent();
    },
    buttons: [
        {
            text: 'Enregistrer',
            id: 'btn_savemyaccountID',
            name: 'btn_savemyaccount',
            /*disabled: true,
             formBind: true,*/
            handler: function () {
                Me.onbtnsave();
            }

        }],
    onbtnsave: function () {

        let pass1 = Ext.getCmp('str_password').getValue();
        let pass2 = Ext.getCmp('str_password_conf').getValue();
        let str_FIRST_NAME = Ext.getCmp('str_first_name').getValue();
        let str_LAST_NAME = Ext.getCmp('str_last_name').getValue();
        let lg_USER_ID = Ext.getCmp('lg_user_id').getValue();
        let message = "";
      
        if (pass1 !== null && pass1 !== "") {
            const nbCaractere = pass1.length;
            if (pass1 === pass2 && (nbCaractere > 8 || nbCaractere === 8)) {
                Ext.Ajax.request({
                    method: 'POST',
                    url: '../api/v1/user/account',
                    headers: {'Content-Type': 'application/json'},
                    params: Ext.JSON.encode({
                        strLASTNAME: str_LAST_NAME,
                        strFIRSTNAME: str_FIRST_NAME,
                        strPASSWORD: pass1,
                        lgUSERID: lg_USER_ID
                    }),
                    success: function (response) {
                
                        testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");

                    },
                    failure: function (response) {

                        /// const object = Ext.JSON.decode(response.responseText, false);
                        console.log("Bug " + response.responseText);

                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: response.responseText,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR
                        });

                    }
                });
            } else {
                if (pass1 < 8) {
                    message = "Le mot de passe doit avoir au minimum 8 caracteres";
                }

                if (pass1 !== pass2) {
                    message = "Mot de passe differents";
                }
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 320,
                    msg: message,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
            }
        } else {
            Ext.Ajax.request({
                method: 'POST',
                url: '../api/v1/user/account',
                headers: {'Content-Type': 'application/json'},
                params: Ext.JSON.encode({
                    strLASTNAME: str_LAST_NAME,
                    strFIRSTNAME: str_FIRST_NAME,
                    lgUSERID: lg_USER_ID
                }),
                success: function (response) {
                    testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");

                },
                failure: function (response) {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: response.responseText,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR
                    });


                }
            });
        }
    },

    fetchAccount: function (str_FIRST_NAME,
            str_LAST_NAME,
            str_LOGIN, lg_ROLE_ID,
            str_PASSWORD,
            str_PASSWORD_CONF,
            str_LAST_CONNECTION_DATE,
            lg_USER_ID,
            str_STATUT) {
        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/user/account',
            success: function (response) {
                const data = Ext.JSON.decode(response.responseText, true);
                const accountInfo = data.accountInfo;
                str_LOGIN.setValue(accountInfo.str_LOGIN);
                lg_USER_ID.setValue(accountInfo.lg_USER_ID);
                str_FIRST_NAME.setValue(accountInfo.str_FIRST_NAME);
                str_LAST_NAME.setValue(accountInfo.str_LAST_NAME);
                str_LAST_CONNECTION_DATE.setValue(accountInfo.str_LAST_CONNECTION_DATE);
                str_STATUT.setValue(accountInfo.str_STATUT);
                lg_ROLE_ID.setValue(accountInfo.lg_ROLE_ID);
                lg_ROLE_ID_REF = lg_ROLE_ID.getValue();
            },
            failure: function (response) {
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    }
});
