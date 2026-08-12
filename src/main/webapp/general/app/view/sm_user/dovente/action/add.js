/* global Ext, LaborexWorkFlow */

var url_services_transaction_client_add = '../webservices/configmanagement/client/ws_transaction.jsp?mode=';

var Oview_add;
var Omode_add;
var Me_add;
var ref;
var dbl_CAUTION;
var dbl_QUOTA_CONSO_MENSUELLE;
var dbl_SOLDE = 0;

var lg_TYPE_TIERS_PAYANT_ID;
var lg_AYANTS_DROITS_ID;


var OCust_num_ss_add;
var OCust_str_nom_add;
var OCust_str_prenom_add;
var OCust_str_id_add;
var OCust_compte_id_add;
var OFieldProduct;
var str_COMPTE_CLIENT_ID;
var OCust_ad_nom;
var OCust_ad_prenom;
var OvalueTypeClient_search;

var OCust_tp_ro_taux;
var OCust_tp_ro_id;
var OCust_ad_ID;
var OCust_ad_ss;


Ext.define('testextjs.view.sm_user.dovente.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addaddclient',
    id: 'addaddclientID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        type: '',
        nameintern: ''
    },
    initComponent: function () {
        Me_add = this;
        var itemsPerPage = 20;
        Oview_add = this.getParentview();
        Omode_add = this.getMode();
        OvalueTypeClient_search = this.getNameintern();


        var url_services_data_ville_client_add = '../webservices/configmanagement/ville/ws_data.jsp',
                url_services_data_clttierpayant_add_create = '../webservices/configmanagement/compteclienttierspayant/ws_data_tierspayant_create.jsp',
                url_services_data_categorie_ayant_droit_add = '../webservices/configmanagement/categorieayantdroit/ws_data.jsp',
                url_services_data_risque_add = '../webservices/configmanagement/risque/ws_data.jsp',
                url_services_data_typeclient_client_add = '../webservices/configmanagement/typeclient/ws_data.jsp',
                url_services_data_customer = '../webservices/configmanagement/client/ws_customer.jsp';
        //fin liste des urls

        //liste des stores
        var store_ville_add = LaborexWorkFlow.BuildStore('testextjs.model.Ville', itemsPerPage, url_services_data_ville_client_add, false),
                store_tierspays_add = LaborexWorkFlow.BuildStore('testextjs.model.TiersPayant', itemsPerPage, url_services_data_clttierpayant_add_create + "?lg_TYPE_TIERS_PAYANT_ID=" + OvalueTypeClient_search, false),
                store_categorie_ayant_droit_add = LaborexWorkFlow.BuildStore('testextjs.model.CategorieAyantdroit', itemsPerPage, url_services_data_categorie_ayant_droit_add, false),
                store_categorie_risque_add = LaborexWorkFlow.BuildStore('testextjs.model.Risque', itemsPerPage, url_services_data_risque_add, false),
                store_typeclient_cltadd_add = LaborexWorkFlow.BuildStore('testextjs.model.TypeClient', itemsPerPage, url_services_data_typeclient_client_add + "?str_TYPE=CLIENT", false);
        //fin liste des stores


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            height: '1000',
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
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
                            xtype: 'fieldset',
                            collapsible: true,
                            width: '60%',
                            title: 'Information Client',
                            flex: 1,
                            defaultType: 'textfield',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    fieldLabel: 'Code Interne',
                                    emptyText: 'CODE INTERNE',
                                    name: 'str_CODE_INTERNE',
                                    id: 'str_CODE_INTERNE_add',
                                    hidden: true

                                },
                                {
                                    fieldLabel: 'Nom',
                                    emptyText: 'NOM',
                                    name: 'str_FIRST_NAME',
                                    allowBlank: false,
                                    id: 'str_FIRST_NAME_add',
                                    enableKeyEvents: true,
                                    listeners: {
                                      
                                        specialKey: function (field, e, options) {

                                            if (e.getKey() === e.ENTER) {
                                                if (field.getValue().length > 0) {
                                                    Ext.getCmp('str_LAST_NAME_add').focus();
                                                }
                                            }
                                        }


                                    }



                                }, {
                                    fieldLabel: 'Prénom',
                                    emptyText: 'PRENOMS',
                                    name: 'str_LAST_NAME',
                                    allowBlank: false,
                                    id: 'str_LAST_NAME_add',
                                    enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {

                                            if (e.getKey() === e.ENTER) {
                                                if (field.getValue().length > 0) {
                                                    Ext.getCmp('dt_NAISSANCE_add').focus();
                                                }
                                            }
                                        }


                                    }

                                },
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Date de naissance',
                                    emptyText: 'Date de naissance',
                                    name: 'dt_NAISSANCE',
                                    id: 'dt_NAISSANCE_add',
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y',
                                    maxValue: new Date(),
                                    enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {

                                            if (e.getKey() === e.ENTER) {

                                                Ext.getCmp('str_NUMERO_SECURITE_SOCIAL_add').focus();

                                            }
                                        }

                                    }
                                },
                                {
                                    fieldLabel: 'Matricule/ SS',
                                    emptyText: 'NUMERO MATRICULE',
//                                    allowBlank: false,
                                    name: 'str_NUMERO_SECURITE_SOCIAL',
                                    id: 'str_NUMERO_SECURITE_SOCIAL_add',
                                    enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {

                                            if (e.getKey() === e.ENTER) {
                                                
                                                    Ext.getCmp('str_ADRESSE_add').focus();
                                                
                                            }
                                        }

                                    }
                                },
                                {
                                    fieldLabel: 'Adresse',
                                    emptyText: 'ADRESSE',
                                    name: 'str_ADRESSE',
                                    id: 'str_ADRESSE_add',
                                     enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {

                                            if (e.getKey() === e.ENTER) {
                                                
                                                    Ext.getCmp('str_CODE_POSTAL_add').focus();
                                                
                                            }
                                        }

                                    }
                                },
                                {
                                    fieldLabel: 'Code Postal',
                                    emptyText: 'CODE POSTAL',
                                    name: 'str_CODE_POSTAL',
                                    id: 'str_CODE_POSTAL_add',
                                     enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {

                                            if (e.getKey() === e.ENTER) {
                                                
                                                    Ext.getCmp('str_SEXE_add').focus();
                                                
                                            }
                                        }

                                    }
                                },
                                {
                                    xtype: 'radiogroup',
                                    fieldLabel: 'Genre',
                                    id: 'str_SEXE_add',
                                    items: [
                                        {boxLabel: 'Féminin', name: 'str_SEXE', inputValue: 'F'},
                                        {boxLabel: 'Masculin', name: 'str_SEXE', inputValue: 'M'}
                                    ]
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Ville',
                                    name: 'lg_VILLE_ID',
                                    id: 'lg_VILLE_ID_add',
                                    store: store_ville_add,
                                    valueField: 'lg_VILLE_ID',
                                    displayField: 'STR_NAME',
                                    editable: false,
//                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir une ville...'
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Type.Client',
                                    name: 'lg_TYPE_CLIENT_ID',
                                    id: 'lg_TYPE_CLIENT_ID_add',
                                    store: store_typeclient_cltadd_add,
                                    valueField: 'lg_TYPE_CLIENT_ID',
                                    displayField: 'str_NAME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    allowBlank: false,
                                    emptyText: 'Choisir un type de client...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();
                                            var CmboTierspayant_add = Ext.getCmp('lg_TIERS_PAYANT_ID_add');
                                            //alert(value);


                                            CmboTierspayant_add.enable();
                                            if (value === "1") {//assurance
                                                Ext.getCmp('int_POURCENTAGE_add').show();
                                                Ext.getCmp('int_PRIORITY_add').show();
                                                Ext.getCmp('lg_TIERS_PAYANT_ID_add').show();
                                                Ext.getCmp('InfoAyantDroitID_add').show();
                                                Ext.getCmp('InfoAtiersPayanttID_add').show();

                                            } else if (value === "2") {//carnet


                                                Ext.getCmp('int_POURCENTAGE_add').hide();
                                                Ext.getCmp('int_PRIORITY_add').hide();
                                                Ext.getCmp('InfoAyantDroitID_add').hide();
                                                Ext.getCmp('lg_TIERS_PAYANT_ID_add').hide();
                                                Ext.getCmp('InfoAtiersPayanttID_add').hide();
                                                Ext.getCmp('InfosCltTierspayantRcID_add').hide();




                                                Ext.getCmp('int_POURCENTAGE_add').show();
                                                Ext.getCmp('int_PRIORITY_add').show();
                                                Ext.getCmp('lg_TIERS_PAYANT_ID_add').show();
                                                //  Ext.getCmp('InfoAyantDroitID_add').show();
                                                Ext.getCmp('InfoAtiersPayanttID_add').show();


                              
                                                Ext.getCmp('int_POURCENTAGE_add').setValue(0);
                                                Ext.getCmp('int_PRIORITY_add').setValue(1);
                                                //  Ext.getCmp('lg_TIERS_PAYANT_ID_add').setValue(0);
                                                Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID_add').setValue(0);
                                                Ext.getCmp('lg_RISQUE_ID_add').setValue(0);


                                            } else if (value === "6") { //Standard
                                                Ext.getCmp('int_POURCENTAGE_add').hide();
                                                Ext.getCmp('int_PRIORITY_add').hide();
                                                Ext.getCmp('InfoAyantDroitID_add').hide();
                                                Ext.getCmp('lg_TIERS_PAYANT_ID_add').hide();
                                                Ext.getCmp('InfoAtiersPayanttID_add').hide();
                                                Ext.getCmp('InfosCltTierspayantRcID_add').hide();

                                                Ext.getCmp('int_POURCENTAGE_add').setValue(0);
                                                Ext.getCmp('int_PRIORITY_add').setValue(0);
                                                Ext.getCmp('lg_TIERS_PAYANT_ID_add').setValue(0);
                                                Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID_add').setValue(0);
                                                Ext.getCmp('lg_RISQUE_ID_add').setValue(0);
                                                //lg_RISQUE_ID_add

                                            }

                                        }

                                    }
                                }]

                        }, {
                            xtype: 'container',
                            layout: 'vbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            width: '40%',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    collapsible: true,
                                    width: '100%',
                                    title: 'Infos.Ayant.Droit',
                                    id: 'InfoAyantDroitID_add',
                                    defaultType: 'textfield',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [{
                                            xtype: 'combobox',
                                            fieldLabel: 'Categorie Ayant Droit',
                                            name: 'lg_CATEGORIE_AYANTDROIT_ID',
                                            id: 'lg_CATEGORIE_AYANTDROIT_ID_add',
                                            store: store_categorie_ayant_droit_add,
                                            valueField: 'lg_CATEGORIE_AYANTDROIT_ID',
                                            displayField: 'str_LIBELLE_CATEGORIE_AYANTDROIT',
                                            typeAhead: true,
                                            value: 'Aide medicale gratuite avec sécurite sociale',
                                            flex: 1,
                                            queryMode: 'remote',
                                            emptyText: 'Choisir une categorie d ayant droit...'
                                        }, {
                                            xtype: 'combobox',
                                            fieldLabel: 'Risque',
                                            name: 'lg_RISQUE_ID',
                                            id: 'lg_RISQUE_ID_add',
                                            store: store_categorie_risque_add,
                                            valueField: 'lg_RISQUE_ID',
                                            displayField: 'str_LIBELLE_RISQUE',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            value: 'Risque Normal',
                                            flex: 1,
                                            emptyText: 'Choisir un risque...'
                                        }]
                                },
                                {
                                    xtype: 'fieldset',
                                    collapsible: true,
                                    width: '100%',
                                    title: 'Infos.Tiers.Payant.RO',
                                    id: 'InfoAtiersPayanttID_add',
                                    defaultType: 'textfield',
                                    defaults: {
                                        anchor: '100%'
                                    }, items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Tiers payant',
                                            name: 'lg_TIERS_PAYANT_ID',
                                            id: 'lg_TIERS_PAYANT_ID_add',
                                            //disabled: true,
                                            flex: 1,
                                            store: store_tierspays_add,
                                            valueField: 'lg_TIERS_PAYANT_ID',
//                                            displayField: 'str_NAME', // a decommenter en cas de probleme
                                            displayField: 'str_FULLNAME',
                                            enableKeyEvents: true,
                                            pageSize: 20, //ajout la barre de pagination
                                            typeAhead: true,
//                                            editable: false, //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                                            queryMode: 'remote',
                                            flex: 1,
                                            minChars: 3,
                                            emptyText: 'Choisir un tiers payant...',
                                            listeners: {
//                                                keypress: function(field, e) { // a decommenter en cas de probleme
                                                specialKey: function (field, e) {
//                                                    alert("field.getValue().length"+e.getKey());
                                                    if (e.getKey() === e.BACKSPACE || e.getKey() === 46 || e.getKey() === 8) {

                                                        if (field.getValue().length == 1) {
                                                            field.getStore().load();
                                                        }
                                                        // alert(e.BACKSPACE);
                                                    }

                                                },
                                                select: function (cmp) {
                                                    // var cmp_val = cmp.getValue();
                                                    //  Ext.getCmp('btn_validate').enable();

                                                }
                                            }
                                        },
                                        {
                                            xtype: 'numberfield',
                                            fieldLabel: 'Pourcentage',
                                            emptyText: 'Pourcentage',
                                            name: 'int_POURCENTAGE',
                                            id: 'int_POURCENTAGE_add',
                                            // value: 0,
                                            minValue: 0,
                                            maxValue: 100,
                                            maskRe: /[0-100.]/,
                                            listeners: {
                                                'render': function (cmp) {
                                                    cmp.getEl().on('Keydown', function (e) {
                                                        //   alert(cmp.getValue());
                                                    });
                                                }

                                            }
                                        }, {
                                            name: 'dbl_QUOTA_CONSO_MENSUELLE',
                                            id: 'dbl_QUOTA_CONSO_MENSUELLE_add',
                                            fieldLabel: 'Plafond',
                                            hidden: true,
                                            flex: 1,
                                            value: 0,
                                            selectOnFocus: true,
                                            emptyText: 'Plafond',
                                            maskRe: /[0-9.]/
                                        }, {
                                            name: 'dbl_QUOTA_CONSO_VENTE_add',
                                            id: 'dbl_QUOTA_CONSO_VENTE_add',
                                            fieldLabel: 'Plafond Vente',
                                            flex: 1,
                                            value: 0,
                                            selectOnFocus: true,
                                            maskRe: /[0-9.]/
                                        },
                                        {

                                            xtype: 'container',
                                            layout: 'hbox',

                                            items: [{
                                                    xtype: 'displayfield',
                                                    margin: 2,
                                                    value: 'Plafond sur encours',
                                                    flex: 1.4
                                                },

                                                {
                                                    xtype: 'textfield',
                                                    name: 'db_PLAFOND_ENCOURS_add',
                                                    id: 'db_PLAFOND_ENCOURS_add',
                                                    margin: 2,

                                                    value: 0,
                                                    selectOnFocus: true,
                                                    maskRe: /[0-9.]/,
                                                    flex: 1
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
                                                    flex: 1.4
                                                }


                                            ]
                                        },

                                        {
                                            fieldLabel: 'Priorite',
                                            emptyText: 'Priorite',
                                            name: 'int_PRIORITY',
                                            xtype: 'displayfield',
                                            id: 'int_PRIORITY_add',
                                            value: 1,
                                            minValue: 1,
                                            maskRe: /[0-9.]/
                                        }
                                    ]}, {
                                    text: 'Creer Client',
                                    // width: '20%',
                                    //disabled: true,
                                    id: 'btn_create_customer',
                                    margins: '0 0 0 6',
                                    xtype: 'button',
                                    handler: function () {
                                        Me_add.onbtnsave_add();
                                    }

                                },
                                {
                                    xtype: 'fieldset',
                                    collapsible: true,
                                    flex: 1,
                                    title: 'Infos.Compte.Client',
                                    id: 'InfosCpteCltID_add',
                                    hidden: true,
                                    defaultType: 'textfield',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [{
                                            name: 'dbl_CAUTION',
                                            id: 'dbl_CAUTION_add',
                                            fieldLabel: 'Caution',
                                            flex: 1,
                                            emptyText: 'Caution',
                                            maskRe: /[0-9.]/,
                                            value: 0,
                                            listeners: {
                                                change: function () {
                                                    var int_solde = Ext.getCmp('dbl_CAUTION_add').getValue();
                                                    //Ext.getCmp('dbl_SOLDE').setValue(int_solde + ' CFA');
                                                }

                                            }
                                        },
                                        {
                                            fieldLabel: 'Commentaires',
                                            emptyText: 'COMMENTAIRE',
                                            name: 'str_COMMENTAIRE_CLIENT',
                                            allowBlank: false,
                                            id: 'str_COMMENTAIRE_CLIENT_add'
                                        }]
                                }
                            ]}
                    ]
                }
                ,
                {
                    xtype: 'container',
                    layout: 'vbox',
                    defaultType: 'textfield',
                    margin: '0 0 5 0',
                    items: [
                        {
                            xtype: 'fieldset',
                            collapsible: true,
                            width: '40%',
                            // flex: 1,
                            title: 'Infos sur les Rc',
                            id: 'InfosCltTierspayantRcID_add',
                            defaultType: 'textfield',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [{
                                    xtype: 'hiddenfield',
                                    fieldLabel: 'RO_ID :',
                                    name: 'RO_ID',
                                    id: 'RO_ID_add',
                                    fieldStyle: "color:blue;",
                                    margin: '0 15 0 0'
                                },
                                {
                                    xtype: 'hiddenfield',
                                    fieldLabel: 'RC1_ID :',
                                    name: 'RC1_ID',
                                    id: 'RC1_ID_add',
                                    fieldStyle: "color:blue;",
                                    margin: '0 15 0 0'
                                },
                                {
                                    xtype: 'hiddenfield',
                                    fieldLabel: 'RC2_ID :',
                                    name: 'RC2_ID',
                                    id: 'RC2_ID_add',
                                    fieldStyle: "color:blue;",
                                    margin: '0 15 0 0'

                                },
                                {
                                    xtype: 'hiddenfield',
                                    fieldLabel: 'RC3_ID :',
                                    name: 'RC3_ID',
                                    id: 'RC3_ID_add',
                                    fieldStyle: "color:blue;",
                                    margin: '0 15 0 0'

                                },
                                {
                                    xtype: 'hiddenfield',
                                    name: 'lg_COMPTE_CLIENT',
                                    id: 'lg_COMPTE_CLIENT'
                                },
                                {
                                    text: 'Associer Tiers.Payant',
                                    id: 'btn_associate_tierpayant',
                                    margins: '0 0 0 6',
                                    xtype: 'button',
                                    disabled: true,
                                    // hidden: true,
                                    handler: function () {
                                        var lg_COMPTE_CLIENT = Ext.getCmp('lg_COMPTE_CLIENT').getValue();
                                        LaborexWorkFlow.AssociateTiersPayant(lg_COMPTE_CLIENT, OvalueTypeClient_search);
                                    }
                                }, {
                                    xtype: 'hiddenfield',
                                    fieldLabel: 'TP1 :',
                                    name: 'RO',
                                    id: 'RO_add',
                                    fieldStyle: "color:blue;",
                                    margin: '0 15 0 0'
                                },
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'TP2 :',
                                    name: 'RC1',
                                    id: 'RC1_add',
                                    fieldStyle: "color:blue;",
                                    margin: '0 15 0 0'
                                },
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'TP3 :',
                                    name: 'RC2',
                                    id: 'RC2_add',
                                    fieldStyle: "color:blue;",
                                    margin: '0 15 0 0'

                                },
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'TP4 :',
                                    name: 'RC3',
                                    id: 'RC3_add',
                                    fieldStyle: "color:blue;",
                                    margin: '0 15 0 0'

                                }
                            ]
                        }
                    ]}
            ]
        });

        //Initialisation des valeur 

        Ext.getCmp('lg_TYPE_CLIENT_ID_add').setValue(OvalueTypeClient_search);
        Ext.getCmp('lg_TYPE_CLIENT_ID_add').hide();

        if (OvalueTypeClient_search === "2") {
            Ext.getCmp('InfosCltTierspayantRcID_add').hide();
            Ext.getCmp('InfoAyantDroitID_add').hide();
            Ext.getCmp('int_POURCENTAGE_add').setValue(100);
            Ext.getCmp('int_POURCENTAGE_add').disable();
        }




        var win_add = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: '98%',
            height: 580,
            maximizable:true,
            // minWidth: 300,
            // minHeight: 200,
            //  layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave_add,
                    hidden: true
                }, {
                    text: 'Valider',
                    id: 'btn_validate',
                    disabled: true,
                    handler: function () {
                        win_add.close();
                    }
                }, {
                    text: 'Fermer',
                    handler: function () {
                        win_add.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function () {
                    if (Ext.getCmp('lg_COMPTE_CLIENT').getValue() !== "" && Ext.getCmp('lg_COMPTE_CLIENT').getValue() !== null) {
                        Ext.getCmp('REF_RO').focus();
                    } else {
                        OFieldProduct.focus();
                    }

                }
            }
        });
         Ext.getCmp('str_FIRST_NAME_add').focus();
        Me_add.ViewAddLoading();
        if (Omode_add === "update") {
            Ext.getCmp('btn_create_customer').setText("Enregistrer");
            Me_add.LoadInformationCustomer(this.getOdatasource(), url_services_data_customer);
            Ext.getCmp('lg_COMPTE_CLIENT').setValue(this.getType());
            Ext.getCmp('btn_validate').enable();

        }
    },
   
    onbtnsave_add: function () {

        var internal_url = "";

        if (Ext.getCmp('str_FIRST_NAME_add').getValue() === null || Ext.getCmp('str_FIRST_NAME_add').getValue() === "") {
            Ext.MessageBox.alert('Attention', 'Veuillez renseigner le Nom',
                    function (btn) {
                        Ext.getCmp('str_FIRST_NAME_add').focus();

                    });

            return;
        }
        if (Ext.getCmp('str_LAST_NAME_add').getValue() === null || Ext.getCmp('str_LAST_NAME_add').getValue() === "") {
            Ext.MessageBox.alert('Attention', 'Veuillez renseigner le Prenom',
                    function (btn) {
                        Ext.getCmp('str_LAST_NAME_add').focus();

                    });
            return;
        }
        if (Ext.getCmp('str_ADRESSE_add').getValue() === null || Ext.getCmp('str_ADRESSE_add').getValue() === "") {
            Ext.MessageBox.alert('Attention', 'Veuillez renseigner l\'adresse ',
                    function (btn) {
                        Ext.getCmp('str_ADRESSE_add').focus();

                    });
            return;
        }

        if (Ext.getCmp('lg_TYPE_CLIENT_ID_add').getValue() === null || Ext.getCmp('lg_TYPE_CLIENT_ID_add').getValue() === "") {
            Ext.MessageBox.alert('Attention', 'Veuillez choisir un tiers payant',
                    function (btn) {
                        Ext.getCmp('lg_TYPE_CLIENT_ID_add').focus();

                    });
            return;
        }

        if (Ext.getCmp('lg_TIERS_PAYANT_ID_add').getValue() === null || Ext.getCmp('lg_TIERS_PAYANT_ID_add').getValue() === "") {
            Ext.MessageBox.alert('Attention', 'Veuillez choisir un tiers payant',
                    function (btn) {
                        Ext.getCmp('lg_TIERS_PAYANT_ID_add').focus();

                    });
            return;
        }
        if (Ext.getCmp('int_POURCENTAGE_add').getValue() === null || Ext.getCmp('int_POURCENTAGE_add').getValue() === "") {
            Ext.MessageBox.alert('Attention', 'Veuillez renseigner le pourcentage',
                    function (btn) {
                        Ext.getCmp('int_POURCENTAGE_add').focus();

                    });
            return;
        }
        if (Ext.getCmp('int_POURCENTAGE_add').getValue() === 0) {
            Ext.MessageBox.alert('Attention', 'Le pourcentage doit etre superieur a 0',
                    function (btn) {
                        Ext.getCmp('int_POURCENTAGE_add').focus();

                    });
            return;
        }

        var Obtn_create_customer = Ext.getCmp('btn_associate_tierpayant');



//        internal_url = url_services_transaction_client_add + 'create'; //a decommenter en cas de probleme
        internal_url = url_services_transaction_client_add + Omode_add;
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: internal_url,
            params: {
                lg_CLIENT_ID: Me_add.getOdatasource(),
                str_CODE_INTERNE: Ext.getCmp('str_CODE_INTERNE_add').getValue(),
                str_FIRST_NAME: Ext.getCmp('str_FIRST_NAME_add').getValue(),
                str_LAST_NAME: Ext.getCmp('str_LAST_NAME_add').getValue(),
                str_SEXE: Ext.getCmp('str_SEXE_add').getValue(),
                str_NUMERO_SECURITE_SOCIAL: Ext.getCmp('str_NUMERO_SECURITE_SOCIAL_add').getValue(),
                str_ADRESSE: Ext.getCmp('str_ADRESSE_add').getValue(),
                str_CODE_POSTAL: Ext.getCmp('str_CODE_POSTAL_add').getValue(),
                lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID_add').getValue(),
                //  lg_MEDECIN_ID: Ext.getCmp('lg_MEDECIN_ID').getValue(),
                lg_TYPE_CLIENT_ID: Ext.getCmp('lg_TYPE_CLIENT_ID_add').getValue(),
                dbl_QUOTA_CONSO_MENSUELLE: Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE_add').getValue(),
                dbl_QUOTA_CONSO_VENTE: Ext.getCmp('dbl_QUOTA_CONSO_VENTE_add').getValue(),
                dbl_PLAFOND: Ext.getCmp('dbl_QUOTA_CONSO_VENTE_add').getValue(),
                dbl_CAUTION: Ext.getCmp('dbl_CAUTION_add').getValue(),
                dbl_SOLDE: dbl_SOLDE,
                lg_CATEGORIE_AYANTDROIT_ID: Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID_add').getValue(),
                lg_RISQUE_ID: Ext.getCmp('lg_RISQUE_ID_add').getValue(),
                dt_NAISSANCE: Ext.getCmp('dt_NAISSANCE_add').getSubmitValue(),
                str_COMMENTAIRE: Ext.getCmp('str_COMMENTAIRE_CLIENT_add').getValue(),
                lg_TIERS_PAYANT_ID: Ext.getCmp('lg_TIERS_PAYANT_ID_add').getValue(),
                int_POURCENTAGE: Ext.getCmp('int_POURCENTAGE_add').getValue(),
                int_PRIORITY: Ext.getCmp('int_PRIORITY_add').getValue(),
                lg_AYANTS_DROITS_ID: lg_AYANTS_DROITS_ID,
                db_PLAFOND_ENCOURS: Ext.getCmp('db_PLAFOND_ENCOURS_add').getValue(),
                b_IsAbsolute: Ext.getCmp('b_IsAbsolute').getValue()


                        // bool_REGIME_add: Ext.getCmp('bool_REGIME_add').getValue

            },
            success: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                var OCustomer = object.results[0];

                Obtn_validate = Ext.getCmp('btn_validate');
                Obtn_create_customer.enable();
                Obtn_validate.enable();

                //  console.log("OCustomer  ",OCustomer)
                //code ajouté
                var str_CODE_ORGANISME = OCustomer.str_NAME;
                var str_TAUX = OCustomer.int_POURCENTAGE;
                var str_CPTE_TP_ID = OCustomer.lg_COMPTE_CLIENT_TIERS_PAYANT_ID;
                var lg_AYANTS_DROITS_ID = OCustomer.lg_AYANTS_DROITS_ID;
                //fin code ajouté


                var str_NUMERO_SECURITE_SOCIAL = OCustomer.str_suc_social;
                var str_FIRST_NAME = OCustomer.str_first_name;
                var str_LAST_NAME = OCustomer.str_last_name;
                var str_CLIENT_FIND_ID = OCustomer.str_cust_id;

                Ext.getCmp('lg_COMPTE_CLIENT').setValue(OCustomer.str_cust_compte_id);
                OCust_num_ss_add.setValue(str_NUMERO_SECURITE_SOCIAL);
                OCust_str_nom_add.setValue(str_LAST_NAME);
                OCust_str_prenom_add.setValue(str_FIRST_NAME);
                OCust_str_id_add.setValue(str_CLIENT_FIND_ID);
                OCust_compte_id_add.setValue(OCustomer.str_cust_compte_id);


                //code ajouté
                /*OCust_tp_ro_taux.setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' % '); //a decommenter en cas de probleme. 13/12/2016
                 OCust_tp_ro_id.setValue(str_CPTE_TP_ID);
                 Ext.getCmp('REF_RO').show();
                 Ext.getCmp('int_TAUX').setValue(str_TAUX);*/
                if (Omode_add === "update") {
                    if (LaborexWorkFlow.venteTierspayant.length > 0) {
                        for (var i = 0; i < LaborexWorkFlow.venteTierspayant.length; i++) {

                            if (LaborexWorkFlow.venteTierspayant[i].IDTIERSPAYANT === OCustomer.IDTIERSPAYANT) {
                                LaborexWorkFlow.venteTierspayant.splice(i, 1);

                            }
                        }
                    }

                }
                LaborexWorkFlow.venteTierspayant.push({"IDTIERSPAYANT": OCustomer.IDTIERSPAYANT, "TAUX": str_TAUX, "ID": str_CLIENT_FIND_ID, "NAME": str_CODE_ORGANISME});
                LaborexWorkFlow.DoGetTierePayantRO(str_CODE_ORGANISME, str_TAUX, str_CPTE_TP_ID, OCustomer.dbl_PLAFOND, OCustomer.dbl_QUOTA_CONSO_MENSUELLE, OCustomer.dbl_PLAFOND_QUOTA_DIFFERENCE);

                OCust_ad_prenom.setValue(str_FIRST_NAME);
                OCust_ad_nom.setValue(str_LAST_NAME);
                OCust_ad_ss.setValue(str_NUMERO_SECURITE_SOCIAL);
                OCust_ad_ID.setValue(lg_AYANTS_DROITS_ID);
                //fin code ajouté


                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    Ext.getCmp('btn_create_customer').disable();
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


        //this.up('window').close();
    },
    ViewAddLoading: function () {

        OCust_num_ss_add = Ext.getCmp('str_NUMERO_SECURITE_SOCIAL');
        OCust_str_prenom_add = Ext.getCmp('str_FIRST_NAME');
        OCust_str_nom_add = Ext.getCmp('str_LAST_NAME');
        OCust_str_id_add = Ext.getCmp('lg_CLIENT_ID_FIND');
        OCust_compte_id_add = Ext.getCmp('lg_COMPTE_CLIENT_ID');
        OFieldProduct = Ext.getCmp('str_NAME');
        OCust_ad_prenom = Ext.getCmp('str_FIRST_NAME_AD');
        OCust_ad_nom = Ext.getCmp('str_LAST_NAME_AD');
        OCust_ad_ID = Ext.getCmp('lg_AYANTS_DROITS_ID');
        OCust_ad_ss = Ext.getCmp('str_NUMERO_SECURITE_SOCIAL_AD');
        OCust_tp_ro_taux = Ext.getCmp('RO');
        OCust_tp_ro_id = Ext.getCmp('RO_ID');



    },
    AssociateTiersPayantAdd: function (val) {
        var str_path_tp_ass = testextjs.view.sm_user.dovente.action.associateTiersPayantItem;
        LaborexWorkFlow.ShowPopUp(val, val, 'addaddclient', str_path_tp_ass, OvalueTypeClient_search, "dysplay", "Associer Tier(s) Payant(s)", "");
    },
    LoadInformationCustomer: function (val, url) {
        Ext.Ajax.request({
            url: url,
            params: {
                lg_CLIENT_ID: val
            },
            success: function (response)
            {
                var objectBase = Ext.JSON.decode(response.responseText, false);
                var object = objectBase.results[0];
                Ext.getCmp('str_CODE_INTERNE_add').setValue(object.str_CODE_INTERNE);
                Ext.getCmp('str_FIRST_NAME_add').setValue(object.str_FIRST_NAME);
                Ext.getCmp('str_LAST_NAME_add').setValue(object.str_LAST_NAME);
                Ext.getCmp('dt_NAISSANCE_add').setValue(object.dt_NAISSANCE);
                Ext.getCmp('str_NUMERO_SECURITE_SOCIAL_add').setValue(object.str_NUMERO_SECURITE_SOCIAL);
                Ext.getCmp('str_ADRESSE_add').setValue(object.str_ADRESSE);

                Ext.getCmp('str_CODE_POSTAL_add').setValue(object.str_CODE_POSTAL);
                Ext.getCmp('str_SEXE_add').items.items[object.str_SEXE == "M" ? 1 : 0].setValue(true);
                Ext.getCmp('lg_VILLE_ID_add').setValue(object.lg_VILLE_ID);

                if (OvalueTypeClient_search == "1") {
                    Ext.getCmp('btn_associate_tierpayant').enable();
                    Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID_add').setValue(object.lg_CATEGORIE_AYANTDROIT_ID);
                    Ext.getCmp('lg_RISQUE_ID_add').setValue(object.lg_RISQUE_ID);
                    lg_AYANTS_DROITS_ID = object.lg_AYANTS_DROITS_ID;
                }

                var Client, int_PRIORITY, int_POURCENTAGE, str_FULLNAME, lg_COMPTE_TIERS_PAYANT_ID,
                        dbl_QUOTA_CONSO_MENSUELLE, dbl_QUOTA_CONSO_VENTE;
                for (var i = 0; i < object.Tierspayant.length; i++) {
                    Client = object.Tierspayant[i];

                    int_PRIORITY = Client.int_PRIORITY,
                            int_POURCENTAGE = Client.int_POURCENTAGE,
                            str_FULLNAME = Client.str_TIERS_PAYANT_NAME,
                            lg_COMPTE_TIERS_PAYANT_ID = Client.lg_COMPTE_TIERS_PAYANT_ID,
                            dbl_QUOTA_CONSO_MENSUELLE = Client.dbl_QUOTA_CONSO_MENSUELLE,
                            dbl_QUOTA_CONSO_VENTE = Client.dbl_QUOTA_CONSO_VENTE;

                    if (int_PRIORITY == 1) {
                        Ext.getCmp('lg_TIERS_PAYANT_ID_add').setValue(str_FULLNAME);
                        Ext.getCmp('lg_TIERS_PAYANT_ID_add').disable();//ajoute le 12/05/2017
                        Ext.getCmp('int_POURCENTAGE_add').setValue(int_POURCENTAGE);
                        Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE_add').setValue(dbl_QUOTA_CONSO_MENSUELLE);
                        Ext.getCmp('dbl_QUOTA_CONSO_VENTE_add').disable();
                        Ext.getCmp('dbl_QUOTA_CONSO_VENTE_add').setValue(dbl_QUOTA_CONSO_VENTE);
                        dbl_SOLDE = Client.dbl_PLAFOND;
                    } else {
                        Ext.getCmp('RC' + i + '_add').setValue(str_FULLNAME + '--' + int_POURCENTAGE + ' %');
                        Ext.getCmp('RC' + i + '_ID_add').setValue(lg_COMPTE_TIERS_PAYANT_ID);
                    }
                }
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    }


});