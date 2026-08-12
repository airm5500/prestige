var url_services_transaction_userphone = '../webservices/sm_user/userphone/ws_transaction.jsp?mode=';
var url_services_data_userphone = '../webservices/sm_user/userphone/ws_data.jsp';

var ref_lg_USER_ID = "";
var ref = "";
var Oview;
Ext.define('testextjs.view.sm_user.user_phone.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'adduserphone',
    id: 'adduserphoneID',
    requires: [
        'Ext.form.*', 
        'Ext.window.Window',
        'testextjs.store.Statut',
        'testextjs.view.sm_user.user.action.*'
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
        ref_lg_USER_ID = this.getOdatasource().lg_USER_ID;
        Me = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.UserPhone',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_userphone,
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
                    title: 'Ajouter Numero',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Telephone',
                            emptyText: 'Telephone',
                            id: 'str_PHONE',
                            name: 'str_PHONE'
                        }/*,
                         {
                         fieldLabel: 'Description',
                         emptyText: 'DESCRIPTION',
                         name: 'str_DESCRIPTION',
                         id:'str_DESCRIPTION'
                         },
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
           
            ref_lg_USER_ID = this.getOdatasource().lg_USER_ID;
            ref = this.getOdatasource().lg_USER_FONE_ID;
            Ext.getCmp('str_PHONE').setValue(this.getOdatasource().str_PHONE);
//             alert(ref_lg_USER_ID + " "+ ref + " "+this.getOdatasource().str_PHONE);
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
            internal_url = url_services_transaction_userphone + 'create';
        } else {
            internal_url = url_services_transaction_userphone + 'update&lg_USER_FONE_ID=' + ref;
        }


//alert(ref_lg_USER_ID);
        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_PHONE: Ext.getCmp('str_PHONE').getValue(),
                lg_USER_ID: ref_lg_USER_ID
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    var Oview = Ext.getCmp('CltgridpanelID');
                    Oview.getStore().reload();
                }
                

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