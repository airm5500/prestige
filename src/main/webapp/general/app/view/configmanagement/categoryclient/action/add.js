/* global Ext */

var Oview;
var Omode;
var Me;
var ref;
var formclient;
Ext.define('testextjs.view.configmanagement.categoryclient.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addCategory',
    id: 'addCategoryID',
    urlCategorieUpdate: '../webservices/configmanagement/categoryclient/ws_transaction.jsp?mode=update',
    urlCategorieCreate: '../webservices/configmanagement/categoryclient/ws_transaction.jsp?mode=create',
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



         formclient = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 160,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Cat&eacute;corie de client',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [

                        {
                            name: 'str_LIBELLE_CATEGORIE',
                            id: 'str_LIBELLE_CATEGORIE',
                            fieldLabel: 'LIBELLE',
                            emptyText: 'LIBELLE',

                            allowBlank: false
                        },
                        {
                            xtype:'numberfield',
                            name: 'int_TAUX_CATEGORIE',
                            id: 'int_TAUX_CATEGORIE',
                            fieldLabel: 'TAUX DE COUVERTURE',
                            emptyText: 'Taux de couverture',
                            maxValue:100,
                            minValue:10,
                            hideTrigger:true,
                            allowBlank: false
                        },
                        {
                            xtype: 'textareafield',
                            name: 'str_ESCRIPTION_CATEGORIE',
                            id: 'str_ESCRIPTION_CATEGORIE',
                            fieldLabel: 'DESCRIPTION',
                            emptyText: 'Libelle',
                            grow: true,

                            allowBlank: false
                        }

                    ]
                }]
        });
        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_CATEGORY_CLIENT_ID;
            Ext.getCmp('str_LIBELLE_CATEGORIE').setValue(this.getOdatasource().str_LIBELLE);
            Ext.getCmp('str_ESCRIPTION_CATEGORIE').setValue(this.getOdatasource().str_ESCRIPTION);
            Ext.getCmp('int_TAUX_CATEGORIE').setValue(this.getOdatasource().int_taux);
        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height:250,
            minWidth: 250,
            minHeight:250,
            layout: 'fit',
            plain: true,
            items: formclient,
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
    onbtnsave: function (button) {

        var internal_url = "";
        if (Omode === "create") {
            internal_url = Me.urlCategorieCreate;
        } else {
            internal_url = Me.urlCategorieUpdate + '&lg_CATEGORY_CLIENT_ID=' + ref;
        }
  if (formclient && formclient.isValid()) {
     Ext.Ajax.request({
            url: internal_url,
            params: {
                str_LIBELLE: Ext.getCmp('str_LIBELLE_CATEGORIE').getValue(),
                str_ESCRIPTION: Ext.getCmp('str_ESCRIPTION_CATEGORIE').getValue(),
                int_taux: Ext.getCmp('int_TAUX_CATEGORIE').getValue()



            },
            success: function (response)
            {
              button.up('window').close();  
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {

                    Ext.MessageBox.alert('Information', 'Enregistrement effectue ');


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
        
       
  }
       
    }
});