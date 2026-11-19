/* global Ext */

Ext.define('testextjs.view.devis.DoDevis', {
    extend: 'Ext.panel.Panel',
    xtype: 'doDevis',
    requires: [
        'testextjs.model.caisse.Vente', 'testextjs.view.vente.Segments'
    ],
    config: {
        data: null
    },
    frame: true,
//    title: 'VENTE AU COMPTANT',
    width: '97%',
    height: 'auto',
    minHeight: 570,

    /* Decision du 19/11 (Tiassale) : l'ecran « Nouvelle proforma » au dessin de l'ecran de vente (enveloppe vp-shell,
       corps vp-vente, cartes, boutons du theme). Dessin seulement : memes itemId, meme structure lue par DevisCtr. */
    cls: 'custompanel vp-shell vp-focus-zone',
    layout: {
        type: 'vbox',
        align: 'stretch',
        padding: 10
    },
    initComponent: function () {

        var natureventeStore = new Ext.data.Store({
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
        var typeventeStore = new Ext.data.Store({
            model: 'testextjs.model.caisse.TypeVente',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/typedevis',
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
        var typeremise = new Ext.data.Store({
            model: 'testextjs.model.caisse.TypeRemise',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/typeremises',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var remise = new Ext.data.Store({
            model: 'testextjs.model.caisse.Remise',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'memory',
                reader: {
                    model: 'testextjs.model.caisse.Remise',
                    type: 'json'
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
        me.title = 'PROFORMA';
        Ext.applyIf(me, {

            items: [
                {
                    /* Ligne type / vendeur de l'ecran de vente : type en boutons segmentes poses sur le combo d'origine
                       (plugin segments : meme itemId, meme 'select'). La nature n'est plus proposee (decision du 19/11) :
                       son combo reste, cache, et garde la valeur que DevisCtr y pose (PRESCRIPTION par defaut), qui
                       part toujours avec chaque article (natureVenteId). */
                    xtype: 'container',
                    itemId: 'ligneTypeVente',
                    cls: 'seg-ligne',
                    layout: {type: 'hbox', align: 'middle'},
                    padding: '8 12',
                    margin: '0 0 6 0',
                    items: [
                        {xtype: 'component', cls: 'seg-lib', html: 'Type', margin: '0 10 0 0'},
                        {
                            xtype: 'combobox',
                            itemId: 'typeVente',
                            store: typeventeStore,
                            editable: false,
                            margin: '0 32 0 0',
                            valueField: 'lgTYPEVENTEID',
                            displayField: 'strNAME',
                            typeAhead: false,
                            queryMode: 'remote',
                            plugins: [{ptype: 'segments', pastille: true, libelles: {'1': 'Au comptant', '2': 'Assurance', '3': 'Carnet'}}],
                            emptyText: 'Choisir un type de vente...'
                        },
                        {
                            xtype: 'combobox',
                            itemId: 'nature',
                            hidden: true,
                            store: natureventeStore,
                            editable: false,
                            valueField: 'lgNATUREVENTEID',
                            displayField: 'strLIBELLE',
                            typeAhead: false,
                            queryMode: 'remote'
                        },
                        {xtype: 'component', cls: 'seg-lib', html: 'Vendeur', margin: '0 10 0 16'},
                        {
                            xtype: 'combobox',
                            itemId: 'user',
                            store: storeUser,
                            forceSelection: true,
                            pageSize: null,
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            typeAhead: false,
                            width: 300,
                            height: 30,
                            minChars: 2,
                            queryMode: 'remote',
                            emptyText: 'Choisir un vendeur...'
                        }
                    ]
                },

                {
                    xtype: 'container',
                    layout: 'anchor',
                    itemId: 'contenu',
                    items: [
                        {
                            xtype: 'panel',
                            border: 0,
                            cls: 'custompanel vp-vente',
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            dockedItems: [
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    ui: 'footer',
                                    cls: 'vp-actions vp-actions-ligne',
                                    layout: {
                                        pack: 'end',
                                        type: 'hbox'
                                    },
                                    items: [
                                        {
                                            text: 'Afficher le net',
                                            itemId: 'netBtn',
                                            iconCls: 'afficheur_caisse',
                                            height: 38,
                                            cls: 'btn-primarya',
                                            scope: this
                                        },
                                        {
                                            text: 'Enregistrer la proforma',
                                            itemId: 'btnCloture',
                                            iconCls: 'valider-vente',
                                            height: 38,
                                            cls: 'btn-primary',
                                            scope: this,
                                            disabled: true
                                        },
                                        {
                                            text: 'Retour',
                                            itemId: 'btnGoBack',
                                            iconCls: 'retour',
                                            height: 38,
                                            cls: 'btn-secondary',
                                            scope: this
                                        }


                                    ]
                                }

                            ],
                            items: [
                                {
                                    xtype: 'container',
                                    itemId: 'assureContainer',
                                    hidden: false,
                                    collapsible: false,
                                    bodyStyle: 'background:#F0F8FF !important;',
                                    defaultType: 'textfield',
                                    layout: {type: 'vbox', align: 'stretch'},

                                    items: [
                                        {
                                            xtype: 'container',
                                            bodyStyle: 'background:#F0F8FF !important;',
                                            layout: {type: 'hbox', align: 'stretch'},

                                            flex: 1,
                                            items: [
                                                {
                                                    xtype: 'fieldset',
                                                    style: 'background-color:#F0F8FF !important;',
                                                    itemId: 'clientSearchBox',
                                                    cls: 'vp-assur-card',
                                                    title: '<span style="color:blue;">RECHERCHER LE CLIENT</span>',
                                                    flex: 0.6,
                                                    margin: '0 10 0 0',
                                                    layout: {type: 'anchor', align: 'middle'},

                                                    items: [
                                                        {
                                                            xtype: 'textfield',
                                                            anchor: '100%',
                                                            margin: '15 0 0',
                                                            itemId: 'clientSearchTextField',
                                                            emptyText: 'Tapez ici pour rechercher un client',
                                                            height: 35,
                                                            enableKeyEvents: true
                                                        }
                                                    ]
                                                },
                                                {

                                                    xtype: 'fieldset',
                                                    title: '<span style="color:blue;">INFOS TIERS PAYANTS</span>',
                                                    itemId: 'tpContainer',
                                                    cls: 'vp-tp-card',
                                                    style: 'background-color:#F0F8FF !important;',
                                                    hidden: true,
                                                    margin: '0 5 0 0',
                                                    layout: {type: 'anchor'},
                                                    flex: 1,
                                                    items: [
                                                        {
                                                            xtype: 'container',
                                                            width: '97%',
                                                            margin: '0 10 0 0',
                                                            layout: {type: 'vbox', align: 'stretch'},
                                                            items: [
                                                                {
                                                                    xtype: 'fieldcontainer',
                                                                    layout: {type: 'hbox', align: 'stretch'},
                                                                    items: [{
                                                                            xtype: 'displayfield',
                                                                            fieldLabel: 'TP',
                                                                            flex: 1.5,
                                                                            labelWidth: 30,
                                                                            fieldStyle: "color:blue;",
                                                                            itemId: 'tpName',
                                                                            margin: '0 10 0 0'
                                                                        },
                                                                        {
                                                                            xtype: 'displayfield',
                                                                            fieldLabel: 'Taux:',
                                                                            flex: 0.5,
                                                                            labelWidth: 30,
                                                                            itemId: 'taux',
                                                                            fieldStyle: "color:blue;",
                                                                            margin: '0 10 0 0'
                                                                        },
                                                                        {
                                                                            xtype: 'hiddenfield',
                                                                            itemId: 'compteTp'

                                                                        }

                                                                    ]
                                                                }
                                                                ,
                                                                {
                                                                    xtype: 'fieldcontainer',
                                                                    layout: {type: 'hbox', align: 'stretch'},
                                                                    items: [{
                                                                            xtype: 'textfield',
                                                                            fieldLabel: 'Ref.Bon:',
                                                                            labelWidth: 50,
                                                                            itemId: 'refBon',
                                                                            flex: 1,
                                                                            height: 30,
                                                                            margin: '0 10 0 0'
                                                                        }

                                                                    ]
                                                                }


                                                            ]
                                                        }
                                                    ]

                                                },

                                                {
                                                    xtype: 'fieldset',
                                                    style: 'background-color:#F0F8FF !important;',
                                                    title: '<span style="color:blue;">INFOS CLIENT</span>',
                                                    itemId: 'assureCmp',
                                                    cls: 'vp-assur-card',
                                                    margin: '0 5 0 0',
                                                    flex: 1,
                                                    layout: {
                                                        type: 'hbox', pack: 'start',
                                                        align: 'middle'
                                                    },
                                                    items: [
                                                        {
                                                            xtype: 'container',

                                                            flex: 1,
                                                            layout: {type: 'vbox', align: 'stretch'},
                                                            items: [

                                                                {
                                                                    xtype: 'displayfield',
                                                                    fieldLabel: 'Nom :',
                                                                    flex: 1,
                                                                    itemId: 'nomAssure',
                                                                    fieldStyle: "color:blue;",
                                                                    margin: '0 10 0 0'
                                                                }, {
                                                                    xtype: 'displayfield',
                                                                    fieldLabel: 'Prénom(s):',
                                                                    itemId: 'prenomAssure',
                                                                    flex: 1,
                                                                    fieldStyle: "color:blue;",
                                                                    margin: '0 10 0 0'
                                                                },
                                                                {
                                                                    xtype: 'displayfield',
                                                                    fieldLabel: 'Matricule/SS:',
                                                                    itemId: 'numAssure',
                                                                    flex: 1,
                                                                    fieldStyle: "color:blue;",
                                                                    margin: '0 10 0 0'
                                                                }

                                                            ]

                                                        }

                                                    ]

                                                }

                                            ]
                                        }

                                    ]
                                },

                                {
                                    xtype: 'fieldset',
                                    itemId: 'produitContainer',
                                    title: '<span style="color:blue;">RECHERCHER UN PRODUIT</span>',
                                    collapsible: false,
                                    defaultType: 'textfield',
                                    layout: 'anchor',
                                    cls: 'background_gray vp-produit-card',
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
                                                    autoSelect: true,
                                                    typeAhead: false,
                                                    typeAheadDelay: 0,
                                                    forceSelection: true,
                                                    flex: 2,
                                                    margin: '0 10 0 0',
                                                    queryMode: 'remote',

//                                    enableKeyEvents: true,
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
                                    cls: 'background_gray vp-produit-card',
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
                                                    fieldLabel: 'EMPLACEMENT :',
                                                    labelWidth: 110,
                                                    itemId: 'emplacementId',
                                                    fieldStyle: "color:blue;",
                                                    flex: 1.4
                                                },
                                                {
                                                    xtype: 'combobox',
                                                    height: 30,
                                                    fieldLabel: 'TYPE REMISE ',
                                                    itemId: 'typeRemise',
                                                    store: typeremise,
                                                    editable: false,
                                                    forceSelection: true,
                                                    margin: '0 10 0 0',
                                                    pageSize: null,
                                                    valueField: 'lgTYPEREMISEID',
                                                    displayField: 'strDESCRIPTION',
                                                    typeAhead: false,
                                                    flex: 0.8,
                                                    queryMode: 'remote',
                                                    enableKeyEvents: true,
                                                    minChars: 3,
                                                    emptyText: 'Choisir un type remise...',
                                                    triggerAction: 'all'

                                                },
                                                {
                                                    xtype: 'combobox',
                                                    height: 30,
                                                    fieldLabel: 'REMISE ',
                                                    itemId: 'remise',
                                                    store: remise,
                                                    editable: false,
                                                    pageSize: null,
                                                    forceSelection: true,
                                                    valueField: 'lgREMISEID',
                                                    displayField: 'strNAME',
                                                    typeAhead: false,
                                                    flex: 0.8,
                                                    queryMode: 'local',
                                                    labelWidth: 60,
                                                    enableKeyEvents: true,
                                                    minChars: 3,
                                                    emptyText: 'Choisir une remise...',
                                                    triggerAction: 'all'

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
                                    cls: 'vp-grille-card',
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
                                                            flex: 1.8,
                                                            displayMsg: 'nombre(s) de produit(s): {2}',
                                                            pageSize: 10,
                                                            store: venteDetails

                                                        },
                                                        {
                                                            xtype: 'tbseparator'
                                                        }, {
                                                            xtype: 'displayfield',
                                                            fieldLabel: 'TOTAL VENTE',
                                                            itemId: 'totalField',
                                                            cls: 'vp-total-badge',
                                                            flex: 1,
                                                            labelWidth: 100,
                                                            renderer: function (v) {
                                                                return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                                            },
                                                            fieldStyle: "color:blue;font-weight: bold;font-size: 1.3em",
                                                            margin: '0 5 0 0',
                                                            value: 0
                                                        },
                                                        {
                                                            xtype: 'tbseparator'
                                                        },
                                                        {
                                                            xtype: 'displayfield',
                                                            fieldLabel: 'MONTANT REMISE',
                                                            itemId: 'montantRemise',
                                                            cls: 'vp-total-badge vp-remise-badge',
                                                            flex: 1,
                                                            labelWidth: 120,
                                                            renderer: function (v) {
                                                                return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                                            },
                                                            fieldStyle: "color:blue;font-weight: bold;font-size: 1.3em",
                                                            margin: '0 0 0 0',
                                                            value: 0
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

                }
            ]

        });
        me.callParent(arguments);
    }
});


