/* global Ext */

Ext.define('testextjs.view.bons.AchatGrossisteMensuel', {
    extend: 'Ext.panel.Panel',
    xtype: 'achatgrossistemensuel',
    frame: true,
    title: 'Achats mensuels par grossiste',
    width: '98%',
    // Hauteur calee sur l'ecran : le panneau occupe la zone de contenu et reste
    // colle en haut (centerContent), la grille defile en interne si besoin.
    height: Ext.Element.getViewportHeight() - 100,
    minHeight: 580,
    cls: 'custompanel',
    layout: 'fit',
    initComponent: function () {

        const moisConfig = [
            {name: 'janvier', label: 'Janvier'},
            {name: 'fevrier', label: 'Février'},
            {name: 'mars', label: 'Mars'},
            {name: 'avril', label: 'Avril'},
            {name: 'mai', label: 'Mai'},
            {name: 'juin', label: 'Juin'},
            {name: 'juillet', label: 'Juillet'},
            {name: 'aout', label: 'Août'},
            {name: 'septembre', label: 'Sept.'},
            {name: 'octobre', label: 'Octobre'},
            {name: 'novembre', label: 'Nov.'},
            {name: 'decembre', label: 'Décembre'}
        ];
        const storeFields = [
            {name: 'grossisteId', type: 'string'},
            {name: 'libelle', type: 'string'},
            {name: 'total', type: 'number'}
        ];
        moisConfig.forEach(function (m) {
            storeFields.push({name: m.name, type: 'number'});
        });
        const data = new Ext.data.Store({
            idProperty: 'grossisteId',
            fields: storeFields,
            pageSize: 9999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/etat-control-bon/achats-mensuels',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }
        });
        const numberRenderer = function (v) {
            return Ext.util.Format.number(v, '0,000.');
        };
        const summaryRenderer = function (v) {
            return '<b>' + Ext.util.Format.number(v, '0,000.') + '</b>';
        };
        const actionColumn = {
                xtype: 'actioncolumn',
                header: 'Courbe',
                width: 55,
                align: 'center',
                items: [
                    {
                        icon: 'resources/images/icons/fam/chart_bar.png',
                        tooltip: 'Voir la courbe d\'évolution',
                        handler: function (grid, rowIndex) {
                            const record = grid.getStore().getAt(rowIndex);
                            const panel = grid.up('achatgrossistemensuel');
                            const typeLibelle = panel.amountType === 'HT' ? 'HT' : 'TTC';
                            const chartData = moisConfig.map(function (m) {
                                return {mois: m.label, montant: record.get(m.name)};
                            });
                            const chartStore = Ext.create('Ext.data.JsonStore', {
                                fields: ['mois', 'montant'],
                                data: chartData
                            });
                            Ext.create('Ext.window.Window', {
                                title: 'Evolution des achats ' + typeLibelle + ' - ' + record.get('libelle'),
                                width: 900,
                                height: 450,
                                layout: 'fit',
                                modal: true,
                                items: [
                                    {
                                        xtype: 'chart',
                                        animate: true,
                                        store: chartStore,
                                        insetPadding: 20,
                                        axes: [
                                            {
                                                type: 'Numeric',
                                                grid: true,
                                                position: 'left',
                                                fields: ['montant'],
                                                title: 'Montant ' + typeLibelle,
                                                minimum: 0,
                                                label: {
                                                    renderer: numberRenderer
                                                }
                                            },
                                            {
                                                type: 'Category',
                                                position: 'bottom',
                                                fields: ['mois'],
                                                title: 'Mois'
                                            }
                                        ],
                                        series: [
                                            {
                                                type: 'line',
                                                axis: 'left',
                                                xField: 'mois',
                                                yField: 'montant',
                                                highlight: {
                                                    size: 7,
                                                    radius: 7
                                                },
                                                markerConfig: {
                                                    type: 'circle',
                                                    size: 4,
                                                    radius: 4
                                                },
                                                tips: {
                                                    trackMouse: true,
                                                    width: 160,
                                                    renderer: function (storeItem, item) {
                                                        this.setTitle(storeItem.get('mois') + ' : '
                                                                + numberRenderer(storeItem.get('montant')));
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }).show();
                        }
                    }
                ]
            };
        const columns = [
            {
                header: 'Grossiste',
                dataIndex: 'libelle',
                flex: 1.6,
                summaryType: 'count',
                summaryRenderer: function () {
                    return '<b>TOTAL</b>';
                }
            }
        ];
        moisConfig.forEach(function (m) {
            columns.push({
                header: m.label,
                dataIndex: m.name,
                flex: 0.6,
                align: 'right',
                renderer: numberRenderer,
                summaryType: 'sum',
                summaryRenderer: summaryRenderer
            });
        });
        columns.push({
            header: 'Total',
            dataIndex: 'total',
            flex: 0.8,
            align: 'right',
            renderer: function (v, metaData) {
                metaData.style = 'font-weight:bold;';
                return numberRenderer(v);
            },
            summaryType: 'sum',
            summaryRenderer: summaryRenderer
        });
        columns.push(actionColumn);
        const me = this;
        // Type de montant courant : TTC par defaut, bascule HT via le bouton de la barre d'outils.
        me.amountType = 'TTC';
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
                            submitFormat: 'Y-m-d',
                            flex: 0.8,
                            labelWidth: 17,
                            maxValue: new Date(),
                            value: new Date(new Date().getFullYear(), 0, 1),
                            format: 'd/m/Y'
                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 17,
                            flex: 0.8,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'Montants : TTC',
                            tooltip: 'Basculer l\'affichage entre TTC et HT',
                            itemId: 'toggleType',
                            enableToggle: true,
                            scope: this
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: data,
                    features: [
                        {
                            ftype: 'summary'
                        }],
                    viewConfig: {
                        forceFit: true,
                        columnLines: true
                    },
                    columns: columns,
                    selModel: {
                        selType: 'cellmodel'
                    }
                }
            ]
        });
        me.callParent(arguments);
    }

});
