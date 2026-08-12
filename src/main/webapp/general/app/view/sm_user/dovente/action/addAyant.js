//var url_services_data_ayantdroit = '../webservices/configmanagement/ayantdroit/ws_data.jsp';
var url_services_transaction_ayantdroit = '../webservices/configmanagement/ayantdroit/ws_transaction.jsp?mode=';
var url_services_data_client = '../webservices/configmanagement/client/ws_data.jsp';
var url_services_data_ville = '../webservices/configmanagement/ville/ws_data.jsp';
var type;

Ext.define('testextjs.view.sm_user.dovente.action.addAyant', {
    extend: 'Ext.window.Window',
    xtype: 'addAyant',
    id: 'addAyantID1',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.AyantDroit',
        'testextjs.model.CategorieAyantdroit',
        'testextjs.model.Risque',
        'testextjs.model.Client',
        'testextjs.view.configmanagement.client.*'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        type: ''
    },
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        var itemsPerPage = 20;
        type = this.getType();

        var store_categorie_client = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_client,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var store_ville = new Ext.data.Store({
            model: 'testextjs.model.Ville',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_ville,
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


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 160,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information Ayant Droit',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        // str_CODE
                        {
                            xtype: 'fieldset',
                            title: 'Infos.Gle.Ayant.Droit',
                            id: 'InfoGleAyantDroitID',
                            defaultType: 'textfield',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Client',
                                    name: 'lg_CLIENT_VENTE_ID',
                                    id: 'lg_CLIENT_VENTE_ID',
                                    store: store_categorie_client,
                                    valueField: 'lg_CLIENT_ID',
                                    displayField: 'str_FIRST_LAST_NAME',
                                    typeAhead: true,
                                    allowBlank: false,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un client...'
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Categorie Ayant Droit',
                                    name: 'lg_CATEGORIE_AYANTDROIT_ID',
                                    id: 'lg_CATEGORIE_AYANTDROIT_ID',
                                    store: store_categorie_ayant_droit,
                                    valueField: 'lg_CATEGORIE_AYANTDROIT_ID',
                                    displayField: 'str_LIBELLE_CATEGORIE_AYANTDROIT',
//                                    typeAhead: true,
                                    editable: false, //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                                    queryMode: 'remote',
                                    emptyText: 'Choisir une categorie d ayant droit...'
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Risque',
                                    name: 'lg_RISQUE_ID',
                                    id: 'lg_RISQUE_ID',
                                    store: store_categorie_risque,
                                    valueField: 'lg_RISQUE_ID',
                                    displayField: 'str_LIBELLE_RISQUE',
//                                    typeAhead: true,
                                    editable: false, //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un risque...'
                                }
                            ]
                        },
                        // Autre bloc Items

                        {
                            xtype: 'fieldset',
                            title: 'Ayant.Droits',
                            id: 'InfoGleAyantDroitsID',
                            defaultType: 'textfield',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    fieldLabel: 'Nom',
                                    emptyText: 'NOM',
                                    name: 'str_FIRST_NAME_VENTE',
                                    id: 'str_FIRST_NAME_VENTE',
                                    allowBlank: false
                                }, {
                                    fieldLabel: 'Prenom',
                                    allowBlank: false,
                                    emptyText: 'PRENOMS',
                                    name: 'str_LAST_NAME_VENTE',
                                    id: 'str_LAST_NAME_VENTE'
                                }, {
                                    fieldLabel: 'Matricule',
                                    emptyText: 'Matricule',
                                    name: 'str_NUMERO_SECURITE_SOCIAL_VENTE',
                                    id: 'str_NUMERO_SECURITE_SOCIAL_VENTE'
                                }, {
                                    fieldLabel: 'Code interne',
                                    emptyText: 'Code interne',
                                    name: 'str_CODE_INTERNE',
                                    id: 'str_CODE_INTERNE'
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Genre',
                                    name: 'str_SEXE',
                                    id: 'str_SEXE',
                                    store: ['F', 'M'],
                                    valueField: 'str_SEXE',
                                    displayField: 'str_SEXE',
//                                    typeAhead: true,
                                    editable: false, //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                                    queryMode: 'local',
                                    emptyText: 'Choisir un genre...'
                                },
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Date de naissance',
                                    name: 'dt_NAISSANCE',
                                    id: 'dt_NAISSANCE'/*,
                                     allowBlank: false*/
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Ville',
                                    name: 'lg_VILLE_ID',
                                    id: 'lg_VILLE_ID',
                                    store: store_ville,
                                    valueField: 'lg_VILLE_ID',
                                    displayField: 'STR_NAME',
//                                    typeAhead: true,
                                    editable: false, //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                                    queryMode: 'remote',
                                    emptyText: 'Choisir une ville...'
                                }
                            ]
                        }
                    ]
                }]
        });
        //Initialisation des valeur


        if (Omode === "ayantdroitclientvente") {
            Ext.getCmp('lg_CLIENT_VENTE_ID').hide();
            Ext.getCmp('str_CODE_INTERNE').hide();
            Ext.getCmp('lg_CLIENT_VENTE_ID').setValue(this.getOdatasource());
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 600,
            height: 500,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Fermer',
                    handler: function() {
                        win.close();
                    }
                }]
        });
    },
    onbtnsave: function(button) {

        var internal_url = url_services_transaction_ayantdroit + 'create';

        var Oview = Ext.getCmp('ayantdroitgrid');
        var win = button.up('window'), form = win.down('form');
        if (form.isValid()) {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                params: {
                    str_FIRST_NAME: Ext.getCmp('str_FIRST_NAME_VENTE').getValue(),
                    str_LAST_NAME: Ext.getCmp('str_LAST_NAME_VENTE').getValue(),
                    dt_NAISSANCE: Ext.getCmp('dt_NAISSANCE').getValue(),
                    str_SEXE: Ext.getCmp('str_SEXE').getValue(),
                    lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue(),
                    lg_CLIENT_ID: Ext.getCmp('lg_CLIENT_VENTE_ID').getValue(),
                    str_CODE_INTERNE: Ext.getCmp('str_CODE_INTERNE').getValue(),
                    str_NUMERO_SECURITE_SOCIAL: Ext.getCmp('str_NUMERO_SECURITE_SOCIAL_VENTE').getValue(),
                    lg_CATEGORIE_AYANTDROIT_ID: Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID').getValue(),
                    lg_RISQUE_ID: Ext.getCmp('lg_RISQUE_ID').getValue()

                },
                success: function(response)
                {
                    //alert("succes");
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        Ext.MessageBox.alert('Confirmation', object.errors);
                        if (type === "ayantdroitclientvente") {
                            //var OGrid = Ext.getCmp('CustomerDisplaygridpanelID');
                            OCustomerDisplaygridpanelID.getStore().reload();
                            OFieldProduct.focus(true, 100, function() {
                                OFieldProduct.selectText(0, 1);
                            });
                        }
                        var bouton = button.up('window');
                        bouton.close();

                    }
//                Oview.getStore().reload();
                },
                failure: function(response)
                {
                    //alert("echec");
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                   // Ext.MessageBox.alert('  Message', response.responseText);
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        msg: response.responseText,
                        // width: 300,
                        height: 150,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                }
            });
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
//        alert("internal_url " + internal_url);

        // this.up('window').close();
    }
});


