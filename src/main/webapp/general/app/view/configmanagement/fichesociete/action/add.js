var url_services_data_fichesociete = '../webservices/configmanagement/fichesociete/ws_data.jsp';
var url_services_data_ville = '../webservices/configmanagement/ville/ws_data.jsp';
var url_services_data_escomptesociete = "../webservices/configmanagement/escomptesociete/ws_data.jsp";
var url_services_transaction_fichesociete = '../webservices/configmanagement/fichesociete/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;
Ext.define('testextjs.view.configmanagement.fichesociete.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addfichesociete',
    id: 'addfichesocieteID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.FicheSociete',
        'testextjs.model.Ville',
        'testextjs.model.EscompteSociete'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
   
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        var itemsPerPage = 20;
       //alert("addfichesociete" +  addfichesociete);
       
        var storeville = new Ext.data.Store({
            model: 'testextjs.model.Ville',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_ville,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var storeescomptesociete = new Ext.data.Store({
            model: 'testextjs.model.EscompteSociete',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_escomptesociete,
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
                labelWidth: 160,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Informations Fiche Societe',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        // str_CODE_INTERNE
                        {
                            name: 'str_CODE_INTERNE',
                            id: 'str_CODE_INTERNE',
                            fieldLabel: 'Code Interne',
                            emptyText: 'Code Interne',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_LIBELLE_ENTREPRISE
                        {
                            name: 'str_LIBELLE_ENTREPRISE',
                            id: 'str_LIBELLE_ENTREPRISE',
                            fieldLabel: 'Libelle Entreprise',
                            emptyText: 'Libelle Entreprise',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_ADRESSE_RUE_1                       
                        {
                            name: 'str_CODE_FACTURE',
                            id: 'str_CODE_FACTURE',
                            fieldLabel: 'Code Facture',
                            emptyText: 'Code Facture',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_ADRESSE_RUE_2
                        {
                            name: 'str_RAISON_SOCIALE',
                            id: 'str_RAISON_SOCIALE',
                            fieldLabel: 'Raison Sociale',
                            emptyText: 'Raison Sociale',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_CODE_POSTAL
                        {
                            name: 'str_ADRESSE_PRINCIPALE',
                            id: 'str_ADRESSE_PRINCIPALE',
                            fieldLabel: 'Adresse Principale',
                            emptyText: 'Adresse Principale',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_BUREAU_DISTRIBUTEUR
                        {
                            name: 'str_BUREAU_DISTRIBUTEUR',
                            id: 'str_BUREAU_DISTRIBUTEUR',
                            fieldLabel: 'Bureau distributeur',
                            emptyText: 'Bureau distributeur',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_MOBILE
                        {
                            name: 'str_AUTRE_ADRESSE',
                            id: 'str_AUTRE_ADRESSE',
                            fieldLabel: 'Autre Adresse',
                            emptyText: 'Autre Adresse',
                            //maskRe: /[0-9.]/,
                            flex: 1,
                            allowBlank: false
                        },
                        // str_TELEPHONE
                        {
                            name: 'str_CODE_BON_LIVRAISON',
                            id: 'str_CODE_BON_LIVRAISON',
                            fieldLabel: 'Code Bon Livraison',
                            emptyText: 'Code Bon Livraison',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        },
                        // int_DELAI_REGLEMENT_AUTORISE
                        {
                            name: 'str_CODE_EXONERATION_TVA',
                            id: 'str_CODE_EXONERATION_TVA',
                            fieldLabel: 'Code Exoneration',
                            emptyText: 'Code Exoneration',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        },
                        //dbl_CHIFFRE_DAFFAIRE
                        {
                            name: 'dbl_CHIFFRE_AFFAIRE',
                            id: 'dbl_CHIFFRE_AFFAIRE',
                            fieldLabel: 'Chiffre d' + '"' + 'Affaire',
                            emptyText: 'Chiffre d' + '"' + 'Affaire',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        },
                        // lg_ESCOMPTE_SOCIETE_ID
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Escompte societe',
                            name: 'lg_ESCOMPTE_SOCIETE_ID',
                            id: 'lg_ESCOMPTE_SOCIETE_ID',
                            store: storeescomptesociete,
                            valueField: 'lg_ESCOMPTE_SOCIETE_ID',
                            displayField: 'str_LIBELLE_ESCOMPTE_SOCIETE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un escompte societe...'

                        },
                        // lg_VILLE_ID
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Ville',
                            name: 'lg_VILLE_ID',
                            id: 'lg_VILLE_ID',
                            store: storeville,
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

            ref = this.getOdatasource().lg_FICHE_SOCIETE_ID;
            Ext.getCmp('str_CODE_INTERNE').setValue(this.getOdatasource().str_CODE_INTERNE);
            Ext.getCmp('str_LIBELLE_ENTREPRISE').setValue(this.getOdatasource().str_LIBELLE_ENTREPRISE);
            //Ext.getCmp('str_TYPE_SOCIETE').setValue(this.getOdatasource().str_TYPE_SOCIETE);
            //Ext.getCmp('str_CODE_REGROUPEMENT').setValue(this.getOdatasource().str_CODE_REGROUPEMENT);
            //Ext.getCmp('str_CONTACTS_TELEPHONIQUES').setValue(this.getOdatasource().str_CONTACTS_TELEPHONIQUES);
            //Ext.getCmp('str_COMPTE_COMPTABLE').setValue(this.getOdatasource().str_COMPTE_COMPTABLE);
            Ext.getCmp('dbl_CHIFFRE_AFFAIRE').setValue(this.getOdatasource().dbl_CHIFFRE_AFFAIRE);
            //Ext.getCmp('str_DOMICIALIATION_BANCAIRE').setValue(this.getOdatasource().str_DOMICIALIATION_BANCAIRE);
            //Ext.getCmp('str_RIB_SOCIETE').setValue(this.getOdatasource().str_RIB_SOCIETE);
            Ext.getCmp('str_CODE_EXONERATION_TVA').setValue(this.getOdatasource().str_CODE_EXONERATION_TVA);
            //Ext.getCmp('str_CODE_REMISE').setValue(this.getOdatasource().str_CODE_REMISE);
            //Ext.getCmp('bool_CLIENT_EN_COMPTE').setValue(this.getOdatasource().bool_CLIENT_EN_COMPTE);
            //Ext.getCmp('bool_LIVRE').setValue(this.getOdatasource().bool_LIVRE);
            //Ext.getCmp('dbl_REMISE_SUPPLEMENTAIRE').setValue(this.getOdatasource().dbl_REMISE_SUPPLEMENTAIRE);
            //Ext.getCmp('dbl_MONTANT_PORT').setValue(this.getOdatasource().dbl_MONTANT_PORT);
            //Ext.getCmp('int_ECHEANCE_PAIEMENT').setValue(this.getOdatasource().int_ECHEANCE_PAIEMENT);
            //Ext.getCmp('bool_EDIT_FACTION_FIN_VENTE').setValue(this.getOdatasource().bool_EDIT_FACTION_FIN_VENTE);
            Ext.getCmp('str_CODE_FACTURE').setValue(this.getOdatasource().str_CODE_FACTURE);
            Ext.getCmp('str_CODE_BON_LIVRAISON').setValue(this.getOdatasource().str_CODE_BON_LIVRAISON);
            Ext.getCmp('str_RAISON_SOCIALE').setValue(this.getOdatasource().str_RAISON_SOCIALE);
            Ext.getCmp('str_ADRESSE_PRINCIPALE').setValue(this.getOdatasource().str_ADRESSE_PRINCIPALE);
            Ext.getCmp('str_AUTRE_ADRESSE').setValue(this.getOdatasource().str_AUTRE_ADRESSE);
            //Ext.getCmp('str_CODE_POSTAL').setValue(this.getOdatasource().str_CODE_POSTAL);
            Ext.getCmp('str_BUREAU_DISTRIBUTEUR').setValue(this.getOdatasource().str_BUREAU_DISTRIBUTEUR);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);
            Ext.getCmp('lg_ESCOMPTE_SOCIETE_ID').setValue(this.getOdatasource().lg_ESCOMPTE_SOCIETE_ID);
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 600,
            height: 500,
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
        if (Omode === "create") {
            internal_url = url_services_transaction_fichesociete + 'create';
        } else {
            internal_url = url_services_transaction_fichesociete + 'update&lg_FICHE_SOCIETE_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_CODE_INTERNE: Ext.getCmp('str_CODE_INTERNE').getValue(),
                str_LIBELLE_ENTREPRISE: Ext.getCmp('str_LIBELLE_ENTREPRISE').getValue(),
                //str_TYPE_SOCIETE: Ext.getCmp('str_TYPE_SOCIETE').getValue(), 
                //str_CODE_REGROUPEMENT: Ext.getCmp('str_CODE_REGROUPEMENT').getValue(),
                //str_CONTACTS_TELEPHONIQUES: Ext.getCmp('str_CONTACTS_TELEPHONIQUES').getValue(),
               // str_COMPTE_COMPTABLE: Ext.getCmp('str_COMPTE_COMPTABLE').getValue(),
                dbl_CHIFFRE_AFFAIRE: Ext.getCmp('dbl_CHIFFRE_AFFAIRE').getValue(),
                //str_DOMICIALIATION_BANCAIRE: Ext.getCmp('str_DOMICIALIATION_BANCAIRE').getValue(),
                //str_RIB_SOCIETE: Ext.getCmp('str_RIB_SOCIETE').getValue(),                               
                str_CODE_EXONERATION_TVA: Ext.getCmp('str_CODE_EXONERATION_TVA').getValue(),                
                //str_CODE_REMISE: Ext.getCmp('str_CODE_REMISE').getValue(),
                //bool_CLIENT_EN_COMPTE: Ext.getCmp('bool_CLIENT_EN_COMPTE').getValue(),
                //bool_LIVRE: Ext.getCmp('bool_LIVRE').getValue(),
                //dbl_REMISE_SUPPLEMENTAIRE: Ext.getCmp('dbl_REMISE_SUPPLEMENTAIRE').getValue(),
                //dbl_MONTANT_PORT: Ext.getCmp('dbl_MONTANT_PORT').getValue(), 
                //int_ECHEANCE_PAIEMENT: Ext.getCmp('int_ECHEANCE_PAIEMENT').getValue(),
                //bool_EDIT_FACTION_FIN_VENTE: Ext.getCmp('bool_EDIT_FACTION_FIN_VENTE').getValue(),
                str_CODE_FACTURE: Ext.getCmp('str_CODE_FACTURE').getValue(),
                str_CODE_BON_LIVRAISON: Ext.getCmp('str_CODE_BON_LIVRAISON').getValue(),
                str_RAISON_SOCIALE: Ext.getCmp('str_RAISON_SOCIALE').getValue(),
                str_ADRESSE_PRINCIPALE: Ext.getCmp('str_ADRESSE_PRINCIPALE').getValue(),                               
                str_AUTRE_ADRESSE: Ext.getCmp('str_AUTRE_ADRESSE').getValue(),                
                //str_CODE_POSTAL: Ext.getCmp('str_CODE_POSTAL').getValue(),
                str_BUREAU_DISTRIBUTEUR: Ext.getCmp('str_BUREAU_DISTRIBUTEUR').getValue(),
                lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue(),
                lg_ESCOMPTE_SOCIETE_ID: Ext.getCmp('lg_ESCOMPTE_SOCIETE_ID').getValue()
                

            },
            success: function (response)
            {
                //alert("succes");
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }else {
                    if(internal_url === url_services_transaction_fichesociete + 'create'){
                        Ext.MessageBox.alert('Creation fiche de societe', 'creation effectuee avec succes');
                        
                    }else{
                        Ext.MessageBox.alert('Modification fiche de societe', 'modification effectuee avec succes');
                       
                    }                                     
                }
                Oview.getStore().reload();
            },
            failure: function (response)
            {
                //alert("echec");
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
        this.up('window').close();
    } 
});