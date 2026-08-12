var url_services_data_parameter = '../webservices/sm_user/parameter/ws_data.jsp';
var url_services_transaction_parameter = '../webservices/sm_user/parameter/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;
var KEY_MONTH_PERIME;



Ext.define('testextjs.view.stockmanagement.perime.action.addDatePeromption', {
    extend: 'Ext.window.Window',
    xtype: 'addperime',
    id: 'addperimeID',
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


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information parametre date peromption',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Nombre mois',
                            emptyText: 'Nombre mois',
                            name: 'str_VALUE',
                            id: 'str_VALUE'
                        },
                        {
                            fieldLabel: 'Description',
                            emptyText: 'Description',
                            name: 'str_DESCRIPTION',
                            id: 'str_DESCRIPTION'
                        }
                    ]
                }
            ]
        });

        loadData();

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 400,
            height: 250,
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

        if (Omode === "update") {
            internal_url = url_services_transaction_parameter + 'update';
            Ext.Ajax.request({
                url: internal_url,
                params: {
                    str_KEY: KEY_MONTH_PERIME,
                    str_VALUE: Ext.getCmp('str_VALUE').getValue(),
                    str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue()
                },
                success: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == 0) {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        Ext.MessageBox.alert('Confirmation', object.errors);
                    }


                },
                failure: function (response)
                {

                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);

                }
            });
        }
        this.up('window').close();
    }
});

function loadData() {
    KEY_MONTH_PERIME = "KEY_MONTH_PERIME";
    Ext.Ajax.request({
        url: url_services_data_parameter,
        params: {
            str_KEY: KEY_MONTH_PERIME
        },
        success: function (response)
        {
            var object = Ext.JSON.decode(response.responseText, false);
            if (object.success === 0) {
                Ext.MessageBox.alert('Error Message', object.errors);
                return;
            } else {
                Ext.getCmp('str_VALUE').setValue(object.str_VALUE);
                Ext.getCmp('str_DESCRIPTION').setValue(object.str_DESCRIPTION);
                return;
            }

        },
        failure: function (response)
        {
            var object = Ext.JSON.decode(response.responseText, false);
            console.log("Bug " + response.responseText);
            Ext.MessageBox.alert('Error Message', response.responseText);

        }
    });
}