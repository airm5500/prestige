
/* global Ext */



Ext.define('testextjs.view.caisseManager.RapportGestion', {
    extend: 'Ext.panel.Panel',
    xtype: 'managementreport',
    frame: true,
    title: 'Rapport de gestion',
    scrollable: true,
    width: '90%',
    minHeight: 500,

    cls: 'custompanel',
    layout: {
        type: 'fit',
//        align: 'stretch',
        padding: 10
    },
    initComponent: function () {
        var store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },
                        {name: 'categorie',
                            type: 'string'

                        },
                        {name: 'libelle',
                            type: 'string'

                        },
                        {name: 'montant',
                            type: 'number'

                        },
                        {name: 'oder',
                            type: 'number'

                        },
                        {name: 'display',
                            type: 'number'

                        }
                        
                    ],
            autoLoad: false,
            pageSize: null,
            sorters: [{
                    property: 'display',
                    direction: 'ASC'
                }],
            proxy: {
                type: 'ajax',
                url: '../api/v1/caisse/rapport-gestion',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'

                }

            }, groupField: 'display'

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
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

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
                            tooltip: 'Imprimer le rapport',
                            scope: this

                        }
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    items: [
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'TOTAL SORTIE DE CAISSE',
                            labelWidth: 170,
                            itemId: 'montantDepense',
                            renderer: function (v) {
                                if (v < 0) {
                                    var value = v.split('-');
                                    v = Ext.util.Format.number(value[1], '0,000.') + ' CFA';
                                    return '-' + v;
                                } else {
                                    return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                }

                            },
                            fieldStyle: "color:red;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'TOTAL ENTREE DE CAISSE',
                            labelWidth: 180,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.') + ' CFA';
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantCaisse',
                            value: 0
                        }


                    ]
                }


            ],
            items: [
                {

                    xtype: 'gridpanel',
                    scrollable: true,
                    features: [
                        {
                            ftype: 'grouping',
                            collapsible: true,
                            groupHeaderTpl: "{[values.rows[0].data.categorie]}",
                            hideGroupedHeader: true,
                            enableGroupingMenu: false

                        }],
                    itemId: 'rapportGrid',
                    store: store,

//                    height: 150,
//                    viewConfig: {
//                        forceFit: true,
//                        columnLines: true
//
//                    },

                    columns: [

                        {
                            header: 'Libellé',
                            dataIndex: 'libelle',
//                             summaryType: "count",
                            flex: 2
                        }

                        , {
                            header: 'Montant',
                            dataIndex: 'montant',
                            xtype: 'numbercolumn',
                            //   format: '0,000.',
                            align: 'right',
                            flex: 1,
                            renderer: function (v, metaData, r) {
                                if (v < 0) {
//                                    console.log(metaData);
                                    metaData['style'] = 'color:red;';

                                    v = Ext.util.Format.number((-1 * v), '0,000.');
                                    return '-' + v;
                                } else {
                                    return Ext.util.Format.number(v, '0,000.');
                                }

                            }
                        }
                    ],
                    selModel: {
                        selType: 'rowmodel'
//                        mode: 'SINGLE'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        pageSize: null,
                        dock: 'bottom',
                        displayInfo: true

                    }

                }
            ]

        });
        this.callParent();
    }
});


