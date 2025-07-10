/* global Ext */

var url_services_data_entreestock = '../webservices/sm_user/entreestock/ws_data.jsp';
var url_services_transaction_entreestock = '../webservices/sm_user/entreestock/ws_transaction.jsp?mode=';
var url_services_data_typeetiquette = '../webservices/configmanagement/typeetiquette/ws_data.jsp';

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
var checkExpirationdate;
var DISPLAYFILTER;
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
        directImport: false
    },
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();

        str_REF_LIVRAISON = this.getReference();
        checkExpirationdate = this.getOdatasource().checkExpirationdate;
        DISPLAYFILTER = this.getOdatasource().DISPLAYFILTER;
        int_QTE_CMDE = this.getOdatasource().int_QTE_CMDE;
        index = this.getIndex();

        if (!checkExpirationdate) {

            int_QTE_CMDE = 1;
        }


        Me = this;
        var itemsPerPage = 20;

        var store_etiquette = new Ext.data.Store({
            model: 'testextjs.model.Typeetiquette',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typeetiquette,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


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
                    title: 'Information prise en compte produit',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [

                        {
                            fieldLabel: 'Quantite',
                            emptyText: 'Quantite',
                            name: 'int_NUMBER',
                            id: 'int_NUMBER',
                            xtype: 'numberfield',
                            readOnly: DISPLAYFILTER,
                            allowBlank: checkExpirationdate,
                            regex: /[0-9.]/,
                            minValue: int_QTE_CMDE

                        },
                        {
                            fieldLabel: 'Quantite gratuite',
                            emptyText: 'Quantite gratuite',
                            name: 'int_QUANTITE_FREE',
                            allowBlank: false,
                            id: 'int_QUANTITE_FREE',
                            xtype: 'numberfield',
                            regex: /[0-9.]/,
                            minValue: 0,
                            value: 0
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
                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Date peremption',
                            name: 'str_PEREMPTION',
                            id: 'str_PEREMPTION',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y',
                            minValue: new Date(),
                            hidden: DISPLAYFILTER,
                            allowBlank: checkExpirationdate,
                            listeners: {
                                'change': function (me) {

                                    str_PEREMPTION = me.getSubmitValue();
                                }
                            }
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type etiquette',
                            name: 'lg_TYPEETIQUETTE_ID',
                            id: 'lg_TYPEETIQUETTE_ID',
                            store: store_etiquette,
                            valueField: 'lg_TYPEETIQUETTE_ID',
                            displayField: 'str_DESCRIPTION',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un type d\'etiquette...'
                        },
                        {
                            fieldLabel: 'Reference Lot',
                            emptyText: 'Reference Lot',
                            name: 'int_NUM_LOT',
                            allowBlank: checkExpirationdate,
                            hidden: DISPLAYFILTER,
                            id: 'int_NUM_LOT'
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
            MANQUANT = this.getOdatasource().int_QTE_MANQUANT;

            if (!checkExpirationdate) {
                Ext.getCmp('int_NUMBER').setValue(MANQUANT);
            } else {
                Ext.getCmp('int_NUMBER').setValue(this.getOdatasource().int_QTE_CMDE);

            }

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
     
        console.log( Me.getDirectImport());
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
            idEtiquette: Ext.getCmp('lg_TYPEETIQUETTE_ID').getValue(),
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
                                                        url: '../api/v1/commande/add-lot',
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
                                        url: '../api/v1/commande/add-lot',
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
                                        url: '../api/v1/commande/add-lot',
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
