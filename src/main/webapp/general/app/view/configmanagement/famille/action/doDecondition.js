/* global Ext */

var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;
var lg_FAMILLE_PARENT_ID;
var int_NUMBERDETAIL;
var type;

Ext.define('testextjs.view.configmanagement.famille.action.doDecondition', {
    extend: 'Ext.window.Window',
    xtype: 'doDecondition',
    id: 'doDeconditionID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.view.commandemanagement.bonlivraison.*'
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
        type = this.getType();

        Me = this;
        var itemsPerPage = 20;
        str_DESCRIPTION = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Designation:',
                    name: 'str_DESCRIPTION',
                    id: 'str_DESCRIPTION',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        int_CIP = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'CIP:',
                    name: 'int_CIP',
                    id: 'int_CIP',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        int_QUANTITY = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Quantite final:',
                    name: 'intQUANTITY',
                    id: 'intQUANTITY',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: 0,
                    flex: 0.7,
                    listeners: {
                        afterrender: function (field) { // a decommenter apres les tests
                            var int_NUMBER_AVAILABLE = (Ext.getCmp('int_NUMBER_AVAILABLE').getValue());
                            Me.DisplayQuantity(int_NUMBER_AVAILABLE, int_NUMBERDETAIL);
                        }
                    }

                });

        int_NUMBER = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Stock detail:',
                    name: 'int_NUMBER',
                    id: 'int_NUMBER',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7,
                    listeners: {
                        afterrender: function (field) { // a decommenter apres les tests
                            Ext.getCmp('int_NUMBER_AVAILABLE').focus();
                        }
                    }

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
                    title: 'Information sur l\'article a deconditionner',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        int_CIP,
                        str_DESCRIPTION,
                        {
                            fieldLabel: 'Quantité à deconditionner',
                            emptyText: 'Quantite a deconditionner',
                            name: 'int_NUMBER_AVAILABLE',
                            id: 'int_NUMBER_AVAILABLE',
                            enableKeyEvents: true,
                            value: 1,
                            listeners: {
//                                change: function() {
                                change: function (field) {
//                                    var int_NUMBER_AVAILABLE = (Ext.getCmp('int_NUMBER_AVAILABLE').getValue());
                                    Me.DisplayQuantity(field.getValue(), int_NUMBERDETAIL);
                                }



                            }
                        },
                        int_QUANTITY,
                        int_NUMBER
                    ]
                }
            ]
        });



        //Initialisation des valeur 


        if (Omode === "deconditionarticle") {
            // alert("type " + type);
            lg_FAMILLE_PARENT_ID = this.getOdatasource().lg_FAMILLE_ID;
            ref = this.getOdatasource().lg_FAMILLE_DECONDITION_ID;
            // alert("ref "+ref + " Omode "+Omode);
            int_NUMBERDETAIL = this.getOdatasource().int_NUMBERDETAIL;

//            alert('lg_FAMILLE_PARENT_ID '+lg_FAMILLE_PARENT_ID + " lg_FAMILLE_DECONDITION_ID "+ref);

//            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION_DECONDITION);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('int_NUMBER').setValue(this.getOdatasource().int_NUMBER_AVAILABLE_DECONDITION);
            Ext.getCmp('int_CIP').setValue(this.getOdatasource().int_CIP);


        } else if (Omode === "deconditionarticlevente") {
            var str_name_decontionne = this.getOdatasource();
            Me.findProduit(str_name_decontionne);
        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 300,
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
    DisplayQuantity: function (nombre, qteDetail) {
        //   alert(nombre * qteDetail);
        Ext.getCmp('intQUANTITY').setValue(nombre * qteDetail);
    },
    findProduit: function (str_name) {
        var internal_url = "";

        Ext.Ajax.request({
            url: '../webservices/sm_user/famille/ws_data_custom.jsp',
            params: {
                str_NAME: str_name
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                } else {
                    lg_FAMILLE_PARENT_ID = object.lg_FAMILLE_PARENT_ID;
                    ref = object.lg_FAMILLE_ID;
                    int_NUMBERDETAIL = object.int_NUMBERDETAIL;
                    Ext.getCmp('str_DESCRIPTION').setValue(object.str_DESCRIPTION);
                    Ext.getCmp('int_NUMBER').setValue(object.int_NUMBER);
                    Ext.getCmp('int_CIP').setValue(object.int_CIP);
                }

            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', 'Erreur technique');
            }
        });
    },
    onbtnsave: function (button) {
        const win = button.up('window');

        testextjs.app.getController('App').ShowWaitingProcess();

        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/decondition/deconditionner',
            params: Ext.JSON.encode({
                'produitId': ref,
                'quantity': Ext.getCmp('int_NUMBER_AVAILABLE').getValue()
            }),
            success: function (response, options) {
                testextjs.app.getController('App').StopWaitingProcess();
                 win.close();
                Ext.MessageBox.alert('Message', 'Le produit a été déconditionné');
                if (type === "famillemanager") {
                    Me_Workflow = Oview;
                    Me_Workflow.onRechClick();

                } else if (type === "bonlivraison") {
                    Ext.getCmp('gridpanelID').getStore().reload();

                }

            },
            failure: function (response, options) {
                testextjs.app.getController('App').StopWaitingProcess();
                Ext.Msg.alert("Message", "L'opération a échoué " + response.status);
            }

        });

    }
});
