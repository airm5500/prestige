/* global Ext */

Ext.define('testextjs.view.Report.peremptions.peremptionManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'peremptionquery',
    frame: true,
    title: 'Visualisation des périmés',
    width: '98%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
    layout: 'fit',
    initComponent: function () {
        const data = new Ext.data.Store({
            idProperty: 'codeCip',
            fields: [
                {name: 'codeCip', type: 'string'},
                {name: 'libelleGrossiste', type: 'string'},
                {name: 'libelleRayon', type: 'string'},
                {name: 'statut', type: 'string'},
                {name: 'quantiteLot', type: 'number'},
                {name: 'intAVOIR', type: 'number'},
                {name: 'datePerement', type: 'string'},
                {name: 'libelleFamille', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'numLot', type: 'string'},
                {name: 'valeurAchat', type: 'number'},
                {name: 'valeurVente', type: 'number'}


            ],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/fichearticle/perimes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'

                },
                timeout: 2400000
            }
        });
        const grossiste = Ext.create('Ext.data.Store', {
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
                url: '../api/v1/common/grossiste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        const rayons = Ext.create('Ext.data.Store', {
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
                url: '../api/v1/common/rayons',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        const familles = Ext.create('Ext.data.Store', {
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
                url: '../api/v1/common/famillearticles',
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
                    dock: 'top',
                    items: [

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 1,
                            labelWidth: 20,
                            format: 'd/m/Y'

                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 20,
                            flex: 1,
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'numberfield',
                            emptyText: 'Nombre de mois',
                            itemId: 'nbreMois',
                            margin: '0 10 0 0',
                            flex: 1,
                            labelWidth: 1,
//                            value: -1,
                            hideTrigger: true


                        },
                        {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            emptyText: 'Taper pour rechercher',
                            enableKeyEvents: true
                        },
                        {
                            xtype: 'tbseparator'
                        },

                        {
                            xtype: 'combobox',
                            flex: 1.2,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'rayons',
                            store: rayons,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un emplacement'
                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1.2,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'grossiste',
                            store: grossiste,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un grossiste'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1.2,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'codeFamile',
                            store: familles,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez une famille'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'rechercher',
                            flex: 0.7,
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }

                        , {
                            text: 'imprimer',
                            flex: 0.7,
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }
                    ]
                },

                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    items: [
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Stock',
                            labelWidth: 50,
                            itemId: 'stock',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'displayfield',
                            flex: 0.8,
                            fieldLabel: 'Valeur.Achat',
                            labelWidth: 80,
                            itemId: 'achat',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:red;font-weight:800;",
                            value: 0

                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Valeur.Vente',
                            labelWidth: 80,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'vente',
                            value: 0
                        }


                    ]
                }
            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: data,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [
                         {
                            header: 'Numéro lot',
                            dataIndex: 'numLot',
                            flex: 0.5
                        },
                        {
                            header: 'Code CIP',
                            dataIndex: 'codeCip',
                            flex: 0.5
                        },
                        {
                            header: 'Libellé',
                            dataIndex: 'libelle',
                            flex: 1

                        },
                        {
                            header: 'Famille',
                            dataIndex: 'libelleFamille',
                            flex: 1

                        }, {
                            header: 'Emplacement',
                            dataIndex: 'libelleRayon',
                            flex: 1

                        },
                        {
                            header: 'Grossiste',
                            dataIndex: 'libelleGrossiste',
                            flex: 1

                        },
                        {
                            header: 'Qunatité',
                            dataIndex: 'quantiteLot',
                            flex: 0.4,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }


                        }
                        , {
                            header: 'Valeur.Achat',
                            dataIndex: 'valeurAchat',
                            flex: 0.6,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }



                        },
                        {
                            header: 'Valeur.Vente',
                            dataIndex: 'valeurVente',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.6
                        },
                        {
                            header: 'Date.Péremption',
                            dataIndex: 'datePerement',
                            flex: 0.7,
                            align: 'center'
                        },
                        {
                            header: 'Statut',
                            dataIndex: 'statut',
                            flex: 1.4,
                            align: 'center',
                            renderer: function (v, m, r) {
                                const STATUS = r.data.periode;
                                switch (STATUS) {
                                    case - 1:
                                        m.style = 'background-color:#ff0000;color:#FFF;font-weight:700;';
                                        break;
                                    case 0:
                                        m.style = 'background-color:#009688;color:#FFF;font-weight:700;';
                                        break;

                                    default:
                                        m.style = 'background-color:#eb8b00;color:#FFF;font-weight:700;';
                                        break;
                                }


                                return v;
                            }
                        }

                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: data,
                        pageSize: 20,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }
            ]

        });

        me.callParent(arguments);
    }

});



