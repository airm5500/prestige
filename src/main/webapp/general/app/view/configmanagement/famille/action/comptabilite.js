var url_services_data_tauxrembourssement_famille = '../webservices/configmanagement/tauxrembourssement/ws_data.jsp';
//var url_services_data_codeacte_famille = '../webservices/configmanagement/codeacte/ws_data.jsp';
var url_services_data_tauxmarque_famille = '../webservices/configmanagement/tauxmarque/ws_data.jsp';
var url_services_data_famaillearticle_famille = '../webservices/configmanagement/famillearticle/ws_data.jsp';
//var url_services_data_codegestion_famille = '../webservices/configmanagement/codegestion/ws_data.jsp';
var url_services_data_famille = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;
var isBoolT_F;

Ext.define('testextjs.view.configmanagement.famille.action.comptabilite', {
    extend: 'Ext.window.Window',
    xtype: 'comptabilitefamille',
    id: 'comptabilitefamilleID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'testextjs.model.GroupeFamille',
        'testextjs.model.TauxMarque',
        'testextjs.model.Tauxrembourssement',
        //'testextjs.model.CodeActe'
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

      


        var store_tauxmarque_famille = new Ext.data.Store({
            model: 'testextjs.model.TauxMarque',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tauxmarque_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var store_tauxrembourssement_famille = new Ext.data.Store({
            model: 'testextjs.model.Tauxrembourssement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tauxrembourssement_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
    
        var form = new Ext.form.Panel({
            bodyPcomptabiliteing: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 110,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Informations Comptables Articles',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Prix.Achat.Tarif',
                            xtype: 'textfield',
                            maskRe: /[0-9.]/,
                            width: 400,
                            maxValue: 13,
                            emptyText: 'PRIX ACHAT TARIF',
                            name: 'int_PAT',
                            id: 'int_PAT'
                        },{                    
                        
                            fieldLabel: 'Prix.Vente',
                            width: 400,
                            maxValue: 13,
                            emptyText: 'PRIX VENTE',
                            name: 'int_PRICE',
                            id: 'int_PRICE'
                        },{
                            fieldLabel: 'Prix.Reference',
                            width: 400,
                            maxValue: 13,
                            emptyText: 'PRIX REFERENCE',
                            name: 'int_PRICE_TIPS',
                            id: 'int_PRICE_TIPS'
                        },{
                            fieldLabel: 'Marge.Brut',
                            width: 400,
                            maxValue: 13,
                            emptyText: 'PRIX REFERENCE',
                            name: 'dbl_MARGE_BRUTE',
                            id: 'dbl_MARGE_BRUTE'
                        },{
                            fieldLabel: 'Taux.Marge',
                            width: 400,
                            maxValue: 13,
                            emptyText: 'TAUX MARGE',
                            name: 'dbl_TAUX_MARGE',
                            id: 'dbl_TAUX_MARGE'
                        },{
                            fieldLabel: 'Contenance/1000',
                            width: 400,
                            maxValue: 13,
                            emptyText: 'CONTENANCE',
                            name: 'dbl_CONTENANCE_1000',
                            id: 'dbl_CONTENANCE_1000'
                        },{
                            fieldLabel: 'Unite.Achat',
                            width: 400,
                            maxValue: 13,
                            emptyText: 'UNITE ACHAT',
                            name: 'int_UNITE_ACHAT',
                            id: 'int_UNITE_ACHAT'
                        },{
                            fieldLabel: 'Unite.Vente',
                            width: 400,
                            maxValue: 13,
                            emptyText: 'UNITE VENTE',
                            name: 'int_UNITE_VENTE',
                            id: 'int_UNITE_VENTE'
                        },{
                            fieldLabel: 'Remise',
                            width: 400,
                            maxValue: 13,
                            emptyText: 'REMISE',
                            name: 'str_CODE_REMISE',
                            id: 'str_CODE_REMISE'
                        },
                         {
                            xtype: 'combobox',
                            fieldLabel: 'Taux.Marque',
                            name: 'lg_TAUX_MARQUE_ID',
                            width: 400,
                            id: 'lg_TAUX_MARQUE_ID',
                            store: store_tauxmarque_famille,
                            valueField: 'lg_TAUX_MARQUE_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un tauxmarque...'
                         },{
                            xtype: 'combobox',
                            fieldLabel: 'Taux.Remboursement',
                            name: 'lg_CODE_ACTE_ID',
                            width: 400,
                            id: 'lg_CODE_ACTE_ID',
                            store: store_tauxrembourssement_famille,
                            valueField: 'lg_CODE_ACTE_ID',
                            displayField: 'str_LIBELLEE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un Taux.Remboursement...'
                         }]
                        
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_FAMILLE_ID;

                       
            Ext.getCmp('str_CODE_REMISE').setValue(this.getOdatasource().str_CODE_REMISE);
            Ext.getCmp('str_CODE_ETIQUETTE').setValue(this.getOdatasource().str_CODE_ETIQUETTE);
//            Ext.getCmp('str_CODE_TVA').setValue(this.getOdatasource().str_CODE_TVA);
            Ext.getCmp('int_T').setValue(this.getOdatasource().int_T);
            Ext.getCmp('str_CODE_TAUX_REMBOURSEMENT').setValue(this.getOdatasource().str_CODE_TAUX_REMBOURSEMENT);
            Ext.getCmp('lg_CODE_ACTE_ID').setValue(this.getOdatasource().lg_CODE_ACTE_ID);
            Ext.getCmp('int_TAUX_MARQUE').setValue(this.getOdatasource().int_TAUX_MARQUE);
            Ext.getCmp('int_PAT').setValue(this.getOdatasource().int_PAT);
            Ext.getCmp('int_PRICE_TIPS').setValue(this.getOdatasource().int_PRICE_TIPS);
            Ext.getCmp('int_PRICE').setValue(this.getOdatasource().int_PRICE);           
            Ext.getCmp('int_QTEDETAIL').setValue(this.getOdatasource().int_QTEDETAIL);
            Ext.getCmp('int_PRICE_DETAIL').setValue(this.getOdatasource().int_PRICE_DETAIL);
            Ext.getCmp('bool_DECONDITIONNE').setValue(isBoolT_F);

    }
    
    /* buttons: [ {
                    text: 'Suivant >>',
                    handler: this.
               
                }] */

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 700,
            height: 500,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                },{
                    text: '<< Precedent',
                    handler: this.onAutreInfos
                },{
                    text: 'Terminer',
                    handler: this.onbtnsave
                }]
        });

    },
    
    onAutreInfos: function () {
        this.up('window').close();
        new testextjs.view.configmanagement.famille.action.autreinfos({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "AUTRES INFORMATIONS ARTICLES"
        });

    },
    onbtnsave: function () {


        var internal_url = "";


        if (Omode === "create") {
            internal_url = url_services_transaction_famille + 'create';
        } else {
            internal_url = url_services_transaction_famille + 'update&lg_FAMILLE_ID=' + ref;
        }

        //alert("ref  " + ref);



        Ext.Ajax.request({
            url: internal_url,
            params: {
                
                lg_CODE_GESTION_ID: Ext.getCmp('lg_CODE_GESTION_ID').getValue(),             
                str_CODE_REMISE: Ext.getCmp('str_CODE_REMISE').getValue(),
                str_CODE_ETIQUETTE: Ext.getCmp('str_CODE_ETIQUETTE').getValue(),
                str_CODE_TVA: Ext.getCmp('str_CODE_TVA').getValue(),
                int_T: Ext.getCmp('int_T').getValue(),
                str_CODE_TAUX_REMBOURSEMENT: Ext.getCmp('str_CODE_TAUX_REMBOURSEMENT').getValue(),
                lg_CODE_ACTE_ID: Ext.getCmp('lg_CODE_ACTE_ID').getValue(),
                int_TAUX_MARQUE: Ext.getCmp('int_TAUX_MARQUE').getValue(),
                int_PAT: Ext.getCmp('int_PAT').getValue(),
                int_PRICE_TIPS: Ext.getCmp('int_PRICE_TIPS').getValue(),
                int_PRICE: Ext.getCmp('int_PRICE').getValue(),
                str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                int_QTEDETAIL: Ext.getCmp('int_QTEDETAIL').getValue()
                

            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    if (internal_url === url_services_transaction_famille + 'create') {
                        Ext.MessageBox.alert('Creation article', 'creation effectuee avec succes');

                    } else {
                        Ext.MessageBox.alert('Modification article', 'modification effectuee avec succes');

                    }
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

        this.up('window').close();
    }
});