/* global Ext */

var url_services_data_valorisationstock = '../webservices/stockmanagement/stock/ws_data_valorisation.jsp';
var url_services_valorisationstock_generate_pdf = '../webservices/stockmanagement/stock/ws_generate_valorisation_pdf.jsp';
var store;
Ext.define('testextjs.view.stockmanagement.etatstock.ValorisationStock', {
    extend: 'Ext.form.Panel',
    xtype: 'valorisationstock',
    id: 'valorisationstockID',
    frame: true,
    title: 'Valorisation du stock',
    bodyPadding: 10,
//    width: '30%',
    width: 400,
    closable: false,
    fieldDefaults: {
        labelAlign: 'right',
        labelWidth: 115,
        msgTarget: 'side'
    },
    config: {
        nameintern: '',
        titre: ''
    },
    initComponent: function () {

        var itemsPerPage = 20;
        var store_famillearticle = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/famillearticle/ws_data_other.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var str_NAME_USER = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'UTILISATEUR',
                    name: 'str_NAME_USER',
                    id: 'str_NAME_USER',
                    emptyText: 'str_NAME_USER'
                });
        var store_zonegeo = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/zonegeographique/ws_data_other.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var storerepartiteur = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/grossiste/ws_data_other.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var TOTAL_VENTE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'VALEUR VENTE',
                    name: 'TOTAL_VENTE',
                    id: 'TOTAL_VENTE',
                    emptyText: 'TOTAL_VENTE',
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                    value: 0
                });

        var TOTAL_ACHAT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'VALEUR ACHAT',
                    name: 'TOTAL_ACHAT',
                    id: 'TOTAL_ACHAT',
                    emptyText: 'TOTAL_ACHAT',
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                    value: 0
                });

        var dt_CREATED = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Date.Systeme',
                    name: 'dt_CREATED',
                    id: 'dt_CREATED',
                    emptyText: 'dt_CREATED'
                });





        var ld_CREATED_BY = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'CODE',
                    name: 'ld_CREATED_BY',
                    id: 'ld_CREATED_BY',
                    emptyText: 'ld_CREATED_BY'
                });


        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_STATUT_TRANSACTION'],
            data: [{str_TYPE_TRANSACTION: 'Famille', str_STATUT_TRANSACTION: 'Famille'}, {str_TYPE_TRANSACTION: 'Emplacement', str_STATUT_TRANSACTION: 'Emplacement'}, {str_TYPE_TRANSACTION: 'Grossiste', str_STATUT_TRANSACTION: 'Grossiste'}]
        });


        store = new Ext.data.Store({
            model: 'testextjs.model.Caisse',
            proxy: {
                type: 'ajax',
                url: url_services_data_valorisationstock
            }
        });


        store.load({
            callback: function () {
                var OTCaisse = store.getAt(0);
                TOTAL_VENTE.setValue(OTCaisse.get('str_STATUT'));
                TOTAL_ACHAT.setValue(OTCaisse.get('int_AMOUNT_FOND_CAISSE'));
                str_NAME_USER.setValue(OTCaisse.get('str_NAME_USER'));
                ld_CREATED_BY.setValue('<span style="color: green;">' + OTCaisse.get('ld_CREATED_BY') + '</span>');
                dt_CREATED.setValue(OTCaisse.get('dt_CREATED'));
            }
        });


        this.items = [{
                xtype: 'fieldset',
                title: 'Infos Utilisateur',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [
                    str_NAME_USER,
                    ld_CREATED_BY
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Crit&egrave;res de recherche',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [
                    {
                        xtype: 'combobox',
                        fieldLabel: 'Filter par',
//                        margins: '0 0 0 10',
                        id: 'str_TYPE_TRANSACTION',
                        store: store_type,
                        valueField: 'str_STATUT_TRANSACTION',
                        displayField: 'str_TYPE_TRANSACTION',
//                            typeAhead: true,
                        editable: false,
                        queryMode: 'remote',
                        flex: 1,
                        emptyText: 'Filter par...',
                        listeners: {
                            select: function (cmp) {
                                var value = cmp.getValue();

                                var OGridFamille = Ext.getCmp('lg_FAMILLEARTICLE_ID');
                                var OGridemplacement = Ext.getCmp('lg_ZONE_GEO_ID');
                                var OGridGrossiste = Ext.getCmp('lg_GROSSISTE_ID');
                                var OContainerInterval = Ext.getCmp('contenaire_intervalle');
                                OContainerInterval.hide();
                                Ext.getCmp('str_BEGIN').reset();
                                Ext.getCmp('str_END').reset();

                                if (value == "Famille") {
                                    OGridFamille.show();
                                    OGridemplacement.hide();
                                    OGridGrossiste.hide();
//                                        OGridemplacement.getStore().reload();
//                                        OGridGrossiste.getStore().reload();
                                    OGridemplacement.setValue("");
                                    OGridGrossiste.setValue("");
                                } else if (value == "Emplacement") {
                                    OGridemplacement.show();
                                    OGridFamille.hide();
                                    OGridGrossiste.hide();
//                                        OGridFamille.getStore().reload();
//                                        OGridGrossiste.getStore().reload();
                                    OGridFamille.setValue("");
                                    OGridGrossiste.setValue("");
                                } else if (value == "Grossiste") {
                                    OGridGrossiste.show();
                                    OGridFamille.hide();
                                    OGridemplacement.hide();
//                                        OGridFamille.getStore().reload();
//                                        OGridemplacement.getStore().reload();
                                    OGridFamille.setValue("");
                                    OGridemplacement.setValue("");
                                }



                            }
                        }
                    }, {
                        xtype: 'combobox',
                        fieldLabel: 'Famille article',
                        name: 'lg_FAMILLEARTICLE_ID',
                        id: 'lg_FAMILLEARTICLE_ID',
                        store: store_famillearticle,
                        hidden: true,
                        valueField: 'lg_FAMILLEARTICLE_ID',
                        pageSize: itemsPerPage, //ajout la barre de pagination
                        displayField: 'str_LIBELLE',
                        typeAhead: true,
                        queryMode: 'remote',
                        emptyText: 'Sectionner une famille article...',
                        listeners: {
                            select: function (cmp) {
                                var value = cmp.getValue();
                                var OContainerInterval = Ext.getCmp('contenaire_intervalle');
                                if (value == "0") {
                                    OContainerInterval.show();
                                } else {
                                    OContainerInterval.hide();
                                    Ext.getCmp('str_BEGIN').reset();
                                    Ext.getCmp('str_END').reset();
                                }


                            }
                        }
                    }, {
                        xtype: 'combobox',
                        name: 'lg_ZONE_GEO_ID',
                        fieldLabel: 'Emplacement',
//                        margins: '0 0 0 10',
                        id: 'lg_ZONE_GEO_ID',
                        store: store_zonegeo,
                        hidden: true,
                        valueField: 'lg_ZONE_GEO_ID',
                        displayField: 'str_LIBELLEE',
                        pageSize: itemsPerPage, //ajout la barre de pagination
                        typeAhead: true,
                        queryMode: 'remote',
                        flex: 1,
                        emptyText: 'Sectionner un emplacement...',
                        listeners: {
                            select: function (cmp) {
                                var value = cmp.getValue();
                                var OContainerInterval = Ext.getCmp('contenaire_intervalle');
                                if (value == "0") {
                                    OContainerInterval.show();
                                } else {
                                    OContainerInterval.hide();
                                    Ext.getCmp('str_BEGIN').reset();
                                    Ext.getCmp('str_END').reset();
                                }


                            }
                        }
                    }, {
                        xtype: 'combobox',
                        fieldLabel: 'Grossiste',
                        name: 'lg_GROSSISTE_ID',
//                        margin: '5 15 0 0',
                        id: 'lg_GROSSISTE_ID',
                        store: storerepartiteur,
                        valueField: 'lg_GROSSISTE_ID',
                        displayField: 'str_LIBELLE',
                        pageSize: 999, //ajout la barre de pagination
                        hidden: true,
                        typeAhead: true,
                        queryMode: 'remote',
                        flex: 1,
                        emptyText: 'Sectionner un grossiste...',
                        listeners: {
                            select: function (cmp) {
                                var value = cmp.getValue();
                                var OContainerInterval = Ext.getCmp('contenaire_intervalle');
                                if (value == "0") {
                                    OContainerInterval.show();
                                } else {
                                    OContainerInterval.hide();
                                    Ext.getCmp('str_BEGIN').reset();
                                    Ext.getCmp('str_END').reset();
                                }


                            }
                        }

                    }, {
                        xtype: 'fieldcontainer',
                        fieldLabel: 'Intervalle',
                        layout: 'hbox',
                        id: 'contenaire_intervalle',
                        hidden: true,
                        combineErrors: true,
                        defaultType: 'textfield',
                        defaults: {
                            hideLabel: 'true'
                        },
                        items: [
                            {
                                fieldLabel: 'De',
                                width: 100,
                                emptyText: '',
                                name: 'str_BEGIN',
                                id: 'str_BEGIN',
                                margin: '0 10 0 0'/*,
                                 maskRe: /[a-z]/,
                                 maxLength: 1,
                                 minLength: 1*/
                            },
                            {
                                fieldLabel: 'A',
                                xtype: 'textfield',
                                width: 100,
//                                            hidden: true,
                                emptyText: '',
                                name: 'str_END',
                                id: 'str_END'/*,
                                 maxLength: 1,
                                 minLength: 1*/
                            }
                        ]
                    }
                ]
            },
            {
                xtype: 'fieldset',
                title: 'Detail Valorisation',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [
                    TOTAL_VENTE,
                    TOTAL_ACHAT,
                    dt_CREATED
                ]
            }];

        this.callParent();

        this.listeners = {
            beforeclose: function () {
//                testextjs.app.getController('App').onLoadNewComponent("mainmenumanager", "", "");
testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");
            }
        }


    },
    buttons: [
        {
            text: 'Valoriser le stock',
            id: 'btn_valoriser',
            //disabled: true,
            handler: function () {
                Ext.getCmp('TOTAL_VENTE').setValue(0);
                Ext.getCmp('TOTAL_ACHAT').setValue(0);
                Ext.getCmp('str_NAME_USER').setValue('');
                Ext.getCmp('ld_CREATED_BY').setValue('');
                Ext.getCmp('dt_CREATED').setValue('');
                store.load({
                    params: {
                        str_TYPE_TRANSACTION: Ext.getCmp('str_TYPE_TRANSACTION').getValue(),
                        lg_GROSSISTE_ID: Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                        lg_FAMILLEARTICLE_ID: Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue(),
                        lg_ZONE_GEO_ID: Ext.getCmp('lg_ZONE_GEO_ID').getValue(),
                        str_END: Ext.getCmp('str_END').getValue(),
                        str_BEGIN: Ext.getCmp('str_BEGIN').getValue()
                    },
                    callback: function (records) {
                        var OTCaisse = records[0];

                        Ext.getCmp('TOTAL_VENTE').setValue(OTCaisse.get('str_STATUT'));
                        Ext.getCmp('TOTAL_ACHAT').setValue(OTCaisse.get('int_AMOUNT_FOND_CAISSE'));
                        Ext.getCmp('str_NAME_USER').setValue(OTCaisse.get('str_NAME_USER'));
                        Ext.getCmp('ld_CREATED_BY').setValue('<span style="color: green;">' + OTCaisse.get('ld_CREATED_BY') + '</span>');
                        Ext.getCmp('dt_CREATED').setValue(OTCaisse.get('dt_CREATED'));
                    }
                })
            }
        },
        {
            text: 'Imprimer',
            id: 'btn_print',
            disabled: true,
            formBind: true,
            handler: function () {
               var str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
                              var lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                                            lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue(),
                                            lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue(),
                                            str_END = Ext.getCmp('str_END').getValue(),
                                            str_BEGIN = Ext.getCmp('str_BEGIN').getValue(),P_SEARCH="";
                                    if (str_END === null || str_END === undefined) {
                                        str_END = "";
                                    }
                                    if (str_BEGIN === null || str_BEGIN === undefined) {
                                        str_BEGIN = "";
                                    }
                                    if (lg_ZONE_GEO_ID === null || lg_ZONE_GEO_ID === undefined) {
                                        lg_ZONE_GEO_ID = "";
                                    }
                                    if (lg_FAMILLEARTICLE_ID === null || lg_FAMILLEARTICLE_ID === undefined) {
                                        lg_FAMILLEARTICLE_ID = "";
                                    }
                                    if (lg_GROSSISTE_ID === null || lg_GROSSISTE_ID === undefined) {
                                        lg_GROSSISTE_ID = "";
                                    }
                                    if (str_TYPE_TRANSACTION==="Famille"){
                                       P_SEARCH= lg_FAMILLEARTICLE_ID;
                                    }else if(str_TYPE_TRANSACTION==="Emplacement"){
                                       P_SEARCH= lg_ZONE_GEO_ID;
                                    }else if(str_TYPE_TRANSACTION==="Grossiste"){
                                       P_SEARCH= lg_GROSSISTE_ID;
                                    }
                                    
                                    if(P_SEARCH == "%%") {
                                        P_SEARCH = "";
                                    }
//                                    alert('ok bro');
                                    var url_services_valorisationstock_generate_with_criteria = "../webservices/stockmanagement/stock/ws_generate_facture_pdf.jsp?str_TYPE_TRANSACTION=" + str_TYPE_TRANSACTION + "&P_SEARCH=" + P_SEARCH +  "&str_END=" + str_END + "&str_BEGIN=" + str_BEGIN;
                                    testextjs.app.getController('App').onLunchPrinterBis(url_services_valorisationstock_generate_with_criteria);

            }
        }



    ]

});
