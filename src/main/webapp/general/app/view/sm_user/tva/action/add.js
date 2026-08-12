var url_services_data_tva = '../webservices/sm_user/tva/ws_data.jsp';
var url_services_transaction_tva= '../webservices/sm_user/tva/ws_transaction.jsp?mode=';
var ref_lg_USER_ID = "";

Ext.define('testextjs.view.sm_user.tva.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addtva',
    id: 'addtvaID',
    requires: [
    'Ext.form.*',
    'Ext.window.Window',
    'testextjs.store.Statut'
    ],
    config: {
        odatasource: '',
        odatasourceinternal: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function() {

        Oview = this.getParentview();


        Omode = this.getMode();
        ref_lg_USER_ID = this.getOdatasource().str_KEY;
        Me = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Parameter',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_transaction_tva,
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
                title: '',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [{
                    fieldLabel: 'Valeur',
                    emptyText: 'str_VALUE',
                    id: 'str_VALUE',
                    name: 'str_VALUE'
                }/*,
                {
                    fieldLabel: 'Description',
                    emptyText: 'DESCRIPTION',
                    name: 'str_DESCRIPTION',
                    id:'str_DESCRIPTION'
                }/*,
                         {
                         fieldLabel: 'Prix',
                         emptyText: 'PRICE',
                         name: 'int_PRICE',
                         id:'int_PRICE'
                         },
                         {
                         fieldLabel: 'Stock Minimal',
                         emptyText: 'STOCK_MINIMAL',
                         name: 'int_STOCK_MINIMAL',
                         id:'int_STOCK_MINIMAL'
                         }*/

                ]
            }]
        });



        //Initialisation des valeur


        if (Omode == "update") {
            ref_lg_USER_ID = this.getOdatasource().str_KEY;
            // ref = this.getOdatasourceinternal().lg_USER_FONE_ID;
            Ext.getCmp('str_VALUE').setValue(this.getOdatasource().str_VALUE);
         //   Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 200,
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
            internal_url = url_services_transaction_tva + 'create';
        } else {
            internal_url = url_services_transaction_tva + 'update&str_KEY=' + ref;
        }


        //alert(ref_lg_USER_ID);
        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_VALUE: Ext.getCmp('str_VALUE').getValue(),
              //  str_DESCRIPTION : Ext.getCmp('str_DESCRIPTION').getValue(),
                str_KEY: ref_lg_USER_ID/*
                 int_STOCK_MINIMAL : Ext.getCmp('int_STOCK_MINIMAL').getValue()*/


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