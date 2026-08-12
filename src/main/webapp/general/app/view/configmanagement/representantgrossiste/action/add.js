var url_services_data_representantgrossiste = '../webservices/configmanagement/representantgrossiste/ws_data.jsp';
var url_services_data_ville = '../webservices/configmanagement/ville/ws_data.jsp';
var url_services_data_grossiste = "../webservices/sm_user/grossiste/ws_data.jsp";
var url_services_transaction_representantgrossiste = '../webservices/configmanagement/representantgrossiste/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;
Ext.define('testextjs.view.configmanagement.representantgrossiste.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addrepresentantgrossiste',
    id: 'addrepresentantgrossisteID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Representantgrossiste',
        'testextjs.model.Ville',
        'testextjs.model.Grossiste'
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

        var storegrossiste = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_grossiste,
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
                    title: 'Information Representantgrossiste',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        // str_LIBELLE
                        {
                            name: 'str_NAME',
                            id: 'str_NAME',
                            fieldLabel: 'Nom',
                            emptyText: 'Nom',
                            flex: 1,
                            allowBlank: false
                        },
                        
                        // EMAIL
                        {
                            name: 'str_EMAIL',
                            id: 'str_EMAIL',
                            fieldLabel: 'Email',
                            emptyText: 'Email',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_DESCRIPTION
                        {
                            name: 'str_DESCRIPTION',
                            id: 'str_DESCRIPTION',
                            fieldLabel: 'Description',
                            emptyText: 'Description',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_ADRESSE_RUE_1                       
                        {
                            name: 'str_ADRESSE_RUE_1',
                            id: 'str_ADRESSE_RUE_1',
                            fieldLabel: 'Adresse 1',
                            emptyText: 'Adresse 1',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_ADRESSE_RUE_2
                        {
                            name: 'str_ADRESSE_RUE_2',
                            id: 'str_ADRESSE_RUE_2',
                            fieldLabel: 'Adresse 2',
                            emptyText: 'Adresse 2',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_CODE_POSTAL
                        {
                            name: 'str_CODE_POSTAL',
                            id: 'str_CODE_POSTAL',
                            fieldLabel: 'Code Postal',
                            emptyText: 'Code Postal',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_BUREAU_DISTRIBUTEUR
                        {
                            name: 'str_BUREAU_DISTRIBUTEUR',
                            id: 'str_BUREAU_DISTRIBUTEUR',
                            fieldLabel: 'Bureau distributeur',
                            emptyText: 'Bureau distributeur',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_MOBILE
                        {
                            name: 'str_MOBILE',
                            id: 'str_MOBILE',
                            fieldLabel: 'Mobile',
                            emptyText: 'Mobile',
                            maskRe: /[0-9.]/,
                            flex: 1,
                            allowBlank: false
                        },
                        // str_TELEPHONE
                        {
                            name: 'str_TELEPHONE',
                            id: 'str_TELEPHONE',
                            fieldLabel: 'Telephone',
                            emptyText: 'Telephone',
                            flex: 1,
                            maskRe: /[0-9.]/,
                            allowBlank: false
                        },
                        //COMMENTAIRE
                        {
                            name: 'str_COMMENTAIRE',
                            id: 'str_COMMENTAIRE',
                            fieldLabel: 'Commentaire',
                            emptyText: 'Commentaire',
                            flex: 1,
                            allowBlank: false
                        },
                        // GROSSISTE
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Grossiste',
                            name: 'lg_GROSSISTE_ID',
                            id: 'lg_GROSSISTE_ID',
                            store: storegrossiste,
                            valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un grossiste...'

                        },
                        // lg_VILLE_ID
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Ville',
                            name: 'lg_VILLE_ID',
                            id: 'lg_VILLE_ID',
                            store: storeville,
                            valueField: 'lg_VILLE_ID',
                            displayField: 'STR_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir une ville...'
                        }
                    ]
                }]
        });
        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_REPRESENTANT_GROSSISTE_ID;
            Ext.getCmp('str_NAME').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_ADRESSE_RUE_1').setValue(this.getOdatasource().str_ADRESSE_RUE_1);
            Ext.getCmp('str_ADRESSE_RUE_2').setValue(this.getOdatasource().str_ADRESSE_RUE_2);
            Ext.getCmp('str_CODE_POSTAL').setValue(this.getOdatasource().str_CODE_POSTAL);
            Ext.getCmp('str_BUREAU_DISTRIBUTEUR').setValue(this.getOdatasource().str_BUREAU_DISTRIBUTEUR);
            Ext.getCmp('str_MOBILE').setValue(this.getOdatasource().str_MOBILE);
            Ext.getCmp('str_EMAIL').setValue(this.getOdatasource().str_EMAIL);
            Ext.getCmp('str_TELEPHONE').setValue(this.getOdatasource().str_TELEPHONE);
            Ext.getCmp('str_COMMENTAIRE').setValue(this.getOdatasource().str_COMMENTAIRE);            
            Ext.getCmp('lg_GROSSISTE_ID').setValue(this.getOdatasource().lg_GROSSISTE_ID);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);
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
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });
    },
    onbtnsave: function () {

        var internal_url = "";
        if (Omode === "create") {
            internal_url = url_services_transaction_representantgrossiste + 'create';
        } else {
            internal_url = url_services_transaction_representantgrossiste + 'update&lg_REPRESENTANT_GROSSISTE_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                

                str_NAME: Ext.getCmp('str_NAME').getValue(),
                str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                str_ADRESSE_RUE_1: Ext.getCmp('str_ADRESSE_RUE_1').getValue(), 
                str_ADRESSE_RUE_2: Ext.getCmp('str_ADRESSE_RUE_2').getValue(),
                str_CODE_POSTAL: Ext.getCmp('str_CODE_POSTAL').getValue(),
                str_BUREAU_DISTRIBUTEUR: Ext.getCmp('str_BUREAU_DISTRIBUTEUR').getValue(),
                str_MOBILE: Ext.getCmp('str_MOBILE').getValue(),
                str_TELEPHONE: Ext.getCmp('str_TELEPHONE').getValue(),
                str_EMAIL: Ext.getCmp('str_EMAIL').getValue(),                               
                str_COMMENTAIRE: Ext.getCmp('str_COMMENTAIRE').getValue(),                
                lg_GROSSISTE_ID: Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue()

            },
            success: function (response)
            {
                //alert("succes");
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
                Oview.getStore().reload();
            },
            failure: function (response)
            {
                //alert("echec");
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
        this.up('window').close();
    }
});