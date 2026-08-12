

var Oview;
var Omode;
var Me;
var ref;



Ext.define('testextjs.view.stockmanagement.etatstock.action.removeLot', {
    extend: 'Ext.window.Window',
    xtype: 'removeStock',
    id: 'removeStockID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        reference: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();

        Me = this;


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information de lot &agrave; r&eacute;tirer',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Reference Lot',
                            emptyText: 'Reference Lot',
                            name: 'int_NUM_LOT',
                            allowBlank: false,
                            id: 'int_NUM_LOT'
                        }
                    ]
                }
            ]
        });

        const win = new Ext.window.Window({
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
        const me = Me;
        const fenetre = button.up('window'),
                formulaire = fenetre.down('form');

        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppression du lot ' + Ext.getCmp('int_NUM_LOT').getValue(),
                function (btn) {
                    if (btn === 'yes') {
                        if (formulaire.isValid()) {

                            Ext.Ajax.request({
                                method: 'PUT',
                                url: '../api/v1/commande/remove-lots',
                                headers: {'Content-Type': 'application/json'},
                                params: Ext.JSON.encode({
                                    idBonDetail: me.getOdatasource().lg_BON_LIVRAISON_DETAIL,
                                    idProduit: me.getOdatasource().lg_FAMILLE_ID,
                                    refBon: me.getOdatasource().str_REF_LIVRAISON,
                                    numLot: Ext.getCmp('int_NUM_LOT').getValue()
                                }),
                                success: function (response)
                                {
                                    testextjs.app.getController('App').StopWaitingProcess();
                                    Ext.getCmp('gridpanelID').getStore().reload();
                                    button.up('window').close();


                                },
                                failure: function (response)
                                {
                                    testextjs.app.getController('App').StopWaitingProcess();

                                    console.log("Bug " + response.responseText);
                                    Ext.MessageBox.alert('Error Message', response.responseText);

                                }
                            });

                        } else {
                            Ext.MessageBox.alert('Echec', 'Formulaire non valide. Verifiez votre saisie');
                            return;
                        }


                    }
                });

    }
});
