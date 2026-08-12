//var url_services_data_typefabriquant = '../webservices/configmanagement/typefabriquant/ws_data.jsp';
var url_services_data_fabriquant = '../webservices/configmanagement/fabriquant/ws_data.jsp';
var url_services_transaction_fabriquant = '../webservices/configmanagement/fabriquant/ws_transaction.jsp?mode=';
//var url_services_data_grille_fabriquant  = '../webservices/configmanagement/grillefabriquant/ws_data.jsp';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.fabriquant.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addfabriquant',
    id: 'addfabriquantID',
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
                    title: 'Informations Fabriquant',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Code',
                            emptyText: 'CODE FABRIQUANT',
                            id: 'str_CODE',
                            allowBlank: false,
                            name: 'str_CODE'
                        }, {
                            fieldLabel: 'NOM',
                            emptyText: 'NOM',
                            id: 'str_NAME',
                            allowBlank: false,
                            name: 'str_NAME'
                        }, {
                            fieldLabel: 'Adresse',
                            emptyText: 'ADRESSE',
                            id: 'str_ADRESSE',
                            allowBlank: false,
                            name: 'str_ADRESSE'
                        }, {
                            fieldLabel: 'Telephone',
                            emptyText: 'TELEPHONE',
                            id: 'str_TELEPHONE',
                            allowBlank: false,
                            maskRe: /[0-9.]/,
                            name: 'str_TELEPHONE'
                        }, {
                            fieldLabel: 'Description',
                            emptyText: 'Description',
                            id: 'str_DESCRIPTION',
                             allowBlank: false,
                            name: 'str_DESCRIPTION'
                        }]
                }]
        });
        //Initialisation des valeur

        if (Omode === "update") {

            ref = this.getOdatasource().lg_FABRIQUANT_ID;
            Ext.getCmp('str_CODE').setValue(this.getOdatasource().str_CODE);
            Ext.getCmp('str_NAME').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_ADRESSE').setValue(this.getOdatasource().str_ADRESSE);
            Ext.getCmp('str_TELEPHONE').setValue(this.getOdatasource().str_TELEPHONE);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);

            //alert(this.getOdatasource().str_DESCRIPTION);

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
    onbtnsave: function(e) {

        var win = e.up('window'), form = win.down('form');
        if (form.isValid()) {
            var internal_url = "";
            if (Omode === "create") {
                internal_url = url_services_transaction_fabriquant + 'create';
            } else {
                internal_url = url_services_transaction_fabriquant + 'update&lg_FABRIQUANT_ID=' + ref;
            }
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                params: {
                    str_CODE: Ext.getCmp('str_CODE').getValue(),
                    str_NAME: Ext.getCmp('str_NAME').getValue(),
                    str_ADRESSE: Ext.getCmp('str_ADRESSE').getValue(),
                    str_TELEPHONE: Ext.getCmp('str_TELEPHONE').getValue(),
                    str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue()
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
                        win.close();
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
                // width: 300,
                height: 150,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
        }
    }
});
