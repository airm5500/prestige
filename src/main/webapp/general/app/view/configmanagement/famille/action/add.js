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

var Oview, Omode, Me, ref, type, bool_DECONDITIONNE;
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

    basePaf: null,
    basePrice: null,
    isDetailContext: false,

    setQtyDetailState: function(enabled) {
        var g = this._g || function() {
            return null;
        };
        var f = g('int_QTEDETAIL');
        if (!f) return;
        if (enabled) {
            f.show();
            f.enable();
            f.allowBlank = false;
        } else {
            f.hide();
            f.disable();
            f.allowBlank = true;
            f.reset();
        }
    },

    initComponent: function() {
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
            fields: [{
                name: 'id',
                type: 'string'
            }, {
                name: 'libelle',
                type: 'string'
            }],
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
            fields: [{
                name: 'id',
                type: 'string'
            }, {
                name: 'libelle',
                type: 'string'
            }],
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

        var int_RESERVE = new Ext.form.field.Display({
            xtype: 'displayfield',
            hidden: true,
            fieldLabel: 'Quantite reserve: ',
            name: 'int_RESERVE',
            itemId: 'int_RESERVE',
            fieldStyle: "color:blue;",
            flex: 1
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
            items: [{
                xtype: 'fieldset',
                collapsible: true,
                layout: 'vbox',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [{
                    xtype: 'container',
                    layout: 'hbox',
                    defaultType: 'textfield',
                    margin: '0 0 5 0',
                    items: [{
                        fieldLabel: 'Cip',
                        xtype: 'textfield',
                        maskRe: /[0-9.]/,
                        width: 400,
                        autoCreate: {
                            tag: 'input',
                            maxlength: '7'
                        },
                        emptyText: 'CIP',
                        name: 'int_CIP',
                        itemId: 'int_CIP',
                        allowBlank: false
                    }, {
                        fieldLabel: 'Designation',
                        width: 400,
                        emptyText: 'DESIGNATION',
                        name: 'str_DESCRIPTION',
                        itemId: 'str_DESCRIPTION',
                        allowBlank: false
                    }, {
                        fieldLabel: 'Prix.Achat.Tarif',
                        xtype: 'textfield',
                        maskRe: /[0-9.]/,
                        width: 350,
                        emptyText: 'PRIX ACHAT TARIF',
                        name: 'int_PAT',
                        itemId: 'int_PAT',
                        selectOnFocus: true,
                        hidden: true
                    }, {
                        fieldLabel: 'Prix Achat',
                        xtype: 'textfield',
                        maskRe: /[0-9.]/,
                        width: 350,
                        selectOnFocus: true,
                        emptyText: 'PRIX ACHAT',
                        name: 'int_PAF',
                        itemId: 'int_PAF',
                        fieldStyle: "color:blue;font-weight:bold;font-size:1.3em",
                        allowBlank: false
                    }]
                }, {
                    xtype: 'container',
                    layout: 'hbox',
                    defaultType: 'textfield',
                    margin: '0 0 5 0',
                    items: [{
                        xtype: 'combobox',
                        fieldLabel: 'Emplacement',
                        name: 'lg_ZONE_GEO_ID',
                        width: 400,
                        itemId: 'lg_ZONE_GEO_ID',
                        store: store_zonegeo_famille,
                        valueField: 'lg_ZONE_GEO_ID',
                        displayField: 'str_LIBELLEE',
                        pageSize: 20,
                        typeAhead: true,
                        minChars: 2,
                        allowBlank: false,
                        queryMode: 'remote',
                        emptyText: 'Choisir un emplacement...'
                    }, {
                        xtype: 'combobox',
                        fieldLabel: 'Famille',
                        name: 'lg_FAMILLEARTICLE_ID',
                        width: 400,
                        itemId: 'lg_FAMILLEARTICLE_ID',
                        store: store_famillearticle_famille,
                        valueField: 'lg_FAMILLEARTICLE_ID',
                        displayField: 'str_LIBELLE',
                        pageSize: 20,
                        typeAhead: true,
                        queryMode: 'remote',
                        allowBlank: false,
                        emptyText: 'Choisir une famille...'
                    }, {
                        fieldLabel: 'Prix.Vente',
                        xtype: 'textfield',
                        maskRe: /[0-9.]/,
                        width: 350,
                        emptyText: 'PRIX VENTE',
                        name: 'int_PRICE',
                        itemId: 'int_PRICE',
                        fieldStyle: "color:blue;font-weight:bold;font-size:1.3em",
                        selectOnFocus: true,
                        allowBlank: false,
                        enableKeyEvents: true,
                        listeners: {
                            keyup: function() {
                                if (Omode === "create" || Omode === "update") {
                                    var value = this.getValue();
                                    var tips = form.down('#int_PRICE_TIPS');
                                    if (tips) tips.setValue(value && value.length > 0 ? value : '');
                                }
                            }
                        }
                    }]
                }, {
                    xtype: 'container',
                    layout: 'hbox',
                    defaultType: 'textfield',
                    margin: '0 0 5 0',
                    items: [{
                        xtype: 'combobox',
                        fieldLabel: 'Fabriquant',
                        name: 'lg_FABRIQUANT_ID',
                        width: 400,
                        itemId: 'lg_FABRIQUANT_ID',
                        store: store_fabriquant,
                        valueField: 'lg_FABRIQUANT_ID',
                        displayField: 'str_NAME',
                        pageSize: 20,
                        typeAhead: true,
                        hidden: true,
                        queryMode: 'remote',
                        emptyText: 'Choisir un frabriquant...'
                    }, {
                        xtype: 'displayfield',
                        fieldLabel: 'Stock',
                        labelWidth: 110,
                        hidden: true,
                        name: 'int_NUMBER_AVAILABLE',
                        itemId: 'int_NUMBER_AVAILABLE',
                        fieldStyle: "color:blue;font-weight:bold;",
                        margin: '0 12 0 0',
                        value: 0
                    }, {
                        xtype: 'numberfield',
                        fieldLabel: 'Prix CMU',
                        maskRe: /[0-9.]/,
                        width: 350,
                        emptyText: 'PRIX CMU',
                        labelWidth: 110,
                        name: 'cmu_price',
                        itemId: 'cmu_price',
                        margin: '0 0 0 0'
                    }]
                }]
            }, {
                xtype: 'fieldset',
                collapsible: true,
                layout: 'vbox',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [{
                    xtype: 'container',
                    layout: 'hbox',
                    defaultType: 'textfield',
                    margin: '0 0 5 0',
                    items: [{
                        xtype: 'combobox',
                        fieldLabel: 'Code TVA',
                        name: 'lg_CODE_TVA_ID',
                        width: 350,
                        labelWidth: 110,
                        itemId: 'lg_CODE_TVA_ID',
                        store: store_codetva,
                        valueField: 'lg_CODE_TVA_ID',
                        displayField: 'str_NAME',
                        typeAhead: true,
                        allowBlank: false,
                        queryMode: 'remote',
                        emptyText: 'Choisir un code TVA...'
                    }, {
                        xtype: 'combobox',
                        fieldLabel: 'Grossiste',
                        name: 'lg_GROSSISTE_ID',
                        width: 350,
                        labelWidth: 100,
                        itemId: 'lg_GROSSISTE_ID',
                        store: store_grossiste_famille,
                        valueField: 'lg_GROSSISTE_ID',
                        pageSize: 20,
                        displayField: 'str_LIBELLE',
                        typeAhead: true,
                        allowBlank: false,
                        queryMode: 'remote',
                        emptyText: 'Choisir un grossiste...'
                    }, {
                        fieldLabel: 'Code EAN 13',
                        xtype: 'textfield',
                        labelWidth: 110,
                        maskRe: /[0-9.]/,
                        width: 350,
                        emptyText: 'Code EAN 13',
                        name: 'int_EAN13',
                        itemId: 'int_EAN13'
                    }]
                }]
            }, {
                xtype: 'fieldset',
                collapsible: true,
                layout: 'vbox',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [{
                    xtype: 'container',
                    layout: 'hbox',
                    defaultType: 'textfield',
                    margin: '0 0 5 0',
                    items: [{
                        xtype: 'combobox',
                        fieldLabel: 'Code.Acte',
                        name: 'lg_CODE_ACTE_ID',
                        width: 400,
                        itemId: 'lg_CODE_ACTE_ID',
                        store: store_codeacte_famille,
                        valueField: 'lg_CODE_ACTE_ID',
                        displayField: 'str_LIBELLEE',
                        typeAhead: true,
                        autoSelect: true,
                        selectOnFocus: true,
                        queryMode: 'remote',
                        emptyText: 'Choisir un code acte...'
                    }, {
                        fieldLabel: 'Code.Taux.Remb',
                        width: 400,
                        value: 0,
                        emptyText: 'TAUX REMBOURSEMENT',
                        name: 'str_CODE_TAUX_REMBOURSEMENT',
                        itemId: 'str_CODE_TAUX_REMBOURSEMENT'
                    }, {
                        fieldLabel: 'Code.Tableau',
                        width: 350,
                        emptyText: 'Code Tableau',
                        name: 'int_T',
                        itemId: 'int_T'
                    }]
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
                        itemId: 'lg_TYPEETIQUETTE_ID',
                        store: store_etiquette,
                        valueField: 'lg_TYPEETIQUETTE_ID',
                        displayField: 'str_DESCRIPTION',
                        typeAhead: true,
                        queryMode: 'remote',
                        emptyText: 'Choisir un code d\'etiquette...',
                        autoSelect: true,
                        selectOnFocus: true
                    }, {
                        xtype: 'combobox',
                        fieldLabel: 'Code.Remise',
                        name: 'str_CODE_REMISE',
                        itemId: 'str_CODE_REMISE',
                        store: ['0', '1', '2', '3', '4'],
                        valueField: 'str_CODE_REMISE',
                        displayField: 'str_CODE_REMISE',
                        width: 400,
                        value: 0,
                        typeAhead: true,
                        queryMode: 'local',
                        emptyText: 'Choisir une Remise...'
                    }, {
                        fieldLabel: 'Taux.Marque',
                        xtype: 'textfield',
                        maskRe: /[0-9.]/,
                        width: 250,
                        value: 0,
                        emptyText: 'TAUX MARQUE',
                        name: 'int_TAUX_MARQUE',
                        itemId: 'int_TAUX_MARQUE'
                    }]
                }]
            }, {
                xtype: 'fieldset',
                collapsible: true,
                layout: 'vbox',
                defaultType: 'textfield',
                items: [{
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
                        itemId: 'int_PRICE_TIPS'
                    }, {
                        xtype: 'combobox',
                        fieldLabel: 'Code.Gestion',
                        labelWidth: 90,
                        name: 'lg_CODE_GESTION_ID',
                        width: 270,
                        itemId: 'lg_CODE_GESTION_ID',
                        store: store_codegestion_famille,
                        pageSize: 20,
                        valueField: 'lg_CODE_GESTION_ID',
                        displayField: 'str_CODE_BAREME',
                        typeAhead: true,
                        queryMode: 'remote',
                        emptyText: 'Choisir un code gestion...'
                    }, {
                        fieldLabel: 'Date.Péremption',
                        xtype: 'datefield',
                        labelWidth: 100,
                        width: 250,
                        format: 'd/m/Y',
                        submitFormat: 'Y-m-d',
                        emptyText: 'Date.Péremption',
                        name: 'dt_Peremtion_new',
                        itemId: 'dt_Peremtion_new'
                    }, {
                        fieldLabel: 'Seuil.Reappro',
                        labelWidth: 90,
                        maskRe: /[0-9.]/,
                        width: 200,
                        xtype: 'numberfield',
                        emptyText: 'Seuil.Reappro',
                        name: 'int_STOCK_REAPROVISONEMENT',
                        itemId: 'int_STOCK_REAPROVISONEMENT'
                    }, {
                        fieldLabel: 'Qte.Reappro',
                        labelWidth: 90,
                        xtype: 'numberfield',
                        maskRe: /[0-9.]/,
                        width: 200,
                        emptyText: 'Qte.Reappro',
                        name: 'int_QTE_REAPPROVISIONNEMENT',
                        itemId: 'int_QTE_REAPPROVISIONNEMENT'
                    }]
                }]
            }, {
                xtype: 'fieldset',
                collapsible: true,
                layout: 'hbox',
                items: [{
                    xtype: 'combobox',
                    margin: '0 0 5 0',
                    fieldLabel: 'Gamme',
                    name: 'gammeId',
                    itemId: 'gammeId',
                    store: gammeStore,
                    forceselection: true,
                    pageSize: 999,
                    valueField: 'id',
                    displayField: 'libelle',
                    typeAhead: true,
                    flex: 1,
                    triggerAction: 'all',
                    queryMode: 'remote',
                    enableKeyEvents: true,
                    emptyText: 'Choisir une gamme..'
                }, {
                    xtype: 'splitter'
                }, {
                    xtype: 'combobox',
                    margin: '0 0 5 0',
                    fieldLabel: 'Laboratoire',
                    name: 'laboratoireId',
                    itemId: 'laboratoireId',
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
                }]
            },

            {
                xtype: 'fieldset',
                collapsible: true,
                itemId: 'info_reserve',
                layout: 'vbox',
                title: 'Infos.Reserve',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [{
                    xtype: 'container',
                    layout: 'hbox',
                    defaultType: 'textfield',
                    margin: '0 0 5 0',
                    width: '100%',
                    items: [{
                        allowBlank: false,
                        xtype: 'checkbox',
                        flex: 1,
                        labelWidth: 250,
                        fieldLabel: 'Cet article aura t-il un stock reserve?',
                        name: 'bool_RESERVE',
                        itemId: 'bool_RESERVE',
                        listeners: {
                            change: function(checkbox, newValue) {
                                var fs = checkbox.up('#info_reserve') || checkbox.up('fieldset');
                                var seuil = fs && fs.down('#int_SEUIL_RESERVE');
                                var reserveDf = fs && fs.down('#int_RESERVE');
                                if (newValue) {
                                    seuil && seuil.show();
                                    if (Me.isDetailContext) {
                                        Me.setQtyDetailState(true);
                                    } else {
                                        Me.setQtyDetailState(false);
                                    }
                                    reserveDf && reserveDf.show();
                                } else {
                                    if (seuil) {
                                        seuil.hide();
                                        seuil.setValue(0);
                                    }
                                    if (!Me.isDetailContext) {
                                        Me.setQtyDetailState(false);
                                    }
                                    reserveDf && reserveDf.hide();
                                }
                            }
                        }
                    }, {
                        xtype: 'splitter'
                    }, {
                        fieldLabel: 'Seuil reserve',
                        flex: 1,
                        minValue: 0,
                        hidden: true,
                        emptyText: 'Seuil reserve',
                        name: 'int_SEUIL_RESERVE',
                        itemId: 'int_SEUIL_RESERVE',
                        value: 0,
                        xtype: 'numberfield',
                        allowBlank: false,
                        regex: /[0-9.]/
                    }, {
                        xtype: 'splitter'
                    }, {
                        fieldLabel: 'Quantité dans *UN CH*',
                        flex: 1,
                        hidden: true,
                        xtype: 'numberfield',
                        minValue: 1,
                        emptyText: 'Quantite.Detail/Article',
                        name: 'int_QTEDETAIL',
                        itemId: 'int_QTEDETAIL',
                        fieldStyle: 'background-color: orange; background-image: none;color:blue;font-weight:bold;font-size:1.3em',
                        listeners: {
                            change: {
                                fn: this.onQtyDetailChange,
                                scope: this
                            },
                            specialkey: function(field, e) {
                                if (e.getKey() === e.ENTER) {
                                    var value = field.getValue();
                                    if (value > 1) {
                                        form.down('#int_PRICE').focus(true, 10);
                                    } else {
                                        Ext.MessageBox.show({
                                            title: 'Valeur incorrecte',
                                            msg: 'La quantité de détail doit être supérieure à 1.',
                                            buttons: Ext.MessageBox.OK,
                                            icon: Ext.MessageBox.WARNING,
                                            fn: function() {
                                                field.focus(true, 10);
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }, {
                        xtype: 'splitter'
                    },
                    int_RESERVE
                    ]
                }]
            },

            {
                xtype: 'fieldset',
                title: 'DCI',
                itemId: 'dcifieldset',
                collapsible: true,
                defaultType: 'textfield',
                layout: 'anchor',
                defaults: {
                    anchor: '100%'
                },
                items: [{
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    itemId: 'gridpanelDciID',
                    margin: '0 0 5 0',
                    store: store_dci_famille,
                    height: 200,
                    columns: [{
                        header: 'lg_FAMILLE_DCI_ID',
                        dataIndex: 'lg_FAMILLE_DCI_ID',
                        hidden: true,
                        flex: 1,
                        editor: {
                            allowBlank: false
                        }
                    }, {
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
                    }, {
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
                    }],
                    tbar: [{
                        xtype: 'textfield',
                        itemId: 'rechecher_dci',
                        name: 'rechecher_dci',
                        emptyText: 'Rech',
                        listeners: {
                            'render': function(cmp) {
                                cmp.getEl().on('keypress', function(e) {
                                    if (e.getKey() === e.ENTER) {
                                        Me.onRechClickDCI();
                                    }
                                });
                            }
                        }
                    },
                        '-', {
                        xtype: 'combobox',
                        name: 'lg_DCI_ID',
                        margins: '0 0 0 10',
                        itemId: 'lg_DCI_ID',
                        store: store_dci,
                        valueField: 'str_NAME',
                        displayField: 'str_NAME',
                        typeAhead: true,
                        pageSize: 20,
                        queryMode: 'remote',
                        width: 400,
                        emptyText: 'Selectionner un DCI...',
                        listeners: {
                            select: function() {
                                Me.onRechClickDCI();
                            },
                            change: function() {
                                Me.onfiltercheck();
                            }
                        }
                    },
                        '-', {
                        text: 'Associer',
                        tooltip: 'Associer le code DCI a cet article',
                        scope: this,
                        itemId: 'associate',
                        handler: this.onbtndciadd
                    }
                    ],
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

        var g = function(qid) {
            return form.down('#' + qid);
        };
        this._g = g;

        if (Omode === "update" && bool_DECONDITIONNE === "1") {
            var assoc = g('associate');
            if (assoc) assoc.hide();
        }

        if (Omode === "create") {
            var lg_CODE_ACTE_IDcom = g("lg_CODE_ACTE_ID");
            if (lg_CODE_ACTE_IDcom) {
                lg_CODE_ACTE_IDcom.getStore().on("load", function() {
                    lg_CODE_ACTE_IDcom.getStore().each(function(r) {
                        if (r.get('lg_CODE_ACTE_ID') === '0') lg_CODE_ACTE_IDcom.setValue(r.get('lg_CODE_ACTE_ID'));
                    });
                }, this, {
                    single: true
                });
            }

            var combo = g("lg_TYPEETIQUETTE_ID");
            if (combo) {
                combo.getStore().on("load", function() {
                    combo.getStore().each(function(r) {
                        if (r.get('lg_TYPEETIQUETTE_ID') === '2') combo.setValue(r.get('lg_TYPEETIQUETTE_ID'));
                    });
                }, this, {
                    single: true
                });
            }
        }

        if (Omode === "update" || Omode === "decondition") {
            if (this.getOdatasource().P_UPDATE_PAF === false) g('int_PAF').disable();
            if (this.getOdatasource().P_UPDATE_PRIXVENTE === false) g('int_PRICE').disable();
            if (this.getOdatasource().P_UPDATE_CODETABLEAU === false) g('int_T').disable();
            if (this.getOdatasource().P_UPDATE_CODEREMISE === false) g('str_CODE_REMISE').disable();
            if (this.getOdatasource().P_UPDATE_CIP === false) g('int_CIP').disable();
            if (this.getOdatasource().P_UPDATE_DESIGNATION === false) g('str_DESCRIPTION').disable();

            ref = this.getOdatasource().lg_FAMILLE_ID;
            g('int_NUMBER_AVAILABLE').setValue(this.getOdatasource().int_NUMBER_AVAILABLE);
            g('cmu_price').setValue(this.getOdatasource().cmu_price);
            g('int_NUMBER_AVAILABLE').show();
            g('lg_CODE_GESTION_ID').setValue(this.getOdatasource().lg_CODE_GESTION_ID);
            g('lg_GROSSISTE_ID').setValue(this.getOdatasource().lg_GROSSISTE_ID);
            g('int_STOCK_REAPROVISONEMENT').setValue(this.getOdatasource().int_STOCK_REAPROVISONEMENT);
            g('int_QTE_REAPPROVISIONNEMENT').setValue(this.getOdatasource().int_QTE_REAPPROVISIONNEMENT);
            g('str_CODE_REMISE').setValue(this.getOdatasource().str_CODE_REMISE);
            g('lg_TYPEETIQUETTE_ID').setValue(this.getOdatasource().lg_TYPEETIQUETTE_ID);
            g('lg_FABRIQUANT_ID').setValue(this.getOdatasource().lg_FABRIQUANT_ID);
            g('lg_FABRIQUANT_ID').show();
            g('int_T').setValue(this.getOdatasource().int_T);
            g('str_CODE_TAUX_REMBOURSEMENT').setValue(this.getOdatasource().str_CODE_TAUX_REMBOURSEMENT);
            g('lg_CODE_ACTE_ID').setValue(this.getOdatasource().lg_CODE_ACTE_ID);
            g('int_TAUX_MARQUE').setValue(this.getOdatasource().int_TAUX_MARQUE);
            g('int_PAT').setValue(this.getOdatasource().int_PAF);
            g('int_PAF').setValue(this.getOdatasource().int_PAF);
            g('int_PRICE_TIPS').setValue(this.getOdatasource().int_PRICE_TIPS);
            g('int_PRICE').setValue(this.getOdatasource().int_PRICE);
            g('lg_FAMILLEARTICLE_ID').setValue(this.getOdatasource().lg_FAMILLEARTICLE_ID);
            g('lg_ZONE_GEO_ID').setValue(this.getOdatasource().lg_ZONE_GEO_ID);
            g('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            g('int_CIP').setValue(this.getOdatasource().int_CIP);
            g('int_QTEDETAIL').setValue(this.getOdatasource().int_NUMBERDETAIL);
            g('lg_CODE_TVA_ID').setValue(this.getOdatasource().lg_CODE_TVA_ID);
            g('int_EAN13').setValue(this.getOdatasource().int_EAN13);
            g('bool_RESERVE').setValue(this.getOdatasource().bool_RESERVE);
            g('dt_Peremtion_new').setValue(this.getOdatasource().dt_Peremtion);

            if (this.getOdatasource().bool_RESERVE === "true") {
                var dfReserve = g('int_RESERVE');
                var seuil = g('int_SEUIL_RESERVE');
                if (seuil) {
                    seuil.setValue(this.getOdatasource().int_SEUIL_RESERVE);
                    seuil.show();
                }
                if (dfReserve) {
                    dfReserve.setValue(this.getOdatasource().int_STOCK_RESERVE);
                    dfReserve.show();
                }
            }

            bool_DECONDITIONNE = this.getOdatasource().bool_DECONDITIONNE;

            var laboratoireId = this.getOdatasource().laboratoireId;
            var gammeId = this.getOdatasource().gammeId;
            gammeStore.load({
                callback: function(records) {
                    Ext.each(records, function(item) {
                        let rec = item.data;
                        if (rec.id === gammeId) {
                            g('gammeId').setValue(rec.id);
                            return false;
                        }
                    });
                }
            });
            laboratoireStore.load({
                callback: function(records) {
                    Ext.each(records, function(item) {
                        let rec = item.data;
                        if (rec.id === laboratoireId) {
                            g('laboratoireId').setValue(rec.id);
                            return false;
                        }
                    });
                }
            });
        }

        const isDeconditionCreate = (Omode === "decondition");
        const isUpdateDeconditioned = (Omode === "update" && this.getOdatasource() && this.getOdatasource().bool_DECONDITIONNE === 1);
        this.isDetailContext = (isDeconditionCreate || isUpdateDeconditioned);
        this.setQtyDetailState(this.isDetailContext);

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: '90%',
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            modal: true,
            maximizable: true,
            closeAction: 'destroy',
            items: form,
            buttons: [{
                text: 'Enregistrer',
                handler: this.onbtnsave,
                scope: this
            }, {
                text: 'Retour',
                handler: function() {
                    win.close();
                }
            }],
            listeners: {
                beforeclose: function() {
                    var rech = Ext.getCmp('rechecher');
                    if (rech) rech.focus();
                },
                show: function() {
                    Ext.defer(function() {
                        var fieldToFocus = g('int_QTEDETAIL');
                        if (fieldToFocus && fieldToFocus.isVisible()) {
                            fieldToFocus.focus(true, 10);
                        }
                    }, 100);
                }
            }
        });

        if (Omode === "create") {
            var dciFs = g('dcifieldset');
            if (dciFs) dciFs.hide();
        }
    },

    onbtnsave: function(button) {
        var win = button.up('window'),
            form = win.down('form'),
            g = this._g;

        this.setQtyDetailState(this.isDetailContext);

        if (form.isValid()) {
            let internal_url = "";
            let int_DECONDITIONNE = 0;
            let int_QTEDETAIL = g('int_QTEDETAIL').getValue();

            if (Omode === "create") {
                internal_url = url_services_transaction_famille + 'create';
                g('int_PAT').setValue(g('int_PAF').getValue());
            } else if (Omode === "update") {
                internal_url = url_services_transaction_famille + 'update&lg_FAMILLE_ID=' + ref;
            }

            if (this.isDetailContext) {
                int_DECONDITIONNE = 1;
                if (!int_QTEDETAIL || int_QTEDETAIL <= 0) {
                    Ext.MessageBox.alert('Impossible', 'Veuillez renseigner la quantite detail de l\'article');
                    return;
                }
            }

            if (parseInt(g('int_PAF').getValue()) > parseInt(g('int_PRICE').getValue())) {
                Ext.MessageBox.alert('Impossible', 'Le prix d\'achat doit etre inferieur au prix de vente');
                return;
            }

            var int_PRICE_TIPS = g('int_PRICE_TIPS').getValue() || 0,
                int_TAUX_MARQUE = g('int_TAUX_MARQUE').getValue() || 0,
                str_CODE_REMISE = g('str_CODE_REMISE').getValue() || 0,
                int_PRICE = g('int_PRICE').getValue() || 0;

            var str_DESCRIPTION = g('str_DESCRIPTION').getValue();

            testextjs.app.getController('App').ShowWaitingProcess();

            if (this.isDetailContext) {
                internal_url = '../api/v1/produit/create-detail';
                this.onCreateDetailProduit(
                    internal_url, ref, str_CODE_REMISE, int_TAUX_MARQUE, int_PRICE_TIPS, int_PRICE,
                    int_DECONDITIONNE, Omode, Oview, type, win
                );
                return;
            }

            Ext.Ajax.request({
                url: internal_url,
                params: {
                    int_NUMBER_AVAILABLE: g('int_NUMBER_AVAILABLE').getValue(),
                    lg_CODE_GESTION_ID: g('lg_CODE_GESTION_ID').getValue(),
                    int_STOCK_REAPROVISONEMENT: g('int_STOCK_REAPROVISONEMENT').getValue(),
                    lg_GROSSISTE_ID: g('lg_GROSSISTE_ID').getValue(),
                    str_CODE_REMISE: str_CODE_REMISE,
                    dt_Peremtion: g('dt_Peremtion_new').getSubmitValue(),
                    lg_TYPEETIQUETTE_ID: g('lg_TYPEETIQUETTE_ID').getValue(),
                    int_T: g('int_T').getValue(),
                    str_CODE_TAUX_REMBOURSEMENT: g('str_CODE_TAUX_REMBOURSEMENT').getValue(),
                    int_QTE_REAPPROVISIONNEMENT: g('int_QTE_REAPPROVISIONNEMENT').getValue(),
                    lg_CODE_ACTE_ID: g('lg_CODE_ACTE_ID').getValue(),
                    int_TAUX_MARQUE: int_TAUX_MARQUE,
                    int_PAT: g('int_PAT').getValue(),
                    int_PAF: g('int_PAF').getValue(),
                    int_PRICE_TIPS: int_PRICE_TIPS,
                    int_PRICE: int_PRICE,
                    lg_FAMILLEARTICLE_ID: g('lg_FAMILLEARTICLE_ID').getValue(),
                    lg_ZONE_GEO_ID: g('lg_ZONE_GEO_ID').getValue(),
                    lg_FABRIQUANT_ID: g('lg_FABRIQUANT_ID').getValue(),
                    str_DESCRIPTION: g('str_DESCRIPTION').getValue(),
                    int_CIP: g('int_CIP').getValue(),
                    int_EAN13: g('int_EAN13').getValue(),
                    int_QTEDETAIL: g('int_QTEDETAIL').getValue(),
                    lg_CODE_TVA_ID: g('lg_CODE_TVA_ID').getValue(),
                    int_SEUIL_RESERVE: (function() {
                        var s = form.down('#int_SEUIL_RESERVE');
                        return s ? s.getValue() : 0;
                    })(),
                    bool_RESERVE: g('bool_RESERVE').getValue(),
                    laboratoireId: g('laboratoireId').getValue(),
                    gammeId: g('gammeId').getValue(),
                    bool_DECONDITIONNE: int_DECONDITIONNE,
                    cmu_price: g('cmu_price').getValue()
                },
                success: function(response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success === "0") {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: object.errors,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.WARNING
                        });
                    } else {
                        win.close();
                        Ext.MessageBox.alert('Confirmation', object.errors, function() {
                            if (Omode === "create" || Omode === "update" || Omode === "decondition") {
                                if (type === "famillemanager") {
                                    Me_Workflow = Oview;
                                    Me_Workflow.onRechClick();
                                } else if (type === "commande") {
                                    Ext.getCmp('lgFAMILLEID').setValue(str_DESCRIPTION);
                                    Ext.getCmp('lgFAMILLEID').getStore().reload();
                                }
                            }
                        });
                    }
                },
                failure: function(response) {
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
        } else {
            Ext.MessageBox.show({
                title: 'Echec',
                msg: 'Veuillez renseignez les champs obligatoires',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
        }
    },

    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message', 'Confirmer la suppresssion', function(btn) {
            if (btn === 'yes') {
                var rec = grid.getStore().getAt(rowIndex);
                Ext.Ajax.request({
                    url: url_services_transaction_dci_famille + 'delete',
                    params: {
                        lg_FAMILLE_DCI_ID: rec.get('lg_FAMILLE_DCI_ID')
                    },
                    success: function(response) {
                        var object = Ext.JSON.decode(response.responseText, false);
                        if (object.success === 0) {
                            Ext.MessageBox.alert('Error Message', object.errors);
                            return;
                        } else {
                            Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_NAME') + ']', 'Suppression effectuee avec succes');
                        }
                        grid.getStore().reload();
                    },
                    failure: function(response) {
                        Ext.MessageBox.alert('Error Message', response.responseText);
                    }
                });
            }
        });
    },

    onfiltercheck: function() {
        var form = this.down('form'),
            g = this._g || function(q) {
                return form.down('#' + q);
            };
        var lg_DCI_ID = g('lg_DCI_ID') && g('lg_DCI_ID').getValue();
        var OGrid = g('lg_DCI_ID');
        if (lg_DCI_ID !== null && lg_DCI_ID !== "" && lg_DCI_ID !== undefined) {
            var len = lg_DCI_ID.length;
            var url_final = url_services_data_dci + "?search_value=" + lg_DCI_ID;
            if (len >= 3) {
                OGrid.getStore().getProxy().url = url_final;
                OGrid.getStore().reload();
            }
        } else {
            OGrid.getStore().getProxy().url = url_services_data_dci;
            OGrid.getStore().reload();
        }
    },

    onRechClickDCI: function() {
        var form = this.down('form'),
            g = this._g || function(q) {
                return form.down('#' + q);
            };
        var rechecher_dci = g('rechecher_dci').getValue();
        var lg_DCI_ID = g('lg_DCI_ID').getValue() || "";
        var grid = form.down('#gridpanelDciID');
        grid.getStore().getProxy().url = url_services_data_dci_famille + "?search_value=" + rechecher_dci + "&lg_FAMILLE_ID=" + ref + "&lg_DCI_ID=" + lg_DCI_ID;
        grid.getStore().reload();
        grid.getStore().getProxy().url = url_services_data_dci_famille + "?lg_FAMILLE_ID=" + ref;
    },

    onQtyDetailChange: function(field, newValue) {
        if (!this.isDetailContext) return;
        var g = this._g;
        const qteDetail = newValue;
        const pafField = g('int_PAF');
        const priceField = g('int_PRICE');

        if (this.basePaf === null) {
            this.basePaf = pafField.getValue();
            this.basePrice = priceField.getValue();
        }
        if (!qteDetail || qteDetail <= 0) {
            pafField.setValue(this.basePaf);
            priceField.setValue(this.basePrice);
            return;
        }

        const newPaf = Math.round(this.basePaf / qteDetail);
        const newPrice = Math.round(this.basePrice / qteDetail);

        pafField.setValue(newPaf);
        priceField.setValue(newPrice);
    },

    onCreateDetailProduit: function(internal_url, lgFamilleId, strCodeRemise, intTauxMarque, intPriceTips, intPrice, boolDeconditionne, mode, view, type, win) {
        var form = win.down('form'),
            g = this._g;
        const strDescription = g('str_DESCRIPTION').getValue();
        const isEditMode = mode === "update";
        Ext.Ajax.request({
            url: isEditMode ? internal_url + '/' + lgFamilleId : internal_url,
            method: isEditMode ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            params: Ext.JSON.encode({
                intQuantityStock: g('int_NUMBER_AVAILABLE').getValue(),
                lgCodeGestionId: g('lg_CODE_GESTION_ID').getValue(),
                intStockReaprovisonement: g('int_STOCK_REAPROVISONEMENT').getValue(),
                lgGrossisteId: g('lg_GROSSISTE_ID').getValue(),
                strCodeRemise: strCodeRemise,
                dtPeremtion: g('dt_Peremtion_new').getSubmitValue(),
                lgTypeEtiquetteId: g('lg_TYPEETIQUETTE_ID').getValue(),
                intT: g('int_T').getValue(),
                strCodeTauxRemboursement: g('str_CODE_TAUX_REMBOURSEMENT').getValue(),
                intQteReapprovisionnement: g('int_QTE_REAPPROVISIONNEMENT').getValue(),
                lgCodeActeId: g('lg_CODE_ACTE_ID').getValue(),
                intTauxMarque: intTauxMarque,
                intPat: g('int_PAT').getValue(),
                intPaf: g('int_PAF').getValue(),
                intPriceTips: intPriceTips,
                intPrice: intPrice,
                lgFamilleArticleId: g('lg_FAMILLEARTICLE_ID').getValue(),
                lgZoneGeoId: g('lg_ZONE_GEO_ID').getValue(),
                lgFabriquantId: g('lg_FABRIQUANT_ID').getValue(),
                strDescription: strDescription,
                intCip: g('int_CIP').getValue(),
                intEan13: g('int_EAN13').getValue(),
                intQteDetail: g('int_QTEDETAIL').getValue(),
                lgCodeTvaId: g('lg_CODE_TVA_ID').getValue(),
                intSeuilReserve: (function() {
                    var s = form.down('#int_SEUIL_RESERVE');
                    return s ? s.getValue() : 0;
                })(),
                boolReserve: g('bool_RESERVE').getValue(),
                laboratoireId: g('laboratoireId').getValue(),
                gammeId: g('gammeId').getValue(),
                boolDeconditionne: boolDeconditionne,
                cmuPrice: g('cmu_price').getValue(),
                lgFamilleId: lgFamilleId
            }),
            success: function(response) {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
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
                    Ext.MessageBox.alert('Confirmation', "Opération effectuée avec succès", function() {
                        if (mode === "create" || mode === "update" || mode === "decondition") {
                            if (type === "famillemanager") {
                                Me_Workflow = view;
                                Me_Workflow.onRechClick();
                            } else if (type === "commande") {
                                Ext.getCmp('lgFAMILLEID').setValue(strDescription);
                                Ext.getCmp('lgFAMILLEID').getStore().reload();
                            }
                        }
                    });
                }
            },
            failure: function(response) {
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