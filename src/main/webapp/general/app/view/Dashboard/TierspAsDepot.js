/* global Ext */

Ext.define('testextjs.view.Dashboard.TierspAsDepot', {
      extend: 'Ext.panel.Panel',
    xtype: 'tierpayantasdepot',
    frame: false,
    width: '97%',
  height: 'auto',
    minHeight: 570,
    fullscreen: true,
  
    initComponent: function () {
        var tierspayantCarnet = new Ext.data.Store({
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
                },

                {
                    name: 'depot',
                    type: 'boolean'
                },
                {
                    name: 'toBeExclude',
                    type: 'boolean'
                }

            ],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v2/carnet-depot/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }
        });
       
        var me = this;
        Ext.applyIf(me, {
            items: [
                {
                    xtype: 'gridpanel',
                    title: 'Dépôts carnet',
                    border: false,
                    store: tierspayantCarnet,
                    itemId: 'carnetGrid',
                    columns:
                            [
                                {
                                    header: 'id',
                                    dataIndex: 'id',
                                    hidden: true
                                },

                                {
                                    header: 'Code',
                                    dataIndex: 'code',
                                      hidden: true,
                                    flex: 0.2
                                },

                                {
                                    header: 'Nom',
                                    dataIndex: 'nom',
                                    flex: 1
                                },
                                {
                                    header: 'Nom Complet',
                                    dataIndex: 'nomComplet',
                                    flex: 1
                                }, {
                                    header: 'Solde',
                                    dataIndex: 'account',
                                    align: 'right',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    flex: 0.5
                                },
                                {
                                    header: 'gerer comme dépôt ?',
                                    dataIndex: 'depot',
                                    flex: 0.7,
                                    renderer: function (v, m, r) {
                                        if (v) {
                                            m.style = 'background-color:green;color:#FFF;font-weight:700;';
                                            return 'Oui';
                                        } else {
                                            return 'Non';
                                        }

                                    }
                                },

                                {
                                    xtype: 'checkcolumn',
                                    dataIndex: 'depot',
                                    width: 50
                                },
                                
                                {
                                    header: 'exclure du CA ?',
                                    dataIndex: 'toBeExclude',
                                    flex: 0.7,
                                    renderer: function (v, m, r) {
                                        if (v) {
                                            m.style = 'background-color:blue;color:#FFF;font-weight:700;';
                                            return 'Oui';
                                        } else {
                                            return 'Non';
                                        }

                                    }
                                },

                                {
                                    xtype: 'checkcolumn',
                                    dataIndex: 'toBeExclude',
                                    width: 50
                                }
                            ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    dockedItems: [
                        {xtype: 'toolbar',
                            dock: 'top',
                            items: [{
                                    xtype: 'textfield',
                                    itemId: 'queryCarnet',
                                    width: 350,
                                    emptyText: 'Rech',
                                    enableKeyEvents: true

                                }, {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    itemId: 'rechercherCarnet',
                                    scope: this,
                                    iconCls: 'searchicon'
                                }]
                        },
                        {
                            xtype: 'pagingtoolbar',
                            store: tierspayantCarnet,
                            pageSize: 20,
                            dock: 'bottom',
                            displayInfo: true

                        }]
                }
           
            ]
        });
        me.callParent(arguments);
    }
});
