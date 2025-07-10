/* global Ext */

var url_services_data_zonegeo_famille = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_data_codeacte_famille = '../webservices/configmanagement/codeacte/ws_data.jsp';
var url_services_data_grossiste_famille = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_famaillearticle_famille = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_codegestion_famille = '../webservices/configmanagement/codegestion/ws_data.jsp';
var url_services_data_famille = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';
var url_services_data_typeetiquette = '../webservices/configmanagement/typeetiquette/ws_data.jsp';
var url_services_data_fabriquant = '../webservices/configmanagement/fabriquant/ws_data.jsp';
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
var bool_DECONDITIONNE;
var gammeStore, laboratoireStore;
Ext.define('testextjs.view.configmanagement.famille.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addfamille',
    id: 'addfamilleID',
    modal: true,
    maximizable: true,
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
        type: ''
    },
    initComponent: function () {
        Oview = this.getParentview();
        ref = this.getOdatasource().lg_FAMILLE_ID;
        Omode = this.getMode();
        type = this.getType();
        Me = this;
        var itemsPerPage = 20;
        bool_DECONDITIONNE = "0";
        var store_fabriquant = new Ext.data.Store({
            model: 'testextjs.model.Fabriquant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_fabriquant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        laboratoireStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/laboratoireproduits',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });

        gammeStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/gammeproduits',
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
        var store_etiquette = new Ext.data.Store({
            model: 'testextjs.model.Typeetiquette',
            pageSize: itemsPerPage,
            storeId: 'store_etiquette',
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_typeetiquette,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var store_remise = new Ext.data.Store({
            model: 'testextjs.model.Remise',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_remise + "?AllRemise=true",
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
        var int_RESERVE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    hidden: true,
                    fieldLabel: 'Quantite reserve: ',
                    name: 'int_RESERVE',
                    id: 'int_RESERVE',
                    fieldStyle: "color:blue;",
                    flex: 1,
//                    margin: '0 15 0 0'
                });
        var store_famillearticle_famille = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famaillearticle_famille,
                reader: {
                    type: 'json',
                    root: 'results',
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
        var store_zonegeo_famille = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeo_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var store_codegestion_famille = new Ext.data.Store({
            model: 'testextjs.model.CodeGestion',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_codegestion_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var store_codeacte_famille = new Ext.data.Store({
            model: 'testextjs.model.CodeActe',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_codeacte_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        //   const thisView = this;
        var form = new Ext.form.Panel({
            bodyPadding: 15,
            autoScroll: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                selectOnFocus: true,
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
                                    fieldLabel: 'Cip',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/, width: 400,
                                    autoCreate: {
                                        tag: 'input',
                                        maxlength: '7'
                                    },

                                    emptyText: 'CIP',
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
                                    fieldLabel: 'Prix.Achat.Tarif',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 350,
                                    emptyText: 'PRIX ACHAT TARIF',
                                    name: 'int_PAT',
                                    id: 'int_PAT',
                                    selectOnFocus: true,
                                    hidden: true
                                },
                                {
                                    fieldLabel: 'Prix Achat Facture',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 350,
                                    selectOnFocus: true,
                                    emptyText: 'PRIX ACHAT FACTURE',
                                    name: 'int_PAF',
                                    id: 'int_PAF',
                                    allowBlank: false
                                }

                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Emplacement',
                                    name: 'lg_ZONE_GEO_ID',
                                    width: 400,
                                    id: 'lg_ZONE_GEO_ID',
                                    store: store_zonegeo_famille,
                                    valueField: 'lg_ZONE_GEO_ID',
                                    displayField: 'str_LIBELLEE',
                                    pageSize: 20, //ajout la barre de pagination
                                    typeAhead: true,
                                    minChars: 2,
                                    allowBlank: false,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un emplacement...'
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Famille',
                                    name: 'lg_FAMILLEARTICLE_ID',
                                    width: 400,
                                    id: 'lg_FAMILLEARTICLE_ID',
                                    store: store_famillearticle_famille,
                                    valueField: 'lg_FAMILLEARTICLE_ID',
                                    displayField: 'str_LIBELLE',
                                    pageSize: 20, //ajout la barre de pagination
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    allowBlank: false,
                                    emptyText: 'Choisir une famille...'


                                },
                                {
                                    fieldLabel: 'Prix.Vente',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 350,
                                    emptyText: 'PRIX VENTE',
                                    name: 'int_PRICE',
                                    id: 'int_PRICE',
                                    selectOnFocus: true,

                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    listeners: {
                                        keyup: function (o, e) {
                                            if (Omode === "create" || Omode === "update") {

                                                var value = this.getValue();
                                                if (value.length > 0) {
                                                    Ext.getCmp('int_PRICE_TIPS').setValue(value);
                                                } else {
                                                    Ext.getCmp('int_PRICE_TIPS').setValue('');
                                                }
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
                            margin: '0 0 5 0',
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Fabriquant',
                                    name: 'lg_FABRIQUANT_ID',
                                    width: 400,
                                    id: 'lg_FABRIQUANT_ID',
                                    store: store_fabriquant,
                                    valueField: 'lg_FABRIQUANT_ID',
                                    displayField: 'str_NAME',
                                    pageSize: 20, //ajout la barre de pagination
                                    typeAhead: true,
                                    hidden: true,
                                    queryMode: 'remote',
//                                    allowBlank: false,
                                    emptyText: 'Choisir un frabriquant...'
                                },
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Stock',
                                    labelWidth: 110,
                                    hidden: true,
                                    name: 'int_NUMBER_AVAILABLE',
                                    id: 'int_NUMBER_AVAILABLE',
                                    fieldStyle: "color:blue;font-weight:bold;",
                                    margin: '0 12 0 0',
                                    value: 0
                                }
                                ,
                                {
                                    xtype: 'numberfield',
                                    fieldLabel: 'Prix CMU',
                                    maskRe: /[0-9.]/,
                                    width: 350,
                                    emptyText: 'PRIX CMU',
                                    labelWidth: 110,
                                    name: 'cmu_price',
                                    id: 'cmu_price',
                                    margin: '0 0 0 0'

                                }


                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    // title: 'Infos.Produit',
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
                                    xtype: 'combobox',
                                    fieldLabel: 'Code TVA',
                                    name: 'lg_CODE_TVA_ID',
                                    width: 350,
                                    labelWidth: 110,
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
                                    xtype: 'combobox',
                                    fieldLabel: 'Grossiste',
                                    name: 'lg_GROSSISTE_ID',
                                    width: 350,
                                    labelWidth: 100,
                                    id: 'lg_GROSSISTE_ID',
                                    store: store_grossiste_famille,
                                    valueField: 'lg_GROSSISTE_ID',
                                    pageSize: 20, //ajout la barre de pagination
                                    displayField: 'str_LIBELLE',
                                    typeAhead: true,
                                    allowBlank: false,
                                    queryMode: 'remote', emptyText: 'Choisir un grossiste...'
                                },
                                {
                                    fieldLabel: 'Code EAN 13',
                                    xtype: 'textfield',
                                    labelWidth: 110,
                                    maskRe: /[0-9.]/,
                                    width: 350,
                                    // maxValue: 13,
                                    emptyText: 'Code EAN 13',
                                    name: 'int_EAN13',
                                    id: 'int_EAN13'
                                }/*
                                 
                                 ,
                                 
                                 {
                                 xtype: 'numberfield',
                                 fieldLabel: 'Prix CMU',
                                 labelWidth: 110,
                                 name: 'cmu_price',
                                 id: 'cmu_price',
                                 width: 400,
                                 margin: '0 0 0 0'
                                 
                                 }*/
                            ]
                        }]
                }, {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    // title: 'Infos.Produit',
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
                                    xtype: 'combobox',
                                    fieldLabel: 'Code.Acte',
                                    name: 'lg_CODE_ACTE_ID',
                                    width: 400,
                                    id: 'lg_CODE_ACTE_ID',
                                    store: store_codeacte_famille,
                                    valueField: 'lg_CODE_ACTE_ID',
                                    displayField: 'str_LIBELLEE',
                                    typeAhead: true,
                                    autoSelect: true,
                                    selectOnFocus: true,
                                    queryMode: 'remote', emptyText: 'Choisir un code acte...'
                                },
                                {
                                    fieldLabel: 'Code.Taux.Remb',
                                    width: 400,
                                    maxValue: 13,
                                    value: 0,
                                    emptyText: 'TAUX REMBOURSEMENT',
                                    name: 'str_CODE_TAUX_REMBOURSEMENT',
                                    id: 'str_CODE_TAUX_REMBOURSEMENT'
                                },
                                {
                                    fieldLabel: 'Code.Tableau',
                                    width: 350,
//                                    maxValue: 13,
                                    emptyText: 'Code Tableau',
                                    name: 'int_T',

                                    id: 'int_T'
                                }

                            ]
                        }, {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Code etiquette',
                                    name: 'lg_TYPEETIQUETTE_ID',
                                    width: 400,
                                    id: 'lg_TYPEETIQUETTE_ID',
                                    store: store_etiquette,
                                    valueField: 'lg_TYPEETIQUETTE_ID',
                                    displayField: 'str_DESCRIPTION',
                                    typeAhead: true,
                                    queryMode: 'remote', //CIP - PRIX
                                    emptyText: 'Choisir un code d\'etiquette...',
                                    autoSelect: true,
                                    selectOnFocus: true

                                }, {
                                    xtype: 'combobox',
                                    fieldLabel: 'Code.Remise',
                                    name: 'str_CODE_REMISE',
                                    id: 'str_CODE_REMISE',
                                    store: ['0', '1', '2', '3', '4'],
                                    valueField: 'str_CODE_REMISE',
                                    displayField: 'str_CODE_REMISE',
                                    width: 400,
                                    value: 0,
                                    typeAhead: true,
                                    queryMode: 'local',
                                    emptyText: 'Choisir une Remise...'
                                },
                                {
                                    fieldLabel: 'Taux.Marque',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 250,
                                    value: 0,
                                    maxValue: 13,
                                    emptyText: 'TAUX MARQUE',
                                    name: 'int_TAUX_MARQUE',
                                    id: 'int_TAUX_MARQUE'
                                }]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    // title: 'Infos.Produit',
                    defaultType: 'textfield',
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [{
                                    fieldLabel: 'Prix.Reference',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 200,
                                    labelWidth: 90,
                                    emptyText: 'PRIX TIPS',
                                    name: 'int_PRICE_TIPS',
                                    id: 'int_PRICE_TIPS'
                                }, {
                                    xtype: 'combobox',
                                    fieldLabel: 'Code.Gestion',
                                    labelWidth: 90,
                                    name: 'lg_CODE_GESTION_ID',
                                    width: 270,
                                    id: 'lg_CODE_GESTION_ID',
                                    store: store_codegestion_famille,
                                    pageSize: 20, //ajout la barre de pagination
                                    valueField: 'lg_CODE_GESTION_ID',
                                    displayField: 'str_CODE_BAREME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un code gestion...'
                                },
                                {
                                    fieldLabel: 'Date.Péremption',

                                    xtype: 'datefield',
                                    labelWidth: 100,
                                    width: 250,
                                    format: 'd/m/Y',

                                    submitFormat: 'Y-m-d',
                                    emptyText: 'Date.Péremption',
                                    name: 'dt_Peremtion_new',
                                    id: 'dt_Peremtion_new'
                                },

                                {
                                    fieldLabel: 'Seuil.Reappro',
                                    labelWidth: 90,
                                    maskRe: /[0-9.]/,
                                    width: 200,
                                    xtype: 'numberfield',
                                    emptyText: 'Seuil.Reappro',
                                    name: 'int_STOCK_REAPROVISONEMENT',
                                    id: 'int_STOCK_REAPROVISONEMENT'
                                },
                                {
                                    fieldLabel: 'Qte.Reappro',
                                    labelWidth: 90,
                                    xtype: 'numberfield',
                                    maskRe: /[0-9.]/,
                                    width: 200,
                                    emptyText: 'Qte.Reappro',
                                    name: 'int_QTE_REAPPROVISIONNEMENT',
                                    id: 'int_QTE_REAPPROVISIONNEMENT'
                                }

                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'hbox',
                    title: '',

                    items: [
                        {
                            xtype: 'combobox',
                            margin: '0 0 5 0',
                            fieldLabel: 'Gamme',
                            name: 'gammeId',
                            id: 'gammeId',
                            store: gammeStore,
                            forceselection: true,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            flex: 1,

                            triggerAction: 'all',
                            queryMode: 'remote',
//                                    labelWidth: 100,
                            enableKeyEvents: true,
                            emptyText: 'Choisir une gamme..'
                        },
                        {xtype: 'splitter'},
                        {
                            xtype: 'combobox',
                            margin: '0 0 5 0',
                            fieldLabel: 'Laboratoire',
                            name: 'laboratoireId',
                            id: 'laboratoireId',
                            store: laboratoireStore,
                            forceselection: true,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            flex: 1,
                            triggerAction: 'all',
                            queryMode: 'remote',
                            enableKeyEvents: true,
                            emptyText: 'Choisir un laboratoire..'
                        }



                    ]
                },

                {
                    xtype: 'fieldset',
                    collapsible: true,
                    id: 'info_reserve',
//                    hidden: true,
                    layout: 'vbox',
                    title: 'Infos.Reserve',
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
                            width: '100%',
                            items: [
                                {
                                    allowBlank: false,
                                    xtype: 'checkbox',
                                    flex: 1,
                                    labelWidth: 250,
                                    fieldLabel: 'Cet article aura t-il un stock reserve?',
                                    emptyText: 'Cet article aura t-il un stock reserve?',
                                    name: 'bool_RESERVE',
                                    id: 'bool_RESERVE',
                                    listeners: {
                                        change: function (checkbox, newValue, oldValue, eOpts) {
                                            if (newValue) {
                                                Ext.getCmp('int_SEUIL_RESERVE').show();
                                                Ext.getCmp('int_QTEDETAIL').show();

                                            } else {
                                                Ext.getCmp('int_SEUIL_RESERVE').hide();
                                                Ext.getCmp('int_SEUIL_RESERVE').setValue(0);
                                            }
                                        }
                                    }
                                }, {xtype: 'splitter'},

                                {
                                    fieldLabel: 'Seuil reserve',
                                    flex: 1,
                                    minValue: 0,
                                    hidden: true,
                                    emptyText: 'Seuil reserve',
                                    name: 'int_SEUIL_RESERVE',
                                    id: 'int_SEUIL_RESERVE',
                                    value: 0,
                                    xtype: 'numberfield',
                                    allowBlank: false,
                                    regex: /[0-9.]/
                                }, {xtype: 'splitter'},
                                {
                                    fieldLabel: 'Quantite.Detail/Article',
                                    flex: 1,
                                    hidden: true,
                                    regex: /[0-9.]/,
                                    xtype: 'numberfield',
                                    emptyText: 'Quantite.Detail/Article',
                                    name: 'int_QTEDETAIL',
                                    id: 'int_QTEDETAIL',
                                    value: 0
                                }, {xtype: 'splitter'},
                                int_RESERVE



                            ]
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: 'DCI',
                    id: 'dcifieldset',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridpanelDciID',
                            margin: '0 0 5 0',
                            store: store_dci_famille,
                            height: 200,
                            columns: [
                                {
                                    header: 'lg_FAMILLE_DCI_ID',
                                    dataIndex: 'lg_FAMILLE_DCI_ID',
                                    hidden: true,
                                    flex: 1,
                                    editor: {
                                        allowBlank: false
                                    }
                                },
                                {
                                    header: 'Code DCI',
                                    dataIndex: 'str_CODE',
                                    flex: 1,
                                    editor: {
                                        allowBlank: false
                                    }

                                }, {
                                    header: 'Designation',
                                    dataIndex: 'dci_str_NAME',
                                    flex: 1,
                                    editor: {
                                        allowBlank: false
                                    }

                                }

                                , {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/delete.gif',
                                            tooltip: 'Suprimer',
                                            scope: this,
                                            handler: this.onRemoveClick
                                        }]
                                }
                            ],
                            tbar: [{
                                    xtype: 'textfield',
                                    id: 'rechecher_dci',
                                    name: 'rechecher_dci',
                                    emptyText: 'Rech',
                                    listeners: {
                                        'render': function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me.onRechClickDCI();
                                                }
                                            });
                                        }
                                    }
                                }, '-', {
                                    xtype: 'combobox',
                                    name: 'lg_DCI_ID',
                                    margins: '0 0 0 10',
                                    id: 'lg_DCI_ID',
                                    store: store_dci,
//                                    valueField: 'lg_DCI_ID',
                                    valueField: 'str_NAME',
                                    displayField: 'str_NAME',
                                    typeAhead: true,
                                    pageSize: 20, //ajout la barre de pagination
                                    queryMode: 'remote',
                                    width: 400,
                                    emptyText: 'Selectionner un DCI...',
                                    listeners: {
                                        select: function (cmp) {
                                            Me.onRechClickDCI();
                                        },
                                        change: function (cmp) {
                                            Me.onfiltercheck();
                                        }

                                    }
                                }, '-', {
                                    text: 'Associer',
                                    tooltip: 'Associer le code DCI a cet article',
                                    scope: this,
                                    id: 'associate',
                                    handler: this.onbtndciadd
                                }],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_dci_famille,
                                displayInfo: true
                            },
                            listeners: {
                                scope: this
                            }
                        }]
                }

            ]


        });

        if (Omode === "update" && bool_DECONDITIONNE == "1") {
            Ext.getCmp("associate").hide();
        }

        if (Omode === "create") {

            var lg_CODE_ACTE_IDcom = Ext.getCmp("lg_CODE_ACTE_ID");
            lg_CODE_ACTE_IDcom.getStore().on(
                    "load", function () {

                        var CODEstore = lg_CODE_ACTE_IDcom.getStore();
                        CODEstore.each(function (r, id) {

                            switch (r.get('lg_CODE_ACTE_ID')) {
                                case '0':
                                    lg_CODE_ACTE_IDcom.setValue(r.get('lg_CODE_ACTE_ID'));
                                    //L'id de AUCUN doit etre 0 ou remplacer la valeur 2 par l'id dans la bd
                                    break;
                            }



                        });

                    },
                    this,
                    {
                        single: true
                    }
            );

            var combo = Ext.getCmp("lg_TYPEETIQUETTE_ID");
            combo.getStore().on(
                    "load", function () {

                        var combostore = combo.getStore();
                        combostore.each(function (r, id) {
                            switch (r.get('lg_TYPEETIQUETTE_ID')) {
                                case '2':
                                    combo.setValue(r.get('lg_TYPEETIQUETTE_ID'));
                                    //L'id de CIP-PRIX doit etre 2 ou remplacer la valeur 2 par l'id dans la bd
                                    break;
                            }

                        });

                    },
                    this,
                    {
                        single: true
                    }
            );
        }
        //Initialisation des valeur
        if (Omode == "decondition" || (this.getOdatasource().bool_DECONDITIONNE == 0 && this.getOdatasource().bool_DECONDITIONNE_EXIST == 1)) {
            Ext.getCmp('int_QTEDETAIL').show();
        }



        if (Omode === "update" || Omode === "decondition") {
            if (this.getOdatasource().P_UPDATE_PAF == false) {
                Ext.getCmp('int_PAF').disable();
            }
            if (this.getOdatasource().P_UPDATE_PRIXVENTE == false) {
                Ext.getCmp('int_PRICE').disable();
            }
            if (this.getOdatasource().P_UPDATE_CODETABLEAU == false) {
                Ext.getCmp('int_T').disable();
            }
            if (this.getOdatasource().P_UPDATE_CODEREMISE == false) {
                Ext.getCmp('str_CODE_REMISE').disable();
            }
            if (this.getOdatasource().P_UPDATE_CIP == false) {
                Ext.getCmp('int_CIP').disable();
            }
            if (this.getOdatasource().P_UPDATE_DESIGNATION == false) {
                Ext.getCmp('str_DESCRIPTION').disable();
            }

            ref = this.getOdatasource().lg_FAMILLE_ID;
            Ext.getCmp('int_NUMBER_AVAILABLE').setValue(this.getOdatasource().int_NUMBER_AVAILABLE);
            Ext.getCmp('cmu_price').setValue(this.getOdatasource().cmu_price);

            Ext.getCmp('int_NUMBER_AVAILABLE').show();
            Ext.getCmp('lg_CODE_GESTION_ID').setValue(this.getOdatasource().lg_CODE_GESTION_ID);
            Ext.getCmp('lg_GROSSISTE_ID').setValue(this.getOdatasource().lg_GROSSISTE_ID);
            Ext.getCmp('int_STOCK_REAPROVISONEMENT').setValue(this.getOdatasource().int_STOCK_REAPROVISONEMENT);
            Ext.getCmp('int_QTE_REAPPROVISIONNEMENT').setValue(this.getOdatasource().int_QTE_REAPPROVISIONNEMENT);
            Ext.getCmp('str_CODE_REMISE').setValue(this.getOdatasource().str_CODE_REMISE);
            Ext.getCmp('lg_TYPEETIQUETTE_ID').setValue(this.getOdatasource().lg_TYPEETIQUETTE_ID);
            Ext.getCmp('lg_FABRIQUANT_ID').setValue(this.getOdatasource().lg_FABRIQUANT_ID);
            Ext.getCmp('lg_FABRIQUANT_ID').show();
//            Ext.getCmp('lg_REMISE_ID').setValue(this.getOdatasource().lg_REMISE_ID);
            //Ext.getCmp('str_CODE_TVA').setValue(this.getOdatasource().str_CODE_TVA);
            Ext.getCmp('int_T').setValue(this.getOdatasource().int_T);
            Ext.getCmp('str_CODE_TAUX_REMBOURSEMENT').setValue(this.getOdatasource().str_CODE_TAUX_REMBOURSEMENT);
            Ext.getCmp('lg_CODE_ACTE_ID').setValue(this.getOdatasource().lg_CODE_ACTE_ID);
            Ext.getCmp('int_TAUX_MARQUE').setValue(this.getOdatasource().int_TAUX_MARQUE);
//            Ext.getCmp('int_PAT').setValue(this.getOdatasource().int_PAT); //a decommenter en cas de probleme. 23/05/2016
            Ext.getCmp('int_PAT').setValue(this.getOdatasource().int_PAF);
            Ext.getCmp('int_PAF').setValue(this.getOdatasource().int_PAF);

            Ext.getCmp('int_PRICE_TIPS').setValue(this.getOdatasource().int_PRICE_TIPS);
            Ext.getCmp('int_PRICE').setValue(this.getOdatasource().int_PRICE);
            Ext.getCmp('lg_FAMILLEARTICLE_ID').setValue(this.getOdatasource().lg_FAMILLEARTICLE_ID);
            Ext.getCmp('lg_ZONE_GEO_ID').setValue(this.getOdatasource().lg_ZONE_GEO_ID);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('int_CIP').setValue(this.getOdatasource().int_CIP);
            Ext.getCmp('int_QTEDETAIL').setValue(this.getOdatasource().int_NUMBERDETAIL);
            Ext.getCmp('lg_CODE_TVA_ID').setValue(this.getOdatasource().lg_CODE_TVA_ID);
            Ext.getCmp('int_EAN13').setValue(this.getOdatasource().int_EAN13);
            Ext.getCmp('bool_RESERVE').setValue(this.getOdatasource().bool_RESERVE);
            Ext.getCmp('dt_Peremtion_new').setValue(this.getOdatasource().dt_Peremtion);

            if (this.getOdatasource().bool_RESERVE == "true") {
                Ext.getCmp('int_SEUIL_RESERVE').setValue(this.getOdatasource().int_SEUIL_RESERVE);
                Ext.getCmp('int_RESERVE').setValue(this.getOdatasource().int_STOCK_RESERVE);
                Ext.getCmp('int_SEUIL_RESERVE').show();
                Ext.getCmp('int_RESERVE').show();
            }
            bool_DECONDITIONNE = this.getOdatasource().bool_DECONDITIONNE;
            var laboratoireId = this.getOdatasource().laboratoireId;
            var gammeId = this.getOdatasource().gammeId;
            gammeStore.load({callback: function (records, operation, successful) {
                    Ext.each(records, function (item) {
                        let rec = item.data;
                        if (rec.id == gammeId) {
                            Ext.getCmp('gammeId').setValue(rec.id);
                            combobox.setDisplayField(rec.libelle);
                            return;
                        }
                    });

                }});
            laboratoireStore.load({callback: function (records, operation, successful) {
                    Ext.each(records, function (item) {
                        let rec = item.data;
                        if (rec.id == laboratoireId) {
                            Ext.getCmp('laboratoireId').setValue(rec.id);
                            combobox.setDisplayField(rec.libelle);

                        }
                    });

                }});


        }



        var win = new Ext.window.Window({
            autoShow: true,
//            overflowY: 'auto',
            title: this.getTitre(),
            width: '90%',
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            modal: true,
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
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function () {
                    Ext.getCmp('rechecher').focus();
                }
            }
        });
        if (Omode === "create")
        {
            Ext.getCmp('dcifieldset').hide();
        }

    },
    onbtnsave: function (button) {
        var win = button.up('window'), form = win.down('form');

        if (form.isValid()) {
            let internal_url = "";
            let int_DECONDITIONNE = 0;
            let int_QTEDETAIL = Ext.getCmp('int_QTEDETAIL').getValue();
            if (Omode === "create") {
                internal_url = url_services_transaction_famille + 'create';
                Ext.getCmp('int_PAT').setValue(Ext.getCmp('int_PAF').getValue());

            } else if (Omode === "update") {
                internal_url = url_services_transaction_famille + 'update&lg_FAMILLE_ID=' + ref;
            } else if (Omode === "decondition") {

                //  internal_url = url_services_transaction_famille + 'decondition&lg_FAMILLE_ID=' + ref;

                int_DECONDITIONNE = 1;
                if (int_QTEDETAIL <= 0) {
                    Ext.MessageBox.alert('Impossible', 'Veuillez renseigner la quantite detail de l\'article');
                    return;
                }
            }

            if (parseInt(Ext.getCmp('int_PAF').getValue()) > parseInt(Ext.getCmp('int_PRICE').getValue())) {
                Ext.MessageBox.alert('Impossible', 'Le prix d\'achat doit etre inferieur au prix de vente');
                return;
            }



            var int_PRICE_TIPS = 0, int_TAUX_MARQUE = 0, str_CODE_REMISE = 0, int_PRICE = 0;
            if (Ext.getCmp('int_PRICE_TIPS').getValue() == "" || Ext.getCmp('int_PRICE_TIPS').getValue() == null) {
                int_PRICE_TIPS = 0;
            } else {
                int_PRICE_TIPS = Ext.getCmp('int_PRICE_TIPS').getValue();
            }
            if (Ext.getCmp('int_TAUX_MARQUE').getValue() == "" || Ext.getCmp('int_TAUX_MARQUE').getValue() == null) {
                int_TAUX_MARQUE = 0;
            } else {
                int_TAUX_MARQUE = Ext.getCmp('int_TAUX_MARQUE').getValue();
            }
            if (Ext.getCmp('str_CODE_REMISE').getValue() == "" || Ext.getCmp('str_CODE_REMISE').getValue() == null) {
                str_CODE_REMISE = 0;
            } else {
                str_CODE_REMISE = Ext.getCmp('str_CODE_REMISE').getValue();
            }
            if (Ext.getCmp('int_PRICE').getValue() == "" || Ext.getCmp('int_PRICE').getValue() == null) {
                int_PRICE = 0;
            } else {
                int_PRICE = Ext.getCmp('int_PRICE').getValue();
            }



            var str_DESCRIPTION = Ext.getCmp('str_DESCRIPTION').getValue();

            testextjs.app.getController('App').ShowWaitingProcess();
            if ((Omode === "decondition") || (Omode === "update" && Me.getOdatasource().bool_DECONDITIONNE == 1)) {
                internal_url = '../api/v1/produit/create-detail';
                Me.onCreateDetailProduit(internal_url, ref, str_CODE_REMISE, int_TAUX_MARQUE, int_PRICE_TIPS, int_PRICE, int_DECONDITIONNE, Omode, Oview, type,win);
            } else {
                Ext.Ajax.request({
                    url: internal_url,
                    params: {
                        int_NUMBER_AVAILABLE: Ext.getCmp('int_NUMBER_AVAILABLE').getValue(),
                        lg_CODE_GESTION_ID: Ext.getCmp('lg_CODE_GESTION_ID').getValue(),
                        int_STOCK_REAPROVISONEMENT: Ext.getCmp('int_STOCK_REAPROVISONEMENT').getValue(),
                        lg_GROSSISTE_ID: Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                        str_CODE_REMISE: str_CODE_REMISE,
                        dt_Peremtion: Ext.getCmp('dt_Peremtion_new').getSubmitValue(),
//                lg_REMISE_ID: Ext.getCmp('lg_REMISE_ID').getValue(),
                        lg_TYPEETIQUETTE_ID: Ext.getCmp('lg_TYPEETIQUETTE_ID').getValue(),
//                str_CODE_TVA: Ext.getCmp('str_CODE_TVA').getValue(),
                        int_T: Ext.getCmp('int_T').getValue(),
                        str_CODE_TAUX_REMBOURSEMENT: Ext.getCmp('str_CODE_TAUX_REMBOURSEMENT').getValue(),
                        int_QTE_REAPPROVISIONNEMENT: Ext.getCmp('int_QTE_REAPPROVISIONNEMENT').getValue(),
                        lg_CODE_ACTE_ID: Ext.getCmp('lg_CODE_ACTE_ID').getValue(),
                        int_TAUX_MARQUE: int_TAUX_MARQUE,
                        int_PAT: Ext.getCmp('int_PAT').getValue(),
                        int_PAF: Ext.getCmp('int_PAF').getValue(),
                        int_PRICE_TIPS: int_PRICE_TIPS,
                        int_PRICE: int_PRICE,
                        lg_FAMILLEARTICLE_ID: Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue(),
                        lg_ZONE_GEO_ID: Ext.getCmp('lg_ZONE_GEO_ID').getValue(),
                        lg_FABRIQUANT_ID: Ext.getCmp('lg_FABRIQUANT_ID').getValue(),
                        str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                        int_CIP: Ext.getCmp('int_CIP').getValue(),
                        int_EAN13: Ext.getCmp('int_EAN13').getValue(),
                        int_QTEDETAIL: Ext.getCmp('int_QTEDETAIL').getValue(),
                        lg_CODE_TVA_ID: Ext.getCmp('lg_CODE_TVA_ID').getValue(),
                        int_SEUIL_RESERVE: Ext.getCmp('int_SEUIL_RESERVE').getValue(),
                        bool_RESERVE: Ext.getCmp('bool_RESERVE').getValue(),
                        laboratoireId: Ext.getCmp('laboratoireId').getValue(),
                        gammeId: Ext.getCmp('gammeId').getValue(),
                        bool_DECONDITIONNE: int_DECONDITIONNE,
                        cmu_price: Ext.getCmp('cmu_price').getValue()

                    },
                    success: function (response)
                    {
                        testextjs.app.getController('App').StopWaitingProcess();
                        var object = Ext.JSON.decode(response.responseText, false);
                        if (object.success == "0") {

                            Ext.MessageBox.show({
                                title: 'Message d\'erreur',
                                width: 320,
                                msg: object.errors,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.WARNING
                            });

                        } else {
                            win.close();
                            Ext.MessageBox.alert('Confirmation', object.errors, function () {
                                if (Omode === "create" || Omode === "update" || Omode === "decondition") {
                                    if (type == "famillemanager") {
                                        Me_Workflow = Oview;
                                        Me_Workflow.onRechClick();
                                    } else if (type == "commande") {
                                        Ext.getCmp('lgFAMILLEID').setValue(str_DESCRIPTION);
                                        Ext.getCmp('lgFAMILLEID').getStore().reload();
                                    }
                                }

                            });


                        }



                    },
                    failure: function (response)
                    {
                        testextjs.app.getController('App').StopWaitingProcess();
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: response.responseText,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.WARNING
                        });
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
    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_dci_famille + 'delete',
                            params: {
                                lg_FAMILLE_DCI_ID: rec.get('lg_FAMILLE_DCI_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_NAME') + ']', 'Suppression effectuee avec succes');
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);

                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                        return;
                    }
                });
    },
    onfiltercheck: function () {
        var lg_DCI_ID = Ext.getCmp('lg_DCI_ID').getValue();
//    var int_name_size = lg_DCI_ID.length;
        var OGrid = Ext.getCmp('lg_DCI_ID');
        if (lg_DCI_ID !== null && lg_DCI_ID !== "" && lg_DCI_ID !== undefined) {
            var OComponent_length = lg_DCI_ID.length;
            var url_final = url_services_data_dci + "?search_value=" + lg_DCI_ID;
            if (OComponent_length >= 3) {
                OGrid.getStore().getProxy().url = url_final;
                OGrid.getStore().reload();
            }
        } else {
            //alert('ici');
            OGrid.getStore().getProxy().url = url_services_data_dci;
            OGrid.getStore().reload();
        }
    },
    onRechClickDCI: function () {
        var rechecher_dci = Ext.getCmp('rechecher_dci').getValue();
        var lg_DCI_ID = "";
        if (Ext.getCmp('lg_DCI_ID').getValue() != null) {
            lg_DCI_ID = Ext.getCmp('lg_DCI_ID').getValue();
        }
        var OGrid = Ext.getCmp('gridpanelDciID');
        OGrid.getStore().getProxy().url = url_services_data_dci_famille + "?search_value=" + rechecher_dci + "&lg_FAMILLE_ID=" + ref + "&lg_DCI_ID=" + lg_DCI_ID;
        OGrid.getStore().reload();
        OGrid.getStore().getProxy().url = url_services_data_dci_famille + "?lg_FAMILLE_ID=" + ref;
    },
    onbtndciadd: function () {
        var internal_url = "";
        if (Ext.getCmp('lg_DCI_ID').getValue() == null || Ext.getCmp('lg_DCI_ID').getValue() == "") {
            Ext.MessageBox.alert('Error Message', 'Verifiez votre selection svp');
            return;
        }
        Ext.Ajax.request({
            url: url_services_transaction_dci_famille + 'create',
            params: {
                lg_FAMILLE_ID: ref,
                lg_DCI_ID: Ext.getCmp('lg_DCI_ID').getValue()
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    Ext.MessageBox.alert('Erreur Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    var OGrid = Ext.getCmp('gridpanelDciID');
                    OGrid.getStore().getProxy().url = url_services_data_dci_famille + "?lg_FAMILLE_ID=" + ref;
                    OGrid.getStore().reload();
                }



            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },

    onCreateDetailProduit: function (internal_url, lgFamilleId, strCodeRemise, intTauxMarque, intPriceTips, intPrice, boolDeconditionne, mode, view, type,win) {
        const strDescription = Ext.getCmp('str_DESCRIPTION').getValue();
        const isEditMode = mode === "update";
        Ext.Ajax.request({
            url: isEditMode ? internal_url + '/' + lgFamilleId : internal_url,
            method: isEditMode ? 'PUT' : 'POST',
            headers: {'Content-Type': 'application/json'},
            params: Ext.JSON.encode({
                intQuantityStock: Ext.getCmp('int_NUMBER_AVAILABLE').getValue(),
                lgCodeGestionId: Ext.getCmp('lg_CODE_GESTION_ID').getValue(),
                intStockReaprovisonement: Ext.getCmp('int_STOCK_REAPROVISONEMENT').getValue(),
                lgGrossisteId: Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                strCodeRemise: strCodeRemise,
                dtPeremtion: Ext.getCmp('dt_Peremtion_new').getSubmitValue(),
//                lg_REMISE_ID: Ext.getCmp('lg_REMISE_ID').getValue(),
                lgTypeEtiquetteId: Ext.getCmp('lg_TYPEETIQUETTE_ID').getValue(),
//                str_CODE_TVA: Ext.getCmp('str_CODE_TVA').getValue(),
                intT: Ext.getCmp('int_T').getValue(),
                strCodeTauxRemboursement: Ext.getCmp('str_CODE_TAUX_REMBOURSEMENT').getValue(),
                intQteReapprovisionnement: Ext.getCmp('int_QTE_REAPPROVISIONNEMENT').getValue(),
                lgCodeActeId: Ext.getCmp('lg_CODE_ACTE_ID').getValue(),
                intTauxMarque: intTauxMarque,
                intPat: Ext.getCmp('int_PAT').getValue(),
                intPaf: Ext.getCmp('int_PAF').getValue(),
                intPriceTips: intPriceTips,
                intPrice: intPrice,
                lgFamilleArticleId: Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue(),
                lgZoneGeoId: Ext.getCmp('lg_ZONE_GEO_ID').getValue(),
                lgFabriquantId: Ext.getCmp('lg_FABRIQUANT_ID').getValue(),
                strDescription: strDescription,
                intCip: Ext.getCmp('int_CIP').getValue(),
                intEan13: Ext.getCmp('int_EAN13').getValue(),
                intQteDetail: Ext.getCmp('int_QTEDETAIL').getValue(),
                lgCodeTvaId: Ext.getCmp('lg_CODE_TVA_ID').getValue(),
                intSeuilReserve: Ext.getCmp('int_SEUIL_RESERVE').getValue(),
                boolReserve: Ext.getCmp('bool_RESERVE').getValue(),
                laboratoireId: Ext.getCmp('laboratoireId').getValue(),
                gammeId: Ext.getCmp('gammeId').getValue(),
                boolDeconditionne: boolDeconditionne,
                cmuPrice: Ext.getCmp('cmu_price').getValue(),
                lgFamilleId: lgFamilleId

            }),
            success: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log(object);
                console.log(object.success);
                if (!object.success) {

                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: object.errors,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });

                } else {
                    win.close();
                    Ext.MessageBox.alert('Confirmation',"Opération effectuée avec succès", function () {
                        if (mode === "create" || mode === "update" || mode === "decondition") {
                            if (type == "famillemanager") {
                                Me_Workflow = view;
                                Me_Workflow.onRechClick();
                            } else if (type == "commande") {
                                Ext.getCmp('lgFAMILLEID').setValue(strDescription);
                                Ext.getCmp('lgFAMILLEID').getStore().reload();
                            }
                        }

                    });


                }



            },
            failure: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 320,
                    msg: response.responseText,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
            }
        });
    }


});





