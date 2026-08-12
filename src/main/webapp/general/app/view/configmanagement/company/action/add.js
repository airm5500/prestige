/* global Ext */

var Oview;
var Omode;
var Me;
var ref;
var formCompany;
Ext.define('testextjs.view.configmanagement.company.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addCompany',
    id: 'addCompanyID',
    urlCategorieUpdate: '../webservices/configmanagement/comapnies/ws_transaction.jsp?mode=update',
    urlCategorieCreate: '../webservices/configmanagement/comapnies/ws_transaction.jsp?mode=create',
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



        formCompany = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 120,
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

                            id: 'str_RAISONSOCIALE',
                            name: 'str_RAISONSOCIALE',
                            fieldLabel: 'RAISON SOCIALE',
                            emptyText: 'RAISON SOCIALE',

                            allowBlank: false
                        },
                        {

                            id: 'str_PHONE_company',
                            fieldLabel: 'TELEPHONE',
                            name: 'str_PHONE',
                            emptyText: 'TELEPHONE',
                            allowBlank: true
                        },
                        {

                            id: 'str_CEL_company',
                            fieldLabel: 'CELLULAIRE',
                            name: 'str_CEL',
                            emptyText: 'CELLULAIRE',
                            allowBlank: true
                        },
                        {
                            xtype: 'textareafield',
                            name: 'str_ADRESS',
                            id: 'str_ADRESS_company',
                            fieldLabel: 'ADRESSE',
                            emptyText: 'ADRESSE',
                            grow: true,

                            allowBlank: true
                        }

                    ]
                }]
        });
        Ext.getCmp('str_RAISONSOCIALE').focus();
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
            width: 550,
            height: 300,
            minWidth: 500,
            minHeight: 300,
            layout: 'fit',
            plain: true,
            items: formCompany,
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

        var internal_url = "";
        if (Omode === "create") {
            internal_url = Me.urlCategorieCreate;
        } else {
            internal_url = Me.urlCategorieUpdate + '&lg_COMPANY_ID=' + ref;
        }
        if (formCompany && formCompany.isValid()) {
            Ext.Ajax.request({
                url: internal_url,
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