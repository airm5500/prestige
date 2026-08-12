var url_services_transaction_zonegeographique = '../webservices/configmanagement/zonegeographique/ws_transaction.jsp?mode=';
var url_services_rest_zone_geo = '../api/v1/zones-geographiques/'; // create / update en REST
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.zonegeographique.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addzonegeographique',
    id: 'addzonegeographiqueID',
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
                    title: 'Information emplacement',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Code',
                            name: 'str_CODE',
                            allowBlank: false,
                            id: 'str_CODE',
                            emptyText: 'saisir un code...'
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Libelle',
                            name: 'str_LIBELLEE',
                            allowBlank: false,
                            id: 'str_LIBELLEE',
                            emptyText: 'saisir un libelle...'
                        }
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_ZONE_GEO_ID;
            Ext.getCmp('str_CODE').setValue(this.getOdatasource().str_CODE);
            Ext.getCmp('str_LIBELLEE').setValue(this.getOdatasource().str_LIBELLEE);
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
            internal_url = url_services_rest_zone_geo + 'create';
        } else if (Omode === "update") {
            internal_url = url_services_rest_zone_geo + 'update';
        }
        if (formulaire.isValid()) {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                method: 'POST',
                params: {
                    lg_ZONE_GEO_ID: (Omode === "update" ? ref : ""),
                    str_LIBELLEE: Ext.getCmp('str_LIBELLEE').getValue(),
                    str_CODE: Ext.getCmp('str_CODE').getValue()
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

    }

});