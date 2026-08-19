/* global Ext */

Ext.define('testextjs.view.support.SupportTickets', {
    extend: 'Ext.panel.Panel',
    xtype: 'supporttickets',
    frame: true,
    title: 'Centre de Support - Tickets support',
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

        const statuts = Ext.create('Ext.data.ArrayStore', {
            data: [['TOUS'], ['NOUVEAU'], ['OUVERT'], ['AFFECTE'], ['EN_COURS'], ['EN_ATTENTE_CLIENT'],
                ['RESOLU'], ['CLOTURE'], ['ANNULE']],
            fields: [{name: 'statut', type: 'string'}]
        });

        const store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: [
                {name: 'id', type: 'string'},
                {name: 'numero', type: 'string'},
                {name: 'createdAt', type: 'string'},
                {name: 'modifiedAt', type: 'string'},
                {name: 'sujet', type: 'string'},
                {name: 'description', type: 'string'},
                {name: 'module', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'priorite', type: 'string'},
                {name: 'statutTicket', type: 'string'},
                {name: 'affecteA', type: 'string'},
                {name: 'utilisateur', type: 'string'},
                {name: 'officine', type: 'string'},
                {name: 'applicationEventId', type: 'string'}
            ],
            autoLoad: false,
            pageSize: 20,
            proxy: {
                type: 'ajax',
                url: '../api/v1/support/tickets',
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
                            xtype: 'button',
                            itemId: 'btnNouveauTicket',
                            text: 'Nouveau ticket'
                        },
                        '-',
                        {
                            xtype: 'combobox',
                            itemId: 'comboStatut',
                            fieldLabel: 'Statut',
                            labelWidth: 45,
                            width: 210,
                            store: statuts,
                            valueField: 'statut',
                            displayField: 'statut',
                            typeAhead: false,
                            editable: false,
                            mode: 'local',
                            value: 'TOUS'
                        },
                        {
                            xtype: 'button',
                            itemId: 'btnActualiser',
                            text: 'Actualiser'
                        },
                        '->',
                        {
                            xtype: 'button',
                            itemId: 'btnImprimer',
                            text: 'Imprimer',
                            iconCls: 'icon-print'
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
                            header: 'Numéro',
                            dataIndex: 'numero',
                            width: 150,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Date',
                            dataIndex: 'createdAt',
                            width: 125,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Sujet',
                            dataIndex: 'sujet',
                            flex: 2,
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
                            header: 'Type',
                            dataIndex: 'type',
                            flex: 0.6,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Priorité',
                            dataIndex: 'priorite',
                            width: 80,
                            sortable: false,
                            menuDisabled: true,
                            renderer: function (value) {
                                const colors = {BASSE: 'gray', MOYENNE: 'black', HAUTE: 'orange', CRITIQUE: 'red'};
                                return '<span style="color:' + (colors[value] || 'black') + ';">' + value + '</span>';
                            }
                        },
                        {
                            header: 'Statut',
                            dataIndex: 'statutTicket',
                            width: 130,
                            sortable: false,
                            menuDisabled: true,
                            renderer: function (value) {
                                const colors = {
                                    NOUVEAU: 'blue',
                                    OUVERT: 'blue',
                                    AFFECTE: 'purple',
                                    EN_COURS: 'orange',
                                    EN_ATTENTE_CLIENT: 'orange',
                                    RESOLU: 'green',
                                    CLOTURE: 'gray',
                                    ANNULE: 'gray'
                                };
                                return '<span style="color:' + (colors[value] || 'black')
                                        + ';font-weight:bold;">' + value + '</span>';
                            }
                        },
                        {
                            header: 'Déclarant',
                            dataIndex: 'utilisateur',
                            flex: 0.8,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Ouvrir le ticket',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('ouvrir', view, rowIndex, colIndex, item, e, record, row);
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
                        pageSize: 20
                    }
                }
            ]
        });
        me.callParent(arguments);
    }
});
