var url_services_data_medecin = '../webservices/configmanagement/medecin/ws_data.jsp';
var url_services_transaction_medecin = '../webservices/configmanagement/medecin/ws_transaction.jsp?mode=';

var url_services_data_ville = '../webservices/configmanagement/ville/ws_data.jsp';
var url_services_data_specialites = '../webservices/configmanagement/specialite/ws_data.jsp';


var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.medecin.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addmedecin',
    id: 'addmedecinID1',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Specialite'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {

        var itemsPerPage = 20;
        Oview = this.getParentview();


        Omode = this.getMode();

        Me = this;

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

        var storespecialite = new Ext.data.Store({
            model: 'testextjs.model.Specialite',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_specialites,
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
                labelWidth: 140,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Informations Medecin',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        // lg_SPECIALITE_ID
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Specialite',
                            name: 'lg_SPECIALITE_ID',
                            id: 'lg_SPECIALITE_ID',
                            store: storespecialite,
                            valueField: 'lg_SPECIALITE_ID',
                            displayField: 'str_LIBELLESPECIALITE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir une specialite...'

                        },
                        {
                            id: 'str_CODE_INTERNE',
                            name: 'str_CODE_INTERNE',
                            fieldLabel: 'Code interne',
                            emptyText: 'Code interne',
                            allowBlank: false
                        },
                        {
                            id: 'str_FIRST_NAME',
                            name: 'str_FIRST_NAME',
                            fieldLabel: 'Nom',
                            emptyText: 'NOM',
                            allowBlank: false
                        },
                        {
                            id: 'str_LAST_NAME',
                            name: 'str_LAST_NAME',
                            fieldLabel: 'Prenoms',
                            emptyText: 'PRENOMS',
                            allowBlank: false

                        },
                        //str_SEXE
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Genre',
                            name: 'str_SEXE',
                            id: 'str_SEXE',
                            store: ['F', 'M'],
                            valueField: 'str_SEXE',
                            displayField: 'str_SEXE',
                            typeAhead: true,
                            queryMode: 'local',
                            emptyText: 'Choisir un genre...'

                        },
                        {
                            id: 'str_PHONE',
                            name: 'str_PHONE',
                            fieldLabel: 'Telephone',
                            emptyText: 'Telephone',
                            maskRe: /[0-9.]/
                        },
                        //str_MAIL
                        {
                            name: 'str_MAIL',
                            id: 'str_MAIL',
                            fieldLabel: 'E-Mail',
                            emptyText: 'E-Mail'
                        },
                        // str_ADRESSE
                        {
                            name: 'str_ADRESSE',
                            id: 'str_ADRESSE',
                            fieldLabel: 'Adresse',
                            emptyText: 'Adresse'
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
                        },
                        {
                            name: 'str_Commentaire',
                            id: 'str_Commentaire',
                            fieldLabel: 'Commentaire',
                            emptyText: 'Commentaire'
                        }
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_MEDECIN_ID;

// str_CODE_INTERNE

            Ext.getCmp('str_CODE_INTERNE').setValue(this.getOdatasource().str_CODE_INTERNE);
            Ext.getCmp('str_FIRST_NAME').setValue(this.getOdatasource().str_FIRST_NAME);
            Ext.getCmp('str_LAST_NAME').setValue(this.getOdatasource().str_LAST_NAME);
            Ext.getCmp('str_ADRESSE').setValue(this.getOdatasource().str_ADRESSE);
            Ext.getCmp('str_PHONE').setValue(this.getOdatasource().str_PHONE);
            Ext.getCmp('str_MAIL').setValue(this.getOdatasource().str_MAIL);
            Ext.getCmp('str_SEXE').setValue(this.getOdatasource().str_SEXE);
            Ext.getCmp('str_Commentaire').setValue(this.getOdatasource().str_Commentaire);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);
            Ext.getCmp('lg_SPECIALITE_ID').setValue(this.getOdatasource().lg_SPECIALITE_ID);
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
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
    onbtnsave: function () {


        //  alert(Ext.getCmp('str_LAST_NAME').getValue());

        var internal_url = "";


        if (Omode === "create") {
            //alert("create");
            internal_url = url_services_transaction_medecin + 'create';

        } else {
            //alert("update");
            internal_url = url_services_transaction_medecin + 'update&lg_MEDECIN_ID=' + ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                //str_CODE_INTERNE
                str_CODE_INTERNE: Ext.getCmp('str_CODE_INTERNE').getValue(),
                str_FIRST_NAME: Ext.getCmp('str_FIRST_NAME').getValue(),
                str_LAST_NAME: Ext.getCmp('str_LAST_NAME').getValue(),
                str_ADRESSE : Ext.getCmp('str_ADRESSE').getValue(),
                str_PHONE: Ext.getCmp('str_PHONE').getValue(),
                str_MAIL: Ext.getCmp('str_MAIL').getValue(),
                str_SEXE: Ext.getCmp('str_SEXE').getValue(),
                str_Commentaire : Ext.getCmp('str_Commentaire').getValue(),
                lg_VILLE_ID : Ext.getCmp('lg_VILLE_ID').getValue(),
                lg_SPECIALITE_ID : Ext.getCmp('lg_SPECIALITE_ID').getValue()

            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    if (internal_url === url_services_transaction_medecin + 'create') {
                        Ext.MessageBox.alert('Creation Medecin', 'creation effectuee avec succes');

                    } else {
                        Ext.MessageBox.alert('Modification Medecin', 'modification effectuee avec succes');

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

        this.up('window').close();
    }
});


