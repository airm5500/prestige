/* global Ext */

var url_services_data_client = '../webservices/configmanagement/client/ws_data.jsp';
var url_services_transaction_client = '../webservices/configmanagement/client/ws_transaction.jsp?mode=';
var url_services_data_ville_client = '../webservices/configmanagement/ville/ws_data.jsp';

var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.sm_user.client.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addclientbase',
    id: 'addclientBaseID',
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
        var store_ville = new Ext.data.Store({
            model: 'testextjs.model.Ville',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_ville_client,
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
                    title: 'Information Client',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code Interne',
                            emptyText: 'CODE INTERNE',
                            name: 'str_CODE_INTERNE',
                            id: 'str_CODE_INTERNE'
                        },
                        {
                            fieldLabel: 'Nom',
                            emptyText: 'NOM',
                            name: 'str_FIRST_NAME',
                            id: 'str_FIRST_NAME'
                        }, {
                            fieldLabel: 'Prenom',
                            emptyText: 'PRENOMS',
                            name: 'str_LAST_NAME',
                            id: 'str_LAST_NAME'
                        },
                        {
                            fieldLabel: 'Securite Social',
                            emptyText: 'SECURITE SOCIALE',
                            name: 'str_NUMERO_SECURITE_SOCIAL',
                            id: 'str_NUMERO_SECURITE_SOCIAL'
                        },
                        {
                            fieldLabel: 'Adresse',
                            emptyText: 'ADRESSE',
                            name: 'str_ADRESSE',
                            id: 'str_ADRESSE'
                        },
                        {
                            fieldLabel: 'Code Postal',
                            emptyText: 'CODE POSTAL',
                            name: 'str_CODE_POSTAL',
                            id: 'str_CODE_POSTAL'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Genre',
                            name: 'str_SEXE',
                            id: 'str_SEXE',
                            store: ['F', 'M'],
                            valueField: 'str_SEXE',
                            displayField: 'str_SEXE',
                            typeAhead: true,
                            queryMode: 'local',
                            emptyText: 'Choisir un genre...'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Ville',
                            name: 'lg_VILLE_ID',
                            id: 'lg_VILLE_ID',
                            store: store_ville,
                            valueField: 'lg_VILLE_ID',
                            displayField: 'STR_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir une ville...'
                        }
                    ]
                }]
        });



        //Initialisation des valeur 


        if (Omode === "update") {

            ref = this.getOdatasource().lg_CLIENT_ID;

            Ext.getCmp('str_FIRST_NAME').setValue(this.getOdatasource().str_FIRST_NAME);
            Ext.getCmp('str_LAST_NAME').setValue(this.getOdatasource().str_LAST_NAME);
            Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').setValue(this.getOdatasource().str_NUMERO_SECURITE_SOCIAL);
            Ext.getCmp('str_CODE_INTERNE').setValue(this.getOdatasource().str_CODE_INTERNE);
            Ext.getCmp('str_SEXE').setValue(this.getOdatasource().str_SEXE);
            Ext.getCmp('str_ADRESSE').setValue(this.getOdatasource().str_ADRESSE);
            Ext.getCmp('str_CODE_POSTAL').setValue(this.getOdatasource().str_CODE_POSTAL);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);

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
    onbtnsave: function() {

        var internal_url = "";
        // alert(Ext.getCmp('lg_VILLE_ID').getValue());

        if (Omode === "create") {
            internal_url = url_services_transaction_client + 'create';
        } else {
            internal_url = url_services_transaction_client + 'update&lg_CLIENT_ID=' + ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                // lg_CLIENT_ID : Ext.getCmp('lg_CLIENT_ID').getValue(),
                str_CODE_INTERNE: Ext.getCmp('str_CODE_INTERNE').getValue(),
                str_FIRST_NAME: Ext.getCmp('str_FIRST_NAME').getValue(),
                str_LAST_NAME: Ext.getCmp('str_LAST_NAME').getValue(),
                str_SEXE: Ext.getCmp('str_SEXE').getValue(),
                str_NUMERO_SECURITE_SOCIAL: Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').getValue(),
                str_ADRESSE: Ext.getCmp('str_ADRESSE').getValue(),
                str_CODE_POSTAL: Ext.getCmp('str_CODE_POSTAL').getValue(),
                lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue()


            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
                Oview.getStore().reload();

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