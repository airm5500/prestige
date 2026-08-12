var url_services_data_compteclient = '../webservices/configmanagement/compteclient/ws_data.jsp';
var url_services_data_client = '../webservices/configmanagement/client/ws_data.jsp';
var url_services_transaction_compteclient = '../webservices/configmanagement/compteclient/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.compteclient.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addcompteclient',
    id: 'addcompteclientID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Client',
        'testextjs.model.CompteClient'
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
        var storeclient = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_client,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 160,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Information Compte client',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code compte client',
                            emptyText: 'Code compte client',
                            name: 'str_CODE_COMPTE_CLIENT',
                            id: 'str_CODE_COMPTE_CLIENT'
                        }, {
                            fieldLabel: 'Quota conso mensuelle',
                            emptyText: 'Quota conso mensuelle',
                            name: 'dbl_QUOTA_CONSO_MENSUELLE',
                            id: 'dbl_QUOTA_CONSO_MENSUELLE'
                        },
                        {
                            fieldLabel: 'Caution',
                            emptyText: 'Caution',
                            name: 'dbl_CAUTION',
                            id: 'dbl_CAUTION'
                        },{
                            xtype: 'combobox',
                            fieldLabel: 'Client',
                            name: 'lg_CLIENT_ID',
                            id: 'lg_CLIENT_ID',
                            store: storeclient,
                            valueField: 'lg_CLIENT_ID',
                            displayField: 'str_CODE_INTERNE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un client...'
                        }
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode == "update") {

            ref = this.getOdatasource().lg_COMPTE_CLIENT_ID;

            Ext.getCmp('str_CODE_COMPTE_CLIENT').setValue(this.getOdatasource().str_CODE_COMPTE_CLIENT);
            Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').setValue(this.getOdatasource().dbl_QUOTA_CONSO_MENSUELLE);
            Ext.getCmp('dbl_CAUTION').setValue(this.getOdatasource().dbl_CAUTION);
            
            Ext.getCmp('lg_CLIENT_ID').setValue(this.getOdatasource().lg_CLIENT_ID);

        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 400,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Retour',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function () {


        //alert(Ext.getCmp('str_NAME').getValue());

        var internal_url = "";


        if (Omode == "create") {
            //alert("create");
            internal_url = url_services_transaction_compteclient + 'create';

        } else {
            //alert("update");
            internal_url = url_services_transaction_compteclient + 'update&lg_COMPTE_CLIENT_ID=' + ref;
        }

        //alert(internal_url);

        Ext.Ajax.request({
            url: internal_url,
            params: {
                //lg_COMPTE_CLIENT_ID: Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue(),
                str_CODE_COMPTE_CLIENT : Ext.getCmp('str_CODE_COMPTE_CLIENT').getValue(),
                dbl_QUOTA_CONSO_MENSUELLE: Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE').getValue(),
                dbl_CAUTION: Ext.getCmp('dbl_CAUTION').getValue(),
                
                lg_CLIENT_ID : Ext.getCmp('lg_CLIENT_ID').getValue()


            },
            success: function (response)
            {
                //alert("succes");
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
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

        this.up('window').close();
    }
});