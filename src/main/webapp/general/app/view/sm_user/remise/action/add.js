var url_services_data_typeremise = '../webservices/configmanagement/typeremise/ws_data.jsp';
var url_services_data_remise = '../webservices/sm_user/remise/ws_data.jsp';
var url_services_transaction_remise = '../webservices/sm_user/remise/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.sm_user.remise.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addremise',
    id: 'addremiseID',
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
    initComponent: function() {

        Oview = this.getParentview();


        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Remise',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typeremise,
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
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Information Remise',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Nom',
                            emptyText: 'NAME',
                            name: 'STR_NAME',
                            id: 'STR_NAME'
                        }, {
                            fieldLabel: 'Code',
                            emptyText: 'CODE',
                            id: 'STR_CODE',
                            name: 'STR_CODE'
                        },
                        {
                            fieldLabel: 'TAUX',
                            emptyText: 'INT_TAUX',
                            name: 'INT_TAUX',
                            id: 'INT_TAUX'
                        },
//                        {
//                            fieldLabel: 'Composant',
//                            emptyText: 'COMPOSANT',
//                            name: 'str_COMPOSANT',
//                            id: 'str_COMPOSANT'
//                        },
//                        {
//                            xtype: 'numberfield',
//                            fieldLabel: 'Priorite',
//                            name: 'int_PRIORITY',
//                            id: 'int_PRIORITY',
//                            value: 1,
//                            minValue: 1,
//                            maxValue: 50
//                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type remise',
                            name: 'LG_TYPE_REMISE_ID',
                            id: 'LG_TYPE_REMISE_ID',
                            store: store,
                            valueField: 'LG_TYPE_REMISE_ID',
                            displayField: 'STR_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un type remise...'
                        }/*,{
                         fieldLabel: 'Statut',
                         emptyText: 'Statut',
                         name: 'str_Status',
                         id:'str_Status'
                         }*/]
                }]
        });



        //Initialisation des valeur


        if (Omode == "update") {

            ref = this.getOdatasource().LG_REMISE_ID;

            Ext.getCmp('STR_NAME').setValue(this.getOdatasource().STR_NAME);
            Ext.getCmp('STR_CODE').setValue(this.getOdatasource().STR_CODE);
            Ext.getCmp('INT_TAUX').setValue(this.getOdatasource().INT_TAUX);
            // Ext.getCmp('str_Status').setValue(this.getOdatasource().str_Status);
            //Ext.getCmp('P_KEY').setValue(this.getOdatasource().P_KEY);
            //Ext.getCmp('int_PRIORITY').setValue(this.getOdatasource().int_PRIORITY);
            Ext.getCmp('LG_TYPE_REMISE_ID').setValue(this.getOdatasource().LG_TYPE_REMISE_ID);

        }



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
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function() {
                        win.close()
                    }
                }]
        });

    },
    onbtnsave: function() {
        var internal_url = "";
        if (Omode == "create") {
            internal_url = url_services_transaction_remise + 'create';
        } else {
            internal_url = url_services_transaction_remise + 'update&LG_REMISE_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                LG_TYPE_REMISE_ID: Ext.getCmp('LG_TYPE_REMISE_ID').getValue(),
                STR_NAME: Ext.getCmp('STR_NAME').getValue(),
                STR_CODE: Ext.getCmp('STR_CODE').getValue(),
                INT_TAUX: Ext.getCmp('INT_TAUX').getValue()
                //P_KEY: Ext.getCmp('P_KEY').getValue(),
                //int_PRIORITY: Ext.getCmp('int_PRIORITY').getValue(),
                /* str_Status : Ext.getCmp('str_Status').getValue()*/
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
                Oview.getStore().reload();

            },
            failure: function(response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

        this.up('window').close();
    }
});
