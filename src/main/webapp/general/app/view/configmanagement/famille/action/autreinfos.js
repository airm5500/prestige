var url_services_data_zonegeo_famille = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_data_codeacte_famille = '../webservices/configmanagement/codeacte/ws_data.jsp';
var url_services_data_codetableau_famille = '../webservices/configmanagement/tableau/ws_data.jsp';
var url_services_data_etiquette_famille = '../webservices/configmanagement/etiquette/ws_data.jsp';
var url_services_data_famaillearticle_famille = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_codegestion_famille = '../webservices/configmanagement/codegestion/ws_data.jsp';
var url_services_data_famille = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;
var isBoolT_F;

Ext.define('testextjs.view.configmanagement.famille.action.autreinfos', {
    extend: 'Ext.window.Window',
    xtype: 'autreinfosfamille',
    id: 'autreinfosfamilleID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'testextjs.model.GroupeFamille',
        /*'testextjs.model.Grossiste',
        'testextjs.model.CodeGestion',*/
        'testextjs.model.CodeActe'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {
        // Nettoyage des IDs globaux partages avec d'autres vues (evite duplicate id)
        var sharedIds = [
            'lg_ZONE_GEO_ID', 'lg_CODE_ACTE_ID', 'lg_CODE_GESTION_ID', 'lg_TABLEAU_ID',
            'int_STOCK_REAPROVISONEMENT', 'int_QTE_REAPPROVISIONNEMENT', 'int_DELAI_REAPPRO',
            'int_SEUIL_RESERVE', 'int_SEUIL_MINI_RAYON', 'int_QTE_RESERVEE', 'int_QTE_MANQUANTE',
            'int_SEUIL_MAX', 'int_PRICE_DETAIL', 'int_QTEDETAIL', 'int_QTEDETAIL',
            'lg_INDICATEUR_REAPPROVISIONNEMENT_ID', 'dt_DATE_LAST_ENTREE', 'infosup',
            'bool_DECONDITIONNE', 'autreinfosfamilleID'
        ];
        sharedIds.forEach(function (cid) {
            var existing = Ext.getCmp(cid);
            if (existing) { try { existing.destroy(); } catch (e) {} }
        });
       
                ref = this.getOdatasource();
                alert("ref ---"+ref);
        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;

        var store_etiquette_famille = new Ext.data.Store({
            model: 'testextjs.model.Etiquette',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_etiquette_famille,
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
            autoLoad: false,
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

        var store_codetableau_famille = new Ext.data.Store({
            model: 'testextjs.model.Tableau',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_codetableau_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var form = new Ext.form.Panel({
            bodyPautreinfosing: 15,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    pautreinfosing: 10
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
                                    fieldLabel: 'Code Promotion',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    autoCreate: {
                                        tag: 'input',
                                        maxlength: '7'
                                    },
                                    emptyText: 'CIP',
                                    name: '',
                                    id: ''
                                }
                                ,
                                {
                                    fieldLabel: 'Compteur.Promotion',
                                    width: 400,
                                    emptyText: 'DESIGNATION',
                                    name: '',
                                    id: ''
                                }

                            ]
                        }, {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Emplacement.Geographique',
                                    name: 'lg_ZONE_GEO_ID',
                                    width: 400,
                                    id: 'lg_ZONE_GEO_ID',
                                    store: store_zonegeo_famille,
                                    valueField: 'lg_ZONE_GEO_ID',
                                    displayField: 'str_LIBELLEE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un emplacement...'
                                },
                                {
                                    fieldLabel: 'Date Derniere Entree',
                                    width: 400,
                                    emptyText: 'DERNIERE ENTREE',
                                    name: 'dt_DATE_LAST_ENTREE',
                                    id: 'dt_DATE_LAST_ENTREE'
                                }]}]
                },{
               
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    title: 'Reapprovisionnement',
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
                                    fieldLabel: 'Seuil Reappro',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    // maxValue: 13,
                                    emptyText: 'SEUIL REAPPRO',
                                    name: 'int_STOCK_REAPROVISONEMENT',
                                    id: 'int_STOCK_REAPROVISONEMENT'
                                }, {
                                    fieldLabel: 'Quantite',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    //maxValue: 13,
                                    emptyText: 'QUANTITE',
                                    name: 'int_QTE_REAPPROVISIONNEMENT',
                                    id: 'int_QTE_REAPPROVISIONNEMENT'
                                }
                            ]
                        }, {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [{
                                    fieldLabel: 'Indicateur',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    maxValue: 13,
                                    emptyText: 'INDICATEUR',
                                    name: 'lg_INDICATEUR_REAPPROVISIONNEMENT_ID',
                                    id: 'lg_INDICATEUR_REAPPROVISIONNEMENT_ID'
                                }, {
                                    fieldLabel: 'Delai',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    maxValue: 13,
                                    emptyText: 'DELAI',
                                    name: 'int_DELAI_REAPPRO',
                                    id: 'int_DELAI_REAPPRO'
                                }]}]},{
               
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    title: 'Reserve',
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
                                    fieldLabel: 'Seuil Reserve',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    // maxValue: 13,
                                    emptyText: 'SEUIL RESERVE',
                                    name: 'int_SEUIL_RESERVE',
                                    id: 'int_SEUIL_RESERVE'
                                }, {
                                    fieldLabel: 'Quantite Reserve',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    //maxValue: 13,
                                    emptyText: 'QUANTITE RESERVE',
                                    name: 'int_QTE_RESERVEE',
                                    id: 'int_QTE_RESERVEE'
                                }, {
                                    fieldLabel: 'Seuil mini rayon',
                                    xtype: 'numberfield',
                                    maskRe: /[0-9]/,
                                    width: 400,
                                    minValue: 0,
                                    allowDecimals: false,
                                    emptyText: 'Seuil mini rayon',
                                    name: 'int_SEUIL_MINI_RAYON',
                                    id: 'int_SEUIL_MINI_RAYON'
                                }
                            ]
                        }, {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [{
                                    fieldLabel: 'Indicateur',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    maxValue: 13,
                                    emptyText: 'Quantite Manquante',
                                    name: 'int_QTE_MANQUANTE',
                                    id: 'int_QTE_MANQUANTE'
                                }, {
                                    fieldLabel: 'Stock',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    maxValue: 13,
                                    emptyText: 'STOCK',
                                    name: 'int_SEUIL_MAX',
                                    id: 'int_SEUIL_MAX'
                                }]}]}, {
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
                                            queryMode: 'remote',
                                            emptyText: 'Choisir un code acte...'
                                        },{
                                            xtype: 'combobox',
                                            fieldLabel: 'Code.Tableau',
                                            name: 'lg_TABLEAU_ID',
                                            width: 400,
                                            id: 'lg_TABLEAU_ID',
                                            store: store_codetableau_famille,
                                            valueField: 'lg_TABLEAU_ID',
                                            displayField: 'str_NAME',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            emptyText: 'Choisir un code Tableau...'
                                        }

                                    ]
                                }]
                        }/*,{
                            
                           xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [{
                                    xtype: 'checkbox',
                                    fieldLabel: 'Deconditionne',
                                    emptyText: 'Deconditionne',
                                    name: 'bool_DECONDITIONNE',
                                    id: 'bool_DECONDITIONNE',
                                    listeners: {
                                        change: function (checkbox, newValue, oldValue, eOpts) {
                                            var FieldSetInfoSup = Ext.getCmp('infosup');
                                            if (newValue) {
                                                FieldSetInfoSup.show();
                                                
                                            } else {
                                                FieldSetInfoSup.hide();
                                                
                                            }
                                        }
                                    }
                                 
                                }]
                        }*/
                    ]
                }, {
                    xtype: 'fieldset',
                    collapsible: true,
                    id: 'infosup',
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
                                    xtype: 'container',
                                    layout: 'hbox',
                                    defaultType: 'textfield',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            fieldLabel: 'Quantite.Plaquette/boite',
                                            width: 400,
                                            //maxValue: 13,
                                            emptyText: 'Quantite.Plaquette/boite',
                                            name: 'int_QTEDETAIL',
                                            id: 'int_QTEDETAIL'
                                        }, {
                                            fieldLabel: 'Prix detail',
                                            width: 400,
                                            //maxValue: 13,
                                            emptyText: 'Prix detail',
                                            name: 'int_PRICE_DETAIL',
                                            id: 'int_PRICE_DETAIL'
                                        }

                                    ]
                                }
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
                    items: [{
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    defaultType: 'textfield',
                                    margin: '0 0 5 0',
                                    items: [
                                       
                                    ]
                                }
                            ]
                        }, {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Code.Gestion',
                                    name: 'lg_CODE_GESTION_ID',
                                    width: 400,
                                    id: 'lg_CODE_GESTION_ID',
                                    store: store_codegestion_famille,
                                    valueField: 'lg_CODE_GESTION_ID',
                                    displayField: 'str_CODE_BAREME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un code gestion...'
                                }
                            ]}]}]


        });



        //Initialisation des valeur


        if (Omode === "update") {

           // ref = this.getOdatasource().lg_FAMILLE_ID;

//            Ext.getCmp('int_NUMBER_AVAILABLE').hide();
            Ext.getCmp('int_QTE_MANQUANTE').setValue(this.getOdatasource().int_QTE_MANQUANTE);
            Ext.getCmp('lg_CODE_GESTION_ID').setValue(this.getOdatasource().lg_CODE_GESTION_ID);
//            Ext.getCmp('str_CODE_REMISE').setValue(this.getOdatasource().str_CODE_REMISE);            
            Ext.getCmp('int_QTE_REAPPROVISIONNEMENT').setValue(this.getOdatasource().int_QTE_REAPPROVISIONNEMENT);
            Ext.getCmp('int_STOCK_REAPROVISONEMENT').setValue(this.getOdatasource().int_STOCK_REAPROVISONEMENT);            
//            Ext.getCmp('str_CODE_ETIQUETTE').setValue(this.getOdatasource().str_CODE_ETIQUETTE);
            Ext.getCmp('int_SEUIL_RESERVE').setValue(this.getOdatasource().int_SEUIL_RESERVE);
            Ext.getCmp('int_SEUIL_MINI_RAYON').setValue(this.getOdatasource().int_SEUIL_MINI_RAYON);
            Ext.getCmp('int_PRICE_DETAIL').setValue(this.getOdatasource().int_PRICE_DETAIL);
            Ext.getCmp('int_DELAI_REAPPRO').setValue(this.getOdatasource().int_DELAI_REAPPRO);
            Ext.getCmp('lg_ZONE_GEO_ID').setValue(this.getOdatasource().lg_ZONE_GEO_ID);
            Ext.getCmp('lg_CODE_ACTE_ID').setValue(this.getOdatasource().lg_CODE_ACTE_ID);
            Ext.getCmp('int_QTEDETAIL').setValue(this.getOdatasource().int_QTEDETAIL);
            Ext.getCmp('lg_INDICATEUR_REAPPROVISIONNEMENT_ID').setValue(this.getOdatasource().lg_INDICATEUR_REAPPROVISIONNEMENT_ID);
            Ext.getCmp('lg_TABLEAU_ID').setValue(this.getOdatasource().lg_TABLEAU_ID);
            Ext.getCmp('dt_DATE_LAST_ENTREE').setValue(this.getOdatasource().dt_DATE_LAST_ENTREE);
            Ext.getCmp('int_SEUIL_MAX').setValue(this.getOdatasource().int_SEUIL_MAX);
            //Ext.getCmp('bool_DECONDITIONNE').setValue(isBoolT_F);

        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 900,
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Annuler',
                    handler: function (){
                        win.close();
                    }
                },{
                    text: '<< Precedent',
                    handler: this.onInfogle
                },{
                    text: 'Suivant >>',
                    handler: this.onCompta
               
                },{
                    text: 'Terminer',
                    handler: this.onbtnsave                    
               
                }]
        });

    },
    onInfogle: function () {
        this.up('window').close();
        new testextjs.view.configmanagement.famille.action.infogenerale({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "INFORMATIONS GENERALES ARTICLE"
        });

    },
    onCompta: function () {
        this.up('window').close();
        new testextjs.view.configmanagement.famille.action.comptabilite({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "FACTURATION ARTICLE"
        });

    },
    onbtnsave: function () {


        var internal_url = "";


        if (Omode === "create") {
            internal_url = url_services_transaction_famille + 'create';
        } else {
            internal_url = url_services_transaction_famille + 'update&lg_FAMILLE_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                int_QTE_MANQUANTE: Ext.getCmp('int_QTE_MANQUANTE').getValue(),
                lg_CODE_GESTION_ID: Ext.getCmp('lg_CODE_GESTION_ID').getValue(),              
//                str_CODE_REMISE: Ext.getCmp('str_CODE_REMISE').getValue(),
                int_STOCK_REAPROVISONEMENT: Ext.getCmp('int_STOCK_REAPROVISONEMENT').getValue(),
                int_QTE_REAPPROVISIONNEMENT:Ext.getCmp('int_QTE_REAPPROVISIONNEMENT').getValue(),
//                str_CODE_ETIQUETTE: Ext.getCmp('str_CODE_ETIQUETTE').getValue(),
                int_SEUIL_RESERVE:Ext.getCmp('int_SEUIL_RESERVE').getValue(),
                int_SEUIL_MINI_RAYON: Ext.getCmp('int_SEUIL_MINI_RAYON').getValue(),
                int_PRICE_DETAIL: Ext.getCmp('int_PRICE_DETAIL').getValue(),
                int_QTEDETAIL: Ext.getCmp('int_QTEDETAIL').getValue(),
                int_DELAI_REAPPRO:Ext.getCmp('int_DELAI_REAPPRO').getValue(),
                lg_ZONE_GEO_ID: Ext.getCmp('lg_ZONE_GEO_ID').getValue(),
                lg_CODE_ACTE_ID: Ext.getCmp('lg_CODE_ACTE_ID').getValue(),
                lg_INDICATEUR_REAPPROVISIONNEMENT_ID : Ext.getCmp('lg_INDICATEUR_REAPPROVISIONNEMENT_ID').getValue(),
                dt_DATE_LAST_ENTREE : Ext.getCmp('dt_DATE_LAST_ENTREE').getValue(),
                int_SEUIL_MAX : Ext.getCmp('int_SEUIL_MAX').getValue(),
                //bool_DECONDITIONNE : Ext.getCmp('int_T').getValue()
           
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

       // this.up('window').close();
    }
});