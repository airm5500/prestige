/* global Ext */

var url_services_data_zonegeo_famille = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_data_codeacte_famille = '../webservices/configmanagement/codeacte/ws_data.jsp';
var url_services_data_grossiste_famille = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_famaillearticle_famille = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_codegestion_famille = '../webservices/configmanagement/codegestion/ws_data.jsp';
var url_services_data_famille = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';
var url_services_data_typeetiquette = '../webservices/configmanagement/typeetiquette/ws_data.jsp';
var url_services_data_remise = '../webservices/configmanagement/remise/ws_data.jsp';
var url_services_data_codetva = '../webservices/sm_user/famille/ws_data_codetva.jsp';
var url_services_data_dci = '../webservices/configmanagement/famillearticle/ws_data_initial.jsp';
var url_services_data_dci_famille = '../webservices/configmanagement/dci/ws_data_dci_famille.jsp';
var url_services_transaction_dci_famille = '../webservices/configmanagement/dci/ws_transaction_dci_famille.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;
var isBoolT_F;
var type;
Ext.define('testextjs.view.configmanagement.famille.action.add2', {
    extend: 'Ext.window.Window',
    xtype: 'addfamille2',
    id: 'addfamille2ID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'testextjs.model.GroupeFamille',
        'testextjs.model.Grossiste',
        'testextjs.model.CodeGestion',
        'testextjs.model.CodeActe',
        'testextjs.view.commandemanagement.order.*'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        type: '',
        grossisteId: null
    },
    initComponent: function () {
        Oview = this.getParentview();
        ref = this.getOdatasource().lg_FAMILLE_ID;
        Omode = this.getMode();
        type = this.getType();
        Me = this;
        var itemsPerPage = 100;
        var store_zonegeo_famille = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
           pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/emplacement',
                //url: '../api/v1/common/rayons',
                //url: url_services_data_zonegeo_famille,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        var store_dci_famille = new Ext.data.Store({
            model: 'testextjs.model.Dci_famille',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_dci_famille + "?lg_FAMILLE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var store_dci = new Ext.data.Store({
            model: 'testextjs.model.Dci',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_dci,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_famillearticle_famille = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                //url: url_services_data_famaillearticle_famille,
                url: '../api/v1/common/famillearticle',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        var store_grossiste_famille = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                    url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_codetva = new Ext.data.Store({
            model: 'testextjs.model.CodeTva',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_codetva,
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
                    title: 'Information article',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code CIP',
                            xtype: 'textfield',
                            maskRe: /[0-9.]/, width: 400,
                            // AJOUT : Écouteur pour la touche "Entrée"
                            listeners: {
                                specialkey: function (field, e) {
                                    if (e.getKey() === e.ENTER) {
                                        Ext.getCmp('str_DESCRIPTION').focus(true, 10);
                                    }
                                }
                            },
                            /*autoCreate: {
                             tag: 'input',
                             maxlength: '7'
                             },*/
                            emptyText: 'Code CIP',
                            name: 'int_CIP',
                            id: 'int_CIP',
                            allowBlank: false

                        },
                       
                        {
                            fieldLabel: 'Designation',
                            width: 400,
                            emptyText: 'DESIGNATION',
                            name: 'str_DESCRIPTION',
                            id: 'str_DESCRIPTION',
                            allowBlank: false
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Emplacement',
                            name: 'lg_ZONE_GEO_ID',
                            width: 400,
                            id: 'lg_ZONE_GEO_ID',
                            store: store_zonegeo_famille,
                            pageSize: 100, //ajout la barre de pagination
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            allowBlank: false,
                            queryMode: 'remote', emptyText: 'Choisir un emplacement...'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Famille',
                            name: 'lg_FAMILLEARTICLE_ID',
                            width: 400,
                            id: 'lg_FAMILLEARTICLE_ID',
                            store: store_famillearticle_famille,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            pageSize: 20, //ajout la barre de pagination
                            allowBlank: false,
                            emptyText: 'Choisir une famille...'


                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Code TVA',
                            name: 'lg_CODE_TVA_ID',
                            width: 400,
                            id: 'lg_CODE_TVA_ID',
                            store: store_codetva,
                            valueField: 'lg_CODE_TVA_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            allowBlank: false,
                            queryMode: 'remote',
                            emptyText: 'Choisir un code TVA...'
                        },
                        
                        {
                            fieldLabel: 'Prix Achat',
                            xtype: 'textfield',
                            maskRe: /[0-9.]/,
                            width: 350,
                            emptyText: 'PRIX ACHAT',
                            name: 'int_PAF',
                            id: 'int_PAF',
                            allowBlank: false
                        },
                        {
                            fieldLabel: 'Prix.Achat.Tarif',
                            xtype: 'textfield',
                            maskRe: /[0-9.]/,
                            width: 350,
                            hidden: true,
                            emptyText: 'PRIX ACHAT TARIF',
                            name: 'int_PAT',
                            id: 'int_PAT'
                        },
                        {
                            fieldLabel: 'Prix.Vente',
                            xtype: 'textfield',
                            maskRe: /[0-9.]/,
                            width: 350,
                            emptyText: 'PRIX VENTE',
                            name: 'int_PRICE',
                            id: 'int_PRICE',
                            allowBlank: false,
                            enableKeyEvents: true

                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Grossiste',
                            name: 'lg_GROSSISTE_QUICK_ID',
                            width: 400,
                            id: 'lg_GROSSISTE_QUICK_ID',
                            store: store_grossiste_famille,
                            valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
                            allowBlank: false,
                            queryMode: 'remote',
                            pageSize: 20, //ajout la barre de pagination
                            emptyText: 'Choisir un grossiste...'
                        },
                         {
                            fieldLabel: 'Code EAN 13',
                            xtype: 'textfield',
                            maskRe: /[0-9.]/, width: 400,
                            /*autoCreate: {
                             tag: 'input',
                             maxlength: '7'
                             },*/
                            emptyText: 'Code EAN 13',
                            name: 'EAN',
                            id: 'EAN'
                            

                        },
                        {
                            fieldLabel: 'Code.Tableau',
                            xtype: 'textfield',
//                            maskRe: /[0-9.]/,
                            width: 350,
                            emptyText: 'CODE TABLEAU',
                            name: 'int_T',
                            id: 'int_T'
//                            allowBlank: false,

                        }
                        

                    ]
                }]
        });
 
        //Initialisation des valeur

        if (Omode === "update" || Omode === "decondition") {

            ref = this.getOdatasource().lg_FAMILLE_ID;

            Ext.getCmp('lg_GROSSISTE_QUICK_ID').setValue(this.getOdatasource().lg_GROSSISTE_ID);

            Ext.getCmp('int_PAT').setValue(this.getOdatasource().int_PAT);
            Ext.getCmp('int_PAF').setValue(this.getOdatasource().int_PAF);

            Ext.getCmp('int_PRICE').setValue(this.getOdatasource().int_PRICE);
            Ext.getCmp('lg_FAMILLEARTICLE_ID').setValue(this.getOdatasource().lg_FAMILLEARTICLE_ID);
            Ext.getCmp('lg_ZONE_GEO_ID').setValue(this.getOdatasource().lg_ZONE_GEO_ID);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('int_CIP').setValue(this.getOdatasource().int_CIP);

            Ext.getCmp('lg_CODE_TVA_ID').setValue(this.getOdatasource().lg_CODE_TVA_ID);

            Ext.getCmp('lg_CODE_TVA_ID').hide();
           
        }
        
        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 600,
            height: 410,
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
                }],
            listeners: {
                afterrender: function () {
                    
                    var comboEmplacement = Ext.getCmp('lg_ZONE_GEO_ID');
                    var comboFamille = Ext.getCmp('lg_FAMILLEARTICLE_ID');
                    var comboGrossiste = Ext.getCmp('lg_GROSSISTE_QUICK_ID');

                    //Recup emplacement par defaut
                    comboEmplacement.getStore().on('load', function (store) {
                        var defaultRecord = store.findRecord('libelle', 'Default');

                        if (defaultRecord && !defaultRecord.get('str_LIBELLEE')) {
                            defaultRecord.set('lg_ZONE_GEO_ID', defaultRecord.get('id'));
                            defaultRecord.set('str_LIBELLEE', defaultRecord.get('libelle'));
                        }
                        comboEmplacement.setValue('1');

                    }, this, {single: true});
                    comboEmplacement.getStore().load();

                    // Recup Famille par defaut
                    comboFamille.getStore().on('load', function (store) {
                        var defaultRecord = store.findRecord('libelle', 'SPECIALITES PUBLIQUES');

                        if (defaultRecord && !defaultRecord.get('str_LIBELLE')) {
                            defaultRecord.set('lg_FAMILLEARTICLE_ID', defaultRecord.get('id'));
                            defaultRecord.set('str_LIBELLE', defaultRecord.get('libelle'));
                        }
                        if (defaultRecord) { 
                            comboFamille.setValue(defaultRecord.get('lg_FAMILLEARTICLE_ID'));
                        }

                    }, this, {single: true});
                    comboFamille.getStore().load();

                    // Recup grossiste initiale de la commande
                    var grossisteIdFromParent = Me.getGrossisteId(); // On utilise 'Me' qui est une référence à notre fenêtre 'add2'
                    if (grossisteIdFromParent) {
                        comboGrossiste.getStore().load({
                            callback: function () {
                                comboGrossiste.setValue(grossisteIdFromParent);
                            }
                        });
                    }
                    
                },
                // NOUVEAUTÉ : On utilise l'événement 'show' pour gérer le focus
                show: function (window) {
                    Ext.defer(function () {
                        var cipField = window.down('#int_CIP');
                        if (cipField) {
                            cipField.focus(true, 100);
                        }
                    }, 100);
                }
            }

        });
    },
    onbtnsave: function (button) {
    var win = button.up('window'),
        form = win.down('form');

    if (form.isValid()) {
        var pafField = Ext.getCmp('int_PAF');
        var priceField = Ext.getCmp('int_PRICE');
        var pafValue = parseInt(pafField.getValue(), 10);
        var priceValue = parseInt(priceField.getValue(), 10);

        // 1. Contrôle : si le prix d'achat est supérieur au prix de vente
        if (pafValue > priceValue) {
            Ext.MessageBox.show({
                title: 'Erreur de saisie',
                msg: "Le prix d'achat ne peut pas être supérieur au prix de vente.",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function () {
                    pafField.focus(true, 100); // focus sur le champ du prix d'achat
                }
            });
            return;
        }

        // Si le contrôle des prix est validé, on continue l'enregistrement
        button.setDisabled(true);
        var internal_url = "";
        var int_PAT = 0;

        if (Omode === "create") {
            internal_url = url_services_transaction_famille + 'create';
            int_PAT = pafValue; // En mode création, le PAT est égal au PAF
        } else if (Omode === "update") {
            internal_url = url_services_transaction_famille + 'update&lg_FAMILLE_ID=' + ref;
            int_PAT = Ext.getCmp('int_PAT').getValue();
        }
        
        var str_DESCRIPTION = Ext.getCmp('str_DESCRIPTION').getValue();

        Ext.Ajax.request({
            url: internal_url,
            params: {
                lg_GROSSISTE_ID: Ext.getCmp('lg_GROSSISTE_QUICK_ID').getValue(),
                int_PAT: int_PAT,
                int_PAF: pafValue,
                int_PRICE: priceValue,
                lg_FAMILLEARTICLE_ID: Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue(),
                lg_ZONE_GEO_ID: Ext.getCmp('lg_ZONE_GEO_ID').getValue(),
                str_DESCRIPTION: str_DESCRIPTION,
                int_CIP: Ext.getCmp('int_CIP').getValue(),
                lg_CODE_TVA_ID: Ext.getCmp('lg_CODE_TVA_ID').getValue(),
                int_T: Ext.getCmp('int_T').getValue(),
                int_EAN13: Ext.getCmp('EAN').getValue()
            },
            success: function (response) {
                button.enable();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    win.close();

                    if (Omode === "create" || Omode === "update") {
                        if (type == "famillemanager") {
                            Ext.MessageBox.alert('Confirmation', object.errors);
                            testextjs.app.getController('App').onLoadNewComponent("famillemanager", "Fiche Article", "");
                        } else if (type == "commande") {
                            Ext.getCmp('str_NAME').setValue(str_DESCRIPTION);
                            Ext.getCmp('str_NAME').getStore().reload();
                            Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(object.ref);
                            Ext.MessageBox.alert('Confirmation', object.errors,
                                function () {
                                    Ext.getCmp('int_QUANTITE').focus();
                                    Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                });
                            Me_Window = Oview;
                        }
                    }
                }
            },
            failure: function (response) {
                button.enable();
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