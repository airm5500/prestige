
/* global Ext */
Ext.define('testextjs.view.vente.VenteTiersPayant', {
    extend: 'Ext.panel.Panel',
    xtype: 'tpventes',
    frame: true,
    title: 'LISTTE DES BORDEREAUX',
    width: '97%',
    height: 500,
    minHeight: 500,
    cls: 'custompanel',
    layout: {
        type: 'fit',
        padding: 10
    },
    initComponent: function () {
        var groupesStore = Ext.create('Ext.data.Store', {
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
                url: '../api/v1/facturation/groupetierspayant',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var searchstore = Ext.create('Ext.data.Store', {
            idProperty: 'lgTIERSPAYANTID',
            fields:
                    [
                        {name: 'lgTIERSPAYANTID',
                            type: 'string'

                        },

                        {name: 'strFULLNAME',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/client/tiers-payants',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
            

        });
        var store = Ext.create('Ext.data.Store', {
            fields:
                    [
                        {name: 'libelleGroupe',
                            type: 'string'

                        }, {name: 'HEURE',
                            type: 'string'

                        }, {name: 'codeTiersPayant',
                            type: 'string'

                        },
                        {name: 'libelleTiersPayant',
                            type: 'string'

                        }, {name: 'tiersPayantId',
                            type: 'string'
                        },
                        {name: 'libelleGroupe',
                            type: 'string'
                        },
                        {name: 'montantRemise',
                            type: 'number'

                        },
                        {name: 'montant',
                            type: 'number'

                        },
                        {name: 'groupeId',
                            type: 'number'

                        },
                        {name: 'nbreDossier',
                            type: 'number'

                        }


                    ],
            autoLoad: false,
            pageSize: 999999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/client/ventes-tierspayant',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 240000

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
                            labelWidth: 15,
                            flex: 0.6,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 15,
                            flex: 0.6,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 0.8,
                            enableKeyEvents: true,
                            emptyText: 'Taper pour rechercher'
                        },

                        {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'combo',
                            fieldLabel: 'Type tiers-payant',
                            labelWidth: 110,
                            flex: 1.2,
                            editable: false,
                            itemId: 'typeTp',
                            valueField: 'ID',
                            displayField: 'VALUE',
                            value: 'ALL',
                            store: Ext.create("Ext.data.Store", {
                                fields: ["ID", "VALUE"],
                                data: [{'ID': "1", "VALUE": "Assurance"},
                                    {'ID': "2", "VALUE": "Carnet"},
                                    {'ID': "ALL", "VALUE": "Tous"}

                                ]
                            })
                        },
                        {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'combobox',
                            itemId: 'tpCmb',
                            fieldLabel: 'Tiers-payant',
                            flex: 1.4,
                            store: searchstore,
                            labelWidth: 90,
                            pageSize: 9999,
                            valueField: 'lgTIERSPAYANTID',
                            displayField: 'strFULLNAME',
                            minChars: 2,
                            queryMode: 'remote',
                            enableKeyEvents: true,
                            emptyText: 'Selectionner tiers payant...'


                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Groupes',
                            flex: 1.4,
                            labelWidth: 60,
                            itemId: 'groupTp',
                            store: groupesStore,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un Groupe'

                        }


                    ]
                },

                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        '->',
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'splitbutton',
                            text: 'Exporter',
                            iconCls: 'printable',
                            itemId: 'exporter',
                            menu:
                                    [
                                        {text: 'PDF',
                                            itemId: 'exporterpdf'

                                        },
                                        {text: 'EXCEL', itemId: 'exporterexcel'}
                                    ]

                        },

                       

                        {
                            xtype: 'splitbutton',
                            text: 'Exporter par groupe',
                            tooltip: 'Exporter par groupe',
                            iconCls: 'importicon',
                            itemId: 'exporterGroupe',
                            menu:
                                    [
                                        {text: 'PDF',
                                            itemId: 'exporterpdf'

                                        },
                                        {text: 'EXCEL', itemId: 'exporterexcel'}
                                    ]

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
                            fieldLabel: 'Nombre de dosseirs',
                            labelWidth: 120,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'nbre',
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Montant total',
                            labelWidth: 120,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montant',
                            value: 0
                        }


                    ]
                }


            ],
            items: [
                {
                    xtype: 'gridpanel',
                    itemId: 'uggid',
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },

                    columns: [

                        {
                            header: 'Groupe',
                            dataIndex: 'libelleGroupe',
                            flex: 1

                        },
                        {
                            header: 'Code organisme',
                            dataIndex: 'codeTiersPayant',
                            flex: 1

                        },
                        {
                            header: 'Libellé tiers-payant',
                            dataIndex: 'libelleTiersPayant',
                            flex: 1

                        },

                        {
                            header: 'Nbre dossiers',
                            dataIndex: 'nbreDossier',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        },

                        {
                            header: 'Montant',
                            dataIndex: 'montant',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 1
                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        pageSize: 999999,
                        dock: 'bottom',
                        displayInfo: true

                    }

                }
            ]

        });
        this.callParent();
    }
});


