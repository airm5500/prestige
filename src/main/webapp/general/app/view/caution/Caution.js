/* global Ext */

Ext.define('testextjs.view.caution.Caution', {
    extend: 'Ext.panel.Panel',
    xtype: 'cautiontierspayant',
    frame: true,
    title: 'Gestion de cautions carnet',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
 
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        const tierspayants = Ext.create('Ext.data.Store', {
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
            pageSize: 999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/tiers-payants/carnet',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        const cautions = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {
                            name: 'id',
                            type: 'string'
                        },
                        {
                            name: 'tiersPayantName',
                            type: 'string'
                        },
                        {
                            name: 'updatedAt',
                            type: 'string'
                        },
                        {
                            name: 'mvtDate',
                            type: 'string'
                        }
                        ,
                        {
                            name: 'user',
                            type: 'string'
                        }
                        ,
                        {
                            name: 'conso',
                            type: 'int'
                        }
                        ,
                        {
                            name: 'montant',
                            type: 'int'
                        },
                        {
                            name: 'cautionHistoriques',
                            type: 'auto'
                        }
                    ],
            autoLoad: false,
            pageSize: 20,

            proxy: {
                type: 'ajax',
                url: '../api/v1/cautions',
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
                            text: 'Ajouter',
                            scope: this,
                            itemId: 'addBtn',
                            iconCls: 'addicon'

                        }
                        , '-',
                        {
                            xtype: 'combobox',
                            itemId: 'tiersPayantId',
                            flex: 2,
                            store: tierspayants,
                            pageSize: 999,
                            valueField: 'lgTIERSPAYANTID',
                            displayField: 'strFULLNAME',
                            minChars: 2,
                            queryMode: 'remote',
                            enableKeyEvents: true,
                            emptyText: 'Selectionner tiers payant...'
                                 
                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',

                    store: cautions,

                    columns: [
                        {xtype: 'rownumberer',
                            width: 50
                        },
                        {
                            header: 'Tiers-payant',
                            dataIndex: 'tiersPayantName',
                            flex: 1
                           
                        },
                        {
                            header: 'Solde',
                            dataIndex: 'montant',
                            flex: 1,
                            xtype: 'numbercolumn',
                            align: 'right',
                            format: '0,000.'
                            
                        },
                        {
                            header: 'Achat',
                            dataIndex: 'conso',
                            xtype: 'numbercolumn',
                            align: 'right',
                            format: '0,000.',
                            flex: 1
                           
                        }, {
                            header: 'Date de modification',
                            dataIndex: 'mvtDate',
                            flex: 1
                           
                        }
                        , {
                            header: 'Modifié par',
                            dataIndex: 'user',
                            flex: 1
                            
                        },
                         {
                            xtype: 'actioncolumn',
                            width: 30,
                        
                            items: [{
                                    icon: 'resources/images/icons/fam/text_list_bullets.png',
                                    tooltip: 'Voir Dépôts',
                                     handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                     this.fireEvent('fetchDepots', view, rowIndex, colIndex, item, e, record, row);
                                     }

                                }]
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                        
                            items: [{
                                    icon: 'resources/images/icons/fam/table_refresh.png',
                                    tooltip: 'Voir Achats',
                                     handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                     this.fireEvent('fetchVentes', view, rowIndex, colIndex, item, e, record, row);
                                     }

                                }]
                        }
                        , {
                            xtype: 'actioncolumn',
                            width: 30,
                          

                            items: [{
                                    icon: 'resources/images/icons/fam/add.png',
                                    tooltip: 'Ajouter',
                                
                                   handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                          this.fireEvent('editer', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },
                       
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                        
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Supprimer',
                                     handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                     this.fireEvent('remove', view, rowIndex, colIndex, item, e, record, row);
                                     }

                                }]
                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'

                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: cautions,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }
            ]

        });
        me.callParent(arguments);
    }
});


