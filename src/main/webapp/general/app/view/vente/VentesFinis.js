/* global Ext */

Ext.define('testextjs.view.vente.VentesFinis', {
    extend: 'Ext.panel.Panel',
    xtype: 'ventemanager',
    frame: true,
    title: 'Liste des Ventes',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        const store = Ext.create('Ext.data.ArrayStore', {
            data: [['VNO'], ['VO']],
            fields: [{name: 'typeVente', type: 'string'}]
        });
        const natureventeStore = new Ext.data.Store({
            model: 'testextjs.model.caisse.Nature',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/natures',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
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
                        '-', {

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
                            labelWidth: 65,
                            itemId: 'typeVente',
                            store: store,
                            flex: 1,
                            valueField: 'typeVente',
                            displayField: 'typeVente',
                            typeAhead: false,
                            mode: 'local',
                            minChars: 1.2,
                            emptyText: 'Selectionner un type de vente'

                        }, '-',
                        {
                            xtype: 'combobox',
                            itemId: 'nature',
                            fieldLabel: 'Nature.vente',
                            store: natureventeStore,
                            editable: false,
                            flex: 1.2,
                            labelWidth: 70,
                            valueField: 'lgNATUREVENTEID',
                            displayField: 'strLIBELLE',
                            typeAhead: false,
                            queryMode: 'remote',
                            emptyText: 'Selectionner la nature ...'

                        },

                        '-',

                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1.2,
                            enableKeyEvents: true,
                            emptyText: 'Recherche'
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
                    store: vente,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        animCollapse: false,
                        hideable: false,
                        draggable: false
                    },
                    columns: [
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Reference',
                            dataIndex: 'strREF',
                            flex: 0.8
                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Type.Vente',
                            dataIndex: 'strTYPEVENTE',
                            align: 'center',
                            flex: 0.4
                        }
                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Montant',
                            xtype: 'numbercolumn',
                            dataIndex: 'intPRICE',
                            align: 'right',
                            flex: 0.6,
                            format: '0,000.'

                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Montant différé',
                            xtype: 'numbercolumn',
                            dataIndex: 'intPRICERESTE',
                            align: 'right',
                            flex: 0.6,
                            format: '0,000.'

                        },

                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Date',
                            dataIndex: 'dtUPDATED',
                            flex: 0.6,
                            align: 'center'
                        }, {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 0.6,
                            align: 'center'
                        }

                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Vendeur',
                            dataIndex: 'userVendeurName',
                            flex: 1
                        },

                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Caissier',
                            dataIndex: 'userCaissierName',
                            flex: 1
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Réimprimer le ticket',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('printTicket', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/printergreen.png',
                                    tooltip: 'ticket vente modifiée',
                                    getClass: function (value, metadata, record) {
                                        if (record.get('copy')) {
                                            return 'x-display-hide';
                                        }

                                        return 'x-hide-display';
                                    },
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('ticketModifie', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.gif',
                                    tooltip: 'Annuler.Vente',
                                    getClass: function (value, metadata, record) {

                                        if (!record.get('beCancel')) {
                                            return 'x-hide-display';
                                        } else {
                                            if (record.get('cancel')) {
                                                return 'x-hide-display';
                                            } else {
                                                if (record.get('intPRICE') <= 0) {
                                                    return 'x-hide-display';
                                                } else {
                                                    return 'x-display-hide';
                                                }
                                            }
                                        }
                                    },
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('remove', view, rowIndex, colIndex, item, e, record, row);
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
                                    tooltip: 'Re-imprimer la facture',
                                    getClass: function (value, metadata, record) {

                                        if (record.get('cancel')) {
                                            return 'x-hide-display';
                                        } else {
                                            if (record.get('intPRICE') <= 0) {
                                                return 'x-hide-display';
                                            } else {
                                                return 'x-display-hide';
                                            }
                                        }
                                    },
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('facture', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/folder_go.png',
                                    tooltip: 'Generer une suggestion pour la vente',
                                    getClass: function (value, metadata, record) {
                                        if (record.get('intPRICE') <= 0) {
                                            return 'x-hide-display';
                                        } else {
                                            if (record.get('cancel')) {
                                                return 'x-hide-display';
                                            } else {
                                                return 'x-display-hide';
                                            }

                                        }
                                    },
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('onSuggestion', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/excel_csv.png',
                                    tooltip: 'Exporter en csv les produits vendus',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toExport', view, rowIndex, colIndex, item, e, record, row);
                                    },
                                    getClass: function (value, metadata, record) {

                                        if (record.get('lgTYPEVENTEID') === "5") {
                                            return 'x-display-hide'; //affiche l'icone
                                        } else {
                                            return 'x-hide-display'; //cache l'icone
                                        }
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
                                    menuDisabled: true,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toEdit', view, rowIndex, colIndex, item, e, record, row);
                                    },
                                    getClass: function (value, metadata, record) {
                                        if (record.get('intPRICE') > 0 && !record.get('cancel') && record.get('modification')) {
                                            return 'x-display-hide';
                                        }
                                        return 'x-hide-display';
                                    }

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/editer.png',
                                    tooltip: 'Modifier info client',
                                    menuDisabled: true,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toClientOrTp', view, rowIndex, colIndex, item, e, record, row);
                                    },
                                    getClass: function (value, metadata, record) {
                                        if (record.get('intPRICE') > 0 && !record.get('cancel') && record.get('modificationClientTp') && (record.get('strTYPEVENTE') !== "VNO")) {
                                            return 'x-display-hide';
                                        }
                                        return 'x-hide-display';
                                    }

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/table_refresh.png',
                                    tooltip: 'Modifier la date',
                                    menuDisabled: true,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('onUpdateDate', view, rowIndex, colIndex, item, e, record, row);
                                    },
                                    getClass: function (value, metadata, record) {
                                        if (record.get('intPRICE') > 0 && !record.get('cancel') && record.get('modificationVenteDate') && (record.get('strTYPEVENTE') === "VO")) {
                                            return 'x-display-hide';
                                        }
                                        return 'x-hide-display';
                                    }

                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/download.png',
                                    tooltip: 'Exporter',

                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toExportToJson', view, rowIndex, colIndex, item, e, record, row);
                                    },
                                    getClass: function (value, metadata, record) {
                                        if (record.get('intPRICE') > 0 && !record.get('cancel') && record.get('canexport')) {
                                            return 'x-display-hide';
                                        }
                                        return 'x-hide-display';
                                    }

                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [
                                {
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Voir détail',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('goto', view, rowIndex, colIndex, item, e, record, row);
                                    }


                                }
                            ]
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


