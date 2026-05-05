/* global Ext */

Ext.define('testextjs.view.vente.PreSaleManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'preenregistrementmanager',

    frame: true,
    title: 'Liste Pre Ventes',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var vente = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 15,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/preventes',
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
                            text: 'Nouvelle Pré Vente',
                            scope: this,
                            itemId: 'addBtn',
                            iconCls: 'addicon',
                            cls: 'btn-primary'

                        }, '-',

                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            height: 30,
                            enableKeyEvents: true,
                            emptyText: 'Recherche'
                        }, '-',
                        {
                            xtype: 'combo',
                            fieldLabel: 'Filtrer',
                            flex: 1,
                            editable: false,
                            itemId: 'statut',
                            valueField: 'ID',
                            displayField: 'VALUE',
                            value: 'ALL',
                            store: Ext.create("Ext.data.Store", {
                                fields: ["ID", "VALUE"],
                                data: [{'ID': "is_Process", "VALUE": "Préventes clôturées"},
                                    {'ID': "pending", "VALUE": "Non clôturées"},
                                    {'ID': "ALL", "VALUE": "Tous"}

                                ]
                            })
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
                        }
                    ]
                }

            ],
            items: [{
                    xtype: 'gridpanel',
                    store: vente,

                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        collapsible: true,
                        enableColumnHide: false,
                        animCollapse: false
                    },
                    columns: [

                        {
                            header: 'Reference',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'strREF',
                            flex: 1
                        }, {
                            header: 'MONTANT',
                            xtype: 'numbercolumn',
                            align: 'right',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'intPRICE',
                            flex: 1,
                            format: '0,000.'

                        },
                        {
                            header: 'Date',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'dtUPDATED',
                            flex: 0.6,
                            align: 'center'
                        }, {
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 0.6,
                            sortable: false,
                            menuDisabled: true,
                            align: 'center'
                        }

                        , {
                            header: 'Vendeur',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userFullName',
                            flex: 1
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/page_white_edit.png',
                                    tooltip: 'Modifier',
                                    menuDisabled: true,
                                     getClass: function (value, metadata, record) {
                                        if (record.get('strSTATUT') === 'pending') {

                                            return 'x-display-hide';
                                        } else {
                                            return 'x-hide-display';
                                        }

                                    }
                                    ,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toEdit', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Supprimer',
                                   

                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toRemove', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        }
                    ],

                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: vente,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }]

        });
        me.callParent(arguments);
    }
});


