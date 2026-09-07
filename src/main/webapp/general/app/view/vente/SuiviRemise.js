
/* global Ext */

Ext.define('testextjs.view.vente.SuiviRemise', {
    extend: 'Ext.panel.Panel',
    xtype: 'suiviremise',
    requires: [
        'Ext.grid.plugin.RowExpander'
    ],

    frame: true,
    title: 'Liste des remises',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var store = Ext.create('Ext.data.ArrayStore', {
            data: [['VNO'], ['VO']],
            fields: [{name: 'typeVente', type: 'string'}]
        });
        var vente = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/suivi-remise/ventes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                     metaProperty: 'metaData'
                }

            }
        });
  var tierspayantss = new Ext.data.Store({
            idProperty: 'lgTIERSPAYANTID',
            fields: [
                {name: 'lgTIERSPAYANTID', type: 'string'},
                {name: 'strFULLNAME', type: 'string'}
            ],
            pageSize: null,
            autoLoad: false,
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
                            flex: 0.6,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 15,
                            flex: 0.6,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Type.vente',
                            labelWidth: 65,
                            itemId: 'typeVente',
                            store: store,
                            flex: 1,
                            valueField: 'typeVente',
                            displayField: 'typeVente',
                            typeAhead: false,
                            mode: 'local',
                            minChars: 1,
                            emptyText: 'Selectionner un type de vente'

                        }, '-',
                        
                           {
                                                    xtype: 'combobox',
                                                    margin: '0 0 5 0',
                                                    fieldLabel: 'Tiers.Payant',
                                                      labelWidth: 70,
                                                   itemId: 'tiersPayantId',
                                                    flex: 1.8,
                                                    minChars: 2,
                                                    forceSelection: true,
                                                    store: tierspayantss,
                                                    valueField: 'lgTIERSPAYANTID',
                                                    displayField: 'strFULLNAME',
                                                    typeAhead: false,
                                                    queryMode: 'remote',
                                                    emptyText: 'Choisir un tierspayant...'
                                                   
                                                }
                        
                        , '-',
                        
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            height: 30,
                            enableKeyEvents: true,
                            emptyText: 'Recherche'
                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        },
                        '-',
                        {
                            text: 'Imprimer',
                            tooltip: 'imprimer',
                            scope: this,
                            itemId: 'printPdf',
                            iconCls: 'printable'

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
                            fieldLabel: 'Montant TTC',
                            labelWidth: 80,
                            itemId: 'montantTtc',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            value: 0

                        },
                        {
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: 'Montant remise',
                            labelWidth:110,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;",
                            itemId: 'montantRemise',
                            value: 0
                        }
                       
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',

                    plugins: [{
                            ptype: 'rowexpander',
                            rowBodyTpl: new Ext.XTemplate(
                                    '<p>{details}</p>'

                                    )
                        }
                    ],
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
                            sortable: false,
                            menuDisabled: true,
                            header: 'Reference',
                            dataIndex: 'strREFTICKET',
                            flex: 1
                        },
                        
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Type Vente',
                            dataIndex: 'strTYPEVENTE',
                            flex: 1
                        },
                        
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Client',
                            dataIndex: 'clientFullName',
                            flex: 1
                        }
                      
                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Montant Vente',
                            xtype: 'numbercolumn',
                              align: 'right',
                            dataIndex: 'intPRICE',
                            flex: 1,
                            format: '0,000.'

                        }
                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Montant Remise',
                            xtype: 'numbercolumn',
                              align: 'right',
                            dataIndex: 'intPRICEREMISE',
                            flex: 1,
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
                        }
                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Caissier(e)',
                            dataIndex: 'userCaissierName',
                            flex: 0.6,
                            align: 'center'
                        }

                      

                    ],

                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: vente,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }]

        });
        me.callParent(arguments);
    }
});