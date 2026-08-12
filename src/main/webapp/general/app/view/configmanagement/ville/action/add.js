var url_services_data_ville = '../webservices/configmanagement/ville/ws_data.jsp';
var url_services_transaction_ville = '../webservices/configmanagement/ville/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;

Ext.define('testextjs.view.configmanagement.ville.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addville',
    id: 'addvilleID',
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
//        var store = new Ext.data.Store({
//            model: 'testextjs.model.Role',
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_role
//            }
//        });
//        var storeskin = new Ext.data.Store({
//            model: 'testextjs.model.Skin',
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_skin
//            }
//        });
//        var storelanguage = new Ext.data.Store({
//            model: 'testextjs.model.Language',
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_language
//            }
//        });


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 140,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Informations Ville',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code Ville',
                            emptyText: 'Code Ville',
                            name: 'str_CODE',
                            //maskRe: /[0-9.]/,
                            allowBlank: false,
                            id: 'str_CODE'
                        }, {
                            fieldLabel: 'Ville',
                            emptyText: 'Ville',
                            name: 'STR_NAME',
                            allowBlank: false,
                            id: 'STR_NAME'
                        }, {
                            fieldLabel: 'Boite Postale',
                            emptyText: 'Boite Postale',
                            name: 'STR_CODE_POSTAL',
                            allowBlank: false,
                            id: 'STR_CODE_POSTAL'
                        }, {
                            fieldLabel: 'Bureau Distributeur',
                            emptyText: 'Bureau Distributeur',
                            name: 'STR_BUREAU_DISTRIBUTEUR',
                            allowBlank: false,
                            id: 'STR_BUREAU_DISTRIBUTEUR'
                        }

                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_VILLE_ID;

            Ext.getCmp('STR_NAME').setValue(this.getOdatasource().STR_NAME);
            Ext.getCmp('STR_CODE_POSTAL').setValue(this.getOdatasource().STR_CODE_POSTAL);
            Ext.getCmp('STR_BUREAU_DISTRIBUTEUR').setValue(this.getOdatasource().STR_BUREAU_DISTRIBUTEUR);
            Ext.getCmp('str_CODE').setValue(this.getOdatasource().str_CODE);
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
    onbtnsave: function() {


        //  alert(Ext.getCmp('str_LAST_NAME').getValue());

        var internal_url = "";


        if (Omode === "create") {
            //alert("create");
            internal_url = url_services_transaction_ville + 'create';

        } else {
            //alert("update");
            internal_url = url_services_transaction_ville + 'update&lg_VILLE_ID=' + ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                STR_NAME: Ext.getCmp('STR_NAME').getValue(),
                STR_CODE_POSTAL: Ext.getCmp('STR_CODE_POSTAL').getValue(),
                STR_BUREAU_DISTRIBUTEUR: Ext.getCmp('STR_BUREAU_DISTRIBUTEUR').getValue(),
                str_CODE: Ext.getCmp('str_CODE').getValue()

            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    Me_Workflow = Oview;
                    Me_Workflow.getStore().reload();
                }

            },
            failure: function(response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

        this.up('window').close();
    }
});