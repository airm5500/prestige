/* global Ext */

Ext.define('testextjs.view.Dashboard.DoRetourCarnet', {
    extend: 'Ext.panel.Panel',
    xtype: 'doRetourCarnet',
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

        var tierspayantExlus = new Ext.data.Store({
            fields: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'code',
                    type: 'string'
                },
                {
                    name: 'nom',
                    type: 'string'
                },
                {
                    name: 'nomComplet',
                    type: 'string'
                },
                {
                    name: 'account',
                    type: 'number'
                }
            ],
            pageSize: 5,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v2/carnet-depot/list-exclus',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }
        });
        var typeMotif = Ext.create('Ext.data.Store', {
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
                url: '../api/v1/common/motif-retour-carnet',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var produit = new Ext.data.Store({
            fields: [
                {
                    name: 'cip',
                    type: 'string'
                },
                {
                    name: 'name',
                    type: 'string'
                },
                {
                    name: 'prixAchat',
                    type: 'number'
                },

                {
                    name: 'prix',
                    type: 'number'
                }
            ],
            pageSize: 9999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v2/carnet-depot/produits',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });

        var retourDetail = new Ext.data.Store({
            fields: [
                {
                    name: 'id',
                    type: 'number'
                },
                {
                    name: 'motifRetourCarnet',
                    type: 'string'
                },
                {
                    name: 'produitCip',
                    type: 'string'
                },
                {
                    name: 'produitLib',
                    type: 'string'
                },
                {
                    name: 'retourCarnetId',
                    type: 'string'
                },
                {
                    name: 'stockInit',
                    type: 'number'
                },
                {
                    name: 'stockFinal',
                    type: 'number'
                },
                {
                    name: 'qtyRetour',
                    type: 'number'
                },
                {
                    name: 'prixUni',
                    type: 'number'
                }


            ],
            pageSize: 9999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v2/retour-carnet-depot/items',
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
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },

                    items: [
                        {
                            xtype: 'fieldcontainer',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            items: [
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    itemId: 'dtStart',
                                    labelWidth: 15,
                                    flex: 0.5,
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    format: 'd/m/Y',
                                    value:'2015-01-01'

                                }, 

                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Au',
                                    itemId: 'dtEnd',
                                    labelWidth: 15,
                                    flex: 0.5,
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    format: 'd/m/Y',
                                    value: new Date()

                                },
                                {
                                    xtype: 'combobox',
                                    flex: 1,
                                    margin: '0 5 0 0',
                                    fieldLabel: 'Tiers-payants',
                                    labelWidth: 85,
                                    id: 'tiersPayantsExclus',
                                    itemId: 'tiersPayantsExclus',
                                    store: tierspayantExlus,
                                    pageSize: 5,
                                    valueField: 'id',
                                    displayField: 'nomComplet',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    minChars: 2,
                                    emptyText: 'Sélectionnez un tiers-payant'
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Produits',
                                    itemId: 'produit',
                                    labelWidth: 55,
                                    store: produit,
                                    pageSize: 999,
                                    valueField: 'id',
                                    displayField: 'name',
                                    typeAhead: false,
                                    flex: 1.5,
                                    queryMode: 'remote',
                                    autoSelect: true,
                                    forceSelection: true,
                                    minChars: 3,
                                    queryCaching: true,
                                    emptyText: 'Choisir un article par Nom ou Cip...',
                                    listConfig: {

                                        emptyText: 'Pas de données trouvées.',
                                        getInnerTpl: function () {
                                            return '<tpl for="."><span style="font-weight:bold;"><span style="width:100px;display:inline-block;">{cip}</span>{name} <span style="float: right; "> <span> ( {prix} )</span></span></span></tpl>';

                                        }
                                    }

                                }, {
                                    xtype: 'combobox',
                                    flex: 0.7,
                                    fieldLabel: 'Motif',
                                    margin: '0 0 0 10',
                                    labelWidth: 35,
                                    itemId: 'motifRetour',
                                    store: typeMotif,
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
                                    hidden: true,
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
                                    flex: 0.4,
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
                                            text: 'RETOUR',
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
                                    title: '<span style="color:blue;">LISTE DES PRODUITS</span>',
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
                                            store: retourDetail,
                                            height: 'auto',
                                            minHeight: 450,
                                            columns: [
                                                {
                                                    text: '#',
                                                    width: 45,
                                                    dataIndex: 'id',
                                                    hidden: true

                                                },
                                                {
                                                    xtype: 'rownumberer',
                                                    text: '#',
                                                    width: 45,
                                                    sortable: true
                                                }, {
                                                    text: 'C.CIP',
                                                    flex: 1,
                                                    sortable: true,
                                                    dataIndex: 'produitCip'
                                                }, {
                                                    text: 'DESIGNATION',
                                                    flex: 2,
                                                    sortable: true,
                                                    dataIndex: 'produitLib'
                                                },
                                                {
                                                    text: 'Stock Init',
                                                    flex: 1,
                                                    xtype: 'numbercolumn',
                                                    sortable: true,
                                                    dataIndex: 'stockInit',
                                                    format: '0,000.',
                                                    align: 'right'
                                                },
                                                {
                                                    xtype: 'numbercolumn',
                                                    header: 'Quantité',
                                                    dataIndex: 'qtyRetour',
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
                                                },
                                              
                                                {
                                                    text: 'P.U',
                                                    xtype: 'numbercolumn',
                                                    flex: 1,
                                                    sortable: true,
                                                    dataIndex: 'prixUni',
                                                    MaskRe: /[0-9.]/,
                                                    minValue: 0,
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
                                                            height: 30,
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
                                                            pageSize: 9999,
                                                            store: retourDetail

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
                                    items: [
                                        {
                                            xtype: 'textareafield',
                                            grow: true,
                                            itemId: 'commentaire',
                                            fieldLabel: 'Commentaire',
                                            flex: 1,
                                            margin: '0 0 5 0',
                                            emptyText: 'Saisir un commentaire'
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



