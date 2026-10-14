
/* global Ext */

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.Report.statActiviteOperateur.OperateurGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.op-grid',
    initComponent: function () {

        Me = this;

        var itemsPerPage = 20;

        var store = Ext.create('testextjs.store.Statistics.Operateur');

        Ext.apply(this, {
            features: [
                {
                    ftype: 'summary'
                }],
            id: 'opGrid',
          
            store: store,
            viewConfig: {
                emptyText: '<h1 style="margin:10px 10px 10px 70px">Pas de donn&eacute;es</h1>'
            },
            columns: [
                {
                    header: 'OP',
                    dataIndex: 'Operateur',
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
                    text: 'N.Clients',
                    dataIndex: 'NB CLIENT',
                    align: 'right',
                    summaryType: "sum",
                    summaryRenderer: function (value) {
                        if (value > 0) {
                            return "<b><span style='color:blue;'>" + value + "</span></b>";
                        } else {
                            return '';
                        }
                    }
                }
                , {
                    text: 'Montant Brut',
                    dataIndex: 'BRUT TTC',
                    align: 'right',
                    renderer: amountformat,
                    summaryType: "sum",
                    summaryRenderer: function (value) {
                        if (value > 0) {
                            return "<b><span style='color:blue;'>" + amountformat(value) + "  F</span></b>";
                        } else {
                            return '';
                        }
                    }


                },
                {
                    text: 'Remise',
                    dataIndex: 'REMISE',
                    summaryType: "sum",
                    align: 'right',
                    renderer: amountformat,
                    summaryRenderer: function (value) {
                        if (value > 0) {
                            return "<b><span style='color:blue;'>" + amountformat(value) + "  F</span></b>";
                        } else {
                            return '';
                        }
                    }

                },
                {
                    text: 'Mont.NetTTC',
                    dataIndex: 'NET TTC',
                    summaryType: "sum",
                    align: 'right',
                    renderer: amountformat,
                    summaryRenderer: function (value) {
                        if (value > 0) {
                            return "<b><span style='color:blue;'>" + amountformat(value) + "  F</span></b>";
                        } else {
                            return '';
                        }
                    }

                },
                {
                    text: 'Pan.Moy',
                    dataIndex: 'PANIER MOYEN',
                   align: 'right',
                    renderer: amountformat
                    

                }
                , {
                    text: 'Ordonnances T.P',
                    columns: [
                        {
                            text: 'Nombre',
                            dataIndex: 'NB_VO',
                            flex: 0.5,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + value + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            text: 'Montant',
                            dataIndex: 'VO_MONTANT',
                            align: 'right',
                            flex: 0.5,
                            summaryType: "sum",
                            renderer: amountformat,
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + amountformat(value) + "  F</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        }
                    ]

                },
                {
                    text: 'Ordon.Payantes',
                    columns: [
                        {
                            text: 'Nombre',
                            dataIndex: 'NB_VOP',
                            flex: 0.5,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + value + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            text: 'Montant',
                            renderer: amountformat,
                            align: 'right',
                            dataIndex: 'VO_MONTANTP',
                            flex: 0.5,
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + amountformat(value) + "  F</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        }
                    ]
//                  
                }, {
                    text: 'Pan.Moy',
                    dataIndex: 'PANIER_MOYEN_VOP',
                    align: 'right',
                    renderer: amountformat


                },
                {
                    text: 'Sans .Ordonnance',
                    columns: [
                        {
                            text: 'Nombre',
                            dataIndex: 'NB_VNO',
                            flex: 0.5,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + value + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            text: 'Montant',
                            renderer: amountformat,
                            dataIndex: 'VNO_MONTANT',
                            align: 'right',
                            flex: 0.5,
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + amountformat(value) + "  F</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        }, {
                            text: 'Pan.Moy',
                            dataIndex: 'PANIER_MOYEN_VNO',
                            flex: 0.5,
                            align: 'right',
                            renderer: amountformat
                            
                          

                        }
                    ]
//                  
                }

                , {
                    /* retours du 13/10 (point 11) : ventes ou l'operateur a ete choisi comme « Conseil » */
                    text: 'Conseil',
                    itemId: 'colConseil',
                    columns: [
                        {text: 'Nombre', dataIndex: 'NB_CONSEIL', itemId: 'colNbConseil', flex: 0.5, align: 'right', summaryType: 'sum'},
                        {text: 'Montant', dataIndex: 'MONTANT_CONSEIL', itemId: 'colMontantConseil', flex: 0.6, align: 'right', renderer: amountformat,
                            summaryType: 'sum', summaryRenderer: function (value) {
                                return value > 0 ? "<b><span style='color:blue;'>" + amountformat(value) + "  F</span></b>" : '';
                            }}
                    ]
                }
                , {
                    text: '%CA',
                    dataIndex: 'CA',
                    summaryType: "sum",
                    align: 'right'
                   


                }

            ],
            selModel: {
                selType: 'cellmodel'
            },
            bbar: {
                xtype: 'pagingtoolbar',
                store: store,
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();
    }


});


