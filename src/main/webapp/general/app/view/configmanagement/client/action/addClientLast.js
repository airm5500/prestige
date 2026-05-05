/* global Ext */

var url_services_data_client = '../webservices/configmanagement/client/ws_data.jsp';
var url_services_transaction_client = '../webservices/configmanagement/client/ws_transaction.jsp?mode=';
var url_services_data_ville_client = '../webservices/configmanagement/ville/ws_data.jsp';
var url_services_data_medecin_client = '../webservices/configmanagement/medecin/ws_data.jsp';
var url_services_data_typeclient_client = '../webservices/configmanagement/typeclient/ws_data.jsp';
var url_services_data_categorie_ayant_droit = '../webservices/configmanagement/categorieayantdroit/ws_data.jsp';
var url_services_data_risque = '../webservices/configmanagement/risque/ws_data.jsp';
var url_services_data_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';
var url_services_data_type_tierspayant = '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp';
var Oview;
var Omode;
var Me;
var ref;
var dbl_CAUTION;
var db_PLAFOND_ENCOURS;
var dbl_SOLDE = 0;
var type;
var lg_TYPE_TIERS_PAYANT_ID;
var dtDateNaiss;
Ext.define('testextjs.view.configmanagement.client.action.addClientLast', {
    extend: 'Ext.window.Window',
    xtype: 'addclientlast',
    id: 'addclientlastID',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.TypeClient',
        'testextjs.view.sm_user.doventeretrocession.*',
        'testextjs.view.stockmanagement.dodepot.*',
        'testextjs.model.Ville',
        'testextjs.model.CategoryClient',
        'testextjs.model.caisse.Remise'
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
        var remise = new Ext.data.Store({
            model: 'testextjs.model.caisse.Remise',
            pageSize: null,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/remises-client',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var itemsPerPage = 20;
        var store_categorie_client = new Ext.data.Store({
            model: 'testextjs.model.Company',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/comapnies/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        /*
        var store_tierspays = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_tierspayant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        */
       
       var searchstore = Ext.create('Ext.data.Store', {
            idProperty: 'lgTIERSPAYANTID',
            fields:
                    [
                        {name: 'lgTIERSPAYANTID',
                            type: 'string'

                        },

                        {name: 'strFULLNAME',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/client/tiers-payants',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
            

        });
        
       
        var store_type_tierspays = new Ext.data.Store({
            model: 'testextjs.model.TypeTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_type_tierspayant,
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
//            flex: 1,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [
                {
                    xtype: 'container',
                    flex: 1,
                    layout: {
                        type: 'hbox',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'fieldset',
                            title: 'Information Client',
                            defaultType: 'textfield',
                            flex: 1,
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
                                    // allowBlank: false,
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {
                                            dtDateNaiss = me.getSubmitValue();
                                        }
                                    }
                                },
                                {
                                    fieldLabel: 'Securite Social',
                                    emptyText: 'SECURITE SOCIALE',
                                    name: 'str_NUMERO_SECURITE_SOCIAL',
                                    id: 'str_NUMERO_SECURITE_SOCIAL'/*,
                                     allowBlank: false*/
                                },
                                {
                                    fieldLabel: 'Adresse',
                                    emptyText: 'ADRESSE',
                                    name: 'str_ADRESSE',
//                            allowBlank: false,
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
//                            typeAhead: true,
                                    editable: false,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir une ville...'
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Type Client',
                                    name: 'lg_TYPE_TIERS_PAYANT_ID',
                                    id: 'lg_TYPE_TIERS_PAYANT_ID',
//                            disabled: true,
                                    store: store_type_tierspays,
                                    valueField: 'lg_TYPE_TIERS_PAYANT_ID',
                                    displayField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
//                            typeAhead: true,
                                    editable: false,
                                    allowBlank: false,
                                    queryMode: 'remote',
                                    emptyText: 'Selectionner un type client...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();
                                            var FieldsInfoAyantDroitID = Ext.getCmp('InfoAyantDroitID');
                                            if (value === "1") {
                                                FieldsInfoAyantDroitID.show();
                                                Ext.getCmp('int_POURCENTAGE').setValue(1);
                                                Ext.getCmp('int_POURCENTAGE').enable();
                                                Ext.getCmp('lg_COMPANY_ID').show();
                                                    Ext.getCmp('remiseId').hide();
                                                
                                                
                                            } else {
                                                FieldsInfoAyantDroitID.hide();
                                                Ext.getCmp('lg_COMPANY_ID').hide();
                                                Ext.getCmp('int_POURCENTAGE').setValue(100);
                                                Ext.getCmp('int_POURCENTAGE').disable();
                                              Ext.getCmp('remiseId').show();
                                            }
                                            var CmboTierspayant = Ext.getCmp('lg_TIERS_PAYANT_ID');
                                            CmboTierspayant.enable();
                                            CmboTierspayant.getStore().getProxy().url = "../api/v1/client/tiers-payants?lg_TYPE_TIERS_PAYANT_ID=" + value;
                                            CmboTierspayant.getStore().reload();
                                        }

                                    }
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Société',
                                    name: 'lg_COMPANY_ID',
                                    id: 'lg_COMPANY_ID',
                                    store: store_categorie_client,
                                    valueField: 'lg_COMPANY_ID',
                                    displayField: 'str_RAISONSOCIALE',
                                    allowBlank: true,
                                    queryMode: 'remote',
                                    emptyText: 'Selectionner une Société...'

                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Type.Client',
                                    name: 'lg_TYPE_CLIENT_ID',
                                    id: 'lg_TYPE_CLIENT_ID',
                                    hidden: true,
                                    store: store_typeclient_cltadd,
                                    valueField: 'lg_TYPE_CLIENT_ID',
                                    displayField: 'str_NAME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    //  allowBlank: false,
                                    emptyText: 'Choisir un type de client...'

                                }
                                ,
                                {xtype: 'splitter'},
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Remise',
                                    name: 'remiseId',
                                    id: 'remiseId',
                                    store: remise,
                                    editable: false,
                                    pageSize: null,
                                    hidden: true,
                                    valueField: 'lgREMISEID',
                                    displayField: 'strNAME',
                                    flex: 1,
                                    queryMode: 'remote',
                                    enableKeyEvents: true,
                                    emptyText: 'Choisir une remise...'
                                }


                            ]

                        },
                        {
                            xtype: 'container',
                            flex: 1,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    flex: 1,
                                    title: 'Infos sur le tiers payant principal',
                                    id: 'InfosCltTierspayantID',
                                    defaultType: 'textfield',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [
                                        {
                            xtype: 'combobox',
                            name: 'lg_TIERS_PAYANT_ID',
                            id: 'lg_TIERS_PAYANT_ID',
                            itemId: 'tiersPayantId',
                            disabled: true,
                            flex: 1,
                            store: searchstore,
                            pageSize: 9999,
                            valueField: 'lgTIERSPAYANTID',
                            displayField: 'strFULLNAME',
//                    minChars: 2,
                            queryMode: 'remote',
                            enableKeyEvents: true,
                            emptyText: 'Selectionner tiers payant...',
                            listConfig: {
                                loadingText: 'Recherche...',
                                emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                                getInnerTpl: function () {
                                    return '<span>{strFULLNAME}</span>';
                                }

                            }
                        },
                                        /*
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Tiers payant',
                                            name: 'lg_TIERS_PAYANT_ID',
                                            id: 'lg_TIERS_PAYANT_ID',
                                            disabled: true,
                                            store: store_tierspays,
                                            valueField: 'lg_TIERS_PAYANT_ID',
                                            displayField: 'str_FULLNAME',
                                            pageSize: 20, //ajout la barre de pagination
                                            typeAhead: true,
                                            allowBlank: false,
                                            queryMode: 'remote',
                                            minChars: 3,
                                            emptyText: 'Choisir un tiers payant...',
                                            enableKeyEvents: true,
                                            listeners: {
                                                specialKey: function (field, e) {
                                                    if (e.getKey() === e.BACKSPACE || e.getKey() === 46 || e.getKey() === 8) {

                                                        if (field.getValue().length === 1) {
                                                            field.getStore().load();
                                                        }
                                                    }

                                                }
                                            }
                                        }
                                        */,
                                        {
                                            fieldLabel: 'Pourcentage',
                                            emptyText: 'Pourcentage',
                                            name: 'int_POURCENTAGE',
                                            id: 'int_POURCENTAGE',
                                            allowBlank: false,
                                            minValue: 0,
                                            maxValue: 100,
                                            maskRe: /[0-9.]/
                                        }, {

                                            xtype: 'container',
                                            layout: 'hbox',
                                            items: [{
                                                    xtype: 'displayfield',
                                                    margin: 2,
                                                    value: 'Plafond sur encours',
                                                    flex: 1.2
                                                },
                                                {
                                                    xtype: 'textfield',
                                                    name: 'db_PLAFOND_ENCOURS',
                                                    id: 'db_PLAFOND_ENCOURS',
                                                    margin: 2,
                                                    emptyText: 'Plafond sur encours',
                                                    value: 0,
                                                    selectOnFocus: true,
                                                    maskRe: /[0-9.]/,
                                                    flex: 0.8
                                                }, {
                                                    xtype: 'checkbox',
                                                    margin: 2,
                                                    name: 'b_IsAbsolute',
                                                    checked: false,
                                                    id: 'b_IsAbsolute',
                                                    flex: 0.2
                                                },
                                                {
                                                    xtype: 'displayfield',
                                                    margin: 2,
                                                    labelAlign: 'right',
                                                    value: 'Le plafond est-il absolu ?',
                                                    flex: 1
                                                }


                                            ]
                                        },
                                        {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            items: [{
                                                    name: 'dbl_PLAFOND',
                                                    id: 'dbl_PLAFOND',
                                                    fieldLabel: 'Plafond Vente',
                                                    value: 0,
                                                    flex: 1,
                                                    xtype: 'textfield',
                                                    selectOnFocus: true,
                                                    emptyText: 'Plafond Vente',
                                                    maskRe: /[0-9.]/
                                                }

                                            ]
                                        },
                                        {
                                            fieldLabel: 'Priorite',
                                            emptyText: 'Priorite',
                                            name: 'int_PRIORITY',
                                            id: 'int_PRIORITY',
                                            value: 1,
                                            hidden: true,
                                            minValue: 0,
                                            maskRe: /[0-9.]/
                                        }
                                    ]
                                }
                                ,

                                {
                                    xtype: 'fieldset',
                                    flex: 1,
                                    title: 'Infos.Ayant.Droit',
                                    id: 'InfoAyantDroitID',
                                    hidden: true,
                                    flex: 0.6,
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
                                }
                            ]

                        }




                    ]

                },
            
            ]
        });
        if (Omode === "update") {

            ref = this.getOdatasource().lg_CLIENT_ID;
            Ext.getCmp('remiseId').setValue(this.getOdatasource().remiseId);
            Ext.getCmp('str_FIRST_NAME').setValue(this.getOdatasource().str_FIRST_NAME);
            Ext.getCmp('str_LAST_NAME').setValue(this.getOdatasource().str_LAST_NAME);
            Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').setValue(this.getOdatasource().str_NUMERO_SECURITE_SOCIAL);
            //Ext.getCmp('str_CODE_INTERNE').hide();
            Ext.getCmp('str_CODE_INTERNE').setValue(this.getOdatasource().str_CODE_INTERNE);
            Ext.getCmp('lg_COMPANY_ID').setValue((this.getOdatasource().lg_COMPANY_ID !== '' ? this.getOdatasource().lg_COMPANY_ID : null));
            Ext.getCmp('str_SEXE').hide();
            str_SEXE = this.getOdatasource().str_SEXE;
            //  Ext.getCmp('str_SEXE').setValue(this.getOdatasource().str_SEXE);
            Ext.getCmp('str_ADRESSE').setValue(this.getOdatasource().str_ADRESSE);
            Ext.getCmp('str_CODE_POSTAL').setValue(this.getOdatasource().str_CODE_POSTAL);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);
            //  Ext.getCmp('lg_MEDECIN_ID').setValue(this.getOdatasource().lg_MEDECIN_ID);
            Ext.getCmp('lg_TYPE_CLIENT_ID').setValue(this.getOdatasource().lg_TYPE_CLIENT_ID);
            Ext.getCmp('dt_NAISSANCE').setValue(this.getOdatasource().dt_NAISSANCE);
            dbl_CAUTION = this.getOdatasource().dbl_CAUTION;
            //   db_PLAFOND_ENCOURS = this.getOdatasource().db_PLAFOND_ENCOURS; //a decommenter en cas de probleme 16/08/2016
            Ext.getCmp('db_PLAFOND_ENCOURS').setValue(this.getOdatasource().db_PLAFOND_ENCOURS);
            Ext.getCmp('dbl_PLAFOND').setValue(this.getOdatasource().dbl_PLAFOND);
            Ext.getCmp('b_IsAbsolute').setValue(this.getOdatasource().b_IsAbsolute);
            dbl_SOLDE = this.getOdatasource().dbl_SOLDE_BIS;
            Ext.getCmp('int_POURCENTAGE').setValue(this.getOdatasource().int_POURCENTAGE);
            Ext.getCmp('int_PRIORITY').setValue(this.getOdatasource().int_PRIORITY);
            Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID').setValue(this.getOdatasource().lg_TYPE_TIERS_PAYANT_ID);
            Ext.getCmp('lg_TIERS_PAYANT_ID').enable();
            Ext.getCmp('lg_TIERS_PAYANT_ID').setValue(this.getOdatasource().lg_TIERS_PAYANT_ID);
            Ext.getCmp('InfoAyantDroitID').hide();


            if (this.getOdatasource().lg_TYPE_TIERS_PAYANT_ID === "Carnet") {
                 Ext.getCmp('remiseId').show();
                Ext.getCmp('InfosCltTierspayantID').show();
                Ext.getCmp('int_POURCENTAGE').disable();
                Ext.getCmp('lg_TIERS_PAYANT_ID').getStore().getProxy().url = "../api/v1/client/tiers-payants?lg_TYPE_TIERS_PAYANT_ID=" + this.getOdatasource().lg_TYPE_TIERS_PAYANT_ID;
                Ext.getCmp('lg_TIERS_PAYANT_ID').getStore().reload();
            } else {
                Ext.getCmp('InfosCltTierspayantID').hide();
            }


            Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID').hide();
            // Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID').setValue(this.getOdatasource().lg_TYPE_TIERS_PAYANT_ID);

            if (this.getOdatasource().lg_TYPE_CLIENT_ID === "Confrere" || this.getOdatasource().lg_TYPE_CLIENT_ID === "Proprietaire" || this.getOdatasource().lg_TYPE_CLIENT_ID === "Depot") {

                Ext.getCmp('InfosCltTierspayantID').hide();
            }
            Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID').setValue(this.getOdatasource().lg_CATEGORIE_AYANTDROIT_ID);
            Ext.getCmp('lg_RISQUE_ID').setValue(this.getOdatasource().lg_RISQUE_ID);
        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 600,
            width: '70%',
            modal: true,
            layout: {
                type: 'fit'

            },
            
            minWidth: 280,
//            plain: true,
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
    onbtnsave: function (button) {
        var internal_url = "";
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (formulaire.isValid()) {
            if (Omode === "create") {
                internal_url = url_services_transaction_client + 'create';
                testextjs.app.getController('App').ShowWaitingProcess();
                Ext.Ajax.request({
                    url: internal_url,
                    params: {
                        // lg_CLIENT_ID : Ext.getCmp('lg_CLIENT_ID').getValue(),
                        lg_TYPE_TIERS_PAYANT_ID: Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID').getValue(),
                        lg_COMPANY_ID: (Ext.getCmp('lg_COMPANY_ID') !== null ? Ext.getCmp('lg_COMPANY_ID').getValue() : ""),
                        str_CODE_INTERNE: Ext.getCmp('str_CODE_INTERNE').getValue(),
                        str_FIRST_NAME: Ext.getCmp('str_FIRST_NAME').getValue(),
                        str_LAST_NAME: Ext.getCmp('str_LAST_NAME').getValue(),
                        str_SEXE: Ext.getCmp('str_SEXE').getValue(),
                        str_NUMERO_SECURITE_SOCIAL: Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').getValue(),
                        str_ADRESSE: Ext.getCmp('str_ADRESSE').getValue(),
                        str_CODE_POSTAL: Ext.getCmp('str_CODE_POSTAL').getValue(),
                        lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue(),
                        //  lg_MEDECIN_ID: Ext.getCmp('lg_MEDECIN_ID').getValue(),
//                    lg_TYPE_CLIENT_ID: Ext.getCmp('lg_TYPE_CLIENT_ID').getValue(),
                        lg_TYPE_CLIENT_ID: "6",
                        //dbl_SOLDE: Me.onsplitovalue(Ext.getCmp('dbl_SOLDE').getValue()),
                        db_PLAFOND_ENCOURS: Ext.getCmp('db_PLAFOND_ENCOURS').getValue(),
                        dbl_PLAFOND: Ext.getCmp('dbl_PLAFOND').getValue(),
//                    dbl_CAUTION: Ext.getCmp('dbl_CAUTION').getValue(),
                        dbl_SOLDE: 0,
                        lg_CATEGORIE_AYANTDROIT_ID: Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID').getValue(),
                        lg_RISQUE_ID: Ext.getCmp('lg_RISQUE_ID').getValue(),
                        dt_NAISSANCE: dtDateNaiss,
                        lg_TIERS_PAYANT_ID: Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                        int_POURCENTAGE: Ext.getCmp('int_POURCENTAGE').getValue(),
                        int_PRIORITY: Ext.getCmp('int_PRIORITY').getValue(),
                        b_IsAbsolute: Ext.getCmp('b_IsAbsolute').getValue(),
                        remiseId: Ext.getCmp('remiseId').getValue()

                    },
                    success: function (response)
                    {
                        testextjs.app.getController('App').StopWaitingProcess();
                        var object = Ext.JSON.decode(response.responseText, false);
                        // alert(object.success);
                        if (object.success === "0") {
                            Ext.MessageBox.alert('Error Message', object.errors);
                            return;
                        } else {
                            Ext.MessageBox.alert('Confirmation', object.errors);
                            if (type === "clientmanager") {
                                Ext.MessageBox.alert('Confirmation', object.errors);
                                fenetre.close();
                                Me_Workflow = Oview;
                                Me_Workflow.getStore().reload();
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
                        testextjs.app.getController('App').StopWaitingProcess();
                        var object = Ext.JSON.decode(response.responseText, false);
                        console.log("Bug " + response.responseText);
                        Ext.MessageBox.alert('Error Message', response.responseText);
                    }
                });
            } else {
                internal_url = url_services_transaction_client + 'update&lg_CLIENT_ID=' + ref;
                testextjs.app.getController('App').ShowWaitingProcess();
                Ext.Ajax.request({
                    url: internal_url,
                    params: {
                        // lg_CLIENT_ID : Ext.getCmp('lg_CLIENT_ID').getValue(),
                        str_CODE_INTERNE: Ext.getCmp('str_CODE_INTERNE').getValue(),
                        str_FIRST_NAME: Ext.getCmp('str_FIRST_NAME').getValue(),
                        str_LAST_NAME: Ext.getCmp('str_LAST_NAME').getValue(),
                        str_SEXE: str_SEXE,
                        str_NUMERO_SECURITE_SOCIAL: Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').getValue(),
                        str_ADRESSE: Ext.getCmp('str_ADRESSE').getValue(),
                        str_CODE_POSTAL: Ext.getCmp('str_CODE_POSTAL').getValue(),
                        lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue(),
                        // lg_MEDECIN_ID: Ext.getCmp('lg_MEDECIN_ID').getValue(),
                        lg_TYPE_CLIENT_ID: Ext.getCmp('lg_TYPE_CLIENT_ID').getValue(),
                        dbl_CAUTION: dbl_CAUTION,
                        dbl_SOLDE: dbl_SOLDE,
                        lg_CATEGORIE_AYANTDROIT_ID: Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID').getValue(),
                        lg_RISQUE_ID: Ext.getCmp('lg_RISQUE_ID').getValue(),
                        dt_NAISSANCE: Ext.getCmp('dt_NAISSANCE').getValue(),
                        lg_TIERS_PAYANT_ID: Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                        int_POURCENTAGE: Ext.getCmp('int_POURCENTAGE').getValue(),
                        int_PRIORITY: Ext.getCmp('int_PRIORITY').getValue(),
                        db_PLAFOND_ENCOURS: Ext.getCmp('db_PLAFOND_ENCOURS').getValue(),
                        dbl_PLAFOND: Ext.getCmp('dbl_PLAFOND').getValue(),
                        b_IsAbsolute: Ext.getCmp('b_IsAbsolute').getValue(),
                        modeupdate: true, // mis pour la modification du plafond du RC1
                        lg_COMPANY_ID: (Ext.getCmp('lg_COMPANY_ID') !== null ? Ext.getCmp('lg_COMPANY_ID').getValue() : ""),
                        remiseId: Ext.getCmp('remiseId').getValue()

                    },
                    success: function (response)
                    {
                        testextjs.app.getController('App').StopWaitingProcess();
                        var object = Ext.JSON.decode(response.responseText, false);
//                     alert(object.success);
                        if (object.success === "0") {
                            Ext.MessageBox.alert('Error Message', object.errors);
                            return;
                        } else {
                            Ext.MessageBox.alert('Confirmation', object.errors);
                            if (type === "clientmanager") {
                                Ext.MessageBox.alert('Confirmation', object.errors);
                                fenetre.close();
                                Me_Workflow = Oview;
                                Me_Workflow.getStore().reload();
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
                        testextjs.app.getController('App').StopWaitingProcess();
                        var object = Ext.JSON.decode(response.responseText, false);
                        console.log("Bug " + response.responseText);
                        Ext.MessageBox.alert('Error Message', response.responseText);
                    }
                });
            }
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

    ,
    onsplitovalue: function (Ovalue) {
        var int_ovalue;
        var string = Ovalue.split(" ");
        int_ovalue = string[0];
        return int_ovalue;
    }
});
