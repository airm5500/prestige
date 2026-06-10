/* global Ext */

// Construit les points de la courbe d'evolution par tranche horaire, dans
// l'ordre chronologique, a partir de la ligne cumulee : affluence (nombre de
// ventes) et montant des ventes.
function buildVisitorEvolutionData(record) {
    function part(field, index) {
        var v = record.get(field);
        return v ? Number(v.split('_')[index]) : 0;
    }
    function point(horaire, field) {
        return {HORAIRE: horaire, NBRE: part(field, 1), MONTANT: part(field, 0)};
    }
    return [
        point('00:00-6:59', 'DIX'),
        point('7:00-8:59', 'UN'),
        point('9:00-10:59', 'DEUX'),
        point('11:00-13:59', 'TROIS'),
        point('14:00-15:59', 'QUATRE'),
        point('16:00-16:59', 'CINQ'),
        point('17:00-17:59', 'SIX'),
        point('18:00-18:59', 'SEPT'),
        point('19:00-19:59', 'HUIT'),
        point('20:00-23:59', 'NEUF')
    ];
}

Ext.define('testextjs.view.Report.analyseFrequentationOff.analyseFrequentationOffManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'analyseFrequentationOffManager',
    id: 'analyseFrequentationOffManagerID',
    requires: [
        'testextjs.view.Report.analyseFrequentationOff.VistorGrid'
    ],
    title: 'Analyse de fréquentation par plage Horaire',
    frame: true,
    width: '98%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    items: [
        {
            xtype: 'visitor-grid',
            height: 210
        },
        {
            xtype: 'chart',
            flex: 1,
            animate: true,
            style: 'background:#fff',
            legend: {
                position: 'bottom'
            },
            store: Ext.create('Ext.data.Store', {
                fields: ['HORAIRE', 'NBRE', 'MONTANT'],
                data: []
            }),
            axes: [
                {
                    type: 'Numeric',
                    position: 'left',
                    fields: ['NBRE'],
                    title: 'Nombre de ventes',
                    minimum: 0,
                    grid: true
                },
                {
                    type: 'Numeric',
                    position: 'right',
                    fields: ['MONTANT'],
                    title: 'Montant ventes',
                    minimum: 0,
                    label: {
                        renderer: function (v) {
                            return Ext.util.Format.number(v, '0,000');
                        }
                    }
                },
                {
                    type: 'Category',
                    position: 'bottom',
                    fields: ['HORAIRE'],
                    title: 'Tranche horaire'
                }
            ],
            series: [
                {
                    type: 'line',
                    axis: 'left',
                    title: 'Nombre de ventes',
                    xField: 'HORAIRE',
                    yField: 'NBRE',
                    smooth: true,
                    style: {
                        stroke: '#3892d3',
                        'stroke-width': 2
                    },
                    markerConfig: {
                        type: 'circle',
                        size: 4,
                        radius: 4,
                        fill: '#3892d3',
                        stroke: '#3892d3'
                    },
                    highlight: {
                        size: 7,
                        radius: 7
                    },
                    tips: {
                        trackMouse: true,
                        width: 170,
                        height: 30,
                        renderer: function (storeItem) {
                            this.setTitle(storeItem.get('HORAIRE') + ' : ' + storeItem.get('NBRE') + ' ventes');
                        }
                    }
                },
                {
                    type: 'line',
                    axis: 'right',
                    title: 'Montant ventes',
                    xField: 'HORAIRE',
                    yField: 'MONTANT',
                    smooth: true,
                    style: {
                        stroke: '#cc3333',
                        'stroke-width': 2
                    },
                    markerConfig: {
                        type: 'circle',
                        size: 4,
                        radius: 4,
                        fill: '#cc3333',
                        stroke: '#cc3333'
                    },
                    highlight: {
                        size: 7,
                        radius: 7
                    },
                    tips: {
                        trackMouse: true,
                        width: 200,
                        height: 30,
                        renderer: function (storeItem) {
                            this.setTitle(storeItem.get('HORAIRE') + ' : ' + Ext.util.Format.number(storeItem.get('MONTANT'), '0,000'));
                        }
                    }
                }
            ]
        }
    ],
    listeners: {
        afterrender: function (panel) {
            var chart = panel.down('chart');
            var gridStore = Ext.getCmp('VisitorGrid').getStore();
            var refresh = function () {
                if (gridStore.getCount() > 0) {
                    chart.getStore().loadData(buildVisitorEvolutionData(gridStore.getAt(0)));
                } else {
                    chart.getStore().removeAll();
                }
            };
            gridStore.on('load', refresh);
            refresh();
        }
    },
    dockedItems: [{
            xtype: 'toolbar',
            dock: 'top',
            items: [
                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Du',
                    labelWidth: 20,
                    flex: 0.7,
                    id: 'dt_start_Visitor',
                    listeners: {
                        change: function () {
                            Ext.getCmp('dt_end_Visitor').setMinValue(this.getValue());
                        }
                    }

                }, {
                    xtype: 'tbseparator'
                }

                ,
                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date fin',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Au',
                    labelWidth: 20,
                    flex: 0.7,
                    id: 'dt_end_Visitor',
                    listeners: {
                        change: function () {

                            Ext.getCmp('dt_start_Visitor').setMaxValue(this.getValue());
                        }
                    }

                }

                , {
                    xtype: 'tbseparator'
                },
                {
                    width: 100,
                    xtype: 'button',
                    iconCls: 'searchicon',
                    text: 'Rechercher',
                    listeners: {
                        click: function () {
                            var grid = Ext.getCmp('VisitorGrid');
                            var dt_start_vente = Ext.getCmp('dt_start_Visitor').getSubmitValue();
                            var dt_end_vente = Ext.getCmp('dt_end_Visitor').getSubmitValue();

                            grid.getStore().load({
                                params: {
                                    dt_start_vente: dt_start_vente,
                                    dt_end_vente: dt_end_vente
                                }
                            });
                        }
                    }


                }


                , {
                    xtype: 'tbseparator'
                }
                ,
                {
                    width: 100,
                    xtype: 'button',
                    text: 'Imprimer',
                    iconCls: 'printable',
                    listeners: {
                        click: function () {

                            var dt_start_vente = Ext.getCmp('dt_start_Visitor').getSubmitValue();
                            var dt_end_vente = Ext.getCmp('dt_end_Visitor').getSubmitValue();

                            var linkUrl = "../webservices/Report/visitorstatistics/ws_visitorstatistics_pdf.jsp" + "?dt_start_vente=" + dt_start_vente + "&dt_end_vente=" + dt_end_vente;
                            window.open(linkUrl);

                        }
                    }


                }


            ]
        }

    ]

});
