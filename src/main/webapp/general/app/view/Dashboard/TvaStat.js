/* global Ext */

Ext.define('testextjs.view.Dashboard.TvaStat', {
    extend: 'Ext.tab.Panel',
    xtype: 'tvastat',
    frame: true,
    width: '95%',
    height: 500,
    minHeight: 500,
    tabPosition: "top",
    initComponent: function () {
        var data = new Ext.data.Store({
            fields: [
                {
                    name: 'TAUX',
                    type: 'number'
                },
                {
                    name: 'Total HT',
                    type: 'number'
                },
                {
                    name: 'Total TVA',
                    type: 'number'
                },
                {
                    name: 'Total TTC',
                    type: 'number'
                }
            ],
            pageSize: null,
            autoLoad: false,
            storeId: 'tvadata',
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/tvastat',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }
            }
        });
        var me = this;
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
                            flex: 1,
                            labelWidth: 20,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 20,
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        },
                        {
                            xtype: 'combo',
                            value: 'Periode',
                            flex: 1,
                            itemId: 'comboRation',
                            labelWidth: 60,
                            fieldLabel: 'Filtrer par',
                            store: ['Periode', 'Journalier']
                        }, {
                            xtype: 'combo',
                            value: 'TOUT',
                            flex: 1,
                            itemId: 'typeVente',
                            labelWidth: 90,
                            fieldLabel: 'Type vente',
                            store: ['TOUT', 'VNO']
                        },

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
                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'gridpanel',
                    title: 'Résultat par TVA',
                    border: false,
                    features: [
                        {
                            ftype: 'summary'
                        }],
                    itemId: 'tvaGrid',
                    store: data,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: 'Taux',
                            dataIndex: 'TAUX',
                            align: 'right',
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
                            header: 'Total HT',
                            dataIndex: 'Total HT',
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
                            header: 'Total TVA',
                            dataIndex: 'Total TVA',
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
                            header: 'Total TTC',
                            dataIndex: 'Total TTC',
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



                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: data,
                        dock: 'bottom',
                        displayInfo: true

                    }
                },
                {
                    xtype: 'panel',
                    title: 'Graphe du résultat par TVA',
                    layout:
                            {
                                type: 'vbox',
                                pack: 'start',
                                align: 'stretch'
                            },
                    items: [
                        {
                            xtype: 'container',
                            flex: 1,
                            layout:
                                    {
                                        type: 'hbox',
                                        pack: 'start',
                                        align: 'stretch'
                                    },
                            items: [
                                {
                                    xtype: 'chart',
                                    store: data,
                                    itemId: 'ttcChart',
                                    title: 'Rapport par Montant TTC',
                                    flex: 1,
                                    shadow: true,
                                    insetPadding: 10,
                                    animate: true,
//                                     theme: 'Base:gradients',
//                                    config: {colors: ['#6F5092', '#64BD4F']},
                                    legend: {
                                        position: 'bottom'
                                    },
                                    series: [{
                                            type: 'pie',
                                            axis: 'left',
                                            field: 'Total TTC',
                                            showInLegend: true,
//                                            title:'RAPPORT PAR MONTANT TTC',
                                            donut: 25,

//                                            renderer:function(sprite, record, attributes, index, store) {
//                                                console.log(attributes);
//                                                return ;
//                                            },
                                            highlight: {
                                                segment: {
                                                    margin: 20
                                                }
                                            }, label: {// show the months names inside the pie
                                                field: 'TAUX',
                                                display: 'rotate',
                                                contrast: true,
                                                font: '18px Arial'
                                            }, style: {

                                                opacity: 0.93
//                                                 colors: ['#00B8BF', '#EDFF9F','#00B8BF', '#EDFF9F']
                                            },
                                            tips: {
                                                trackMouse: true,
                                                style: 'font-size:11px;background: #fff;color: #6D6D6D;',
                                                width: 150,

                                                renderer: function (storeItem, item) {
                                                    this.setTitle(storeItem.get('TAUX') + '%' + '= Total TTC :' + storeItem.get('Total TTC'));

                                                }
                                            }

                                        }]
                                },
                                {
                                    xtype: 'chart',
                                    style: 'background:#fff',
                                    store: data,
                                    flex: 1,
                                    title: 'Rapport par Montant HT',
                                    animate: true,

                                    legend: {
                                        position: 'bottom'
                                    },
                                    series: [{
                                            type: 'pie',
                                            axis: 'left',
                                            field: 'Total HT',
                                            showInLegend: true,

                                            donut: 25,
                                            highlight: {
                                                segment: {
                                                    margin: 20
                                                }
                                            }, label: {// show the months names inside the pie
                                                field: 'TAUX',
                                                display: 'insideStart',
                                                contrast: true,
                                                font: '18px Arial'
                                            }
                                            , style: {
                                                opacity: 0.93

                                            },
                                            tips: {
                                                trackMouse: true,
                                                style: 'font-size:11px;background: #fff;color: #6D6D6D;',
                                                width: 150,

                                                renderer: function (storeItem, item) {
                                                    this.setTitle(storeItem.get('TAUX') + '%' + '= Total HT:' + storeItem.get('Total HT'));

                                                }
                                            }
                                        }]
                                }


                            ]
                        }
                    ]
                }

            ]

        });
        me.callParent(arguments);
    }
});


