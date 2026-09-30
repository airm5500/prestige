/* global Ext */

/*
 * « GESTION ORDONNANCES CLIENTS » (evolution 6, point 2, vague 1).
 *
 * Un menu autonome : on choisit ou l'on cree un client, on enregistre ses ordonnances au fil du temps, et on
 * relit son historique. Une ordonnance est ici un DOCUMENT rattache au dossier du client ; l'enregistrer ne
 * cree aucune vente, ne bouge aucune unite de stock et n'ecrit pas dans l'ordonnancier reglementaire.
 *
 * Deux vues dans un layout card, et non une fenetre modale par-dessus la liste : l'officine a demande qu'aucun
 * ecran ne s'ouvre en pop-up. On passe de l'historique a la fiche et on revient, comme dans l'ecran des depots.
 *
 * La fiche n'est PAS un formulaire de vente : ni prix, ni stock, ni total. Les quantites prescrites ne sont pas
 * des quantites delivrees - les confondre serait le premier contresens possible sur cet ecran.
 *
 * Retours du 22/09 : actions PAR LIGNE a droite de l'historique (consulter, modifier, imprimer, suivi de
 * consommation, annuler) ; contexte clinique enregistre avec l'ordonnance et analyse Posos depuis la fiche (les
 * deux menus sont lies) ; quantite SERVIE ligne par ligne ; suivi de consommation du client (troisieme vue) ;
 * onglet « Analyse des ordonnances ».
 */
Ext.define('testextjs.view.serviceclient.ordonnance.OrdonnanceClientManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'ordonnanceclient',
    itemId: 'ordonnanceClient',
    frame: true,
    title: 'ORDONNANCES CLIENTS',
    width: '99%',
    height: 'auto',
    minHeight: 560,
    cls: 'custompanel',
    layout: {
        type: 'card',
        deferredRender: false
    },
    activeItem: 0,

    initComponent: function () {
        var me = this;

        /* --------------------------------------------------------------- stores */

        /* Historique. Charge a la demande : ouvrir l'ecran ne doit pas tirer une requete inutile. */
        me.storeOrdonnances = new Ext.data.Store({
            fields: [
                {name: 'id', type: 'string'},
                {name: 'numero', type: 'string'},
                {name: 'dateOrdonnance', type: 'string'},
                {name: 'statut', type: 'string'},
                {name: 'motifAnnulation', type: 'string'},
                {name: 'etablissement', type: 'string'},
                {name: 'observations', type: 'string'},
                {name: 'clientId', type: 'string'},
                {name: 'client', type: 'string'},
                {name: 'typeClient', type: 'string'},
                {name: 'telephone', type: 'string'},
                {name: 'medecinId', type: 'string'},
                {name: 'medecin', type: 'string'},
                {name: 'nbProduits', type: 'int'},
                {name: 'nbPieces', type: 'int'},
                {name: 'creeLe', type: 'string'},
                {name: 'creePar', type: 'string'},
                {name: 'modifieLe', type: 'string'},
                {name: 'modifiePar', type: 'string'},
                {name: 'etatService', type: 'string'},
                {name: 'nbRenseignees', type: 'int'},
                {name: 'nbServies', type: 'int'},
                /* Reste a delivrer (30/09) : lignes encore dues et quantite encore due. */
                {name: 'nbReste', type: 'int'},
                {name: 'qteReste', type: 'int'},
                /* Renouvellements (30/09). */
                {name: 'origineId', type: 'string'},
                {name: 'origineNumero', type: 'string'},
                {name: 'rang', type: 'int'},
                {name: 'renouvAutorises', type: 'int'},
                {name: 'renouvFaits', type: 'int'},
                {name: 'prochainRenouvellement', type: 'string'}
            ],
            pageSize: 50,
            autoLoad: false,
            remoteSort: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ordonnance-client/liste',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Clients : la MEME ressource que les autres ecrans (v1/client/list), donc les memes clients. */
        me.storeClients = new Ext.data.Store({
            /* L'identifiant du client EST l'identifiant de l'enregistrement : un enregistrement pose a la main
               par la fiche en a alors un, et le modele de selection du combo ne tombe pas sur getId(). */
            idProperty: 'lgCLIENTID',
            fields: [
                {name: 'lgCLIENTID', type: 'string'},
                {name: 'strFIRSTNAME', type: 'string'},
                {name: 'strLASTNAME', type: 'string'},
                {name: 'strTELEPHONE', type: 'string'},
                {name: 'typeClient', type: 'string'},
                /* Libelle du type (Standard, Assurance, Carnet...) rendu par v1/client/list : pastille de la fiche. */
                {name: 'libelleTypeClient', type: 'string'},
                {name: 'nomComplet',
                    convert: function (v, rec) {
                        return Ext.String.trim((rec.get('strFIRSTNAME') || '') + ' '
                                + (rec.get('strLASTNAME') || ''));
                    }}
            ],
            pageSize: 30,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/list',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        me.storeTypesClient = new Ext.data.Store({
            fields: [{name: 'id', type: 'string'}, {name: 'nom', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ordonnance-client/types-client',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        me.storeMedecins = new Ext.data.Store({
            fields: [{name: 'id', type: 'string'}, {name: 'nom', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ordonnance-client/medecins',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        me.storeEtablissements = new Ext.data.Store({
            fields: [{name: 'nom', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ordonnance-client/etablissements',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Articles du referentiel, pour les produits prescrits : la meme recherche que la caisse. */
        me.storeArticles = new Ext.data.Store({
            fields: [
                {name: 'lgFAMILLEID', type: 'string'},
                {name: 'strNAME', type: 'string'},
                {name: 'intCIP', type: 'string'},
                /* Stock et prix, affiches dans la liste de recherche (22/09) : stock en bleu, prix en rouge. */
                {name: 'intNUMBERAVAILABLE', type: 'int'},
                {name: 'intPRICE', type: 'int'}
            ],
            pageSize: 15,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/vente/search',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Pieces justificatives de l'ordonnance ouverte (vague 2). */
        me.storePieces = new Ext.data.Store({
            fields: [
                {name: 'id', type: 'string'},
                {name: 'nom', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'taille', type: 'int'},
                {name: 'deposeeLe', type: 'string'},
                {name: 'deposeePar', type: 'string'}
            ],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ordonnance-client/pieces/0',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Produits de l'ordonnance en cours de saisie : store local, ecrit seulement a l'enregistrement. */
        me.storeProduits = new Ext.data.Store({
            fields: [
                {name: 'articleId', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'cip', type: 'string'},
                {name: 'quantite', type: 'int', defaultValue: 1},
                {name: 'posologie', type: 'string'},
                {name: 'duree', type: 'string'},
                /* null = pas encore renseigne, 0 = non servi : les deux ne se confondent pas. */
                {name: 'qteServie', type: 'int', useNull: true}
            ],
            data: []
        });

        /* Alertes Posos : la meme forme que l'ecran Analyse posologie, dont on reprend le service. */
        var champsAlertes = [
            {name: 'type', type: 'string'},
            {name: 'gravite', type: 'string'},
            {name: 'libelle', type: 'string'},
            {name: 'produits', type: 'auto'},
            {name: 'recommandation', type: 'string'},
            {name: 'majeure', type: 'boolean'},
            {name: 'equivalents'},
            {name: 'proposer'},
            {name: 'aRemplacer'}
        ];
        me.storeAlertesFiche = new Ext.data.Store({fields: champsAlertes, data: []});

        /* Equivalents d'un produit (23/09) : memes DCI, « equivalent direct » ou « a adapter ». */
        me.storeSubstituts = new Ext.data.Store({
            fields: ['id', 'nom', 'cip', {name: 'prix', type: 'int'}, {name: 'stock', type: 'int'}, 'niveau', 'raison',
                {name: 'detail', type: 'boolean'}],
            data: []
        });
        me.storeAlertesConso = new Ext.data.Store({fields: champsAlertes, data: []});

        /* Suivi de consommation du client (22/09) : le service de la gestion des clients, plus le stock. */
        me.storeConso = new Ext.data.Store({
            fields: [
                {name: 'familleId', type: 'string'},
                {name: 'cip', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'premierAchat', type: 'string'},
                {name: 'dernierAchat', type: 'string'},
                {name: 'nbAchats', type: 'int'},
                {name: 'qteTotale', type: 'int'},
                {name: 'qteMoyenne', type: 'float'},
                {name: 'frequenceJours', type: 'int'},
                {name: 'montant', type: 'int'},
                {name: 'habitude', type: 'string'},
                {name: 'stock', type: 'int', useNull: true}
            ],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ordonnance-client/client/0/consommation',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Ventilations de l'analyse des ordonnances : memes colonnes pour les trois axes. */
        var champsVentilation = ['libelle', 'ordonnances', 'part', 'annulees', 'tauxAnnulation', 'lignes',
            'lignesRenseignees', 'satisfaction', 'tauxService', 'servies', 'partielles', 'nonServies',
            'aRenseigner', 'clients'];
        me.storeParPrescripteur = new Ext.data.Store({fields: champsVentilation, data: []});
        me.storeParEtablissement = new Ext.data.Store({fields: champsVentilation, data: []});
        me.storeParType = new Ext.data.Store({fields: champsVentilation, data: []});
        me.storeProduitsAnalyse = new Ext.data.Store({
            fields: ['produit', 'nbPrescriptions', 'qtePrescrite', 'nbRenseignees', 'nbServies', 'qteServie',
                'satisfaction'],
            data: []
        });

        Ext.applyIf(me, {
            /*
             * Carte 0 : les onglets Historique / Analyse. Carte 1 : la fiche. Carte 2 : le suivi de
             * consommation d'un client. Les numeros de carte ne bougent pas : l'historique reste la carte 0.
             */
            items: [{
                    xtype: 'tabpanel',
                    itemId: 'onglets',
                    border: false,
                    plain: true,
                    items: [me.vueHistorique(), me.vueAnalyse()]
                }, me.vueFiche(), me.vueConso()]
        });
        me.callParent(arguments);
    },

    /* ================================================================= historique */

    vueHistorique: function () {
        var me = this;
        return {
            xtype: 'panel',
            itemId: 'vueHistorique',
            title: 'Historique',
            border: false,
            layout: {type: 'vbox', align: 'stretch'},
            items: [me.barreCriteres(), me.grilleHistorique()]
        };
    },

    barreCriteres: function () {
        var me = this;
        return {
            xtype: 'toolbar',
            itemId: 'barreCriteres',
            padding: 6,
            /*
             * Deux rangees : les criteres au-dessus, les actions en dessous. Une seule rangee obligerait a
             * defiler horizontalement sur un ecran de comptoir en 1280 de large.
             */
            layout: {type: 'vbox', align: 'stretch'},
            items: [{
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    defaults: {margin: '0 6 4 0'},
                    items: [{
                            xtype: 'textfield',
                            itemId: 'recherche',
                            emptyText: 'N° ordonnance, client, prescripteur...',
                            width: 250,
                            enableKeyEvents: true
                        }, {
                            xtype: 'combobox',
                            itemId: 'typeClient',
                            fieldLabel: 'Type',
                            labelWidth: 40,
                            width: 200,
                            store: me.storeTypesClient,
                            displayField: 'nom',
                            valueField: 'id',
                            queryMode: 'local',
                            editable: false,
                            emptyText: 'Tous'
                        }, {
                            xtype: 'combobox',
                            itemId: 'client',
                            fieldLabel: 'Client',
                            labelWidth: 42,
                            /* Elargi (22/09) : un nom ne doit plus passer sur deux lignes. */
                            width: 360,
                            store: me.storeClients,
                            displayField: 'nomComplet',
                            valueField: 'lgCLIENTID',
                            queryParam: 'query',
                            minChars: 2,
                            typeAhead: false,
                            emptyText: 'Tous les clients',
                            listConfig: me.listeClients()
                        }, {
                            xtype: 'datefield',
                            itemId: 'dtStart',
                            fieldLabel: 'Du',
                            labelWidth: 24,
                            width: 150,
                            format: 'd/m/Y',
                            emptyText: 'début'
                        }, {
                            xtype: 'datefield',
                            itemId: 'dtEnd',
                            fieldLabel: 'au',
                            labelWidth: 24,
                            width: 150,
                            format: 'd/m/Y',
                            emptyText: 'fin'
                        }]
                }, {
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    defaults: {margin: '0 6 0 0'},
                    items: [{
                            xtype: 'combobox',
                            itemId: 'medecin',
                            fieldLabel: 'Prescripteur',
                            labelWidth: 78,
                            width: 300,
                            store: me.storeMedecins,
                            displayField: 'nom',
                            valueField: 'id',
                            queryMode: 'local',
                            emptyText: 'Tous'
                        }, {
                            xtype: 'checkbox',
                            itemId: 'annulees',
                            boxLabel: 'Voir aussi les ordonnances annulées'
                        }, {
                            /* Reste a delivrer (30/09) : les ordonnances servies en partie, encore dues. */
                            xtype: 'checkbox',
                            itemId: 'reste',
                            margin: '0 6 0 12',
                            boxLabel: 'Avec un reste à délivrer'
                        }, {
                            /* Renouvellements (30/09) : echeance passee ou dans la semaine. */
                            xtype: 'checkbox',
                            itemId: 'renouveler',
                            margin: '0 6 0 12',
                            boxLabel: 'À renouveler (7 jours)'
                        }, {
                            xtype: 'button',
                            itemId: 'rechercher',
                            text: 'Rechercher',
                            iconCls: 'search'
                        }, {
                            xtype: 'button',
                            itemId: 'reinitialiser',
                            text: 'Réinitialiser'
                        }]
                }]
        };
    },

    grilleHistorique: function () {
        var me = this;
        return {
            xtype: 'gridpanel',
            itemId: 'grilleOrdonnances',
            flex: 1,
            minHeight: 380,
            store: me.storeOrdonnances,
            columnLines: true,
            loadMask: true,
            viewConfig: {
                /*
                 * Une ordonnance annulee reste visible et se LIT comme telle : barree et grisee. Elle ne
                 * disparait pas de l'historique du patient - c'est tout l'interet de ne pas supprimer.
                 */
                getRowClass: function (record) {
                    return record.get('statut') === 'annulee' ? 'ordonnance-annulee' : '';
                }
            },
            columns: [
                {text: 'N°', dataIndex: 'numero', width: 140, itemId: 'colNumero'},
                {text: 'DATE', dataIndex: 'dateOrdonnance', width: 100, itemId: 'colDate',
                    renderer: function (v) {
                        return v ? Ext.Date.format(Ext.Date.parse(v, 'Y-m-d'), 'd/m/Y') : '';
                    }},
                {text: 'CLIENT', dataIndex: 'client', flex: 2, itemId: 'colClient', renderer: me.texteAvecBulle},
                {text: 'TYPE', dataIndex: 'typeClient', width: 100},
                {text: 'PRESCRIPTEUR', dataIndex: 'medecin', flex: 2, itemId: 'colMedecin', renderer: me.texteAvecBulle},
                {text: 'ÉTABLISSEMENT', dataIndex: 'etablissement', flex: 2, renderer: me.texteAvecBulle},
                {text: 'PRODUITS', dataIndex: 'nbProduits', width: 90, align: 'right'},
                {text: 'PIÈCES', dataIndex: 'nbPieces', width: 80, align: 'right', itemId: 'colPieces'},
                {text: 'SAISIE', dataIndex: 'creeLe', width: 130},
                {text: 'PAR', dataIndex: 'creePar', width: 130},
                {text: 'ÉTAT', dataIndex: 'statut', width: 90, itemId: 'colStatut',
                    renderer: function (v, meta, rec) {
                        if (v !== 'annulee') {
                            return '';
                        }
                        meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(rec.get('motifAnnulation') || '') + '"';
                        return 'Annulée';
                    }},
                {text: 'SERVICE', dataIndex: 'etatService', width: 110, itemId: 'colService',
                    renderer: function (v, meta, rec) {
                        if (rec.get('statut') === 'annulee') {
                            return '';
                        }
                        meta.tdAttr = 'data-qtip="' + rec.get('nbServies') + ' ligne(s) servie(s) en entier sur '
                                + rec.get('nbProduits') + ' - ' + rec.get('nbRenseignees') + ' renseignée(s)"';
                        return me.badgeService(v);
                    }},
                {text: 'RENOUV.', dataIndex: 'renouvAutorises', width: 120, align: 'center', itemId: 'colRenouv',
                    renderer: function (v, meta, rec) {
                        if (rec.get('statut') === 'annulee') {
                            return '';
                        }
                        if (rec.get('rang') > 0) {
                            meta.tdAttr = 'data-qtip="Renouvellement de ' + Ext.String.htmlEncode(rec.get('origineNumero')) + '"';
                            return 'Renouv. ' + rec.get('rang') + '/' + rec.get('renouvAutorises');
                        }
                        if (!v) {
                            return '';
                        }
                        var prochain = rec.get('prochainRenouvellement');
                        if (!prochain) {
                            return rec.get('renouvFaits') + '/' + v + ' — terminé';
                        }
                        var date = Ext.Date.parse(prochain, 'Y-m-d');
                        var jours = Math.round((date - Ext.Date.clearTime(new Date(), true)) / 86400000);
                        var cls = jours < 0 ? 'ordo-etat-non_servie' : (jours <= 7 ? 'ordo-etat-reste' : 'ordo-etat-a_renseigner');
                        meta.tdAttr = 'data-qtip="Prochain renouvellement le ' + Ext.Date.format(date, 'd/m/Y') + '"';
                        return '<span class="ordo-etat ' + cls + '">' + rec.get('renouvFaits') + '/' + v + ' · '
                                + Ext.Date.format(date, 'd/m') + '</span>';
                    }},
                {text: 'RESTE', dataIndex: 'qteReste', width: 100, align: 'center', itemId: 'colReste',
                    renderer: function (v, meta, rec) {
                        if (rec.get('statut') === 'annulee' || !v) {
                            return '';
                        }
                        meta.tdAttr = 'data-qtip="' + rec.get('nbReste') + ' ligne(s) servie(s) en partie ou non servie(s)"';
                        return '<span class="ordo-etat ordo-etat-reste">' + v + ' à servir</span>';
                    }},
                {
                    /*
                     * Actions PAR LIGNE, a droite (22/09) : plus besoin de selectionner la ligne puis de chercher
                     * le bouton en haut. Chaque icone porte sa propre classe, pour que les tests la trouvent.
                     */
                    xtype: 'actioncolumn',
                    itemId: 'colActions',
                    text: 'ACTIONS',
                    width: 130,
                    align: 'center',
                    menuDisabled: true,
                    sortable: false,
                    items: [
                        me.action('consulter', 'application_view_list.png', 'Consulter'),
                        me.action('modifier', 'page_white_edit.png', 'Modifier', true),
                        me.action('imprimer', 'printer.png', 'Imprimer la fiche'),
                        me.action('conso', 'chart_bar.png', 'Suivi de consommation du client'),
                        me.action('annuler', 'delete.png', 'Annuler l\'ordonnance', true)
                    ]
                }
            ],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'button',
                            itemId: 'imprimerHistorique',
                            text: 'Imprimer l\'historique',
                            iconCls: 'printable',
                            cls: 'ordo-btn'
                        }, {
                            xtype: 'button',
                            itemId: 'exporterExcel',
                            text: 'Exporter Excel',
                            iconCls: 'icon-excel',
                            cls: 'ordo-btn'
                        }, {
                            xtype: 'tbtext',
                            itemId: 'rappelHistorique',
                            text: 'De la plus récente à la plus ancienne - actions à droite de chaque ligne.',
                            style: 'color:#777'
                        }, '->', {
                            /* A DROITE (22/09), dans une toolbar : le '->' y est fiable, contrairement a un
                               remplissage dans un conteneur des criteres. */
                            xtype: 'button',
                            itemId: 'nouvelle',
                            text: 'Nouvelle ordonnance',
                            iconCls: 'add',
                            cls: 'ordo-btn-primaire',
                            scale: 'medium'
                        }]
                }, {
                    xtype: 'pagingtoolbar',
                    dock: 'bottom',
                    store: me.storeOrdonnances,
                    displayInfo: true,
                    displayMsg: 'Ordonnances {0} - {1} sur {2}',
                    emptyMsg: 'Aucune ordonnance pour ces critères'
                }]
        };
    },

    /* ====================================================================== fiche */

    vueFiche: function () {
        var me = this;
        return {
            xtype: 'form',
            itemId: 'vueFiche',
            border: false,
            autoScroll: true,
            bodyPadding: 8,
            cls: 'ordo-fiche',
            layout: {type: 'vbox', align: 'stretch'},
            /*
             * Presentation B (retour du 30/09) : le PATIENT a gauche, avec son contexte clinique, reste sous les yeux
             * pendant toute la saisie ; l'ordonnance et ses produits a droite.
             */
            items: [{
                    xtype: 'container',
                    itemId: 'blocSaisie',
                    height: 400,
                    layout: {type: 'hbox', align: 'stretch'},
                    items: [me.blocPatient(), {
                            xtype: 'container',
                            flex: 1,
                            margin: '0 0 0 10',
                            layout: {type: 'vbox', align: 'stretch'},
                            items: [me.enteteFiche(), me.grilleProduits()]
                        }]
                }, me.grilleSubstituts(), me.grilleAlertes('alertesFiche', me.storeAlertesFiche), {
                    xtype: 'textareafield',
                    itemId: 'observations',
                    fieldLabel: 'Observations',
                    labelWidth: 110,
                    height: 70,
                    margin: '8 0 8 0',
                    maxLength: 2000
                }, me.grillePieces()],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'bottom',
                    cls: 'ordo-pied',
                    items: [{
                            xtype: 'button',
                            itemId: 'imprimerFicheOuverte',
                            text: 'Imprimer cette ordonnance',
                            iconCls: 'printable',
                            cls: 'ordo-btn',
                            scale: 'medium',
                            disabled: true
                        }, {
                            /*
                             * Prevente depuis l'ordonnance (30/09) : une vente en attente, reprise a la caisse. Standard =
                             * comptant, assurance et carnet = leur tiers payant principal.
                             */
                            xtype: 'button',
                            itemId: 'creerPrevente',
                            text: 'Créer la prévente',
                            icon: 'resources/images/icons/fam/panier.png',
                            cls: 'ordo-btn',
                            scale: 'medium',
                            disabled: true,
                            tooltip: 'Prépare une vente en attente avec ce qui reste à servir, à reprendre à la caisse'
                        }, {
                            /* Renouvellement (30/09) : une nouvelle ordonnance liee, datee du jour. */
                            xtype: 'button',
                            itemId: 'renouvelerFiche',
                            text: 'Renouveler',
                            icon: 'resources/images/icons/fam/page_copy.png',
                            cls: 'ordo-btn',
                            scale: 'medium',
                            disabled: true,
                            tooltip: 'Crée le renouvellement suivant : mêmes produits, daté d\'aujourd\'hui'
                        }, {
                            xtype: 'button',
                            itemId: 'rappelRenouvellement',
                            text: 'Rappel SMS',
                            icon: 'resources/images/icons/fam/rss_go.png',
                            cls: 'ordo-btn',
                            scale: 'medium',
                            disabled: true,
                            tooltip: 'Envoie maintenant au client le SMS de rappel du prochain renouvellement'
                        }, {
                            xtype: 'tbtext',
                            itemId: 'preventesFiche',
                            text: ''
                        }, '->', {
                            xtype: 'button',
                            itemId: 'enregistrer',
                            text: 'Enregistrer',
                            iconCls: 'save',
                            cls: 'ordo-btn-primaire',
                            scale: 'medium'
                        }, {
                            /*
                             * Un seul bouton de sortie (30/09) : l'ancien « Abandonner » et le « Retour a l'historique »
                             * du haut faisaient la meme chose. Il demande confirmation si une saisie est en cours.
                             */
                            xtype: 'button',
                            itemId: 'retourHistorique',
                            text: 'Retour à l\'historique',
                            iconCls: 'back',
                            cls: 'ordo-btn',
                            scale: 'medium'
                        }]
                }]
        };
    },

    /** Le patient et son contexte clinique (30/09) : colonne de gauche de la fiche. */
    blocPatient: function () {
        var me = this;
        return {
            xtype: 'fieldset',
            itemId: 'blocPatient',
            title: 'Patient',
            /* Assez large pour un nom complet sur une ligne (22/09) : le champ client y fait environ 370 px. */
            width: 420,
            padding: '4 10 8 10',
            layout: {type: 'vbox', align: 'stretch'},
            items: [{
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'bottom'},
                    items: [{
                            xtype: 'combobox',
                            itemId: 'ficheClient',
                            fieldLabel: 'Client *',
                            labelAlign: 'top',
                            flex: 1,
                            allowBlank: false,
                            store: me.storeClients,
                            displayField: 'nomComplet',
                            valueField: 'lgCLIENTID',
                            queryParam: 'query',
                            minChars: 2,
                            typeAhead: false,
                            emptyText: 'Chercher un client (carnet, assurance, standard)',
                            listConfig: me.listeClients()
                        }, me.boutonPlus('nouveauClient', 'Nouveau client (client standard)')]
                }, {
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    margin: '6 0 0 0',
                    items: [{
                            xtype: 'component',
                            itemId: 'typeClientFiche',
                            flex: 1,
                            html: ''
                        }, {
                            xtype: 'button',
                            itemId: 'consoFiche',
                            text: 'Suivi de consommation',
                            icon: 'resources/images/icons/fam/chart_bar.png',
                            cls: 'ordo-btn',
                            tooltip: 'Achats, fréquence et stock des produits de ce client'
                        }]
                }, {
                    /* Les AUTRES ordonnances du client encore dues (30/09), avec un lien pour les voir. */
                    xtype: 'component',
                    itemId: 'resteClient',
                    margin: '6 0 0 0',
                    hidden: true,
                    html: ''
                }, {
                    xtype: 'component',
                    itemId: 'contexteClinique',
                    margin: '14 0 6 0',
                    /* Aucune technologie nommee (30/09) : l'analyse peut s'appuyer sur plusieurs sources. */
                    html: '<div class="ordo-sous-titre">Contexte clinique (facultatif)</div>'
                            + '<div class="ordo-aide">Sert à l\'analyse, aucune donnée du client ne sort.</div>'
                }, {
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    items: [{
                            xtype: 'numberfield',
                            itemId: 'agePatient',
                            fieldLabel: 'Âge',
                            labelWidth: 34,
                            width: 110,
                            minValue: 0,
                            maxValue: 130,
                            allowDecimals: false,
                            hideTrigger: true,
                            emptyText: 'ans'
                        }, {
                            xtype: 'combobox',
                            itemId: 'sexePatient',
                            fieldLabel: 'Sexe',
                            labelWidth: 40,
                            margin: '0 0 0 16',
                            flex: 1,
                            editable: false,
                            queryMode: 'local',
                            store: [['', '—'], ['F', 'Féminin'], ['M', 'Masculin']],
                            value: ''
                        }]
                }, {
                    xtype: 'container',
                    layout: 'column',
                    margin: '8 0 0 0',
                    defaults: {columnWidth: 0.5},
                    items: [{
                            xtype: 'checkbox', itemId: 'grossesse', boxLabel: 'Grossesse'
                        }, {
                            xtype: 'checkbox', itemId: 'allaitement', boxLabel: 'Allaitement'
                        }, {
                            xtype: 'checkbox', itemId: 'insuffisanceRenale', boxLabel: 'Insuffisance rénale'
                        }, {
                            xtype: 'checkbox', itemId: 'insuffisanceHepatique', boxLabel: 'Insuffisance hépatique'
                        }]
                }]
        };
    },

    /** Bouton « + » de creation rapide, pose a droite de son champ (30/09). */
    boutonPlus: function (itemId, info) {
        return {
            xtype: 'button',
            itemId: itemId,
            text: '+',
            cls: 'ordo-btn ordo-btn-plus',
            margin: '0 0 0 6',
            tooltip: info
        };
    },

    enteteFiche: function () {
        var me = this;
        return {
            xtype: 'fieldset',
            itemId: 'enteteOrdonnance',
            /* Le N° de l'ordonnance est dans ce titre (30/09) : voir le controleur, titreFiche. */
            title: 'Nouvelle ordonnance',
            padding: '4 10 8 10',
            layout: {type: 'vbox', align: 'stretch'},
            items: [{
                    xtype: 'hiddenfield', itemId: 'ordonnanceId'
                }, {
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    items: [{
                            xtype: 'combobox',
                            itemId: 'ficheMedecin',
                            fieldLabel: 'Prescripteur',
                            labelWidth: 110,
                            flex: 1,
                            store: me.storeMedecins,
                            displayField: 'nom',
                            valueField: 'id',
                            queryMode: 'local',
                            emptyText: 'Si connu',
                            /* Facultatif : « le prescripteur et l'etablissement, SI DISPONIBLES ». */
                            allowBlank: true
                        }, me.boutonPlus('nouveauMedecin', 'Nouveau prescripteur'), {
                            xtype: 'datefield',
                            itemId: 'ficheDate',
                            fieldLabel: 'Date *',
                            labelWidth: 50,
                            width: 180,
                            margin: '0 0 0 16',
                            format: 'd/m/Y',
                            allowBlank: false,
                            /* Une ordonnance datee de demain n'existe pas : le champ le refuse, le serveur aussi. */
                            maxValue: new Date()
                        }]
                }, {
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    margin: '6 0 0 0',
                    items: [{
                            xtype: 'combobox',
                            itemId: 'ficheEtablissement',
                            fieldLabel: 'Établissement',
                            labelWidth: 110,
                            flex: 1,
                            store: me.storeEtablissements,
                            displayField: 'nom',
                            valueField: 'nom',
                            queryParam: 'query',
                            minChars: 2,
                            /*
                             * Saisie LIBRE avec propositions : il n'existe pas de referentiel des etablissements,
                             * et en imposer un a alimenter ferait que le champ resterait vide.
                             */
                            forceSelection: false,
                            emptyText: 'Si connu (saisie libre)',
                            maxLength: 100
                        }, me.boutonPlus('nouvelEtablissement', 'Nouvel établissement'), {
                            xtype: 'component', width: 196
                        }]
                }, {
                    /*
                     * Renouvellements (30/09) : sur l'ordonnance d'ORIGINE. Un renouvellement affiche seulement son
                     * rang et son origine.
                     */
                    xtype: 'container',
                    itemId: 'ligneRenouvellement',
                    layout: {type: 'hbox', align: 'middle'},
                    margin: '6 0 0 0',
                    items: [{
                            xtype: 'numberfield',
                            itemId: 'renouvellements',
                            fieldLabel: 'Renouvelable',
                            labelWidth: 110,
                            width: 170,
                            minValue: 0,
                            maxValue: 12,
                            allowDecimals: false,
                            value: 0
                        }, {
                            xtype: 'displayfield', value: 'fois, tous les', margin: '0 8 0 8'
                        }, {
                            xtype: 'numberfield',
                            itemId: 'periodicite',
                            hideLabel: true,
                            width: 70,
                            minValue: 1,
                            maxValue: 365,
                            allowDecimals: false,
                            value: 30
                        }, {
                            xtype: 'displayfield', value: 'jours', margin: '0 0 0 8'
                        }, {
                            xtype: 'component',
                            itemId: 'infoRenouvellement',
                            flex: 1,
                            margin: '0 0 0 16',
                            html: ''
                        }]
                }]
        };
    },

    /**
     * Fenetres de creation rapide (30/09) : client standard, prescripteur, etablissement. Ce sont des SAISIES, pas
     * des editions : la regle « pas de pop-up » vise les editions, qui restent dans un onglet. Les identifiants
     * des champs sont ceux des anciens formulaires en ligne : le controleur les lit de la meme facon.
     */
    fenetreCreation: function (genre) {
        var modeles = {
            client: {
                itemId: 'fenNouveauClient', titre: 'Nouveau client',
                aide: 'Le client est créé en client standard et choisi dans la fiche.',
                creer: 'creerClient', annuler: 'annulerClient',
                champs: [
                    {xtype: 'textfield', itemId: 'ncNom', fieldLabel: 'Nom *', allowBlank: false, maxLength: 100},
                    {xtype: 'textfield', itemId: 'ncPrenom', fieldLabel: 'Prénom(s) *', allowBlank: false,
                        maxLength: 100},
                    {xtype: 'textfield', itemId: 'ncTelephone', fieldLabel: 'Téléphone *', allowBlank: false,
                        maskRe: /[0-9 +.]/, maxLength: 30},
                    {xtype: 'combobox', itemId: 'ncSexe', fieldLabel: 'Genre', editable: false, queryMode: 'local',
                        store: [['', '—'], ['F', 'Féminin'], ['M', 'Masculin']], value: ''},
                    {xtype: 'checkbox', itemId: 'ncConsentement', fieldLabel: '&nbsp;', labelSeparator: '',
                        boxLabel: 'Accepte SMS / WhatsApp', checked: true}
                ]
            },
            medecin: {
                itemId: 'fenNouveauMedecin', titre: 'Nouveau prescripteur',
                aide: 'Un prescripteur de même nom et prénom existant n\'est pas recréé : il est choisi.',
                creer: 'creerMedecin', annuler: 'annulerMedecin',
                champs: [
                    {xtype: 'textfield', itemId: 'nmNom', fieldLabel: 'Nom *', allowBlank: false, maxLength: 40},
                    {xtype: 'textfield', itemId: 'nmPrenom', fieldLabel: 'Prénom', maxLength: 40},
                    {xtype: 'textfield', itemId: 'nmSpecialite', fieldLabel: 'Spécialité', maxLength: 100},
                    {xtype: 'textfield', itemId: 'nmTelephone', fieldLabel: 'Téléphone', maskRe: /[0-9 +.]/,
                        maxLength: 20}
                ]
            },
            etablissement: {
                itemId: 'fenNouvelEtablissement', titre: 'Nouvel établissement',
                aide: 'L\'établissement est choisi dans la fiche et proposé dans les ordonnances suivantes.',
                creer: 'ajouterEtablissement', annuler: 'annulerEtablissement',
                champs: [
                    {xtype: 'textfield', itemId: 'neNom', fieldLabel: 'Nom *', allowBlank: false, maxLength: 100}
                ]
            }
        };
        var m = modeles[genre];
        return Ext.create('Ext.window.Window', {
            itemId: m.itemId,
            title: m.titre,
            cls: 'ordo-fenetre',
            modal: true,
            resizable: false,
            closeAction: 'destroy',
            width: 480,
            bodyPadding: '16 18 8 18',
            layout: {type: 'vbox', align: 'stretch'},
            defaults: {labelWidth: 110, margin: '0 0 10 0', enableKeyEvents: true},
            items: m.champs.concat([{
                    xtype: 'component', cls: 'ordo-aide', html: Ext.String.htmlEncode(m.aide)
                }]),
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'bottom',
                    cls: 'ordo-fenetre-pied',
                    items: ['->', {
                            xtype: 'button', itemId: m.annuler, text: 'Annuler', cls: 'ordo-btn', scale: 'medium'
                        }, {
                            xtype: 'button', itemId: m.creer, text: 'Créer', iconCls: 'save',
                            cls: 'ordo-btn-primaire', scale: 'medium'
                        }]
                }]
        });
    },

    /*
     * Pieces justificatives (vague 2).
     *
     * « Ces pieces doivent pouvoir etre visualisees et telechargees depuis la fiche de l'ordonnance. » La
     * consultation ouvre le document EN FLUX dans un onglet du navigateur : aucune fenetre surgissante, aucun
     * telechargement force pour simplement regarder une ordonnance scannee.
     *
     * L'envoi passe par un formulaire ExtJS classique (iframe cachee) : c'est le seul montage qui fonctionne
     * pour un fichier dans cette version d'ExtJS, et c'est deja celui de l'import du panier de reappro.
     */
    grillePieces: function () {
        var me = this;
        /* Une icone d'action PAR PIECE (30/09) : le clic remonte au controleur avec la piece visee. */
        var action = function (nom, image, info, ecriture) {
            return {
                icon: 'resources/images/icons/fam/' + image,
                iconCls: 'ordo-act ordo-act-piece-' + nom,
                tooltip: info,
                isDisabled: ecriture ? function (vue) {
                    var ecran = vue.up('ordonnanceclient');
                    return !(ecran && ecran.peutEcrire) || !!(ecran && ecran.ficheVerrouillee);
                } : undefined,
                handler: function (vue, ligne, colonne, item, e, rec) {
                    vue.up('gridpanel').fireEvent('actionpiece', nom, rec);
                }
            };
        };
        return {
            xtype: 'gridpanel',
            itemId: 'grillePieces',
            title: 'Pièces justificatives (images, PDF, documents numérisés)',
            store: me.storePieces,
            height: 170,
            columnLines: true,
            columns: [
                {text: 'FICHIER', dataIndex: 'nom', flex: 3, itemId: 'colPieceNom', renderer: me.texteAvecBulle},
                {text: 'TYPE', dataIndex: 'type', width: 130},
                {text: 'TAILLE', dataIndex: 'taille', width: 100, align: 'right', itemId: 'colPieceTaille',
                    renderer: function (v) {
                        return v ? (v / 1024 / 1024).toFixed(1).replace('.', ',') + ' Mo' : '';
                    }},
                {text: 'DÉPOSÉE LE', dataIndex: 'deposeeLe', width: 130},
                {text: 'PAR', dataIndex: 'deposeePar', flex: 2},
                {
                    xtype: 'actioncolumn',
                    itemId: 'colActionsPiece',
                    text: 'ACTIONS',
                    width: 110,
                    align: 'center',
                    menuDisabled: true,
                    sortable: false,
                    items: [
                        action('voir', 'loupe.png', 'Voir (dans un onglet)'),
                        action('telecharger', 'folder_go.png', 'Télécharger'),
                        action('retirer', 'delete.png', 'Retirer de l\'ordonnance', true)
                    ]
                }
            ],
            dockedItems: [{
                    xtype: 'form',
                    itemId: 'formPiece',
                    dock: 'top',
                    border: false,
                    bodyPadding: 4,
                    layout: {type: 'hbox', align: 'middle'},
                    defaults: {margin: '0 6 0 0'},
                    items: [{
                            xtype: 'filefield',
                            itemId: 'fichierPiece',
                            name: 'fichier',
                            buttonText: 'Choisir un fichier...',
                            buttonConfig: {cls: 'ordo-btn'},
                            buttonOnly: false,
                            width: 380,
                            emptyText: 'JPG, PNG, TIFF ou PDF - 10 Mo au plus'
                        }, {
                            xtype: 'button',
                            itemId: 'joindrePiece',
                            text: 'Joindre',
                            iconCls: 'add',
                            cls: 'ordo-btn',
                            disabled: true
                        }, {
                            xtype: 'component',
                            flex: 1
                        }, {
                            xtype: 'displayfield',
                            itemId: 'rappelPieces',
                            value: 'Enregistrez l\'ordonnance pour pouvoir y joindre une pièce.'
                        }]
                }]
        };
    },

    /** Liste de recherche des articles : stock en BLEU, prix en ROUGE (22/09) : on voit tout de suite si on peut servir. */
    listeArticles: function () {
        return {
            minWidth: 640,
            getInnerTpl: function () {
                return '<div class="ordo-article">{strNAME} <span style="color:#777">{intCIP}</span>'
                        + '<span class="ordo-article-infos">'
                        + '<span style="color:#1E5FA8;font-weight:bold">Stock : {intNUMBERAVAILABLE}</span>'
                        + ' &nbsp; <span style="color:#c0392b;font-weight:bold">'
                        + '{[Ext.util.Format.number(values.intPRICE || 0, "0,000")]} F</span>'
                        + '</span></div>';
            }
        };
    },

    grilleProduits: function () {
        var me = this;
        return {
            xtype: 'gridpanel',
            itemId: 'grilleProduits',
            title: 'Produits prescrits',
            flex: 1,
            margin: '8 0 0 0',
            store: me.storeProduits,
            columnLines: true,
            selType: 'cellmodel',
            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1})],
            columns: [
                {
                    /* En PREMIERE colonne (30/09) : a droite, la largeur de la grille la poussait hors de la vue. */
                    xtype: 'actioncolumn', width: 34, itemId: 'colSupprimer', menuDisabled: true, sortable: false,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            iconCls: 'ordo-act ordo-act-retirer-ligne',
                            tooltip: 'Retirer cette ligne',
                            handler: function (vue, ligne, colonne, item, e, rec) {
                                vue.up('gridpanel').fireEvent('retirerligne', rec);
                            }
                        }]
                },
                {text: 'PRODUIT', dataIndex: 'libelle', flex: 3, itemId: 'colProduit', renderer: me.texteAvecBulle,
                    editor: {
                        xtype: 'combobox',
                        itemId: 'editeurProduit',
                        store: me.storeArticles,
                        displayField: 'strNAME',
                        valueField: 'strNAME',
                        queryParam: 'query',
                        minChars: 2,
                        typeAhead: false,
                        /*
                         * forceSelection: false, et c'est le coeur du choix fait avec l'officine : le produit se
                         * choisit dans le referentiel quand il y figure, et se SAISIT LIBREMENT sinon. Une
                         * ordonnance reflete ce que le medecin a ecrit, pas ce que l'officine tient en stock.
                         */
                        forceSelection: false,
                        listConfig: me.listeArticles()
                    }},
                {text: 'CIP', dataIndex: 'cip', width: 90, itemId: 'colCip'},
                {text: 'QTÉ', dataIndex: 'quantite', width: 60, align: 'right',
                    editor: {xtype: 'numberfield', minValue: 1, allowBlank: false, value: 1}},
                {text: 'POSOLOGIE', dataIndex: 'posologie', flex: 2, itemId: 'colPosologie',
                    renderer: me.texteAvecBulle,
                    editor: {xtype: 'textfield', maxLength: 150, emptyText: 'ex. 1 cp matin et soir'}},
                {text: 'DURÉE', dataIndex: 'duree', width: 100, itemId: 'colDuree', renderer: me.texteAvecBulle,
                    editor: {xtype: 'textfield', maxLength: 50, emptyText: 'ex. 7 jours'}},
                {
                    /*
                     * Service ligne par ligne (22/09). Vide = pas encore renseigne ; 0 = non servi. Le serveur
                     * refuse une quantite servie superieure a la prescrite.
                     */
                    text: 'QTÉ SERVIE', dataIndex: 'qteServie', width: 95, align: 'right', itemId: 'colServie',
                    editor: {xtype: 'numberfield', minValue: 0, allowBlank: true, allowDecimals: false},
                    renderer: function (v, meta, rec) {
                        if (v === null || v === undefined || v === '') {
                            meta.tdAttr = 'data-qtip="Service non renseigné"';
                            return '<span style="color:#999">—</span>';
                        }
                        var couleur = v >= rec.get('quantite') ? '#17987e' : (v > 0 ? '#e67e22' : '#c0392b');
                        return '<span style="color:' + couleur + ';font-weight:bold">' + v + '</span>';
                    }},
                {
                    /* Reste a delivrer de la ligne (30/09) : seulement quand le service est renseigne. */
                    text: 'RESTE', dataIndex: 'qteServie', width: 70, align: 'right', itemId: 'colResteLigne',
                    sortable: false,
                    renderer: function (v, meta, rec) {
                        if (v === null || v === undefined || v === '') {
                            return '';
                        }
                        var reste = (rec.get('quantite') || 0) - v;
                        return reste > 0 ? '<span style="color:#e67e22;font-weight:bold">' + reste + '</span>' : '';
                    }},
                {
                    /* Equivalents du produit de la ligne (23/09) : memes DCI, avec stock et prix. */
                    xtype: 'actioncolumn', width: 36, itemId: 'colEquivalents', menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/table_refresh.png',
                            iconCls: 'ordo-act ordo-act-equivalents',
                            tooltip: 'Équivalents (même DCI) : stock et prix',
                            isDisabled: function (vue, ligne, colonne, item, rec) {
                                return !rec.get('articleId');
                            },
                            handler: function (vue, ligne, colonne, item, e, rec) {
                                vue.up('gridpanel').fireEvent('equivalents', rec);
                            }
                        }]
                }
            ],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            /*
                             * Recherche produit AU-DESSUS de la grille (30/09) : le curseur y arrive apres le choix du
                             * client, du sexe, du prescripteur ou de l'etablissement. Le produit choisi remplit la
                             * ligne vide, ou en ajoute une.
                             */
                            xtype: 'combobox',
                            itemId: 'rechercheProduit',
                            flex: 1,
                            minWidth: 220,
                            store: me.storeArticles,
                            displayField: 'strNAME',
                            valueField: 'lgFAMILLEID',
                            queryParam: 'query',
                            minChars: 2,
                            typeAhead: false,
                            hideTrigger: true,
                            forceSelection: false,
                            enableKeyEvents: true,
                            emptyText: 'Rechercher un produit (nom ou CIP)',
                            listConfig: me.listeArticles()
                        }, {
                            xtype: 'button',
                            itemId: 'ajouterProduit',
                            text: 'Ajouter un produit',
                            iconCls: 'add',
                            cls: 'ordo-btn',
                            tooltip: 'Ajouter une ligne vide, à saisir dans la grille (produit hors référentiel compris)'
                        }, {
                            xtype: 'button',
                            itemId: 'toutServir',
                            text: 'Tout servi',
                            icon: 'resources/images/icons/fam/accept.png',
                            cls: 'ordo-btn',
                            tooltip: 'Renseigne la quantité servie = quantité prescrite sur chaque ligne'
                        }, {
                            xtype: 'button',
                            itemId: 'analyserPosos',
                            /* Posos quand il est configure, sinon le mode demonstration : le resultat dit lequel
                               (bandeau rouge DEMONSTRATION). */
                            text: 'Analyser l\'ordonnance',
                            icon: 'resources/images/icons/fam/information.png',
                            cls: 'ordo-btn-posos',
                            tooltip: 'Interactions, contre-indications et posologies des produits de cette ordonnance'
                        }]
                }, {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    items: [{
                            xtype: 'tbtext',
                            itemId: 'rappelProduits',
                            style: 'color:#777',
                            text: 'Aucun stock n\'est mouvementé, aucune vente n\'est créée. QTÉ SERVIE : vide = à renseigner.'
                        }]
                }]
        };
    }
    ,

    /* ============================================================ outils de construction */

    /**
     * Rendu d'un texte avec son info-bulle (30/09) : ce qu'une colonne trop etroite coupe se lit au survol. Encode
     * deux fois pour l'attribut : l'info-bulle interprete son contenu comme du HTML.
     */
    texteAvecBulle: function (v, meta) {
        var t = v === null || v === undefined ? '' : (Ext.isArray(v) ? v.join(', ') : String(v));
        if (t && meta) {
            meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(Ext.String.htmlEncode(t)) + '"';
        }
        return Ext.String.htmlEncode(t);
    },

    /** Liste des clients : large et sur une seule ligne, le telephone en gris (22/09). */
    listeClients: function () {
        return {
            minWidth: 480,
            getInnerTpl: function () {
                return '<div style="white-space:nowrap">{strFIRSTNAME} {strLASTNAME}'
                        + '<tpl if="strTELEPHONE"> <span style="color:#777">'
                        + '({strTELEPHONE})</span></tpl></div>';
            }
        };
    },

    /**
     * Une icone d'action de l'historique. Le clic est remonte a la grille sous un evenement unique
     * (« actionordonnance ») : c'est le controleur qui agit, la vue ne fait que signaler.
     */
    action: function (nom, image, info, interditSiAnnulee) {
        return {
            icon: 'resources/images/icons/fam/' + image,
            iconCls: 'ordo-act ordo-act-' + nom,
            tooltip: info,
            /* Modifier et Annuler : grises sur une ordonnance annulee, et pour qui n'a pas le droit d'ecrire. */
            isDisabled: interditSiAnnulee ? function (vue, ligne, colonne, item, rec) {
                var ecran = vue.up('ordonnanceclient');
                return rec.get('statut') === 'annulee' || !(ecran && ecran.peutEcrire);
            } : undefined,
            handler: function (vue, ligne, colonne, item, e, rec) {
                var grille = vue.up('gridpanel');
                grille.getSelectionModel().select(rec);
                grille.fireEvent('actionordonnance', nom, rec);
            }
        };
    },

    /** Pastille de l'etat de service d'une ordonnance. */
    badgeService: function (etat) {
        var libelles = {
            servie: 'Servie',
            partielle: 'Partielle',
            non_servie: 'Non servie',
            a_renseigner: 'À renseigner'
        };
        var cle = libelles[etat] ? etat : 'a_renseigner';
        return '<span class="ordo-etat ordo-etat-' + cle + '">' + libelles[cle] + '</span>';
    },

    /** Pourcentage lisible, ou un tiret quand il n'y a pas de donnee (et non 0 %). */
    pourcent: function (v) {
        return v === null || v === undefined || v === '' ? '<span style="color:#999">—</span>'
                : Ext.util.Format.number(v, '0.0') + ' %';
    },

    /**
     * Equivalents du produit d'une ligne (23/09). Cachee tant qu'on ne l'a pas demandee, ou qu'un produit en
     * rupture n'a pas ete choisi. « Remplacer » change le produit de la ligne en gardant quantite et posologie.
     */
    grilleSubstituts: function () {
        var me = this;
        return {
            xtype: 'gridpanel',
            itemId: 'grilleSubstituts',
            title: 'Équivalents',
            hidden: true,
            store: me.storeSubstituts,
            height: 210,
            columnLines: true,
            tools: [{
                    type: 'close',
                    itemId: 'fermerSubstituts',
                    tooltip: 'Fermer',
                    handler: function (e, el, entete) {
                        entete.ownerCt.hide();
                    }
                }],
            viewConfig: {
                emptyText: '<div style="padding:6px;color:#777">Aucun équivalent proposé.</div>',
                deferEmptyText: false
            },
            columns: [
                {text: 'PRODUIT', dataIndex: 'nom', flex: 3, renderer: me.texteAvecBulle},
                {text: 'CIP', dataIndex: 'cip', width: 90},
                {text: 'TYPE', dataIndex: 'niveau', width: 130, itemId: 'colNiveau',
                    renderer: function (v) {
                        if (v === 'proposition') {
                            return '<span class="ordo-etat ordo-etat-proposition">Proposé (analyse)</span>';
                        }
                        return v === 'direct' ? '<span class="ordo-etat ordo-etat-servie">Équivalent direct</span>'
                                : '<span class="ordo-etat ordo-etat-partielle">À adapter</span>';
                    }},
                {text: 'POURQUOI', dataIndex: 'raison', flex: 4, renderer: me.texteAvecBulle},
                {text: 'STOCK', dataIndex: 'stock', width: 70, align: 'right',
                    renderer: function (v) {
                        return '<span style="font-weight:bold;color:' + (v > 0 ? '#1E5FA8' : '#c0392b') + '">' + v
                                + '</span>';
                    }},
                {text: 'PRIX', dataIndex: 'prix', width: 110, align: 'right',
                    renderer: function (v, meta, rec) {
                        return '<span style="font-weight:bold;color:#c0392b">' + Ext.util.Format.number(v || 0, '0,000')
                                + '</span>' + (rec.get('detail') ? ' <span style="color:#777">/unité</span>' : '');
                    }},
                {xtype: 'actioncolumn', width: 90, itemId: 'colRemplacer', text: 'REMPLACER', align: 'center',
                    menuDisabled: true, items: [{
                            icon: 'resources/images/icons/fam/accept.png',
                            iconCls: 'ordo-act ordo-act-remplacer',
                            tooltip: 'Remplacer le produit de la ligne par celui-ci (quantité et posologie gardées)',
                            handler: function (vue, ligne, colonne, item, e, rec) {
                                vue.up('gridpanel').fireEvent('remplacer', rec);
                            }
                        }]}
            ],
            dockedItems: [{
                    xtype: 'component',
                    dock: 'top',
                    itemId: 'messageSubstituts',
                    padding: 4,
                    html: ''
                }]
        };
    },

    /** Grille des alertes Posos : cachee tant qu'aucune analyse n'a ete lancee. */
    grilleAlertes: function (itemId, store) {
        var grille = {
            xtype: 'gridpanel',
            itemId: itemId,
            title: 'Analyse de l\'ordonnance',
            hidden: true,
            store: store,
            height: 200,
            columnLines: true,
            viewConfig: {
                getRowClass: function (rec) {
                    return rec.get('majeure') ? 'ordo-alerte-majeure' : '';
                }
            },
            columns: [
                /* Info-bulle sur chaque colonne (30/09) : le texte coupe se lit en entier au survol. */
                {text: 'NATURE', dataIndex: 'type', width: 130, renderer: this.texteAvecBulle},
                {text: 'GRAVITÉ', dataIndex: 'gravite', width: 110, renderer: this.texteAvecBulle},
                {text: 'ALERTE', dataIndex: 'libelle', flex: 3, renderer: this.texteAvecBulle},
                {text: 'PRODUITS', dataIndex: 'produits', flex: 2, renderer: this.texteAvecBulle},
                {text: 'CONDUITE À TENIR', dataIndex: 'recommandation', flex: 2, renderer: this.texteAvecBulle},
                {text: 'EN RAYON (DCI RECOMMANDÉE)', dataIndex: 'equivalents', flex: 3, itemId: 'colEnRayon',
                    renderer: function (v, meta) {
                        /* Produits du rayon ayant EXACTEMENT la DCI recommandee : stock en bleu, prix en rouge. */
                        var l = Ext.isArray(v) ? v : [];
                        if (!l.length) {
                            return '';
                        }
                        var ligne = function (p) {
                            return Ext.String.htmlEncode(p.nom) + ' — <span style="color:' + (p.stock > 0 ? '#1E5FA8' : '#c0392b')
                                    + ';font-weight:bold">stock ' + p.stock + '</span> — <span style="color:#c0392b;font-weight:bold">'
                                    + Ext.util.Format.number(p.prix || 0, '0,000') + (p.detail ? ' /unité' : '') + '</span>';
                        };
                        meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(Ext.Array.map(l, ligne).join('<br/>')) + '"';
                        return Ext.Array.map(l.slice(0, 3), ligne).join('<br/>') + (l.length > 3 ? '<br/><i>+ '
                                + (l.length - 3) + ' autre(s)</i>' : '');
                    }}
            ],
            dockedItems: [{
                    xtype: 'component',
                    dock: 'top',
                    itemId: 'messagePosos',
                    padding: 4,
                    html: ''
                }]
        };
        /* Sur la fiche seulement : il y a une ligne d'ordonnance a remplacer. */
        if (itemId === 'alertesFiche') {
            grille.columns.push({
                    /* Ouvre les produits proposes dans le panneau des equivalents, ou l'on peut remplacer (23/09). */
                    xtype: 'actioncolumn', width: 40, itemId: 'colVoirProposes', menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/table_refresh.png',
                            iconCls: 'ordo-act ordo-act-proposes',
                            tooltip: 'Voir les produits proposés, et remplacer le produit concerné',
                            isDisabled: function (vue, ligne, colonne, item, rec) {
                                return !(rec.get('equivalents') || []).length;
                            },
                            handler: function (vue, ligne, colonne, item, e, rec) {
                                vue.up('gridpanel').fireEvent('proposes', rec);
                            }
                        }]
                });
        }
        return grille;
    },

    /* ============================================================ suivi de consommation */

    /**
     * Suivi de consommation d'un client (22/09) : les memes donnees que l'onglet de la gestion des clients
     * (achats, frequence, dernier achat, habitude), plus le STOCK disponible de chaque produit. On peut en
     * envoyer les produits a Posos avec le contexte clinique de l'ordonnance ouverte.
     */
    vueConso: function () {
        var me = this;
        var douzeMois = Ext.Date.add(new Date(), Ext.Date.MONTH, -12);
        return {
            xtype: 'panel',
            itemId: 'vueConso',
            border: false,
            layout: {type: 'vbox', align: 'stretch'},
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'button',
                            itemId: 'retourConso',
                            text: 'Retour',
                            iconCls: 'back',
                            cls: 'ordo-btn'
                        }, {
                            xtype: 'tbtext',
                            itemId: 'titreConso',
                            text: '',
                            style: 'font-weight:bold;font-size:13px'
                        }, '->', {
                            xtype: 'datefield',
                            itemId: 'consoDebut',
                            fieldLabel: 'Du',
                            labelWidth: 24,
                            width: 150,
                            format: 'd/m/Y',
                            value: douzeMois
                        }, {
                            xtype: 'datefield',
                            itemId: 'consoFin',
                            fieldLabel: 'au',
                            labelWidth: 24,
                            width: 150,
                            format: 'd/m/Y',
                            value: new Date()
                        }, {
                            xtype: 'button',
                            itemId: 'actualiserConso',
                            text: 'Actualiser',
                            iconCls: 'search',
                            cls: 'ordo-btn'
                        }, {
                            xtype: 'button',
                            itemId: 'pososConso',
                            text: 'Analyser avec Posos',
                            icon: 'resources/images/icons/fam/information.png',
                            cls: 'ordo-btn-posos',
                            tooltip: 'Les produits cochés (ou tous) avec le contexte clinique de l\'ordonnance ouverte'
                        }]
                }],
            items: [{
                    xtype: 'component',
                    itemId: 'resumeConso',
                    padding: '6 8',
                    html: ''
                }, {
                    xtype: 'gridpanel',
                    itemId: 'grilleConso',
                    flex: 1,
                    minHeight: 260,
                    store: me.storeConso,
                    columnLines: true,
                    selType: 'checkboxmodel',
                    selModel: {mode: 'SIMPLE'},
                    columns: [
                        {text: 'PRODUIT', dataIndex: 'name', flex: 3, renderer: me.texteAvecBulle},
                        {text: 'CIP', dataIndex: 'cip', width: 90},
                        {text: 'ACHATS', dataIndex: 'nbAchats', width: 75, align: 'right'},
                        {text: 'QTÉ TOTALE', dataIndex: 'qteTotale', width: 90, align: 'right'},
                        {text: 'FRÉQUENCE', dataIndex: 'frequenceJours', width: 100, align: 'right',
                            renderer: function (v, meta, rec) {
                                return rec.get('nbAchats') > 1 ? 'tous les ' + v + ' j' : '—';
                            }},
                        {text: 'DERNIER ACHAT', dataIndex: 'dernierAchat', width: 110,
                            renderer: function (v) {
                                return v ? Ext.Date.format(Ext.Date.parse(v, 'Y-m-d'), 'd/m/Y') : '';
                            }},
                        {text: 'HABITUDE', dataIndex: 'habitude', width: 110},
                        {text: 'MONTANT', dataIndex: 'montant', width: 100, align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v || 0, '0,000');
                            }},
                        {text: 'STOCK', dataIndex: 'stock', width: 80, align: 'right', itemId: 'colStockConso',
                            renderer: function (v) {
                                if (v === null || v === undefined) {
                                    return '<span style="color:#999">—</span>';
                                }
                                return '<span style="font-weight:bold;color:' + (v > 0 ? '#1E5FA8' : '#c0392b')
                                        + '">' + v + '</span>';
                            }}
                    ]
                }, me.grilleAlertes('alertesConso', me.storeAlertesConso)]
        };
    },

    /* ============================================================ analyse des ordonnances */

    /**
     * Onglet « Analyse des ordonnances » (22/09) : sur une periode, les taux (annulation, service,
     * satisfaction = lignes servies en entier / lignes renseignees), et leur ventilation par prescripteur,
     * etablissement et type de client, avec les produits les plus prescrits.
     */
    vueAnalyse: function () {
        var me = this;
        var colonnesVentilation = function (titre) {
            return [
                {text: titre, dataIndex: 'libelle', flex: 2, renderer: me.texteAvecBulle},
                {text: 'ORD.', dataIndex: 'ordonnances', width: 55, align: 'right'},
                {text: 'PART', dataIndex: 'part', width: 70, align: 'right', renderer: me.pourcent},
                {text: 'ANNUL.', dataIndex: 'tauxAnnulation', width: 70, align: 'right', renderer: me.pourcent},
                {text: 'SATISF.', dataIndex: 'satisfaction', width: 70, align: 'right', renderer: me.pourcent},
                {text: 'SERVIES', dataIndex: 'tauxService', width: 70, align: 'right', renderer: me.pourcent}
            ];
        };
        var ventilation = function (itemId, titre, store, entete) {
            return {
                xtype: 'gridpanel',
                itemId: itemId,
                title: titre,
                flex: 1,
                margin: '0 6 0 0',
                store: store,
                columnLines: true,
                columns: colonnesVentilation(entete)
            };
        };
        return {
            xtype: 'panel',
            itemId: 'vueAnalyse',
            title: 'Analyse des ordonnances',
            border: false,
            layout: {type: 'vbox', align: 'stretch'},
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    itemId: 'barreAnalyse',
                    items: [{
                            xtype: 'datefield',
                            itemId: 'anaDebut',
                            fieldLabel: 'Du',
                            labelWidth: 24,
                            width: 150,
                            format: 'd/m/Y',
                            value: Ext.Date.add(new Date(), Ext.Date.MONTH, -12)
                        }, {
                            xtype: 'datefield',
                            itemId: 'anaFin',
                            fieldLabel: 'au',
                            labelWidth: 24,
                            width: 150,
                            format: 'd/m/Y',
                            value: new Date()
                        }, {
                            xtype: 'combobox',
                            itemId: 'anaType',
                            fieldLabel: 'Type',
                            labelWidth: 36,
                            width: 200,
                            store: me.storeTypesClient,
                            displayField: 'nom',
                            valueField: 'id',
                            queryMode: 'local',
                            editable: false,
                            emptyText: 'Tous'
                        }, {
                            xtype: 'combobox',
                            itemId: 'anaMedecin',
                            fieldLabel: 'Prescripteur',
                            labelWidth: 78,
                            width: 280,
                            store: me.storeMedecins,
                            displayField: 'nom',
                            valueField: 'id',
                            queryMode: 'local',
                            emptyText: 'Tous'
                        }, {
                            xtype: 'button',
                            itemId: 'calculerAnalyse',
                            text: 'Calculer',
                            iconCls: 'search',
                            cls: 'ordo-btn-primaire'
                        }, {
                            xtype: 'button',
                            itemId: 'effacerAnalyse',
                            text: 'Effacer',
                            cls: 'ordo-btn'
                        }, '->', {
                            /* L'onglet en PDF, dans un onglet du navigateur : aucune fenetre surgissante. */
                            xtype: 'button',
                            itemId: 'imprimerAnalyse',
                            text: 'Imprimer l\'analyse',
                            iconCls: 'printable',
                            cls: 'ordo-btn'
                        }]
                }],
            items: [{
                    xtype: 'component',
                    itemId: 'tuilesAnalyse',
                    padding: '8 6',
                    html: '<div style="color:#777">Choisissez une période puis « Calculer ».</div>'
                }, {
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'stretch'},
                    height: 250,
                    margin: '0 0 6 6',
                    items: [
                        ventilation('anaPrescripteurs', 'Par prescripteur', me.storeParPrescripteur, 'PRESCRIPTEUR'),
                        ventilation('anaEtablissements', 'Par établissement', me.storeParEtablissement,
                                'ÉTABLISSEMENT'),
                        ventilation('anaTypes', 'Par type de client', me.storeParType, 'TYPE')
                    ]
                }, {
                    xtype: 'gridpanel',
                    itemId: 'anaProduits',
                    title: 'Produits les plus prescrits (ordonnances annulées exclues)',
                    flex: 1,
                    minHeight: 200,
                    margin: '0 6 6 6',
                    store: me.storeProduitsAnalyse,
                    columnLines: true,
                    columns: [
                        {text: 'PRODUIT PRESCRIT', dataIndex: 'produit', flex: 3, renderer: me.texteAvecBulle},
                        {text: 'PRESCRIPTIONS', dataIndex: 'nbPrescriptions', width: 110, align: 'right'},
                        {text: 'QTÉ PRESCRITE', dataIndex: 'qtePrescrite', width: 110, align: 'right'},
                        {text: 'QTÉ SERVIE', dataIndex: 'qteServie', width: 100, align: 'right'},
                        {text: 'LIGNES RENSEIGNÉES', dataIndex: 'nbRenseignees', width: 140, align: 'right'},
                        {text: 'SATISFACTION', dataIndex: 'satisfaction', width: 110, align: 'right',
                            renderer: me.pourcent}
                    ]
                }]
        };
    }
});
