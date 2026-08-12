/* global Ext */

var url_services_transaction_inventaire = '../webservices/stockmanagement/inventaire/ws_transactions.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;
Ext.define('testextjs.view.stockmanagement.inventaire.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addinventaire',
    id: 'addinventaireID',
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
    initComponent: function() {

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
                    title: 'Information ouverture fiche inventaire',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Libelle',
                            emptyText: 'Libelle',
                            name: 'str_NAME',
                            id: 'str_NAME'
                        },
                        {
                            fieldLabel: 'Commentaire',
                            emptyText: 'Commentaire',
                            name: 'str_DESCRIPTION',
                            id: 'str_DESCRIPTION'
                        }
                    ]
                }
            ]
        });
        var win = new Ext.window.Window({
            modal: true,
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 250,
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
                    handler: function() {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function(button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var internal_url = "";
        var str_TYPE_TRANSACTION = "UNITAIRE";

        if (formulaire.isValid()) {
            // Creation par le service REST, en remplacement de ws_transactions.jsp. Un inventaire
            // unitaire n'a aucun critere : la liste de valeurs est vide, et bool_INVENTAIRE reste
            // a 0 comme auparavant - c'est ce qui distingue l'inventaire unitaire des autres.
            var progres = Ext.MessageBox.wait('Veuillez patienter. Traitement en cours...',
                    'Creation d\'un inventaire');
            Ext.Ajax.request({
                url: '../api/v1/inventaire/creation',
                method: 'POST',
                timeout: 180000,
                jsonData: {
                    str_NAME: Ext.getCmp('str_NAME').getValue(),
                    str_TYPE_TRANSACTION: str_TYPE_TRANSACTION,
                    valeurs: [],
                    bool_INVENTAIRE: 0
                },
                success: function (response) {
                    progres.hide();
                    var res = Ext.JSON.decode(response.responseText, true) || {};
                    if (!res.success) {
                        // Refus metier : la fenetre reste ouverte pour corriger la saisie.
                        Ext.MessageBox.alert('Message', res.nombre || 'Creation impossible.');
                        return;
                    }
                    Ext.MessageBox.alert('Infos', res.nombre);
                    Oview.getStore().reload();
                    button.up('window').close();
                },
                failure: function () {
                    progres.hide();
                    Ext.MessageBox.alert('Erreur', "La creation de l'inventaire a echoue.");
                }
            });

        } else {
            Ext.MessageBox.alert('Echec', 'Form non valide');
        }

       
    }
});
