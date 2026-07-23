var url_services_transaction_role = '../webservices/sm_user/role/ws_transaction.jsp?mode=';
var url_services_rest_role = '../api/v1/roles/'; // create / update en REST
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.sm_user.role.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addrole',
    id: 'addroleID',
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
                    title: 'Information sur le profil',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Libelle',
                            name: 'str_NAME',
                            allowBlank: false,
                            id: 'str_NAME',
                            emptyText: 'saisir un libelle...'
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Designation',
                            name: 'str_DESIGNATION',
                            allowBlank: false,
                            id: 'str_DESIGNATION',
                            emptyText: 'saisir une designation...'
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Libelle',
                            name: 'str_TYPE',
                            hidden: true,
                            id: 'str_TYPE',
                            emptyText: 'saisir un type...'
                        }
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_ROLE_ID;
            Ext.getCmp('str_NAME').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_DESIGNATION').setValue(this.getOdatasource().str_DESIGNATION);
Ext.getCmp('str_TYPE').setValue(this.getOdatasource().str_TYPE);
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
    onbtnsave: function(button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var internal_url = "";
        if (Omode === "create") {
            internal_url = url_services_rest_role + 'create';
        } else if (Omode === "update") {
            internal_url = url_services_rest_role + 'update';
        }
        if (formulaire.isValid()) {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                method: 'POST',
                params: {
                    lg_ROLE_ID: (Omode === "update" ? ref : ""),
                    str_NAME: Ext.getCmp('str_NAME').getValue(),
                    str_DESIGNATION: Ext.getCmp('str_DESIGNATION').getValue(),
                    str_TYPE: (Ext.getCmp('str_TYPE').getValue() != null ? Ext.getCmp('str_TYPE').getValue() : "")
                },
                success: function(response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        Ext.MessageBox.alert('Confirmation', object.errors || 'Op&eacute;ration effectu&eacute;e avec succ&egrave;s');
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



        this.up('window').close();



    }

});