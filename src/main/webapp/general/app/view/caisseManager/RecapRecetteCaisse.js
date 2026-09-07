/* global Ext */

Ext.define('testextjs.view.caisseManager.RecapRecetteCaisse', {
    extend: 'Ext.panel.Panel',
    xtype: 'caisserecetterecap',
    requires: [
        'testextjs.view.garde.SelecteurGarde'
    ],
    frame: true,
    title: 'Recapitulatif caisse/recette',
    width: '97%',
      height: Ext.getBody()?Ext.getBody().getViewSize().height*0.85:700,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        const storeTypereglement = new Ext.data.Store({
            fields: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'libelle',
                    type: 'string'
                }
            ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/type-reglements/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        const data = new Ext.data.Store({
            fields: [
                {
                    name: 'displayMvtDate',
                    type: 'string'
                },
                {
                    name: 'montantEspece',
                    type: 'number'
                },
                {
                    name: 'montantCredit',
                    type: 'number'
                },
                {
                    name: 'montantReglementDiff',
                    type: 'number'
                },
                {
                    name: 'montantHt',
                    type: 'number'
                },
                {
                    name: 'montantTtc',
                    type: 'number'
                },
                {
                    name: 'montantTva',
                    type: 'number'
                },
                {
                    name: 'montantNet',
                    type: 'number'
                },
                {
                    name: 'montantRemise',
                    type: 'number'
                },
                {
                    name: 'montantReglementFacture',
                    type: 'number'
                },
                {
                    name: 'montantMobile',
                    type: 'number'
                },
                {
                    name: 'montantCb',
                    type: 'number'
                },
                {
                    name: 'montantCheque',
                    type: 'number'
                },
                {
                    name: 'montantVirement',
                    type: 'number'
                },
                {
                    name: 'montantBilletage',
                    type: 'number'
                },
                {
                    name: 'nbreClient',
                    type: 'number'
                },
                {
                    // Repartition du montant mobile par mode, telle que le serveur l'a rencontree.
                    name: 'detailMobile',
                    type: 'auto'
                },
                {
                    name: 'montantSolde',
                    type: 'number'
                },
                {
                    name: 'montantEntre',
                    type: 'number'
                },
                {
                    name: 'montantSortie',
                    type: 'number'
                }

            ],
            pageSize: 99999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/stats-recette-caisse/data',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }
        });
        const modes = Ext.create('Ext.data.Store', {
            fields: ['modeId', 'mode', {name: 'montant', type: 'number'}, {name: 'operations', type: 'number'},
                {name: 'part', type: 'number'}, {name: 'montantMoyen', type: 'number'},
                {name: 'mobile', type: 'boolean'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/stats-recette-caisse/modes',
                reader: {type: 'json', root: 'data', totalProperty: 'total'},
                timeout: 600000
            }
        });
        const me = this;
        me.storeModes = modes;
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
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 0.6,
                            labelWidth: 20,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 20,
                            flex: 0.6,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        },

                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type.Reglement',
                            itemId: 'typeRglementId',
                            store: storeTypereglement,
                            flex: 2,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Selectionner un type de reglement...'

                        },
                        {
                            xtype: 'checkbox',
                            boxLabel: 'Annuelle',
                            checked: false,
                            itemId: 'groupByYear'
                        },
                        // Applique en un geste les bornes d'une garde enregistree.
                        {xtype: 'selecteurgarde'},
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }
                        , {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }, {
                            text: 'Exporter en excel',
                            itemId: 'btnExcel',
                            scope: this
                        }
                    ]
                }


            ],
            items: [{
                    /* Le tableau existant devient le premier onglet, a l'identique ; le suivi des
                       modes de reglement est le second (point 22). L'ecran garde ainsi son
                       comportement d'origine pour qui n'ouvre pas le nouvel onglet. */
                    xtype: 'tabpanel',
                    itemId: 'ongletsRecap',
                    border: false,
                    items: [
                {
                    xtype: 'gridpanel',
                    title: 'Récapitulatif',
                    border: false,
                    features: [
                        {
                            ftype: 'summary'
                        }],
                    itemId: 'caisserecetterecapGrid',
                    store: data,
                    /* Sous-detail des paiements mobiles (point 22) : la ligne s'ouvre sur la
                       repartition par mode que le serveur a rencontree ce jour-la. Rien n'est
                       ecrit d'avance - un operateur cree par l'officine y figure de lui-meme -
                       et le total du sous-detail vaut, par construction, le montant Mobile de la
                       ligne : il est rappele en bas pour que cela se verifie a l'oeil. */
                    plugins: [{
                            ptype: 'rowexpander',
                            rowBodyTpl: new Ext.XTemplate(
                                '<tpl if="this.vide(values.detailMobile)">',
                                '<div style="padding:6px 12px;color:#7f8c8d;">Aucun paiement mobile ce jour-là.</div>',
                                '<tpl else>',
                                '<div style="padding:6px 12px;">',
                                '<div style="font-weight:bold;color:#2a4d69;margin-bottom:4px;">',
                                'Détail des paiements mobiles</div>',
                                '<table style="border-collapse:collapse;">',
                                '{[ this.lignes(values.detailMobile) ]}',
                                '<tr><td style="padding:2px 18px 2px 0;border-top:1px solid #b8c6d4;',
                                'font-weight:bold;">Total mobile</td>',
                                '<td style="padding:2px 0;border-top:1px solid #b8c6d4;text-align:right;',
                                'font-weight:bold;">{[ this.montant(values.montantMobile) ]}</td></tr>',
                                '</table></div>',
                                '</tpl>',
                                {
                                    vide: function (detail) {
                                        return !detail || Ext.Object.getKeys(detail).length === 0;
                                    },
                                    montant: function (v) {
                                        return Ext.util.Format.number(v || 0, '0,000');
                                    },
                                    lignes: function (detail) {
                                        const format = this.montant;
                                        return Ext.Object.getKeys(detail || {}).map(function (mode) {
                                            return '<tr><td style="padding:2px 18px 2px 0;">' + Ext.String.htmlEncode(mode)
                                                    + '</td><td style="padding:2px 0;text-align:right;">'
                                                    + format(detail[mode]) + '</td></tr>';
                                        }).join('');
                                    }
                                })
                        }],
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: 'Date',
                            dataIndex: 'displayMvtDate',
                            summaryType: "count",
                            summaryRenderer: function (value) {

                                if (value > 0) {
                                    return "<b><span style='color:blue;'>TOTAL: </span></b>";
                                } else {
                                    return '';
                                }
                            }

                        },
                        {
                            header: 'Comptant',
                            dataIndex: 'montantEspece',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        }
                        ,
                        {
                            header: 'Mobile',
                            dataIndex: 'montantMobile',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        }
                        ,
                        {
                            header: 'Carte bancaire',
                            dataIndex: 'montantCb',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            header: 'Chèque',
                            dataIndex: 'montantCheque',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            header: 'Virement',
                            dataIndex: 'montantVirement',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            header: 'Crédit',
                            dataIndex: 'montantCredit',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        }
                        ,
                        {
                            header: 'Remise',
                            dataIndex: 'montantRemise',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            header: 'Net',
                            dataIndex: 'montantNet',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            header: 'Nbre clients',
                            /* Point 22 : couleur imposee en recette, sur la ligne comme sur le total.
                               Ces trois colonnes se lisent d'un coup d'oeil au moment de fermer la caisse. */
                            renderer: function (valeur) {
                                if (valeur === null || valeur === undefined || valeur === '') {
                                    return '';
                                }
                                return "<span style='color:#e67e22;font-weight:bold;'>"
                                        + Ext.util.Format.number(valeur, '0,000') + "</span>";
                            },
                            dataIndex: 'nbreClient',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (!value) {
                                    return '';
                                }
                                return "<b><span style='color:#e67e22;'>"
                                        + Ext.util.Format.number(value, '0,000') + "</span></b>";
                            }
                        },
                        {
                            header: 'Règlement tp',
                            dataIndex: 'montantReglementFacture',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            header: 'Règlement diff',
                            dataIndex: 'montantReglementDiff',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        
                        {
                            header: 'Billetage',
                            /* Point 22 : couleur imposee en recette, sur la ligne comme sur le total.
                               Ces trois colonnes se lisent d'un coup d'oeil au moment de fermer la caisse. */
                            renderer: function (valeur) {
                                if (valeur === null || valeur === undefined || valeur === '') {
                                    return '';
                                }
                                return "<span style='color:#7d3c98;'>"
                                        + Ext.util.Format.number(valeur, '0,000') + "</span>";
                            },
                            dataIndex: 'montantBilletage',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (!value) {
                                    return '';
                                }
                                return "<b><span style='color:#7d3c98;'>"
                                        + Ext.util.Format.number(value, '0,000') + "</span></b>";
                            }
                        },
                        {
                            header: 'Solde',
                            /* Point 22 : couleur imposee en recette, sur la ligne comme sur le total.
                               Ces trois colonnes se lisent d'un coup d'oeil au moment de fermer la caisse. */
                            renderer: function (valeur) {
                                if (valeur === null || valeur === undefined || valeur === '') {
                                    return '';
                                }
                                return "<span style='color:#c0392b;'>"
                                        + Ext.util.Format.number(valeur, '0,000') + "</span>";
                            },
                            dataIndex: 'montantSolde',
                            flex: 1,
                            summaryType: "sum",
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            summaryRenderer: function (value) {
                                if (!value) {
                                    return '';
                                }
                                return "<b><span style='color:#c0392b;'>"
                                        + Ext.util.Format.number(value, '0,000') + "</span></b>";
                            }
                        }

                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: data,
                        pageSize: 99999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                },
                {
                    /* Suivi des modes de reglement : synthese d'aide a la decision par mode, et
                       courbe de leur evolution. Les modes affiches sont ceux que l'officine
                       encaisse reellement sur la periode - aucun n'est ecrit d'avance. */
                    xtype: 'panel',
                    title: 'Suivi des modes de règlement',
                    itemId: 'ongletModes',
                    border: false,
                    layout: 'border',
                    items: [{
                            xtype: 'gridpanel',
                            itemId: 'grilleModes',
                            region: 'west',
                            width: 520,
                            split: true,
                            border: false,
                            features: [{ftype: 'summary'}],
                            store: modes,
                            viewConfig: {
                                columnLines: true,
                                emptyText: '<div style="margin:20px;">Lancez une recherche pour afficher les modes</div>',
                                deferEmptyText: false
                            },
                            columns: [
                                {header: 'Mode de règlement', dataIndex: 'mode', flex: 1,
                                    renderer: function (v, meta, rec) {
                                        // Les modes mobiles sont distingues : c'est sur eux que porte
                                        // le sous-detail de l'autre onglet.
                                        return rec.get('mobile')
                                                ? '<span style="color:#2a4d69;font-weight:bold;">' + Ext.String.htmlEncode(v || '')
                                                        + '</span> <span style="color:#7f8c8d;font-size:10px;">(mobile)</span>'
                                                : Ext.String.htmlEncode(v || '');
                                    },
                                    summaryRenderer: function () {
                                        return '<b>TOTAL</b>';
                                    }},
                                {header: 'Montant', dataIndex: 'montant', width: 110, align: 'right',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v || 0, '0,000');
                                    },
                                    summaryType: 'sum',
                                    summaryRenderer: function (v) {
                                        return '<b>' + Ext.util.Format.number(v || 0, '0,000') + '</b>';
                                    }},
                                {header: 'Part', dataIndex: 'part', width: 70, align: 'right',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v || 0, '0.0') + ' %';
                                    }},
                                {header: 'Opérations', dataIndex: 'operations', width: 85, align: 'right',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v || 0, '0,000');
                                    },
                                    summaryType: 'sum',
                                    summaryRenderer: function (v) {
                                        return '<b>' + Ext.util.Format.number(v || 0, '0,000') + '</b>';
                                    }},
                                {header: 'Panier moyen', dataIndex: 'montantMoyen', width: 100, align: 'right',
                                    tooltip: 'Montant moyen d\'une opération pour ce mode',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v || 0, '0,000');
                                    }}
                            ]
                        }, {
                            xtype: 'panel',
                            itemId: 'courbeModes',
                            region: 'center',
                            border: false,
                            layout: 'fit',
                            html: '<div style="margin:20px;color:#666;">Lancez une recherche pour afficher la courbe.</div>'
                        }]
                }
                    ]
                }

            ]

        });
        me.callParent(arguments);
    }
});


