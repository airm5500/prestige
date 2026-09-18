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
                {name: 'modifiePar', type: 'string'}
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
            fields: [
                {name: 'lgCLIENTID', type: 'string'},
                {name: 'strFIRSTNAME', type: 'string'},
                {name: 'strLASTNAME', type: 'string'},
                {name: 'strTELEPHONE', type: 'string'},
                {name: 'typeClient', type: 'string'},
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
                {name: 'intCIP', type: 'string'}
            ],
            pageSize: 15,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/vente/search',
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
                {name: 'duree', type: 'string'}
            ],
            data: []
        });

        Ext.applyIf(me, {
            items: [me.vueHistorique(), me.vueFiche()]
        });
        me.callParent(arguments);
    },

    /* ================================================================= historique */

    vueHistorique: function () {
        var me = this;
        return {
            xtype: 'panel',
            itemId: 'vueHistorique',
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
                            width: 280,
                            store: me.storeClients,
                            displayField: 'nomComplet',
                            valueField: 'lgCLIENTID',
                            queryParam: 'query',
                            minChars: 2,
                            typeAhead: false,
                            emptyText: 'Tous les clients',
                            listConfig: {
                                getInnerTpl: function () {
                                    return '<div>{strFIRSTNAME} {strLASTNAME}'
                                            + '<tpl if="strTELEPHONE"> <span style="color:#777">'
                                            + '({strTELEPHONE})</span></tpl></div>';
                                }
                            }
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
                            xtype: 'button',
                            itemId: 'rechercher',
                            text: 'Rechercher',
                            iconCls: 'search'
                        }, {
                            xtype: 'button',
                            itemId: 'reinitialiser',
                            text: 'Réinitialiser'
                        }, {
                            /*
                             * Un remplissage de CONTENEUR, et non le raccourci '->' : celui-ci n'existe que
                             * dans une toolbar. Place dans un container, ExtJS 4.2 ne sait pas le construire
                             * et l'ecran ne s'ouvre plus du tout (« Cannot set properties of undefined »).
                             */
                            xtype: 'component',
                            flex: 1
                        }, {
                            xtype: 'button',
                            itemId: 'nouvelle',
                            text: 'Nouvelle ordonnance',
                            iconCls: 'add'
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
                {text: 'CLIENT', dataIndex: 'client', flex: 2, itemId: 'colClient'},
                {text: 'TYPE', dataIndex: 'typeClient', width: 100},
                {text: 'PRESCRIPTEUR', dataIndex: 'medecin', flex: 2, itemId: 'colMedecin'},
                {text: 'ÉTABLISSEMENT', dataIndex: 'etablissement', flex: 2},
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
                    }}
            ],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'button',
                            itemId: 'consulter',
                            text: 'Consulter',
                            iconCls: 'preview',
                            disabled: true
                        }, {
                            xtype: 'button',
                            itemId: 'modifier',
                            text: 'Modifier',
                            iconCls: 'edit',
                            disabled: true
                        }, {
                            xtype: 'button',
                            itemId: 'annuler',
                            text: 'Annuler l\'ordonnance',
                            iconCls: 'delete',
                            disabled: true
                        }, '->', {
                            xtype: 'displayfield',
                            itemId: 'rappelHistorique',
                            value: 'Les ordonnances sont listées de la plus récente à la plus ancienne.'
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
            layout: {type: 'vbox', align: 'stretch'},
            items: [me.enteteFiche(), me.grilleProduits(), {
                    xtype: 'textareafield',
                    itemId: 'observations',
                    fieldLabel: 'Observations',
                    labelWidth: 110,
                    height: 70,
                    maxLength: 2000
                }],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'button',
                            itemId: 'retourHistorique',
                            text: 'Retour à l\'historique',
                            iconCls: 'back'
                        }, '->', {
                            xtype: 'displayfield',
                            itemId: 'titreFiche',
                            value: ''
                        }]
                }, {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    items: ['->', {
                            xtype: 'button',
                            itemId: 'enregistrer',
                            text: 'Enregistrer',
                            iconCls: 'save'
                        }, {
                            xtype: 'button',
                            itemId: 'abandonner',
                            text: 'Abandonner'
                        }]
                }]
        };
    },

    enteteFiche: function () {
        var me = this;
        return {
            xtype: 'fieldset',
            title: 'L\'ordonnance',
            padding: 8,
            layout: {type: 'vbox', align: 'stretch'},
            items: [{
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    defaults: {margin: '0 8 6 0'},
                    items: [{
                            xtype: 'hiddenfield', itemId: 'ordonnanceId'
                        }, {
                            xtype: 'combobox',
                            itemId: 'ficheClient',
                            fieldLabel: 'Client *',
                            labelWidth: 110,
                            width: 420,
                            allowBlank: false,
                            store: me.storeClients,
                            displayField: 'nomComplet',
                            valueField: 'lgCLIENTID',
                            queryParam: 'query',
                            minChars: 2,
                            typeAhead: false,
                            emptyText: 'Chercher un client (carnet, assurance, standard)',
                            listConfig: {
                                getInnerTpl: function () {
                                    return '<div>{strFIRSTNAME} {strLASTNAME}'
                                            + '<tpl if="strTELEPHONE"> <span style="color:#777">'
                                            + '({strTELEPHONE})</span></tpl></div>';
                                }
                            }
                        }, {
                            xtype: 'button',
                            itemId: 'nouveauClient',
                            text: 'Nouveau client',
                            iconCls: 'add'
                        }, {
                            xtype: 'datefield',
                            itemId: 'ficheDate',
                            fieldLabel: 'Date *',
                            labelWidth: 50,
                            width: 190,
                            format: 'd/m/Y',
                            allowBlank: false,
                            /* Une ordonnance datee de demain n'existe pas : le champ le refuse, le serveur aussi. */
                            maxValue: new Date()
                        }]
                }, {
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    defaults: {margin: '0 8 0 0'},
                    items: [{
                            xtype: 'combobox',
                            itemId: 'ficheMedecin',
                            fieldLabel: 'Prescripteur',
                            labelWidth: 110,
                            width: 420,
                            store: me.storeMedecins,
                            displayField: 'nom',
                            valueField: 'id',
                            queryMode: 'local',
                            emptyText: 'Si connu',
                            /* Facultatif : « le prescripteur et l'etablissement, SI DISPONIBLES ». */
                            allowBlank: true
                        }, {
                            xtype: 'combobox',
                            itemId: 'ficheEtablissement',
                            fieldLabel: 'Établissement',
                            labelWidth: 90,
                            width: 380,
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
                        }]
                }]
        };
    },

    grilleProduits: function () {
        var me = this;
        return {
            xtype: 'gridpanel',
            itemId: 'grilleProduits',
            title: 'Produits prescrits',
            flex: 1,
            minHeight: 220,
            store: me.storeProduits,
            columnLines: true,
            selType: 'cellmodel',
            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1})],
            columns: [
                {text: 'PRODUIT', dataIndex: 'libelle', flex: 3, itemId: 'colProduit',
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
                        listConfig: {
                            getInnerTpl: function () {
                                return '<div>{strNAME} <span style="color:#777">{intCIP}</span></div>';
                            }
                        }
                    }},
                {text: 'CIP', dataIndex: 'cip', width: 100, itemId: 'colCip'},
                {text: 'QTÉ', dataIndex: 'quantite', width: 70, align: 'right',
                    editor: {xtype: 'numberfield', minValue: 1, allowBlank: false, value: 1}},
                {text: 'POSOLOGIE', dataIndex: 'posologie', flex: 2, itemId: 'colPosologie',
                    editor: {xtype: 'textfield', maxLength: 150, emptyText: 'ex. 1 cp matin et soir'}},
                {text: 'DURÉE', dataIndex: 'duree', width: 120, itemId: 'colDuree',
                    editor: {xtype: 'textfield', maxLength: 50, emptyText: 'ex. 7 jours'}},
                {xtype: 'actioncolumn', width: 40, itemId: 'colSupprimer', items: [{
                            iconCls: 'delete',
                            tooltip: 'Retirer cette ligne',
                            handler: function (grille, ligne) {
                                grille.getStore().removeAt(ligne);
                            }
                        }]}
            ],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'button',
                            itemId: 'ajouterProduit',
                            text: 'Ajouter un produit',
                            iconCls: 'add'
                        }, '->', {
                            xtype: 'displayfield',
                            itemId: 'rappelProduits',
                            value: 'Quantités PRESCRITES : aucun stock n\'est mouvementé, aucune vente n\'est créée.'
                        }]
                }]
        };
    }
});
