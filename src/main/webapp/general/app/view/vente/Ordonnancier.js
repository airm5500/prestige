/* global Ext */

Ext.define('testextjs.view.vente.Ordonnancier', {
    extend: 'Ext.panel.Panel',
    xtype: 'ordonnancier',
    requires: [
        'testextjs.view.vente.DetailProduitsVente'
    ],

    frame: true,
    title: 'Liste des Ventes',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var store = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.MedecinModel',
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/medecin/medecins',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });
        var vente = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 99999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/ventesordonnanciers',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });
        var me = this;

        /*
         * Les trois palmares. Ils ne sont PAS charges a l'ouverture de l'ecran : l'analyse d'une
         * periode coute une lecture complete du registre, et l'utilisateur qui vient consulter une
         * delivrance n'en a que faire. Le controleur ne les charge qu'a l'ouverture de l'onglet.
         */
        var champsPalmares = [
            {name: 'libelle', type: 'string'},
            {name: 'complement', type: 'string'},
            {name: 'delivrances', type: 'int'},
            {name: 'quantite', type: 'int'},
            {name: 'montant', type: 'int'}
        ];
        me.produitStore = Ext.create('Ext.data.Store', {fields: champsPalmares});
        me.clientStore = Ext.create('Ext.data.Store', {fields: champsPalmares});
        me.medecinStore = Ext.create('Ext.data.Store', {fields: champsPalmares});

        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
//                            height: 30,
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
//                            height: 30,
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }
                        , '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Medecins',
                            labelWidth: 65,
                            itemId: 'medecin',
                            store: store,
                            flex: 1,
                            valueField: 'id',
                            displayField: 'nom',
                            typeAhead: false,
                            mode: 'local',
                            minChars: 1,
                            emptyText: 'Selectionner un medecin'

                        }, '-',
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            enableKeyEvents: true,
                            emptyText: 'Nom du client ou r&eacute;f&eacute;rence...'
                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-',
                        {
                            text: 'Imprimer',
                            tooltip: 'Editer le registre affich&eacute;, une ligne par produit d&eacute;livr&eacute;',
                            itemId: 'imprimer',
                            iconCls: 'printable'
                        }, '-',
                        {
                            text: 'Exporter',
                            tooltip: 'Exporter le registre affich&eacute; au format Excel',
                            itemId: 'exporter',
                            iconCls: 'export_excel_icon'
                        }, '-',
                        {
                            text: 'Cr&eacute;er inventaire',
                            tooltip: 'Cr&eacute;er un inventaire des produits d&eacute;livr&eacute;s sur la '
                                    + 'p&eacute;riode affich&eacute;e',
                            itemId: 'inventaire',
                            iconCls: 'addicon'
                        }
                    ]
                }

            ],
            items: [{
                    /*
                     * Deux onglets sur les MEMES filtres. La barre du haut est docked au niveau du
                     * panneau : la periode, le medecin et la recherche valent donc pour le registre
                     * comme pour l'analyse. Deux jeux de filtres separes laisseraient l'utilisateur
                     * comparer un registre de janvier a une analyse de mars sans s'en apercevoir.
                     */
                    xtype: 'tabpanel',
                    itemId: 'ongletsOrdonnancier',
                    items: [{
                    title: 'Registre',
                    xtype: 'gridpanel',
                    itemId: 'grilleRegistre',
                    store: vente,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        animCollapse: false,
                        hideable: false,
                        draggable: false
                    },
                    columns: [
                        {
                            // Les produits ne descendent PAS avec la liste : ce bouton va les
                            // chercher pour la seule vente choisie. Un (+) sur chaque ligne
                            // obligerait a les transporter tous, pour ceux qu'on n'ouvre jamais.
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Voir le d&eacute;tail des produits',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('voirDetail', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Reference',
                            dataIndex: 'strREF',
                            flex: 0.8
                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Type.Vente',
                            dataIndex: 'strTYPEVENTE',
                            align: 'center',
                            flex: 0.4
                        }

                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Montant',
                            xtype: 'numbercolumn',
                            dataIndex: 'intPRICE',
                            align: 'right',
                            flex: 0.6,
                            format: '0,000.'

                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Montant différé',
                            xtype: 'numbercolumn',
//                            hidden:true,
                            dataIndex: 'intPRICERESTE',
                            align: 'right',
                            flex: 0.6,
                            format: '0,000.'

                        },

                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Date',
                            dataIndex: 'dtUPDATED',
                            flex: 0.6,
                            align: 'center'
                        }, {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 0.6,
                            align: 'center'
                        }, {
                            // Le registre repond a « qui a recu quoi, prescrit par qui ». Le nom du
                            // patient en etait absent : il fallait ouvrir chaque vente pour le voir.
                            sortable: false,
                            menuDisabled: true,
                            header: 'Client',
                            dataIndex: 'clientFullName',
                            flex: 1
                        }, {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Medecin',
                            dataIndex: 'nom',
                            flex: 1
                        }, {
                            sortable: false,
                            menuDisabled: true,
                            header: 'N&deg; ordre',
                            dataIndex: 'numOrder',
                            align: 'center',
                            flex: 0.5
                        }

                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Vendeur',
                            dataIndex: 'userVendeurName',
                            flex: 1
                        },

                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Caissier',
                            dataIndex: 'userCaissierName',
                            flex: 1
                        }

                    ],

                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: vente,
                        pageSize: 99999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }, me.ongletAnalyse(), me.ongletProduits('ordonnancier'), me.ongletProduits('sensible')]
                }]

        });
        me.callParent(arguments);
    },

    /**
     * Les onglets « Produits ordonnancier » et « Produits sensibles » (cas 3 du 03/11/2026, variante C).
     *
     * Meme gabarit que la gestion des articles (configmanagement/famille/Products.js) : recherche, filtre
     * coches / non coches / tous, compteur, case enregistree AU CLIC (aucun bouton Enregistrer, aucune fenetre),
     * et cochage de TOUT le resultat en deux temps, la confirmation se faisant dans le bouton lui-meme.
     *
     * La barre commune (periode, medecin) n'a pas de sens ici : le controleur la masque sur ces onglets et la
     * retablit sur Registre et Analyse. Chaque onglet porte sa propre barre.
     *
     * @param champ
     *            'ordonnancier' (is_scheduled) ou 'sensible' (is_sensible)
     */
    ongletProduits: function (champ) {
        var me = this;
        var sensible = champ === 'sensible';
        var parPage = 20;
        var store = Ext.create('Ext.data.Store', {
            idProperty: 'lgFAMILLEID',
            fields: [{name: 'lgFAMILLEID', type: 'string'}, {name: 'intCIP', type: 'string'},
                {name: 'strNAME', type: 'string'}, {name: 'intPRICE', type: 'number'}, {name: 'stock', type: 'number'},
                {name: 'scheduled', type: 'boolean'}, {name: 'intT', type: 'string'}, {name: 'sensible', type: 'boolean'}],
            pageSize: parPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/fichearticle/ordonnancier',
                timeout: 240000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        var filtres = Ext.create('Ext.data.Store', {
            fields: ['libelle', 'valeur'],
            data: [{libelle: 'Produits cochés', valeur: 'coches'}, {libelle: 'Produits non cochés', valeur: 'noncoches'},
                {libelle: 'Tous', valeur: 'tous'}]
        });
        var rayons = Ext.create('Ext.data.Store', {
            idProperty: 'id', fields: ['id', 'libelle'], autoLoad: false, pageSize: 9999,
            proxy: {type: 'ajax', url: '../api/v1/common/rayons', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        return {
            title: sensible ? 'Produits sensibles' : 'Produits ordonnancier',
            itemId: sensible ? 'ongletSensibles' : 'ongletProduitsOrdonnancier',
            xtype: 'gridpanel',
            /* le champ coche par cet onglet ; sert aussi de marqueur « onglet produits » au controleur */
            champOrdonnancier: champ,
            store: store,
            viewConfig: {
                forceFit: true,
                columnLines: true,
                stripeRows: true,
                deferEmptyText: false,
                emptyText: '<div style="padding:12px">Aucun produit pour ces crit&egrave;res.</div>'
            },
            columns: [
                {xtype: 'rownumberer', text: 'LG', width: 40},
                {header: 'C.CIP', dataIndex: 'intCIP', flex: 0.7, sortable: false, menuDisabled: true},
                {
                    header: 'D&eacute;signation', dataIndex: 'strNAME', flex: 2.5, sortable: false, menuDisabled: true,
                    renderer: function (v, m, r) {
                        var t = Ext.String.htmlEncode(v);
                        // Regle conservee (Q3.1) : coche « ordonnancier » mais sans code tableau, le produit
                        // n'entre pas au registre. Le dire ici evite de le decouvrir a l'edition.
                        if (!sensible && r.get('scheduled') && !r.get('intT')) {
                            t += ' <span class="ordo-badge-sans-code" title="Coch&eacute; mais sans code tableau : '
                                    + 'n\'entre pas au registre tant que le code manque">SANS CODE TABLEAU</span>';
                        }
                        return t;
                    }
                },
                {
                    header: 'Code tableau', dataIndex: 'intT', width: 95, align: 'center', sortable: false, menuDisabled: true,
                    renderer: function (v) {
                        return v ? '<b>' + Ext.String.htmlEncode(v) + '</b>' : '<span style="color:#999">&mdash;</span>';
                    }
                },
                {header: 'Prix vente', dataIndex: 'intPRICE', xtype: 'numbercolumn', format: '0,000.', align: 'right',
                    flex: 0.6, sortable: false, menuDisabled: true},
                {header: 'Stock', dataIndex: 'stock', align: 'right', flex: 0.4, sortable: false, menuDisabled: true},
                {
                    xtype: 'checkcolumn',
                    header: sensible ? 'Sensible' : 'Ordonnancier',
                    dataIndex: champ === 'sensible' ? 'sensible' : 'scheduled',
                    itemId: 'colonneCoche',
                    width: 95, sortable: false, menuDisabled: true
                }
            ],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'textfield', itemId: 'recherche', emptyText: 'Nom ou CIP… (Entrée)', width: 260,
                            maxLength: 100, enforceMaxLength: true, enableKeyEvents: true},
                        {xtype: 'combobox', itemId: 'rayon', flex: 1, minWidth: 170, store: rayons, pageSize: 99999,
                            valueField: 'id', displayField: 'libelle', queryMode: 'remote', minChars: 2,
                            emptyText: 'Tous les emplacements'},
                        {xtype: 'combobox', itemId: 'filtre', fieldLabel: 'Afficher', labelWidth: 55, width: 230, store: filtres,
                            valueField: 'valeur', displayField: 'libelle', editable: false, queryMode: 'local',
                            value: sensible ? 'tous' : 'coches'},
                        {text: 'Rechercher', itemId: 'rechercher', iconCls: 'searchicon'},
                        {text: 'Effacer', itemId: 'effacer', tooltip: 'Effacer les filtres'}
                    ]
                }, {
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'component', itemId: 'totalResultat', html: ''}, '->',
                        {text: 'Cocher tout le résultat', itemId: 'btnCocherTout', iconCls: 'checkicon', valeurLot: true,
                            tooltip: 'Coche TOUS les produits de la recherche courante, sur toutes les pages ; '
                                    + 'le bouton affiche le nombre, puis demande de confirmer'},
                        {text: 'Décocher tout le résultat', itemId: 'btnDecocherTout', valeurLot: false,
                            tooltip: 'Décoche TOUS les produits de la recherche courante, sur toutes les pages ; '
                                    + 'le bouton affiche le nombre, puis demande de confirmer'}
                    ]
                }],
            bbar: {xtype: 'pagingtoolbar', pageSize: parPage, store: store, displayInfo: true}
        };
    },

    /** Les criteres de la recherche d'un onglet produits, communs a la liste et au lot. */
    criteresProduits: function (grille) {
        var v = function (id) {
            var c = grille.down('#' + id);
            return c ? (c.getValue() || '') : '';
        };
        return {query: v('recherche'), rayon: v('rayon'), filtre: v('filtre'), champ: grille.champOrdonnancier};
    },

    /**
     * L'onglet d'analyse : trois palmares cote a cote, precedes des indicateurs de la periode.
     *
     * Le registre repond a « qui a recu quoi » ; l'analyse repond a « qu'est-ce qui sort, pour qui,
     * et sur prescription de qui », ce qu'aucune lecture ligne a ligne ne donne.
     */
    ongletAnalyse: function () {
        var me = this;
        return {
            title: 'Analyse',
            itemId: 'ongletAnalyse',
            xtype: 'panel',
            layout: {type: 'vbox', align: 'stretch'},
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'combobox',
                            itemId: 'analyseTop',
                            fieldLabel: 'Garder',
                            labelWidth: 45,
                            width: 190,
                            store: Ext.create('Ext.data.ArrayStore', {
                                data: [[10, '10 premiers'], [20, '20 premiers'], [50, '50 premiers'],
                                    [100, '100 premiers'], [0, 'Tout']],
                                fields: [{name: 'value', type: 'int'}, {name: 'libelle', type: 'string'}]
                            }),
                            valueField: 'value',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            value: 20
                        }, '-', {
                            text: 'Actualiser',
                            itemId: 'analyseActualiser',
                            iconCls: 'searchicon'
                        }, '-', {
                            text: 'Imprimer',
                            tooltip: 'Editer l\'analyse affich&eacute;e',
                            itemId: 'analyseImprimer',
                            iconCls: 'printable'
                        }, '-', {
                            text: 'Exporter',
                            tooltip: 'Exporter l\'analyse affich&eacute;e au format Excel',
                            itemId: 'analyseExporter',
                            iconCls: 'export_excel_icon'
                        }, '-', {
                            text: 'Cr&eacute;er inventaire',
                            tooltip: 'Cr&eacute;er un inventaire des produits d&eacute;livr&eacute;s sur la '
                                    + 'p&eacute;riode analys&eacute;e',
                            itemId: 'analyseInventaire',
                            iconCls: 'addicon'
                        }]
                }],
            items: [{
                    // Les indicateurs d'ensemble, avant les palmares : ils donnent l'echelle sans
                    // laquelle un classement ne veut rien dire.
                    xtype: 'container',
                    itemId: 'analyseIndicateurs',
                    height: 34,
                    padding: '6 8 6 8',
                    style: 'background:#eef8ee;border-bottom:1px solid #cfe3cf',
                    html: '<i>Ouvrez l\'onglet pour lancer l\'analyse de la p&eacute;riode.</i>'
                }, {
                    xtype: 'container',
                    flex: 1,
                    layout: {type: 'hbox', align: 'stretch'},
                    defaults: {flex: 1, margin: '0 4 0 0'},
                    items: [
                        me.grillePalmares('Produits les plus d&eacute;livr&eacute;s', 'grilleTopProduits',
                                me.produitStore, 'CIP / tableau'),
                        // retour du 05/11 : a cote du nom, de quoi joindre le client (telephone ; adresse a
                        // defaut pour un client assurance)
                        me.grillePalmares('Clients', 'grilleTopClients', me.clientStore,
                                'T&eacute;l&eacute;phone / adresse'),
                        me.grillePalmares('M&eacute;decins prescripteurs', 'grilleTopMedecins',
                                me.medecinStore, 'N&deg; ordre')
                    ]
                }]
        };
    },

    /**
     * Une grille de palmares.
     *
     * @param enteteComplement
     *            en-tete de la colonne annexe (CIP, numero d'ordre) ; {@code null} l'omet, car une
     *            colonne toujours vide occupe de la place sans rien dire.
     */
    grillePalmares: function (titre, itemId, store, enteteComplement) {
        var colonnes = [{header: 'Libell&eacute;', dataIndex: 'libelle', flex: 1}];
        if (enteteComplement) {
            colonnes.push({header: enteteComplement, dataIndex: 'complement', width: 110});
        }
        colonnes.push(
                {
                    header: 'D&eacute;liv.', dataIndex: 'delivrances', width: 60, align: 'right',
                    tooltip: 'Nombre de ventes distinctes, et non de lignes'
                },
                {header: 'Qt&eacute;', dataIndex: 'quantite', width: 60, align: 'right'},
                {
                    header: 'Montant', dataIndex: 'montant', width: 90, align: 'right',
                    xtype: 'numbercolumn', format: '0,000.'
                });
        return {
            xtype: 'gridpanel',
            title: titre,
            itemId: itemId,
            store: store,
            viewConfig: {
                forceFit: true,
                columnLines: true,
                deferEmptyText: false,
                emptyText: '<div style="padding:12px">Aucune donn&eacute;e sur la p&eacute;riode.</div>'
            },
            columns: colonnes
        };
    }
});


