

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
function amountformatbis(val) {
    return amountformat(val) + " F CFA";
}
Ext.define('testextjs.view.sm_user.journalvente.FactureSubrogatoireBisManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'facturesubrogatoireother',
    title: 'Liste des Bons par Organismes',
    frame: true,
    cls: 'custompanel',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    /* integrer le menu a utiliser ici  */
requires: [
        'testextjs.view.vente.user.UpdateVenteClientTpForm'
    ],
    layout: {
        type: 'fit'
    },
    initComponent: function () {

        let itemsPerPage = 20;
        let  store = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'strREFBON',
                            type: 'string'
                        },
                        {
                            name: 'intPERCENT',
                            type: 'number'
                        },
                        {
                            name: 'intPRICE',
                            type: 'number'
                        },
                        {
                            name: 'dtUPDATED',
                            type: 'string'
                        }, {
                            name: 'heure',
                            type: 'string'
                        }, {
                            name: 'tiersPayantLibelle',
                            type: 'string'
                        }, {
                            name: 'tiersPayantId',
                            type: 'string'
                        }
                        , {
                            name: 'clientFullName',
                            type: 'string'
                        }, 
                        {
                            name: 'beneficiaireFullName',
                            type: 'string'
                        },
                        {
                            name: 'strREF',
                            type: 'string'
                        }
                        , {
                            name: 'strNUMEROSECURITESOCIAL',
                            type: 'string'
                        }, {
                            name: 'lg_PREENREGISTREMENT_ID',
                            type: 'string'
                        }, {
                            name: 'typeTiersPayant',
                            type: 'string'
                        }
                    ],
            pageSize: itemsPerPage,
            autoLoad: true,
            groupField: 'tiersPayantId',
            proxy: {
                type: 'ajax',
                url: '../api/v1/facture-subro/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
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
        
        let storetierspayant = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        const me = this;
        Ext.apply(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',

                            allowBlank: false,
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 1,
                            labelWidth: 50,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'
                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            name: 'dt_fin',
                            itemId: 'dtEnd',
                            allowBlank: false,
                            labelWidth: 50,
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        }, {
                            xtype: 'timefield',
                            fieldLabel: 'De',
                            itemId: 'hStart',
                            emptyText: 'Heure debut(HH:mm)',
                            allowBlank: false,
                            flex: 1,
                            labelWidth: 50,
                            increment: 30
                        }, {
                            xtype: 'timefield',
                            fieldLabel: 'A',
                            itemId: 'hEnd',
                            emptyText: 'Heure fin(HH:mm)',
                            allowBlank: false,
                            labelWidth: 50,
                            increment: 30,
                            flex: 1,
                            format: 'H:i'
                        },
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            emptyText: 'Rech',
                            flex: 1,
                            enableKeyEvents: true

                        }, '-', {
                            xtype: 'combobox',
                            itemId: 'tiersPayantId',
                            flex: 1,
                            store: searchstore,
                            pageSize: 9999,
                            valueField: 'lgTIERSPAYANTID',
                            displayField: 'strFULLNAME',
//                    minChars: 2,
                            queryMode: 'remote',
                            enableKeyEvents: true,
                            emptyText: 'Selectionner tiers payant...',
                            listConfig: {
                                loadingText: 'Recherche...',
                                emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                                getInnerTpl: function () {
                                    return '<span>{strFULLNAME}</span>';
                                }

                            }
                        }, '-', {
                            text: 'rechercher',
                            itemId: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
//                    handler: this.onRechClick
                        }, {
                            text: 'Imprimer',
                            tooltip: 'imprimer',
                            scope: this,
                            iconCls: 'printable',
                            itemId: 'printable'
                        }]

                },
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    items: [
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Total Attendu',
                            labelWidth: 100,
                            itemId: 'montant',

                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        }, {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Nombre total de bons',
                            labelWidth: 150,
                            itemId: 'nbreBonSug',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        }

                    ]
                }],
            items: [{
                    xtype: 'gridpanel',
                    store: store,
                    features: [
                        {
                            ftype: 'groupingsummary',
                            collapsible: true,
                            groupHeaderTpl: "{[values.rows[0].data.tiersPayantLibelle]}",
                            //  hideGroupedHeader: true,
                            //   enableGroupingMenu: false,
                            showSummaryRow: true

                        }],
                    columns: [
                        {
                            header: 'Date',
                            dataIndex: 'dtUPDATED',
                            flex: 1,
                            summaryType: "count",
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>TOTAUX: </span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 0.7
                        },
                        {
                            header: 'Ticket',
                            dataIndex: 'strREF',
                            flex: 0.7
                        },
                        {
                            header: 'Numero BON',
                            dataIndex: 'strREFBON',
                            flex: 1,
                            summaryType: "count",
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },

                        {
                            header: 'Assuré Principal',
                            dataIndex: 'clientFullName',
                            flex: 2.5

                        },
                        {
                            header: 'Beneficiaire',
                            dataIndex: 'beneficiaireFullName',
                            flex: 2.5

                        },
                        {
                            header: 'Matricule',
                            dataIndex: 'strNUMEROSECURITESOCIAL',
                            flex: 1
                        }
                        , {
                            header: 'Montant Attendu',
                            dataIndex: 'intPRICE',
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            renderer: amountformat,
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:blue;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
                                } else {
                                    return '';
                                }
                            }
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/grid.png',
                                    tooltip: 'Voir le detail des produits',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('showItems', view, rowIndex, colIndex, item, e, record, row);
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
                                    handler: this.onDetailClick

                                }]
                        }



                    ],
       
                    
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        pageSize: itemsPerPage,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }]




        });

        me.callParent(arguments);

    },

/* fonction appel ecran modification */
 onDetailClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        Ext.create('testextjs.view.vente.user.UpdateVenteClientTpForm', {venteId: rec.get('lg_PREENREGISTREMENT_ID')}).show();
        
    }

});