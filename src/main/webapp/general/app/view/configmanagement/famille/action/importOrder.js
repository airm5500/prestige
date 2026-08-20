var winImportFamilleOuverte = null;
/* global Ext */

var Oview;
var Omode;
var Me;
var table_name;

/* Le choix « mettre aussi a jour le prix » ne concerne que les modes qui modifient des articles
 * existants : la majoration du code tableau ne s'applique qu'a un article qui n'en avait pas encore.
 * Les modes de creation (basculement, nouvelle installation, DCI) ne sont pas concernes. */
var MODES_MISE_A_JOUR_ARTICLES = ['UPDATEDATA', 'UPDATEDATAWITHSTOCK', 'UPDATEDATAWITHOUTSTOCK'];

function majorationCodeTableauVisible(mode) {
    var cadre = Ext.getCmp('bool_MAJORER_PRIX_CODE_TABLEAU'),
            aide = Ext.getCmp('aide_MAJORER_PRIX_CODE_TABLEAU');
    if (!cadre) {
        return;
    }
    var concerne = table_name === 'TABLE_FAMILLE' && Omode === 'importfile'
            && Ext.Array.contains(MODES_MISE_A_JOUR_ARTICLES, mode);
    cadre.setVisible(concerne);
    if (aide) {
        aide.setVisible(concerne);
    }
}


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
                                    // En premier : la ligne suivante cherche un composant qui n'appartient pas
                                    // a cette fenetre et peut lever. L'affichage de la case ne doit pas en dependre.
                                    majorationCodeTableauVisible(cmp.getValue());
                                    if(cmp.getValue() === "INSTALLATION") {
                                        Ext.getCmp("lg_GROSSISTE_ID").show();
                                    } else {
                                        Ext.getCmp("lg_GROSSISTE_ID").hide();
                                    }
                                }
                            }
                        },
                        /* Meme question que sur la fiche article : associer un code tableau a un article qui
                         * n'en avait pas majore son prix de vente du taux KEY_TAUX_CODE_TABLEAU. Si les prix du
                         * parc portent deja cette majoration, il ne faut pas l'ajouter une seconde fois.
                         * A placer AVANT le fichier : la page qui recoit l'envoi lit les champs et le fichier
                         * dans l'ordre du formulaire, et doit connaitre ce choix avant de traiter le fichier. */
                        {
                            xtype: 'checkbox',
                            name: 'bool_MAJORER_PRIX_CODE_TABLEAU',
                            id: 'bool_MAJORER_PRIX_CODE_TABLEAU',
                            hidden: true,
                            // Sans colonne de libelle, la coche part de la gauche et sa legende
                            // dispose de toute la largeur de la fenetre : elle tient sur une ligne.
                            hideLabel: true,
                            margin: '5 0 5 0',
                            inputValue: '1',
                            uncheckedValue: '0',
                            checked: true,
                            boxLabel: 'Mettre aussi à jour le prix de vente (majoration du code tableau)'
                        },
                        {
                            xtype: 'displayfield',
                            id: 'aide_MAJORER_PRIX_CODE_TABLEAU',
                            hidden: true,
                            hideLabel: true,
                            fieldStyle: 'color:#777;font-style:italic;',
                            value: 'À décocher si les prix de vente du fichier contiennent déjà cette majoration : elle serait sinon ajoutée une seconde fois.'
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
            majorationCodeTableauVisible(Ext.getCmp('str_TYPE_TRANSACTION_IMPORT').getValue());
        }

        // Une seule fenetre a la fois : un nouveau clic remplace la precedente.
        if (winImportFamilleOuverte && !winImportFamilleOuverte.isDestroyed) {
            winImportFamilleOuverte.destroy();
        }
        var win = winImportFamilleOuverte = new Ext.window.Window({
            autoShow: true,
            modal: true,
            title: this.getTitre(),
            width: 620,
            height: 260,
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