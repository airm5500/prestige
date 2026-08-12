var url_services_data_module = '../webservices/sm_user/module/ws_data.jsp';
var url_services_data_menu = '../webservices/sm_user/menu/ws_data.jsp';
var url_services_transaction_menu = '../webservices/sm_user/menu/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.sm_user.menu.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addmenu',
    id: 'addmenuID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut'
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
        var store = new Ext.data.Store({
            model: 'testextjs.model.Module',
            proxy: {
                type: 'ajax',
                url: url_services_data_module
            }
        });

        /*
         var storeStatut = new Ext.data.Store({
         model: 'testextjs.model.Statut',
         proxy: {
         type: 'ajax',
         url: url_services_data_module
         }
         });*/


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
                    title: 'Information Menu',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Description',
                            emptyText: 'DESCRIPTION',
                            id: 'str_DESCRIPTION',
                            name: 'str_DESCRIPTION'
                        },
                        {
                            fieldLabel: 'Valeur',
                            emptyText: 'VALUE',
                            name: 'str_VALUE',
                            id: 'str_VALUE'
                        },
                        {
                            fieldLabel: 'Key',
                            emptyText: 'KEY',
                            name: 'P_KEY',
                            hidden: true,
                            id: 'P_KEY'
                        }/*,
                         {
                         fieldLabel: 'Statut',
                         emptyText: 'str_STATUT',
                         name: 'str_Status',
                         id:'str_Status'
                         }*/


                        /*,
                         
                         
                         {
                         xtype: 'combobox',
                         fieldLabel: 'STATUT',
                         name: 'str_STATUT',
                         id: 'str_STATUT',
                         store: new testextjs.store.Statut({}),
                         valueField: 'str_KEY',
                         displayField: 'str_VALUE',
                         typeAhead: true,
                         queryMode: 'local',
                         emptyText: 'Choisir un statut...'
                         }*/,
                        {
                            xtype: 'numberfield',
                            fieldLabel: 'Priorite',
                            name: 'int_PRIORITY',
                            id: 'int_PRIORITY',
                            value: 1,
                            minValue: 1,
                            maxValue: 50
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Module',
                            name: 'lg_MODULE_ID',
                            id: 'lg_MODULE_ID',
                            store: store,
                            valueField: 'lg_MODULE_ID',
                            displayField: 'str_DESCRIPTION',
                            typeAhead: true,
                            hidden: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un module...'
                        }]
                }]
        });



        //Initialisation des valeur


        if (Omode == "update") {

            ref = this.getOdatasource().lg_MENU_ID;
            Ext.getCmp('lg_MODULE_ID').setValue(this.getOdatasource().lg_MODULE_ID);
            Ext.getCmp('int_PRIORITY').setValue(this.getOdatasource().int_PRIORITY);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_VALUE').setValue(this.getOdatasource().str_VALUE);
            Ext.getCmp('P_KEY').setValue(this.getOdatasource().P_KEY);
            // Ext.getCmp('str_Status').setValue(this.getOdatasource().str_Status);
            Ext.getCmp('int_PRIORITY').setValue(this.getOdatasource().int_PRIORITY);



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
                    handler: function() {
                        win.close()
                    }
                }]
        });

    },
    onbtnsave: function() {


        var internal_url = "";


        if (Omode == "create") {
            internal_url = url_services_transaction_menu + 'create';
        } else {
            internal_url = url_services_transaction_menu + 'update&lg_MENU_ID=' + ref;
        }

        //  alert(Ext.getCmp('P_KEY').getValue());

        Ext.Ajax.request({
            url: internal_url,
            params: {
                lg_MODULE_ID: Ext.getCmp('lg_MODULE_ID').getValue(),
                str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                str_VALUE: Ext.getCmp('str_VALUE').getValue(),
                P_KEY: Ext.getCmp('P_KEY').getValue(),
                //  str_Status : Ext.getCmp('str_Status').getValue(),
                int_PRIORITY: Ext.getCmp('int_PRIORITY').getValue()

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