/* global Ext */

var Oview;
var Omode;
var Me;
var ref;
var formCompanyClient;
Ext.define('testextjs.view.configmanagement.client.action.managerCompany', {
    extend: 'Ext.window.Window',

//    urlCategorieUpdate: '../webservices/configmanagement/comapnies/ws_transaction.jsp?mode=update',
    urlAssign: '../webservices/configmanagement/comapnies/ws_transaction.jsp?mode=assignCompanyToClient',
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
        formCompanyClient = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 100,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Sociétés',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combo',
                            emptyText: 'Sélectionner un utilisateur',
                            flex: 1.5,
                            id: 'str_RAISONSOCIALECLB',
                            name: 'str_RAISONSOCIALE',
                            valueField: 'lg_COMPANY_ID',
                            displayField: 'str_RAISONSOCIALE',
                            pageSize: 10,
                            store: Ext.create("Ext.data.Store", {
                                fields: [
                                    {
                                        name: 'lg_COMPANY_ID',
                                        type: 'string'
                                    },
                                    {
                                        name: 'str_RAISONSOCIALE',
                                        type: 'string'
                                    }


                                ],
                                pageSize: 10,
                                // autoLoad: true,
                                proxy: {
                                    type: 'ajax',
                                    url: '../webservices/configmanagement/comapnies/ws_data.jsp',
                                    reader: {
                                        type: 'json',
                                        root: 'data',
                                        totalProperty: 'total'
                                    }
                                }
                            }),
                            listeners: {
                                select: function (cmp) {


                                }
                            }

                        },
                        {
                            xtype: 'combo',
                            emptyText: 'Sélectionner un utilisateur',
                            flex: 1.5,
                            id: 'str_RAISONSOCIALECLB',
                            name: 'str_RAISONSOCIALE',
                            valueField: 'lg_COMPANY_ID',
                            displayField: 'str_RAISONSOCIALE',
                            pageSize: 10,
                            store: Ext.create("Ext.data.Store", {
                                fields: [
                                    {
                                        name: 'lg_COMPANY_ID',
                                        type: 'string'
                                    },
                                    {
                                        name: 'str_RAISONSOCIALE',
                                        type: 'string'
                                    }


                                ],
                                pageSize: 10,
                                // autoLoad: true,
                                proxy: {
                                    type: 'ajax',
                                    url: '../webservices/configmanagement/comapnies/ws_data.jsp',
                                    reader: {
                                        type: 'json',
                                        root: 'data',
                                        totalProperty: 'total'
                                    }
                                }
                            }),
                            listeners: {
                                select: function (cmp) {


                                }
                            }

                        },
                        {

                            id: '_company',
                            fieldLabel: 'TELEPHONE',
                            name: 'str_PHONE',
                            emptyText: 'TELEPHONE',
                            allowBlank: true
                        },
                    ]
                }]
        });

        if (Omode === "update") {

            ref = this.getOdatasource().lg_COMPANY_ID;
            Ext.getCmp('str_RAISONSOCIALE').setValue(this.getOdatasource().str_RAISONSOCIALE);
            Ext.getCmp('str_ADRESS_company').setValue(this.getOdatasource().str_ADRESS);
            Ext.getCmp('str_PHONE_company').setValue(this.getOdatasource().str_PHONE);
            Ext.getCmp('str_CEL_company').setValue(this.getOdatasource().str_CEL);
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 300,
            minWidth: 250,
            minHeight: 300,
            layout: 'fit',
            plain: true,
            items: formCompanyClient,
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


        if (formCompanyClient && formCompanyClient.isValid()) {
            Ext.Ajax.request({
                url: Me.urlAssign,
                params: {
                    str_RAISONSOCIALE: Ext.getCmp('str_RAISONSOCIALE').getValue(),
                    str_ADRESS: Ext.getCmp('str_ADRESS_company').getValue(),
                    str_CEL: Ext.getCmp('str_CEL_company').getValue(),
                    str_PHONE: Ext.getCmp('str_PHONE_company').getValue()



                },
                success: function (response)
                {
                    button.up('window').close();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success === 0) {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {

                        Ext.MessageBox.alert('Information', 'Enregistrement effectue ');


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
        }



    }
});