var url_services_data_client_add = '../webservices/configmanagement/compteclient/ws_data.jsp';
var url_services_transaction_client_add = '../webservices/configmanagement/client/ws_transaction.jsp?mode=';
var url_services_data_ville_client_add = '../webservices/configmanagement/ville/ws_data.jsp';
var Oview;
var Omode;
var Me;
var ref;
var dbl_SOLDE;
var OmyGridClt;
Ext.define('testextjs.view.sm_user.suggerercde.add', {
    extend: 'Ext.window.Window',
    xtype: 'addaddclient',
//    id: 'addaddclientID',
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
                url: url_services_data_ville_client_add,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        dbl_SOLDE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Solde :',
                    name: 'dbl_SOLDE',
                    id: 'dbl_SOLDE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: 0,
                    align: 'right'

                });
        var form = new Ext.form.Panel({
            bodyPadding: 10,
            //    id: 'AddCltGridId',
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
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
                            emptyText: 'FIRST_NAME',
                            name: 'str_FIRST_NAME',
                            id: 'str_FIRST_NAME'
                        }, {
                            fieldLabel: 'Prenom',
                            emptyText: 'LAST_NAME',
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
                            fieldLabel: 'Sexe',
                            name: 'str_SEXE',
                            id: 'str_SEXE',
                            store: ['F', 'M'],
                            valueField: 'str_SEXE',
                            displayField: 'str_SEXE',
                            typeAhead: true,
                            queryMode: 'local',
                            emptyText: 'Choisir un sexe...'
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
                }, {
                    xtype: 'fieldset',
                    title: 'Infos.Compte.Client',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            name: 'dbl_CAUTION',
                            id: 'dbl_CAUTION',
                            fieldLabel: 'Caution',
                            flex: 1,
                            emptyText: 'Caution',
                            maskRe: /[0-9.]/,
                            listeners: {
                                change: function() {
                                    var int_solde = Ext.getCmp('dbl_CAUTION').getValue();
                                    Ext.getCmp('dbl_SOLDE').setValue(int_solde + ' CFA');
                                }

                            }
                        }, {
                            name: 'dbl_QUOTA_CONSO_MENSUELLE',
                            id: 'dbl_QUOTA_CONSO_MENSUELLE',
                            fieldLabel: 'Quota.Conso',
                            flex: 1,
                            emptyText: 'Quota Conso',
                            maskRe: /[0-9.]/
                        }, dbl_SOLDE]
                }]
        });
        OmyGridClt = Ext.getCmp('adddoventeID');
//Initialisation des valeur 


        if (Omode === "updatecarnet") {

            ref = this.getOdatasource().lg_CLIENT_ID;
            Ext.getCmp('str_FIRST_NAME').setValue(this.getOdatasource().str_FIRST_NAME);
            Ext.getCmp('str_LAST_NAME').setValue(this.getOdatasource().str_LAST_NAME);
            Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').setValue(this.getOdatasource().str_NUMERO_SECURITE_SOCIAL);
            Ext.getCmp('str_CODE_INTERNE').setValue(this.getOdatasource().str_CODE_INTERNE);
            Ext.getCmp('str_SEXE').setValue(this.getOdatasource().str_SEXE);
            Ext.getCmp('str_ADRESSE').setValue(this.getOdatasource().str_ADRESSE);
            Ext.getCmp('str_CODE_POSTAL').setValue(this.getOdatasource().str_CODE_POSTAL);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);
            Ext.getCmp('dbl_CAUTION').setValue(this.getOdatasource().dbl_CAUTION);
            Ext.getCmp('dbl_SOLDE').setValue(this.getOdatasource().dbl_SOLDE);
            Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').setValue(this.getOdatasource().dbl_QUOTA_CONSO_MENSUELLE);

        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 470,
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

        if (Omode === "createcarnet") {
            internal_url = url_services_transaction_client_add + 'createcarnet';
        } else {
            internal_url = url_services_transaction_client_add + 'updatecarnet&lg_CLIENT_ID=' + ref;
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
                lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue(),
                dbl_CAUTION: Ext.getCmp('dbl_CAUTION').getValue(),
                dbl_SOLDE: Me.onsplitovalue(Ext.getCmp('dbl_SOLDE').getValue()),
                dbl_QUOTA_CONSO_MENSUELLE: Me.onsplitovalue(Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').getValue())

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

    ,
    onsplitovalue: function(Ovalue) {
        var int_ovalue;
        var string = Ovalue.split(" ");
        int_ovalue = string[0];
        return int_ovalue;
    }
});