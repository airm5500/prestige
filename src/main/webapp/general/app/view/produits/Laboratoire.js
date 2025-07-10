/* global Ext */

Ext.define('testextjs.view.produits.Laboratoire', {
    extend: 'Ext.panel.Panel',
    xtype: 'laboratoireproduits',
    frame: true,
    title: 'Laboratoire produits',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var groupeGrossiste = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {
                            name: 'id',
                            type: 'string'
                        },
                        {
                            name: 'libelle',
                            type: 'string'
                        }

                    ],
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/laboratoireproduits',
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
                            text: 'Nouveau',
                            scope: this,
                            itemId: 'addBtn',
                            iconCls: 'addicon'

                        }
                        , '-',
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            height: 30,
                            enableKeyEvents: true,
                            emptyText: 'Taper pour rechercher'
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

                    store: groupeGrossiste,

                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {xtype: 'rownumberer',
                            width: 50
                        },
                        {
                            header: 'Libellé',
                            dataIndex: 'libelle',
                            flex: 1,
                            sortable: false,
                            menuDisabled: true
                        }

                        , {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,

                            items: [{
                                    icon: 'resources/images/icons/fam/page_white_edit.png',
                                    tooltip: 'Modifier',
                                    menuDisabled: true,
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('editer', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
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
                        store: groupeGrossiste,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }]

        });
        me.callParent(arguments);
    }
});


