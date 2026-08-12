var url_services_transaction_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.tierspayantmanagement.tierspayant.action.addPhoto', {
    extend: 'Ext.window.Window',
    xtype: 'addPhoto',
    id: 'addPhotoID',
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
    initComponent: function () {

        Oview = this.getParentview();


        Omode = this.getMode();
        /*
         if(getMode()){
         
         }*/


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
                    title: 'Information sur tiers payant',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'filefield',
                            fieldLabel: 'Photo',
                            emptyText: 'Photo du client',
                            name: 'str_PHOTO',
                            allowBlank: false,
                            buttonText: 'Choisir une photo',
                            width: 400,
                            id: 'str_PHOTO'
                        }]
                }]
        });
        
        if (Omode === "updatephoto") {
            ref = this.getOdatasource().lg_TIERS_PAYANT_ID;
        }




        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 150,
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
    onbtnsave: function (button) {


        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (formulaire.isValid()) {
            var  internal_url = url_services_transaction_tierspayant + 'updatephoto&lg_TIERS_PAYANT_ID=' + ref;
                formulaire.submit({
                    url: internal_url,
                    waitMsg: 'Veuillez patienter le temps du telechargemetnt de la photo...',
                    success: function (formulaire, action) {
                        Oview.getStore().reload();
                        if (action.result.success === "1") {
                            fenetre.close();
                            Ext.MessageBox.alert('Confirmation', action.result.errors);
                        } else {
                            Ext.MessageBox.alert('Erreur', action.result.errors);
                        }

                       
                    },
                    failure: function (formulaire, action) {
                        Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.errors);
                    }
                });
          
        } else {
            Ext.MessageBox.alert('Echec', 'Formulaire non valide');
        }
    }
});