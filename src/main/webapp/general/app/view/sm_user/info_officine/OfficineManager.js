/* global Ext */

var OFFICINE;
//var intAmount = 0;  f 

var str_PHONE_REF = 0;
var url_services_data_officine = '../webservices/sm_user/info_officine/ws_data.jsp';
var url_services_transaction_officine = '../webservices/sm_user/info_officine/ws_transaction.jsp?mode=';
// REST dedie a cet ecran (memes formats JSON que les JSP, memes regles metier)
var url_rest_data_officine = '../api/v1/officine/infos';
var url_rest_update_officine = '../api/v1/officine/infos/update';
var Me;


Ext.define('testextjs.view.sm_user.info_officine.OfficineManager', {
    extend: 'Ext.form.Panel',
    xtype: 'info_officine',
    id: 'info_officineID',
    frame: true,
//    cls: 'infocine',
    title: 'Informations Officine',
//    closable: true,
    bodyPadding: 5,
    autoScroll: true,
    width: '50%',
    fieldDefaults: {
        labelAlign: 'right',
        labelWidth: 150,
        msgTarget: 'side'
    },
    initComponent: function () {

        Me = this;

        var str_FIRST_NAME = new Ext.form.field.Text(
                {
                    xtype: 'textfield',
                    allowBlank: false,
                    fieldLabel: 'Nom',
                    id: 'str_first_name',
                    name: 'str_FIRST_NAME',
                    emptyText: 'Nom'
                });

        var str_LAST_NAME = new Ext.form.field.Text(
                {
                    xtype: 'textfield',
                    allowBlank: false,
                    fieldLabel: 'Pr&eacute;nom',
                    id: 'str_last_name',
                    name: 'str_LAST_NAME',
                    emptyText: 'Prenom'
                });

        var str_STATUT = new Ext.form.field.Hidden(
                {
                    xtype: 'hiddenfield',
                    allowBlank: false,
                    fieldLabel: 'str_STATUT',
                    name: 'str_STATUT',
                    id: str_STATUT,
                    emptyText: 'str_STATUT'
                });

        var str_PHONE = new Ext.form.field.Text(
                {
                    //allowBlank: false,
                    fieldLabel: 'T&eacute;l&eacute;phone',
                    name: 'str_PHONE',
                    id: 'str_PHONE',
                   /* maskRe: /[0-9.]/,*/
                    emptyText: 'Telephone'
                });

        var str_NOM_ABREGE = new Ext.form.field.Text(
                {
                    xtype: 'textfield',
                    allowBlank: false,
                    fieldLabel: 'Nom abr&eacute;g&eacute;',
                    name: 'str_NOM_ABREGE',
                    id: 'str_nomabrege'

                });

        var str_NOM_COMPLET = new Ext.form.field.Text(
                {
                    xtype: 'textfield',
                    allowBlank: false,
                    fieldLabel: 'Nom ',
                    name: 'str_NOM_COMPLET',
                    id: 'nom_complet'
                });
        var str_ADRESSSE_POSTALE = new Ext.form.field.Text(
                {
                    xtype: 'textfield',
                    allowBlank: false,
                    fieldLabel: 'Adresse postale ',
                    name: 'str_ADRESSSE_POSTALE',
                    id: 'str_adresspostale'


                });


        var store = new Ext.data.Store({
            model: 'testextjs.model.Officine',
            proxy: {
                type: 'ajax',
                url: url_rest_data_officine
            }
        });


        store.load({
            callback: function () {
                OFFICINE = store.getAt(0);
                // Chargement interrompu (timeout, abandon, deconnexion) : ne pas planter l'ecran
                if (!OFFICINE || Me.isDestroyed) {
                    return;
                }
                str_NOM_ABREGE.setValue(OFFICINE.get('str_NOM_ABREGE'));
                str_NOM_COMPLET.setValue(OFFICINE.get('str_NOM_COMPLET'));
                str_FIRST_NAME.setValue(OFFICINE.get('str_FIRST_NAME'));
                str_LAST_NAME.setValue(OFFICINE.get('str_LAST_NAME'));
                str_ADRESSSE_POSTALE.setValue(OFFICINE.get('str_ADRESSSE_POSTALE'));
                str_STATUT.setValue(OFFICINE.get('str_STATUT'));
                str_PHONE.setValue(OFFICINE.get('str_PHONE'));   
                str_NOM_ABREGE.setValue(OFFICINE.get('str_NOM_ABREGE'));
                Ext.getCmp('str_COMMENTAIRE1').setValue(OFFICINE.get('str_COMMENTAIRE1'));
                Ext.getCmp('str_COMMENTAIRE2').setValue(OFFICINE.get('str_COMMENTAIRE2'));
                Ext.getCmp('str_ENTETE').setValue(OFFICINE.get('str_ENTETE'));
                Ext.getCmp('str_NUM_COMPTABLE').setValue(OFFICINE.get('str_NUM_COMPTABLE'));
                Ext.getCmp('str_COMMENTAIREOFFICINE').setValue(OFFICINE.get('str_COMMENTAIREOFFICINE'));
                Ext.getCmp('str_CENTRE_IMPOSITION').setValue(OFFICINE.get('str_CENTRE_IMPOSITION'));
                Ext.getCmp('str_REGISTRE_IMPOSITION').setValue(OFFICINE.get('str_REGISTRE_IMPOSITION'));
                Ext.getCmp('str_REGISTRE_COMMERCE').setValue(OFFICINE.get('str_REGISTRE_COMMERCE'));
                Ext.getCmp('str_COMPTE_CONTRIBUABLE').setValue(OFFICINE.get('str_COMPTE_CONTRIBUABLE'));
                Ext.getCmp('str_COMPTE_BANCAIRE').setValue(OFFICINE.get('str_COMPTE_BANCAIRE'));
                

            }
        });


        this.items = [{
                xtype: 'fieldset',
                title: 'Infos.Pharmacien',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [
                    str_FIRST_NAME,
                    str_LAST_NAME,
                    str_PHONE

                ]
            },
            {
                xtype: 'fieldset',
                title: 'Detail.Infos.Pharmacie',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [
                    str_NOM_ABREGE,
                    str_NOM_COMPLET,
                    str_ADRESSSE_POSTALE,
                    {
                        xtype: 'textfield',
                        fieldLabel: 'Compte Contribuable',
                        name: 'str_COMPTE_CONTRIBUABLE',
                        id: 'str_COMPTE_CONTRIBUABLE',
                        emptyText: 'Compte Contribuable'

                    },
                    {
                        xtype: 'textfield',
                        fieldLabel: 'Code Comptable',
                        name: 'str_NUM_COMPTABLE',
                        maxLength: 10,
                        id: 'str_NUM_COMPTABLE',
                        emptyText: 'Code Comptable'

                    },
                    {
                        xtype: 'textfield',
                        fieldLabel: 'Registre de Commerce',
                        name: 'str_REGISTRE_COMMERCE',
                        id: 'str_REGISTRE_COMMERCE',
                        emptyText: 'Registre de Commerce'

                    },
                    {
                    xtype: 'textfield',
                    allowBlank: true,
                    fieldLabel: 'Compte Bancaire',
                    name: 'str_COMPTE_BANCAIRE',
                    id: 'str_COMPTE_BANCAIRE'

                }
                    
                    
                    , {
                        xtype: 'textfield',
                        fieldLabel: 'Registre d\'Imposition',
                        name: 'str_REGISTRE_IMPOSITION',
                        id: 'str_REGISTRE_IMPOSITION',
                        emptyText: 'Registre d\'Imposition'

                    }, {
                        xtype: 'textfield',
                        fieldLabel: 'Centre d\'Imposition',
                        name: 'str_CENTRE_IMPOSITION',
                        id: 'str_CENTRE_IMPOSITION',
                        emptyText: 'Centre d\'Imposition'

                    }, {
                        xtype: 'textfield',
                        fieldLabel: 'Commentaire',
                        name: 'str_COMMENTAIREOFFICINE',
                        maxLength: 200,
                        id: 'str_COMMENTAIREOFFICINE'

                    },
                    str_STATUT
                ]
            },
            ,
                    {
                        xtype: 'fieldset',
                        title: 'Ent&ecirc;te/Commentaires.Ticket de caisse',
                        defaultType: 'textfield',
                        defaults: {
                            anchor: '100%'
                        },
                        items: [
                            {
                                xtype: 'textfield',
                                fieldLabel: 'Entete',
                                name: 'str_ENTETE',
                                maxLength: 50,
                                id: 'str_ENTETE'

                            },
                            {
                                xtype: 'textfield',
                                fieldLabel: 'Commentaire 1',
                                name: 'str_COMMENTAIRE1',
                                maxLength: 50,
                                id: 'str_COMMENTAIRE1'

                            },
                            {
                                xtype: 'textfield',
                                fieldLabel: 'Commentaire 2',
                                name: 'str_COMMENTAIRE2',
                                maxLength: 50,
                                id: 'str_COMMENTAIRE2'

                            }
                        ]
                    }

        ];

        this.callParent();

    },
    buttons: [
        {
            text: 'Enregistrer',
            id: 'btn_savemyaccountID',
            name: 'btn_savemyaccount',
            disabled: true,
            formBind: true,
            handler: function () {
                Me.onbtnsave();
            }

        }],
    onbtnsave: function () {

        if (!OFFICINE) {
            Ext.MessageBox.alert('Information',
                    "Les informations de l'officine ne sont pas encore chargées. Veuillez rouvrir l'écran.");
            return;
        }
        var lg_OFFICINE_ID = OFFICINE.get('lg_OFFICINE_ID');
        var str_FIRST_NAME = Ext.getCmp('str_first_name').getValue();
        var str_LAST_NAME = Ext.getCmp('str_last_name').getValue();
        var str_ADRESSSE_POSTALE = Ext.getCmp('str_adresspostale').getValue();

        var str_PHONE = Ext.getCmp('str_PHONE').getValue();
        var str_NOM_ABREGE = Ext.getCmp('str_nomabrege').getValue();
        var str_NOM_COMPLET = Ext.getCmp('nom_complet').getValue();
        var str_COMMENTAIRE1 = Ext.getCmp('str_COMMENTAIRE1').getValue();
        var str_COMMENTAIRE2 = Ext.getCmp('str_COMMENTAIRE2').getValue();
        var str_ENTETE = Ext.getCmp('str_ENTETE').getValue();


        var str_COMPTE_CONTRIBUABLE = Ext.getCmp('str_COMPTE_CONTRIBUABLE').getValue();
        var str_REGISTRE_COMMERCE = Ext.getCmp('str_REGISTRE_COMMERCE').getValue();
        var str_REGISTRE_IMPOSITION = Ext.getCmp('str_REGISTRE_IMPOSITION').getValue();
        var str_CENTRE_IMPOSITION = Ext.getCmp('str_CENTRE_IMPOSITION').getValue();
        var str_COMPTE_BANCAIRE = Ext.getCmp('str_COMPTE_BANCAIRE').getValue();

        var str_COMMENTAIREOFFICINE = Ext.getCmp('str_COMMENTAIREOFFICINE').getValue();
        var str_NUM_COMPTABLE = Ext.getCmp('str_NUM_COMPTABLE').getValue();
        internal_url = url_rest_update_officine;

        Ext.Ajax.request({
            url: internal_url,
            method: 'POST',
            params: {
                str_LAST_NAME: str_LAST_NAME,
                str_COMMENTAIREOFFICINE: str_COMMENTAIREOFFICINE,
                str_NUM_COMPTABLE: str_NUM_COMPTABLE,
                str_FIRST_NAME: str_FIRST_NAME,
                str_NOM_ABREGE: str_NOM_ABREGE,
                str_PHONE: str_PHONE,
                str_NOM_COMPLET: str_NOM_COMPLET,
                str_ADRESSSE_POSTALE: str_ADRESSSE_POSTALE,
                lg_OFFICINE_ID: lg_OFFICINE_ID,
                str_COMMENTAIRE1: str_COMMENTAIRE1,
                str_COMMENTAIRE2: str_COMMENTAIRE2,
                str_ENTETE: str_ENTETE,
                str_COMPTE_CONTRIBUABLE: str_COMPTE_CONTRIBUABLE,
                str_REGISTRE_COMMERCE: str_REGISTRE_COMMERCE,
                str_REGISTRE_IMPOSITION: str_REGISTRE_IMPOSITION,
                str_CENTRE_IMPOSITION: str_CENTRE_IMPOSITION,
                str_COMPTE_BANCAIRE:str_COMPTE_BANCAIRE
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
                Ext.MessageBox.alert('Information', object.errors);
                testextjs.app.getController('App').onLoadNewComponent("mainmenumanager", "", "");
                //Oview.getStore().reload();

            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });



    }
});
