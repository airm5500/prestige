var url_services_transaction_bl_editgrossiste = '../webservices/commandemanagement/order/ws_transaction.jsp?mode=';
var url_services_data_etatarticle = '../webservices/configmanagement/etatarticle/ws_data.jsp';
var url_services_transaction_etatarticle = '../webservices/configmanagement/etatarticle/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;
var Oodatasource;
var idOrder;


Ext.define('testextjs.view.commandemanagement.order.action.editgrossiste', {
    extend: 'Ext.window.Window',
    xtype: 'editgrossisteorder',
    id: 'editgrossisteorderID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Order'
    ],
    config: {
        odatasource: '',
        idOrder: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {

        Oview = this.getParentview();

        Oodatasource = this.getOdatasource();
        idOrder = this.getIdOrder();
        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;

        // str_REF_LIVRAISON, dt_DATE_LIVRAISON

        var str_REF_ORDER_i = new Ext.form.field.Display({
            xtype: 'displayfield',
            fieldLabel: 'Ref.COMMANDE ::',
            labelWidth: 130,
            name: 'str_REF_ORDER',
            id: 'str_REF_ORDER_i',
            fieldStyle: "color:blue;",
            margin: '0 30 0 0',
            value: "0"
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
                    title: 'Modification de prix',
                    defaultType: 'textfield',
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
                                 str_REF_ORDER_i
                            ]
                        },
                        // int_PAF int_PA_REEL
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    fieldLabel: 'PRIX A. TARIF',
                                    name: 'int_PA_REEL',
                                    id: 'int_PA_REEL'
                                },
                                {
                                    fieldLabel: 'PRIX A. FORFAIRE',
                                    name: 'int_PAF',
                                    id: 'int_PAF'
                                }
                            ]
                        }
                    ]
                }]
        });



        //Initialisation des valeur
        OviewItem = Ext.getCmp('gridpanelID');


        if (Omode === "editgrossiste") {

            ref = this.getOdatasource().lg_ORDER_ID;

            Ext.getCmp('str_REF_ORDER_i').setValue(this.getOdatasource().str_REF_ORDER);

        }
        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 700,
            height: 400,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtneditgrossiste
//                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtneditgrossiste: function () {

        Ext.Ajax.request({
            url: url_services_transaction_bl_editgrossiste + 'modifproductprice',
            params: {
                //  , , 
                lg_ORDER_ID: ref

            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {

                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {

                    Ext.MessageBox.alert('MODIFICATION DE PRIX', 'PRIX MODIFIE AVEC SUCCES');

                }

                OviewItem.getStore().reload();

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
