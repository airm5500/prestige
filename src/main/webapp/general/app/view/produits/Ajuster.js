/* global Ext */

Ext.define('testextjs.view.produits.Ajuster', {
    extend: 'Ext.panel.Panel',
    xtype: 'doajustementmanager',
    requires: [
        'testextjs.model.caisse.Ajustement'
    ],
    config: {
        data: null
    },
    frame: true,
    title: 'Ajout de produits',
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
        var typeAjustement = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'number'

                        },
                        {name: 'libelle',
                            type: 'string'

                        }
                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/type-ajustements',
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
                },
                timeout: 2400000
            }
        });

        var venteDetails = new Ext.data.Store({
            model: 'testextjs.model.caisse.ItemAjust',
            pageSize: 30,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ajustement/items',
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
                    title: '<span style="color:blue;">Ajout de produits</span>',
                    collapsible: false,
                    defaultType: 'textfield',
//                    cls: 'background_gray',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },

                    items: [
                        {
                            xtype: 'fieldcontainer',
                            layout: 'hbox',
//                            bodyPadding: 5,
                            defaultType: 'textfield',
                            fieldLabel: 'PRODUITS',
                            items: [
                                {
                                    xtype: 'combobox',
                                    height: 30,
                                    itemId: 'produit',
                                    labelWidth: 75,
                                    store: produit,
                                    pageSize: 10,
                                    valueField: 'lgFAMILLEID',
                                    displayField: 'strNAME',
                                    typeAhead: false,
                                    flex: 1.5,
//                                    margin: '0 10 0 0',
                                    queryMode: 'remote',
                                    autoSelect: true,
                                    forceSelection: true,
                                    minChars: 3,
                                    queryCaching: false,
                                    emptyText: 'Choisir un article par Nom ou Cip...',
                                    listConfig: {
                                        loadingText: 'Recherche...',
                                        emptyText: 'Pas de données trouvées.',
                                        getInnerTpl: function () {
                                            return '<tpl for="."><tpl if="intNUMBERAVAILABLE <=0"><span style="color:#17987e;font-weight:bold;"><span style="width:100px;display:inline-block;">{intCIP}</span>{strNAME} <span style="float: right;"><span style="margin-right:10px;">( {intNUMBERAVAILABLE} )</span><span> ( {intPRICE} )</span></span></span><tpl else><span style="font-weight:bold;"><span style="width:100px;display:inline-block;">{intCIP}</span>{strNAME} <span style="float: right; "> <span style="margin-right:10px;">( {intNUMBERAVAILABLE} )</span><span> ( {intPRICE} )</span></span></span></tpl></tpl>';

                                        }
                                    }

                                }, {
                                    xtype: 'combobox',
                                    flex: 1,
                                    fieldLabel:'Motif',
                                    margin: '0 0 0 10',
                                    labelWidth:50,
                                    itemId: 'typeAjustement',
                                    store: typeAjustement,
                                    pageSize: 999,
                                    valueField: 'id',
                                    displayField: 'libelle',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    minChars: 2,
                                    emptyText: 'Sélectionnez un motif'
                                },

                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Qté Stock',
                                    labelWidth: 75,
                                    itemId: 'stockField',
                                    margin: '0 0 0 10',
                                    style: 'background-color:#F7F7F7;font-weight:800;',
                                    fieldStyle: "color:blue;font-weight:800;",
                                    flex: 0.7,
                                    value: 0
                                },
                                {
                                    xtype: 'textfield',
                                    value: 1,
                                    itemId: 'qtyField',
                                    fieldLabel: 'QD:',
                                    flex: 0.7,
                                    height: 30,
                                    labelWidth: 30,
                                    margin: '0 0 0 10',
                                    emptyText: 'Quantité',
                                    selectOnFocus: true,
                                    enableKeyEvents: true

                                }

                            ]
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
                                            text: 'ENREGISTRER',
                                            itemId: 'btnCloture',
                                            iconCls: 'icon-clear-group',
                                            scope: this

                                        },
                                        {
                                            text: 'ANNULER',
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
                                    title: '<span style="color:blue;">LISTE DES Produits</span>',
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
                                                    dataIndex: 'lgAJUSTEMENTDETAILID',
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
                                                    header: 'Quantité',
                                                    dataIndex: 'intNUMBER',
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
                                                    text: 'P.U',
                                                    xtype: 'numbercolumn',
                                                    flex: 1,
                                                    sortable: true,
                                                    dataIndex: 'intPRICE',
                                                    MaskRe: /[0-9.]/,
                                                    minValue: 0,
                                                    format: '0,000.',
                                                    align: 'right'
                                                }, {
                                                    text: 'PAF',
                                                    flex: 1,
                                                    xtype: 'numbercolumn',
                                                    sortable: true,
                                                    dataIndex: 'intPAF',
                                                    format: '0,000.',
                                                    align: 'right'
                                                },
                                                {
                                                    text: 'Valorisation',
                                                    flex: 1,
                                                    xtype: 'numbercolumn',
                                                    sortable: true,
                                                    dataIndex: 'montantTotal',
                                                    format: '0,000.',
                                                    align: 'right'
                                                },
                                                {
                                                    text: 'Stock.Avant',
                                                    flex: 1,
                                                    xtype: 'numbercolumn',
                                                    sortable: true,
                                                    dataIndex: 'intNUMBERCURRENTSTOCK',
                                                    format: '0,000.',
                                                    align: 'right'
                                                },
                                                {
                                                    text: 'Stock.Après',
                                                    flex: 1,
                                                    xtype: 'numbercolumn',
                                                    sortable: true,
                                                    dataIndex: 'intNUMBERAFTERSTOCK',
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
                                                            pageSize: 30,
                                                            store: venteDetails

                                                        }

                                                    ]
                                                }
                                            ]



                                        }

                                    ]
                                }
                                ,
                                {
                                    xtype: 'fieldset',
                                    title: 'Espace commentaire',
                                    layout: 'hbox',
                                    collapsible: true,
                                    defaultType: 'textfield',
                                    defaults: {
                                        hideLabel: 'true'
                                    },
                                    items: [//
                                        {
                                            xtype: 'textareafield',
                                            grow: true,
                                            maxLength: 200,
                                            itemId: 'commentaire',
                                            fieldLabel: 'Commentaire',
                                            flex: 1,
                                            margin: '0 0 5 0',
                                            emptyText: 'Saisir un commentaire (200 caracteres maximum)'
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


