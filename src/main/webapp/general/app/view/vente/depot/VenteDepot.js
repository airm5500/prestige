/* global Ext */

Ext.define('testextjs.view.vente.depot.VenteDepot', {
    extend: 'Ext.panel.Panel',
    xtype: 'addventedepotbis',
    requires: [
        'testextjs.model.caisse.Vente'
    ],
    config: {
        data: null
    },
    frame: true,
    title: 'VENTE DEPÔT',
    width: '97%',
    height: 'auto',
    minHeight: 570,

    cls: 'custompanel',
    layout: {
        type: 'vbox',
        align: 'stretch',
        padding: 10
    },
    initComponent: function () {
        var store_typereglement = new Ext.data.Store({
            model: 'testextjs.model.caisse.Reglement',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/reglement',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            },
            /* pas de paiement en points fidelite pour une vente en depot */
            filters: [{filterFn: function (r) {
                        return r.get('lgTYPEREGLEMENTID') !== '20';
                    }}]
        });
        var depotstore = new Ext.data.Store({
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
        var produit = new Ext.data.Store({
            model: 'testextjs.model.caisse.Produit',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/vente/search',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var venteDetails = new Ext.data.Store({
            model: 'testextjs.model.caisse.VenteItem',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/vente/deatails',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/users',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var me = this;


        Ext.applyIf(me, {

            items: [
                {
                    xtype: 'fieldset',
                    title: '<span style="color:blue;">CHOISIR LE DEPÔT ET LE VENDEUR</span>',
                    collapsible: false,
                    defaultType: 'textfield',
                    cls: 'background_gray',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },

                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            margin: '0 0 5 0',
                            height: 35,
                            style: 'padding-bottom:3px;',
                            defaultType: 'textfield',
                            items: [
                                {
                                    xtype: 'combobox',
                                    itemId: 'typeVente',
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

                                },

                                {
                                    xtype: 'displayfield',
                                    itemId: 'gerantName',
                                    flex: 1,
                                    labelWidth: 150,
                                    fieldStyle: "color:blue;",
                                    fieldLabel: "Nom/Prénom(s) gérant",
                                    margin: '0 15 0 0'


                                },
                                {
                                    xtype: 'combobox',
                                    itemId: 'user',
                                    store: storeUser,
                                    pageSize: null,
                                    valueField: 'lgUSERID',
                                    displayField: 'fullName',
                                    typeAhead: false,
                                    flex: 1,
                                    height: 30,
                                    minChars: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un vendeur...'

                                }

                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    id: 'INFOS VENTE',
                    title: '<span style="color:blue;">INFOS VENTE</span>',
                    fieldStyle: "color:blue;",
                    collapsible: false,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'fieldcontainer',
                            layout: 'hbox',
                            combineErrors: true,
                            defaultType: 'displayfield',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'REF VENTE:',
                                    itemId: 'refVente',
                                    flex: 1,
                                    labelWidth: 80,
                                    fieldStyle: "color:red;font-size:1.2em;font-weight: bold;",
                                    margin: '0 15 0 0'

                                },
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'NET A PAYER:',
                                    labelWidth: 100,
                                    flex: 1,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    value: 0,
                                    itemId: 'montantNet',
                                    fieldStyle: "color:red;font-size:1.5em;font-weight: bold;",
                                    margin: '0 12 0 0'

                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'TOTAL VENTE:',
                                    labelWidth: 100,
                                    flex: 1,
                                    itemId: 'montantTotal',
                                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                                    margin: '0 12 0 0',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'NBRE PDTS:',
                                    flex: 1,
                                    itemId: 'nbreProduits',
                                    labelWidth: 100,
                                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                                    margin: '0 12 0 0',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'MONTANT REMISE:',
                                    flex: 1,
                                    itemId: 'montantRemise',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    value: 0,
                                    labelWidth: 125,
                                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                                    margin: '0 12 0 0'

                                }
                            ]
                        }
                    ]},

                {
                    xtype: 'container',
                    layout: 'anchor',
                    itemId: 'contenu',
                    items: [
                        {
                            xtype: 'panel',
                            border: 0,
                            cls: 'custompanel',
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            dockedItems: [
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    ui: 'footer',
                                    layout: {
                                        pack: 'end',
                                        type: 'hbox'
                                    },
                                    items: [

                                        {
                                            text: 'Terminer la vente',
                                            itemId: 'btnCloture',
                                            iconCls: 'icon-clear-group',
                                            scope: this
//                                            disabled: true
                                        },
                                        {
                                            text: 'Retour',
                                            itemId: 'btnGoBack',
                                            iconCls: 'icon-clear-group',
                                            scope: this


                                        }


                                    ]
                                }

                            ],
                            items: [

                                {
                                    xtype: 'fieldset',
                                    itemId: 'produitContainer',
                                    title: '<span style="color:blue;">RECHERCHER UN PRODUIT</span>',
                                    collapsible: false,
                                    defaultType: 'textfield',
                                    layout: 'anchor',
                                    cls: 'background_gray',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [
                                        {
                                            xtype: 'fieldcontainer',
                                            layout: 'hbox',
//                            bodyPadding: 5,
                                            height: 40,
                                            defaultType: 'textfield',
                                            fieldLabel: 'PRODUIT',
                                            items: [
                                                {
                                                    xtype: 'combobox',
                                                    height: 30,
                                                    itemId: 'produit',
                                                    store: produit,
                                                    pageSize: 10,
                                                    valueField: 'lgFAMILLEID',
                                                    displayField: 'strNAME',
                                                    flex: 2,
                                                    margin: '0 10 0 0',
                                                    queryMode: 'remote',
                                                    autoSelect: true,
                                                    typeAhead: false,
                                                    typeAheadDelay: 0,
                                                    forceSelection: true,
                                                    minChars: 3,
                                                    queryCaching: false,
//                                    selectOnFocus: true,
                                                    emptyText: 'Choisir un article par Nom ou Cip...',
//                                    triggerAction: 'all',
                                                    listConfig: {
                                                        loadingText: 'Recherche...',
                                                        emptyText: 'Pas de données trouvées.',
                                                        getInnerTpl: function () {
                                                            return '<tpl for="."><tpl if="intNUMBERAVAILABLE <=0"><span style="color:#17987e;font-weight:bold;"><span style="width:100px;display:inline-block;">{intCIP}</span>{strNAME} <span style="float: right;"> ( {intPRICE} )</span></span><tpl else><span style="font-weight:bold;"><span style="width:100px;display:inline-block;">{intCIP}</span>{strNAME} <span style="float: right; "> ( {intPRICE} )</span></span></tpl></tpl>';

                                                        }
                                                    }

                                                },
                                                {
                                                    xtype: 'textfield',
                                                    value: 1,
                                                    itemId: 'qtyField',
                                                    fieldLabel: 'QD:',
                                                    flex: 1,
                                                    height: 30,
                                                    labelWidth: 30,
                                                    emptyText: 'Quantité',
                                                    selectOnFocus: true,
                                                    enableKeyEvents: true

                                                }

                                            ]
                                        }
                                    ]
                                },
                                {
                                    xtype: 'fieldset',
                                    title: '<span style="color:blue;">INFOS PRODUITS</span>',
                                    collapsible: false,
                                    defaultType: 'textfield',
                                    layout: 'anchor',
                                    cls: 'background_gray',
                                    itemId: 'infoscontainer',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [
                                        {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            height: 30,
                                            defaultType: 'textfield',
                                            margin: '0 0 10 0',

                                            items: [
                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'STOCK REEL :',
                                                    labelWidth: 100,
                                                    itemId: 'stockField',
                                                    fieldStyle: "color:blue;",
                                                    flex: 0.7,
                                                    value: 0
                                                },
                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Emplacement :',
                                                    labelWidth: 110,
                                                    itemId: 'emplacementId',
                                                    fieldStyle: "color:blue;",
                                                    flex: 1.4
                                                },

                                                {
                                                    xtype: 'numberfield',
                                                    height: 30,
                                                    fieldLabel: 'Remise ',
                                                    itemId: 'remise',
                                                    labelWidth: 60,
                                                    flex: 0.8,
                                                    hidden: true,
                                                    enableKeyEvents: true,
                                                    hideTrigger: true



                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    xtype: 'fieldset',
                                    title: '<span style="color:blue;">LISTE DES ARTICLES CHOISIS</span>',
                                    collapsible: false,
                                    itemId: 'gridContainer',
                                    defaultType: 'textfield',
                                    layout: 'anchor',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [
                                        {

                                            xtype: 'gridpanel',
                                            itemId: 'venteGrid',
                                            selModel: {
                                                selType: 'cellmodel',
                                                mode: 'SINGLE'
                                            },
                                            plugins: [
                                                Ext.create('Ext.grid.plugin.CellEditing',
                                                        {
                                                            clicksToEdit: 1,
                                                            pluginId: 'cellplugin'
                                                        })
                                            ],
                                            margin: '0 0 5 0',
                                            store: venteDetails,
                                            height: 'auto',
                                            minHeight: 250,
                                            columns: [
                                                {
                                                    text: '#',
                                                    width: 45,
                                                    dataIndex: 'lgPREENREGISTREMENTDETAILID',
                                                    hidden: true

                                                },
                                                {
                                                    xtype: 'rownumberer',
                                                    text: 'LG',
                                                    width: 45,
                                                    sortable: true
                                                }, {
                                                    text: 'C.CIP',
                                                    flex: 1,
                                                    sortable: true,
                                                    dataIndex: 'intCIP'
                                                }, {
                                                    text: 'DESIGNATION',
                                                    flex: 2.5,
                                                    sortable: true,
                                                    dataIndex: 'strNAME'
                                                }, {
                                                    xtype: 'numbercolumn',
                                                    header: 'QD',
                                                    dataIndex: 'intQUANTITY',
                                                    format: '0,000.',
                                                    align: 'right',
                                                    flex: 1,
                                                    editor: {
                                                        xtype: 'numberfield',
//                                         completeOnEnter: false,
                                                        allowBlank: true,
                                                        minValue: 1,
                                                        maskRe: /[0-9.]/,
                                                        selectOnFocus: true,
                                                        hideTrigger: true
                                                    }
                                                }, {
                                                    text: 'QS',
                                                    xtype: 'numbercolumn',
                                                    flex: 1,
                                                    sortable: true,
                                                    dataIndex: 'intQUANTITYSERVED',
                                                    MaskRe: /[0-9.]/,
                                                    minValue: 0,
                                                    format: '0,000.',
                                                    align: 'right',
                                                    editor: {
                                                        xtype: 'numberfield',
                                                        allowBlank: true,
//                                        minValue: 1,
                                                        maskRe: /[0-9.]/,
                                                        selectOnFocus: true,
                                                        hideTrigger: true
                                                    },
                                                    renderer: function (value, metadata, record) {

                                                        if (record.get('BISAVOIR') === true) {
//                                            metadata.tdStyle = " font-size:0.9em; color: red;font-weight: bold;bgcolor='ffc6c6'";
                                                            metadata.style = "color: red;font-weight: bold;";
//                                            metadata.tdAttr = 'bgcolor="ffc6c6"';
//                                            metadata.tdCls = myclass;
//                                            value = '<span style="color: red;font-weight: bold;">' + value + '</span>';
                                                        }
                                                        return value;
                                                    }
                                                }, {
                                                    text: 'P.U',
                                                    xtype: 'numbercolumn',
                                                    flex: 1,
                                                    sortable: true,
                                                    dataIndex: 'intPRICEUNITAIR',
                                                    format: '0,000.',
                                                    align: 'right',
                                                    editor: {
                                                        xtype: 'numberfield',
                                                        MaskRe: /[0-9.]/,
                                                        minValue: 1,
                                                        allowBlank: true,
                                                        selectOnFocus: true,
                                                        hideTrigger: true
                                                    }

                                                }, {
                                                    text: 'MONTANT',
                                                    flex: 1,
                                                    xtype: 'numbercolumn',
                                                    sortable: true,
                                                    dataIndex: 'intPRICE',
                                                    format: '0,000.',
                                                    align: 'right'
                                                },
                                                {
                                                    xtype: 'actioncolumn',
                                                    width: 30,
                                                    sortable: false,
                                                    menuDisabled: true,
                                                    items: [{
                                                            icon: 'resources/images/icons/fam/delete.png',
                                                            tooltip: 'Supprimer le produit',
                                                            scope: this
                                                            , getClass: function (value, metadata, record) {
                                                                if (record.get('bISAVOIR') === true) {
                                                                    return 'x-hide-display';
                                                                }
                                                            }
                                                        }]
                                                }],
                                            dockedItems: [

                                                {
                                                    xtype: 'toolbar',
                                                    dock: 'top',
                                                    ui: 'footer',
                                                    itemId: 'querytoolbar',
                                                    items: [
                                                        {
                                                            xtype: 'textfield',

                                                            itemId: 'query',
                                                            emptyText: 'Recherche d\'un produit',
                                                            width: '30%',
                                                            height: 35,
                                                            enableKeyEvents: true
                                                        }, '-', {
                                                            text: 'rechercher',
                                                            tooltip: 'rechercher',
                                                            scope: this,
                                                            itemId: 'btnRecherche',
                                                            iconCls: 'searchicon'

                                                        }
                                                    ]
                                                },
                                                {
                                                    xtype: 'toolbar',
                                                    dock: 'bottom',
                                                    itemId: 'pagingtoolbar',
                                                    items: [{
                                                            xtype: 'pagingtoolbar',
                                                            displayInfo: true,
                                                            displayMsg: 'nombre(s) de produit(s): {2}',
                                                            pageSize: 10,
                                                            flex: 2.5,
                                                            store: venteDetails

                                                        }, '-',
                                                        {
                                                            xtype: 'displayfield',
                                                            fieldLabel: 'TOTAL VENTE:',
                                                            labelWidth: 100,
                                                            flex: 1,
                                                            itemId: 'montantBottom',
                                                            fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                                                            margin: '0 12 0 0',
                                                            renderer: function (v) {
                                                                return Ext.util.Format.number(v, '0,000.');
                                                            },
                                                            value: 0
                                                        }

                                                    ]
                                                }
                                            ]



                                        }
                                    ]
                                },

                                {
                                    xtype: 'fieldset',
                                    labelAlign: 'right',
                                    title: '<span style="color:blue;">REGLEMENT</span>',
                                    itemId: 'reglementContainer',
                                    layout: 'anchor',
                                    cls: 'background_green',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    collapsible: false,
                                    defaultType: 'textfield',
                                    items: [
                                        {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            itemId: 'encaissement',
                                            defaultType: 'textfield',
                                            style: 'border-bottom:1px #9999ff solid;padding-bottom:3px;',
                                            margin: '0 0 2 0',
                                            items: [
                                                {
                                                    xtype: 'numberfield',
                                                    hideTrigger: true,
                                                    itemId: 'montantRecu',
                                                    fieldLabel: 'MONTANT RECU',
                                                    emptyText: 'Montant reçu',
                                                    flex: 1,
                                                    height: 30,
                                                    labelWidth: 120,
                                                    regex: /[0-9.]/,
                                                    margin: '0 30 0 0',
                                                    minValue: 0,
                                                    value: 0,
                                                    readOnly: true,
                                                    enableKeyEvents: true,
                                                    selectOnFocus: true

                                                },
                                                {
                                                    xtype: 'displayfield',
                                                    labelWidth: 65,
                                                    margin: '0 20 0 0',
                                                    flex: 1,
                                                    fieldLabel: 'MONNAIE:',
                                                    itemId: 'montantRemis',
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                                    },
                                                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                                                    value: 0,
                                                    align: 'right'
                                                },
                                                {
                                                    xtype: 'combobox',
                                                    labelWidth: 130,
                                                    fieldLabel: 'Type règlement',
                                                    itemId: 'typeReglement',
                                                    store: store_typereglement,
                                                    flex: 1,
                                                    valueField: 'lgTYPEREGLEMENTID',
                                                    displayField: 'strNAME',
                                                    editable: false,
                                                    queryMode: 'remote',
                                                    emptyText: 'Choisir un type de reglement...',
                                                    height: 30,
                                                    pageSize: null,
                                                    typeAhead: false,
                                                    enableKeyEvents: true,
                                                    minChars: 3,
                                                    margin: '0 0 3 0',
                                                    triggerAction: 'all'
                                                }

                                            ]
                                        },

                                        {
                                            xtype: 'container',
                                            layout: 'hbox',
                                            defaultType: 'textfield',
                                            itemId: 'cbContainer',
                                            border: true,
                                            hidden: true,
                                            style: 'border-bottom:1px #9999ff solid;padding-bottom:3px;',
                                            bodyPadding: 2,
                                            margin: '5 0 5 0',
                                            items: [
                                                {
                                                    itemId: 'refCb',
                                                    margin: '0 10 0 0',
                                                    labelWidth: 85,
                                                    height: 30,
                                                    fieldLabel: 'REFERENCE',
                                                    flex: 1
                                                },
                                                {
                                                    itemId: 'banque',
                                                    margin: '0 10 0 0',
                                                    labelWidth: 55,
                                                    height: 30,
                                                    fieldLabel: 'BANQUE',
                                                    flex: 1
                                                },
                                                {
                                                    itemId: 'lieuxBanque',
                                                    labelWidth: 40,
                                                    margin: '0 10 0 0',
                                                    height: 30,
                                                    fieldLabel: 'LIEU',
                                                    flex: 1
                                                }


                                            ]
                                        }

                                    ]
                                }

                            ]


                        }
                    ]

                }
            ]

        });
        me.callParent(arguments);
    }
});


