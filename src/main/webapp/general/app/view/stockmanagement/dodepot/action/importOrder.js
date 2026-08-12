var winImportDepotOuverte = null;
var Oview;
var Omode;
var url_services_data_emplacement = '../webservices/configmanagement/emplacement/ws_data.jsp';
var Me;
var table_name;


Ext.define('testextjs.view.stockmanagement.dodepot.action.importOrder', {
    extend: 'Ext.window.Window',
    xtype: 'importDepotOrder',
    id: 'importDepotOrderID',
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
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        table_name = this.getOdatasource();
        var itemsPerPage = 20;

        Me = this;

        var store_emplacement = new Ext.data.Store({
            model: 'testextjs.model.Emplacement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_emplacement + "?lg_TYPEDEPOT_ID=2",
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
                    title: 'Information sur l\'importation',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'D&eacute;p&ocirc;t',
                            name: 'str_TYPE_TRANSACTION_IMPORT',
                            width: 400,
                            id: 'str_TYPE_TRANSACTION_IMPORT',
                            store: store_emplacement,
                            valueField: 'lg_EMPLACEMENT_ID',
                            pageSize: 20, //ajout la barre de pagination
                            displayField: 'str_DESCRIPTION',
                            typeAhead: true,
                            allowBlank: false,
                            queryMode: 'remote',
                            emptyText: 'Choisir un depot...'
                        }, {
                            xtype: 'filefield',
                            fieldLabel: 'Fichier CSV',
                            emptyText: 'Fichier CSV',
                            name: 'str_FILE',
                            allowBlank: false,
                            buttonText: 'Choisir un fichier CSV',
                            width: 400,
                            id: 'str_FILE'


                        }
                    ]
                }]
        });
        
        if (this.getOdatasource() === "TABLE_MISEAJOUR_STOCKDEPOT") {
            Ext.getCmp("str_TYPE_TRANSACTION_IMPORT").hide();
            Ext.getCmp("str_TYPE_TRANSACTION_IMPORT").setValue("0");
        }


        // Une seule fenetre a la fois : un nouveau clic remplace la precedente.
        if (winImportDepotOuverte && !winImportDepotOuverte.isDestroyed) {
            winImportDepotOuverte.destroy();
        }
        var win = winImportDepotOuverte = new Ext.window.Window({
            autoShow: true,
            modal: true,
            title: this.getTitre(),
            width: 500,
            height: 200,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Retour',
                    handler: function() {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function(button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (Omode == "importfile") {
            var internal_url = '../webservices/sm_user/migration/ws_transaction.jsp?mode=' + Omode + "&table_name=" + table_name;
            if (formulaire.isValid()) {

                formulaire.submit({
                    url: internal_url,
                    waitMsg: 'Veuillez patienter le temps du telechargemetnt du fichier...',
                    timeout: 3600,
                    success: function(formulaire, action) {

                        if (action.result.success === "1") {
                            Ext.MessageBox.alert('Confirmation', action.result.errors, function() {
                                Me_Workflow = Oview;
                                Me_Workflow.onRechClick();
                                // Oview.getStore().reload(); a deommenter en cas de probleme
                                var bouton = button.up('window');
                                bouton.close();

                            });


                        } else {
                            
                            Ext.MessageBox.show({
                                title: 'Echec',
                                msg: action.result.errors,
                                width: 300,
                                height: 150,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.WARNING
                            });
                        }


                    },
                    failure: function(formulaire, action) {
                        // Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.errors);
                        Ext.MessageBox.show({
                            title: 'Echec',
                            msg: 'Erreur ' + action.result.errors,
                            width: 300,
                            height: 150,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.WARNING
                        });
                    }
                });

            } else {

                Ext.MessageBox.show({
                    title: 'Echec',
                    msg: 'Formulaire non valide',
                    // width: 300,
                    height: 150,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
            }
        }

    }
});