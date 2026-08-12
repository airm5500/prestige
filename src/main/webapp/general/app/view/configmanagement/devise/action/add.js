var url_services_transaction_devise = '../webservices/configmanagement/devise/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.devise.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'adddevise',
    id: 'adddeviseID',
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
        var itemsPerPage = 20;


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
                    title: 'Informations Devise',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Code devise',
                            emptyText: 'Code devise (Fr)',
                            name: 'str_NAME',
                            allowBlank: false,
                            id: 'str_NAME'
                        }, {
                            fieldLabel: 'D&eacute;signation',
                            emptyText: 'Designation',
                            id: 'str_DESCRIPTION',
                            allowBlank: false,
                            name: 'str_DESCRIPTION'
                        },
                        {
                            fieldLabel: 'Taux',
                            emptyText: 'Taux',
                            name: 'int_TAUX',
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            id: 'int_TAUX',
                            value: 1
                        }]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_DEVISE_ID;

            Ext.getCmp('str_NAME').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('int_TAUX').setValue(this.getOdatasource().int_TAUX);
        }


        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 320,
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
        var internal_url = "";
        if (Omode === "create") {
            internal_url = url_services_transaction_devise + 'create';
        } else {
            internal_url = url_services_transaction_devise + 'update&lg_DEVISE_ID=' + ref;
        }
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (formulaire.isValid()) {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                params: {
                    str_NAME: Ext.getCmp('str_NAME').getValue(),
                    str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                    int_TAUX: Ext.getCmp('int_TAUX').getValue()
                },
                success: function(response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success === 0) {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        Ext.MessageBox.alert('Confirmation', object.errors);
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
            Ext.MessageBox.show({
                title: 'Echec',
                msg: 'Veuillez renseignez les champs obligatoires',
                height: 150,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
        }


//        this.up('window').close();
    }
});
