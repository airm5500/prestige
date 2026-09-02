var winModifArticleOuverte = null;
/* global Ext */

// Affiche uniquement la lettre de la classe ABC (ex: "ABC_CLASSE_C" -> "C").
function abcClasseLetter(id) {
    if (!id) { return 'Non classe'; }
    var parts = String(id).split('_');
    return parts[parts.length - 1] || 'Non classe';
}

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
var url_services_data_codetva = '../api/v1/common/tvas'; // service REST rapide (meme format que ws_data_codetva.jsp)
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
    isDetailContext: false, // active le recalcul seulement quand 'required'

    // Helper de lookup dans le form
    _g: null,

    // mode ∈ {'required','optional','off'}
    setQtyDetailState: function (mode) {
        var g = this._g || function(){ return null; };
        var f = g('int_NUMBERDETAIL');
        if (!f) return;
        if (mode === 'required') {
            f.show();  f.enable();  f.allowBlank = false;
            this.isDetailContext = true;   // recalcul actif
        } else if (mode === 'optional') {
            f.show();  f.enable();  f.allowBlank = true;
            this.isDetailContext = false;  // pas de recalcul
        } else { // 'off'
            f.hide();  f.disable(); f.allowBlank = true; f.reset();
            this.isDetailContext = false;  // pas de recalcul
        }
    },

    initComponent: function () {
        Oview = this.getParentview();
        ref = (this.getOdatasource() || {}).lg_FAMILLE_ID;
        Omode = this.getMode();
        type = this.getType();
        Me = this;

        var itemsPerPage = 20;
        bool_DECONDITIONNE = '0';

        var store_fabriquant = new Ext.data.Store({
            model: 'testextjs.model.Fabriquant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: { type: 'ajax', url: url_services_data_fabriquant, reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        laboratoireStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: [{name:'id',type:'string'},{name:'libelle',type:'string'}],
            autoLoad: false,
            pageSize: 9999,
            proxy: { type: 'ajax', url: '../api/v1/common/laboratoireproduits', reader: { type: 'json', root: 'data', totalProperty: 'total' } }
        });

        gammeStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: [{name:'id',type:'string'},{name:'libelle',type:'string'}],
            autoLoad: false,
            pageSize: 9999,
            proxy: { type: 'ajax', url: '../api/v1/common/gammeproduits', reader: { type: 'json', root: 'data', totalProperty: 'total' } }
        });

        var store_dci_famille = new Ext.data.Store({
            model: 'testextjs.model.Dci_famille',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: { type: 'ajax', url: '../api/v1/referentiel-article/dci-famille?lg_FAMILLE_ID=' + ref, reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        var store_dci = new Ext.data.Store({
            model: 'testextjs.model.Dci',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: { type: 'ajax', url: '../api/v1/referentiel-article/dcis-initial', reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        var store_etiquette = new Ext.data.Store({
            model: 'testextjs.model.Typeetiquette',
            pageSize: itemsPerPage,
            storeId: 'store_etiquette',
            autoLoad: true,
            proxy: { type: 'ajax', url: '../api/v1/referentiel-article/typeetiquettes', reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        var store_remise = new Ext.data.Store({
            model: 'testextjs.model.Remise',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: { type: 'ajax', url: url_services_data_remise + '?AllRemise=true', reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        var store_codetva = new Ext.data.Store({
            model: 'testextjs.model.CodeTva',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: { type: 'ajax', url: url_services_data_codetva, reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        // display local (itemId uniquement)
        var int_RESERVE = new Ext.form.field.Display({
            xtype: 'displayfield',
            hidden: true,
            fieldLabel: 'Quantite reserve: ',
            name: 'int_STOCK_RESERVE',
            itemId: 'int_RESERVE',
            fieldStyle: 'color:blue;',
            flex: 1
        });

        var store_famillearticle_famille = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: { type: 'ajax', url: '../api/v1/common/famille-articles', reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        var store_grossiste_famille = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: { type: 'ajax', url: '../api/v1/grossiste/all', reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        var store_zonegeo_famille = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: { type: 'ajax', url: '../api/v1/referentiel-article/zones-geographiques', reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        var store_codegestion_famille = new Ext.data.Store({
            model: 'testextjs.model.CodeGestion',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: { type: 'ajax', url: url_services_data_codegestion_famille, reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        var store_codeacte_famille = new Ext.data.Store({
            model: 'testextjs.model.CodeActe',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: { type: 'ajax', url: '../api/v1/referentiel-article/codeactes', reader: { type: 'json', root: 'results', totalProperty: 'total' } }
        });

        // FORM
        var form = new Ext.form.Panel({
            bodyPadding: 15,
            autoScroll: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                selectOnFocus: true,
                layout: { type: 'vbox', align: 'stretch', padding: 10 },
                defaults: { flex: 1 },
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    defaultType: 'textfield',
                    defaults: { anchor: '100%' },
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                { fieldLabel: 'Cip', xtype: 'textfield', maskRe: /[0-9.]/, width: 400, autoCreate: { tag: 'input', maxlength: '7' }, emptyText: 'CIP', name: 'int_CIP', itemId: 'int_CIP', allowBlank: false },
                                /* Generateur de code CIP interne : quand on ne sait pas quel code
                                 * mettre, un clic remplit le champ d'un code de sept chiffres
                                 * qu'aucun article ne porte. Voir PrestigeCodeCip. */
                                { xtype: 'button', itemId: 'btnGenererCip', text: '+', width: 28, margin: '0 8 0 2',
                                  tooltip: 'Générer un code CIP interne inexistant dans le système',
                                  handler: function (btn) { window.PrestigeCodeCip.generer(btn, btn.up('container').down('#int_CIP'), btn.up('form').down('#str_DESCRIPTION')); } },
                                { fieldLabel: 'Designation', width: 400, emptyText: 'DESIGNATION', name: 'str_DESCRIPTION', itemId: 'str_DESCRIPTION', allowBlank: false },
                                { fieldLabel: 'Prix.Achat.Tarif', xtype: 'textfield', maskRe: /[0-9.]/, width: 350, emptyText: 'PRIX ACHAT TARIF', name: 'int_PAT', itemId: 'int_PAT', selectOnFocus: true, hidden: true },
                                { fieldLabel: 'Prix Achat', xtype: 'textfield', maskRe: /[0-9.]/, width: 350, selectOnFocus: true, emptyText: 'PRIX ACHAT', name: 'int_PAF', itemId: 'int_PAF', fieldStyle: 'color:blue;font-weight:bold;font-size:1.3em', allowBlank: false }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                /* forceSelection : l'emplacement doit etre CHOISI dans la liste. Sans cela, un
                                 * libelle simplement saisi etait envoye tel quel au serveur, qui le cherchait
                                 * parmi les libelles - et deux emplacements portant le meme nom faisaient
                                 * echouer l'enregistrement. Le champ ne rend plus qu'un identifiant reel. */
                                { xtype: 'combobox', fieldLabel: 'Emplacement', name: 'lg_ZONE_GEO_ID', width: 400, itemId: 'lg_ZONE_GEO_ID', store: store_zonegeo_famille, valueField: 'lg_ZONE_GEO_ID', displayField: 'str_LIBELLEE', pageSize: 20, minChars: 2, allowBlank: false, forceSelection: true, queryMode: 'remote', emptyText: 'Choisir un emplacement...' },
                                { xtype: 'combobox', fieldLabel: 'Famille', name: 'lg_FAMILLEARTICLE_ID', width: 400, itemId: 'lg_FAMILLEARTICLE_ID', store: store_famillearticle_famille, valueField: 'lg_FAMILLEARTICLE_ID', displayField: 'str_LIBELLE', pageSize: 20, minChars: 2, queryMode: 'remote', allowBlank: false, emptyText: 'Choisir une famille...' },
                                {
                                    fieldLabel: 'Prix.Vente', xtype: 'textfield', maskRe: /[0-9.]/, width: 350, emptyText: 'PRIX VENTE', name: 'int_PRICE', itemId: 'int_PRICE',
                                    fieldStyle: 'color:blue;font-weight:bold;font-size:1.3em', selectOnFocus: true, allowBlank: false, enableKeyEvents: true,
                                    listeners: {
                                        keyup: function () {
                                            if (Omode === 'create' || Omode === 'update') {
                                                var value = this.getValue();
                                                var tips = form.down('#int_PRICE_TIPS');
                                                if (tips) tips.setValue(value && value.length > 0 ? value : '');
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
                            items: [
                                { xtype: 'combobox', fieldLabel: 'Fabriquant', name: 'lg_FABRIQUANT_ID', width: 400, itemId: 'lg_FABRIQUANT_ID', store: store_fabriquant, valueField: 'lg_FABRIQUANT_ID', displayField: 'str_NAME', pageSize: 20, typeAhead: true, hidden: true, queryMode: 'remote', emptyText: 'Choisir un frabriquant...' },
                                { xtype: 'displayfield', fieldLabel: 'Stock', labelWidth: 110, hidden: true, name: 'int_NUMBER_AVAILABLE', itemId: 'int_NUMBER_AVAILABLE', fieldStyle: 'color:blue;font-weight:bold;', margin: '0 12 0 0', value: 0 },
                                { xtype: 'numberfield', fieldLabel: 'Prix CMU', maskRe: /[0-9.]/, width: 350, emptyText: 'PRIX CMU', labelWidth: 110, name: 'cmu_price', itemId: 'cmu_price', margin: '0 0 0 0' }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    defaultType: 'textfield',
                    defaults: { anchor: '100%' },
                    items: [{
                        xtype: 'container',
                        layout: 'hbox',
                        defaultType: 'textfield',
                        margin: '0 0 5 0',
                        items: [
                            { xtype: 'combobox', fieldLabel: 'Code TVA', name: 'lg_CODE_TVA_ID', width: 350, labelWidth: 110, itemId: 'lg_CODE_TVA_ID', store: store_codetva, valueField: 'lg_CODE_TVA_ID', displayField: 'str_NAME', typeAhead: true, allowBlank: false, queryMode: 'remote', emptyText: 'Choisir un code TVA...' },
                            { xtype: 'combobox', fieldLabel: 'Grossiste', name: 'lg_GROSSISTE_ID', width: 350, labelWidth: 100, itemId: 'lg_GROSSISTE_ID', store: store_grossiste_famille, valueField: 'lg_GROSSISTE_ID', pageSize: 20, displayField: 'str_LIBELLE', minChars: 2, allowBlank: false, queryMode: 'remote', emptyText: 'Choisir un grossiste...' },
                            { fieldLabel: 'Code EAN 13', xtype: 'textfield', labelWidth: 110, maskRe: /[0-9.]/, width: 350, emptyText: 'Code EAN 13', name: 'int_EAN13', itemId: 'int_EAN13' }
                        ]
                    }]
                },
                {
                    // Socle ABC (Lot 0) : localisation fine + classe ABC (lecture seule)
                    xtype: 'fieldset',
                    collapsible: true,
                    title: 'Classification & Localisation',
                    layout: 'vbox',
                    defaultType: 'textfield',
                    defaults: { anchor: '100%' },
                    items: [{
                        xtype: 'container',
                        layout: 'hbox',
                        defaultType: 'textfield',
                        margin: '0 0 5 0',
                        items: [
                            { fieldLabel: 'Code Geo article', xtype: 'textfield', width: 400, labelWidth: 130, emptyText: 'Ex: A12-B03-C04', name: 'str_CODE_GEO_ARTICLE', itemId: 'str_CODE_GEO_ARTICLE' },
                            { xtype: 'splitter' },
                            { xtype: 'displayfield', fieldLabel: 'Classe ABC', labelWidth: 110, name: 'classe_abc_display', itemId: 'classe_abc_display', value: 'Non classe', fieldStyle: 'color:blue;font-weight:bold;' }
                        ]
                    }, {
                        xtype: 'container',
                        layout: 'hbox',
                        margin: '0 0 5 0',
                        defaultType: 'checkbox',
                        items: [
                            { boxLabel: 'Calcul seuil/qte reappro', name: 'bool_CALCUL_SEUIL', itemId: 'bool_CALCUL_SEUIL', checked: true, width: 200 },
                            { boxLabel: 'Suggerer', name: 'bool_SUGGERABLE', itemId: 'bool_SUGGERABLE', checked: true, width: 110 },
                            { boxLabel: 'Article Remisable', name: 'bool_REMISE', itemId: 'bool_REMISE', checked: true, width: 150 }
                        ]
                    }, {
                        xtype: 'container',
                        layout: 'hbox',
                        margin: '0 0 5 0',
                        defaultType: 'numberfield',
                        items: [
                            { fieldLabel: 'Semois_Q1_seuil_reappro', labelWidth: 180, width: 300, minValue: 0, allowDecimals: false, name: 'int_Q1_SEUIL_REAPPRO', itemId: 'int_Q1_SEUIL_REAPPRO' },
                            { xtype: 'splitter' },
                            { fieldLabel: 'Semois_Q2_qte_reappro', labelWidth: 180, width: 300, minValue: 0, allowDecimals: false, name: 'int_Q2_QTE_REAPPRO', itemId: 'int_Q2_QTE_REAPPRO' }
                        ]
                    }]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    defaultType: 'textfield',
                    defaults: { anchor: '100%' },
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                { xtype: 'combobox', fieldLabel: 'Code.Acte', name: 'lg_CODE_ACTE_ID', width: 400, itemId: 'lg_CODE_ACTE_ID', store: store_codeacte_famille, valueField: 'lg_CODE_ACTE_ID', displayField: 'str_LIBELLEE', typeAhead: true, autoSelect: true, selectOnFocus: true, queryMode: 'remote', emptyText: 'Choisir un code acte...' },
                                { fieldLabel: 'Code.Taux.Remb', width: 400, value: 0, emptyText: 'TAUX REMBOURSEMENT', name: 'str_CODE_TAUX_REMBOURSEMENT', itemId: 'str_CODE_TAUX_REMBOURSEMENT' },
                                { fieldLabel: 'Code.Tableau', width: 350, emptyText: 'Code Tableau', name: 'int_T', itemId: 'int_T' }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                { xtype: 'combobox', fieldLabel: 'Code etiquette', name: 'lg_TYPEETIQUETTE_ID', width: 400, itemId: 'lg_TYPEETIQUETTE_ID', store: store_etiquette, valueField: 'lg_TYPEETIQUETTE_ID', displayField: 'str_DESCRIPTION', typeAhead: true, queryMode: 'remote', emptyText: 'Choisir un code d\'etiquette...', autoSelect: true, selectOnFocus: true },
                                { xtype: 'combobox', fieldLabel: 'Code.Remise', name: 'str_CODE_REMISE', itemId: 'str_CODE_REMISE', store: ['0', '1', '2', '3', '4'], valueField: 'str_CODE_REMISE', displayField: 'str_CODE_REMISE', width: 400, value: 0, typeAhead: true, queryMode: 'local', emptyText: 'Choisir une Remise...' },
                                { fieldLabel: 'Taux.Marque', xtype: 'textfield', maskRe: /[0-9.]/, width: 250, value: 0, emptyText: 'TAUX MARQUE', name: 'int_TAUX_MARQUE', itemId: 'int_TAUX_MARQUE' }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    defaultType: 'textfield',
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                { fieldLabel: 'Prix.Reference', xtype: 'textfield', maskRe: /[0-9.]/, width: 200, labelWidth: 90, emptyText: 'PRIX TIPS', name: 'int_PRICE_TIPS', itemId: 'int_PRICE_TIPS' },
                                { xtype: 'combobox', fieldLabel: 'Code.Gestion', labelWidth: 90, name: 'lg_CODE_GESTION_ID', width: 270, itemId: 'lg_CODE_GESTION_ID', store: store_codegestion_famille, pageSize: 20, valueField: 'lg_CODE_GESTION_ID', displayField: 'str_CODE_BAREME', typeAhead: true, queryMode: 'remote', emptyText: 'Choisir un code gestion...' },
                                { fieldLabel: 'Date.Péremption', xtype: 'datefield', labelWidth: 100, width: 250, format: 'd/m/Y', submitFormat: 'Y-m-d', emptyText: 'Date.Péremption', name: 'dt_Peremtion_new', itemId: 'dt_Peremtion_new' },
                                { fieldLabel: 'Seuil.Reappro', labelWidth: 90, maskRe: /[0-9.]/, width: 200, xtype: 'numberfield', emptyText: 'Seuil.Reappro', name: 'int_STOCK_REAPROVISONEMENT', itemId: 'int_STOCK_REAPROVISONEMENT' },
                                { fieldLabel: 'Qte.Reappro', labelWidth: 90, xtype: 'numberfield', maskRe: /[0-9.]/, width: 200, emptyText: 'Qte.Reappro', name: 'int_QTE_REAPPROVISIONNEMENT', itemId: 'int_QTE_REAPPROVISIONNEMENT' }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'hbox',
                    items: [
                        { xtype: 'combobox', margin: '0 0 5 0', fieldLabel: 'Gamme', name: 'gammeId', itemId: 'gammeId', store: gammeStore, forceselection: true, pageSize: 999, valueField: 'id', displayField: 'libelle', minChars: 2, flex: 1, triggerAction: 'all', queryMode: 'remote', enableKeyEvents: true, emptyText: 'Choisir une gamme..' },
                        { xtype: 'splitter' },
                        { xtype: 'combobox', margin: '0 0 5 0', fieldLabel: 'Laboratoire', name: 'laboratoireId', itemId: 'laboratoireId', store: laboratoireStore, forceselection: true, pageSize: 999, valueField: 'id', displayField: 'libelle', minChars: 2, flex: 1, triggerAction: 'all', queryMode: 'remote', enableKeyEvents: true, emptyText: 'Choisir un laboratoire..' }
                    ]
                },

                {
                    xtype: 'fieldset',
                    collapsible: true,
                    itemId: 'info_reserve',
                    layout: 'vbox',
                    title: 'Infos.Reserve',
                    defaultType: 'textfield',
                    defaults: { anchor: '100%' },
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
                                    name: 'bool_RESERVE',
                                    itemId: 'bool_RESERVE',
                                    listeners: {
                                        change: function (checkbox, newValue) {
                                            var fs = checkbox.up('#info_reserve') || checkbox.up('fieldset');
                                            var seuil = fs && fs.down('#int_SEUIL_RESERVE');
                                            var seuilMini = fs && fs.down('#int_SEUIL_MINI_RAYON');
                                            var reserveDf = fs && fs.down('#int_RESERVE');
                                            if (newValue) {
                                                seuil && seuil.show();
                                                seuilMini && seuilMini.show();
                                                reserveDf && reserveDf.show();
                                            } else {
                                                if (seuil) { seuil.hide(); seuil.setValue(0); }
                                                if (seuilMini) { seuilMini.hide(); seuilMini.setValue(null); seuilMini._userModified = false; }
                                                reserveDf && reserveDf.hide();
                                            }
                                        }
                                    }
                                },
                                { xtype: 'splitter' },
                                {
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
                                    allowDecimals: false,
                                    listeners: {
                                        change: {
                                            buffer: 400,
                                            fn: function (fld, newVal) {
                                                var miniField = fld.up('fieldset') && fld.up('fieldset').down('#int_SEUIL_MINI_RAYON');
                                                if (!miniField) { return; }
                                                // Création ou réserve venant d'être activée : toujours auto-calculer.
                                                // Modification d'un article qui avait déjà une réserve : on n'écrase
                                                // la valeur existante que si elle est vide (0 / null).
                                                if (Omode !== 'create' && !miniField._reserveJustActivated) {
                                                    var cur = miniField.getValue();
                                                    if (cur !== null && cur !== '' && cur > 0) { return; }
                                                }
                                                var v = Math.max(0, parseInt(newVal, 10) || 0);
                                                miniField.setValue(v === 0 ? 0 : Math.ceil(v / 2));
                                            }
                                        }
                                    }
                                },
                                { xtype: 'splitter' },
                                {
                                    fieldLabel: 'Seuil mini rayon',
                                    flex: 1,
                                    minValue: 0,
                                    hidden: true,
                                    emptyText: 'Seuil mini rayon (auto)',
                                    name: 'int_SEUIL_MINI_RAYON',
                                    itemId: 'int_SEUIL_MINI_RAYON',
                                    xtype: 'numberfield',
                                    allowDecimals: false
                                },
                                { xtype: 'splitter' },
                                {
                                    fieldLabel: 'Quantité dans *UN CH*',
                                    flex: 1,
                                    hidden: true,
                                    xtype: 'numberfield',
                                    minValue: 1,
                                    emptyText: 'Quantite.Detail/Article',
                                    name: 'int_NUMBERDETAIL',
                                    itemId: 'int_NUMBERDETAIL',
                                    fieldStyle: 'background-color: orange; background-image: none;color:blue;font-weight:bold;font-size:1.3em',
                                    listeners: {
                                        change: { fn: this.onQtyDetailChange, scope: this },
                                        specialkey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                var price = form.down('#int_PRICE');
                                                if (field.getValue() > 1 && price) {
                                                    price.focus(true, 10);
                                                    // Le recalcul lie au changement de quantite peut reecrire le
                                                    // prix apres le focus, ce qui replace le curseur en fin de
                                                    // champ : on reselectionne le contenu une fois le recalcul
                                                    // passe, pour pouvoir l'ecraser d'un coup (demande 6.2).
                                                    Ext.defer(function () {
                                                        if (price.hasFocus) {
                                                            price.selectText();
                                                        }
                                                    }, 250);
                                                } else if (field.getValue() <= 1) {
                                                    Ext.MessageBox.show({
                                                        title: 'Valeur incorrecte',
                                                        msg: 'La quantité de détail doit être supérieure à 1.',
                                                        buttons: Ext.MessageBox.OK,
                                                        icon: Ext.MessageBox.WARNING,
                                                        fn: function () { field.focus(true, 10); }
                                                    });
                                                }
                                            }
                                        }
                                    }
                                },
                                { xtype: 'splitter' },
                                int_RESERVE
                            ]
                        }
                    ]
                },

                {
                    xtype: 'fieldset',
                    title: 'DCI',
                    itemId: 'dcifieldset',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: { anchor: '100%' },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            itemId: 'gridpanelDciID',
                            margin: '0 0 5 0',
                            store: store_dci_famille,
                            height: 200,
                            columns: [
                                { header: 'lg_FAMILLE_DCI_ID', dataIndex: 'lg_FAMILLE_DCI_ID', hidden: true, flex: 1, editor: { allowBlank: false } },
                                { header: 'Code DCI', dataIndex: 'str_CODE', flex: 1, editor: { allowBlank: false } },
                                { header: 'Designation', dataIndex: 'dci_str_NAME', flex: 1, editor: { allowBlank: false } },
                                { xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true, items: [{ icon: 'resources/images/icons/fam/delete.gif', tooltip: 'Suprimer', scope: this, handler: this.onRemoveClick }] }
                            ],
                            tbar: [
                                { xtype: 'textfield', itemId: 'rechecher_dci', name: 'rechecher_dci', emptyText: 'Rech',
                                  listeners: { 'render': function (cmp) { cmp.getEl().on('keypress', function (e) { if (e.getKey() === e.ENTER) { Me.onRechClickDCI(); } }); } } },
                                '-',
                                { xtype: 'combobox', name: 'lg_DCI_ID', margins: '0 0 0 10', itemId: 'lg_DCI_ID', store: store_dci, valueField: 'str_NAME', displayField: 'str_NAME',
                                  pageSize: 20, minChars: 2, queryMode: 'remote', width: 400, emptyText: 'Selectionner un DCI...',
                                  listeners: {
                                      // L'identifiant REEL du DCI est memorise a la selection : le combo
                                      // porte historiquement le NOM (valueField str_NAME) et la recherche
                                      // par nom echoue des qu'un nom est en doublon ou inactif en base.
                                      select: function (cmp, records) {
                                          cmp._dciId = (records && records.length) ? records[0].get('lg_DCI_ID') : null;
                                          Me.onRechClickDCI();
                                      },
                                      change: function (cmp) {
                                          cmp._dciId = null;
                                          Me.onfiltercheck();
                                      }
                                  } },
                                '-',
                                { text: 'Associer', tooltip: 'Associer le code DCI a cet article', scope: this, itemId: 'associate', handler: this.onbtndciadd }
                            ],
                            bbar: { xtype: 'pagingtoolbar', pageSize: 10, store: store_dci_famille, displayInfo: true },
                            listeners: { scope: this }
                        }
                    ]
                }
            ]
        });

        // Helper local pour le form
        var g = function (qid) { return form.down('#' + qid); };
        this._g = g;
        // Reference directe au formulaire : la fenetre reellement affichee est creee a part
        // (var win), la vue elle-meme n'est jamais rendue et this.down('form') plante
        // ("items is undefined") dans les handlers.
        this._form = form;

        // Masquer bouton assoc si update + déjà déconditionné (optionnel)
        if (Omode === 'update' && bool_DECONDITIONNE == '1') {
            var assoc = g('associate');
            if (assoc) assoc.hide();
        }

        // Valeurs par défaut en création
        if (Omode === 'create') {
            var lg_CODE_ACTE_IDcom = g('lg_CODE_ACTE_ID');
            if (lg_CODE_ACTE_IDcom) {
                lg_CODE_ACTE_IDcom.getStore().on('load', function () {
                    lg_CODE_ACTE_IDcom.getStore().each(function (r) {
                        if (r.get('lg_CODE_ACTE_ID') === '0') lg_CODE_ACTE_IDcom.setValue(r.get('lg_CODE_ACTE_ID'));
                    });
                }, this, { single: true });
            }

            var combo = g('lg_TYPEETIQUETTE_ID');
            if (combo) {
                combo.getStore().on('load', function () {
                    combo.getStore().each(function (r) {
                        if (r.get('lg_TYPEETIQUETTE_ID') === '2') combo.setValue(r.get('lg_TYPEETIQUETTE_ID'));
                    });
                }, this, { single: true });
            }
        }

        // Remplissage en update / decondition
        if (Omode === 'update' || Omode === 'decondition') {
            var ds = this.getOdatasource() || {};

            if (ds.P_UPDATE_PAF === false) g('int_PAF').disable();
            if (ds.P_UPDATE_PRIXVENTE === false) g('int_PRICE').disable();
            if (ds.P_UPDATE_CODETABLEAU === false) g('int_T').disable();
            if (ds.P_UPDATE_CODEREMISE === false) g('str_CODE_REMISE').disable();
            if (ds.P_UPDATE_CIP === false) { g('int_CIP').disable(); g('btnGenererCip').disable(); }
            // Le generateur de code CIP ne sert qu'a la creation : en modification le bouton n'apparait pas.
            if (Omode === 'update') { var btnCip = g('btnGenererCip'); if (btnCip) { btnCip.hide(); } }
            if (ds.P_UPDATE_DESIGNATION === false) g('str_DESCRIPTION').disable();

            ref = ds.lg_FAMILLE_ID;
            g('int_NUMBER_AVAILABLE').setValue(ds.int_NUMBER_AVAILABLE);
            g('cmu_price').setValue(ds.cmu_price);

            g('int_NUMBER_AVAILABLE').show();
            g('lg_CODE_GESTION_ID').setValue(ds.lg_CODE_GESTION_ID);
            g('lg_GROSSISTE_ID').setValue(ds.lg_GROSSISTE_ID);
            g('int_STOCK_REAPROVISONEMENT').setValue(ds.int_STOCK_REAPROVISONEMENT);
            g('int_QTE_REAPPROVISIONNEMENT').setValue(ds.int_QTE_REAPPROVISIONNEMENT);
            g('str_CODE_REMISE').setValue(ds.str_CODE_REMISE);
            g('lg_TYPEETIQUETTE_ID').setValue(ds.lg_TYPEETIQUETTE_ID);
            g('lg_FABRIQUANT_ID').setValue(ds.lg_FABRIQUANT_ID); g('lg_FABRIQUANT_ID').show();
            g('int_T').setValue(ds.int_T);
            g('str_CODE_TAUX_REMBOURSEMENT').setValue(ds.str_CODE_TAUX_REMBOURSEMENT);
            g('lg_CODE_ACTE_ID').setValue(ds.lg_CODE_ACTE_ID);
            g('int_TAUX_MARQUE').setValue(ds.int_TAUX_MARQUE);
            g('int_PAT').setValue(ds.int_PAF);
            g('int_PAF').setValue(ds.int_PAF);
            g('int_PRICE_TIPS').setValue(ds.int_PRICE_TIPS);
            g('int_PRICE').setValue(ds.int_PRICE);
            g('lg_FAMILLEARTICLE_ID').setValue(ds.lg_FAMILLEARTICLE_ID);
            /* Emplacement : on preremplit avec l'identifiant REEL quand la source le porte.
               « lg_ZONE_GEO_ID » contient le LIBELLE, et un libelle ne peut pas servir de valeur
               a une liste dont la valeur est l'identifiant.

               La liste est chargee a la demande : son magasin est vide a l'ouverture. On y depose
               donc l'emplacement du produit avant de poser la valeur, faute de quoi le champ
               afficherait l'identifiant brut au lieu du libelle, et se viderait des qu'on le
               quitte. Repli sur l'ancien champ pour les sources qui ne fournissent pas encore
               l'identifiant, afin de ne rien casser. */
            (function () {
                var combo = g('lg_ZONE_GEO_ID');
                var identifiant = ds.lg_ZONE_GEO_ID_REEL || ds.lg_ZONE_GEO_ID;
                if (combo && identifiant) {
                    var magasin = combo.getStore();
                    if (magasin && magasin.findExact('lg_ZONE_GEO_ID', identifiant) === -1) {
                        magasin.add({
                            lg_ZONE_GEO_ID: identifiant,
                            str_LIBELLEE: ds.lg_ZONE_GEO_ID || identifiant
                        });
                    }
                }
                if (combo) { combo.setValue(identifiant); }
            })();
            // Socle ABC (Lot 0) : prefill code geo + affichage classe ABC (lecture seule)
            if (g('str_CODE_GEO_ARTICLE')) { g('str_CODE_GEO_ARTICLE').setValue(ds.str_CODE_GEO_ARTICLE); }
            if (g('classe_abc_display')) { g('classe_abc_display').setValue(abcClasseLetter(ds.lg_CLASSE_ABC_ID)); }
            g('str_DESCRIPTION').setValue(ds.str_DESCRIPTION);
            g('int_CIP').setValue(ds.int_CIP);
            g('int_NUMBERDETAIL').setValue(ds.int_NUMBERDETAIL);
            g('lg_CODE_TVA_ID').setValue(ds.lg_CODE_TVA_ID);
            g('int_EAN13').setValue(ds.int_EAN13);
            g('bool_RESERVE').setValue(ds.bool_RESERVE);
            if (g('bool_CALCUL_SEUIL')) { g('bool_CALCUL_SEUIL').setValue(ds.bool_CALCUL_SEUIL === undefined ? true : ds.bool_CALCUL_SEUIL); }
            if (g('bool_SUGGERABLE')) { g('bool_SUGGERABLE').setValue(ds.bool_SUGGERABLE === undefined ? true : ds.bool_SUGGERABLE); }
            if (g('bool_REMISE')) { g('bool_REMISE').setValue(ds.bool_REMISE === undefined ? true : ds.bool_REMISE); }
            if (g('int_Q1_SEUIL_REAPPRO')) { g('int_Q1_SEUIL_REAPPRO').setValue(ds.int_Q1_SEUIL_REAPPRO); }
            if (g('int_Q2_QTE_REAPPRO')) { g('int_Q2_QTE_REAPPRO').setValue(ds.int_Q2_QTE_REAPPRO); }
            g('dt_Peremtion_new').setValue(ds.dt_Peremtion);

            if (ds.bool_RESERVE) {
                var dfReserve = g('int_RESERVE');
                var seuil = g('int_SEUIL_RESERVE');
                var seuilMini = form.down('#int_SEUIL_MINI_RAYON');
                if (seuil) { seuil.setValue(ds.int_SEUIL_RESERVE); seuil.show(); }
                if (seuilMini) { seuilMini.setValue(ds.int_SEUIL_MINI_RAYON); seuilMini.show(); }
                if (dfReserve) { dfReserve.setValue(ds.int_STOCK_RESERVE); dfReserve.show(); }
            }

            bool_DECONDITIONNE = ds.bool_DECONDITIONNE;

            var laboratoireId = ds.laboratoireId;
            var gammeId = ds.gammeId;
            gammeStore.load({callback: function (records) {
                Ext.each(records, function (item) {
                    let rec = item.data;
                    if (rec.id == gammeId) { g('gammeId').setValue(rec.id); return false; }
                });
            }});
            laboratoireStore.load({callback: function (records) {
                Ext.each(records, function (item) {
                    let rec = item.data;
                    if (rec.id == laboratoireId) { g('laboratoireId').setValue(rec.id); return false; }
                });
            }});
        }

        // === Contexte d'affichage de int_NUMBERDETAIL ===
        var ds2 = this.getOdatasource() || {};
        var isDeconditionCreate       = (Omode === 'decondition');                              // création de détail
        var isUpdateDetailItem        = (Omode === 'update' && ds2.bool_DECONDITIONNE == 1);    // modifier l’article détail
        var isUpdateParentHasDetail   = (Omode === 'update' && ds2.bool_DECONDITIONNE == 0 && ds2.bool_DECONDITIONNE_EXIST == 1); // parent qui a un détail

        if (isDeconditionCreate) {
            this.setQtyDetailState('required');   // visible + obligatoire + recalcul
        } else if (isUpdateParentHasDetail) {
            this.setQtyDetailState('optional');   // visible + facultatif, pas de recalcul
        } else {
            this.setQtyDetailState('off');        // caché (y compris si on modifie l’article détail)
        }

        // WINDOW
        // Une seule fenetre a la fois : un nouveau clic remplace la precedente.
        if (winModifArticleOuverte && !winModifArticleOuverte.isDestroyed) {
            winModifArticleOuverte.destroy();
        }
        var win = winModifArticleOuverte = new Ext.window.Window({
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
            buttons: [
                { text: 'Enregistrer', handler: this.onbtnsave, scope: this },
                { text: 'Retour', handler: function () { win.close(); } }
            ],
            listeners: {
                beforeclose: function () { var rech = Ext.getCmp('rechecher'); if (rech) rech.focus(); },
                show: function() {
                    Ext.defer(function() {
                        var fieldToFocus = g('int_NUMBERDETAIL');
                        if (fieldToFocus && fieldToFocus.isVisible()) {
                            fieldToFocus.focus(true, 10);
                        }
                    }, 100);
                }
            }
        });

        if (Omode === 'create') {
            var dciFs = g('dcifieldset');
            if (dciFs) dciFs.hide();
        }
    },

    onbtnsave: function (button) {
        var win = button.up('window'), form = win.down('form'), g = this._g;

        // état cohérent juste avant la validation
        var ds = this.getOdatasource() || {};
        var isDeconditionCreate       = (Omode === 'decondition');
        var isUpdateDetailItem        = (Omode === 'update' && ds.bool_DECONDITIONNE == 1);
        var isUpdateParentHasDetail   = (Omode === 'update' && ds.bool_DECONDITIONNE == 0 && ds.bool_DECONDITIONNE_EXIST == 1);

        if (isDeconditionCreate) {
            this.setQtyDetailState('required');
        } else if (isUpdateParentHasDetail) {
            this.setQtyDetailState('optional');
        } else {
            this.setQtyDetailState('off');
        }

        if (form.isValid()) {
            let internal_url = '';
            let int_DECONDITIONNE = 0;
            var qtyField = g('int_NUMBERDETAIL');
            var qtyVal = qtyField ? qtyField.getValue() : null;

            if (Omode === 'create') {
                internal_url = '../api/v1/fichearticle/enregistrer?mode=create';
                g('int_PAT').setValue(g('int_PAF').getValue());
            } else if (Omode === 'update') {
                internal_url = '../api/v1/fichearticle/enregistrer?mode=update&lg_FAMILLE_ID=' + ref;
            }

            // int_NUMBERDETAIL requis uniquement en création de détail
            if (isDeconditionCreate) {
                int_DECONDITIONNE = 1;
                if (!qtyVal || qtyVal <= 0) {
                    Ext.MessageBox.alert('Impossible', 'Veuillez renseigner la quantité détail de l\'article');
                    return;
                }
            }

            if (parseInt(g('int_PAF').getValue()) > parseInt(g('int_PRICE').getValue())) {
                Ext.MessageBox.alert('Impossible', 'Le prix d\'achat doit etre inferieur au prix de vente');
                return;
            }

            // Validation seuil reserve / seuil mini rayon
            if (g('bool_RESERVE') && g('bool_RESERVE').getValue()) {
                var seuilField = form.down('#int_SEUIL_RESERVE');
                var seuilMiniField = form.down('#int_SEUIL_MINI_RAYON');
                var srVal = seuilField ? seuilField.getValue() : '';
                var smrVal = seuilMiniField ? seuilMiniField.getValue() : '';
                var sr = (srVal === null || srVal === '') ? 0 : (parseInt(srVal, 10) || 0);
                var smr = (smrVal === null || smrVal === '') ? null : (parseInt(smrVal, 10) || 0);
                if (sr <= 0 && (smr === null || smr <= 0)) {
                    Ext.MessageBox.alert('Validation',
                        'Avec la reserve activee, le seuil reserve et le seuil mini rayon doivent etre renseignes et superieurs a 0.',
                        function () { if (seuilField) { seuilField.focus(true, 100); } });
                    return;
                }
                if (sr > 0 && (smr === null || smr <= 0)) {
                    Ext.MessageBox.alert('Validation',
                        'Le seuil mini rayon doit etre renseigne et superieur a 0.',
                        function () { if (seuilMiniField) { seuilMiniField.focus(true, 100); } });
                    return;
                }
                if (sr <= 0 && smr > 0) {
                    Ext.MessageBox.alert('Validation',
                        'Le seuil reserve doit etre renseigne et superieur a 0.',
                        function () { if (seuilField) { seuilField.focus(true, 100); } });
                    return;
                }
            }

            var int_PRICE_TIPS = g('int_PRICE_TIPS').getValue() || 0,
                int_TAUX_MARQUE = g('int_TAUX_MARQUE').getValue() || 0,
                str_CODE_REMISE = g('str_CODE_REMISE').getValue() || 0,
                int_PRICE = g('int_PRICE').getValue() || 0;

            // Suppression des espaces avant/apres la designation a l'enregistrement
            var str_DESCRIPTION = (g('str_DESCRIPTION').getValue() || '').trim();
            g('str_DESCRIPTION').setValue(str_DESCRIPTION);
            if (!str_DESCRIPTION) {
                Ext.MessageBox.alert('Message', 'La designation de l\'article est obligatoire');
                return;
            }

            testextjs.app.getController('App').ShowWaitingProcess();

            // Appel create-detail UNIQUEMENT en création de détail
            if (isDeconditionCreate) {
                internal_url = '../api/v1/produit/create-detail';
                this.onCreateDetailProduit(
                    internal_url, ref, str_CODE_REMISE, int_TAUX_MARQUE, int_PRICE_TIPS, int_PRICE,
                    int_DECONDITIONNE, Omode, Oview, type, win
                );
                return;
            }

            // sinon : flux normal (create/update)
            var params = {
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
                str_DESCRIPTION: str_DESCRIPTION,
                int_CIP: g('int_CIP').getValue(),
                int_EAN13: g('int_EAN13').getValue(),
                lg_CODE_TVA_ID: g('lg_CODE_TVA_ID').getValue(),
                int_SEUIL_RESERVE: (function(){ var s=form.down('#int_SEUIL_RESERVE'); return s ? s.getValue() : 0; })(),
                int_SEUIL_MINI_RAYON: form.down('#int_SEUIL_MINI_RAYON') ? form.down('#int_SEUIL_MINI_RAYON').getValue() : null,
                bool_RESERVE: g('bool_RESERVE').getValue(),
                bool_CALCUL_SEUIL: g('bool_CALCUL_SEUIL') ? g('bool_CALCUL_SEUIL').getValue() : true,
                bool_SUGGERABLE: g('bool_SUGGERABLE') ? g('bool_SUGGERABLE').getValue() : true,
                bool_REMISE: g('bool_REMISE') ? g('bool_REMISE').getValue() : true,
                int_Q1_SEUIL_REAPPRO: g('int_Q1_SEUIL_REAPPRO') ? g('int_Q1_SEUIL_REAPPRO').getValue() : '',
                int_Q2_QTE_REAPPRO: g('int_Q2_QTE_REAPPRO') ? g('int_Q2_QTE_REAPPRO').getValue() : '',
                laboratoireId: g('laboratoireId').getValue(),
                gammeId: g('gammeId').getValue(),
                // en update : reflète l’état existant ; sinon 0
                bool_DECONDITIONNE: (Omode === 'update' && (this.getOdatasource()||{}).bool_DECONDITIONNE == 1) ? 1 : int_DECONDITIONNE,
                cmu_price: g('cmu_price').getValue()
            };

            // Ajout conditionnel du champ quantité détail
// Objectif: ne JAMAIS perdre la valeur côté back.
// Cas parent qui a déjà un détail: on envoie toujours la valeur existante si l'utilisateur ne l'a pas modifiée.
if (isUpdateParentHasDetail) {
    var dsQty = (this.getOdatasource() || {}).int_NUMBERDETAIL;
    var effectiveQty = null;
    if (Ext.isNumber(qtyVal) && qtyVal > 0) {
        effectiveQty = qtyVal; // modifiée par l'utilisateur
    } else if (Ext.isNumber(dsQty) && dsQty > 0) {
        effectiveQty = dsQty;  // conserver la valeur serveur existante
    }
    if (effectiveQty !== null) {
        // Certains endpoints attendent encore int_QTEDETAIL; on envoie les deux pour compatibilité
        params.int_QTEDETAIL   = effectiveQty;
        params.int_NUMBERDETAIL = effectiveQty;
    }
}
// (en isUpdateDetailItem: ne rien envoyer pour ne pas écraser)

Ext.Ajax.request({
                url: internal_url,
                params: params,
                success: function (response) {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);

                // Les anciens 'filets de securite' re-postaient deux fois mode=update avec des
                // drapeaux de deconditionnement a chaque enregistrement (trois requetes visibles
                // pour un clic) : ils dataient du flux create-detail, qui passe desormais par
                // l'API v1/produit/create-detail et n'emprunte plus ce chemin. Supprimes.
                    if (object.success == '0') {
                        // Differe pour eviter la course hide()/show() du MessageBox singleton
                        // (StopWaitingProcess vient de masquer ce meme singleton).
                        Ext.defer(function () {
                            Ext.MessageBox.show({ title: 'Message d\'erreur', width: 320, msg: object.errors, buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING });
                        }, 10);
                    } else {
                        // Socle ABC (Lot 0) : persistance du Code Geo article via endpoint REST dedie.
                        // N'impacte pas le flux create/update existant (familleManagement reste intact).
                        try {
                            var codeGeoFld = g('str_CODE_GEO_ARTICLE');
                            var produitId = (Omode === 'update') ? ref : (object && object.ref);
                            if (codeGeoFld && produitId) {
                                Ext.Ajax.request({
                                    url: '../api/v1/fichearticle/produit/update-lite-info',
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    params: Ext.JSON.encode({ id: produitId, codeGeoArticle: codeGeoFld.getValue() || '' }),
                                    callback: function () { /* ignore */ }
                                });
                            }
                        } catch (e) { /* noop */ }
                        win.close();
                        // Pas de popup de confirmation au succes : on garde le flux d'origine, fluide.
                        // (Supprime aussi la course hide()/show() du MessageBox singleton qui pouvait
                        // laisser un masque modal orphelin -> gel loupe / touche Entree.)
                        var body = Ext.getBody();
                        if (body && Ext.isFunction(body.unmask)) { body.unmask(); }
                        if (Omode === 'create' || Omode === 'update' || Omode === 'decondition') {
                            if (type == 'famillemanager') {
                                Me_Workflow = Oview;
                                // Rester sur la page courante : reload() conserve currentPage
                                // (contrairement a onRechClick qui force loadPage(1)).
                                Me_Workflow.getStore().reload();
                                Ext.getCmp('rechecher').focus(true, 100);
                            } else if (type == 'commande') {
                                Ext.getCmp('lgFAMILLEID').setValue(str_DESCRIPTION);
                                Ext.getCmp('lgFAMILLEID').getStore().reload();
                            }
                        }
                    }
                },
                failure: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    Ext.MessageBox.show({ title: 'Message d\'erreur', width: 320, msg: response.responseText, buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING });
                }
            });
        } else {
            Ext.MessageBox.show({ title: 'Echec', msg: 'Veuillez renseignez les champs obligatoires', buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING });
        }
    },

    // Association d'un DCI a l'article (bouton 'Associer') : API REST.
    onbtndciadd: function () {
        var form = this._form, g = this._g;
        if (!form || !g) {
            return;
        }
        // L'id reel prime sur le nom : la resolution par nom echoue si le nom est
        // duplique ou inactif en base (le serveur accepte id, code ou nom).
        var comboDci = g('lg_DCI_ID');
        var dci = comboDci && (comboDci._dciId || comboDci.getValue());
        if (!dci) {
            Ext.MessageBox.alert('Message', 'Veuillez selectionner un DCI a associer.');
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/referentiel-article/dci-famille/associer',
            method: 'POST',
            params: { lg_DCI_ID: dci, lg_FAMILLE_ID: ref },
            success: function (response) {
                var object = Ext.JSON.decode(response.responseText, true) || {};
                if (object.success === '0' || object.success === 0) {
                    Ext.MessageBox.alert('Message', object.errors || "Echec de l'association");
                    return;
                }
                g('lg_DCI_ID').clearValue();
                var grid = form.down('#gridpanelDciID');
                if (grid) {
                    grid.getStore().reload();
                }
            },
            failure: function (response) {
                Ext.MessageBox.alert('Message', "Echec de l'association du DCI");
            }
        });
    },

    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message', 'Confirmer la suppresssion', function (btn) {
            if (btn === 'yes') {
                var rec = grid.getStore().getAt(rowIndex);
                Ext.Ajax.request({
                    url: '../api/v1/referentiel-article/dci-famille/' + rec.get('lg_FAMILLE_DCI_ID'),
                    method: 'DELETE',
                    success: function (response) {
                        var object = Ext.JSON.decode(response.responseText, false);
                        if (object.success === 0) {
                            Ext.MessageBox.alert('Error Message', object.errors);
                            return;
                        } else {
                            // La ligne porte le nom du DCI dans dci_str_NAME (str_NAME n'existe
                            // pas sur ce modele : le titre affichait [undefined])
                            Ext.MessageBox.alert('Suppression [' + (rec.get('dci_str_NAME') || rec.get('str_CODE') || '') + ']',
                                    'Suppression effectuee avec succes');
                        }
                        grid.getStore().reload();
                    },
                    failure: function (response) {
                        Ext.MessageBox.alert('Error Message', response.responseText);
                    }
                });
            }
        });
    },

    onfiltercheck: function () {
        var g = this._g;
        if (!g) {
            return;
        }
        var lg_DCI_ID = g('lg_DCI_ID') && g('lg_DCI_ID').getValue();
        var OGrid = g('lg_DCI_ID');
        if (!OGrid) {
            return;
        }
        if (lg_DCI_ID !== null && lg_DCI_ID !== '' && lg_DCI_ID !== undefined) {
            var len = lg_DCI_ID.length;
            var url_final = '../api/v1/referentiel-article/dcis-initial?search_value=' + encodeURIComponent(lg_DCI_ID);
            if (len >= 3) { OGrid.getStore().getProxy().url = url_final; OGrid.getStore().reload(); }
        } else {
            OGrid.getStore().getProxy().url = '../api/v1/referentiel-article/dcis-initial';
            OGrid.getStore().reload();
        }
    },

    onRechClickDCI: function () {
        var form = this._form, g = this._g;
        if (!form || !g) {
            return;
        }
        var rechecher_dci = g('rechecher_dci').getValue();
        // Filtre par l'ID reel du DCI : la valeur du combo est le NOM, qui ne matche
        // jamais la colonne id (la grille se vidait apres chaque selection).
        var lg_DCI_ID = g('lg_DCI_ID')._dciId || '';
        var grid = form.down('#gridpanelDciID');
        grid.getStore().getProxy().url = '../api/v1/referentiel-article/dci-famille?search_value='
                + encodeURIComponent(rechecher_dci) + '&lg_FAMILLE_ID=' + ref + '&lg_DCI_ID=' + encodeURIComponent(lg_DCI_ID);
        grid.getStore().reload();
        grid.getStore().getProxy().url = '../api/v1/referentiel-article/dci-famille?lg_FAMILLE_ID=' + ref;
    },

    // Recalcul des prix UNIQUEMENT quand setQtyDetailState('required')
    onQtyDetailChange: function (field, newValue) {
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

        // Le recalcul des prix relance une mise en page du formulaire, qui remettait son
        // defilement a zero : la fenetre « sautait » a chaque chiffre saisi dans la quantite,
        // alors que le champ avait ete amene en bas de l'ecran par le focus. On conserve le
        // defilement tel qu'il etait avant le recalcul.
        var formulaire = field.up('form'), corps = formulaire && formulaire.body ? formulaire.body.dom : null;
        var defilement = corps ? corps.scrollTop : null;
        pafField.setValue(newPaf);
        priceField.setValue(newPrice);
        if (corps && defilement !== null) {
            corps.scrollTop = defilement;
            Ext.defer(function () { corps.scrollTop = defilement; }, 30);
        }
    },

    onCreateDetailProduit: function (internal_url, lgFamilleId, strCodeRemise, intTauxMarque, intPriceTips, intPrice, boolDeconditionne, mode, view, type, win) {
        var form = win.down('form'), g = this._g;
        const strDescription = g('str_DESCRIPTION').getValue();
        const isEditMode = mode === 'update'; // en pratique, create-detail est utilisé en 'decondition' (POST)
        Ext.Ajax.request({
            url: isEditMode ? internal_url + '/' + lgFamilleId : internal_url,
            method: isEditMode ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
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
                intNumberDetail: g('int_NUMBERDETAIL').getValue(), // NOM attendu par l'API
                intQteDetail: g('int_NUMBERDETAIL').getValue(),     // alias éventuel
                lgCodeTvaId: g('lg_CODE_TVA_ID').getValue(),
                intSeuilReserve: (function(){ var s=form.down('#int_SEUIL_RESERVE'); return s ? s.getValue() : 0; })(),
                boolReserve: g('bool_RESERVE').getValue(),
                laboratoireId: g('laboratoireId').getValue(),
                gammeId: g('gammeId').getValue(),
                boolDeconditionne: 1,
                boolDeconditionneExist: 1,
                bool_DECONDITIONNE: 1,
                bool_DECONDITIONNE_EXIST: 1,
                parentFamilleId: ref,
                cmuPrice: g('cmu_price').getValue(),
                lgFamilleId: lgFamilleId
            }),
            success: function (response) {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (!object.success) {
                    Ext.MessageBox.show({ title: 'Message d\'erreur', width: 320, msg: object.errors, buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING });
                } else {
                    win.close();
                    // Pas de popup de confirmation au succes : flux fluide.
                    var body = Ext.getBody();
                    if (body && Ext.isFunction(body.unmask)) { body.unmask(); }
                    if (mode === 'create' || mode === 'update' || mode === 'decondition') {
                        if (type == 'famillemanager') {
                            Me_Workflow = view;
                            // Rester sur la page courante : reload() conserve currentPage
                            // (contrairement a onRechClick qui force loadPage(1)).
                            Me_Workflow.getStore().reload();
                            Ext.getCmp('rechecher').focus(true, 100);
                        } else if (type == 'commande') {
                            Ext.getCmp('lgFAMILLEID').setValue(strDescription);
                            Ext.getCmp('lgFAMILLEID').getStore().reload();
                        }
                    }
                }
            },
            failure: function (response) {
                testextjs.app.getController('App').StopWaitingProcess();
                Ext.MessageBox.show({ title: 'Message d\'erreur', width: 320, msg: response.responseText, buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING });
            }
        });
    }
});
