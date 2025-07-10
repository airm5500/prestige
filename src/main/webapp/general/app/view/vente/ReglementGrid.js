/* global Ext */

Ext.define('testextjs.view.vente.ReglementGrid', {
    extend: 'Ext.window.Window',
    xtype: 'reglementGrid',
    autoShow: false,
    height: 350,
    width: '35%',
    modal: true,
    title: 'AJOUTEZ UN AUTRE MODE DE REGLEMENT',
    iconCls: 'icon-grid',
    closeAction: 'hide',
    closable: false,
    layout: {
        type: 'fit'
    },

    initComponent: function () {
        const me = this;

        const reglementStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: [
                {name: 'id', type: 'string'},
                {name: 'libelle', type: 'string'}
            ],
            autoLoad: true,
            pageSize: 100,
            proxy: {
                type: 'ajax',
                url: '../api/v1/type-reglements/list/sans-espece',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });


        Ext.applyIf(me, {
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
                            xtype: 'button',
                            itemId: 'btnCancelModeReglement',
                            text: 'Annuler'
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: reglementStore,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 50,
                              align: 'left', 
                            sortable: true
                        }, {
                            text: '#',
                            width: 60,
                            align: 'left',
                            dataIndex: 'id',
                            hidden: true

                        },
                        {
                            text: 'Mode reglement',
                            flex: 1,
                            dataIndex: 'libelle'
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 60,
                            align: 'center',
                            sortable: false,
                            menuDisabled: true,
                            items: [
                                {
                                    icon: 'resources/images/icons/add16.gif',
                                    tooltip: 'Ajouter',
                                    scope: this

                                }]
                        }],
                    selModel: {
                        selType: 'rowmodel',
                        mode: 'SINGLE'
                    }

                }]

        });
        me.callParent(arguments);
    }
});


