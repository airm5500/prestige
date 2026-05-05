/* global Ext */

Ext.define('testextjs.view.vente.depot.StatVenteDepot', {
    extend: 'Ext.panel.Panel',
    xtype: 'ventehistoriquedepotmanager',
    requires: [
        'Ext.grid.plugin.RowExpander'
    ],

    frame: true,

    title: 'Statitisques des ventes Dépôt',
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
        const depotstore = new Ext.data.Store({
            idProperty: 'lgEMPLACEMENTID',
            fields: [
                {name: 'lgEMPLACEMENTID', type: 'string'},
                {name: 'strNAME', type: 'string'},
                {name: 'lgTYPEDEPOTID', type: 'string'},
                {name: 'gerantFullName', type: 'string'},
                {name: 'lgCLIENTID', type: 'string'},
                {name: 'lgCOMPTECLIENTID', type: 'string'}
            ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/magasin/find-depots',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        const storeTypevente = Ext.create('Ext.data.ArrayStore', {
            data: [['4', 'Dépôt agrée'], ['5', 'Dépôt extension']],
            fields: [{name: 'id', type: 'string'}, {name: 'valeur', type: 'string'}]
        });
        const vente = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });

        const me = this;
        Ext.applyIf(me, {
            dockedItems: [

                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'combobox',
                            itemId: 'depotId',
                            store: depotstore,
                            editable: true,
                            flex: 1,
                            margin: '0 15 0 0',
                            height: 30,
                            valueField: 'lgEMPLACEMENTID',
                            displayField: 'strNAME',
                            typeAhead: false,
                            queryMode: 'remote',
                            emptyText: 'Choisir un dépôt...'

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
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            labelWidth: 15,
                            flex: 0.8,
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
                            flex: 0.8,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        },

                        {

                            xtype: 'timefield',
                            fieldLabel: 'De',
                            itemId: 'hStart',
                            emptyText: 'Heure debut(HH:mm)',
                            flex: 0.6,
                            labelWidth: 15,
                            increment: 30,
                            value: '00:00',
                            format: 'H:i'
                        }, '-',
                        {

                            xtype: 'timefield',
                            fieldLabel: 'A',
                            itemId: 'hEnd',
                            emptyText: 'Heure fin(HH:mm)',
                            flex: 0.6,
                            labelWidth: 15,
                            increment: 30,
                            value: '23:59',
                            format: 'H:i'
                        }, '-',
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type.vente',
                            itemId: 'typeVente',
                            store: storeTypevente,
                            height: 30,
                            flex: 1,
                            valueField: 'id',
                            displayField: 'valeur',
                            typeAhead: false,
                            mode: 'local',
                            minChars: 1,
                            emptyText: 'Selectionner le type dépot'

                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-',
                        {
                            text: 'Importer',
                            tooltip: 'Transformer les produits vendus d\'un dépôt en vente',
                            itemId: 'btnImporter',
                            scope: this,
                            hidden: true,
                            iconCls: 'importicon'
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',

                    /*plugins: [{
                            ptype: 'rowexpander',
                            rowBodyTpl: new Ext.XTemplate(
                                    '<p>{details}</p>'

                                    )
                        }
                    ],*/
                    store: vente,

                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
//                        enableLocking: true,
                        collapsible: true,
                        animCollapse: false
//                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
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
                            dataIndex: 'intPRICE',
                            align: 'right',
                            sortable: false,
                            menuDisabled: true,
                            flex: 1,
                            format: '0,000.'

                        },
                        {
                            header: 'Date',
                            dataIndex: 'dtUPDATED',
                            flex: 0.6,
                            sortable: false,
                            menuDisabled: true,
                            align: 'center'
                        }, {
                            header: 'Heure',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'heure',
                            flex: 0.6,
                            align: 'center'
                        }
                        , {
                            header: 'Type dépôt',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'desciptiontypedepot',
                            flex: 1
                        }, {
                            header: 'Dépôt',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'strNAME',
                            flex: 1
                        }
                        , {
                            header: 'Gérant',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'gerantFullName',
                            flex: 1
                        }
                        , {
                            header: 'Vendeur',

                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userVendeurName',
                            flex: 1
                        }
                        , {
                            header: 'Ciassier',

                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userCaissierName',
                            flex: 1
                        },
                        // 1) Ticket
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Re-imprimer le ticket',
                                    scope: me,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        view.up('ventehistoriquedepotmanager').fireEvent('printTicket', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        },

                        // 2) Détails produits
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/application_view_list.png', // ou une icône existante chez toi
                                    tooltip: 'Voir les produits',
                                    scope: me,
                                    handler: function (view, rowIndex, colIndex, item, e, record) {
                                        view.up('ventehistoriquedepotmanager').fireEvent('showProduits', record);
                                    }
                                }]
                        },

                        // 3) Facture
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/page_copy.png',
                                    tooltip: 'Re-imprimer la facture',
                                    scope: me,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        view.up('ventehistoriquedepotmanager').fireEvent('facture', view, rowIndex, colIndex, item, e, record, row);
                                    },
                                    getClass: function (value, metadata, record) {
                                        if (record.get('cancel') || record.get('intPRICE') <= 0) {
                                            return 'x-hide-display';
                                        }
                                        return ''; // ⚠️ pas x-display-hide
                                    }
                                }]
                        }

                    ],
                    bbar: {
                        dock: 'bottom',
                        items: [
                            {
                                flex: 1,
                                xtype: 'pagingtoolbar',
                                store: vente,
                                dock: 'bottom',
                                displayInfo: true
                            },
                            {
                                xtype: 'tbseparator'
                            },
                            {
                                xtype: 'displayfield',
                                flex: 1,
                                fieldLabel: 'Montant Total::',
                                fieldWidth: 150,
                                itemId: 'amount',
                                renderer: function (v) {
                                    return Ext.util.Format.number(v, '0,000.');
                                },
                                fieldStyle: "color:blue;font-size:1.5em;font-weight:bold;",
                                value: 0


                            }

                        ]


                    }

                }]

        });
        me.callParent(arguments);
    }
});


