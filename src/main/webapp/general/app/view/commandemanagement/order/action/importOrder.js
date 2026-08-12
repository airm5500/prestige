/* global Ext */

var url_services_transaction_order = '../webservices/commandemanagement/order/ws_transaction.jsp?mode=';
var url_services_data_grossiste = '../webservices/configmanagement/grossiste/ws_data.jsp';

var Oview;
var Omode;
var Me_WorkFlow;
var ref;
var Type;

Ext.define('testextjs.view.commandemanagement.order.action.importOrder', {
    extend: 'Ext.window.Window',
    xtype: 'importOrder',
//    id: 'importOrderID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        type: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
        Type = this.getType();
        var filetype = (Type === 'format1' ? 'CSV' : 'Excel');
        Omode = this.getMode();
        var orderId = this.getOdatasource().lg_ORDER_ID;
        var storerepartiteur = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                  url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }
        });



        Me_WorkFlow = this;
        var itemsPerPage = 20;



        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Information sur la commande',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'filefield',
                            fieldLabel: 'Fichier ' + filetype,
                            emptyText: 'Fichier ' + filetype,
                            name: 'str_FILE',
                            allowBlank: false,
                            buttonText: 'Choisir un fichier ' + filetype,
                            width: 400,
                            id: 'str_FILE'
                        },
                        {
                            xtype: 'hiddenfield',
                            name: 'orderId',
                            allowBlank: false,
                            value: orderId
                        },

                        {
                            xtype: 'combobox',
                            fieldLabel: 'Repartiteur',
//                            allowBlank: false,
                            name: 'lg_GROSSISTE_ID',
                            //margin: '0 15 0 0',
                            hidden: true,
                            id: 'lg_GROSSISTE_ID',
                            store: storerepartiteur,
                            valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un grossiste...'
                        }]
                }]
        });

        if (Omode === "importfileUpdate") {
            ref = this.getOdatasource().lg_ORDER_ID;
        } else if (Omode === "importfileCreate") {
            Ext.getCmp('lg_GROSSISTE_ID').show();
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

        if (Omode === "importfileUpdate") {
            internal_url = url_services_transaction_order + 'importfile&lg_ORDER_ID=' + ref + "&modeimport=mode_update&format=" + Type;
        }
        if (Omode === "importfileCreate") {
            if (Ext.getCmp('lg_GROSSISTE_ID').getValue() != null) {
                internal_url = url_services_transaction_order + 'importfile&modeimport=mode_insert&format=' + Type;
            } else {
                Ext.MessageBox.alert('Error Message', 'Renseignez le Grossiste');
                return;
            }
        }
        let fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (formulaire.isValid()) {

            if (Omode === "checkimportfile") {
                formulaire.submit({
                    url: '../CheckMigrationServlet?table_name=TABLE_ORDER&format=' + Type
                });
            } else if (Omode === "importfileCreate") {
                formulaire.submit({
                    url: internal_url,
                    waitMsg: 'Veuillez patienter le temps du telechargemetnt du fichier...',
                    timeout: 600,
                    success: function (formulaire, action) {

                        if (action.result.success === "1") {
                            Ext.MessageBox.alert('Confirmation', action.result.errors);
                            Oview.getStore().reload();
                        } else {
                            Ext.MessageBox.alert('Erreur', action.result.errors);
                        }

                        let bouton = button.up('window');
                        bouton.close();
                    },
                    failure: function (formulaire, action) {
                        Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.errors);
                    }
                });
            } else {
                formulaire.submit({
                    url: '../VericationServlet',
                    waitMsg: 'Traitement.....',
                    timeout: 2400000,
                    success: function (formulaire, action) {
                        let result = Ext.JSON.decode(action.response.responseText, false);
                        if (result.success) {
                            let nbrePrisEnCompte = result.nbrePrisEnCompte;
                            Ext.MessageBox.show({
                                title: 'Message',
                                width: 400,
                                msg: nbrePrisEnCompte,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.INFO

                            });

                            Oview.getStore().reload();
                        } else {
                            Ext.MessageBox.alert('Erreur', "Erreur ");
                        }

                        let bouton = button.up('window');
                        bouton.close();
                    },
                    failure: function (formulaire, action) {
                        Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.errors);
                    }
                });
            }
        } else {
            Ext.MessageBox.alert('Echec', 'Form non valide');
        }
    }
});