/* global Ext */

var url_services_data_utilisateur = '../webservices/sm_user/utilisateur/ws_data.jsp';
var url_services_data_coffrecaisse = '../webservices/sm_user/coffrecaisse/ws_data.jsp';
var url_services_transaction_coffrecaisse = '../webservices/sm_user/coffrecaisse/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;

Ext.define('testextjs.view.sm_user.coffrecaisse.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addouverturecomptecaissemp',
    id: 'addouverturecomptecaissempID',

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
        Me = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Utilisateur',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_utilisateur,
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
                    title: 'Information Ouverture Caisse Emp',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'combobox',
                            fieldLabel: 'Utilisateur',
                            name: 'lg_USER_ID',
                            id: 'lg_USER_ID',
                            store: store,
                            valueField: 'lg_USER_ID',
                            pageSize: 20, //ajout la barre de pagination
                            displayField: 'str_FIRST_LAST_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un utilisateur...'
                        },
                        {
                            fieldLabel: 'Montant',
                            emptyText: 'Montant',
                            name: 'int_AMOUNT',
                            id: 'int_AMOUNT'
                        }

                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode == "update") {

            ref = this.getOdatasource().ID_COFFRE_CAISSE;
            Ext.getCmp('lg_USER_ID').setValue(this.getOdatasource().lg_USER_ID);
            Ext.getCmp('int_AMOUNT').setValue(this.getOdatasource().int_AMOUNT);


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
        var internal_url = "";
        if (Omode == "create") {
            internal_url = "../api/v1/caisse/attribuerfondcaisse/" + Ext.getCmp('lg_USER_ID').getValue();
//            internal_url = url_services_transaction_coffrecaisse + 'create';
        } else {
            internal_url = url_services_transaction_coffrecaisse + 'update&ID_COFFRE_CAISSE=' + ref;
        }


        var boxWaitingProcess = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: internal_url,
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            params: Ext.JSON.encode( {
//                lg_USER_ID: Ext.getCmp('lg_USER_ID').getValue(),
                "value": Ext.getCmp('int_AMOUNT').getValue()

            }),
            success: function (response)
            {
                boxWaitingProcess.hide();
                var object = Ext.JSON.decode(response.responseText, false);
                if (!object.success) {
                    Ext.MessageBox.alert('Error Message', object.msg);
             
                } else {
                    Ext.MessageBox.alert('Confirmation', object.msg);
                    var bouton = button.up('window');
                    bouton.close();
                    Oview.getStore().reload();
                }


            },
            failure: function (response)
            {
                boxWaitingProcess.hide();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });


    }
});