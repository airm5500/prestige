/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global Ext */

Ext.define('testextjs.view.vente.VenteVNO', {
    extend: 'Ext.panel.Panel',
    xtype: 'ventevno',
//    frame: true,
    border: 0,
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    initComponent: function () {
        let store_typereglement = new Ext.data.Store({
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
            }
        });
        let produit = new Ext.data.Store({
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
            },
            // Ajoutez ceci pour filtrer les données au chargement
            listeners: {
                load: function (store, records, successful, operation, eOpts) {
                    if (successful) {
                        // Filtrer les produits dont le nom ne commence pas par "RV "
                        store.filterBy(function (record) {
                            var nom = record.get('strNAME');
                            return !nom || !nom.toUpperCase().startsWith('RV ');
                        });
                    }
                }
            }
        });
        let typeremise = new Ext.data.Store({
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
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/remises-client',
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
        const me = this;
        Ext.applyIf(me, {

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
                            text: 'AFFICHER NET A PAYER',
                            itemId: 'netBtn',
                            iconCls: 'afficheur_caisse',
                            scope: this,
                            cls: 'btn-primarya'


                        }, {
                            text: 'TERMINER LA VENTE',
                            itemId: 'btnCloture',
                            iconCls: 'valider-vente',
                            scope: this,
                            cls: 'btn-primary'
                        }, {
                            text: 'CLOTURER LA PRE-VENTE',
                            itemId: 'btnClosePrevente',
                            //cls: 'btn-prevente',
                            hidden: true,
                            iconCls: 'icon-clear-group',
                            cls: 'btn-primary',
                            scope: this
                        }
                        , {
                            text: 'METTRE EN ATTENTE',
                            itemId: 'btnStandBy',
                            iconCls: 'attente',
                            scope: this,
                            cls: 'btn-primarya'
                        },

                        {
                            text: 'RETOUR',
                            itemId: 'btnGoBack',
                            iconCls: 'retour',
                            scope: this,
                            cls: 'btn-secondary'
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'container',
                    itemId: 'assureContainer',
                    hidden: true,
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
                                    style: 'background-color:#F0F8FF !important;',
                                    title: '<span style="color:blue;">INFOS ASSURE</span>',
                                    itemId: 'assureCmp',
                                    margin: '0 5 0 0',
                                    flex: 1.2,
                                    layout: {
                                        type: 'hbox', pack: 'start',
                                        align: 'middle'
                                    },
                                    items: [
                                        {
                                            xtype: 'container',

                                            flex: 1.5,
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

                                        },
                                        {
                                            xtype: 'container',
                                            flex: 0.5,
                                            layout: {type: 'vbox', align: 'middle'},
                                            items: [

                                                {
                                                    text: 'Modifier Infos ',
                                                    itemId: 'btnModifierInfo',
//                                                    margin: '5 10 0 0',
                                                    xtype: 'button'

                                                }

                                            ]
                                        }
                                    ]

                                },
                                {
                                    xtype: 'fieldset',
                                    style: 'background-color:#F0F8FF !important;',
                                    title: '<span style="color:blue;">INFOS AYANT DROIT</span>',
                                    itemId: 'ayantDroyCmp',
                                    flex: 1.2,
//                                    hidden: true,
                                    layout: {type: 'hbox'},
                                    items: [
                                        {
                                            xtype: 'container',

                                            flex: 1.5,
                                            layout: {type: 'vbox', pack: 'start',
                                                align: 'middle'},
                                            items: [

                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Nom :',
                                                    flex: 1,
                                                    itemId: 'nomAyantDroit',
                                                    fieldStyle: "color:blue;",
                                                    margin: '0 10 0 0'
                                                }, {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Prénom(s):',
                                                    itemId: 'prenomAyantDroit',
                                                    flex: 1,
                                                    fieldStyle: "color:blue;",
                                                    margin: '0 10 0 0'
                                                },
                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Matricule/SS:',
                                                    itemId: 'numAyantDroit',
                                                    flex: 1,
                                                    fieldStyle: "color:blue;",
                                                    margin: '0 10 0 0'
                                                }

                                            ]

                                        },
                                        {
                                            xtype: 'container',
                                            flex: 0.5,
                                            layout: {type: 'vbox', align: 'middle'},
                                            items: [

                                                {
                                                    text: 'Autre ayant droit',
                                                    itemId: 'btnModifierAyant',
                                                    margin: '20 0 0 0',
                                                    xtype: 'button'

                                                }

                                            ]
                                        }
                                    ]

                                }
                            ]
                        },
                        {

                            xtype: 'fieldset',
                            title: '<span style="color:blue;">INFOS TIERS PAYANTS</span>',
                            itemId: 'tpContainer',
                            layout: {type: 'fit'},
                            bodyStyle: 'background:#F0F8FF !important;',
                            flex: 1,
                            items: [
                                {
                                    layout: {type: 'hbox', align: 'stretch'},
                                    cls: 'background_gray',
                                    bodyStyle: 'background:#F0F8FF !important;',
                                    xtype: 'form',
                                    border: 0,
                                    items: []
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
                    cls: 'background_gray',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'fieldcontainer',
                            layout: 'hbox',
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
                                    emptyText: 'Choisir un article par Nom ou Cip...',
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
                                    flex: 0.7

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
                                    margin: '0 10 0 0',
                                    hidden: true,
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
                                    valueField: 'lgREMISEID',
                                    displayField: 'strNAME',
                                    typeAhead: false,
                                    flex: 0.8,
                                    queryMode: 'remote',
                                    labelWidth: 60,
                                    enableKeyEvents: true,
                                    emptyText: 'Choisir une remise...'

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
                                        maskRe: /[0-9.]/,
                                        selectOnFocus: true,
                                        hideTrigger: true
                                    },
                                    renderer: function (value, metadata, record) {

                                        if (record.get('BISAVOIR') === true) {
                                            metadata.style = "color: red;font-weight: bold;";
//                                          
                                        }
                                        return value;
                                    }
                                }, 
                                {
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

                                },
                                {
                                    text: 'P.REF',
                                    xtype: 'numbercolumn',
                                    flex: 1,
                                    hidden:true,
                                    sortable: true,
                                    dataIndex: 'calculationBasePrice',
                                    format: '0,000.',
                                    align: 'right'
                                  
                                },
                                
                                {
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
                                            cls: 'btn-primarya',
                                            iconCls: 'searchicon'

                                        }
                                    ]
                                },
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    itemId: 'pagingtoolbar',
                                    items: [
                                        {
                                            xtype: 'pagingtoolbar',
                                            displayInfo: true,
                                            flex: 2,
                                            displayMsg: 'nombre(s) de produit(s): {2}',
                                            pageSize: 10,
                                            store: venteDetails

                                        },
                                        {
                                            xtype: 'tbseparator'
                                        }, {
                                            xtype: 'displayfield',
                                            fieldLabel: 'TOTAL VENTE :',
                                            itemId: 'totalField',
                                            flex: 1,
                                            labelWidth: 120,
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;font-size: 1.3em",
                                            margin: '0 15 0 0',
                                            value: 0
                                        }]
                                }
                            ]



                        }
                    ]
                }
                ,
                {
                    xtype: 'fieldset',
                    labelAlign: 'center',
                    title: '<span style="color:blue;">REGLEMENT</span>',
                    itemId: 'reglementContainer',
                    layout: 'anchor',
                    minHeight: 70,
                    
                    //cls: 'pc-reglement',
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
                            itemId: 'reglement',
                            defaultType: 'textfield',
                            border: true,
                            style: 'border-bottom:1px #9999ff solid;padding-bottom:3px;',

                            margin: '0 0 5 0',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'NET A PAYER :',
                                    flex: 1,
                                    labelWidth: 110,
                                    value: 0,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                    },
                                    itemId: 'montantNet',
                                    fieldStyle: "color:red;font-size:1.5em;font-weight: bold;",
                                    margin: '0 40 0 0'

                                },

                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'MONTANT REMISE :',
                                    labelWidth: 130,
                                    itemId: 'montantRemise',
                                    flex: 1,
                                    value: 0,
                                    fieldStyle: "color:green;font-size:1.5em;font-weight: bold;",
                                    margin: '0 10 0 0',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                    }
                                },
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'PART TIERS-PAYANT:',
                                    labelWidth: 135,
                                    itemId: 'montantTp',
                                    hidden: true,
                                    flex: 1,
                                    value: 0,
                                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                                    margin: '0 10 0 0',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                    }
                                },

                                {
                                    xtype: 'combobox',
                                    labelWidth: 130,
                                    fieldLabel: 'TYPE R&Egrave;GLEMENT',
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
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            itemId: 'encaissement',
                            defaultType: 'textfield',
                            margin: '0 0 2 0',
                            items: [
                                {
                                    xtype: 'numberfield',
                                    hideTrigger: true,
                                    itemId: 'montantRecu',
                                    fieldLabel: 'MONTANT RECU',
                                    labelClsExtra: 'pc-label-cash', // ← important
                                    listeners: {// fallback si labelClsExtra absent
                                        afterrender: function (f) {
                                            f.labelEl && f.labelEl.addCls('pc-label-cash');
                                        }
                                    },
                                      labelStyle: 'height:44px;line-height:44px', // label plus haut
                                    fieldStyle: 'height:44px;line-height:44px;padding:8px 10px', // input plus haut
                                    inputAttrTpl: 'style="height:44px"',
                                    emptyText: 'Montant reçu',
                                    flex: 1,
                                    height: 50,
                                    labelWidth: 160,
                                    regex: /[0-9.]/,
                                    margin: '0 30 0 0',
                                    minValue: 0,
                                    value: 0,
//                                    readOnly: true,
                                    enableKeyEvents: true,
                                    selectOnFocus: true

                                },
                                
                                
                                
                                 {
                                    xtype: 'numberfield',
                                    hideTrigger: true,
                                    itemId: 'montantExtra',
                                    hidden:true,
                                    fieldLabel: '',
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
                                    xtype: 'checkbox',
                                    labelWidth: 95,
                                    margin: '0 10 0 0',
                                    hidden: true,
                                    flex: 1,
                                    fieldLabel: 'Vente sans bon',
                                    itemId: 'sansBon'
                                },

                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    labelWidth: 110,
                                    fieldLabel: 'Derni&egrave;re Monnaie',
                                    itemId: 'dernierMonnaie',
                                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                                    value: 0,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                    },
                                    align: 'right'
                                }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    title: '<span style="color:blue;">INFORMATIONS AVOIR</span>',
                    collapsible: true,
                    cls: 'background_gray',
                    defaultType: 'textfield',
                    itemId: 'infosClientStandard',
                    hidden: true,
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    fieldLabel: 'NOM',
                                    emptyText: 'Nom ',
                                    itemId: 'nomClient',
                                    labelWidth: 40,
                                    height: 30,
                                    flex: 0.8,
                                    margin: '0 15 0 0',
                                    enableKeyEvents: true


                                },
                                {
                                    fieldLabel: 'PRENOM(s)',
                                    emptyText: 'Prenom du porteur',
                                    itemId: 'prenomClient',
                                    labelWidth: 70,
                                    height: 30,
                                    flex: 1,
                                    margin: '0 15 0 0',
                                    enableKeyEvents: true

                                },
                                {
                                    fieldLabel: 'T&Eacute;L&Eacute;PHONE',
                                    emptyText: 'Telephone du client',
                                    itemId: 'telephoneClient',
                                    labelWidth: 90,
                                    height: 30,
                                    flex: 0.8,
                                    margin: '0 15 0 0',
                                    enableKeyEvents: true

                                },
                                {
                                    fieldLabel: 'Commentaire',
                                    emptyText: 'Commentaire',
                                    labelWidth: 80,
                                    height: 30,
                                    itemId: 'commentaire',
                                    flex: 1.2,
                                    margin: '0 15 0 0',
                                    enableKeyEvents: true

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


