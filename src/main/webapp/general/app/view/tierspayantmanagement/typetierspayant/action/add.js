var url_services_data_typetierspayant = '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp';
var url_services_transaction_typetierspayant= '../webservices/tierspayantmanagement/typetierspayant/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.tierspayantmanagement.typetierspayant.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addtypetierspayant',
    id: 'addtypetierspayantID',
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
                    title: 'Information Type tiers payant',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        
                        {
                            fieldLabel: 'Libelle',
                            emptyText: 'Libelle',
                            name: 'str_LIBELLE_TYPE_TIERS_PAYANT',
                            id: 'str_LIBELLE_TYPE_TIERS_PAYANT'
                        },
                        {
                            fieldLabel: 'Description',
                            emptyText: 'Description',
                            name: 'str_CODE_TYPE_TIERS_PAYANT',
                            id: 'str_CODE_TYPE_TIERS_PAYANT'
                        }
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_TYPE_TIERS_PAYANT_ID;

            Ext.getCmp('str_LIBELLE_TYPE_TIERS_PAYANT').setValue(this.getOdatasource().str_LIBELLE_TYPE_TIERS_PAYANT);
            Ext.getCmp('str_CODE_TYPE_TIERS_PAYANT').setValue(this.getOdatasource().str_CODE_TYPE_TIERS_PAYANT);

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


        var internal_url = "";


        if (Omode === "create") {
            //alert("create");
            internal_url = url_services_transaction_typetierspayant + 'create';

        } else {
            //alert("update");
            internal_url = url_services_transaction_typetierspayant + 'update&lg_TYPE_TIERS_PAYANT_ID=' + ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_LIBELLE_TYPE_TIERS_PAYANT: Ext.getCmp('str_LIBELLE_TYPE_TIERS_PAYANT').getValue(),
                str_CODE_TYPE_TIERS_PAYANT : Ext.getCmp('str_CODE_TYPE_TIERS_PAYANT').getValue()
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
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