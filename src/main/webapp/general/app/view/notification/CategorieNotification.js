/* global Ext */

Ext.define('testextjs.view.notification.CategorieNotification', {
    extend: 'Ext.panel.Panel',
    xtype: 'categorieNotification',
    frame: true,
    title: 'Catégories de notification',
    iconCls: 'icon-grid',
    width: '90%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        const store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {
                            name: 'id',
                            type: 'number'
                        },
                        {
                            name: 'libelle',
                            type: 'string'
                        },
                        {
                            name: 'canal',
                            type: 'string'
                        }
                        ,
                        {
                            name: 'name',
                            type: 'string'
                        }
                    ],
            autoLoad: false,
            pageSize: 90,

            proxy: {
                type: 'ajax',
                url: '../api/v1/categorie-notifications',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }


            }
        });

        let me = this;
        Ext.applyIf(me, {

            items: [
                {
                    xtype: 'gridpanel',

                    store: store,

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
                            flex: 1.5,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Canal de communication',
                            dataIndex: 'canal',
                            flex: 0.5,
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
                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'

                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true,
                        pageSize: 90

                    }
                }]

        });
        me.callParent(arguments);
    }
});


