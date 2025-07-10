/* global Ext */

Ext.define('testextjs.view.Dashboard.RetourCarnet', {
    extend: 'Ext.panel.Panel',
    xtype: 'retourcarnetdepot',
    requires: [
        'Ext.grid.plugin.RowExpander'
    ],

    frame: true,
    title: 'Liste des retours de ventes',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {

        var retourtStore = new Ext.data.Store({
            fields: [
                {
                    name: 'id',
                    type: 'number'
                },
                {
                    name: 'libelle',
                    type: 'string'
                },
                {
                    name: 'dateOperation',
                    type: 'string'
                },
                {
                    name: 'tierspayantName',
                    type: 'string'
                },
                {
                    name: 'user',
                    type: 'string'
                },

                {
                    name: 'details',
                    type: 'string'
                }

            ],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v2/retour-carnet-depot/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 2400000
            }
        });
        var tierspayantExlus = new Ext.data.Store({
            fields: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'code',
                    type: 'string'
                },
                {
                    name: 'nom',
                    type: 'string'
                },
                {
                    name: 'nomComplet',
                    type: 'string'
                },
                {
                    name: 'account',
                    type: 'number'
                }
            ],
            pageSize: 20,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v2/carnet-depot/list-exclus',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
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
                            text: 'Nouveau retour',
                            scope: this,
                            itemId: 'btnRetour',
                            iconCls: 'addicon'

                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            labelWidth: 15,
                            flex: 0.7,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: '01/01/2022'

                        }, '-',

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 15,
                            flex: 0.7,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        },
                        {
                            xtype: 'combobox',
                            flex: 1.5,
                            margin: '0 5 0 0',
                            fieldLabel: 'Tiers-payants',
                            itemId: 'tiersPayantsExclus',
                            store: tierspayantExlus,
                            pageSize: 1.6,
                            valueField: 'id',
                            displayField: 'nomComplet',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un tiers-payant'
                        }, '-',
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            enableKeyEvents: true,
                            emptyText: 'Recherche'
                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        },

                        {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Qunatité retournée',
                            labelWidth: 120,
                            itemId: 'nbreVente',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Montant',
                            labelWidth: 80,
                            itemId: 'montant',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        }

                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    plugins: [{
                            ptype: 'rowexpander',
                            rowBodyTpl: new Ext.XTemplate(
                                    '<p>{details}</p>'
                                    )
                        }
                    ],
                    store: retourtStore,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        animCollapse: false,
                        hideable: false,
                        draggable: false
                    },
                    columns: [
                        {
                            xtype: 'rownumberer',
                            text: '#',
                            width: 30

                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Description',
                            dataIndex: 'libelle',
                            align: 'center',
                            flex: 1
                        }
                        ,
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Tiers-payant',
                            dataIndex: 'tierspayantName',
                            align: 'center',
                            flex: 1
                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Opérateur',
                            dataIndex: 'user',
                            align: 'center',
                            flex: 1
                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Date',
                            dataIndex: 'dateOperation',
                            align: 'center',
                            flex: 1
                        }
                        
                    ],

                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: retourtStore,
                        pageSize: 20,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }]
        });
        me.callParent(arguments);
    }
});


