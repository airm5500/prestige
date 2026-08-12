/* global Ext, url_services_data_risque, url_services_data_categorie_ayant_droit */

//var url_services_data_ayantdroit = '../webservices/configmanagement/ayantdroit/ws_data.jsp';
var url_services_transaction_ayantdroit = '../webservices/configmanagement/ayantdroit/ws_transaction.jsp?mode=';
var url_services_rest_ayantdroit = '../api/v1/ayants-droits/'; // create / update en REST (memes regles metier)
var url_services_data_client = '../webservices/configmanagement/client/ws_data.jsp';
var url_services_data_ville = '../webservices/configmanagement/ville/ws_data.jsp';
var type;

Ext.define('testextjs.view.configmanagement.ayantdroit.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addayantdroit',
    id: 'addayantdroitID1',
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
    initComponent: function () {

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
                url: url_services_data_client + "?lg_TYPE_CLIENT_ID=1",
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
                            name: 'lg_CLIENT_ID',
                            id: 'lg_CLIENT_ID',
                            store: store_categorie_client,
                            valueField: 'lg_CLIENT_ID',
                            pageSize: 20, //ajout la barre de pagination
                            displayField: 'str_FIRST_LAST_NAME',
                            typeAhead: true,
                            allowBlank: false,
                            queryMode: 'remote',
                            minChars: 3,
                            emptyText: 'Choisir un client...',
                            listeners: {
                                specialKey: function (field, e) {
//                                                    alert("field.getValue().length"+e.getKey());
                                    if (e.getKey() === e.BACKSPACE || e.getKey() === 46 || e.getKey() === 8) {

                                        if (field.getValue().length === 1) {
                                            field.getStore().load();
                                        }
                                    }

                                }
                            }
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
                            name: 'str_FIRST_NAME',
                            id: 'str_FIRST_NAME',
                            allowBlank: false
                        }, {
                            fieldLabel: 'Prenom',
                            emptyText: 'PRENOMS',
                            name: 'str_LAST_NAME',
                            allowBlank: false,
                            id: 'str_LAST_NAME'
                        }, {
                            fieldLabel: 'Matricule',
                            emptyText: 'Matricule',
                            name: 'str_NUMERO_SECURITE_SOCIAL',
                            id: 'str_NUMERO_SECURITE_SOCIAL'
                        }, {
                            fieldLabel: 'Code interne',
                            emptyText: 'Code interne',
                            name: 'str_CODE_INTERNE',
                            hidden: true,
                            id: 'str_CODE_INTERNE'
                        },

                        /*{
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
                         }*/
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
                            xtype: 'datefield',
                            fieldLabel: 'Date de naissance',
                            name: 'dt_NAISSANCE',
                            id: 'dt_NAISSANCE',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'
//                            allowBlank: false
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

        });
        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_AYANTS_DROITS_ID;

            Ext.getCmp('lg_CLIENT_ID').hide();
            Ext.getCmp('str_CODE_INTERNE').setValue(this.getOdatasource().str_CODE_INTERNE);
            Ext.getCmp('str_CODE_INTERNE').hide();
            Ext.getCmp('str_FIRST_NAME').setValue(this.getOdatasource().str_FIRST_NAME);

            Ext.getCmp('str_LAST_NAME').setValue(this.getOdatasource().str_LAST_NAME);
            Ext.getCmp('dt_NAISSANCE').setValue(this.getOdatasource().dt_NAISSANCE);
            
           
           if(this.getOdatasource().str_SEXE==='F'){
               Ext.getCmp('str_SEXE').items.items[0].setValue(true); 
           }else if(this.getOdatasource().str_SEXE==='M'){
              Ext.getCmp('str_SEXE').items.items[1].setValue(true);  
           }
               
            
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);


            Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID').setValue(this.getOdatasource().lg_CATEGORIE_AYANTDROIT_ID);
            Ext.getCmp('lg_CLIENT_ID').setValue(this.getOdatasource().lg_CLIENT_ID);
            Ext.getCmp('lg_RISQUE_ID').setValue(this.getOdatasource().lg_RISQUE_ID);
            Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').setValue(this.getOdatasource().str_NUMERO_SECURITE_SOCIAL);
        }

        if (Omode === "createayantdroitByclt") {
            Ext.getCmp('lg_CLIENT_ID').hide();
            Ext.getCmp('lg_CLIENT_ID').setValue(this.getOdatasource().lg_CLIENT_ID);
        }




        var win = new Ext.window.Window({
            modal: true,
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
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });
    },
    onbtnsave: function (button) {

        var internal_url = "";
        // var Oview = Ext.getCmp('ayantdroitgrid');
        //alert("Omode "+Omode);
        if (Omode === "create" || Omode === "createayantdroitByclt") {
            internal_url = url_services_rest_ayantdroit + 'create';
        } else {
            internal_url = url_services_rest_ayantdroit + 'update';
        }
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (formulaire.isValid()) {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                method: 'POST',
                params: {
                    lg_AYANTS_DROITS_ID: ((Omode === "create" || Omode === "createayantdroitByclt") ? "" : ref),
                    str_FIRST_NAME: Ext.getCmp('str_FIRST_NAME').getValue(),
                    str_LAST_NAME: Ext.getCmp('str_LAST_NAME').getValue(),
                    dt_NAISSANCE: Ext.getCmp('dt_NAISSANCE').getSubmitValue(),
                    str_SEXE: Ext.getCmp('str_SEXE').getValue(),
                    lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue(),
                    lg_CLIENT_ID: Ext.getCmp('lg_CLIENT_ID').getValue(),
                    str_CODE_INTERNE: Ext.getCmp('str_CODE_INTERNE').getValue(),
                    str_NUMERO_SECURITE_SOCIAL: Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').getValue(),
                    lg_CATEGORIE_AYANTDROIT_ID: Ext.getCmp('lg_CATEGORIE_AYANTDROIT_ID').getValue(),
                    lg_RISQUE_ID: Ext.getCmp('lg_RISQUE_ID').getValue()

                },
                success: function (response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success === "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        /*if (type === "clientmanager") {
                         var OGrid = Ext.getCmp('CltgridpanelID');
                         OGrid.getStore().reload();
                         } else if (type === "ayantdroitclient") {
                         Oview.getStore().reload();
                         }*/
                        return;
                    } else {
                        Ext.MessageBox.alert('Confirmation', object.errors);

                        if (type === "clientmanager") {

                            var OGrid = Ext.getCmp('CltgridpanelID');
                            OGrid.getStore().reload();
                            Me_Workflow_Detail = Oview;
                            //Me_Workflow_Detail.getStore().reload();
                        } else if (type === "ayantdroitclient") {
//                        Oview.getStore().reload();


                            Me_Workflow = Oview;
                            Me_Workflow.getStore().reload();

                            // testextjs.app.getController('App').onLoadNewComponent("ayantdroitmanager", "Gerer Ayant Droit", "");
                        }

                        fenetre.close();

                    }
//                Oview.getStore().reload();
                },
                failure: function (response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('  Message', response.responseText);
                    Oview.getStore().reload();
                }
            });
        } else {
            Ext.MessageBox.alert('Echec', 'Formulaire non valide');
        }

//        this.up('window').close();
    }
});


