var url_services_data_menu = '../webservices/sm_user/menu/ws_data.jsp';
var url_services_data_sousmenu = '../webservices/sm_user/sous_menu/ws_data.jsp';
var url_services_transaction_sousmenu = '../webservices/sm_user/sous_menu/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.sm_user.sous_menu.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addsousmenu',
    id: 'addsousmenuID',
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
            model: 'testextjs.model.Menu',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_menu,
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
                    title: 'Information Sous-Menu',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Valeur',
                            emptyText: 'VALUE',
                            name: 'str_VALUE',
                            id: 'str_VALUE'
                        }, {
                            fieldLabel: 'Description',
                            emptyText: 'DESCRIPTION',
                            id: 'str_DESCRIPTION',
                            name: 'str_DESCRIPTION'
                        },
                        {
                            fieldLabel: 'Key',
                            emptyText: 'KEY',
                            hidden: true,
                            name: 'P_Key',
                            id: 'P_Key'
                        },
                        {
                            fieldLabel: 'Composant',
                            emptyText: 'COMPOSANT',
                            name: 'str_COMPOSANT',
                            hidden: true,
                            id: 'str_COMPOSANT'
                        },
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
                            fieldLabel: 'Menu',
                            name: 'lg_MENU_ID',
                            id: 'lg_MENU_ID',
                            store: store,
                            valueField: 'lg_MENU_ID',
                            displayField: 'str_DESCRIPTION',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un menu...'
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

            ref = this.getOdatasource().lg_SOUS_MENU_ID;

            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_VALUE').setValue(this.getOdatasource().str_VALUE);
            Ext.getCmp('str_COMPOSANT').setValue(this.getOdatasource().str_COMPOSANT);
            // Ext.getCmp('str_Status').setValue(this.getOdatasource().str_Status);
            Ext.getCmp('P_Key').setValue(this.getOdatasource().P_Key);
            Ext.getCmp('int_PRIORITY').setValue(this.getOdatasource().int_PRIORITY);
            Ext.getCmp('lg_MENU_ID').setValue(this.getOdatasource().lg_MENU_ID);

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
            internal_url = url_services_transaction_sousmenu + 'create';
        } else {
            internal_url = url_services_transaction_sousmenu + 'update&lg_SOUS_MENU_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                lg_MENU_ID: Ext.getCmp('lg_MENU_ID').getValue(),
                str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                str_VALUE: Ext.getCmp('str_VALUE').getValue(),
                str_COMPOSANT: Ext.getCmp('str_COMPOSANT').getValue(),
                P_Key: Ext.getCmp('P_Key').getValue(),
                int_PRIORITY: Ext.getCmp('int_PRIORITY').getValue()/*,
                 str_Status : Ext.getCmp('str_Status').getValue()*/
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
