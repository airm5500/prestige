
/* global Ext */

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.Report.statqties.qtygrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.statproduct-grid',

    initComponent: function () {
        const me = this;
        const page = 10;
        let store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },
                        {name: 'libelle',
                            type: 'string'

                        },
                        {name: 'codeCip',
                            type: 'string'

                        }
                        ,
                        {name: 'codeCip',
                            type: 'number'

                        }
                        ,
                        {name: 'janvier',
                            type: 'number'

                        }
                        ,
                        {name: 'fevrier',
                            type: 'number'

                        }
                        ,
                        {name: 'mars',
                            type: 'number'

                        }
                        ,
                        {name: 'avril',
                            type: 'number'

                        }
                        ,
                        {name: 'mai',
                            type: 'number'

                        }
                        ,
                        {name: 'juin',
                            type: 'number'

                        }
                        ,
                        {name: 'juillet',
                            type: 'number'

                        }
                        ,
                        {name: 'aout',
                            type: 'number'

                        }
                        ,
                        {name: 'septembre',
                            type: 'number'

                        }
                        ,
                        {name: 'octobre',
                            type: 'number'

                        }
                        ,
                        {name: 'novembre',
                            type: 'number'

                        }
                        ,
                        {name: 'octobre',
                            type: 'decembre'

                        }


                    ],
            autoLoad: true,
            pageSize: page,

            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/stats/vente-annuelle',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        let rayons = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/rayons',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        Ext.apply(me, {

            id: 'statproductGrid',
            store: store,
            viewConfig: {
                forceFit: true,
                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
            },

            columns: [
                {
                    header: 'id',
                    dataIndex: 'id',
                    hidden: true
                },
                {
                    header: 'CIP',
                    dataIndex: 'codeCip',
                    flex: 1

                }, {
                    header: 'LIBELLE',
                    dataIndex: 'libelle',
                    flex: 2

                },
                {
                    header: 'JANVIER',
                    dataIndex: 'janvier',
                    flex: 1, renderer: amountformat,
                    align: 'right'

                },
                {
                    header: 'FEVRIER',
                    dataIndex: 'fevrier',
                    flex: 1, renderer: amountformat,
                    align: 'right'
                },
                {
                    text: 'MARS',
                    dataIndex: 'mars',
                    flex: 1,
                    renderer: amountformat,
                    align: 'right'
                }
                , {
                    text: 'AVRIL',
                    dataIndex: 'avril',
                    align: 'right',
                    flex: 1,
                    renderer: amountformat
                }, {
                    text: 'MAI',
                    dataIndex: 'mai',
                    align: 'right',
                    flex: 1,
                    renderer: amountformat
                },
                {
                    text: 'JUIN',
                    dataIndex: 'juin',
                    align: 'right',
                    flex: 1,
                    renderer: amountformat
                },
                {
                    text: 'JUILLET',
                    dataIndex: 'juillet',
                    align: 'right',
                    flex: 1,
                    renderer: amountformat
                }
                ,
                {
                    text: 'AOÛT',
                    dataIndex: 'aout',
                    align: 'right',
                    flex: 1,
                    renderer: amountformat
                }
                ,
                {
                    text: 'SEPTEMBRE',
                    dataIndex: 'septembre',
                    align: 'right',
                    flex: 1,
                    renderer: amountformat
                },
                {
                    text: 'OCTOBRE',
                    dataIndex: 'octobre',
                    align: 'right',
                    flex: 1,
                    renderer: amountformat
                },
                {
                    text: 'NOVEMBRE',
                    dataIndex: 'novembre',
                    align: 'right',
                    flex: 1,
                    renderer: amountformat
                }, {
                    text: 'DECEMBRE',
                    dataIndex: 'decembre',
                    align: 'right',
                    flex: 1,
                    renderer: amountformat
                }, {
                    xtype: 'actioncolumn',
                    width: 40,
                    items: [
                        {
                            getClass: function (v, meta, rec) {
                                return 'charticon16';
                            },
                            getTip: function (v, meta, rec) {

                                return 'Voir graphe';
                            },
                            handler: function (grid, rowIndex, colIndex) {
                                let rec = grid.getStore().getAt(rowIndex);
                                const annee = Ext.getCmp('cmbyears').getValue();
                                ;
                                let chartstore = Ext.create('Ext.data.Store', {
                                    fields: ['MOIS', 'qte'
                                    ],
                                    data: [
                                        {MOIS: 'JAN/' + annee,
                                            'qte': rec.get('janvier')
                                        },
                                        {MOIS: 'FEV/' + annee,
                                            'qte': rec.get('fevrier')
                                        },
                                        {MOIS: 'MARS/' + annee,
                                            'qte': rec.get('mars')
                                        },
                                        {MOIS: 'AVR/' + annee,
                                            'qte': rec.get('avril')
                                        },
                                        {MOIS: 'MAI/' + annee,
                                            'qte': rec.get('mai')
                                        },
                                        {MOIS: 'JUIN/' + annee,
                                            'qte': rec.get('juin')
                                        },
                                        {MOIS: 'JUIL/' + annee,
                                            'qte': rec.get('juillet')
                                        },
                                        {MOIS: 'AOÛT/' + annee,
                                            'qte': rec.get('aout')
                                        }, {MOIS: 'SEPT/' + annee,
                                            'qte': rec.get('septembre')
                                        },
                                        {MOIS: 'OCT/' + annee,
                                            'qte': rec.get('octobre')
                                        },
                                        {MOIS: 'NOV/' + annee,
                                            'qte': rec.get('novembre')
                                        },
                                        {MOIS: 'DEC/' + annee,
                                            'qte': rec.get('decembre')
                                        }

                                    ]
                                });
                                let win = Ext.create("Ext.window.Window", {
                                    title: "Graphe des quantités vendues  de : [" + rec.get('libelle') + "]",
                                    modal: true,
                                    width: '80%',
                                    height: 550,
                                    maximizable: true,
                                    layout: 'fit',
                                    items: [
                                        {
                                            xtype: "chart",
                                            style: 'background:#fff',
                                            store: chartstore,
                                            animate: true,
                                            insetPadding: 30,
                                            legend: {
                                                position: 'bottom'
                                            }, axes: [{
                                                    type: 'Numeric',
                                                    minimum: 0,
                                                    position: 'left',
                                                    fields: ['qte'],
                                                    title: false,
                                                    grid: true,
                                                    label: {
                                                        renderer: Ext.util.Format.numberRenderer('0,0')

                                                    }
                                                }, {
                                                    type: 'Category',
                                                    position: 'bottom',
                                                    fields: ['MOIS'],
                                                    title: false

                                                }],
                                            series: [{
                                                    type: 'line',
                                                    axis: 'left',
                                                    xField: 'MOIS',
                                                    yField: 'qte',
                                                    tips: {
                                                        trackMouse: true,
                                                        width: 350,
                                                        renderer: function (storeItem, item) {
                                                            this.setTitle("Quantité Vente au " + storeItem.get('MOIS') + " est de : " + amountformat(storeItem.get('qte')) + " ");
                                                        }
                                                    },
                                                    style: {
                                                        fill: '#38B8BF',
                                                        stroke: '#38B8BF',
                                                        'stroke-width': 3
                                                    },
                                                    markerConfig: {
                                                        type: 'circle',
                                                        size: 4,
                                                        radius: 4,
                                                        'stroke-width': 0,
                                                        fill: '#38B8BF',
                                                        stroke: '#38B8BF'
                                                    }
                                                }]


                                        }
                                    ],
                                    buttons: [
                                        {
                                            text: "Fermer",
                                            handler: function () {
                                                win.close();
                                            }
                                        }
                                    ]
                                });
                                win.show();
                            }
                        }

                    ]
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'textfield',
                            id: 'rechQty',
                            flex: 1,
                            emptyText: 'Recherche',
                            listeners: {
                                specialKey: function (field, e, Familletion) {
                                    if (e.getKey() === e.ENTER) {
                                        me.onSearch();
                                    }

                                }
                            }
                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            id: 'rayonsZone',
                            store: rayons,
                            pageSize: 99999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un emplacement',
                            listeners: {
                                select: function () {

                                    me.onSearch();
                                }
                            }

                        }, {
                            xtype: 'tbseparator'
                        }
                        ,
                        {
                            xtype: 'combo',

                            emptyText: 'Sélectionnez une année',

                            fieldLabel: 'Année',
                            labelWidth: 40,
                            flex: 1.5,
                            id: 'cmbyears',

                            value: new Date().getFullYear(),
                            valueField: 'value',
                            displayField: 'value',

                            store: Ext.create("Ext.data.Store", {
                                fields: [

                                    {
                                        name: 'value',
                                        type: 'int'
                                    }


                                ],
                                pageSize: 999,
                                // autoLoad: true,
                                proxy: {
                                    type: 'ajax',
                                    url: '../api/v1/produit/stats/years',
                                    reader: {
                                        type: 'json',
                                        root: 'data',
                                        totalProperty: 'total'
                                    }
                                }
                            }),
                            listeners: {
                                select: function () {

                                    me.onSearch();
                                }
                            }

                        }

                        , {
                            xtype: 'tbseparator'
                        },
                        {
                            // flex: 0.4,
                            width: 100,
                            xtype: 'button',
                            iconCls: 'searchicon',
                            text: 'Rechercher',
                            listeners: {
                                click: function () {
                                    me.onSearch();
                                }
                            }


                        }, {
                            xtype: 'tbseparator'
                        }

                        ,
                        {
                            width: 100,
                            xtype: 'button',
                            text: 'Imprimer',
                            iconCls: 'printable',

//                            glyph: 0xf1c1,
                            listeners: {
                                click: function () {

                                    let year = Ext.getCmp('cmbyears').getValue();
                                    let search_value = Ext.getCmp('rechQty').getValue();
                                    let rayonId = Ext.getCmp('rayonsZone').getValue();
                                    if (year === null) {
                                        year = new Date().getFullYear();
                                    }
                                    if (rayonId === null) {
                                        rayonId = '';
                                    }
                                    const linkUrl = '../StatProduitServlet?rayonId=' + rayonId + '&year=' + year
                                            + '&search=' + search_value;
                                    window.open(linkUrl);

                                }
                            }


                        }


                    ]
                },

                {

                    xtype: 'pagingtoolbar',
                    store: store,
                    pageSize: page,
                    dock: 'bottom',
                    displayInfo: true,
                    listeners: {
                        beforechange: function (page, currentPage) {
                            let myProxy = this.store.getProxy();
                            myProxy.params = {
                                year: new Date().getFullYear(),
                                search: '',
                                rayonId: ''
                            };
                            let rayonId = Ext.getCmp('rayonsZone').getValue();
                            let year = Ext.getCmp('cmbyears').getValue();
                            let search_value = Ext.getCmp('rechQty').getValue();
                            myProxy.setExtraParam('rayonId', rayonId);
                            myProxy.setExtraParam('year', year);
                            myProxy.setExtraParam('search', search_value);
                        }

                    }
                }]
        });
        this.callParent();
    },

    onSearch: function () {
        const grid = Ext.getCmp('statproductGrid');
        const year = Ext.getCmp('cmbyears').getValue();
        const search_value = Ext.getCmp('rechQty').getValue();
        let rayonId = Ext.getCmp('rayonsZone').getValue();

        grid.getStore().load({
            params: {
                rayonId: rayonId,
                year: year,
                search: search_value
            }
        });
    }


});


