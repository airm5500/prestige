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
            }, this.sectionPinBadge()];

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

    /*
     * Plan du 08/11, point 14 : code PIN a 4 chiffres demande apres le badge (si le parametre KEY_CONNEXION_BADGE_PIN
     * le demande). Le mot de passe actuel est exige ; la confirmation se fait dans le bouton (deux clics), le resultat
     * s'affiche sous le bouton, sans fenetre.
     */
    sectionPinBadge: function () {
        const me = this;
        const champ = (itemId, libelle) => ({
            xtype: 'textfield', itemId: itemId, fieldLabel: libelle, inputType: 'password', submitValue: false,
            labelWidth: 170, anchor: '100%', enforceMaxLength: true, maxLength: itemId === 'pinMotDePasse' ? 200 : 4,
            listeners: {
                afterrender: (c) => {
                    if (itemId !== 'pinMotDePasse') {
                        c.inputEl.set({inputmode: 'numeric', autocomplete: 'off'});
                    } else {
                        c.inputEl.set({autocomplete: 'current-password'});
                    }
                },
                change: () => me.remettreBoutonPin()
            }
        });
        return {
            xtype: 'fieldset', itemId: 'sectionPinBadge', title: 'Code PIN du badge',
            defaults: {anchor: '100%'},
            items: [
                {xtype: 'component', itemId: 'pinEtat', html: 'Lecture…', margin: '0 0 8 0'},
                champ('pinMotDePasse', 'Mot de passe actuel'),
                champ('pinCode', 'Nouveau code PIN (4 chiffres)'),
                champ('pinConfirme', 'Confirmer le code PIN'),
                {
                    xtype: 'container', layout: {type: 'hbox', align: 'middle'}, items: [
                        {xtype: 'button', itemId: 'pinEnregistrer', text: 'Enregistrer le code PIN', minWidth: 190,
                            handler: () => me.enregistrerPin()},
                        {xtype: 'component', itemId: 'pinResultat', flex: 1, margin: '0 0 0 12', html: ''}
                    ]
                }
            ],
            listeners: {afterrender: () => me.lirePin()}
        };
    },

    lirePin: function () {
        const me = this, etat = me.down('#pinEtat');
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/user/badge-pin',
            success: (r) => {
                const d = Ext.JSON.decode(r.responseText, true) || {};
                const lignes = [
                    'Code PIN : <b>' + (d.defini ? 'défini le ' + Ext.String.htmlEncode(d.date) : 'non défini') + '</b>',
                    'Demandé après le badge à la connexion : <b>' + (d.demande ? 'oui' : 'non') + '</b>'
                            + (d.demande ? '' : ' (le badge seul suffit ; paramètre KEY_CONNEXION_BADGE_PIN)')
                ];
                if (d.demande && !d.defini) {
                    lignes.push('<span style="color:#c0392b">Sans code, votre badge ne permet pas de vous connecter.</span>');
                }
                if (!d.badge) {
                    lignes.push('<span style="color:#6b7785">Vous n\'avez pas de badge actif.</span>');
                }
                if (etat && !etat.isDestroyed) {
                    etat.update('<div class="pin-etat" data-defini="' + (d.defini ? 1 : 0) + '" data-demande="' + (d.demande ? 1 : 0)
                            + '" style="line-height:1.7">' + lignes.join('<br>') + '</div>');
                }
            },
            failure: () => etat && !etat.isDestroyed && etat.update('<span style="color:#c0392b">État du code PIN illisible.</span>')
        });
    },

    remettreBoutonPin: function () {
        const b = this.down('#pinEnregistrer');
        if (b && b.confirmer) {
            b.confirmer = false;
            PrestigeConfirmation.desarmer(b);
            b.setText('Enregistrer le code PIN');
        }
    },

    resultatPin: function (ok, texte) {
        const r = this.down('#pinResultat');
        r.update('<span class="pin-resultat" data-ok="' + (ok ? 1 : 0) + '" style="font-weight:600;color:' + (ok ? '#17987e' : '#c0392b') + '">'
                + Ext.String.htmlEncode(texte) + '</span>');
    },

    enregistrerPin: function () {
        const me = this, b = me.down('#pinEnregistrer');
        const mdp = me.down('#pinMotDePasse').getValue(), pin = me.down('#pinCode').getValue(), conf = me.down('#pinConfirme').getValue();
        if (!mdp) {
            me.remettreBoutonPin();
            return me.resultatPin(false, 'Tapez votre mot de passe actuel.');
        }
        if (!/^[0-9]{4}$/.test(pin || '')) {
            me.remettreBoutonPin();
            return me.resultatPin(false, 'Le code PIN doit compter exactement 4 chiffres.');
        }
        if (pin !== conf) {
            me.remettreBoutonPin();
            return me.resultatPin(false, 'Les deux codes PIN sont différents.');
        }
        /* confirmation dans le bouton : premier clic « Confirmer ? », second clic enregistre */
        if (!b.confirmer) {
            b.confirmer = true;
            b.setText('Confirmer le nouveau code ?');
            PrestigeConfirmation.armer(b);
            me.resultatPin(true, '');
            return;
        }
        b.confirmer = false;
        PrestigeConfirmation.desarmer(b);
        b.disable();
        Ext.Ajax.request({
            method: 'POST', url: '../api/v1/user/badge-pin', headers: {'Content-Type': 'application/json'},
            params: Ext.JSON.encode({motDePasse: mdp, pin: pin}),
            success: (r) => {
                const d = Ext.JSON.decode(r.responseText, true) || {};
                b.enable();
                b.setText('Enregistrer le code PIN');
                me.resultatPin(!!d.success, d.message || 'Réponse illisible.');
                me.down('#pinMotDePasse').setRawValue('');
                if (d.success) {
                    me.down('#pinCode').setRawValue('');
                    me.down('#pinConfirme').setRawValue('');
                    me.lirePin();
                }
            },
            failure: () => {
                b.enable();
                b.setText('Enregistrer le code PIN');
                me.resultatPin(false, 'Enregistrement impossible : le serveur ne répond pas.');
            }
        });
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
