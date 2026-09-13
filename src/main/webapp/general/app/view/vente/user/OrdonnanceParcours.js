/* global Ext */

/*
 * Parcours client + medecin d'une vente ordonnanciere (retour du 08/09, point 4).
 *
 * Avant : a la validation d'une vente portant un produit de l'ordonnancier, la fenetre des
 * medecins s'ouvrait, puis un message « Operation effectuee avec succes. Veuillez ajouter le
 * client » ouvrait a son tour la fenetre des clients : deux fenetres, l'une apres l'autre, et le
 * medecin AVANT le client.
 *
 * Maintenant : UN SEUL ecran modal, en deux volets - 1. le client, 2. le medecin - avec Retour et
 * Suivant, et rien ne se superpose. Le client est enregistre sur la vente des qu'il est choisi, le
 * medecin de meme : si l'on abandonne au second volet, le client reste acquis et seul le medecin
 * sera redemande a la validation.
 *
 * Les deux fenetres historiques (clientLambda, medecin) ne sont PAS touchees : elles servent
 * toujours aux autres parcours (mode de reglement exigeant un client, bouton « client » de la
 * vente, ajout d'un medecin depuis la grille).
 */
Ext.define('testextjs.view.vente.user.OrdonnanceParcours', {
    extend: 'Ext.window.Window',
    xtype: 'ordonnanceparcours',
    modal: true,
    closable: true,
    closeAction: 'destroy',
    width: '62%',
    height: 420,
    layout: 'fit',
    title: 'VENTE ORDONNANCIÈRE : CLIENT PUIS MÉDECIN',

    initComponent: function () {
        var me = this;
        me.clientStore = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.ClientLambda',
            pageSize: 50,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/lambda',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        me.medecinStore = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.MedecinModel',
            pageSize: 9999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/medecin/medecins',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        Ext.applyIf(me, {
            items: [{
                    xtype: 'panel',
                    itemId: 'volets',
                    border: false,
                    layout: 'card',
                    activeItem: 0,
                    items: [me.voletClient(), me.voletMedecin()]
                }],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    items: [{
                            xtype: 'tbtext',
                            itemId: 'etape',
                            text: '<b>Étape 1 sur 2</b> : choisissez le client'
                        }, '->', {
                            text: 'Retour',
                            itemId: 'btnRetour',
                            hidden: true
                        }, {
                            text: 'Suivant : le médecin',
                            itemId: 'btnSuivant',
                            disabled: true,
                            tooltip: 'Disponible dès qu\'un client est rattaché à la vente'
                        }, {
                            text: 'Annuler',
                            itemId: 'btnAnnuler',
                            iconCls: 'cancelicon'
                        }]
                }]
        });
        me.callParent(arguments);
    },

    voletClient: function () {
        var me = this;
        return {
            xtype: 'panel',
            itemId: 'voletClient',
            border: false,
            layout: {type: 'vbox', align: 'stretch'},
            items: [{
                    xtype: 'toolbar',
                    items: [{
                            xtype: 'textfield',
                            itemId: 'rechercheClient',
                            emptyText: 'Nom, prénom ou téléphone (2 caractères)',
                            flex: 1,
                            enableKeyEvents: true
                        }, {
                            text: 'Rechercher',
                            itemId: 'btnRechercherClient',
                            iconCls: 'searchicon'
                        }, {
                            text: 'Nouveau client',
                            itemId: 'btnNouveauClient',
                            iconCls: 'addicon'
                        }]
                }, {
                    xtype: 'grid',
                    itemId: 'grilleClients',
                    flex: 1,
                    store: me.clientStore,
                    viewConfig: {
                        emptyText: '<div style="margin:16px;color:#7f8c8d;">Tapez un nom pour rechercher le client, '
                                + 'ou créez-le avec « Nouveau client ».</div>',
                        deferEmptyText: false
                    },
                    columns: [
                        {xtype: 'rownumberer', width: 36},
                        {header: 'Nom', dataIndex: 'strFIRSTNAME', flex: 1},
                        {header: 'Prénom(s)', dataIndex: 'strLASTNAME', flex: 1},
                        {header: 'Téléphone', dataIndex: 'strADRESSE', width: 130},
                        {
                            xtype: 'actioncolumn',
                            width: 60,
                            align: 'center',
                            items: [{
                                    icon: 'resources/images/icons/add16.gif',
                                    tooltip: 'Choisir ce client',
                                    handler: function (grille, ligne) {
                                        grille.up('ordonnanceparcours').fireEvent('clientChoisi',
                                                grille.getStore().getAt(ligne));
                                    }
                                }]
                        }
                    ]
                }, {
                    xtype: 'form',
                    itemId: 'formulaireClient',
                    hidden: true,
                    bodyPadding: 8,
                    items: [{
                            xtype: 'fieldset',
                            title: 'Nouveau client',
                            layout: 'anchor',
                            defaults: {anchor: '100%', xtype: 'textfield', labelAlign: 'right', labelWidth: 100},
                            items: [
                                {fieldLabel: 'Nom', name: 'strFIRSTNAME', allowBlank: false, enableKeyEvents: true},
                                {fieldLabel: 'Prénom(s)', name: 'strLASTNAME', allowBlank: false, enableKeyEvents: true},
                                {fieldLabel: 'Téléphone', name: 'strADRESSE', enableKeyEvents: true},
                                {xtype: 'hiddenfield', name: 'lgTYPECLIENTID', value: '6'}
                            ]
                        }],
                    buttons: [{
                            text: 'Enregistrer et choisir',
                            itemId: 'btnEnregistrerClient'
                        }, {
                            text: 'Retour à la liste',
                            itemId: 'btnRetourListeClients'
                        }]
                }]
        };
    },

    voletMedecin: function () {
        var me = this;
        return {
            xtype: 'panel',
            itemId: 'voletMedecin',
            border: false,
            layout: {type: 'vbox', align: 'stretch'},
            items: [{
                    xtype: 'toolbar',
                    items: [{
                            xtype: 'textfield',
                            itemId: 'rechercheMedecin',
                            emptyText: 'Nom ou numéro d\'ordre (2 caractères)',
                            flex: 1,
                            enableKeyEvents: true
                        }, {
                            text: 'Rechercher',
                            itemId: 'btnRechercherMedecin',
                            iconCls: 'searchicon'
                        }, {
                            text: 'Nouveau médecin',
                            itemId: 'btnNouveauMedecin',
                            iconCls: 'addicon'
                        }]
                }, {
                    xtype: 'grid',
                    itemId: 'grilleMedecins',
                    flex: 1,
                    store: me.medecinStore,
                    viewConfig: {
                        emptyText: '<div style="margin:16px;color:#7f8c8d;">Aucun médecin.</div>',
                        deferEmptyText: false
                    },
                    columns: [
                        {xtype: 'rownumberer', width: 36},
                        {header: 'Nom et prénom(s)', dataIndex: 'nom', flex: 1},
                        {header: 'Numéro ordre', dataIndex: 'numOrdre', width: 140},
                        {header: 'Commentaire', dataIndex: 'commentaire', flex: 1},
                        {
                            xtype: 'actioncolumn',
                            width: 60,
                            align: 'center',
                            items: [{
                                    icon: 'resources/images/icons/add16.gif',
                                    tooltip: 'Choisir ce médecin',
                                    handler: function (grille, ligne) {
                                        grille.up('ordonnanceparcours').fireEvent('medecinChoisi',
                                                grille.getStore().getAt(ligne));
                                    }
                                }]
                        }
                    ]
                }, {
                    xtype: 'form',
                    itemId: 'formulaireMedecin',
                    hidden: true,
                    bodyPadding: 8,
                    items: [{
                            xtype: 'fieldset',
                            title: 'Nouveau médecin',
                            layout: 'anchor',
                            defaults: {anchor: '100%', xtype: 'textfield', labelAlign: 'right', labelWidth: 120},
                            items: [
                                {fieldLabel: 'Nom et prénom(s)', name: 'nom', allowBlank: false, enableKeyEvents: true},
                                {fieldLabel: 'Numéro ordre', name: 'numOrdre', allowBlank: false, enableKeyEvents: true},
                                {fieldLabel: 'Commentaire', name: 'commentaire', xtype: 'textareafield', grow: true}
                            ]
                        }],
                    buttons: [{
                            text: 'Enregistrer et choisir',
                            itemId: 'btnEnregistrerMedecin'
                        }, {
                            text: 'Retour à la liste',
                            itemId: 'btnRetourListeMedecins'
                        }]
                }]
        };
    },

    /** Affiche le volet demande (0 = client, 1 = medecin) et regle les boutons du pied. */
    allerAuVolet: function (numero) {
        var me = this;
        me.down('#volets').getLayout().setActiveItem(numero);
        me.down('#btnRetour').setVisible(numero === 1);
        me.down('#btnSuivant').setVisible(numero === 0);
        me.down('#etape').setText(numero === 0
                ? '<b>Étape 1 sur 2</b> : choisissez le client'
                : '<b>Étape 2 sur 2</b> : choisissez le médecin prescripteur');
        var champ = me.down(numero === 0 ? '#rechercheClient' : '#rechercheMedecin');
        if (champ) {
            champ.focus(false, 150);
        }
    },

    /** Le client est acquis : « Suivant » s'ouvre. */
    clientAcquis: function () {
        this.down('#btnSuivant').enable();
    },

    basculerFormulaire: function (volet, afficher) {
        var formulaire = this.down(volet === 'client' ? '#formulaireClient' : '#formulaireMedecin');
        var grille = this.down(volet === 'client' ? '#grilleClients' : '#grilleMedecins');
        formulaire.setVisible(afficher);
        grille.setVisible(!afficher);
        if (afficher) {
            formulaire.getForm().reset();
            var premier = formulaire.getForm().getFields().first();
            if (premier) {
                premier.focus(false, 150);
            }
        }
    }
});
