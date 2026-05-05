/* global Ext */

Ext.define('testextjs.view.devis.Devis', {
    extend: 'Ext.panel.Panel',
    xtype: 'devismanager',
    requires: [
        'Ext.grid.plugin.RowExpander'
    ],

    frame: true,
    title: 'Liste Des Proforma',
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
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/devis',
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
                            text: 'Nouvelle PROFORMA',
                            scope: this,
                            itemId: 'addBtn',
                            iconCls: 'addicon'

                        }, '-',
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            height: 30,
                            labelWidth: 30,
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
                            height: 30,
                            labelWidth: 30,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

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
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-',
                        {
                            text: 'Imprimer',
                            tooltip: 'imprimer',
                            itemId: 'printPdf',
                            hidden: true,
                            scope: this,
                            iconCls: 'printable'
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
                        animCollapse: false,
                        enableColumnHide: false
//                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {
                            header: 'Reference',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'strREF',
                            flex: 0.5
                        }, {
                            header: 'MONTANT',
                            align: 'right',
                            sortable: false,
                            menuDisabled: true,
                            xtype: 'numbercolumn',
                            dataIndex: 'intPRICE',
                            flex: 0.5,
                            format: '0,000.'

                        },
                        {
                            header: 'Date',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'dtUPDATED',
                            flex: 0.4,
                            align: 'center'
                        }, {
                            header: 'Heure',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'heure',
                            flex: 0.4,
                            align: 'center'
                        }

                        , {
                            header: 'Vendeur',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userFullName',
                            flex: 1
                        }
                        , {
                            header: 'Client',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'clientFullName',
                            flex: 1
                        },
                        
                          {
                            header: 'Tiers-payant',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'tierspayants',
                            flex: 1,
                               renderer: function (v) {
                                   if(v.length>0){
                                       return  v[0].tpFullName;
                                   }
                                   return '';
                               }
                        },
                        
                        
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/application_go.png',
                                    tooltip: 'Transformer en Vente',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toTransform', view, rowIndex, colIndex, item, e, record, row);
                                    }


                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/duplicate_3671686.png',
                                    tooltip: 'Cloner le devis',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toClone', view, rowIndex, colIndex, item, e, record, row);
                                    }


                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/page_white_edit.png',
                                    tooltip: 'Modifier',
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
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Re-imprimer le proforma',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toPrintTicket', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/pdf.png',
                                    tooltip: 'Imprimer',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toPdf', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },
                         {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/pdf.png',
                                    tooltip: 'Bon livraison',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toBonPdf', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/excel_csv2.png',
                                    tooltip: 'Exporter en csv',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toExportCsv', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/docx.png',
                                    tooltip: 'Exporter en word',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toExportWord', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/excel_icon.png',
                                    tooltip: 'Exporter en excel',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toExportExcel', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/folder_wrench.png', 
                                    tooltip: 'Créer un inventaire à partir de cette proforma',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toInventaireFromOneDevis', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        }


                    ],
//            selModel: {
//                selType: 'cellmodel'
//                selType: 'checkboxmodel',
//            },
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


