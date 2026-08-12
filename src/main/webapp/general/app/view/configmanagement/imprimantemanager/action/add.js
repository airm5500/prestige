var url_services_transaction_imprimantemanager = '../webservices/configmanagement/imprimantemanager/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;


Ext.define('testextjs.view.configmanagement.imprimantemanager.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addimprimantemanager',
    id: 'addimprimantemanagerID',
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
        var store_type = new Ext.data.Store({
            fields: ["str_TYPE_TRANSACTION", "str_STATUT_TRANSACTION"],
            data: [
                {str_TYPE_TRANSACTION: "Autres", str_STATUT_TRANSACTION: "Autres"},
                {str_TYPE_TRANSACTION: "Vente", str_STATUT_TRANSACTION: "Vente"}
            ]
        });

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Information Imprimante',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Designation',
                            emptyText: 'Designation',
                            name: 'str_DESCRIPTION',
                            id: 'str_DESCRIPTION'
                        }, {
                            xtype: 'combobox',
                            fieldLabel: 'Action sur l\'imprimante',
                            name: 'str_NAME',
                            id: 'str_NAME',
                            store: store_type,
                            valueField: 'str_STATUT_TRANSACTION',
                            displayField: 'str_TYPE_TRANSACTION',
                            editable: false, //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                            queryMode: 'local',
                            emptyText: 'Selectionner une action...'
                        }


                    ]
                }]
        });



        //Initialisation des valeur
        if (Omode === "update") {

            ref = this.getOdatasource().lg_IMPRIMANTE_ID;

            Ext.getCmp('str_NAME').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);

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
                    handler: function() {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function(button) {
        var internal_url = "";

        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (formulaire.isValid()) {
            if (Omode === "create") {
                internal_url = url_services_transaction_imprimantemanager + 'create';
            } else {
                internal_url = url_services_transaction_imprimantemanager + 'update&lg_IMPRIMANTE_ID=' + ref;
            }

            Ext.Ajax.request({
                url: internal_url,
                params: {
                    str_NAME: Ext.getCmp('str_NAME').getValue(),
                    str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                },
                success: function(response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);

                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        Ext.MessageBox.alert('Confirmation', object.errors);
                        
                        var bouton = button.up('window');
                        bouton.close();
                        testextjs.app.getController('App').onLoadNewComponentWithDataSource("imprimantemanager", "", "", "");
                    }

                },
                failure: function(response)
                {

                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);

                }
            });
        } else {
            Ext.MessageBox.alert('Echec', 'Form non valide');
        }



    }
});