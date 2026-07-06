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
    width: '100%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel vp-vente vp-focus-zone',
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
                            layout: {type: 'hbox', align: 'top'},

                            flex: 1,
                            items: [
                                {
                                    xtype: 'fieldset',
                                    style: 'background-color:#F0F8FF !important;',
                                    itemId: 'clientSearchBox',
                                    cls: 'vp-assur-card',
                                    title: '<span style="color:blue;">RECHERCHER LE CLIENT</span>',
                                    flex: 0.6,
                                    height: 118,
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
                                    cls: 'vp-assur-card',
                                    margin: '0 5 0 0',
                                    flex: 1.2,
                                    height: 118,
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
                                                    icon: 'resources/images/icons/fam/user_edit.png',
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
                                    cls: 'vp-assur-card',
                                    flex: 1.2,
                                    height: 118,
//                                    hidden: true,
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
                                                    icon: 'resources/images/icons/fam/user_add.png',
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
                            cls: 'vp-tp-card',
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

                /*
                 * Refonte "Direction A" : poste d'encaissement en deux colonnes.
                 * Colonne gauche = zone de travail (produit + panier),
                 * colonne droite = rail de paiement (totaux + règlement + actions).
                 * Contrat contrôleur inchangé : mêmes itemId, mêmes xtypes parents
                 * (fieldset/container/fieldcontainer/toolbar), mêmes états initiaux.
                 */
                {
                    xtype: 'container',
                    itemId: 'venteColumns',
                    cls: 'vp-columns',
                    layout: {type: 'hbox', align: 'stretchmax'},
                    items: [
                        {
                            xtype: 'container',
                            itemId: 'venteColLeft',
                            cls: 'vp-col-left',
                            flex: 1,
                            padding: '0 2 0 2',
                            layout: {type: 'vbox', align: 'stretch'},
                            items: [
                                {
                                    xtype: 'fieldset',
                                    itemId: 'produitContainer',
                                    title: '<span style="color:blue;">RECHERCHER UN PRODUIT</span>',
                                    collapsible: false,
                                    defaultType: 'textfield',
                                    layout: 'anchor',
                                    /* section fusionnée (produit + infos) : fond légèrement teinté */
                                    cls: 'background_gray vp-produit-card',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [
                                        {
                                            xtype: 'fieldcontainer',
                                            layout: 'hbox',
                                            height: 46,
                                            defaultType: 'textfield',
                                            fieldLabel: 'PRODUIT',
                                            items: [
                                                {
                                                    xtype: 'combobox',
                                                    height: 30,
                                                    margin: '3 10 3 0',
                                                    itemId: 'produit',
                                                    store: produit,
                                                    pageSize: 10,
                                                    valueField: 'lgFAMILLEID',
                                                    displayField: 'strNAME',
                                                    flex: 2,
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
                                                    margin: '3 0 3 0',
                                                    labelWidth: 30,
                                                    emptyText: 'Quantité',
                                                    selectOnFocus: true,
                                                    enableKeyEvents: true

                                                }

                                            ]
                                        },
                                        {
                                            /* infos produit sous la zone de choix : Stock + Rayon en gras
                                             * (ex-section INFOS PRODUITS fusionnée ici, remise déplacée
                                             * dans la barre de la grille) */
                                            xtype: 'container',
                                            layout: 'hbox',
                                            height: 26,
                                            margin: '2 0 0 105',
                                            items: [
                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Stock',
                                                    labelWidth: 50,
                                                    labelStyle: 'font-weight:bold;',
                                                    itemId: 'stockField',
                                                    fieldStyle: "color:#0D47A1;font-weight:bold;",
                                                    flex: 0.7

                                                },
                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'Rayon',
                                                    labelWidth: 55,
                                                    labelStyle: 'font-weight:bold;',
                                                    itemId: 'emplacementId',
                                                    fieldStyle: "color:#0D47A1;font-weight:bold;",
                                                    flex: 1.4
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
                                            /* comptant : la grille s'étire pour que l'écran ait la même
                                             * hauteur qu'en assurance (le contrôleur passe à 250 quand le
                                             * bandeau assurance est affiché) */
                                            minHeight: 440,
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
                                                    tdCls: 'vp-col-qd',
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
                                                    hidden: true,
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
                                                    width: 42,
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
                                                            width: '24%',
                                                            height: 35,
                                                            enableKeyEvents: true
                                                        }, '-', {
                                                            text: 'rechercher',
                                                            tooltip: 'rechercher',
                                                            scope: this,
                                                            itemId: 'btnRecherche',
                                                            cls: 'btn-primarya',
                                                            iconCls: 'searchicon'

                                                        }, '-',
                                                        {
                                                            xtype: 'combobox',
                                                            height: 30,
                                                            fieldLabel: 'TYPE REMISE ',
                                                            itemId: 'typeRemise',
                                                            store: typeremise,
                                                            editable: false,
                                                            hidden: true,
                                                            pageSize: null,
                                                            valueField: 'lgTYPEREMISEID',
                                                            displayField: 'strDESCRIPTION',
                                                            typeAhead: false,
                                                            width: 200,
                                                            queryMode: 'remote',
                                                            enableKeyEvents: true,
                                                            minChars: 3,
                                                            emptyText: 'Choisir un type remise...',
                                                            triggerAction: 'all'

                                                        },
                                                        {
                                                            xtype: 'combobox',
                                                            height: 30,
                                                            fieldLabel: 'REMISE',
                                                            itemId: 'remise',
                                                            store: remise,
                                                            editable: false,
                                                            pageSize: null,
                                                            valueField: 'lgREMISEID',
                                                            displayField: 'strNAME',
                                                            typeAhead: false,
                                                            width: 250,
                                                            queryMode: 'remote',
                                                            labelWidth: 55,
                                                            enableKeyEvents: true,
                                                            emptyText: 'Choisir une remise...'

                                                        }, '-',
                                                        {
                                                            xtype: 'displayfield',
                                                            fieldLabel: 'TOTAL',
                                                            itemId: 'totalField',
                                                            flex: 1,
                                                            labelWidth: 52,
                                                            labelStyle: 'font-weight:bold;',
                                                            cls: 'vp-total-badge',
                                                            renderer: function (v) {
                                                                return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                                            },
                                                            value: 0
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

                                                        }]
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
                        },

                        /* ------- Colonne droite : rail de paiement ------- */
                        {
                            xtype: 'container',
                            itemId: 'venteColRight',
                            cls: 'vp-col-right',
                            width: 400,
                            margin: '0 0 0 12',
                            layout: {type: 'vbox', align: 'stretch'},
                            items: [
                                {
                                    xtype: 'fieldset',
                                    labelAlign: 'center',
                                    title: '<span style="color:blue;">REGLEMENT</span>',
                                    itemId: 'reglementContainer',
                                    layout: 'anchor',
                                    minHeight: 70,

                                    //cls: 'pc-reglement',
                                    cls: 'background_green vp-paycard',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    collapsible: false,
                                    defaultType: 'textfield',
                                    items: [
                                        {
                                            xtype: 'container',
                                            layout: {type: 'vbox', align: 'stretch'},
                                            itemId: 'reglement',
                                            defaultType: 'textfield',
                                            border: true,
                                            style: 'border-bottom:1px #9999ff solid;padding-bottom:3px;',

                                            margin: '0 0 5 0',
                                            items: [
                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'NET A PAYER :',
                                                    labelWidth: 165,
                                                    value: 0,
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                                    },
                                                    itemId: 'montantNet',
                                                    fieldStyle: "color:red;font-size:1.5em;font-weight: bold;",
                                                    margin: '0 0 2 0'

                                                },

                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'MONTANT REMISE :',
                                                    labelWidth: 165,
                                                    itemId: 'montantRemise',
                                                    value: 0,
                                                    fieldStyle: "color:green;font-size:1.5em;font-weight: bold;",
                                                    margin: '0 0 2 0',
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                                    }
                                                },
                                                {
                                                    xtype: 'displayfield',
                                                    fieldLabel: 'PART TIERS-PAYANT:',
                                                    labelWidth: 165,
                                                    itemId: 'montantTp',
                                                    hidden: true,
                                                    value: 0,
                                                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                                                    margin: '0 0 2 0',
                                                    renderer: function (v) {
                                                        return Ext.util.Format.number(v, '0,000.') + ' CFA';
                                                    }
                                                },

                                                {
                                                    xtype: 'combobox',
                                                    labelWidth: 165,
                                                    fieldLabel: 'TYPE R&Egrave;GLEMENT',
                                                    itemId: 'typeReglement',
                                                    store: store_typereglement,
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
                                            layout: {type: 'vbox', align: 'stretch'},
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
                                                    margin: '0 0 4 0',
                                                    labelWidth: 85,
                                                    height: 30,
                                                    fieldLabel: 'REFERENCE'
                                                },
                                                {
                                                    itemId: 'banque',
                                                    margin: '0 0 4 0',
                                                    labelWidth: 85,
                                                    height: 30,
                                                    fieldLabel: 'BANQUE'
                                                },
                                                {
                                                    itemId: 'lieuxBanque',
                                                    labelWidth: 85,
                                                    margin: '0 0 4 0',
                                                    height: 30,
                                                    fieldLabel: 'LIEU'
                                                }


                                            ]
                                        },
                                        {
                                            xtype: 'container',
                                            layout: {type: 'vbox', align: 'stretch'},
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
                                                    labelStyle: 'height:44px;line-height:44px;white-space:nowrap', // label plus haut
                                                    fieldStyle: 'height:44px;line-height:44px;padding:8px 10px', // input plus haut
                                                    inputAttrTpl: 'style="height:44px"',
                                                    emptyText: 'Montant reçu',
                                                    cls: 'vp-field-recu',
                                                    height: 50,
                                                    labelWidth: 175,
                                                    regex: /[0-9.]/,
                                                    /* marge sous le champ : le halo du battement ne doit pas
                                                     * chevaucher le bouton mobile ni la ligne MONNAIE */
                                                    margin: '0 0 14 0',
                                                    minValue: 0,
                                                    value: 0,
//                                    readOnly: true,
                                                    enableKeyEvents: true,
                                                    selectOnFocus: true

                                                },

                                                {
                                                    xtype: 'button',
                                                    itemId: 'btnExtraMode',
                                                    text: 'Associer un autre paiement mobile',
                                                    tooltip: 'Répartir le paiement entre deux modes mobiles',
                                                    hidden: true,
                                                    cls: 'vp-btn-extra',
                                                    height: 32,
                                                    margin: '0 0 4 0'
                                                },

                                                {
                                                    xtype: 'numberfield',
                                                    hideTrigger: true,
                                                    itemId: 'montantExtra',
                                                    hidden: true,
                                                    fieldLabel: '',
                                                    /* même gabarit que MONTANT RECU : cadre arrondi,
                                                     * intérieur orange (part mobile) via vp-field-extra */
                                                    cls: 'vp-field-extra',
                                                    height: 36,
                                                    fieldStyle: 'height:36px;padding:4px 10px',
                                                    labelWidth: 130,
                                                    regex: /[0-9.]/,
                                                    margin: '0 0 6 0',
                                                    minValue: 0,
                                                    value: 0,
                                                    readOnly: true,
                                                    enableKeyEvents: true,
                                                    selectOnFocus: true

                                                },
                                                {
                                                    xtype: 'displayfield',
                                                    labelWidth: 130,
                                                    margin: '10 0 2 0',
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
                                                    labelWidth: 130,
                                                    margin: '0 0 2 0',
                                                    hidden: true,
                                                    fieldLabel: 'Vente sans bon',
                                                    itemId: 'sansBon'
                                                },

                                                {
                                                    xtype: 'displayfield',
                                                    labelWidth: 130,
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
                                        },
                                        {
                                            /* Actions de la vente : toolbar verticale du rail
                                             * (sélecteurs contrôleur : #contenu [xtype=toolbar] #btnX) */
                                            xtype: 'toolbar',
                                            ui: 'footer',
                                            cls: 'vp-actions',
                                            layout: {type: 'vbox', align: 'stretch'},
                                            margin: '8 0 0 0',
                                            items: [
                                                {
                                                    text: 'TERMINER LA VENTE',
                                                    itemId: 'btnCloture',
                                                    iconCls: 'valider-vente',
                                                    scope: this,
                                                    height: 42,
                                                    cls: 'btn-primary'
                                                }, {
                                                    text: 'CLOTURER LA PRE-VENTE',
                                                    itemId: 'btnClosePrevente',
                                                    //cls: 'btn-prevente',
                                                    hidden: true,
                                                    height: 42,
                                                    iconCls: 'icon-clear-group',
                                                    cls: 'btn-primary',
                                                    scope: this
                                                }, {
                                                    text: 'METTRE EN ATTENTE',
                                                    itemId: 'btnStandBy',
                                                    iconCls: 'attente',
                                                    scope: this,
                                                    height: 38,
                                                    cls: 'btn-primarya'
                                                },
                                                {
                                                    text: 'AFFICHER NET A PAYER',
                                                    itemId: 'netBtn',
                                                    iconCls: 'afficheur_caisse',
                                                    scope: this,
                                                    height: 38,
                                                    cls: 'btn-primarya'

                                                },
                                                {
                                                    text: 'RETOUR',
                                                    itemId: 'btnGoBack',
                                                    iconCls: 'retour',
                                                    scope: this,
                                                    height: 38,
                                                    cls: 'btn-secondary'
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
