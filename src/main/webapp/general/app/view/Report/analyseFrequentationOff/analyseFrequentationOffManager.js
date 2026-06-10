/* global Ext */

// Construit les points de la courbe d'evolution (affluence = nombre de ventes)
// par tranche horaire, dans l'ordre chronologique, a partir de la ligne cumulee.
function buildVisitorEvolutionData(record) {
    function nbre(field) {
        var v = record.get(field);
        return v ? Number(v.split('_')[1]) : 0;
    }
    return [
        {HORAIRE: '00:00-6:59', NBRE: nbre('DIX')},
        {HORAIRE: '7:00-8:59', NBRE: nbre('UN')},
        {HORAIRE: '9:00-10:59', NBRE: nbre('DEUX')},
        {HORAIRE: '11:00-13:59', NBRE: nbre('TROIS')},
        {HORAIRE: '14:00-15:59', NBRE: nbre('QUATRE')},
        {HORAIRE: '16:00-16:59', NBRE: nbre('CINQ')},
        {HORAIRE: '17:00-17:59', NBRE: nbre('SIX')},
        {HORAIRE: '18:00-18:59', NBRE: nbre('SEPT')},
        {HORAIRE: '19:00-19:59', NBRE: nbre('HUIT')},
        {HORAIRE: '20:00-23:59', NBRE: nbre('NEUF')}
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
            store: Ext.create('Ext.data.Store', {
                fields: ['HORAIRE', 'NBRE'],
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
                    xField: 'HORAIRE',
                    yField: 'NBRE',
                    smooth: true,
                    markerConfig: {
                        type: 'circle',
                        size: 4,
                        radius: 4
                    },
                    highlight: {
                        size: 7,
                        radius: 7
                    },
                    tips: {
                        trackMouse: true,
                        width: 160,
                        height: 30,
                        renderer: function (storeItem) {
                            this.setTitle(storeItem.get('HORAIRE') + ' : ' + storeItem.get('NBRE') + ' ventes');
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
