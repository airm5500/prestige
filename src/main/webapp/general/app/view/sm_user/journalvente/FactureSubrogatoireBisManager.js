

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
            // pas d'autoLoad : le controller (doInitStore -> doSearch) charge la grille avec les dates,
            // l'autoLoad ne faisait que doubler la requete au clic sur le menu
            autoLoad: false,
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
        /* Lot 3 : filtres par type et par groupe de tiers payant */
        const storeTypeTp = new Ext.data.Store({
            fields: ['lg_TYPE_TIERS_PAYANT_ID', 'str_LIBELLE_TYPE_TIERS_PAYANT'],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/tierspayant/types',
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });
        const storeGroupeTp = new Ext.data.Store({
            fields: ['id', 'libelle'],
            autoLoad: false,
            pageSize: 9999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/facturation/groupetierspayant',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
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
                            /* Lot 3 : filtre par type de tiers payant */
                            xtype: 'combobox',
                            itemId: 'typeTiersPayantId',
                            flex: 1,
                            store: storeTypeTp,
                            valueField: 'lg_TYPE_TIERS_PAYANT_ID',
                            displayField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
                            queryMode: 'remote',
                            editable: false,
                            emptyText: 'Type de tiers payant...',
                            triggerAction: 'all'
                        }, '-', {
                            /* Lot 3 : filtre par groupe de tiers payant */
                            xtype: 'combobox',
                            itemId: 'groupeId',
                            flex: 1,
                            store: storeGroupeTp,
                            valueField: 'id',
                            displayField: 'libelle',
                            queryMode: 'remote',
                            editable: false,
                            emptyText: 'Groupe de tiers payant...',
                            triggerAction: 'all'
                        }, '-', {
                            text: 'rechercher',
                            itemId: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
//                    handler: this.onRechClick
                        }, {
                            /* Lot 3 : deux editions — la liste actuelle et la liste avec produits */
                            xtype: 'splitbutton',
                            text: 'Imprimer',
                            tooltip: 'imprimer',
                            scope: this,
                            iconCls: 'printable',
                            itemId: 'printable',
                            menu: [
                                {
                                    text: 'Liste simple',
                                    itemId: 'printSimple',
                                    iconCls: 'printable',
                                    tooltip: 'La liste actuelle : une ligne par bon'
                                },
                                {
                                    text: 'Liste avec produits',
                                    itemId: 'printProduits',
                                    iconCls: 'printable',
                                    tooltip: 'Chaque bon suivi de ses produits'
                                }
                            ]
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
                            // meme couleur que la colonne "Montant Attendu" : c'est le meme chiffre
                            fieldStyle: "color:#1e7e34;font-weight:800;",
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
                            // date et heure reunies : deux colonnes pour un seul instant
                            // faisaient perdre de la largeur aux noms des assures
                            header: 'Date et heure',
                            dataIndex: 'dtUPDATED',
                            flex: 1.2,
                            renderer: function (value, meta, rec) {
                                const heure = rec.get('heure');
                                return Ext.isEmpty(heure) ? value : value + ' ' + heure;
                            },
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
                            header: '%',
                            dataIndex: 'intPERCENT',
                            flex: 0.5,
                            align: 'center',
                            renderer: function (value) {
                                // taux de prise en charge du bon, en bleu
                                return "<span style='color:blue;font-weight:bold;'>" + (Ext.isEmpty(value) ? '' : value) + "</span>";
                            }
                        }
                        , {
                            header: 'Montant Attendu',
                            dataIndex: 'intPRICE',
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            // montant attendu en vert : c'est le chiffre que l'organisme doit rembourser
                            renderer: function (value) {
                                return "<span style='color:#1e7e34;font-weight:bold;'>" + amountformat(value) + "</span>";
                            },
                            summaryRenderer: function (value) {
                                if (value > 0) {
                                    return "<b><span style='color:#1e7e34;'>" + Ext.util.Format.number(value, '0,000') + "</span></b>";
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

        // l'ecran occupe la place disponible : sans cela, une recherche qui ramene beaucoup
        // de bons fait defiler la page entiere et l'entete "Liste des Bons par Organismes"
        // disparait vers le haut (cf. correctifs-affichage.js)
        if (window.PrestigeAffichage) {
            window.PrestigeAffichage.collerAuConteneur(me);
        }
    },

/* fonction appel ecran modification */
 onDetailClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        Ext.create('testextjs.view.vente.user.UpdateVenteClientTpForm', {venteId: rec.get('lg_PREENREGISTREMENT_ID')}).show();
        
    }

});