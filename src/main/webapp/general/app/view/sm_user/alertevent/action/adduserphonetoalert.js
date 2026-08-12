var url_services_data_categorieayantdroit = '../webservices/configmanagement/categorieayantdroit/ws_data.jsp';
var url_services_transaction_categorieayantdroit = '../webservices/configmanagement/categorieayantdroit/ws_transaction.jsp?mode=';

Ext.define('testextjs.view.sm_user.alertevent.action.adduserphonetoalert', {
    extend: 'Ext.window.Window',
    xtype: 'adduserphonetoalert',
    id: 'adduserphonetoalertID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.CategorieAyantdroit'
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
        //var url_services_data_menu = '../webservices/sm_user/menu/ws_data.jsp';
        var url_services_data_userphone_single = '../webservices/sm_user/userphone/ws_data.jsp?lg_USER_ID=ALL';
        var store = new Ext.data.Store({
            model: 'testextjs.model.UserPhone',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_userphone_single,
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
                    title: 'Information Categorie Ayant Droit',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        // str_CODE
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Menu',
                            name: 'lg_USER_FONE_ID',
                            id: 'lg_USER_FONE_ID',
                            store: store,
                            valueField: 'lg_USER_FONE_ID',
                            displayField: 'lg_USER_ID',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un menu...'
                        }
                    ]
                }]
        });
        //Initialisation des valeur

        ref = this.getOdatasource().str_Event;
       // alert(ref);
        if (Omode === "update") {

            ref = this.getOdatasource().str_Event;
          //  Ext.getCmp('str_CODE').setValue(this.getOdatasource().str_CODE);
           // Ext.getCmp('str_LIBELLE_CATEGORIE_AYANTDROIT').setValue(this.getOdatasource().str_LIBELLE_CATEGORIE_AYANTDROIT);
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 100,
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
        var url_services_transaction_userphone = '../webservices/sm_user/userphonealertevent/ws_transaction.jsp?mode=';
        var internal_url = "";
        if (Omode === "create") {
            internal_url = url_services_transaction_userphone + 'create';
        } else {
           // internal_url = url_services_transaction_categorieayantdroit + 'update&lg_CATEGORIE_AYANTDROIT_ID=' + ref;
             internal_url = url_services_transaction_userphone + 'create';
        
        }

//alert(Ext.getCmp('lg_USER_FONE_ID').getValue());
//alert(internal_url);

        Ext.Ajax.request({
            url: internal_url,
            params: {
                lg_USER_FONE_ID: Ext.getCmp('lg_USER_FONE_ID').getValue(),
                str_Event: ref
            },
            success: function (response)
            {
                //alert("succes");
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Infos Message', 'CREER AVEC SUCCES');
                    return;
                } else {
                    Ext.MessageBox.alert('  Message', object.errors);
                }
                Oview.getStore().reload();
            },
            failure: function (response)
            {
                //alert("echec");
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('  Message', response.responseText);
            }
        });
        this.up('window').close();
    }
});


