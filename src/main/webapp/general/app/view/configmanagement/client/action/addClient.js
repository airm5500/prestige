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


Ext.define('testextjs.view.configmanagement.client.action.addClient', {
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
        var store_medecin = new Ext.data.Store({
            model: 'testextjs.model.Medecin',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_medecin_client,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_tierspays = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_clttierpayant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


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
                            id: 'str_CODE_INTERNE'
//                            hidden: true

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
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Date de naissance',
                            emptyText: 'Date de naissance',
                            name: 'dt_NAISSANCE',
                            id: 'dt_NAISSANCE',
                            allowBlank: false
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
                            xtype: 'radiogroup',
                            fieldLabel: 'Genre',
                            id: 'str_SEXE',
                            items: [
                                {boxLabel: 'Feminin', name: 'str_SEXE', inputValue: 'F'},
                                {boxLabel: 'Masculin', name: 'str_SEXE', inputValue: 'M'}
                            ]
                        },
//                        {
//                            xtype: 'combobox',
//                            fieldLabel: 'Genre',
//                            name: 'str_SEXE',
//                            id: 'str_SEXE',
//                            store: ['F', 'M'],
//                            valueField: 'str_SEXE',
//                            displayField: 'str_SEXE',
//                            typeAhead: true,
//                            queryMode: 'local',
//                            emptyText: 'Choisir un genre...'
//                        },
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
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type.Client',
                            name: 'lg_TYPE_CLIENT_ID',
                            id: 'lg_TYPE_CLIENT_ID',
                            store: store_typeclient_cltadd,
                            valueField: 'lg_TYPE_CLIENT_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            allowBlank: false,
                            emptyText: 'Choisir un type de client...',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();
                                    var CmboTierspayant = Ext.getCmp('lg_TIERS_PAYANT_ID');
                                    CmboTierspayant.enable();
                                    if (value === "1") {
                                        Ext.getCmp('int_POURCENTAGE').show();
                                        Ext.getCmp('InfoAyantDroitID').show();
                                        Ext.getCmp('int_PRIORITY').show();
                                    } else if (value === "6") {
                                        Ext.getCmp('int_POURCENTAGE').hide();
                                        Ext.getCmp('int_PRIORITY').hide();
                                        Ext.getCmp('int_POURCENTAGE').setValue(0);
                                        Ext.getCmp('int_PRIORITY').setValue(1);
                                        Ext.getCmp('InfoAyantDroitID').hide();
                                    }
                                    var url_services_data_cltTierspayant = '../webservices/configmanagement/compteclienttierspayant/ws_data_tierspayant.jsp';
                                    CmboTierspayant.getStore().getProxy().url = url_services_data_cltTierspayant + "?lg_TYPE_CLIENT_ID=" + value;
                                    CmboTierspayant.getStore().reload();
                                }

                            }
                        }]

                },
                {
                    xtype: 'fieldset',
                    title: 'Infos.Ayant.Droit',
                    id: 'InfoAyantDroitID',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'combobox',
                            fieldLabel: 'Categorie Ayant Droit',
                            name: 'lg_CATEGORIE_AYANTDROIT_ID',
                            id: 'lg_CATEGORIE_AYANTDROIT_ID',
                            store: store_categorie_ayant_droit,
                            valueField: 'lg_CATEGORIE_AYANTDROIT_ID',
                            displayField: 'str_LIBELLE_CATEGORIE_AYANTDROIT',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir une categorie d ayant droit...'
                        }, {
                            xtype: 'combobox',
                            fieldLabel: 'Risque',
                            name: 'lg_RISQUE_ID',
                            id: 'lg_RISQUE_ID',
                            store: store_categorie_risque,
                            valueField: 'lg_RISQUE_ID',
                            displayField: 'str_LIBELLE_RISQUE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un risque...'
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: 'Infos.Compte.Client',
                    id: 'InfosCpteCltID',
                    hidden: true,
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
                                change: function () {
                                    var int_solde = Ext.getCmp('dbl_CAUTION').getValue();
                                    //Ext.getCmp('dbl_SOLDE').setValue(int_solde + ' CFA');
                                }

                            }
                        }, {
                            name: 'dbl_QUOTA_CONSO_MENSUELLE',
                            id: 'dbl_QUOTA_CONSO_MENSUELLE',
                            fieldLabel: 'Quota.Conso',
                            flex: 1,
                            emptyText: 'Quota Conso',
                            maskRe: /[0-9.]/
                        },
                        {
                            fieldLabel: 'Commentaires',
                            emptyText: 'COMMENTAIRE',
                            name: 'str_COMMENTAIRE_CLIENT',
                            allowBlank: false,
                            id: 'str_COMMENTAIRE_CLIENT'
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: 'Infos sur le tiers payant principal',
                    id: 'InfosCltTierspayantID',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Tiers payant',
                            name: 'lg_TIERS_PAYANT_ID',
                            id: 'lg_TIERS_PAYANT_ID',
                            disabled: true,
                            store: store_tierspays,
                            valueField: 'lg_TIERS_PAYANT_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un tiers payant...'
                        },
                        {
                            fieldLabel: 'Pourcentage',
                            emptyText: 'Pourcentage',
                            name: 'int_POURCENTAGE',
                            id: 'int_POURCENTAGE',
                            value: 0,
                            minValue: 0,
                            maskRe: /[0-9.]/
                        },
                        {
                            fieldLabel: 'Priorite',
                            emptyText: 'Priorite',
                            name: 'int_PRIORITY',
                            id: 'int_PRIORITY',
                            value: 0,
                            hidden: 0,
                            minValue: 1,
                            maskRe: /[0-9.]/
                        }
                    ]
                }
            ]
        });



        //Initialisation des valeur 


        if (Omode === "update") {

            ref = this.getOdatasource().lg_CLIENT_ID;

            Ext.getCmp('str_FIRST_NAME').setValue(this.getOdatasource().str_FIRST_NAME);
            Ext.getCmp('str_LAST_NAME').setValue(this.getOdatasource().str_LAST_NAME);
            Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').setValue(this.getOdatasource().str_NUMERO_SECURITE_SOCIAL);
            //Ext.getCmp('str_CODE_INTERNE').hide();
            Ext.getCmp('str_CODE_INTERNE').setValue(this.getOdatasource().str_CODE_INTERNE);
            
            Ext.getCmp('str_SEXE').setValue(this.getOdatasource().str_SEXE);
            Ext.getCmp('str_ADRESSE').setValue(this.getOdatasource().str_ADRESSE);
            Ext.getCmp('str_CODE_POSTAL').setValue(this.getOdatasource().str_CODE_POSTAL);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);
            //  Ext.getCmp('lg_MEDECIN_ID').setValue(this.getOdatasource().lg_MEDECIN_ID);
            Ext.getCmp('lg_TYPE_CLIENT_ID').setValue(this.getOdatasource().lg_TYPE_CLIENT_ID);
            dbl_CAUTION = this.getOdatasource().dbl_CAUTION;
            dbl_QUOTA_CONSO_MENSUELLE = this.getOdatasource().dbl_QUOTA_CONSO_MENSUELLE;
            dbl_SOLDE = this.getOdatasource().dbl_SOLDE;
            //alert("lg_TYPE_CLIENT_ID "+this.getOdatasource().lg_TYPE_CLIENT_ID );
            if (this.getOdatasource().lg_TYPE_CLIENT_ID === "Assurance") {
                Ext.getCmp('InfoAyantDroitID').show();
                Ext.getCmp('int_POURCENTAGE').hide();
                Ext.getCmp('int_PRIORITY').hide();
                Ext.getCmp('lg_TYPE_CLIENT_ID').hide();
                Ext.getCmp('int_POURCENTAGE').setValue(this.getOdatasource().int_POURCENTAGE);
                Ext.getCmp('int_PRIORITY').setValue(this.getOdatasource().int_PRIORITY);
                Ext.getCmp('InfosCltTierspayantID').hide();
            } else if (this.getOdatasource().lg_TYPE_CLIENT_ID === "Carnet") {
                Ext.getCmp('InfoAyantDroitID').hide();
                Ext.getCmp('int_POURCENTAGE').hide();
                Ext.getCmp('int_PRIORITY').hide();
                Ext.getCmp('InfosCltTierspayantID').hide();
            } else if (this.getOdatasource().lg_TYPE_CLIENT_ID == "Confrere" || this.getOdatasource().lg_TYPE_CLIENT_ID == "Proprietaire" || this.getOdatasource().lg_TYPE_CLIENT_ID == "Depot") {
                Ext.getCmp('InfoAyantDroitID').hide();
                Ext.getCmp('int_POURCENTAGE').hide();
                Ext.getCmp('int_PRIORITY').hide();
                Ext.getCmp('InfosCltTierspayantID').hide();

            }
            // Ext.getCmp('InfosCpteCltID').hide();
            Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID').setValue(this.getOdatasource().lg_CATEGORIE_AYANTDROIT_ID);

            // Ext.getCmp('lg_RISQUE_ID').setValue(this.getOdatasource().lg_RISQUE_ID);
            // dt_NAISSANCE
            Ext.getCmp('dt_NAISSANCE').setValue(this.getOdatasource().dt_NAISSANCE);

        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 650,
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
        var Oview = Ext.getCmp('GridclientID');
        // alert(Ext.getCmp('lg_VILLE_ID').getValue());

        if (Omode === "create") {
            internal_url = url_services_transaction_client + 'create';
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
                    //  lg_MEDECIN_ID: Ext.getCmp('lg_MEDECIN_ID').getValue(),
                    lg_TYPE_CLIENT_ID: Ext.getCmp('lg_TYPE_CLIENT_ID').getValue(),
                    //dbl_SOLDE: Me.onsplitovalue(Ext.getCmp('dbl_SOLDE').getValue()),
//                    dbl_QUOTA_CONSO_MENSUELLE: Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').getValue(),
//                    dbl_CAUTION: Ext.getCmp('dbl_CAUTION').getValue(),
                    dbl_SOLDE: dbl_SOLDE,
                    lg_CATEGORIE_AYANTDROIT_ID: Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID').getValue(),
                    lg_RISQUE_ID: Ext.getCmp('lg_RISQUE_ID').getValue(),
                    dt_NAISSANCE: Ext.getCmp('dt_NAISSANCE').getValue(),
                    str_COMMENTAIRE: Ext.getCmp('str_COMMENTAIRE_CLIENT').getValue(),
                    lg_TIERS_PAYANT_ID: Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                    int_POURCENTAGE: Ext.getCmp('int_POURCENTAGE').getValue(),
                    int_PRIORITY: Ext.getCmp('int_PRIORITY').getValue()

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
        } else {
            internal_url = url_services_transaction_client + 'update&lg_CLIENT_ID=' + ref;
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
                    // lg_MEDECIN_ID: Ext.getCmp('lg_MEDECIN_ID').getValue(),
                    lg_TYPE_CLIENT_ID: Ext.getCmp('lg_TYPE_CLIENT_ID').getValue(),
                    dbl_QUOTA_CONSO_MENSUELLE: dbl_QUOTA_CONSO_MENSUELLE,
                    dbl_CAUTION: dbl_CAUTION,
                    dbl_SOLDE: dbl_SOLDE,
                    lg_CATEGORIE_AYANTDROIT_ID: Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID').getValue(),
                    lg_RISQUE_ID: Ext.getCmp('lg_RISQUE_ID').getValue(),
                    dt_NAISSANCE: Ext.getCmp('dt_NAISSANCE').getValue(),
                    str_COMMENTAIRE: Ext.getCmp('str_COMMENTAIRE_CLIENT').getValue()


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
                    }



                    Oview.getStore().reload();

                },
                failure: function (response)
                {

                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);

                }
            });
        }

//alert(Ext.getCmp('str_CODE_INTERNE').getValue() + " " + Ext.getCmp('str_FIRST_NAME').getValue() +" " + Ext.getCmp('str_LAST_NAME').getValue() + " " + Ext.getCmp('str_SEXE').getValue() + " " + Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').getValue() + " " + Ext.getCmp('str_ADRESSE').getValue() + " " + Ext.getCmp('str_CODE_POSTAL').getValue() + " " + Ext.getCmp('lg_VILLE_ID').getValue() + " " + Ext.getCmp('lg_TYPE_CLIENT_ID').getValue() + " " + Me.onsplitovalue(Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').getValue()) + " "+Ext.getCmp('dbl_CAUTION').getValue());

        /*Ext.Ajax.request({
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
         lg_TYPE_CLIENT_ID: Ext.getCmp('lg_TYPE_CLIENT_ID').getValue(),
         //dbl_SOLDE: Me.onsplitovalue(Ext.getCmp('dbl_SOLDE').getValue()),
         dbl_QUOTA_CONSO_MENSUELLE: dbl_QUOTA_CONSO_MENSUELLE,
         dbl_CAUTION: dbl_CAUTION, 
         dbl_SOLDE: dbl_SOLDE
         
         },
         success: function(response)
         {
         var object = Ext.JSON.decode(response.responseText, false);
         // alert(object.success);
         if (object.success === 0) {
         Ext.MessageBox.alert('Error Message', object.errors);
         return;
         } else {
         Ext.MessageBox.alert('Confirmation', object.errors);
         }
         Oview.getStore().reload();
         
         },
         failure: function(response)
         {
         
         var object = Ext.JSON.decode(response.responseText, false);
         console.log("Bug " + response.responseText);
         Ext.MessageBox.alert('Error Message', response.responseText);
         
         }
         });*/

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
