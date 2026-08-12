var url_services_data_client = '../webservices/configmanagement/client/ws_data.jsp';
var url_services_transaction_client = '../webservices/configmanagement/client/ws_transaction.jsp?mode=';
var url_services_data_ville_client = '../webservices/configmanagement/ville/ws_data.jsp';
var url_services_data_medecin_client = '../webservices/configmanagement/medecin/ws_data.jsp';

var url_services_data_typeclient_client = '../webservices/configmanagement/typeclient/ws_data.jsp';
var url_services_data_clttierpayant = '../webservices/configmanagement/compteclienttierspayant/ws_data_tierspayant.jsp';
var url_services_data_categorie_ayant_droit = '../webservices/configmanagement/categorieayantdroit/ws_data.jsp';
var url_services_data_risque = '../webservices/configmanagement/risque/ws_data.jsp';

var Oview;
var Omode;
var Me;
var ref;
var dbl_CAUTION;
var dbl_QUOTA_CONSO_MENSUELLE;
var dbl_SOLDE = 0;
var type;
var lg_TYPE_TIERS_PAYANT_ID;


Ext.define('testextjs.view.sm_user.retrocession.action.addClient', {
    extend: 'Ext.window.Window',
    xtype: 'addclient',
    id: 'addclientID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.TypeClient',
        'testextjs.view.sm_user.doventeretrocession.*',
        'testextjs.view.stockmanagement.dodepot.*',
        'testextjs.model.Ville'
                //'testextjs.view.sm_user.doventeretrocession.DoventeRetrocessionManager'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        type: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();
        type = this.getType();



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

        Me = this;
        var itemsPerPage = 20;




        var store_categorie_ayant_droit = new Ext.data.Store({
            model: 'testextjs.model.CategorieAyantdroit',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_categorie_ayant_droit,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_categorie_risque = new Ext.data.Store({
            model: 'testextjs.model.Risque',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_risque,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        var store_typeclient_cltadd = new Ext.data.Store({
            model: 'testextjs.model.TypeClient',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typeclient_client + "?str_TYPE=CLIENT",
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
            items: [
                {
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
                            id: 'str_CODE_INTERNE',
                            hidden: true

                        },
                        {
                            fieldLabel: 'Nom',
                            emptyText: 'NOM',
                            name: 'str_FIRST_NAME',
                            allowBlank: false,
                            id: 'str_FIRST_NAME'
                        }, {
                            fieldLabel: 'Prenom',
                            emptyText: 'PRENOMS',
                            name: 'str_LAST_NAME',
                            allowBlank: false,
                            id: 'str_LAST_NAME'
                        },
//                        {
//                            xtype: 'datefield',
//                            fieldLabel: 'Date de naissance',
//                            emptyText: 'Date de naissance',
//                            name: 'dt_NAISSANCE',
//                            id: 'dt_NAISSANCE',
//                            allowBlank: false
//                        },
//                        {
//                            fieldLabel: 'Securite Social',
//                            emptyText: 'SECURITE SOCIALE',
//                            name: 'str_NUMERO_SECURITE_SOCIAL',
//                            id: 'str_NUMERO_SECURITE_SOCIAL'
//                        },
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
                            xtype: 'radiogroup',
                            fieldLabel: 'Genre',
                            id: 'str_SEXE',
                            items: [
                                {boxLabel: 'Feminin', name: 'str_SEXE', inputValue: 'F'},
                                {boxLabel: 'Masculin', name: 'str_SEXE', inputValue: 'M'}
                            ]
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
                        }]

                }

            ]
        });



        //Initialisation des valeur 


        if (Omode === "update") {

            ref = this.getOdatasource().lg_CLIENT_ID;

            Ext.getCmp('str_FIRST_NAME').setValue(this.getOdatasource().str_FIRST_NAME);
            Ext.getCmp('str_LAST_NAME').setValue(this.getOdatasource().str_LAST_NAME);
            //  Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').setValue(this.getOdatasource().str_NUMERO_SECURITE_SOCIAL);
            //Ext.getCmp('str_CODE_INTERNE').hide();
            Ext.getCmp('str_CODE_INTERNE').setValue(this.getOdatasource().str_CODE_INTERNE);

            Ext.getCmp('str_SEXE').setValue(this.getOdatasource().str_SEXE);
            Ext.getCmp('str_ADRESSE').setValue(this.getOdatasource().str_ADRESSE);
            Ext.getCmp('str_CODE_POSTAL').setValue(this.getOdatasource().str_CODE_POSTAL);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);

            //    Ext.getCmp('dt_NAISSANCE').setValue(this.getOdatasource().dt_NAISSANCE);

        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 350,
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
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function () {

        var internal_url = "";
       // var Oview = Ext.getCmp('GridclientID');
        var lg_TYPE_CLIENT_ID = "3";

        if (Omode === "create") {
            internal_url = url_services_transaction_client + 'createother';
        } else if (Omode === "update") {
            internal_url = url_services_transaction_client + 'updateother&lg_CLIENT_ID=' + ref;
        }
        
        var str_FIRST_LAST_NAME = Ext.getCmp('str_FIRST_NAME').getValue() + " " + Ext.getCmp('str_LAST_NAME').getValue();
        Ext.Ajax.request({
            url: internal_url,
            params: {
                // lg_CLIENT_ID : Ext.getCmp('lg_CLIENT_ID').getValue(),
                str_CODE_INTERNE: Ext.getCmp('str_CODE_INTERNE').getValue(),
                str_FIRST_NAME: Ext.getCmp('str_FIRST_NAME').getValue(),
                str_LAST_NAME: Ext.getCmp('str_LAST_NAME').getValue(),
                str_SEXE: Ext.getCmp('str_SEXE').getValue(),
                // str_NUMERO_SECURITE_SOCIAL: Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').getValue(),
                str_ADRESSE: Ext.getCmp('str_ADRESSE').getValue(),
                str_CODE_POSTAL: Ext.getCmp('str_CODE_POSTAL').getValue(),
                lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue(),
                lg_TYPE_CLIENT_ID: lg_TYPE_CLIENT_ID,
                dbl_SOLDE: dbl_SOLDE,
                //  dt_NAISSANCE: Ext.getCmp('dt_NAISSANCE').getValue(),
//                str_COMMENTAIRE: Ext.getCmp('str_COMMENTAIRE_CLIENT').getValue()
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                // alert(object.success);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    if (type === "clientmanager") {
                        Oview.getStore().reload();
                    } else if (type === "retrocession") {
                        var OGrid = Ext.getCmp('lg_CLIENT_CONFRERE_ID');
                        OGrid.getStore().reload();
                        OGrid.setValue(str_FIRST_LAST_NAME);
                    } else if (type === "depot") {
                        var OGrid = Ext.getCmp('CltgridpanelDepotID');
                        OGrid.getStore().reload();
                    }


                }


            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

        this.up('window').close();
    }

    ,
    onsplitovalue: function (Ovalue) {
        var int_ovalue;
        var string = Ovalue.split(" ");
        int_ovalue = string[0];

        return int_ovalue;

    }
});
