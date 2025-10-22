/* global Ext */

var url_services_transaction_inventaire = '../webservices/stockmanagement/inventaire/ws_transactions.jsp?mode=';
var url_services_data_zonegeo_other = '../webservices/configmanagement/zonegeographique/ws_data_other.jsp';
var url_services_data_famillearticle_other = '../webservices/configmanagement/famillearticle/ws_data_other.jsp';
var url_services_data_grossiste_other = '../webservices/configmanagement/grossiste/ws_data_other.jsp';

var Oview;
var Omode;
var Me;
var ref;
Ext.define('testextjs.view.stockmanagement.inventaire.action.addBis', {
    extend: 'Ext.window.Window',
    xtype: 'addinventaire',
    id: 'addinventaireID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'
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

        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_STATUT_TRANSACTION'],
            data: [{str_TYPE_TRANSACTION: 'Famille', str_STATUT_TRANSACTION: 'Famille'}, {str_TYPE_TRANSACTION: 'Emplacement', str_STATUT_TRANSACTION: 'Emplacement'}, {str_TYPE_TRANSACTION: 'Grossiste', str_STATUT_TRANSACTION: 'Grossiste'}]
        });
        const stockFilterStore = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [{id: 'ALL', libelle: 'Tout'}, {id: 'LESS_EQUALS', libelle: 'Inférieur ou égal'}, {id: 'LESS', libelle: 'Inférieur'}, {id: 'GREATHER_EQUALS', libelle: 'Supérieur ou égal'}, {id: 'GREATHER', libelle: 'Supérieur'}, {id: 'NOT_EQUALS', libelle: 'Différent'}]
        });

        var storerepartiteur = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_grossiste_other,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_famillearticle = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famillearticle_other,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        var store_zonegeo = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeo_other,
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
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information sur l\'inventaire',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Libelle',
                            emptyText: 'Libelle',
                            name: 'str_NAME',
                            id: 'str_NAME'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Inventaire par',
                            name: 'str_TYPE_TRANSACTION',
                            margins: '0 0 0 10',
                            id: 'str_TYPE_TRANSACTION',
                            store: store_type,
                            valueField: 'str_STATUT_TRANSACTION',
                            displayField: 'str_TYPE_TRANSACTION',
//                            typeAhead: true,
                            editable: false,
                            queryMode: 'remote',
                            flex: 1,
                            emptyText: 'Inventaire par...',
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
                        },
                        {
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
                        },
                        {
                            xtype: 'combobox',
                            name: 'lg_ZONE_GEO_ID',
                            fieldLabel: 'Emplacement',
                            margins: '0 0 0 10',
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
                        },

                        {
                            xtype: 'combobox',
                            fieldLabel: 'Grossiste',
                            name: 'lg_GROSSISTE_ID',

                            id: 'lg_GROSSISTE_ID',
                            store: storerepartiteur,
                            valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE',
                            pageSize: itemsPerPage, //ajout la barre de pagination
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

                        },

                        {
                            xtype: 'combobox',
                            fieldLabel: 'Filter le stock',
                            name: 'stockFilter',

                            id: 'stockFilterStore',
                            store: stockFilterStore,
                            valueField: 'id',
                            displayField: 'libelle',
                            queryMode: 'local',
                            value: 'ALL',
                            flex: 1,
                            emptyText: 'Filter le stock...',
                            listeners: {
                                select: function (cmp) {
                                    const value = cmp.getValue();
                                    const stockProduit = Ext.getCmp('stockProduit');
                                    if (value !== "ALL") {
                                        stockProduit.show();
                                    } else {
                                        stockProduit.hide();

                                    }

                                }
                            }
                        }, {
                            xtype: 'numberfield',
                            flex: 1,
                            fieldLabel: 'Stock produit',
                            name: 'stockProduit',
                            hidden: true,
                            id: 'stockProduit'
                        },

                        {
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
                }
            ]
        });






        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 300,
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
                }]
        });

    },
    onbtnsave: function (button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var internal_url = "";

        if (Ext.getCmp('str_TYPE_TRANSACTION').getValue() === null) {
            Ext.MessageBox.alert('Message d\'erreur', 'Veuillez s&eacute;lectionner un type inventaire');
            return;
        } else {
            if ((Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() == null && Ext.getCmp('lg_ZONE_GEO_ID').getValue() == "" && Ext.getCmp('lg_GROSSISTE_ID').getValue() == "") ||
                    (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() == "" && Ext.getCmp('lg_ZONE_GEO_ID').getValue() == null && Ext.getCmp('lg_GROSSISTE_ID').getValue() == "") ||
                    (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() == "" && Ext.getCmp('lg_ZONE_GEO_ID').getValue() == "" && Ext.getCmp('lg_GROSSISTE_ID').getValue() == null) ||
                    (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() == "" && Ext.getCmp('lg_ZONE_GEO_ID').getValue() == "" && Ext.getCmp('lg_GROSSISTE_ID').getValue() == "")) {
                Ext.MessageBox.alert('Message d\'erreur', 'Veuillez s&eacute;lectionner un &eacute;l&eacute;ment');
                return;
            }

        }

        if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() == "0" || Ext.getCmp('lg_ZONE_GEO_ID').getValue() == "0" || Ext.getCmp('lg_GROSSISTE_ID').getValue() == "0") {
            if (Ext.getCmp('str_BEGIN').getValue() == null || Ext.getCmp('str_END').getValue() == null || Ext.getCmp('str_BEGIN').getValue() == "" || Ext.getCmp('str_END').getValue() == "") {
                Ext.MessageBox.alert('Message d\'erreur', 'Veuillez saisir un intervalle');
                return;
            }
        }

        if (formulaire.isValid()) {

            formulaire.submit({
                url:"../webservices/stockmanagement/inventaire/ws_transactions.jsp?mode=createbis",
                timeout: 1800000,
                params: {
                    bool_INVENTAIRE: 1
                },
                waitMsg: "Veuillez patienter. Traitement en cours...",
                waitTitle: 'Creation d\'un inventaire',
                success: function (formulaire, action) {

                    Ext.MessageBox.alert('Infos', action.result.nombre);
                    Oview.getStore().reload();

                    var bouton = button.up('window');
                    bouton.close();
                },
                failure: function (formulaire, action) {
                    var bouton = button.up('window');
                    bouton.close();
                    Oview.getStore().reload();
                    Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.nombre);
                }
            });

        } else {
            Ext.MessageBox.alert('Echec', 'Formulaire non valide');
        }

    }
});
