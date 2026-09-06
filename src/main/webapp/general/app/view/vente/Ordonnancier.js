/* global Ext */

Ext.define('testextjs.view.vente.Ordonnancier', {
    extend: 'Ext.panel.Panel',
    xtype: 'ordonnancier',
    requires: [
        'testextjs.view.vente.DetailProduitsVente'
    ],

    frame: true,
    title: 'Liste des Ventes',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var store = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.MedecinModel',
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/medecin/medecins',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });
        var vente = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 99999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/ventesordonnanciers',
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
                    dock: 'top',
                    items: [

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
//                            height: 30,
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
//                            height: 30,
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }
                        , '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Medecins',
                            labelWidth: 65,
                            itemId: 'medecin',
                            store: store,
                            flex: 1,
                            valueField: 'id',
                            displayField: 'nom',
                            typeAhead: false,
                            mode: 'local',
                            minChars: 1,
                            emptyText: 'Selectionner un medecin'

                        }, '-',
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            enableKeyEvents: true,
                            emptyText: 'Nom du client ou r&eacute;f&eacute;rence...'
                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-',
                        {
                            text: 'Imprimer',
                            tooltip: 'Editer le registre affich&eacute;, une ligne par produit d&eacute;livr&eacute;',
                            itemId: 'imprimer',
                            iconCls: 'printable'
                        }, '-',
                        {
                            text: 'Exporter',
                            tooltip: 'Exporter le registre affich&eacute; au format Excel',
                            itemId: 'exporter',
                            iconCls: 'export_excel_icon'
                        }, '-',
                        {
                            text: 'Cr&eacute;er inventaire',
                            tooltip: 'Cr&eacute;er un inventaire des produits d&eacute;livr&eacute;s sur la '
                                    + 'p&eacute;riode affich&eacute;e',
                            itemId: 'inventaire',
                            iconCls: 'addicon'
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: vente,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        animCollapse: false,
                        hideable: false,
                        draggable: false
                    },
                    columns: [
                        {
                            // Les produits ne descendent PAS avec la liste : ce bouton va les
                            // chercher pour la seule vente choisie. Un (+) sur chaque ligne
                            // obligerait a les transporter tous, pour ceux qu'on n'ouvre jamais.
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Voir le d&eacute;tail des produits',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('voirDetail', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }]
                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Reference',
                            dataIndex: 'strREF',
                            flex: 0.8
                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Type.Vente',
                            dataIndex: 'strTYPEVENTE',
                            align: 'center',
                            flex: 0.4
                        }

                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Montant',
                            xtype: 'numbercolumn',
                            dataIndex: 'intPRICE',
                            align: 'right',
                            flex: 0.6,
                            format: '0,000.'

                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Montant différé',
                            xtype: 'numbercolumn',
//                            hidden:true,
                            dataIndex: 'intPRICERESTE',
                            align: 'right',
                            flex: 0.6,
                            format: '0,000.'

                        },

                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Date',
                            dataIndex: 'dtUPDATED',
                            flex: 0.6,
                            align: 'center'
                        }, {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 0.6,
                            align: 'center'
                        }, {
                            // Le registre repond a « qui a recu quoi, prescrit par qui ». Le nom du
                            // patient en etait absent : il fallait ouvrir chaque vente pour le voir.
                            sortable: false,
                            menuDisabled: true,
                            header: 'Client',
                            dataIndex: 'clientFullName',
                            flex: 1
                        }, {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Medecin',
                            dataIndex: 'nom',
                            flex: 1
                        }, {
                            sortable: false,
                            menuDisabled: true,
                            header: 'N&deg; ordre',
                            dataIndex: 'numOrder',
                            align: 'center',
                            flex: 0.5
                        }

                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Vendeur',
                            dataIndex: 'userVendeurName',
                            flex: 1
                        },

                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Caissier',
                            dataIndex: 'userCaissierName',
                            flex: 1
                        }

                    ],

                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: vente,
                        pageSize: 99999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }]

        });
        me.callParent(arguments);
    }
});


