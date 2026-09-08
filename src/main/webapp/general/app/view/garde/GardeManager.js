/* global Ext */

/*
 * Gestion des gardes.
 *
 * L'ecran ne reconstruit PAS les etats de gestion de l'officine. Le chiffre d'affaires par type de
 * vente, les reglements, les articles vendus sont deja affiches par des ecrans existants : la garde
 * leur transmet sa periode, par le selecteur pose dans leur barre d'outils. Reconstruire ici des
 * etats concurrents les ferait diverger de leurs originaux, et l'officine ne saurait plus lequel
 * croire.
 *
 * Ce que l'ecran calcule, et lui seul :
 *   - la repartition par tranche horaire, qu'aucun ecran ne propose, et qui est precisement ce
 *     qu'on veut savoir d'une nuit de garde : a quelle heure l'activite se concentre ;
 *   - la classification ABC sur la fenetre horaire EXACTE de la garde. La procedure ABC de
 *     l'application travaille au jour : une garde de 20 h a 8 h y deviendrait deux journees
 *     pleines, et le classement serait celui de l'activite diurne ;
 *   - la comparaison entre gardes, sur le chiffre PAR HEURE.
 */
Ext.define('testextjs.view.garde.GardeManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'gardemanager',

    frame: true,
    title: 'Gestion des gardes',
    iconCls: 'icon-grid',
    width: '97%',
    /*
     * Hauteur EXPLICITE, et non « auto ».
     *
     * Le conteneur qui accueille les ecrans du menu est en disposition automatique : il ne donne
     * aucune hauteur a son contenu. Une disposition « border », elle, ne sait pas se dimensionner
     * sur son contenu - c'est elle qui repartit la place, elle doit donc en recevoir. Les deux
     * ensemble donnaient un panneau de DOUZE pixels : l'ecran s'ouvrait, ses trois zones existaient
     * et se disaient visibles, mais rien n'etait dessine. C'est la meme hauteur que le
     * recapitulatif caisse / recette, qui porte la meme disposition.
     */
    height: Ext.getBody() ? Ext.getBody().getViewSize().height * 0.85 : 700,
    minHeight: 570,
    cls: 'custompanel',
    layout: {type: 'border'},

    initComponent: function () {
        var me = this;

        me.gardeStore = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', 'dateDebut', 'dateFin', 'jourDebut', 'heureDebut',
                'jourFin', 'heureFin', 'duree', {name: 'dureeMinutes', type: 'int'}],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/gardes',
                // Filtre par annee (retour du 08/09) : vide = toutes les gardes.
                extraParams: {annee: ''},
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        // Les annees pour lesquelles au moins une garde existe, precedees de « Toutes ».
        me.anneeStore = Ext.create('Ext.data.Store', {
            fields: ['annee', 'libelle'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/gardes/annees',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            },
            listeners: {
                load: function (store) {
                    store.insert(0, {annee: '', libelle: 'Toutes les ann\u00e9es'});
                }
            }
        });
        me.trancheStore = Ext.create('Ext.data.Store', {
            fields: ['libelle', {name: 'heureDuJour', type: 'int'}, {name: 'ventes', type: 'int'},
                {name: 'quantite', type: 'int'}, {name: 'montant', type: 'int'}]
        });
        me.abcStore = Ext.create('Ext.data.Store', {
            fields: ['classe', 'cip', 'libelle', {name: 'quantite', type: 'int'},
                {name: 'montant', type: 'int'}, {name: 'marge', type: 'int'},
                {name: 'tauxMarge', type: 'float'}, {name: 'part', type: 'float'},
                {name: 'cumulPart', type: 'float'}]
        });
        me.resumeStore = Ext.create('Ext.data.Store', {
            fields: ['classe', {name: 'produits', type: 'int'}, {name: 'montant', type: 'int'},
                {name: 'marge', type: 'int'}, {name: 'tauxMarge', type: 'float'},
                {name: 'part', type: 'float'}]
        });
        me.comparaisonStore = Ext.create('Ext.data.Store', {
            fields: ['libelle', 'dateDebut', 'dateFin', 'duree',
                {name: 'ventes', type: 'int'}, {name: 'quantite', type: 'int'},
                {name: 'montant', type: 'int'}, {name: 'montantParHeure', type: 'int'},
                {name: 'ecartParHeure', type: 'int'}, {name: 'ecartPourcentage', type: 'float'}]
        });

        Ext.applyIf(me, {
            items: [me.listeGardes(), me.detail()]
        });
        me.callParent(arguments);
    },

    listeGardes: function () {
        var me = this;
        return {
            region: 'west',
            width: 340,
            split: true,
            xtype: 'gridpanel',
            itemId: 'grilleGardes',
            title: 'Gardes enregistr&eacute;es',
            store: me.gardeStore,
            // Cases a cocher (retour du 08/09) : un clic sur la ligne choisit la garde a analyser,
            // les cases cochees servent a la suppression massive et a « Comparer la selection ».
            selModel: Ext.create('Ext.selection.CheckboxModel', {mode: 'MULTI', checkOnly: false}),
            viewConfig: {
                columnLines: true,
                deferEmptyText: false,
                emptyText: '<div style="padding:12px">Aucune garde enregistr&eacute;e. '
                        + 'Utilisez « Nouvelle garde ».</div>'
            },
            // Debut et fin, sans la duree : elle n'apportait rien a la lecture (retour du 08/09).
            columns: [
                {header: 'Libell&eacute;', dataIndex: 'libelle', flex: 1},
                {header: 'D&eacute;but', dataIndex: 'dateDebut', width: 118,
                    renderer: function (v) { return (v || '').substr(0, 16); }},
                {header: 'Fin', dataIndex: 'dateFin', width: 118,
                    renderer: function (v) { return (v || '').substr(0, 16); }}
            ],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {text: 'Nouvelle garde', itemId: 'gardeNouvelle', iconCls: 'addicon'},
                        {text: 'Modifier', itemId: 'gardeModifier'},
                        {
                            text: 'Supprimer', itemId: 'gardeSupprimer',
                            tooltip: 'Supprimer les gardes coch&eacute;es'
                        }
                    ]
                }, {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'combobox',
                            itemId: 'gardeAnnee',
                            fieldLabel: 'Ann&eacute;e',
                            labelWidth: 45,
                            width: 200,
                            store: me.anneeStore,
                            valueField: 'annee',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            value: ''
                        }]
                }]
        };
    },

    detail: function () {
        var me = this;
        return {
            region: 'center',
            xtype: 'tabpanel',
            itemId: 'ongletsGarde',
            items: [me.ongletAnalyse(), me.ongletComparaison()]
        };
    },

    ongletAnalyse: function () {
        var me = this;
        return {
            title: 'Analyse de la garde',
            itemId: 'ongletAnalyseGarde',
            xtype: 'panel',
            layout: {type: 'vbox', align: 'stretch'},
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'combobox',
                            itemId: 'gardeHeures',
                            fieldLabel: 'Tranches de',
                            labelWidth: 75,
                            width: 170,
                            store: Ext.create('Ext.data.ArrayStore', {
                                data: [[1, '1 heure'], [2, '2 heures'], [3, '3 heures'],
                                    [4, '4 heures'], [6, '6 heures']],
                                fields: [{name: 'value', type: 'int'}, {name: 'libelle', type: 'string'}]
                            }),
                            valueField: 'value',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            value: 2
                        }, '-',
                        {text: 'Imprimer', itemId: 'gardeImprimer', iconCls: 'printable'}, '-',
                        {
                            text: 'Exporter ABC', itemId: 'gardeExporterAbc',
                            tooltip: 'Exporter la classification ABC de la garde',
                            iconCls: 'export_excel_icon'
                        }, '-',
                        {
                            text: 'Exporter tranches', itemId: 'gardeExporterTranches',
                            tooltip: 'Exporter la r&eacute;partition horaire',
                            iconCls: 'export_excel_icon'
                        }]
                }],
            items: [{
                    xtype: 'container',
                    itemId: 'gardeIndicateurs',
                    height: 34,
                    padding: '6 8 6 8',
                    style: 'background:#eef8ee;border-bottom:1px solid #cfe3cf',
                    html: '<i>Choisissez une garde dans la liste de gauche.</i>'
                }, {
                    xtype: 'container',
                    flex: 1,
                    layout: {type: 'hbox', align: 'stretch'},
                    items: [{
                            xtype: 'gridpanel',
                            title: 'R&eacute;partition par tranche horaire',
                            itemId: 'grilleTranches',
                            width: 380,
                            store: me.trancheStore,
                            viewConfig: {
                                columnLines: true,
                                deferEmptyText: false,
                                emptyText: '<div style="padding:12px">Aucune vente sur cette garde.</div>'
                            },
                            // Retour du 08/09 : les tranches sont les heures du jour, cumulees sur
                            // toute la periode de la garde ; par tranche, le nombre de clients (ventes
                            // distinctes) et le chiffre d'affaires. La quantite n'y disait rien.
                            columns: [
                                {header: 'Tranche', dataIndex: 'libelle', flex: 1},
                                {header: 'Clients', dataIndex: 'ventes', width: 70, align: 'right'},
                                {
                                    header: 'Chiffre d\'affaires', dataIndex: 'montant', width: 120,
                                    align: 'right', xtype: 'numbercolumn', format: '0,000.'
                                }
                            ]
                        }, {
                            xtype: 'container',
                            flex: 1,
                            margin: '0 0 0 4',
                            layout: {type: 'vbox', align: 'stretch'},
                            items: [{
                                    xtype: 'toolbar',
                                    itemId: 'filtresAbc',
                                    items: [{
                                            xtype: 'combobox',
                                            itemId: 'abcClasse',
                                            fieldLabel: 'Classe',
                                            labelWidth: 45,
                                            width: 130,
                                            store: Ext.create('Ext.data.ArrayStore', {
                                                data: [['', 'Toutes'], ['A', 'A'], ['B', 'B'], ['C', 'C']],
                                                fields: ['value', 'libelle']
                                            }),
                                            valueField: 'value',
                                            displayField: 'libelle',
                                            queryMode: 'local',
                                            editable: false,
                                            value: ''
                                        }, {
                                            xtype: 'numberfield',
                                            itemId: 'abcLimite',
                                            fieldLabel: 'N premiers',
                                            labelWidth: 70,
                                            width: 145,
                                            minValue: 0,
                                            allowDecimals: false,
                                            value: 100,
                                            emptyText: 'tous'
                                        }, {
                                            xtype: 'combobox',
                                            itemId: 'abcTri',
                                            fieldLabel: 'Tri',
                                            labelWidth: 25,
                                            width: 175,
                                            store: Ext.create('Ext.data.ArrayStore', {
                                                data: [['montant', 'Chiffre d\'affaires'], ['quantite', 'Quantit\u00e9'],
                                                    ['marge', 'Marge']],
                                                fields: ['value', 'libelle']
                                            }),
                                            valueField: 'value',
                                            displayField: 'libelle',
                                            queryMode: 'local',
                                            editable: false,
                                            value: 'montant'
                                        }, '->', {
                                            xtype: 'tbtext',
                                            itemId: 'abcCompte',
                                            text: ''
                                        }]
                                }, {
                                    // Le resume par classe est pose AU-DESSUS de la liste : en bas de la
                                    // grille il n'etait pas visible (retour du 08/09).
                                    xtype: 'gridpanel',
                                    itemId: 'grilleResumeAbc',
                                    title: 'R&eacute;sum&eacute; par classe',
                                    height: 118,
                                    store: me.resumeStore,
                                    viewConfig: {columnLines: true},
                                    columns: [
                                        {header: 'Classe', dataIndex: 'classe', flex: 1,
                                            renderer: function (v) { return '<b>' + v + '</b>'; }},
                                        {header: 'Produits', dataIndex: 'produits', width: 70, align: 'right'},
                                        {
                                            header: 'Chiffre d\'affaires', dataIndex: 'montant', width: 120,
                                            align: 'right', xtype: 'numbercolumn', format: '0,000.'
                                        },
                                        {
                                            header: 'Marge', dataIndex: 'marge', width: 100, align: 'right',
                                            xtype: 'numbercolumn', format: '0,000.'
                                        },
                                        {
                                            header: 'Taux %', dataIndex: 'tauxMarge', width: 65, align: 'right',
                                            xtype: 'numbercolumn', format: '0.00'
                                        },
                                        {
                                            header: 'Part %', dataIndex: 'part', width: 60, align: 'right',
                                            xtype: 'numbercolumn', format: '0.00'
                                        }
                                    ]
                                }, {
                                    xtype: 'gridpanel',
                                    title: 'Classification ABC des produits vendus',
                                    itemId: 'grilleAbc',
                                    flex: 1,
                                    store: me.abcStore,
                                    viewConfig: {
                                        columnLines: true,
                                        deferEmptyText: false,
                                        emptyText: '<div style="padding:12px">Aucun produit vendu sur cette garde.</div>',
                                        getRowClass: function (ligne) {
                                            return 'classe-abc-' + (ligne.get('classe') || 'x').toLowerCase();
                                        }
                                    },
                                    columns: [
                                        {
                                            header: 'Cl.', dataIndex: 'classe', width: 40, align: 'center',
                                            renderer: function (valeur) {
                                                return valeur ? '<b>' + valeur + '</b>' : '';
                                            }
                                        },
                                        {header: 'CIP', dataIndex: 'cip', width: 90},
                                        {header: 'Produit', dataIndex: 'libelle', flex: 1},
                                        {header: 'Qt&eacute;', dataIndex: 'quantite', width: 55, align: 'right'},
                                        {
                                            header: 'Montant', dataIndex: 'montant', width: 95, align: 'right',
                                            xtype: 'numbercolumn', format: '0,000.'
                                        },
                                        {
                                            header: 'Marge', dataIndex: 'marge', width: 90, align: 'right',
                                            xtype: 'numbercolumn', format: '0,000.'
                                        },
                                        {
                                            header: 'Taux %', dataIndex: 'tauxMarge', width: 65, align: 'right',
                                            xtype: 'numbercolumn', format: '0.00'
                                        },
                                        {
                                            header: 'Part %', dataIndex: 'part', width: 60, align: 'right',
                                            xtype: 'numbercolumn', format: '0.00'
                                        },
                                        {
                                            header: 'Cumul %', dataIndex: 'cumulPart', width: 65, align: 'right',
                                            xtype: 'numbercolumn', format: '0.00'
                                        }
                                    ]
                                }]
                        }]
                }]
        };
    },

    ongletComparaison: function () {
        var me = this;
        return {
            title: 'Comparaison',
            itemId: 'ongletComparaison',
            xtype: 'gridpanel',
            store: me.comparaisonStore,
            viewConfig: {
                columnLines: true,
                deferEmptyText: false,
                emptyText: '<div style="padding:12px">Aucune garde &agrave; comparer.</div>'
            },
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'tbtext',
                            itemId: 'comparaisonResume',
                            // L'ecart se lit sur le chiffre PAR HEURE : une garde de week-end de
                            // 36 h fera toujours plus qu'une nuit de 12 h, sans rien dire de son
                            // intensite. Comparer les bruts ferait conclure a une progression
                            // qui n'existe pas.
                            text: 'Les &eacute;carts portent sur le chiffre <b>par heure</b>, '
                                    + 'seule base comparable entre gardes de dur&eacute;es diff&eacute;rentes.'
                        }, '->',
                        {
                            xtype: 'combobox',
                            itemId: 'nombreGardes',
                            fieldLabel: 'Comparer les',
                            labelWidth: 80,
                            width: 210,
                            store: Ext.create('Ext.data.ArrayStore', {
                                data: [[1, '1 derni&egrave;re garde'], [2, '2 derni&egrave;res'],
                                    [3, '3 derni&egrave;res'], [4, '4 derni&egrave;res'],
                                    [5, '5 derni&egrave;res'], [10, '10 derni&egrave;res']],
                                fields: [{name: 'value', type: 'int'}, {name: 'libelle', type: 'string'}]
                            }),
                            valueField: 'value',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            value: 3
                        }, '-',
                        {
                            text: 'Comparer', itemId: 'comparerDernieres',
                            tooltip: 'Comparer les derni&egrave;res gardes enregistr&eacute;es'
                        }, '-',
                        {
                            text: 'Comparer la s&eacute;lection', itemId: 'comparerSelection',
                            tooltip: 'Comparer les gardes s&eacute;lectionn&eacute;es dans la liste de gauche'
                        }]
                }],
            columns: [
                {header: 'Garde', dataIndex: 'libelle', flex: 1},
                {header: 'D&eacute;but', dataIndex: 'dateDebut', width: 140},
                {header: 'Dur&eacute;e', dataIndex: 'duree', width: 70, align: 'right'},
                {header: 'Ventes', dataIndex: 'ventes', width: 65, align: 'right'},
                {header: 'Qt&eacute;', dataIndex: 'quantite', width: 60, align: 'right'},
                {
                    header: 'Montant', dataIndex: 'montant', width: 110, align: 'right',
                    xtype: 'numbercolumn', format: '0,000.'
                },
                {
                    header: 'Par heure', dataIndex: 'montantParHeure', width: 100, align: 'right',
                    xtype: 'numbercolumn', format: '0,000.'
                },
                {
                    header: 'Ecart / h', dataIndex: 'ecartParHeure', width: 100, align: 'right',
                    renderer: function (valeur, meta, ligne) {
                        if (valeur === null || valeur === undefined || !ligne.get('duree')) {
                            return '';
                        }
                        // La couleur suit le signe : une baisse doit sauter aux yeux.
                        var couleur = valeur > 0 ? '#177a17' : (valeur < 0 ? '#a00' : '#666');
                        var signe = valeur > 0 ? '+' : '';
                        return '<span style="color:' + couleur + '">' + signe
                                + Ext.util.Format.number(valeur, '0,000') + '</span>';
                    }
                },
                {
                    header: 'Ecart %', dataIndex: 'ecartPourcentage', width: 80, align: 'right',
                    renderer: function (valeur) {
                        if (!valeur) {
                            return '';
                        }
                        var couleur = valeur > 0 ? '#177a17' : '#a00';
                        return '<span style="color:' + couleur + '">' + (valeur > 0 ? '+' : '')
                                + Ext.util.Format.number(valeur, '0.00') + ' %</span>';
                    }
                }
            ]
        };
    }
});
