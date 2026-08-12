/* global Ext */

var url_services_transaction_litige = '../webservices/configmanagement/litige/ws_transaction.jsp';
var url_services_transaction_litige2 = '../webservices/configmanagement/litige/ws_transaction2.jsp';
var url_services_data_typelitige = '../webservices/configmanagement/litige/ws_data_typelitige.jsp';
var url_services_data_tierspayant_vente = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';
var url_services_data_clients = '../webservices/sm_user/clients/ws_data.jsp?method=list';
var url_services_data_tierspayant_other = '../webservices/tierspayantmanagement/tierspayant/ws_data_other.jsp';
var url_services_data_client_detailTransactionClient = '../webservices/configmanagement/litige/ws_compte_client_vente_data.jsp';
var Oview;
var Omode;
var Me;
var ref;

var str_REFERENCE;
var str_LIBELLE;
var str_DESCRIPTION;
var str_TIERS_PAYANT_ID;
var str_CLIENT_FIRST_NAME;
var str_CLIENT_NAME;
var str_CLIENT_LAST_NAME;
var str_NOM_COMPLET_CLIENT;
var str_TYPE_LITIGE;
var str_ETAT_LITIGE;
var str_COMMENTAIRE_LITIGE;
var str_LITIGE_ID;
var str_LITIGE_CONSEQUENCE;
var str_NUMERO_LITIGE;
var lg_TIERS_PAYANT_ID;


Ext.define('testextjs.view.configmanagement.litige.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addlitige',
    id: 'AjoutLitige',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Client'
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
        str_CLIENT_NAME = "";

        var store_typelitige = new Ext.data.Store({
            model: 'testextjs.model.TypeLitige',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typelitige,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });




        var store_tierspayant2 = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tierspayant_other,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var store_client = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/tierspayantmanagement/tierspayant/ws_client.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        var store_client2 = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/tierspayantmanagement/tierspayant/ws_client.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });


        var store_clients = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_clients,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });

        var str_CLIENT_NAME_FIELD = new Ext.form.field.ComboBox(
                {
                    fieldLabel: 'Client',
                    name: 'lgCOMPTE_CLIENTID',
                    id: 'lgCOMPTE_CLIENTID',
                    store: store_client2,
                    valueField: 'lg_CLIENT_ID',
                    displayField: 'str_FIRST_LAST_NAME',
                    minChars: 2,
                    pageSize: 10,
                    queryMode: 'local',
                    enableKeyEvents: true,
                    flex: 0.6,
                    emptyText: 'Sectionner client...',
                    listConfig: {
                        loadingText: 'Recherche...',
                        emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                        getInnerTpl: function () {
                            return '<span>{str_FIRST_LAST_NAME}</span>';
                        }

                    },
                    listeners: {
                        keypress: function (field, e) {

                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                if (field.getValue().length <= 2) {
                                    field.getStore().load();
                                }

                            }

                        },
                        select: function (cmp) {
                            var value = cmp.getValue();
                            Me.getVentesForClient(value);
                            
                        },
                        change: function (cmp, newVal, oldVal) {
                            var record = cmp.findRecordByValue(newVal);
                            console.log(record.data);
                            str_CLIENT_NAME = record.data.str_FIRST_LAST_NAME;
                        }


                    }
                }
        );

        var store_vente = new Ext.data.Store({
            model: 'testextjs.model.Vente',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../webservices/sm_user/vente/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });

        var store_tierspayant = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tierspayant_vente,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_reference = new Ext.data.Store({
            model: 'testextjs.model.ReferenceVente',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_client_detailTransactionClient,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        var store_litige_state = new Ext.data.Store({
            autoLoad: true,
            fields: ['name', 'value'],
            data: [{"name": "none", "value": "Non Payé"}, {"name": "part", "value": "Payé en partie"}]
        });

        var store_litige_consequence = new Ext.data.Store({
            autoLoad: true,
            fields: ['name', 'value'],
            data: [{"name": "weak", "value": "Aucune Conséquence"},
                {"name": "mean", "value": "Interdiction d'Achat partielle"},
                {"name": "strong", "value": "Interdiction d'Achat totale"}]
        });

        var str_TYPE_LITIGE_FIELD = new Ext.form.field.ComboBox(
                {
                    fieldLabel: 'Type litige',
                    name: 'str_TYPE_LITIGE',
                    id: 'str_TYPE_LITIGE',
                    store: store_typelitige,
                    valueField: 'lg_TYPELITIGE_ID',
                    displayField: 'str_DESCRIPTION',
                    typeAhead: true,
                    allowBlank: false,
                    queryMode: 'remote',
                    emptyText: 'Choisir un type de litige...',
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();

                        }
                    }
                }
        );

        var lg_TIERS_PAYANT_ID_FIELD = new Ext.form.field.ComboBox(
                {
                    xtype: 'combobox',
                    fieldLabel: 'Tiers payant',
                    name: 'lg_TIERS_PAYANT_ID',
                    margins: '0 0 0 10',
                    id: 'lg_TIERS_PAYANT_ID',
                    store: store_tierspayant2,
                    allowBlank: false,
                    valueField: 'lg_TIERS_PAYANT_ID',
                    displayField: 'str_FULLNAME',
                    typeAhead: true,
                    queryMode: 'remote',
                    emptyText: 'Sectionner tiers payant...',
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            lg_TIERS_PAYANT_ID = value;
                            console.log(lg_TIERS_PAYANT_ID);
                            var clientComBo = Ext.getCmp('lgCOMPTE_CLIENTID');
                            clientComBo.clearValue();
                            clientComBo.getStore().load({
                                params: {
                                    lg_TIERS_PAYANT_ID: value
                                }
                            });
                            //clientComBo.clearData();
                        },
                        change: function (cmp, newVal, oldVal) {
                            var newTiersPayantReccord = cmp.findRecordByValue(newVal);
                            console.log(newTiersPayantReccord.data);
                        }
                    }
                }
        );

        var str_LITIGE_CONSEQUENCES_FIELD = new Ext.form.field.ComboBox({
            fieldLabel: 'Conséquences',
            name: 'str_LITIGE_CONSEQUENCES',
            id: 'str_LITIGE_CONSEQUENCES',
            store: store_litige_consequence,
            valueField: 'value',
            displayField: 'value',
            typeAhead: true,
            allowBlank: false,
            queryMode: 'remote',
            emptyText: 'Choisir une conséquence du litige'
        });

        var str_LITIGE_STATE_FIELD = new Ext.form.field.ComboBox({
            fieldLabel: 'Etat du Litige',
            name: 'str_ETAT_LITIGE',
            id: 'str_ETAT_LITIGE',
            store: store_litige_state,
            valueField: 'value',
            displayField: 'value',
            typeAhead: true,
            allowBlank: false,
            queryMode: 'remote',
            emptyText: 'Choisir un état du litige'
        });

        var str_DESCRIPTION_FIELD = new Ext.form.field.TextArea(
                {
                    grow: true,
                    name: 'str_DESCRIPTION',
                    fieldLabel: 'Description',
                    id: 'str_DESCRIPTION',
                    emptyText: 'Description'
                }
        );

        var str_COMMENTAIRE_FIELD = new Ext.form.field.TextArea(
                {
                    grow: true,
                    name: 'str_COMMENTAIRE',
                    fieldLabel: 'Commentaire',
                    id: 'str_COMMENTAIRE',
                    emptyText: 'Saisir un commentaire'
                }
        );

        var str_REFERENCE_VENTE_FIELD = new Ext.form.field.ComboBox({
            fieldLabel: 'Référence Vente',
            name: 'str_REFERENCE_VENTE',
            id: 'str_REFERENCE_VENTE',
            store: store_reference,
            valueField: 'str_REF',
            displayField: 'str_REF',
            typeAhead: true,
            allowBlank: false,
            queryMode: 'remote',
            emptyText: 'Choisir une référence de vente',
            listeners: {
                select: function (cmp) {
                    var value = cmp.getValue();
                    console.log("str_REFERENCE_VENTE_FIELD:  ", value);
                }
            }
        });

        var str_LITIGE_LIBELLE_FIELD = new Ext.form.field.Text(
                {
                    fieldLabel: 'Libelle Litige',
                    emptyText: 'Libelle',
                    name: 'str_LITIGE_LIBELLE',
                    id: 'str_LITIGE_LIBELLE'
                }
        );


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 140,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information sur le litige',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        lg_TIERS_PAYANT_ID_FIELD, str_CLIENT_NAME_FIELD, str_REFERENCE_VENTE_FIELD, str_TYPE_LITIGE_FIELD,
                        str_LITIGE_LIBELLE_FIELD,
                        str_LITIGE_STATE_FIELD,
                        str_DESCRIPTION_FIELD,
                        str_COMMENTAIRE_FIELD,
                        str_LITIGE_CONSEQUENCES_FIELD
                    ]
                }
            ]
        });





        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 650,
            autoHeight: true,
            //height: 400,
            minWidth: 400,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    //disabled: true,
                    id: 'btn_save',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    }
    ,
    getVentesForClient: function (clientID) {
        console.log('clientID: ' + clientID);
        var clientComBo = Ext.getCmp('str_REFERENCE_VENTE');
        clientComBo.clearValue();
        clientComBo.getStore().load({
            params: {
                lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID,
                lg_CLIENT_ID: clientID
            }
        });


       // var referenceField = Ext.getCmp('str_REFERENCE_VENTE');
       // referenceField.getStore().getProxy().url = url_services_data_client_detailTransactionClient + "?lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID + "&lg_CLIENT_ID=" + clientID;//+ "&datedebut=" + valdatedebutDetail + "&datefin=" + valdatefinDetail;
       // referenceField.getStore().load();

        //var OGrid = Ext.getCmp('CltgridpanelID');
        //var url_services_data_balance_agee_detail = '../webservices/tierspayantmanagement/tierspayant/ws_data_facturation.jsp';
        //OGrid.getStore().getProxy().url = url_services_data_client_detailTransactionClient + "?lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID + "&lg_COMPTE_CLIENT_ID=" + lg_COMPTE_CLIENT_ID + "&datedebut=" + valdatedebutDetail + "&datefin=" + valdatefinDetail;
        //OGrid.getStore().load();
    }
    ,
    onbtnsave: function (btn) {
        //str_LITIGE_ID = Ext.getCmp('str_LITIGE_ID').getValue();
        str_REFERENCE = Ext.getCmp('str_REFERENCE_VENTE').getValue();
        str_LIBELLE = Ext.getCmp('str_LITIGE_LIBELLE').getValue();
        str_DESCRIPTION = Ext.getCmp('str_DESCRIPTION').getValue();
        str_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        //str_CLIENT_FIRST_NAME = str_CLIENT_FIRST_NAME;
        //str_CLIENT_LAST_NAME = Ext.getCmp('strCLIENTLASTNAME').getValue();
        str_TYPE_LITIGE = Ext.getCmp('str_TYPE_LITIGE').getValue();
        str_ETAT_LITIGE = Ext.getCmp('str_ETAT_LITIGE').getValue();
        str_COMMENTAIRE_LITIGE = Ext.getCmp('str_COMMENTAIRE').getValue();
        str_LITIGE_CONSEQUENCE = Ext.getCmp('str_LITIGE_CONSEQUENCES').getValue();
        var fenetre = btn.up('window'),
                formulaire = fenetre.down('form');
        if (formulaire.isValid()) {
            Ext.Ajax.request({
                url: url_services_transaction_litige2,
                params: {
                    str_REFERENCE: str_REFERENCE,
                    str_LIBELLE: str_LIBELLE,
                    str_DESCRIPTION: str_DESCRIPTION,
                    str_TIERS_PAYANT_ID: str_TIERS_PAYANT_ID,
                    str_CLIENT_NAME: str_CLIENT_NAME,
                    str_TYPE_LITIGE: str_TYPE_LITIGE,
                    str_ETAT_LITIGE: str_ETAT_LITIGE,
                    str_COMMENTAIRE_LITIGE: str_COMMENTAIRE_LITIGE,
                    str_LITIGE_CONSEQUENCE: str_LITIGE_CONSEQUENCE

                },
                success: function (response) {
                    var responseJSON = Ext.JSON.decode(response.responseText);
                    Me.processLitigeCreationResponse(responseJSON, fenetre);
                },
                failure: function (error) {
                    console.error(error);
                }
            });

        }
    },
    processLitigeCreationResponse: function (response, fenetre) {

        if (response.success === 'true') {
            fenetre.close();
            Ext.MessageBox.show({
                title: 'Création du litige avec success',
                msg: 'Félicitations! Votre litige a été crée avec succès!',
                width: 400,
                height: 150,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.SUCC
            });
            Ext.getCmp('GridLitigeID').getStore().reload();

        } else {
            Ext.MessageBox.show({
                title: 'Création du litige avec erreur',
                msg: "OOps! Un problème s'est produit lors de la création du litige",
                width: 450,
                height: 150,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR
            });

        }
    }

});
