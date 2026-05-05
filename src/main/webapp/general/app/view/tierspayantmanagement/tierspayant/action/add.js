/* global Ext */

var url_services_data_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';
var url_services_transaction_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_transaction.jsp?mode=';

var url_services_data_ville_tp = '../webservices/configmanagement/ville/ws_data.jsp';
var url_services_data_typetierspayant_tp = '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp';
var url_services_data_typecontrat_tp = '../webservices/configmanagement/typecontrat/ws_data.jsp';
var url_services_data_regimecaisse_tp = '../webservices/configmanagement/regimecaisse/ws_data.jsp';
var url_services_data_risque_tp = '../webservices/configmanagement/risque/ws_data.jsp';
var url_services_data_modelfacture_rp = '../webservices/tierspayantmanagement/tierspayant/ws_data_model.jsp';

var Oview;
var Omode;
var Me;
var ref;
//var str_PHOTO;

Ext.define('testextjs.view.tierspayantmanagement.tierspayant.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addtierspayant',
    id: 'addtierspayantID',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.OptimisationQuantite',
        'testextjs.model.CodeGestion',
        'testextjs.model.TypeTiersPayant',
        'testextjs.model.Regimecaisse',
        'testextjs.model.Risque',
        'testextjs.model.TypeContrat'
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

        var store_ville_tp = new Ext.data.Store({
            model: 'testextjs.model.Ville',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_ville_tp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var groupesStore = new Ext.data.Store({
            model: 'testextjs.model.GroupeModel',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/groupe/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });


        var store_modelfacture = new Ext.data.Store({
            model: 'testextjs.model.ModelFacture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_modelfacture_rp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_type_tp = new Ext.data.Store({
            model: 'testextjs.model.TypeTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typetierspayant_tp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_regime_tp = new Ext.data.Store({
            model: 'testextjs.model.Regimecaisse',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_regimecaisse_tp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_risque_tp = new Ext.data.Store({
            model: 'testextjs.model.Risque',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_risque_tp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_typecontrat_tp = new Ext.data.Store({
            model: 'testextjs.model.TypeContrat',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typecontrat_tp,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var form = new Ext.form.Panel({
            bodyPadding: 15,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    padding: 10
                },
                defaults: {
                    flex: 1
                },
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    title: 'Informations.Generales',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Nom Abrege',
                                    emptyText: 'Nom Abrege',
                                    name: 'str_NAME_ADD',
                                    id: 'str_NAME_ADD',
                                    style: 'background-color: #ffffe0;',
                                    listeners: {
                                        change: function (field, newValue) {
                                            // Récupérer les autres champs
                                            var fullnameField = Ext.getCmp('str_FULLNAME');
                                            var codeOrganismeField = Ext.getCmp('str_CODE_ORGANISME');

                                            // Mettre à jour leur valeur
                                            if (fullnameField) {
                                                fullnameField.setValue(newValue);
                                            }
                                            if (codeOrganismeField) {
                                                codeOrganismeField.setValue(newValue);
                                            }
                                        }
                                    }
                                    
                                },
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Nom complet',
                                    emptyText: 'Nom complet',
                                    name: 'str_FULLNAME',
                                    id: 'str_FULLNAME',
                                    style: 'background-color: #ffffe0;',
                                    //width: 500
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Code.Edit.Bordereau',
                                    displayField: 'str_VALUE',
                                    valueField: 'str_VALUE',
                                    id: 'str_CODE_EDIT_BORDEREAU',
                                    emptyText: 'Code.Edit.Bordereau',
                                    queryMode: 'remote',
                                    store: store_modelfacture


                                }
                                
                            ]
                        }, {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Adresse',
                                    emptyText: 'ADRESSE',
                                    name: 'str_ADRESSE',
                                    id: 'str_ADRESSE',
                                    style: 'background-color: #ffffe0;',
                                    value: 'ABJ'
                                },
                                {
                                    allowBlank: false,
                                    xtype: 'combobox',
                                    fieldLabel: 'Type.Tiers.Payant',
                                    name: 'lg_TYPE_TIERS_PAYANT_ID_ADD',
                                    id: 'lg_TYPE_TIERS_PAYANT_ID_ADD',
                                    store: store_type_tp,
                                    valueField: 'lg_TYPE_TIERS_PAYANT_ID',
                                    displayField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
//                                    typeAhead: true,
                                    editable: false,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un type tiers payant ...',
                                    style: 'background-color: #ffffe0;'
                                },
                                {
                                            // allowBlank: false,
                                            maskRe: /[0-9.]/,
                                            fieldLabel: 'Nbre.Exemplaire.Bord',
                                            emptyText: 'Nbre.Exemplaire.Bord',
                                            name: 'int_NBRE_EXEMPLAIRE_BORD',
                                            id: 'int_NBRE_EXEMPLAIRE_BORD',
                                            minValue: 1
                                        }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Telephone',
                                    emptyText: 'TELEPHONE',
                                    name: 'str_TELEPHONE',
                                    id: 'str_TELEPHONE',
                                    style: 'background-color: #ffffe0;',
                                    value: '225'
                                },
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Code.Organisme',
                                    emptyText: 'CODE ORGANISME',
                                    name: 'str_CODE_ORGANISME',
                                    id: 'str_CODE_ORGANISME',
                                    style: 'background-color: #ffffe0;',
                                    //width: 500
                                    
                                },
                                {

                                    fieldLabel: 'Code Officine',
                                    emptyText: 'Code Officine',
                                    name: 'str_CODE_OFFICINE',
                                    id: 'str_CODE_OFFICINE',
                                    //width: 500
                                }
                            ]
                        },

                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [

                                {
                                    //allowBlank: false,
                                    xtype: 'combobox',
                                    fieldLabel: 'Groupe',
                                    name: 'lg_GROUPE_ID',
                                    id: 'lg_GROUPE_ID',
                                    store: groupesStore,
                                    valueField: 'str_LIBELLE',
                                    displayField: 'str_LIBELLE',
                                    typeAhead: true,
//                                    width: 400,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un groupe...',
                                    listeners: {
                                        keypress: function (field, e) {
                                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                                if (field.getValue().length === 1) {
                                                    field.getStore().load();
                                                }
                                            }

                                        }
                                    }
                                },
                                {
                                    // allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Nbre Bons à facturer',
                                    emptyText: 'Nbre Bons à facturer',
                                    name: 'nbrbons',
                                    id: 'nbrbons'
                                },
                                {

                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Montant Facture',
                                    emptyText: 'Montant Facture',
                                    name: 'montantFact',
                                    id: 'montantFact'
                                }


                            ]
                        },

                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [

                                {

                                    xtype: 'checkbox',
                                    fieldLabel: 'Grouper les factures par taux',
                                    name: 'groupingByTaux',
                                    id: 'groupingByTaux'
                                },
                                {

                                    fieldLabel: 'Compte Contribuable',
                                    emptyText: 'Compte Contribuable',
                                    name: 'str_COMPTE_CONTRIBUABLE',
                                    id: 'str_COMPTE_CONTRIBUABLE'
                                },

                                {

                                    fieldLabel: 'Registre de Commerce',
                                    emptyText: 'Registre de Commerce',
                                    name: 'str_REGISTRE_COMMERCE',
                                    id: 'str_REGISTRE_COMMERCE'
                                }

                            ]
                        }



                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    title: 'Informations.Supplementaire',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [

                                {
                                    // allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Taux.Remboursement',
                                    emptyText: 'Taux.Remboursement',
                                    name: 'dbl_TAUX_REMBOURSEMENT',
                                    id: 'dbl_TAUX_REMBOURSEMENT'
                                },
                                {
                                    // allowBlank: false,
                                    fieldLabel: 'N0 Caisse Officiel',
                                    emptyText: 'N0 Caisse Officiel',
                                    name: 'str_NUMERO_CAISSE_OFFICIEL',
                                    id: 'str_NUMERO_CAISSE_OFFICIEL'
                                },
                                {
                                    // allowBlank: false,
                                    fieldLabel: 'Code Comptable',
                                    emptyText: 'Code Comptable',
                                    name: 'str_CODE_COMPTABLE',
                                    id: 'str_CODE_COMPTABLE'
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    // allowBlank: false,
                                    fieldLabel: 'Centre payeur',
                                    emptyText: 'Centre payeur',
                                    name: 'str_CENTRE_PAYEUR',
                                    id: 'str_CENTRE_PAYEUR'
                                },
                                {
                                    //  allowBlank: false,
                                    fieldLabel: 'Code Regroupement',
                                    emptyText: 'Code Regroupement',
                                    name: 'str_CODE_REGROUPEMENT',
                                    id: 'str_CODE_REGROUPEMENT'
                                },
                                {
                                    //  allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Seuil minimum',
                                    emptyText: 'Seuil minimum',
                                    name: 'dbl_SEUIL_MINIMUM',
                                    id: 'dbl_SEUIL_MINIMUM'
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                // int_NUMERO_DECOMPTE*
                                {
                                    // allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'N0 Decompte',
                                    emptyText: 'N0 Decompte',
                                    name: 'int_NUMERO_DECOMPTE',
                                    id: 'int_NUMERO_DECOMPTE'
                                },
                                // str_CODE_PAIEMENT
                                {
                                    // allowBlank: false,
                                    fieldLabel: 'Code Paiement',
                                    emptyText: 'Code Paiement',
                                    name: 'str_CODE_PAIEMENT',
                                    id: 'str_CODE_PAIEMENT'
                                },
                                // dt_DELAI_PAIEMENT
                                {
                                    //xtype: 'datefield',
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Date delai paiement',
                                    name: 'dt_DELAI_PAIEMENT',
                                    id: 'dt_DELAI_PAIEMENT'
                                    // allowBlank: false
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                // dbl_POURCENTAGE_REMISE*
                                {
                                    // allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Pourcentage.Remise',
                                    emptyText: 'POURCENTAGE_REMISE',
                                    name: 'dbl_POURCENTAGE_REMISE',
                                    id: 'dbl_POURCENTAGE_REMISE'
                                },
                                {
                                    // allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Remise.Forfetaire',
                                    emptyText: 'REMISE_FORFETAIRE',
                                    name: 'dbl_REMISE_FORFETAIRE',
                                    id: 'dbl_REMISE_FORFETAIRE'
                                },
                                {
                                    //allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Mobile',
                                    emptyText: 'Mobile',
                                    name: 'str_MOBILE',
                                    id: 'str_MOBILE'
                                }
                                /* {
                                 // allowBlank: false,
                                 fieldLabel: 'Code.Edit.Bordereau',
                                 emptyText: 'Code.Edit.Bordereau',
                                 name: 'str_CODE_EDIT_BORDEREAU',
                                 id: 'str_CODE_EDIT_BORDEREAU'
                                 }*/
                            ]
                        },
                        ,
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    defaultType: 'textfield',
                                    margin: '0 0 5 0',
                                    items: [
                                        // dbl_POURCENTAGE_REMISE*
                                        ,
                                        {
                                    // allowBlank: false,
                                    fieldLabel: 'No IDF',
                                    emptyText: 'No IDF',
                                    name: 'str_NUMERO_IDF_ORGANISME',
                                    id: 'str_NUMERO_IDF_ORGANISME'
                                },
                                        {
                                            // allowBlank: false,
                                            maskRe: /[0-9.]/,
                                            fieldLabel: 'Periodicite.edit.bord',
                                            emptyText: 'Periodicite.edit.bord',
                                            name: 'int_PERIODICITE_EDIT_BORD',
                                            id: 'int_PERIODICITE_EDIT_BORD'
                                        },
                                        {
                                            // int_DATE_DERNIERE_EDITION
                                            maskRe: /[0-9.]/,
                                            fieldLabel: 'Date.derniere.edition',
                                            name: 'int_DATE_DERNIERE_EDITION',
                                            id: 'int_DATE_DERNIERE_EDITION'
                                                    // allowBlank: false
                                        }
                                    ]
                                },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                // dbl_MONTANT_F_CLIENT*
                                {
                                    // allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Montant F Client',
                                    emptyText: 'Montant F Client',
                                    name: 'dbl_MONTANT_F_CLIENT',
                                    id: 'dbl_MONTANT_F_CLIENT'
                                },
                                {
                                    // allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Base Remise',
                                    emptyText: 'Base Remise',
                                    name: 'dbl_BASE_REMISE',
                                    id: 'dbl_BASE_REMISE'
                                },
                                {
                                    fieldLabel: 'Code Doc Comptoire',
                                    emptyText: 'Code Doc Comptoire',
                                    name: 'str_CODE_DOC_COMPTOIRE',
                                    id: 'str_CODE_DOC_COMPTOIRE'
                                }
                            ]
                        }
                        ,
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 30 0',
                            items: [
                                {
                                    // allowBlank: false,
                                    fieldLabel: 'Mail',
                                    emptyText: 'MAIL',
                                    name: 'str_MAIL',
                                    id: 'str_MAIL'
                                },
                                {
                                    //  allowBlank: false,
                                    xtype: 'checkbox',
                                    fieldLabel: 'Prepayer',
                                    emptyText: 'Prepayer',
                                    name: 'bool_IsACCOUNT',
                                    id: 'bool_IsACCOUNT',
                                    listeners: {
                                        change: function (checkbox, newValue, oldValue, eOpts) {
                                            if (newValue) {
                                                //alert("value vrai " + newValue);
                                                Ext.getCmp('int_ACCOUNT').show();
                                                Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').disable();
                                                Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').setValue(0);
                                            } else {
                                                //alert("value faux " + newValue);

                                                // Ext.getCmp('int_ENCOURS').show();
                                                Ext.getCmp('int_ACCOUNT').hide();
                                                Ext.getCmp('int_ACCOUNT').setValue(0);
                                                Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').enable();
                                            }
                                        }
                                    }
                                }

                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '-25 0 5 0',
                            items: [
                                {
                                    // allowBlank: false,
                                    xtype: 'combobox',
                                    fieldLabel: 'Risque',
                                    name: 'lg_RISQUE_ID',
                                    id: 'lg_RISQUE_ID',
                                    store: store_risque_tp,
                                    valueField: 'lg_RISQUE_ID',
                                    displayField: 'str_LIBELLE_RISQUE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un risque...'
                                },
                                {
                                    // allowBlank: false,
                                    xtype: 'combobox',
                                    fieldLabel: 'Type.Contrat',
                                    name: 'lg_TYPE_CONTRAT_ID',
                                    id: 'lg_TYPE_CONTRAT_ID',
                                    store: store_typecontrat_tp,
                                    valueField: 'lg_TYPE_CONTRAT_ID',
                                    displayField: 'str_LIBELLE_TYPE_CONTRAT',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un type contrat...'
                                },
                                {
                                    //  allowBlank: false,
                                    xtype: 'combobox',
                                    fieldLabel: 'Regime.Caisse',
                                    name: 'lg_REGIMECAISSE_ID',
                                    id: 'lg_REGIMECAISSE_ID',
                                    store: store_regime_tp,
                                    valueField: 'lg_REGIMECAISSE_ID',
                                    displayField: 'str_LIBELLEREGIMECAISSE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un regime caisse...'
                                }
                            ]},
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    // allowBlank: false,
                                    xtype: 'checkbox',
                                    fieldLabel: 'Interdiction',
                                    emptyText: 'Interdiction',
                                    name: 'bool_INTERDICTION',
                                    id: 'bool_INTERDICTION'
                                },
                                // bool_PRENUM_FACT_SUBROGATOIRE
                                {
                                    //allowBlank: false,
                                    xtype: 'checkbox',
                                    fieldLabel: 'Fact.Subrogatoire',
                                    emptyText: 'Fact.Subrogatoire',
                                    name: 'bool_PRENUM_FACT_SUBROGATOIRE',
                                    id: 'bool_PRENUM_FACT_SUBROGATOIRE'
                                },
                                // str_CODE_DOC_COMPTOIRE
                                {
                                    // allowBlank: false,
                                    xtype: 'checkbox',
                                    fieldLabel: 'Active',
                                    emptyText: 'Active',
                                    name: 'bool_ENABLED',
                                    id: 'bool_ENABLED'
                                }
                            ]
                        },

                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [

                                {
                                    //allowBlank: false,
                                    xtype: 'combobox',
                                    fieldLabel: 'Ville',
                                    name: 'lg_VILLE_ID',
                                    id: 'lg_VILLE_ID',
                                    store: store_ville_tp,
                                    valueField: 'lg_VILLE_ID',
                                    displayField: 'STR_NAME',
                                    typeAhead: true,
//                                    width: 400,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir une ville...',
                                    listeners: {
                                        keypress: function (field, e) {
                                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                                if (field.getValue().length === 1) {
                                                    field.getStore().load();
                                                }
                                            }

                                        }
                                    }
                                },
                                {

                                    xtype: 'checkbox',
                                    fieldLabel: 'Utilise la cmu',
                                    name: 'cmu',
                                    id: 'cmu'
                                }
                                ,
                                {

                                    maskRe: /[0-9.]/,
                                    fieldLabel: 'Caution',
                                    name: 'caution',
                                    id: 'caution'
                                }
                            ]
                        }
                    ]

                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    title: 'Informations sur le compte',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Caution',
                                    emptyText: 'Caution',
                                    name: 'dbl_CAUTION',
                                    id: 'dbl_CAUTION',
                                    value: 0
                                },
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Quota',

                                    emptyText: 'Quota',
                                    name: 'dbl_QUOTA_CONSO_MENSUELLE',
                                    id: 'dbl_QUOTA_CONSO_MENSUELLE',
                                    selectOnFocus: true,
                                    value: 0
                                },
                                {
                                    allowBlank: false,

                                    fieldLabel: 'Plafond credit',
                                    emptyText: 'Plafond credit',
                                    name: 'dbl_PLAFOND_CREDIT',
                                    id: 'dbl_PLAFOND_CREDIT',
                                    selectOnFocus: true,
                                    value: 0
                                },

                                {
                                    xtype: 'checkbox',
                                    boxLabel: 'Le plafond est-il absolu ?',
                                    name: 'b_IsAbsolute',
                                    checked: false,
                                    id: 'b_IsAbsolute'

                                },

                                {
                                    allowBlank: false,
                                    fieldLabel: 'Accompte',
                                    emptyText: 'Accompte',
                                    hidden: true,
                                    name: 'int_ACCOUNT',
                                    id: 'int_ACCOUNT',
                                    value: 0
                                }

                            ]
                        }
                    ]
                }
            ]

        });
        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_TIERS_PAYANT_ID;

            Ext.getCmp('str_CODE_ORGANISME').setValue(this.getOdatasource().str_CODE_ORGANISME);
            Ext.getCmp('str_NAME_ADD').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_FULLNAME').setValue(this.getOdatasource().str_FULLNAME);

            Ext.getCmp('str_ADRESSE').setValue(this.getOdatasource().str_ADRESSE);
            Ext.getCmp('str_MOBILE').setValue(this.getOdatasource().str_MOBILE);
            Ext.getCmp('str_TELEPHONE').setValue(this.getOdatasource().str_TELEPHONE);
            Ext.getCmp('str_MAIL').setValue(this.getOdatasource().str_MAIL);
            Ext.getCmp('str_CODE_OFFICINE').setValue(this.getOdatasource().str_CODE_OFFICINE);
            Ext.getCmp('str_COMPTE_CONTRIBUABLE').setValue(this.getOdatasource().str_COMPTE_CONTRIBUABLE);

            Ext.getCmp('str_REGISTRE_COMMERCE').setValue(this.getOdatasource().str_REGISTRE_COMMERCE);
            Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').setValue(this.getOdatasource().dbl_QUOTA_CONSO_MENSUELLE);


            Ext.getCmp('dbl_PLAFOND_CREDIT').setValue(this.getOdatasource().dbl_PLAFOND_CREDIT);
            Ext.getCmp('dbl_TAUX_REMBOURSEMENT').setValue(this.getOdatasource().dbl_TAUX_REMBOURSEMENT);

            Ext.getCmp('str_NUMERO_IDF_ORGANISME').setValue(this.getOdatasource().str_NUMERO_IDF_ORGANISME);
            Ext.getCmp('str_NUMERO_CAISSE_OFFICIEL').setValue(this.getOdatasource().str_NUMERO_CAISSE_OFFICIEL);
            Ext.getCmp('str_CENTRE_PAYEUR').setValue(this.getOdatasource().str_CENTRE_PAYEUR);
            Ext.getCmp('str_CODE_REGROUPEMENT').setValue(this.getOdatasource().str_CODE_REGROUPEMENT);

            Ext.getCmp('dbl_SEUIL_MINIMUM').setValue(this.getOdatasource().dbl_SEUIL_MINIMUM);
            Ext.getCmp('bool_INTERDICTION').setValue(this.getOdatasource().bool_INTERDICTION);
            Ext.getCmp('str_CODE_COMPTABLE').setValue(this.getOdatasource().str_CODE_COMPTABLE);
            Ext.getCmp('bool_PRENUM_FACT_SUBROGATOIRE').setValue(this.getOdatasource().bool_PRENUM_FACT_SUBROGATOIRE);
            Ext.getCmp('int_NUMERO_DECOMPTE').setValue(this.getOdatasource().int_NUMERO_DECOMPTE);
            Ext.getCmp('str_CODE_PAIEMENT').setValue(this.getOdatasource().str_CODE_PAIEMENT);

            Ext.getCmp('dt_DELAI_PAIEMENT').setValue(this.getOdatasource().dt_DELAI_PAIEMENT);
            Ext.getCmp('dbl_POURCENTAGE_REMISE').setValue(this.getOdatasource().dbl_POURCENTAGE_REMISE);
            Ext.getCmp('dbl_REMISE_FORFETAIRE').setValue(this.getOdatasource().dbl_REMISE_FORFETAIRE);
            Ext.getCmp('str_CODE_EDIT_BORDEREAU').setValue(this.getOdatasource().lg_MODEL_FACTURE_ID);
            Ext.getCmp('int_NBRE_EXEMPLAIRE_BORD').setValue(this.getOdatasource().int_NBRE_EXEMPLAIRE_BORD);
            Ext.getCmp('int_PERIODICITE_EDIT_BORD').setValue(this.getOdatasource().int_PERIODICITE_EDIT_BORD);

            Ext.getCmp('int_DATE_DERNIERE_EDITION').setValue(this.getOdatasource().int_DATE_DERNIERE_EDITION);
            Ext.getCmp('str_NUMERO_IDF_ORGANISME').setValue(this.getOdatasource().str_NUMERO_IDF_ORGANISME);
            Ext.getCmp('dbl_MONTANT_F_CLIENT').setValue(this.getOdatasource().dbl_MONTANT_F_CLIENT);
            Ext.getCmp('dbl_BASE_REMISE').setValue(this.getOdatasource().dbl_BASE_REMISE);
            Ext.getCmp('str_CODE_DOC_COMPTOIRE').setValue(this.getOdatasource().str_CODE_DOC_COMPTOIRE);
            Ext.getCmp('bool_ENABLED').setValue(this.getOdatasource().bool_ENABLED);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);
            Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID_ADD').setValue(this.getOdatasource().lg_TYPE_TIERS_PAYANT_ID);
            Ext.getCmp('lg_TYPE_CONTRAT_ID').setValue(this.getOdatasource().lg_TYPE_CONTRAT_ID);
            Ext.getCmp('lg_REGIMECAISSE_ID').setValue(this.getOdatasource().lg_REGIMECAISSE_ID);
            Ext.getCmp('lg_RISQUE_ID').setValue(this.getOdatasource().lg_RISQUE_ID);
            Ext.getCmp('bool_IsACCOUNT').setValue(this.getOdatasource().bool_IsACCOUNT);
            Ext.getCmp('dbl_CAUTION').setValue(this.getOdatasource().dbl_CAUTION);
            Ext.getCmp('lg_GROUPE_ID').setValue(this.getOdatasource().lgGROUPEID);
            Ext.getCmp('montantFact').setValue(this.getOdatasource().montantFact);
            Ext.getCmp('nbrbons').setValue(this.getOdatasource().nbrbons);
            Ext.getCmp('groupingByTaux').setValue(this.getOdatasource().groupingByTaux);
            Ext.getCmp('cmu').setValue(this.getOdatasource().cmu);
            Ext.getCmp('caution').setValue(this.getOdatasource().caution);
            
            Ext.getCmp('dbl_CAUTION').disable();

            Ext.getCmp('bool_IsACCOUNT').hide();
            Ext.getCmp('b_IsAbsolute').setValue(this.getOdatasource().b_IsAbsolute);
        }


        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: '85%',
            height: 620,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            maximizable: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Retour',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    }, onbtnsave: function (button) {


        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var dbl_QUOTA_CONSO_MENSUELLE = 0;
        if (Ext.getCmp('bool_IsACCOUNT').getValue()) {

            dbl_QUOTA_CONSO_MENSUELLE = Ext.getCmp('int_ACCOUNT').getValue();
        } else {
            dbl_QUOTA_CONSO_MENSUELLE = Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').getValue();

        }



        if (formulaire.isValid()) {

            if (Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID_ADD').getValue() == "1" && Ext.getCmp('bool_IsACCOUNT').getValue() == "true") {
                Ext.MessageBox.alert('Error Message', "Un tiers payant de type assurance ne peut pas beneficier du prepayer");
                return;
            }

            var internal_url = "";


            if (Omode === "create") {

                internal_url = url_services_transaction_tierspayant + 'create';

                //alert("CREATION DE TP OK");

            } else {
                internal_url = url_services_transaction_tierspayant + 'update&lg_TIERS_PAYANT_ID=' + ref;
            }
            var lg_GROUPE_ID = Ext.getCmp('lg_GROUPE_ID').getValue();

            if (lg_GROUPE_ID === null && lg_GROUPE_ID === '') {
                lg_GROUPE_ID = '';
            }


            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                params: {
                    str_CODE_ORGANISME: Ext.getCmp('str_CODE_ORGANISME').getValue(),
                    str_NAME: Ext.getCmp('str_NAME_ADD').getValue(),
                    str_FULLNAME: Ext.getCmp('str_FULLNAME').getValue(),
                    str_ADRESSE: Ext.getCmp('str_ADRESSE').getValue(),
                    str_MOBILE: Ext.getCmp('str_MOBILE').getValue(),
                    str_TELEPHONE: Ext.getCmp('str_TELEPHONE').getValue(),
                    str_MAIL: Ext.getCmp('str_MAIL').getValue(),
                    dbl_QUOTA_CONSO_MENSUELLE: dbl_QUOTA_CONSO_MENSUELLE,
                    dbl_CAUTION: Ext.getCmp('dbl_CAUTION').getValue(),
                    bool_IsACCOUNT: Ext.getCmp('bool_IsACCOUNT').getValue(),
                    dbl_PLAFOND_CREDIT: Ext.getCmp('dbl_PLAFOND_CREDIT').getValue(),
                    dbl_TAUX_REMBOURSEMENT: Ext.getCmp('dbl_TAUX_REMBOURSEMENT').getValue(),
                    str_NUMERO_CAISSE_OFFICIEL: Ext.getCmp('str_NUMERO_CAISSE_OFFICIEL').getValue(),
                    str_CENTRE_PAYEUR: Ext.getCmp('str_CENTRE_PAYEUR').getValue(),
                    str_CODE_REGROUPEMENT: Ext.getCmp('str_CODE_REGROUPEMENT').getValue(),
                    dbl_SEUIL_MINIMUM: Ext.getCmp('dbl_SEUIL_MINIMUM').getValue(),
                    bool_INTERDICTION: Ext.getCmp('bool_INTERDICTION').getValue(),
                    str_CODE_COMPTABLE: Ext.getCmp('str_CODE_COMPTABLE').getValue(),
                    bool_PRENUM_FACT_SUBROGATOIRE: Ext.getCmp('bool_PRENUM_FACT_SUBROGATOIRE').getValue(),
                    int_NUMERO_DECOMPTE: Ext.getCmp('int_NUMERO_DECOMPTE').getValue(),
                    str_CODE_PAIEMENT: Ext.getCmp('str_CODE_PAIEMENT').getValue(),
                    dt_DELAI_PAIEMENT: Ext.getCmp('dt_DELAI_PAIEMENT').getValue(),
                    dbl_POURCENTAGE_REMISE: Ext.getCmp('dbl_POURCENTAGE_REMISE').getValue(),
                    dbl_REMISE_FORFETAIRE: Ext.getCmp('dbl_REMISE_FORFETAIRE').getValue(),
                    str_CODE_EDIT_BORDEREAU: Ext.getCmp('str_CODE_EDIT_BORDEREAU').getValue(),
                    int_NBRE_EXEMPLAIRE_BORD: Ext.getCmp('int_NBRE_EXEMPLAIRE_BORD').getValue(),
                    int_PERIODICITE_EDIT_BORD: Ext.getCmp('int_PERIODICITE_EDIT_BORD').getValue(),
                    int_DATE_DERNIERE_EDITION: Ext.getCmp('int_DATE_DERNIERE_EDITION').getValue(),
                    str_NUMERO_IDF_ORGANISME: Ext.getCmp('str_NUMERO_IDF_ORGANISME').getValue(),
                    dbl_MONTANT_F_CLIENT: Ext.getCmp('dbl_MONTANT_F_CLIENT').getValue(),
                    dbl_BASE_REMISE: Ext.getCmp('dbl_BASE_REMISE').getValue(),
                    str_CODE_DOC_COMPTOIRE: Ext.getCmp('str_CODE_DOC_COMPTOIRE').getValue(),
                    bool_ENABLED: Ext.getCmp('bool_ENABLED').getValue(),
                    lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue(),
                    lg_TYPE_TIERS_PAYANT_ID: Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID_ADD').getValue(),
                    lg_TYPE_CONTRAT_ID: Ext.getCmp('lg_TYPE_CONTRAT_ID').getValue(),
                    lg_REGIMECAISSE_ID: Ext.getCmp('lg_REGIMECAISSE_ID').getValue(),
                    lg_RISQUE_ID: Ext.getCmp('lg_RISQUE_ID').getValue(),
                    str_REGISTRE_COMMERCE: Ext.getCmp('str_REGISTRE_COMMERCE').getValue(),
                    str_CODE_OFFICINE: Ext.getCmp('str_CODE_OFFICINE').getValue(),
                    str_COMPTE_CONTRIBUABLE: Ext.getCmp('str_COMPTE_CONTRIBUABLE').getValue(),
                    b_IsAbsolute: Ext.getCmp('b_IsAbsolute').getValue(),
                    lg_GROUPE_ID: lg_GROUPE_ID,
                    montantFact: Ext.getCmp('montantFact').getValue(),
                    nbrbons: Ext.getCmp('nbrbons').getValue(),
                    groupingByTaux: Ext.getCmp('groupingByTaux').getValue(),
                    cmu: Ext.getCmp('cmu').getValue(),
                    caution: Ext.getCmp('caution').getValue()
                },
                success: function (response)
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
                failure: function (response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);

                    Ext.MessageBox.alert('Error Message', response.responseText);

                }
            });

        } else {
            Ext.MessageBox.show({
                title: 'Averstissement',
                msg: 'Veuillez renseigner les champs obligatoires',
                // width: 300,
                height: 150,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
        }
    }
});