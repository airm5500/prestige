/* global Ext */



function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.Report.comparaisonCAFamilles.CAFamilleManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'comparaisonChiffreAffaireManager',
    id: 'comparaisonChiffreAffaireManagerID',
    requires: [
        'testextjs.view.Report.comparaisonCAFamilles.CAFamilleGrid',
      'testextjs.view.Report.comparaisonCAFamilles.action.FamillerCharts',
                'testextjs.store.Statistics.FamillesCA'

    ],
    title: 'Comparaison Chiffre d\'Affaires des Familles',
    frame: true,
    width: '99.5%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
//    autoScroll: true,
    layout: 'card',
    items: [{
            xtype: 'familleca-grid'


        }, {
            xtype: 'panel',
            width: '100%',
            id: 'grapheFamilleCA',
            layout: 'fit',
            items: [
                {
                    xtype: 'familleca-chart',
                    hidden: true
                }],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'combo',
                            width: '50%',
                            id: 'CombofamilleCa',
                            labelWidth: 150,
                            displayField: 'str_Libelle_Produit',
                            valueField: 'id',
                            fieldLabel: 'Filtrer par Famille',
                            store:'FamilleCAStore',
                            listeners: {
                                select: function () {
                                    const store = this.getStore();
                                    let  dt_start = Ext.Date.format(new Date(), 'd/m/Y');

                                    if (Ext.getCmp('dt_start_CA').getValue() !== null) {
                                        dt_start = Ext.Date.format(Ext.getCmp('dt_start_CA').getValue(), 'd/m/Y');
                                    }

                                    let year = dt_start.split('/')[2];
                                    const linechartstore = Ext.getCmp('famillecalignechartID').getStore();
                                    linechartstore.clearData();
                                    const record = store.findRecord('id', this.getValue());
                                    linechartstore.add({periode: '01/' + year, CA: record.get('janvier'), CAP: record.get('janvier_1')});
                                    linechartstore.add({periode: '02/' + year, CA: record.get('fevrier'), CAP: record.get('fevrier_1')});
                                    linechartstore.add({periode: '03/' + year, CA: record.get('mars'), CAP: record.get('mars_1')});
                                    linechartstore.add({periode: '04/' + year, CA: record.get('avril'), CAP: record.get('avril_1')});
                                    linechartstore.add({periode: '05/' + year, CA: record.get('mai'), CAP: record.get('mai_1')});
                                    linechartstore.add({periode: '06/' + year, CA: record.get('juin'), CAP: record.get('juin_1')});
                                    linechartstore.add({periode: '07/' + year, CA: record.get('juillet'), CAP: record.get('juillet_1')});
                                    linechartstore.add({periode: '08/' + year, CA: record.get('aout'), CAP: record.get('aout_1')});
                                    linechartstore.add({periode: '09/' + year, CA: record.get('sep'), CAP: record.get('sep_1')});
                                    linechartstore.add({periode: '10/' + year, CA: record.get('oct'), CAP: record.get('oct_1')});
                                    linechartstore.add({periode: '11/' + year, CA: record.get('nov'), CAP: record.get('nov_1')});
                                    linechartstore.add({periode: '12/' + year, CA: record.get('dec'), CAP: record.get('dec_1')});
                                    Ext.getCmp('famillecalignechartID').setVisible(true);
                                }
                            }

                        }]
                }]

        }


    ], dockedItems: [{
            xtype: 'toolbar',
            dock: 'top',
            items: [
                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date ',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Du',
                    labelWidth: 20,
                    width: 300,
                    id: 'dt_start_CA'

                }, {
                    xtype: 'tbseparator'
                }
                ,
                {
                    // flex: 0.4,
                    width: 100,
                    xtype: 'button',
                    iconCls: 'searchicon',
                    text: 'Rechercher',
                    listeners: {
                        click: function () {

                            var grid = Ext.getCmp('FamillecaGrid');
                            var dt_start_vente = Ext.getCmp('dt_start_CA').getSubmitValue();
                            var periode_1 = Number(dt_start_vente.split('-')[0]) - 1;
                            var periode = dt_start_vente.split('-')[0];
                            var columns = [{
                                    text: 'GP',
                                    dataIndex: 'GP'
                                }, {
                                    text: 'Libellé Famille',
                                    dataIndex: 'str_Libelle_Produit'
                                },
                                {
                                    header: '01/' + periode_1,
                                    dataIndex: 'janvier_1',
                                    align: 'right',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_janvier_1',
                                    align: 'right'
                                },
                                {
                                    header: '01/' + periode,
                                    dataIndex: 'janvier',
                                    summaryType: "sum",
                                    align: 'right',
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    align: 'right',
                                    dataIndex: 'P_janvier'
                                },
                                {
                                    header: '%Pr',
                                    align: 'right',
                                    dataIndex: 'Prog_janvier'
                                },
                                {
                                    header: '02/' + periode_1,
                                    dataIndex: 'fevrier_1',
                                    align: 'right',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_fevrier_1',
                                    align: 'right'
                                },
                                {
                                    header: '02/' + periode,
                                    dataIndex: 'fevrier',
                                    summaryType: "sum",
                                    align: 'right',
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_fevrier',
                                    align: 'right'
                                },
                                {
                                    header: '%Pr',
                                    align: 'right',
                                    dataIndex: 'Prog_fevrier'
                                },
                                {
                                    header: '03/' + periode_1,
                                    dataIndex: 'mars_1',
                                    align: 'right',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    align: 'right',
                                    dataIndex: 'P_mars_1'
                                },
                                {
                                    header: '03/' + periode,
                                    dataIndex: 'mars',
                                    align: 'right',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    align: 'right',
                                    dataIndex: 'P_mars'
                                },
                                {
                                    header: '%Pr',
                                    align: 'right',
                                    dataIndex: 'Prog_mars'
                                },
                                {
                                    header: '04/' + periode_1,
                                    align: 'right',
                                    dataIndex: 'avril_1',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    align: 'right',
                                    dataIndex: 'P_avril_1'
                                },
                                {
                                    header: '04/' + periode,
                                    dataIndex: 'avril',
                                    align: 'right',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_avril',
                                    align: 'right'
                                }, {
                                    header: '%Pr',
                                    dataIndex: 'Prog_avril',
                                    align: 'right'
                                }, {
                                    header: '05/' + periode_1,
                                    align: 'right',
                                    dataIndex: 'mai_1',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_mai_1',
                                    align: 'right'
                                },
                                {
                                    header: '05/' + periode,
                                    dataIndex: 'mai',
                                    summaryType: "sum",
                                    align: 'right',
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_mai',
                                    align: 'right'
                                }, {
                                    header: '%Pr',
                                    dataIndex: 'Prog_mai',
                                    align: 'right'
                                },
                                {
                                    header: '06/' + periode_1,
                                    dataIndex: 'juin_1',
                                    align: 'right',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_juin_1',
                                    align: 'right'
                                },
                                {
                                    header: '06/' + periode,
                                    dataIndex: 'juin',
                                    summaryType: "sum",
                                    align: 'right',
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_juin',
                                    align: 'right'
                                }, {
                                    header: '%Pr',
                                    dataIndex: 'Prog_juin',
                                    align: 'right'
                                },
                                {
                                    header: '07/' + periode_1,
                                    dataIndex: 'juillet_1',
                                    align: 'right',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_juillet_1',
                                    align: 'right'
                                },
                                {
                                    header: '07/' + periode,
                                    dataIndex: 'juillet',
                                    align: 'right',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    align: 'right',
                                    dataIndex: 'P_juillet'
                                }, {
                                    header: '%Pr',
                                    align: 'right',
                                    dataIndex: 'Prog_juillet'
                                },
                                {
                                    header: '08/' + periode_1,
                                    dataIndex: 'aout_1',
                                    summaryType: "sum",
                                    align: 'right',
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_aout_1',
                                    align: 'right'
                                },
                                {
                                    header: '08/' + periode,
                                    align: 'right',
                                    dataIndex: 'aout',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_aout',
                                    align: 'right'
                                }, {
                                    header: '%Pr',
                                    dataIndex: 'Prog_aout',
                                    align: 'right'
                                },
                                {
                                    header: '09/' + periode_1,
                                    align: 'right',
                                    dataIndex: 'sep_1',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_sep_1',
                                    align: 'right'
                                },
                                {
                                    header: '09/' + periode,
                                    align: 'right',
                                    dataIndex: 'sep',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_sep',
                                    align: 'right'
                                }, {
                                    header: '%Pr',
                                    dataIndex: 'Prog_sep',
                                    align: 'right'
                                },
                                /***********/
                                {
                                    header: '10/' + periode_1,
                                    dataIndex: 'oct_1',
                                    align: 'right',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_oct_1',
                                    align: 'right'
                                },
                                {
                                    header: '10/' + periode,
                                    dataIndex: 'oct',
                                    align: 'right',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_oct',
                                    align: 'right'
                                }, {
                                    header: '%Pr',
                                    dataIndex: 'Prog_oct',
                                    align: 'right'},
                                {
                                    header: '11/' + periode_1,
                                    dataIndex: 'nov_1',
                                    summaryType: "sum",
                                    align: 'right',
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_nov_1',
                                    align: 'right'
                                },
                                {
                                    header: '11/' + periode,
                                    dataIndex: 'nov',
                                    summaryType: "sum",
                                    align: 'right',
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_nov',
                                    align: 'right'
                                }, {
                                    header: '%Pr',
                                    dataIndex: 'Prog_nov',
                                    align: 'right'
                                },
                                {
                                    header: '12/' + periode_1,
                                    align: 'right',
                                    dataIndex: 'dec_1',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_dec_1',
                                    align: 'right'
                                },
                                {
                                    header: '12/' + periode,
                                    align: 'right',
                                    dataIndex: 'dec',
                                    summaryType: "sum",
                                    renderer: amountformat,
                                    summaryRenderer: function (value) {
                                        if (value > 0) {
                                            return "<b><span style='color:blue;'>" + amountformat(value) + " F </span></b>";
                                        } else {
                                            return '';
                                        }
                                    }
                                }, {
                                    header: '%',
                                    dataIndex: 'P_dec',
                                    align: 'right'
                                }, {
                                    header: '%Pr',
                                    dataIndex: 'Prog_dec',
                                    align: 'right'
                                }


                            ];


                           
                            grid.reconfigure(null, columns);

                            grid.getStore().load({
                                params: {
                                    dt_start_vente: dt_start_vente
                                }
                            });
                            
                            var combofamilleca = Ext.getCmp('CombofamilleCa');
                            combofamilleca.clearValue();
                            combofamilleca.bindStore(grid.getStore());

                        }
                    }


                }, {
                    xtype: 'tbseparator'
                }
                ,
                {
                    xtype: 'button',
                    text: 'Voir tableau',
                    iconCls: 'tableauicon',
                    width: 110,
                    handler: function () {
                        Ext.getCmp("comparaisonChiffreAffaireManagerID").getLayout().setActiveItem(0);
                    }
                }

                , {
                    xtype: 'tbseparator'
                }
                ,
                {
                    xtype: 'button',
                    text: 'Voir graphes',
                    iconCls: 'charticon16',
                    width: 110,
                    handler: function () {
                        Ext.getCmp("comparaisonChiffreAffaireManagerID").getLayout().setActiveItem(1);


                    }


                },
                {
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
                            var dt_start_vente = Ext.getCmp('dt_start_CA').getSubmitValue();
                            var linkUrl = "../webservices/Report/comparaisonChiffreAffaire/ws_cafamille_pdf.jsp" + "?dt_start_vente=" + dt_start_vente;
                            window.open(linkUrl);

                        }
                    }


                }
            ]
        }

    ]

});


