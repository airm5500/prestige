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
            autoLoad: true,
            pageSize: 9999,
            listeners: {
                load: function (st) {
                    var cbo = Ext.ComponentQuery.query('doajustementmanager #typeAjustement')[0];
                    if (!cbo || cbo.getValue()) {
                        return;
                    }
                    var idx = st.findBy(function (r) {
                        var lib = (r.get('libelle') || '').toLowerCase();
                        return lib.indexOf('correction') !== -1 && lib.indexOf('stock') !== -1;
                    });
                    if (idx >= 0) {
                        cbo.setValue(st.getAt(idx).get('id'));
                    }
                }
            },

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
        // Zone ajustee, choisie au bouton d'ou l'on vient.
        var zoneAjustement = (window.PRESTIGE_AJUSTEMENT_ZONE === 'RESERVE') ? 'RESERVE' : 'RAYON';
        // La liste deroulante affiche un stock : ce doit etre celui de la zone que l'on corrige.
        // La recherche de la vente ne connait que le stock rayon, d'ou une recherche dediee pour
        // la reserve. Elle rend la meme forme, et ne propose que les produits suivis en reserve.
        var urlRechercheProduit = (zoneAjustement === 'RESERVE')
                ? '../api/v1/reserve/recherche-produits'
                : '../api/v1/vente/search';

        var produit = new Ext.data.Store({
            model: 'testextjs.model.caisse.Produit',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: urlRechercheProduit,
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
                                    // Elargi : les designations longues passaient sur deux lignes
                                    // dans la liste deroulante.
                                    flex: 3,
//                                    margin: '0 10 0 0',
                                    queryMode: 'remote',
                                    autoSelect: true,
                                    forceSelection: true,
                                    minChars: 3,
                                    queryCaching: false,
                                    emptyText: (zoneAjustement === 'RESERVE')
                                            ? 'Choisir un article suivi en reserve (Nom ou Cip)...'
                                            : 'Choisir un article par Nom ou Cip...',
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
                                    // Zone ciblee, choisie au bouton d'ou l'on vient : "Ajustement
                                    // rayon" ou "Ajustement reserve". Elle n'est donc plus
                                    // modifiable ici - le meme produit dans les deux zones se
                                    // traite par deux ajustements distincts, ce qui evite toute
                                    // ambiguite sur le stock corrige.
                                    xtype: 'displayfield',
                                    id: 'str_ZONE_AJUSTEMENT',
                                    fieldLabel: 'Zone',
                                    labelWidth: 40,
                                    flex: 1,
                                    margin: '0 0 0 10',
                                    value: zoneAjustement,
                                    renderer: function (v) {
                                        var reserve = (v === 'RESERVE');
                                        return '<span style="font-weight:bold;color:'
                                                + (reserve ? '#c26500' : '#256b2a') + ';">'
                                                + (reserve ? 'RESERVE' : 'RAYON') + '</span>';
                                    }
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
                                                        // Un ajustement corrige un ecart : il peut
                                                        // retirer du stock, donc etre negatif.
                                                        allowDecimals: false,
                                                        maskRe: /[0-9-]/,
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


