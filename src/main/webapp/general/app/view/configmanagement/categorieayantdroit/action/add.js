var url_services_data_categorieayantdroit = '../webservices/configmanagement/categorieayantdroit/ws_data.jsp';
var url_services_transaction_categorieayantdroit = '../webservices/configmanagement/categorieayantdroit/ws_transaction.jsp?mode=';

Ext.define('testextjs.view.configmanagement.categorieayantdroit.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addcategorieayantdroit',
    id: 'addcategorieayantdroitID',
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
                            name: 'str_CODE',
                            id: 'str_CODE',
                            fieldLabel: 'Code',
                            emptyText: 'Code',
                            flex: 1,
                            allowBlank: false
                        },
                        // str_LIBELLE_CATEGORIE_AYANTDROIT
                        {
                            name: 'str_LIBELLE_CATEGORIE_AYANTDROIT',
                            id: 'str_LIBELLE_CATEGORIE_AYANTDROIT',
                            fieldLabel: 'Description',
                            emptyText: 'Description',
                            flex: 1,
                            allowBlank: false
                        }                        
                    ]
                }]
        });
        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_CATEGORIE_AYANTDROIT_ID;
            Ext.getCmp('str_CODE').setValue(this.getOdatasource().str_CODE);
            Ext.getCmp('str_LIBELLE_CATEGORIE_AYANTDROIT').setValue(this.getOdatasource().str_LIBELLE_CATEGORIE_AYANTDROIT);
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 600,
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
                    handler: function () {
                        win.close();
                    }
                }]
        });
    },
    onbtnsave: function () {

        var internal_url = "";
        if (Omode === "create") {
            internal_url = url_services_transaction_categorieayantdroit + 'create';
        } else {
            internal_url = url_services_transaction_categorieayantdroit + 'update&lg_CATEGORIE_AYANTDROIT_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                
                str_CODE: Ext.getCmp('str_CODE').getValue(),
                str_LIBELLE_CATEGORIE_AYANTDROIT: Ext.getCmp('str_LIBELLE_CATEGORIE_AYANTDROIT').getValue()

            },
            success: function (response)
            {
                //alert("succes");
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Infos Message', 'CREER AVEC SUCCES');
                    return;
                }else{
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


