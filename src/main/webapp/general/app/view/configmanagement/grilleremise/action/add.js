var url_services_data_grilleremise = '../webservices/configmanagement/grilleremise/ws_data.jsp';
var url_services_transaction_grilleremise = '../webservices/configmanagement/grilleremise/ws_transaction.jsp?mode=';
var url_services_data_remise_grilleremise = '../webservices/configmanagement/remise/ws_data.jsp';

var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.grilleremise.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addgrilleremise',
    id: 'addgrilleremiseID',
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




        var store_remise = new Ext.data.Store({
            model: 'testextjs.model.Remise',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_remise_grilleremise,
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
                    title: 'Informations Grille Remise',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Code grille remise',
                            emptyText: 'CODE GRILLE REMISE',
                            name: 'str_CODE_GRILLE',
                            maskRe: /[0-9.]/,
                            maxlength: '3',
                            allowBlank: false,
                            id: 'str_CODE_GRILLE'
                        }, {
                            fieldLabel: 'Description',
                            emptyText: 'DESCRIPTION',
                            id: 'str_DESCRIPTION',
                            allowBlank: false,
                            name: 'str_DESCRIPTION'
                        },
                        {
                            fieldLabel: 'Taux de grille remise',
                            emptyText: 'TAUX DE REMISE',
                            maskRe: /[0-9.]/,
                            name: 'dbl_TAUX',
                            allowBlank: false,
                            id: 'dbl_TAUX'
                        }, {
                            xtype: 'combobox',
                            fieldLabel: 'Remise',
                            name: 'lg_REMISE_ID',
                            id: 'lg_REMISE_ID',
                            store: store_remise,
                            valueField: 'lg_REMISE_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir une remise...'
                        }]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_GRILLE_REMISE_ID;

            Ext.getCmp('str_CODE_GRILLE').setValue(this.getOdatasource().str_CODE_GRILLE);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('dbl_TAUX').setValue(this.getOdatasource().dbl_TAUX);
            Ext.getCmp('lg_REMISE_ID').setValue(this.getOdatasource().lg_REMISE_ID);

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
            internal_url = url_services_transaction_grilleremise + 'create';
        } else {
            internal_url = url_services_transaction_grilleremise + 'update&lg_GRILLE_REMISE_ID=' + ref;
        }
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (formulaire.isValid()) {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                params: {
                    str_CODE_GRILLE: Ext.getCmp('str_CODE_GRILLE').getValue(),
                    str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                    dbl_TAUX: Ext.getCmp('dbl_TAUX').getValue(),
                    lg_REMISE_ID: Ext.getCmp('lg_REMISE_ID').getValue()
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
            Ext.MessageBox.show({
                title: 'Echec',
                msg: 'Veuillez renseignez les champs obligatoires',
                height: 150,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
        }

    }
});
