/* global Ext */


var Oview;
var Omode;
var Me;
var ref;
var lg_GROSSISTE_ID;
var str_REF_LIVRAISON;
var lg_BON_LIVRAISON_DETAIL;
var str_SORTIE_USINE;
var str_PEREMPTION;
var MANQUANT, int_QTE_CMDE;


var index;

Ext.define('testextjs.view.stockmanagement.etatstock.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addStock',
    id: 'addStockID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        reference: '',
        index: '',
        directImport: false,
        checkExpirationdate: false,
        qtyCmde: 0,
        gestionLot: false,
    },
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();
        str_REF_LIVRAISON = this.getReference();

        int_QTE_CMDE = this.getOdatasource().int_QTE_CMDE;
        index = this.getIndex();
        Me = this;
        let quantiteRestante = this.getOdatasource().int_QTE_CMDE - this.getOdatasource().quantiteSaisie;
        console.log(this.getOdatasource());
        if (this.getGestionLot()) {
            quantiteRestante = this.getOdatasource().int_QTE_RECUE - this.getOdatasource().quantiteSaisie;
        }
        if (quantiteRestante < 0) {
            quantiteRestante = 0;
        }
        console.log(quantiteRestante);

        const form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information prise en compte produit',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Quantité',
                            emptyText: 'Quantité',
                            name: 'int_NUMBER',
                            id: 'int_NUMBER',
                            xtype: 'numberfield',
                            readOnly: !Me.getGestionLot(),
                            allowBlank: !Me.getGestionLot(),
                            regex: /[0-9.]/,
                          //  minValue: quantiteRestante,
                            value: quantiteRestante,

                        },
                        {
                            fieldLabel: 'Quantité gratuite',
                            emptyText: 'Quantité gratuite',
                            name: 'int_QUANTITE_FREE',
                            allowBlank: false,
                            id: 'int_QUANTITE_FREE',
                            xtype: 'numberfield',
                            regex: /[0-9.]/,
                            minValue: 0,
                            value: 0
                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Date peremption',
                            name: 'str_PEREMPTION',
                            id: 'str_PEREMPTION',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y',
                            minValue: new Date(),
                            hidden: !Me.getGestionLot(),
                            allowBlank: !Me.getGestionLot(),
                            listeners: {
                                'change': function (me) {

                                    str_PEREMPTION = me.getSubmitValue();
                                }
                            }
                        }, {
                            fieldLabel: 'Reference Lot',
                            emptyText: 'Reference Lot',
                            name: 'int_NUM_LOT',
                            allowBlank: !Me.getGestionLot(),
                            hidden: !Me.getGestionLot(),
                            id: 'int_NUM_LOT'
                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Date fabrication',
                            name: 'str_SORTIE_USINE',
                            maxValue: new Date(),
                            id: 'str_SORTIE_USINE',
                            submitFormat: 'Y-m-d',
//                            allowBlank: false,
                            listeners: {
                                'change': function (me) {
                                    str_SORTIE_USINE = me.getSubmitValue();
                                }
                            }
                        }


                    ]
                }
            ]
        });



        //Initialisation des valeur 


        if (Omode === "create") {
            ref = this.getOdatasource().lg_FAMILLE_ID;
            lg_GROSSISTE_ID = this.getOdatasource().lg_GROSSISTE_ID;
            lg_BON_LIVRAISON_DETAIL = this.getOdatasource().lg_BON_LIVRAISON_DETAIL;

        //    Ext.getCmp('int_NUMBER').setValue(this.getOdatasource().int_QTE_MANQUANT);


        }



        const win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
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
    onbtnsave: function (button) {


        Me_Workflow = Oview;
        const fenetre = button.up('window');
        const formulaire = fenetre.down('form');
        let Qte_cmde = MANQUANT;
        let Qte_livre = Ext.getCmp('int_NUMBER').getValue();
        const payload = Ext.JSON.encode({
            freeQty: Ext.getCmp('int_QUANTITE_FREE').getValue(),
            qty: Ext.getCmp('int_NUMBER').getValue(),
            dateUsine: str_SORTIE_USINE,
            datePeremption: Ext.getCmp('str_PEREMPTION').getSubmitValue(),
            idBonDetail: lg_BON_LIVRAISON_DETAIL,
            numLot: Ext.getCmp('int_NUM_LOT').getValue(),
            directImport: Me.getDirectImport()

        });

        Ext.MessageBox.confirm('Message',
                'Confirmer la saisie',
                function (btn) {

                    if (btn === 'yes') {

                        if (Qte_livre < Qte_cmde) {

                            Ext.MessageBox.confirm('Message',
                                    'La quantite livree ' + Qte_livre + '<br> est inferieur a celle commandee ' + Qte_cmde,
                                    function (btn) {

                                        if (btn === 'yes') {

                                            if (formulaire.isValid()) {
                                                if (Ext.getCmp('int_NUMBER').getValue() < 0 || Ext.getCmp('int_QUANTITE_FREE').getValue() < 0) {
                                                    Ext.MessageBox.alert('Error Message', 'Quantite inferieure a 0');
                                                    return;
                                                }
                                                if (Omode === "create") {
                                                    button.setDisabled(true);
                                                    Ext.Ajax.request({
                                                        method: 'POST',
                                                        url: Me.getGestionLot() ? '../api/v1/commande/add-lot' : '../api/v1/commande/add-free-qty',
                                                        headers: {'Content-Type': 'application/json'},
                                                        params: payload,
                                                        success: function (response)
                                                        {
                                                            button.enable();
                                                            const object = Ext.JSON.decode(response.responseText, false);

                                                            if (!object.success) {
                                                                Ext.MessageBox.alert('Confirmation', object.msg);

                                                            } else {
                                                                Ext.getCmp('gridpanelID').getStore().load();
                                                                button.up('window').close();
                                                            }


                                                        },
                                                        failure: function (response)
                                                        {
                                                            button.enable();
                                                            var object = Ext.JSON.decode(response.responseText, false);
                                                            console.log("Bug " + response.responseText);
                                                            Ext.MessageBox.alert('Error Message', response.responseText);

                                                        }
                                                    });
                                                }
                                            } else {
                                                button.enable();
                                                Ext.MessageBox.alert('Echec', 'Formulaire non valide. Verifiez votre saisie');
                                                return;
                                            }


                                        }
                                    });

                        } else if (Qte_livre > Qte_cmde) {


                            if (formulaire.isValid()) {
                                if (Ext.getCmp('int_NUMBER').getValue() < 0 || Ext.getCmp('int_QUANTITE_FREE').getValue() < 0) {
                                    Ext.MessageBox.alert('Error Message', 'Quantite inferieure a 0');
                                    return;
                                }
                                if (Omode === "create") {
                                    button.setDisabled(true);
                                    Ext.Ajax.request({
                                        method: 'POST',
                                        url: Me.getGestionLot() ? '../api/v1/commande/add-lot' : '../api/v1/commande/add-free-qty',
                                        headers: {'Content-Type': 'application/json'},
                                        params: payload,
                                        success: function (response)
                                        {
                                            button.enable();
                                            const object = Ext.JSON.decode(response.responseText, false);

                                            if (!object.success) {
                                                Ext.MessageBox.alert('Confirmation', object.msg);

                                            } else {
                                                Ext.getCmp('gridpanelID').getStore().load();
                                                button.up('window').close();
                                            }
                                        },
                                        failure: function (response)
                                        {
                                            button.enable();

                                            var object = Ext.JSON.decode(response.responseText, false);
                                            console.log("Bug " + response.responseText);
                                            Ext.MessageBox.alert('Error Message', response.responseText);

                                        }
                                    });
                                }
                            } else {
                                button.enable();
                                Ext.MessageBox.alert('Echec', 'Formulaire non valide. Verifiez votre saisie');
                                return;
                            }

                        } else {
                            if (formulaire.isValid()) {
                                if (Ext.getCmp('int_NUMBER').getValue() < 0 || Ext.getCmp('int_QUANTITE_FREE').getValue() < 0) {
                                    Ext.MessageBox.alert('Error Message', 'Quantite inferieure a 0');
                                    return;
                                }
                                if (Omode === "create") {


                                    button.setDisabled(true);
                                    Ext.Ajax.request({
                                        method: 'POST',
                                        url: Me.getGestionLot() ? '../api/v1/commande/add-lot' : '../api/v1/commande/add-free-qty',
                                        headers: {'Content-Type': 'application/json'},
                                        params: payload,
                                        success: function (response)
                                        {
                                            button.enable();
                                            const object = Ext.JSON.decode(response.responseText, false);

                                            if (!object.success) {
                                                Ext.MessageBox.alert('Confirmation', object.msg);

                                            } else {
                                                Ext.getCmp('gridpanelID').getStore().load();
                                                button.up('window').close();
                                            }



                                        },
                                        failure: function (response)
                                        {
                                            button.enable();
                                            var object = Ext.JSON.decode(response.responseText, false);
                                            console.log("Bug " + response.responseText);
                                            Ext.MessageBox.alert('Error Message', response.responseText);

                                        }
                                    });
                                }
                            } else {
                                button.enable();
                                Ext.MessageBox.alert('Echec', 'Formulaire non valide. Verifiez votre saisie');
                                return;
                            }
                        }

                    }
                });

    }


});
