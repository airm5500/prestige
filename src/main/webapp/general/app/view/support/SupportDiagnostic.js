/* global Ext */

Ext.define('testextjs.view.support.SupportDiagnostic', {
    extend: 'Ext.panel.Panel',
    xtype: 'supportdiagnostic',
    frame: true,
    title: 'Centre de Support - Diagnostic & bugs',
    iconCls: 'icon-grid',
    width: '90%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        const me = this;

        const niveaux = Ext.create('Ext.data.ArrayStore', {
            data: [['TOUS'], ['INFO'], ['WARN'], ['ERROR'], ['FATAL']],
            fields: [{name: 'niveau', type: 'string'}]
        });

        const store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: [
                {name: 'id', type: 'string'},
                {name: 'createdAt', type: 'string'},
                {name: 'lastSeenAt', type: 'string'},
                {name: 'module', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'niveau', type: 'string'},
                {name: 'messageCourt', type: 'string'},
                {name: 'occurrences', type: 'number'},
                {name: 'utilisateur', type: 'string'},
                {name: 'urlOuEcran', type: 'string'},
                {name: 'payloadJson', type: 'string'},
                {name: 'logRef', type: 'string'},
                {name: 'ticketId', type: 'string'}
            ],
            autoLoad: false,
            pageSize: 20,
            proxy: {
                type: 'ajax',
                url: '../api/v1/support/events',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        Ext.applyIf(me, {
            items: [
                {
                    xtype: 'gridpanel',
                    store: store,
                    tbar: [
                        {
                            xtype: 'combobox',
                            itemId: 'comboNiveau',
                            fieldLabel: 'Niveau',
                            labelWidth: 50,
                            width: 180,
                            store: niveaux,
                            valueField: 'niveau',
                            displayField: 'niveau',
                            typeAhead: false,
                            editable: false,
                            mode: 'local',
                            value: 'TOUS'
                        },
                        {
                            xtype: 'button',
                            itemId: 'btnActualiser',
                            text: 'Actualiser'
                        }
                    ],
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {
                            xtype: 'rownumberer',
                            width: 40
                        },
                        {
                            header: '1ère apparition',
                            dataIndex: 'createdAt',
                            width: 125,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Dernière',
                            dataIndex: 'lastSeenAt',
                            width: 125,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Module',
                            dataIndex: 'module',
                            flex: 0.6,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Niveau',
                            dataIndex: 'niveau',
                            width: 70,
                            sortable: false,
                            menuDisabled: true,
                            renderer: function (value) {
                                const colors = {INFO: 'gray', WARN: 'orange', ERROR: 'red', FATAL: 'darkred'};
                                return '<span style="color:' + (colors[value] || 'black')
                                        + ';font-weight:bold;">' + value + '</span>';
                            }
                        },
                        {
                            header: 'Message',
                            dataIndex: 'messageCourt',
                            flex: 2,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Occ.',
                            dataIndex: 'occurrences',
                            width: 55,
                            align: 'center',
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Utilisateur',
                            dataIndex: 'utilisateur',
                            flex: 0.8,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Ticket',
                            dataIndex: 'ticketId',
                            width: 60,
                            align: 'center',
                            sortable: false,
                            menuDisabled: true,
                            renderer: function (value) {
                                return value ? '<span style="color:green;font-weight:bold;">&#10004;</span>' : '';
                            }
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 60,
                            sortable: false,
                            menuDisabled: true,
                            items: [
                                {
                                    icon: 'resources/images/icons/fam/page_white_edit.png',
                                    tooltip: 'Voir le détail',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('voir', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                },
                                {
                                    icon: 'resources/images/icons/fam/add.gif',
                                    tooltip: 'Créer / rattacher un ticket',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('creerticket', view, rowIndex, colIndex, item, e, record, row);
                                    }
                                }
                            ]
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
                        pageSize: 20
                    }
                }
            ]
        });
        me.callParent(arguments);
    }
});
