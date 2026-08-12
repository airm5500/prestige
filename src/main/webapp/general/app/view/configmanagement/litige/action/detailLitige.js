var url_services_transaction_litige = '../webservices/configmanagement/litige/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref_litige;
var ref;


Ext.define('testextjs.view.configmanagement.litige.action.detailLitige', {
    extend: 'Ext.window.Window',
    xtype: 'detail_litige',
    id: 'detail_litigeID',
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
        var itemsPerPage = 20;


        str_REF = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Reference:',
                    name: 'str_REF',
                    id: 'str_REF',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        str_FULLNAME = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Nom organisme:',
                    name: 'str_FULLNAME',
                    id: 'str_FULLNAME',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        str_TYPELITIGE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Type litige:',
                    name: 'str_TYPELITIGE',
                    id: 'str_TYPELITIGE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });



        str_FIRST_LAST_NAME = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Nom & Prenom(s) client:',
                    name: 'str_FIRST_LAST_NAME',
                    id: 'str_FIRST_LAST_NAME',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 1

                });

        dt_CREATED = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Date prise en compte:',
                    name: 'dt_CREATED',
                    id: 'dt_CREATED',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 1

                });

        str_DESCRIPTION = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Commentaire:',
                    name: 'str_DESCRIPTION',
                    id: 'str_DESCRIPTION',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 1

                });

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 135,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information sur le litige',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        str_REF,
                        str_FULLNAME,
                        str_FIRST_LAST_NAME,
                        str_DESCRIPTION,
                        dt_CREATED,
                        str_TYPELITIGE,
                        {
                            fieldLabel: 'Montant a regler',
                            emptyText: 'Montant a regler',
                            name: 'int_AMOUNT',
                            id: 'int_AMOUNT'
                        }
                    ]
                }
            ]
        });



        //Initialisation des valeur 


        if (Omode === "detail") {
            ref = this.getOdatasource().lg_LITIGE_ID;
            ref_litige = this.getOdatasource().str_REF;
            Ext.getCmp('str_REF').setValue(this.getOdatasource().str_REF);
            Ext.getCmp('str_FULLNAME').setValue(this.getOdatasource().str_ORGANISME);
            Ext.getCmp('str_TYPELITIGE').setValue(this.getOdatasource().lg_TYPELITIGE_ID);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_FIRST_LAST_NAME').setValue(this.getOdatasource().str_FIRST_LAST_NAME);
            Ext.getCmp('dt_CREATED').setValue(this.getOdatasource().dt_CREATED);
            Ext.getCmp('int_AMOUNT').setValue(this.getOdatasource().int_AMOUNT);
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 600,
            height: 450,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Cloturer sans remboursement',
                    handler: this.onbtnsavewithout
                }, {
                    text: 'Cloturer avec remboursement',
                    handler: this.onbtnsavewith
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtnsavewith: function () { //cloturer avec approbation de reglement

        var internal_url = "";

        if (Omode === "detail") {
            internal_url = url_services_transaction_litige + 'closurewithremboursement';
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_REF: ref_litige,
                int_AMOUNT: Ext.getCmp('int_AMOUNT').getValue()
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    Oview.getStore().reload();
                }
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

        this.up('window').close();
    },
    onbtnsavewithout: function () { //cloturer avec approbation de reglement

        var internal_url = "";

        if (Omode === "detail") {
            internal_url = url_services_transaction_litige + 'closurewithoutremboursement';
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_REF: ref_litige
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    Oview.getStore().reload();
                }
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
