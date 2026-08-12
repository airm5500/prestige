//var url_services_data_typeetatarticle = '../webservices/configmanagement/typeetatarticle/ws_data.jsp';
var url_services_data_etatarticle = '../webservices/configmanagement/etatarticle/ws_data.jsp';
var url_services_transaction_etatarticle = '../webservices/configmanagement/etatarticle/ws_transaction.jsp?mode=';
//var url_services_data_grille_etatarticle  = '../webservices/configmanagement/grilleetatarticle/ws_data.jsp';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.etatarticle.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addetatarticle',
    id: 'addetatarticleID',
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
                    title: 'Informations Etat Article',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Code Etat Article',
                            emptyText: 'CODE ARTICLE',
                            name: 'str_CODE',
                            maskRe: /[0-9.]/,
                            maxlength: '3',
                            allowBlank: false,
                            id: 'str_CODE'
                        }, {
                            fieldLabel: 'Libelle',
                            emptyText: 'LIBELLE',
                            id: 'str_LIBELLEE',
                            allowBlank: false,
                            name: 'str_LIBELLEE'
                        }]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_ETAT_ARTICLE_ID;

            Ext.getCmp('str_CODE').setValue(this.getOdatasource().str_CODE);
            Ext.getCmp('str_LIBELLEE').setValue(this.getOdatasource().str_LIBELLEE);           
            
            
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
            internal_url = url_services_transaction_etatarticle + 'create';
        } else {
            internal_url = url_services_transaction_etatarticle + 'update&lg_ETAT_ARTICLE_ID=' + ref;
        }

        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_CODE: Ext.getCmp('str_CODE').getValue(),
                str_LIBELLEE: Ext.getCmp('str_LIBELLEE').getValue()                
                
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    if (internal_url === url_services_transaction_etatarticle + 'create') {
                        Ext.MessageBox.alert('Creation etatarticle', 'creation effectuee avec succes');

                    } else {
                        Ext.MessageBox.alert('Modification etatarticle', 'modification effectuee avec succes');

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
