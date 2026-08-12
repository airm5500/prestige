/* global Ext */

var url_services_transaction_order_add = '../webservices/commandemanagement/order/ws_transaction.jsp?mode=';
var url_services_data_etatarticle = '../webservices/configmanagement/etatarticle/ws_data.jsp';
var url_services_transaction_etatarticle = '../webservices/configmanagement/etatarticle/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;
var montantachat;

Ext.define('testextjs.view.commandemanagement.cmde_passees.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addbonlivraisonOreder',
    id: 'addbonlivraisonOrederID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'
    ],
    config: {
        odatasource: '',
        idOrder: '',
        montantachat: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
        montantachat = this.getMontantachat();

        Omode = this.getMode();
        var Oodatasource = this.getOdatasource(), idOrder = (Omode == "create" ? this.getIdOrder() : Oodatasource.str_ORDER_REF);
        //alert("idOrder 2  " + idOrder);
        Me = this;




        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Saisie du bon de livraison',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'ID Commande',
                            name: 'lg_ORDER_ID',
                            id: 'lg_ORDER_ID',
                            disabled: true,
                            value: idOrder,
                            hidden: true
                        },
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'REF CMD:',
                            name: 'str_REF_',
                            id: 'str_REF_',
                            fieldStyle: "color:blue;",
                            value: "0"
                        },
                        {
                            fieldLabel: 'NUMERO BL:',
                            emptyText: 'NUMERO BL',
                            name: 'str_REF_LIVRAISON',
                            allowBlank: false,
                            id: 'str_REF_LIVRAISON'
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Date BL',
                            name: 'dt_DATE_LIVRAISON',
                            id: 'dt_DATE_LIVRAISON',
                            submitFormat: 'Y-m-d',
                            allowBlank: false,
                            maxValue: new Date(),
                            value: new Date()

                        },
                        {
                            fieldLabel: 'Montant Hors Taxe',
                            emptyText: 'Montant Hors Taxe',
                            name: 'int_MHT',
                            allowBlank: false,
                            id: 'int_MHT',
                            maskRe: /[0-9.]/,
                            minValue: 0
                        },
                        {
                            fieldLabel: 'Montant TVA',
                            emptyText: 'Montant TVA',
                            name: 'int_TVA',
                            allowBlank: false,
                            id: 'int_TVA',
                            maskRe: /[0-9.]/,
                            minValue: 0
                        }
                    ]
                }]
        });


        if (Omode == "create") {
            Ext.getCmp('str_REF_').setValue(this.getOdatasource());
        } else {
            Ext.getCmp('str_REF_').setValue(Oodatasource.str_ORDER_REF);
            Ext.getCmp('str_REF_LIVRAISON').setValue(Oodatasource.str_BL_REF);
            Ext.getCmp('dt_DATE_LIVRAISON').setValue(Oodatasource.dt_DATE_LIVRAISON);
            Ext.getCmp('int_MHT').setValue(Oodatasource.int_ORDER_PRICE);
            Ext.getCmp('int_TVA').setValue(Oodatasource.int_TVA);
        }


        //Initialisation des valeur

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 320,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtncreerbl
//                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },

    onbtncreerbl: function (button) {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!
        var yyyy = today.getFullYear();

        if (dd < 10) {
            dd = '0' + dd;
        }

        if (mm < 10) {
            mm = '0' + mm;
        }
        today = yyyy + '/' + mm + '/' + dd;
        var url_transaction = url_services_transaction_order_add + (Omode == "create" ? 'createBL' : 'updateBL');
        var int_TVA = 0;
        var str_REF_LIVRAISON = Ext.getCmp('str_REF_LIVRAISON').getValue();
        var dt_DATE_LIVRAISON = Ext.getCmp('dt_DATE_LIVRAISON').getSubmitValue();
        var int_MHT = Ext.getCmp('int_MHT').getValue();
        if (Ext.getCmp('int_TVA').getValue() != null) {
            int_TVA = Ext.getCmp('int_TVA').getValue();
        }

        //var int_HTTC = Ext.getCmp('int_HTTC').getValue();

        //  alert("str_REF_LIVRAISON "+str_REF_LIVRAISON);
        if (str_REF_LIVRAISON === "" || dt_DATE_LIVRAISON === "" || int_MHT === "" || int_TVA === "") {
            Ext.MessageBox.alert('VALIDATION', 'Veuillez renseigner les champs vides svp!');
            return;
        }


        if (Omode == "create") {
            if (int_MHT != montantachat) {
                Ext.MessageBox.confirm('Attention!',
                        'Le prix d\'achat du bon de livraision est different du prix d\'achat machine. Voulez-vous continuer',
                        function (btn) {
                            if (btn == 'yes') {
                                Me.doCreateBL(button, url_transaction, Ext.getCmp('lg_ORDER_ID').getValue(), str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA);
                            }
                        });

            } else {
                Me.doCreateBL(button, url_transaction, Ext.getCmp('lg_ORDER_ID').getValue(), str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA);
            }
        } else {
            Me.doCreateBL(button, url_transaction, Ext.getCmp('lg_ORDER_ID').getValue(), str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA);
        }


    },
    doCreateBL: function (button, Ovalue_add_url, Ofirstvalue_param, Osecondvalue_param, Othirdvalue_param, Ofourthvalue_param, Ofifthvalue_param) {

        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            timeout: 240000,
//            url: Ovalue_add_url,
            url: '../api/v1/commande/creerbl',
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            params: Ext.JSON.encode({
                refParent: Ofirstvalue_param,
                ref: Osecondvalue_param,
                dtStart: Othirdvalue_param,
                value: Ofourthvalue_param,
                valueTwo: Ofifthvalue_param

            }),
            success: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                const result = Ext.JSON.decode(response.responseText, true);

                Ext.MessageBox.alert('confirmation', result.msg);
                button.up('window').close();

                testextjs.app.getController('App').onLoadNewComponentWithDataSource("bonlivraisonmanager", "", "", "");

            },
            failure: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
    }
});