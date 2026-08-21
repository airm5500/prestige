var winImportFamilleOuverte = null;
/* global Ext */

var Oview;
var Omode;
var Me;
var table_name;


Ext.define('testextjs.view.configmanagement.famille.action.importOrder', {
    extend: 'Ext.window.Window',
    xtype: 'importOrder',
    id: 'importOrderID',
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

        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [{str_TYPE_TRANSACTION: 'BASCULEMENT', str_desc: 'Basculement de donnees'}, {str_TYPE_TRANSACTION: 'INSTALLATION', str_desc: 'Nouvelle installation'}, {str_TYPE_TRANSACTION: 'UPDATEDATA', str_desc: 'Mise a jour des donnees par LABOREX'}, {str_TYPE_TRANSACTION: 'IMPORTFAMILLEDCI', str_desc: 'Importation DCI'}, {str_TYPE_TRANSACTION: 'UPDATEDATAWITHSTOCK', str_desc: 'Fusion avec stock'}, {str_TYPE_TRANSACTION: 'UPDATEDATAWITHOUTSTOCK', str_desc: 'Fusion sans stock'}]
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
                            fieldLabel: 'Type d\'action',
                            name: 'str_TYPE_TRANSACTION_IMPORT',
                            id: 'str_TYPE_TRANSACTION_IMPORT',
                            store: store_type,
                            valueField: 'str_TYPE_TRANSACTION',
                            hidden: true,
                            displayField: 'str_desc',
                            allowBlank: false,
                            queryMode: 'local',
                            editable: false,
                            value: 'BASCULEMENT',
                            //minChars: 3,
                            emptyText: 'Choisir un mode d\'importation...',
                            listeners: {
                                select: function(cmp) {
                                    if(cmp.getValue() === "INSTALLATION") {
                                        Ext.getCmp("lg_GROSSISTE_ID").show();
                                    } else {
                                        Ext.getCmp("lg_GROSSISTE_ID").hide();
                                    }
                                }
                            }
                        },
                      {
                            xtype: 'filefield',
                            fieldLabel: 'Fichier EXECEL/CSV',
                            emptyText: 'Fichier EXECEL/CSV',
                            name: 'str_FILE',
                            allowBlank: false,
                            buttonText: 'Choisir un fichier EXECEL/CSV',
                            width: 400,
                            id: 'str_FILE'


                        }
                    ]
                }]
        });

        if (table_name == "TABLE_FAMILLE" && Omode == "importfile") {
            Ext.getCmp('str_TYPE_TRANSACTION_IMPORT').show();
        }

        // Une seule fenetre a la fois : un nouveau clic remplace la precedente.
        if (winImportFamilleOuverte && !winImportFamilleOuverte.isDestroyed) {
            winImportFamilleOuverte.destroy();
        }
        var win = winImportFamilleOuverte = new Ext.window.Window({
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
                            Ext.MessageBox.alert('Erreur', action.result.errors);
                        }


                    },
                    failure: function(formulaire, action) {
                        Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.errors);
                    }
                });

            } else {
                Ext.MessageBox.alert('Echec', 'Formulaire non valide');
            }
        } else {
            /*var extension = "csv";
             window.location = '../MigrationServlet?table_name=TABLE_FAMILLE' + "&extension=" + extension + "&action=checkfile";*/
//            window.location = '../CheckMigrationServlet';
            formulaire.submit({
                url: '../CheckMigrationServlet?table_name='+table_name,
//                    waitMsg: 'Veuillez patienter le temps du telechargemetnt du fichier...',
                success: function(formulaire, action) {

                    /*if (action.result.success === "1") {
                     Ext.MessageBox.alert('Confirmation', action.result.errors);
                     Oview.getStore().reload();
                     Me_Workflow = Oview;
                     var bouton = button.up('window');
                     bouton.close();
                     } else {
                     Ext.MessageBox.alert('Erreur', action.result.errors);
                     }*/


                },
                failure: function(formulaire, action) {
//                        Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.errors);
                }
            });
        }



    }
});