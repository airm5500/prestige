var url_services_data_grossiste = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_ville = '../webservices/configmanagement/ville/ws_data.jsp';
var url_services_data_typereglement = "../webservices/sm_user/typereglement/ws_data.jsp";
var url_services_transaction_grossiste = '../webservices/configmanagement/grossiste/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;
var groupefournisseur;
Ext.define('testextjs.view.configmanagement.grossiste.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addgrossiste',
    id: 'addgrossisteID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Grossiste',
        'testextjs.model.Ville',
        'testextjs.model.TypeReglement'
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
        groupefournisseur = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'number'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/groupefournisseurs',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });

        var storeville = new Ext.data.Store({
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

        var storetypereglement = new Ext.data.Store({
            model: 'testextjs.model.TypeReglement',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_typereglement,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            layout: 'anchor',
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 160,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information Grossiste',
                    defaultType: 'textfield',
                    layout: 'vbox',
                    anchor: '100%',
                    height: 360,
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
                                    name: 'str_CODE',
                                    id: 'str_CODE',
                                    fieldLabel: 'Code',
                                    emptyText: 'Code',
                                    flex: 1,
                                    allowBlank: false
                                },
                                {
                                    name: 'str_LIBELLE',
                                    id: 'str_LIBELLE',
                                    fieldLabel: 'Nom',
                                    emptyText: 'Nom',
                                    flex: 1,
                                    allowBlank: false
                                },
                                {
                                    name: 'str_DESCRIPTION',
                                    id: 'str_DESCRIPTION',
                                    fieldLabel: 'Description',
                                    emptyText: 'Description',
                                    flex: 1,
                                    allowBlank: false
                                }

                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    name: 'str_ADRESSE_RUE_1',
                                    id: 'str_ADRESSE_RUE_1',
                                    fieldLabel: 'Adresse 1',
                                    emptyText: 'Adresse 1',
                                    flex: 1,
                                    allowBlank: false
                                },
                                {
                                    name: 'str_ADRESSE_RUE_2',
                                    id: 'str_ADRESSE_RUE_2',
                                    fieldLabel: 'Adresse 2',
                                    emptyText: 'Adresse 2',
                                    flex: 1
                                            //allowBlank: false
                                },
                                {
                                    name: 'str_CODE_POSTAL',
                                    id: 'str_CODE_POSTAL',
                                    fieldLabel: 'Code Postal',
                                    emptyText: 'Code Postal',
                                    flex: 1
                                            //allowBlank: false
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    name: 'str_BUREAU_DISTRIBUTEUR',
                                    id: 'str_BUREAU_DISTRIBUTEUR',
                                    fieldLabel: 'Bureau distributeur',
                                    emptyText: 'Bureau distributeur',
                                    flex: 1
                                            // allowBlank: false
                                },
                                {
                                    name: 'str_MOBILE',
                                    id: 'str_MOBILE',
                                    fieldLabel: 'Mobile',
                                    emptyText: 'Mobile',
                                    maskRe: /[0-9.]/,
                                    flex: 1
                                            // allowBlank: false
                                },
                                {
                                    name: 'str_TELEPHONE',
                                    id: 'str_TELEPHONE',
                                    fieldLabel: 'Telephone',
                                    emptyText: 'Telephone',
                                    flex: 1,
                                    maskRe: /[0-9.]/,
                                    allowBlank: false
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    name: 'int_DELAI_REAPPROVISIONNEMENT',
                                    id: 'int_DELAI_REAPPROVISIONNEMENT',
                                    fieldLabel: 'Delai de reapprovisionnement',
                                    emptyText: 'Delai de reapprovisionnement',
                                    maskRe: /[0-9.]/,
                                    flex: 1,
                                    value: 1
                                },
                                {
                                    name: 'int_COEF_SECURITY',
                                    id: 'int_COEF_SECURITY',
                                    fieldLabel: 'Coefficient de securite',
                                    emptyText: 'Coefficient de securite',
                                    minValue: 15,
                                    maxValue: 30,
                                    maskRe: /[0-9.]/,
                                    flex: 1,
                                    value: 1
                                            // allowBlank: false
                                },
                                {
                                    name: 'int_DATE_BUTOIR_ARTICLE',
                                    id: 'int_DATE_BUTOIR_ARTICLE',
                                    fieldLabel: 'Date butoire',
                                    emptyText: 'Date butoire',
                                    flex: 1,
                                    maskRe: /[0-9.]/,
                                    minValue: 15,
                                    maxValue: 30,
                                    allowBlank: false
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    name: 'int_DELAI_REGLEMENT_AUTORISE',
                                    id: 'int_DELAI_REGLEMENT_AUTORISE',
                                    fieldLabel: 'Delai reglement',
                                    emptyText: 'Delai reglement',
                                    flex: 1,
                                    maskRe: /[0-9.]/
                                            // allowBlank: false
                                },
                                {
                                    name: 'idrepartiteur',
                                    id: 'idrepartiteur',
                                    fieldLabel: 'Identifiant repartiteur',
                                    emptyText: '',
                                    flex: 1
                                },

                                {
                                    name: 'dbl_CHIFFRE_DAFFAIRE',
                                    id: 'dbl_CHIFFRE_DAFFAIRE',
                                    fieldLabel: 'Chiffre d' + "'" + 'Affaire',
                                    emptyText: 'Chiffre d' + "'" + 'Affaire',
                                    flex: 1,
                                    hidden: true,
                                    value: 0,
                                    maskRe: /[0-9.]/

                                },

                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Type reglement',
                                    name: 'lg_TYPE_REGLEMENT_ID',
                                    id: 'lg_TYPE_REGLEMENT_ID',
                                    store: storetypereglement,
                                    valueField: 'lg_TYPE_REGLEMENT_ID',
                                    displayField: 'str_NAME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir une type de reglement...'

                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            flex: 1,
                            defaultType: 'textfield',
                            margin: '0 0 10 0',
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Ville',
                                    name: 'lg_VILLE_ID',
                                    id: 'lg_VILLE_ID',
                                    store: storeville,
                                    valueField: 'lg_VILLE_ID',
                                    displayField: 'STR_NAME',
                                    width: 400,
//                            typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir une ville...',
                                    allowBlank: false,
                                    editable: false //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                                },

                                {xtype: 'splitter'},
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Groupe Grossiste',
                                    name: 'groupeId',
                                    id: 'groupeId',
                                    store: groupefournisseur,
                                    forceselection: true,
                                    pageSize: 999,
                                    valueField: 'id',
                                    displayField: 'libelle',
                                    typeAhead: true,
                                    flex: 1,
                                    width: 400,
                                    triggerAction: 'all',
                                    queryMode: 'remote',
                                    enableKeyEvents: true,
                                    emptyText: 'Choisir un groupe de grossiste...'

                                }

                            ]
                        }

                    ]
                }]
        });
        if (Omode !== "update") {
            var combo = Ext.getCmp("lg_TYPE_REGLEMENT_ID");
            combo.getStore().on(
                    "load", function () {

                        var combostore = combo.getStore();
                        combostore.each(function (r, id) {
                            switch (r.get('lg_TYPE_REGLEMENT_ID')) {
                                case '1':
                                    combo.setValue(r.get('lg_TYPE_REGLEMENT_ID'));
                                    //L'id de ESPECE doit etre 1 ou remplacer la valeur 1 par l'id dans la bd
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


        if (Omode === "update") {

            ref = this.getOdatasource().lg_GROSSISTE_ID;
            Ext.getCmp('str_LIBELLE').setValue(this.getOdatasource().str_LIBELLE);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_ADRESSE_RUE_1').setValue(this.getOdatasource().str_ADRESSE_RUE_1);
            Ext.getCmp('str_ADRESSE_RUE_2').setValue(this.getOdatasource().str_ADRESSE_RUE_2);
            Ext.getCmp('str_CODE_POSTAL').setValue(this.getOdatasource().str_CODE_POSTAL);
            Ext.getCmp('str_BUREAU_DISTRIBUTEUR').setValue(this.getOdatasource().str_BUREAU_DISTRIBUTEUR);
            Ext.getCmp('str_MOBILE').setValue(this.getOdatasource().str_MOBILE);
            Ext.getCmp('str_TELEPHONE').setValue(this.getOdatasource().str_TELEPHONE);
            Ext.getCmp('int_DELAI_REGLEMENT_AUTORISE').setValue(this.getOdatasource().int_DELAI_REGLEMENT_AUTORISE);
            Ext.getCmp('dbl_CHIFFRE_DAFFAIRE').setValue(this.getOdatasource().dbl_CHIFFRE_DAFFAIRE);
            Ext.getCmp('lg_TYPE_REGLEMENT_ID').setValue(this.getOdatasource().lg_TYPE_REGLEMENT_ID);
            Ext.getCmp('str_CODE').setValue(this.getOdatasource().str_CODE);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);
            Ext.getCmp('int_DELAI_REAPPROVISIONNEMENT').setValue(this.getOdatasource().int_DELAI_REAPPROVISIONNEMENT);
            Ext.getCmp('int_COEF_SECURITY').setValue(this.getOdatasource().int_COEF_SECURITY);
            Ext.getCmp('int_DATE_BUTOIR_ARTICLE').setValue(this.getOdatasource().int_DATE_BUTOIR_ARTICLE);
            var groupeId = this.getOdatasource().groupeId;
            groupefournisseur.load({callback: function (records, operation, successful) {
                    Ext.each(records, function (item) {
                        let rec = item.data;
                        if (rec.id == groupeId) {
                            Ext.getCmp('groupeId').setValue(rec.id);
                            combobox.setDisplayField(rec.libelle);
                            return ;
                        }
                    });

                }});
            Ext.getCmp('idrepartiteur').setValue(this.getOdatasource().idrepartiteur);

        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: '80%',
            height: 400,
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
        if (formulaire.isValid()) {
            var internal_url = "";
            if (Omode === "create") {
                internal_url = url_services_transaction_grossiste + 'create';
            } else {
                internal_url = url_services_transaction_grossiste + 'update&lg_GROSSISTE_ID=' + ref;
            }
            if (Ext.getCmp('int_DATE_BUTOIR_ARTICLE').getValue() < 15) {
                Ext.MessageBox.alert('Impossible', 'La date butoire ne doit pas etre inferieure a 15');
                return;
            }

            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                params: {
                    str_LIBELLE: Ext.getCmp('str_LIBELLE').getValue(),
                    str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                    str_ADRESSE_RUE_1: Ext.getCmp('str_ADRESSE_RUE_1').getValue(),
                    str_ADRESSE_RUE_2: Ext.getCmp('str_ADRESSE_RUE_2').getValue(),
                    str_CODE_POSTAL: Ext.getCmp('str_CODE_POSTAL').getValue(),
                    str_BUREAU_DISTRIBUTEUR: Ext.getCmp('str_BUREAU_DISTRIBUTEUR').getValue(),
                    str_MOBILE: Ext.getCmp('str_MOBILE').getValue(),
                    str_TELEPHONE: Ext.getCmp('str_TELEPHONE').getValue(),
                    int_DELAI_REGLEMENT_AUTORISE: Ext.getCmp('int_DELAI_REGLEMENT_AUTORISE').getValue(),
                    dbl_CHIFFRE_DAFFAIRE: Ext.getCmp('dbl_CHIFFRE_DAFFAIRE').getValue(),
                    lg_TYPE_REGLEMENT_ID: Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue(),
                    str_CODE: Ext.getCmp('str_CODE').getValue(),
                    lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue(),
                    int_DELAI_REAPPROVISIONNEMENT: Ext.getCmp('int_DELAI_REAPPROVISIONNEMENT').getValue(),
                    int_COEF_SECURITY: Ext.getCmp('int_COEF_SECURITY').getValue(),
                    int_DATE_BUTOIR_ARTICLE: Ext.getCmp('int_DATE_BUTOIR_ARTICLE').getValue(),
                    groupeId: Ext.getCmp('groupeId').getValue(),
                    idrepartiteur: Ext.getCmp('idrepartiteur').getValue()

                },
                success: function (response)
                {
             
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {

                        Ext.MessageBox.alert('Confirmation', object.errors);
                        fenetre.close();
                        Me_Workflow = Oview;
                        Me_Workflow.getStore().reload();
                    }
                    //Oview.getStore().reload();
                },
                failure: function (response)
                {
                    //alert("echec");
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
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

    }
});