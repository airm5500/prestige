var url_services_data_regimecaisse = '../webservices/configmanagement/regimecaisse/ws_data.jsp';
var url_services_transaction_regimecaisse = '../webservices/configmanagement/regimecaisse/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.regimecaisse.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addregimecaisse',
    id: 'addregimecaisseID',
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
//        var store = new Ext.data.Store({
//            model: 'testextjs.model.Role',
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_role
//            }
//        });
//        var storeskin = new Ext.data.Store({
//            model: 'testextjs.model.Skin',
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_skin
//            }
//        });
//        var storelanguage = new Ext.data.Store({
//            model: 'testextjs.model.Language',
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_language
//            }
//        });


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
                    title: 'Informations Regime Caisse',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code regime caisse',
                            emptyText: 'Code regime caisse',
                            name: 'str_CODEREGIMECAISSE',
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            id: 'str_CODEREGIMECAISSE'
                        },
                        {
                            fieldLabel: 'Libelle',
                            emptyText: 'Libelle',
                            name: 'str_LIBELLEREGIMECAISSE',
                            allowBlank: false,
                            id: 'str_LIBELLEREGIMECAISSE'
                        }, {
                            xtype: 'checkbox',
                            fieldLabel: 'Controle matricule',
                            emptyText: 'Controle matricule',
                            name: 'bool_CONTROLEMATRICULE',
                            id: 'bool_CONTROLEMATRICULE'
                        }
                      
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_REGIMECAISSE_ID;

            // Ext.getCmp('FUNCTION').setValue(this.getOdatasource().FUNCTION);
            Ext.getCmp('str_CODEREGIMECAISSE').setValue(this.getOdatasource().str_CODEREGIMECAISSE);
            // Ext.getCmp('str_STATUT').setValue(this.getOdatasource().str_STATUT);
            Ext.getCmp('str_LIBELLEREGIMECAISSE').setValue(this.getOdatasource().str_LIBELLEREGIMECAISSE);
            Ext.getCmp('bool_CONTROLEMATRICULE').setValue(this.getOdatasource().bool_CONTROLEMATRICULE);

            //   Ext.getCmp('str_LAST_CONNECTION_DATE').setValue(this.getOdatasource().str_LAST_CONNECTION_DATE);



        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 200,
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
            internal_url = url_services_transaction_regimecaisse + 'create';

        } else {
            //alert("update");
            internal_url = url_services_transaction_regimecaisse + 'update&lg_REGIMECAISSE_ID=' + ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                //lg_GROUPEFAMILLE_ID: Ext.getCmp('lg_GROUPEFAMILLE_ID').getValue(),
                //  FUNCTION : Ext.getCmp('FUNCTION').getValue(),
                str_CODEREGIMECAISSE: Ext.getCmp('str_CODEREGIMECAISSE').getValue(),
                //str_STATUT : Ext.getCmp('str_STATUT').getValue(),
                str_LIBELLEREGIMECAISSE: Ext.getCmp('str_LIBELLEREGIMECAISSE').getValue(),
                bool_CONTROLEMATRICULE : Ext.getCmp('bool_CONTROLEMATRICULE').getValue()
                //lg_SKIN_ID : Ext.getCmp('lg_SKIN_ID').getValue(),
                //lg_Language_ID : Ext.getCmp('lg_Language_ID').getValue()
                //  str_LAST_CONNECTION_DATE : Ext.getCmp('str_LAST_CONNECTION_DATE').getValue()


            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }else {
                    if(internal_url === url_services_transaction_regimecaisse + 'create'){
                        Ext.MessageBox.alert('Creation regime Caisse', 'creation effectuee avec succes');
                        
                    }else{
                        Ext.MessageBox.alert('Modification regime Caisse', 'modification effectuee avec succes');
                       
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