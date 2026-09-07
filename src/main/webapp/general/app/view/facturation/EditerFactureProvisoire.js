
/* global Ext */

Ext.define('testextjs.view.facturation.EditerFactureProvisoire', {
    extend: 'Ext.panel.Panel',
    xtype: 'oneditfacture',
    frame: true,
    title: 'Edition factures provisoires',
    scrollable: true,
    width: '98%',
    minHeight: 550,
    cls: 'custompanel',
    layout: {
        type: 'vbox',
        align: 'stretch',
        padding: 5
    },
    requires: [
        'testextjs.view.garde.SelecteurGarde',
        'Ext.grid.*'
    ],
    config: {
        selectAll: null,
    },
    initComponent: function () {
        /* Le mode arrive par « data » : c'est ainsi que le routeur d'ecrans (App.onRedirectTo)
           transmet ses parametres. On le lit une fois, ici, plutot qu'a chaque usage. */
        var enCarnetDepot = !!(this.data && this.data.carnetDepot);
        if (enCarnetDepot) {
            // Le titre doit dire sans ambiguite ce que l'on est en train de creer.
            this.title = 'Edition factures provisoires — CARNET DÉPÔT';
        }
        var typeTp = Ext.create('Ext.data.Store', {
            autoLoad: true,
            fields: ['value', 'name', "code"],
            data: [
                {"value": "1", "name": "Assurance", "code": '01'},
                {"value": "2", "name": "Carnet", "code": '02'}
            ]
        });
        var store_type_filter = Ext.create('Ext.data.Store', {
            autoLoad: true,
            fields: ['value', 'name'],
            data: [
                {"value": "ALL", "name": "Tous"},
                {"value": "SELECT", "name": "Sélection massive"},
                {"value": "TYPETP", "name": "Type tiers payant"},
                {"value": "CODE_GROUP", "name": "Code de regroupement"},
                {"value": "TP", "name": "Par tiers payant"},
                {"value": "ALL_TP", "name": "Tous les tiers payant"},
                {"value": "GROUP", "name": "Par groupes et compagnies d'assurances"},
                {"value": "BONS", "name": "Par Sélection de bons"}
            ]
        });
        var groupesStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/facturation/groupetierspayant',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var tp = Ext.create('Ext.data.Store', {
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
            pageSize: 9999,

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
        var store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },
                        {name: 'fullName',
                            type: 'string'

                        },

                        {name: 'nbDossier',
                            type: 'number'

                        },

                        {name: 'montant',
                            type: 'number'

                        }

                    ],
            autoLoad: false,
            pageSize: 20,
            proxy: {
                type: 'ajax',
                url: '../api/v1/facturation/provisoires',
                // Le drapeau part sur CHAQUE requete de ce magasin : liste agregee comme liste des
                // bons. Sans lui, le serveur retombe sur le circuit normal.
                extraParams: {carnetDepot: enCarnetDepot},
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var storebons = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },
                        {name: 'fullName',
                            type: 'string'

                        },

                        {name: 'montant',
                            type: 'number'

                        }

                    ],
            autoLoad: false,
            pageSize: 20,
            proxy: {
                type: 'ajax',
                url: '../api/v1/facturation/provisoires',
                // Le drapeau part sur CHAQUE requete de ce magasin : liste agregee comme liste des
                // bons. Sans lui, le serveur retombe sur le circuit normal.
                extraParams: {carnetDepot: enCarnetDepot},
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });

        var me = this;
        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    items: ['->',
                        {
                            text: 'Editer',
                            itemId: 'btnedit',
                            iconCls: 'icon-clear-group',
                            scope: this

                        }, {
                            text: 'Retour',
                            itemId: 'btncancel',
                            iconCls: 'icon-clear-group',
                            scope: this

                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'container',
                    border: false,
                    items: [{
                            xtype: 'fieldset',
                            title: 'Infos G&eacute;n&eacute;rales',
                            collapsible: true,
                            padding: '3 15 3 15',
                            defaultType: 'textfield',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Filtrer par',
                                            labelWidth: 60,
                                            flex: 1,
                                            margin: '0 5 0 0',
                                            itemId: 'modeSelection',
                                            store: store_type_filter,
                                            valueField: 'value',
                                            displayField: 'name',
                                            typeAhead: true,
                                            queryMode: 'local',
                                            emptyText: 'Filtrer par ...'

                                        },
                                        {
                                            xtype: 'datefield',
                                            fieldLabel: 'Du',
                                            labelWidth: 20,
                                            itemId: 'dtStart',
                                            flex: 0.8,
                                            submitFormat: 'Y-m-d',
                                            format: 'd/m/Y',
                                            value: new Date()



                                        },
                                        {
                                            xtype: 'datefield',
                                            fieldLabel: 'Au',
                                            margin: '0 0 0 10',
                                            itemId: 'dtEnd',
                                            emptyText: 'Date de fin',
                                            labelWidth: 20,
                                            flex: 0.8,
                                            submitFormat: 'Y-m-d',
                                            format: 'd/m/Y',
                                            value: new Date(),
                                            maxValue: new Date()

                                        },
                                        // Applique en un geste les bornes d'une garde enregistree.
                                        {xtype: 'selecteurgarde'}, {
                                            xtype: 'textfield',
                                            fieldLabel: 'Code regroupement',
                                            margin: '0 5 0 5',
                                            itemId: 'codeGroup',
                                            hidden: true,
                                            labelWidth: 120,
                                            flex: 1, enableKeyEvents: true


                                        },

                                        {
                                            xtype: 'combobox',
                                            hidden: true,
                                            fieldLabel: 'Type tiers payant',
                                            flex: 1,
                                            margin: '0 5 0 0',
                                            labelWidth: 110,
                                            itemId: 'typeTp',
                                            store: typeTp,
                                            valueField: 'value',
                                            displayField: 'name',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            emptyText: 'Sélection type tiers payant'
                                        },
                                        {
                                            xtype: 'combobox',
                                            hidden: true,
                                            fieldLabel: 'Tiers payant',
                                            flex: 1,
                                            margin: '0 5 0 0',
                                            labelWidth: 80,
                                            itemId: 'tpayant',
                                            store: tp,
                                            pageSize: 999,
                                            valueField: 'lgTIERSPAYANTID',
                                            displayField: 'strFULLNAME',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            minChars: 2,
                                            emptyText: 'Sélectionnez un tiers payant'


                                        },

                                        {
                                            xtype: 'combobox',
                                            hidden: true,
                                            fieldLabel: 'Groupes ',
                                            flex: 1,
                                            margin: '0 5 0 0',
                                            labelWidth: 60,
                                            itemId: 'groupTp',
                                            store: groupesStore,
                                            pageSize: 999,
                                            valueField: 'id',
                                            displayField: 'libelle',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            minChars: 2,
                                            emptyText: 'Sélectionnez un Groupe'
                                        },
                                        {
                                            text: 'Rechercher',
                                            itemId: 'btnSearch',
                                            xtype: 'button'


                                        }

                                    ]
                                }]
                        }
                    ]

                },
                {
                    xtype: 'fieldset',
                    title: 'Gestion des bons',
                    layout: 'card',
                    minHeight: 350,
                    itemId: 'one',
                    collapsible: false,
                    items: [
                        {
                            xtype: 'gridpanel',
                            store: store,
                            itemId: 'datacmp',
                            height: 'auto',
                            minHeight: 250,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true

                            },

                            columns:
                                    [
                                        {
                                            header: 'id',
                                            dataIndex: 'id',
                                            hidden: true
                                        },

                                        {
                                            header: 'Tiers-payant',
                                            dataIndex: 'fullName',
                                            flex: 1
                                        },
                                        {
                                            header: 'Nb dossier',
                                            dataIndex: 'nbDossier',
                                            xtype: 'numbercolumn',
                                            format: '0,000.',
                                            align: 'right',
                                            flex: 0.5
                                        },
                                        {
                                            header: 'Montant',
                                            xtype: 'numbercolumn',
                                            format: '0,000.',
                                            align: 'right',
                                            dataIndex: 'montant',
                                            flex: 1
                                        }
                                    ],
                            selModel: {
                                selType: 'rowmodel'
                            },
                            dockedItems: [{
                                    xtype: 'pagingtoolbar',
                                    store: store,
                                    pageSize: 20,
                                    dock: 'bottom',
                                    displayInfo: true

                                }]

                        },
                        {
                            xtype: 'gridpanel',
                            store: store,
                            itemId: 'dataselectmode',
                            height: 'auto',
                            minHeight: 250,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true

                            },

                            columns:
                                    [
                                        {
                                            header: 'id',
                                            dataIndex: 'id',
                                            hidden: true
                                        },

                                        {
                                            header: 'Tiers-payant',
                                            dataIndex: 'fullName',
                                            flex: 1
                                        },
                                        {
                                            header: 'Nb dossier',
                                            dataIndex: 'nbDossier',
                                            xtype: 'numbercolumn',
                                            format: '0,000.',
                                            align: 'right',
                                            flex: 0.5
                                        },
                                        {
                                            header: 'Montant',
                                            xtype: 'numbercolumn',
                                            format: '0,000.',
                                            align: 'right',
                                            dataIndex: 'montant',
                                            flex: 1
                                        }
                                    ],
                            selModel: {
                                selType: 'checkboxmodel',
                                injectCheckbox: 'last',
                                pruneRemoved: false
                            },
                            dockedItems: [{
                                    xtype: 'pagingtoolbar',
                                    store: store,
                                    pageSize: 20,
                                    dock: 'bottom',
                                    displayInfo: true

                                }]

                        },

                        {
                            xtype: 'gridpanel',
                            store: storebons,
                            itemId: 'bonscmp',
                            height: 'auto',
                            minHeight: 250,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true

                            },

                            columns:
                                    [
                                        {
                                            header: 'id',
                                            dataIndex: 'id',
                                            hidden: true
                                        },

                                        {
                                            header: 'Référence bon',
                                            dataIndex: 'fullName',
                                            flex: 1
                                        },

                                        {
                                            header: 'Montant',
                                            xtype: 'numbercolumn',
                                            format: '0,000.',
                                            align: 'right',
                                            dataIndex: 'montant',
                                            flex: 1
                                        }
                                    ],
                            selModel: {
                                selType: 'checkboxmodel',
                                injectCheckbox: 'last',
                                pruneRemoved: false

                            },
                            dockedItems: [
                                {xtype: 'toolbar',
                                    dock: 'top',
                                    items: [{
                                            xtype: 'textfield',
                                            itemId: 'query',

                                            flex: 1,
                                            emptyText: 'Rech',
                                            enableKeyEvents: true

                                        }]
                                },

                                {
                                    xtype: 'pagingtoolbar',
                                    store: storebons,
                                    pageSize: 20,
                                    dock: 'bottom',
                                    displayInfo: true

                                }]
                        }
                    ]
                }
            ]
        });
        me.callParent(arguments);
    }

});
