/* global Ext */

Ext.define('testextjs.view.caisseManager.GestionCaisse', {
    extend: 'Ext.panel.Panel',
    xtype: 'gestcaissemanager',
    frame: true,
    title: 'Gestion Caisse',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 20,
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
        var caisses = Ext.create('Ext.data.Store', {
            fields:
                    [

                        {name: 'ldCAISSEID',
                            type: 'string'

                        },
                        {name: 'dtCREATED',
                            type: 'string'

                        },
                        {name: 'dtUPDATED',
                            type: 'string'

                        },
                        {name: 'strSTATUT',
                            type: 'string'

                        },
                        {name: 'userFullName',
                            type: 'string'

                        },
                        {name: 'cancel',
                            type: 'boolean'

                        },
                        {name: 'intSOLDEMATIN',
                            type: 'number'

                        },
                        {name: 'intSOLDESOIR',
                            type: 'number'

                        },
                        {name: 'billetage',
                            type: 'number'

                        },
                        {name: 'ecart',
                            type: 'number'

                        },
                        {name: 'montantAnnule',
                            type: 'number'

                        },
                        {name: 'soldeTotal',
                            type: 'number'

                        },
                        {name: 'statut',
                            type: 'string'

                        },
                        {name: 'montantMobile',
                            type: 'number'

                        },
                        {name: 'ligneResumeCaisses',
                            type: 'auto'

                        }
                        ,
                        {name: 'ligneReglements',
                            type: 'auto'

                        }


                    ],
            autoLoad: false,
            pageSize: 16,

            proxy: {
                type: 'ajax',
                url: '../api/v1/caisse/resumecaisse',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 2400000

            }
        });

        var me = this;
        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y'

                        }, '-', {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        },
                        '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Utilisateur',
                            itemId: 'user',
                            store: storeUser,
                            pageSize: 10,
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            typeAhead: false,
                            flex: 2,
                            minChars: 2,
                            labelWidth: 60,
                            queryMode: 'remote',
                            emptyText: 'Choisir un utilisateur...'

                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-', {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: caisses,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        collapsible: true,
                        enableColumnHide: false,
                        animCollapse: false
                    },
                    columns: [

                        {
                            header: 'Nom.Prenom Caissier',
                            dataIndex: 'userFullName',
                            flex: 1.2,
                            sortable: false,
                            menuDisabled: true
                        }, {
                            header: 'Fond De Caisse',
                            dataIndex: 'intSOLDEMATIN',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            flex: 0.8,
                            align: 'right',
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Recette',
                            dataIndex: 'intSOLDESOIR',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            flex: 0.8,
                            align: 'right',
                            sortable: false,
                            menuDisabled: true
                        }, {
                            header: 'Montant mobile',
                            dataIndex: 'montantMobile',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            flex: 0.8,
                            align: 'right',
                            sortable: false,
                            menuDisabled: true
                        },

                        {
                            header: 'Total Caisse',
                            dataIndex: 'soldeTotal',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.8,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Mt Billetage',
                            dataIndex: 'billetage',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.8,
                            sortable: false,
                            menuDisabled: true
                        },

                        {
                            header: 'Mt Ecart',
                            dataIndex: 'ecart',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.7,
                            sortable: false,
                            menuDisabled: true,
                            renderer: function (value, metadata, record) {
                                if (record.get('ecart') < 0) {
                                    return '<span style="color: red;">' + Ext.util.Format.number(value, '0,000.') + '</span>';
                                } else if (record.get('ecart') > 0) {
                                    return '<span style="color: green;">' + Ext.util.Format.number(value, '0,000.') + '</span>';
                                } else {
                                    return value;
                                }
                            }
                        }, {
                            header: 'Montant Annulé',
                            dataIndex: 'montantAnnule',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            flex: 0.8,
                            align: 'right',
                            sortable: false,
                            menuDisabled: true
                                    /* renderer: function (value, metadata, record) {
                                     return '<span style="color: red;">' + value + '</span>';
                                     
                                     }*/
                        },

                        {
                            header: 'Date Ouverture',
                            dataIndex: 'dtCREATED',
                            sortable: false,
                            menuDisabled: true,
                            flex: 1,
                            align: 'center'
                        }, {
                            header: 'Date Fermeture',
                            dataIndex: 'dtUPDATED',
                            sortable: false,
                            menuDisabled: true,
                            flex: 1,
                            align: 'center'
                        },
                        {
                            header: 'Statut',
                            dataIndex: 'strSTATUT',
                            flex: 1.2

                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/grid.png',
                                    tooltip: 'Détail Règlement',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('showReglment', view, rowIndex, colIndex, item, e, record, row);
                                    },

                                    getClass: function (value, metadata, record) {

                                        if (record.get('ligneResumeCaisses').length > 0 || record.get('ligneReglements').length) {  //read your condition from the record
                                            return 'x-display-hide'; //affiche l'icone
                                        } else {
                                            return 'x-hide-display'; //cache l'icone
                                        }
                                    }
                                }]

                        }

                        ,
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/book.png',
                                    tooltip: 'Valider la cloture',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('valider', view, rowIndex, colIndex, item, e, record, row);
                                    },

                                    getClass: function (value, metadata, record) {
                                        if (record.get('statut') == "is_Using" || record.get('statut') == "is_Process") {  //read your condition from the record
                                            return 'x-display-hide'; //affiche l'icone
                                        } else {
                                            return 'x-hide-display'; //cache l'icone
                                        }
                                    }
                                }]

                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Imprimer le billetage de cette caisse',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('toprint', view, rowIndex, colIndex, item, e, record, row);
                                    },
                                    getClass: function (value, metadata, record) {
                                        if (record.get('statut') == "is_Process") {  //read your condition from the record
                                            return 'x-display-hide'; //affiche l'icone
                                        } else {
                                            return 'x-hide-display'; //cache l'icone
                                        }
                                    }

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.gif',
                                    tooltip: 'Annuler la cl&ocirc;ture de cette caisse',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('annuler', view, rowIndex, colIndex, item, e, record, row);
                                    },
                                    getClass: function (value, metadata, record) {
                                        if (!record.get('cancel')) {
                                            return 'x-hide-display';
                                        } else {
                                            if (record.get('statut') == "is_Process") {  //read your condition from the record
                                                return 'x-display-hide'; //affiche l'icone
                                            } else {
                                                return 'x-hide-display'; //cache l'icone
                                            }
                                        }


                                    }
                                }]
                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'

                    },
                    bbar: {
                        xtype: 'toolbar',
                        dock: 'bottom',
                        items: [{
                                xtype: 'pagingtoolbar',
                                store: caisses,
                                dock: 'bottom',
                                pageSize: 16,
                                flex: 1.3,
                                displayInfo: true
                            }
                            , {
                                xtype: 'tbseparator'
                            },
                            {
                                xtype: 'displayfield',
                                //allowBlank: false,
                                flex: 0.7,
                                fieldLabel: 'Total global caisse::',
                                labelWidth: 150,
                                itemId: 'totalAmount',
                                renderer: function (v) {
                                    return Ext.util.Format.number(v, '0,000.');
                                },
                                fieldStyle: "color:blue;",
                                value: 0
                            }
                        ]


                    }
                }]

        });
        me.callParent(arguments);
    }
});


