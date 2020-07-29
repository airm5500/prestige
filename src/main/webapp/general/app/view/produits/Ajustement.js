/* global Ext */

Ext.define('testextjs.view.produits.Ajustement', {
    extend: 'Ext.panel.Panel',
    xtype: 'ajustementmanager',
    requires: [
        'Ext.grid.plugin.RowExpander'
    ],

    frame: true,
    title: 'GESTION DES AJUSTEMENTS DE STOCK',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
//        align: 'stretch'
    },
    initComponent: function () {
        var vente = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Ajustement',
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/ajustement',
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
                            text: 'Faire un ajustement',
                            scope: this,
                            itemId: 'addBtn',
                            iconCls: 'addicon'

                        },
                        , '-',
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            height: 30,
                            enableKeyEvents: true,
                            emptyText: 'Recherche'
                        }, '-',
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
//                            height: 30,
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-', {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
//                            height: 30,
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',
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
                    store: vente,

                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
//                        enableLocking: true,
                        collapsible: true,
                        enableColumnHide: false,
                        animCollapse: false
//                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [

                        {
                            header: 'Libellé',
                            dataIndex: 'description',
                            flex: 1.5,
                            sortable: false,
                            menuDisabled: true
                        }, {
                            header: 'Commentaire',
                            dataIndex: 'commentaire',
                            flex: 2,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Opérateur',
                            dataIndex: 'userFullName',
                            flex: 1,
                            sortable: false,
                            menuDisabled: true
                        },

                        {
                            header: 'Date',
                            dataIndex: 'dtUPDATED',
                            sortable: false,
                            menuDisabled: true,
                            flex: 0.6,
                            align: 'center'
                        }, {
                            header: 'Heure',
                            dataIndex: 'heure',
                            sortable: false,
                            menuDisabled: true,
                            flex: 0.6,
                            align: 'center'
                        }

                        , {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,

                            items: [{
                                    icon: 'resources/images/icons/fam/page_white_edit.png',
                                    tooltip: 'Voir Details',
                                    menuDisabled: true,
//                                    scope: me,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toItem',view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            hidden:true,
                            menuDisabled: true,
                            items: [
                                {
                                    tooltip: 'Supprimer',
//                                    scope: this,
                                    getClass: function (value, metadata, record) {
                                        if (record.get('cancel')) {
                                            return 'x-hide-display';
                                        } else {
                                            return 'x-display-hide';

                                        }
                                    }
                                    

                                }

                            ]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [
                                {
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Imprimer une fiche de cet ajustement',
//                                    scope: this,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('print',view, rowIndex, colIndex, item, e, record, row);
                                    }


                                }
                            ]
                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'

                    },
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


