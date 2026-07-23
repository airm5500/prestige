/* global Ext */

var url_services_data_role = '../webservices/sm_user/role/ws_data.jsp';
var url_services_data_skin = '../webservices/sm_user/skin/ws_data.jsp';
var url_services_data_language = '../webservices/sm_user/language/ws_data.jsp';
var url_services_data_utilisateur = '../webservices/sm_user/utilisateur/ws_data.jsp';
var url_services_transaction_utilisateur = '../webservices/sm_user/utilisateur/ws_transaction.jsp?mode=';
var url_services_data_emplacement = '../webservices/configmanagement/emplacement/ws_data.jsp';
var url_services_rest_utilisateur = '../api/v1/utilisateurs/'; // create / update en REST
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
    initComponent: function() {

        Oview = this.getParentview();


        Omode = this.getMode();


        // alert("Ok");
        Me = this;
        /*var store = new Ext.data.Store({
         model: 'testextjs.model.Role',
         proxy: {
         type: 'ajax',
         url: url_services_data_role
         }
         });*/

        var store = new Ext.data.Store({
            model: 'testextjs.model.Role',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_role,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
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

//        var store_localite = new Ext.data.Store({
//            fields: ['str_LIEU_TRAVAIL'],
//            data: [{str_LIEU_TRAVAIL: 'OFFICINE'}, {str_LIEU_TRAVAIL: 'DEPOT'}]
//        });

        var store_localite = new Ext.data.Store({
            model: 'testextjs.model.Emplacement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_emplacement + "?lg_TYPEDEPOT_ID=2",
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
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
                            store: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
                            valueField: 'str_IDS',
                            displayField: 'str_IDS',
//                            typeAhead: true,
                            queryMode: 'local',
                            editable: false, //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                            emptyText: 'Choisir un indice...',
                            listeners: {
                                change: function() {
                                    Me.checkisValid();
                                }
                            }
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
                        }, {
                            xtype: 'combobox',
                            fieldLabel: 'Lieu de travail',
                            name: 'str_LIEU_TRAVAIL',
                            id: 'str_LIEU_TRAVAIL',
                            store: store_localite,
                            valueField: 'lg_EMPLACEMENT_ID',
                            displayField: 'str_NAME',
//                            typeAhead: true,
                            editable: false,
                            queryMode: 'remote',
                            emptyText: 'Choisir un lieu de travail...'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Language',
                            name: 'lg_Language_ID',
                            id: 'lg_Language_ID',
                            store: storelanguage,
                            valueField: 'lg_Language_ID',
                            displayField: 'str_Description',
//                            typeAhead: true,
                            editable: false,
                            queryMode: 'remote',
                            emptyText: 'Choisir un langage...'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Profil',
                            name: 'lg_ROLE_ID',
                            id: 'lg_ROLE_ID',
                            store: store,
                            valueField: 'lg_ROLE_ID',
                            displayField: 'str_NAME',
//                            typeAhead: true,
                            editable: false,
                            queryMode: 'remote',
                            emptyText: 'Choisir un profil...'
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
//                            allowBlank: false,
                            id: 'str_PASSWORDnew',
                            inputType: 'password'
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Confirmer',
                            name: 'str_PASSWORD',
//                            allowBlank: false,
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
            Ext.getCmp('str_LIEU_TRAVAIL').setValue(this.getOdatasource().str_LIEU_TRAVAIL);


            Ext.getCmp('str_PASSWORDnew').hide();
            Ext.getCmp('str_PASSWORDn').hide();


        }

        //A la creation : indice de securite et langue non demandes a l'utilisateur.
        //On masque les champs et on force str_IDS=1 (numerique) et langue francaise lg_Language_ID=1
        if (Omode === "create") {
            var champIDS = Ext.getCmp('str_IDS');
            champIDS.setValue('1');
            champIDS.hide();

            var champLangue = Ext.getCmp('lg_Language_ID');
            champLangue.setValue(1);
            champLangue.hide();
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
                    handler: function() {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function(button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var pass1 = Ext.getCmp('str_PASSWORDnew').getValue();
        var pass2 = Ext.getCmp('str_PASSWORDn').getValue();
        var nbCaractere = pass1.length;




        var internal_url = "";

        var str_LIEU_TRAVAIL = "1";

        if (formulaire.isValid()) {
            if (Ext.getCmp('str_LIEU_TRAVAIL').getValue() == null) {
                str_LIEU_TRAVAIL = "1";
            } else {
                str_LIEU_TRAVAIL = Ext.getCmp('str_LIEU_TRAVAIL').getValue();
            }

            if (Omode === "create") {
                internal_url = url_services_rest_utilisateur + 'create';
                if (pass1 !== pass2) {
                    Ext.MessageBox.alert('ERREUR', 'mot de passe differents');
                    Ext.getCmp('str_PASSWORDnew').setValue("");
                    Ext.getCmp('str_PASSWORDn').setValue("");
                    return;
                }
                if (nbCaractere < 8) {
                    Ext.MessageBox.alert('ERREUR', 'mot de passe minimum 8 caracteres');
                    return;
                }
            } else {
                internal_url = url_services_rest_utilisateur + 'update';
            }

            if (isNaN(parseInt(Ext.getCmp('str_IDS').getValue()))) {
                Ext.MessageBox.alert('Echec', 'L\'indice de securite doit etre un entier');
                return;
            }
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                method: 'POST',
                params: {
                    lg_USER_ID: (Omode === "update" ? ref : ""),
                    lg_ROLE_ID: Ext.getCmp('lg_ROLE_ID').getValue(),
                    str_FIRST_NAME: Ext.getCmp('str_FIRST_NAME').getValue(),
                    str_LAST_NAME: Ext.getCmp('str_LAST_NAME').getValue(),
                    str_LOGIN: Ext.getCmp('str_LOGIN').getValue(),
                    lg_Language_ID: Ext.getCmp('lg_Language_ID').getValue(),
                    str_PASSWORD: Ext.getCmp('str_PASSWORDn').getValue(),
                    // str_IDS
                    str_IDS: Ext.getCmp('str_IDS').getValue(),
                    str_LIEU_TRAVAIL: str_LIEU_TRAVAIL

                },
                success: function(response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);

                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        Ext.MessageBox.alert('Confirmation', object.errors);
                        // Oview.getStore().reload();
                        fenetre.close();
                        Me_Workflow = Oview;
                        Me_Workflow.getStore().reload();
                    }

                },
                failure: function(response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);

                }
            });
        } else {
            Ext.MessageBox.alert('Echec', 'Formulaire non valide');
        }




        //  this.up('window').close();

    },
    checkisValid: function() {
        var str_IDS = Ext.getCmp('str_IDS').getValue();
        var int_name_size = str_IDS.length;

        if (int_name_size > 0) {
            if (isNaN(parseInt(Ext.getCmp('str_IDS').getValue()))) {
                Ext.MessageBox.alert('Echec', 'L\'indice de securite doit etre un entier');
                return;
            }
        }
    }
});