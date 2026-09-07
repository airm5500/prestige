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
    height: 'auto',
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
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        me.trancheStore = Ext.create('Ext.data.Store', {
            fields: ['libelle', {name: 'ventes', type: 'int'}, {name: 'quantite', type: 'int'},
                {name: 'montant', type: 'int'}]
        });
        me.abcStore = Ext.create('Ext.data.Store', {
            fields: ['classe', 'cip', 'libelle', {name: 'quantite', type: 'int'},
                {name: 'montant', type: 'int'}, {name: 'part', type: 'float'},
                {name: 'cumulPart', type: 'float'}]
        });
        me.resumeStore = Ext.create('Ext.data.Store', {
            fields: ['classe', {name: 'produits', type: 'int'}, {name: 'montant', type: 'int'},
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
            // Selection multiple : « Comparer la selection » a besoin d'au moins deux gardes.
            selModel: Ext.create('Ext.selection.RowModel', {mode: 'MULTI'}),
            viewConfig: {
                columnLines: true,
                deferEmptyText: false,
                emptyText: '<div style="padding:12px">Aucune garde enregistr&eacute;e. '
                        + 'Utilisez « Nouvelle garde ».</div>'
            },
            columns: [
                {header: 'Libell&eacute;', dataIndex: 'libelle', flex: 1},
                {header: 'D&eacute;but', dataIndex: 'dateDebut', width: 130},
                {header: 'Dur&eacute;e', dataIndex: 'duree', width: 70, align: 'right'}
            ],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {text: 'Nouvelle garde', itemId: 'gardeNouvelle', iconCls: 'addicon'},
                        {text: 'Modifier', itemId: 'gardeModifier'},
                        {text: 'Supprimer', itemId: 'gardeSupprimer'}
                    ]
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
                            columns: [
                                {header: 'Tranche', dataIndex: 'libelle', flex: 1},
                                {header: 'Ventes', dataIndex: 'ventes', width: 60, align: 'right'},
                                {header: 'Qt&eacute;', dataIndex: 'quantite', width: 55, align: 'right'},
                                {
                                    header: 'Montant', dataIndex: 'montant', width: 95, align: 'right',
                                    xtype: 'numbercolumn', format: '0,000.'
                                }
                            ]
                        }, {
                            xtype: 'gridpanel',
                            title: 'Classification ABC des produits vendus',
                            itemId: 'grilleAbc',
                            flex: 1,
                            margin: '0 0 0 4',
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
                                    header: 'Part %', dataIndex: 'part', width: 60, align: 'right',
                                    xtype: 'numbercolumn', format: '0.00'
                                },
                                {
                                    header: 'Cumul %', dataIndex: 'cumulPart', width: 65, align: 'right',
                                    xtype: 'numbercolumn', format: '0.00'
                                }
                            ],
                            bbar: {
                                xtype: 'gridpanel',
                                itemId: 'grilleResumeAbc',
                                height: 92,
                                store: me.resumeStore,
                                columns: [
                                    {header: 'Classe', dataIndex: 'classe', flex: 1},
                                    {header: 'Produits', dataIndex: 'produits', width: 70, align: 'right'},
                                    {
                                        header: 'Montant', dataIndex: 'montant', width: 95, align: 'right',
                                        xtype: 'numbercolumn', format: '0,000.'
                                    },
                                    {
                                        header: 'Part %', dataIndex: 'part', width: 60, align: 'right',
                                        xtype: 'numbercolumn', format: '0.00'
                                    }
                                ]
                            }
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
                            // L'ecart se lit sur le chiffre PAR HEURE : une garde de week-end de
                            // 36 h fera toujours plus qu'une nuit de 12 h, sans rien dire de son
                            // intensite. Comparer les bruts ferait conclure a une progression
                            // qui n'existe pas.
                            text: 'Les &eacute;carts portent sur le chiffre <b>par heure</b>, '
                                    + 'seule base comparable entre gardes de dur&eacute;es diff&eacute;rentes.'
                        }, '->',
                        {
                            text: 'Trois derni&egrave;res', itemId: 'comparerDernieres',
                            tooltip: 'Comparer les trois derni&egrave;res gardes enregistr&eacute;es'
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
