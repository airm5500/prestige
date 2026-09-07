/* global Ext */

Ext.define('testextjs.view.reglement.FaireReglement', {
    extend: 'Ext.panel.Panel',
    xtype: 'fairereglement',
    requires: [
        'testextjs.model.caisse.ClientLambda'
    ],
    config: {
        data: null
    },

    frame: true,
    title: 'Régler un différé',
    bodyPadding: 5,
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
        var liste = new Ext.data.Store({
            idProperty: 'id',
            fields: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'clientId',
                    type: 'string'
                },
                {
                    name: 'clientFullName',
                    type: 'string'
                },
                {
                    name: 'reference',
                    type: 'string'
                },
                {
                    name: 'bon',
                    type: 'string'
                },
                {
                    name: 'heure',
                    type: 'string'
                },
                {
                    name: 'dateOp',
                    type: 'string'
                },
                {
                    name: 'montantAttendu',
                    type: 'number'
                },
                {
                    name: 'montantRegle',
                    type: 'number'
                },
                {
                    name: 'totalAmount',
                    type: 'number'
                },
                {
                    name: 'montantPaye',
                    type: 'number'
                }

            ],
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/reglement/liste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }

            }
        });
        var store_typereglement = new Ext.data.Store({
            model: 'testextjs.model.caisse.Reglement',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/reglement-differes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.ClientLambda',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/delayed',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var store_type_paiement = Ext.create('Ext.data.Store', {
            autoLoad: true,
            fields: ['lg_NATURE_PAIEMENT_diff_ID', 'str_LIBELLE_NATURE_PAIEMENT'],
            data: [
                {"lg_NATURE_PAIEMENT_diff_ID": 1, "str_LIBELLE_NATURE_PAIEMENT": "Partiel"},
                {"lg_NATURE_PAIEMENT_diff_ID": 2, "str_LIBELLE_NATURE_PAIEMENT": "Total"}
            ]
        });
        var me = this;
        Ext.applyIf(me, {
            width: '98%',
            height: 580,
            cls: 'custompanel',
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
                            text: 'Valider',
                            itemId: 'btnValider',
                            iconCls: 'icon-clear-group',
                            scope: this

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
            fieldDefaults: {
                labelAlign: 'left',
//                labelWidth: 120,
                anchor: '100%'

            },
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 10
            },
            defaults: {
                flex: 1
            },

            items: [
                {
                    xtype: 'fieldset',
                    title: '<span style="color:blue;">Infos Client</span>',
                    collapsible: false,
                    flex: 0.4,
                    margin: '-10 0 0 1',
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        hideLabel: 'true'
                    },
                    items: [
                        {
                            xtype: 'fieldcontainer',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            items: [
                                {
                                    xtype: 'combobox',
                                    itemId: 'client',
                                    store: storeUser,
                                    labelWidth: 40,
                                    fieldLabel: 'Clients',
                                    pageSize: null,
                                    valueField: 'lgCLIENTID',
                                    displayField: 'fullName',
                                    typeAhead: false,
                                    flex: 1.5,
                                    minChars: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un client'

                                }

                                , {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Matricule',
                                    fieldStyle: "color:blue;font-weight:800;",
                                    margin: '0 15 0 5',
                                    labelWidth: 55,
                                    flex: 1,
                                    itemId: 'matricule'
                                }
                                , {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Adresse',
                                    labelWidth: 50,
                                    flex: 1,
                                    fieldStyle: "color:blue;font-weight:800;",
                                    margin: '0 10 0 5',
                                    itemId: 'adresse'
                                },
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    itemId: 'dtStart',
                                    margin: '0 10 0 0',
                                    submitFormat: 'Y-m-d',
                                    flex: 0.8,
                                    labelWidth: 20,
                                    maxValue: new Date(),
                                    value: new Date("2015-01-01"),
                                    format: 'd/m/Y'

                                },

                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Au',
                                    itemId: 'dtEnd',
                                    labelWidth: 20,
                                    flex: 0.8,
                                    maxValue: new Date(),
                                    value: new Date(),
                                    margin: '0 9 0 0',
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y'

                                },
                                {
                                    xtype: 'button',
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    itemId: 'rechercher',
                                    scope: this,
                                    iconCls: 'searchicon'
                                }


                            ]
                        }]
                },

                {
                    xtype: 'fieldset',

                    title: '<span style="color:blue;">Information R&egrave;glement</span>',
                    collapsible: true,
                    layout: 'hbox',
                    flex: 0.4,
                    margin: '1 0 0 1',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type Paiement :',
                            labelWidth: 100,
                            margins: '0 0 0 10',
                            itemId: 'nature',
                            store: store_type_paiement,
                            valueField: 'lg_NATURE_PAIEMENT_diff_ID',
                            displayField: 'str_LIBELLE_NATURE_PAIEMENT',
                            typeAhead: true,
                            queryMode: 'local',
                            value: 2,
                            flex: 1


                        }
                        , {
                            xtype: 'datefield',
                            fieldLabel: 'Date R&egrave;glement',
                            itemId: 'dtReglement',
                            labelWidth: 100,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y',
                            margin: '0 0 0 10'

                        },
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'Montant Restant',
                            labelWidth: 100,
                            margin: '0 5 0 10',
                            flex: 1,
                            itemId: 'montantRestant',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'Net à payer',
                            labelWidth: 80,
                            margin: '0 5 0 10',
                            flex: 1,
                            itemId: 'montantNet',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:green;font-weight:800;",
                            value: 0
                        },
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'Dossiers Restants',
                            labelWidth: 120,
                            itemId: 'nb',
                            flex: 1,
                            fieldStyle: "color:blue;font-weight:800;",
                            margin: '0 5 0 5',
                            value: 0
                        }

                        , {
                            hidden: true,
                            xtype: 'checkbox',
                            margins: '0 0 5 5',
                            boxLabel: 'Tous S&eacute;lectionner',
                            itemId: 'selectALL',
                            checked: false

                        }

                    ]
                },
                {
                    xtype: 'fieldset',
                    id: 'detaildiffere',
                    title: '<span style="color:blue;">Detail(s) des r&eacute;glements</span>',
                    collapsible: true,
                    flex: 2.5,
                    margin: '1 0 0 1',
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            store: liste,
                            minHeight: 200,
                            columns: [
                                {
                                    text: 'id',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    align: 'right',
                                    dataIndex: 'id'
                                }, {
                                    text: 'R&eacute;f&eacute;rence.Bon',
                                    flex: 1,
                                    dataIndex: 'bon'
                                },
                                {
                                    text: 'Date Vente',
                                    flex: 1,
                                    dataIndex: 'dateOp'
                                },

                                {
                                    xtype: 'numbercolumn',
                                    text: 'Montant Vente',
                                    flex: 1,
                                    dataIndex: 'totalAmount',
                                    format: '0,000.',
                                    align: 'right'
                                }, {
                                    xtype: 'numbercolumn',
                                    text: 'Montant Pay&eacute;',
                                    flex: 1,
                                    dataIndex: 'montantPaye',
                                    format: '0,000.',
                                    align: 'right'
                                }, {
                                    text: 'Montant Restant',
                                    flex: 1,
                                    xtype: 'numbercolumn',
                                    dataIndex: 'montantRegle',
                                    format: '0,000.',
                                    align: 'right'
                                }

                            ],
                            selModel: {
                                selType: 'checkboxmodel',
                                injectCheckbox: 'last'
                            },
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: liste,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            }

                        }, {
                            xtype: 'fieldset',
                            labelAlign: 'right',
                            height: 130,
                            title: '<span style="color:blue;">REGLEMENT</span>',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            collapsible: false,
                            defaultType: 'textfield',
                            items: [
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            labelWidth: 130,
                                            maxWidth: 450,
                                            fieldLabel: 'TYPE R&Egrave;GLEMENT',
                                            itemId: 'typeReglement',
                                            store: store_typereglement,
                                            flex: 1,
                                            valueField: 'lgTYPEREGLEMENTID',
                                            displayField: 'strNAME',
                                            editable: false,
                                            queryMode: 'remote',
                                            emptyText: 'Choisir un type de reglement...',
                                            pageSize: null,
                                            typeAhead: false,
                                            enableKeyEvents: true,
                                            minChars: 3,
                                            margin: '0 0 3 0',
                                            triggerAction: 'all'
                                        }

                                    ]},
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
                                            fieldLabel: 'REFERENCE',
                                            flex: 1
                                        },
                                        {
                                            itemId: 'banque',
                                            margin: '0 10 0 0',
                                            labelWidth: 55,

                                            fieldLabel: 'BANQUE',
                                            flex: 1
                                        },
                                        {
                                            itemId: 'lieuxBanque',
                                            labelWidth: 40,
                                            margin: '0 10 0 0',

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
                                            emptyText: 'Montant reçu',
                                            flex: 1,

                                            labelWidth: 120,
                                            regex: /[0-9.]/,
                                            margin: '0 30 0 0',
                                            minValue: 0,
                                            value: 0,
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
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-size:1.2em;font-weight: bold;",
                                            value: 0,
                                            align: 'right'
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'RESTE A PAYER:',
                                            labelWidth: 120,
                                            fieldStyle: "color:green;font-weight:800;",
                                            itemId: 'montantPayer',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            flex: 1,
                                            value: 0
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

