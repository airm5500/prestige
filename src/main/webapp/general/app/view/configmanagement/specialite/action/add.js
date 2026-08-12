var url_services_data_specialite = '../webservices/configmanagement/specialite/ws_data.jsp';
var url_services_transaction_specialite = '../webservices/configmanagement/specialite/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.specialite.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addspecialite',
    id: 'addspecialiteID',
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
                    //   width: 55,
                    title: 'Informations Specialite',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Code Specialite',
                            emptyText: 'CODE SPECIALITE',
                            id: 'str_CODESPECIALITE',
                            allowBlank: false,
                            name: 'str_CODESPECIALITE'
                        },{
                            fieldLabel: 'Libelle',
                            emptyText: 'LIBELLE SPECIALITE',
                            id: 'str_LIBELLESPECIALITE',
                            allowBlank: false,
                            name: 'str_LIBELLESPECIALITE'
                        }]
                }]
        });
      //Initialisation des valeur

        if (Omode === "update") {

            ref = this.getOdatasource().lg_SPECIALITE_ID;
            Ext.getCmp('str_CODESPECIALITE').setValue(this.getOdatasource().str_CODESPECIALITE);
            Ext.getCmp('str_LIBELLESPECIALITE').setValue(this.getOdatasource().str_LIBELLESPECIALITE);
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
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function () {
        var internal_url = "";
        if (Omode === "create") {
            internal_url = url_services_transaction_specialite + 'create';
        } else {
            internal_url = url_services_transaction_specialite + 'update&lg_SPECIALITE_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_CODESPECIALITE: Ext.getCmp('str_CODESPECIALITE').getValue(),
                str_LIBELLESPECIALITE: Ext.getCmp('str_LIBELLESPECIALITE').getValue()
                
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    if (internal_url === url_services_transaction_specialite + 'create') {
                        Ext.MessageBox.alert('Creation specialite', 'creation effectuee avec succes');

                    } else {
                        Ext.MessageBox.alert('Modification specialite', 'modification effectuee avec succes');

                    }
                }
                Oview.getStore().reload();

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
