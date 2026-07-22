/* global Ext */

Ext.define('testextjs.view.support.SupportHistorique', {
    extend: 'Ext.panel.Panel',
    xtype: 'supporthistorique',
    frame: true,
    title: 'Centre de Support - Historique',
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

        const storeDemandes = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: ['id', 'createdAt', 'objet', 'moduleConcerne', 'urgence', 'statutEnvoi', 'creePar'],
            autoLoad: true,
            pageSize: 20,
            proxy: {
                type: 'ajax',
                url: '../api/v1/support/demandes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        const storeEvents = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: ['id', 'createdAt', 'lastSeenAt', 'module', 'niveau', 'messageCourt',
                {name: 'occurrences', type: 'number'}, 'utilisateur', 'ticketId'],
            autoLoad: true,
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

        const storeTickets = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: ['id', 'numero', 'createdAt', 'modifiedAt', 'sujet', 'module', 'priorite',
                'statutTicket', 'utilisateur'],
            autoLoad: true,
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
                    xtype: 'tabpanel',
                    activeTab: 0,
                    items: [
                        {
                            xtype: 'gridpanel',
                            title: 'Demandes envoyées',
                            store: storeDemandes,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                            },
                            columns: [
                                {xtype: 'rownumberer', width: 40},
                                {header: 'Date', dataIndex: 'createdAt', width: 130, sortable: false, menuDisabled: true},
                                {header: 'Objet', dataIndex: 'objet', flex: 2, sortable: false, menuDisabled: true},
                                {header: 'Module', dataIndex: 'moduleConcerne', flex: 0.7, sortable: false, menuDisabled: true},
                                {header: 'Urgence', dataIndex: 'urgence', width: 90, sortable: false, menuDisabled: true},
                                {header: 'Statut envoi', dataIndex: 'statutEnvoi', width: 100, sortable: false, menuDisabled: true},
                                {header: 'Utilisateur', dataIndex: 'creePar', flex: 1, sortable: false, menuDisabled: true}
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeDemandes,
                                displayInfo: true,
                                pageSize: 20
                            }
                        },
                        {
                            xtype: 'gridpanel',
                            title: 'Événements capturés',
                            store: storeEvents,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                            },
                            columns: [
                                {xtype: 'rownumberer', width: 40},
                                {header: '1ère apparition', dataIndex: 'createdAt', width: 125, sortable: false, menuDisabled: true},
                                {header: 'Dernière', dataIndex: 'lastSeenAt', width: 125, sortable: false, menuDisabled: true},
                                {header: 'Module', dataIndex: 'module', flex: 0.7, sortable: false, menuDisabled: true},
                                {header: 'Niveau', dataIndex: 'niveau', width: 70, sortable: false, menuDisabled: true},
                                {header: 'Message', dataIndex: 'messageCourt', flex: 2, sortable: false, menuDisabled: true},
                                {header: 'Occ.', dataIndex: 'occurrences', width: 55, align: 'center', sortable: false, menuDisabled: true},
                                {header: 'Utilisateur', dataIndex: 'utilisateur', flex: 1, sortable: false, menuDisabled: true}
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeEvents,
                                displayInfo: true,
                                pageSize: 20
                            }
                        },
                        {
                            xtype: 'gridpanel',
                            title: 'Tickets',
                            store: storeTickets,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                            },
                            columns: [
                                {xtype: 'rownumberer', width: 40},
                                {header: 'Numéro', dataIndex: 'numero', width: 150, sortable: false, menuDisabled: true},
                                {header: 'Créé le', dataIndex: 'createdAt', width: 125, sortable: false, menuDisabled: true},
                                {header: 'Mis à jour', dataIndex: 'modifiedAt', width: 125, sortable: false, menuDisabled: true},
                                {header: 'Sujet', dataIndex: 'sujet', flex: 2, sortable: false, menuDisabled: true},
                                {header: 'Module', dataIndex: 'module', flex: 0.7, sortable: false, menuDisabled: true},
                                {header: 'Priorité', dataIndex: 'priorite', width: 85, sortable: false, menuDisabled: true},
                                {header: 'Statut', dataIndex: 'statutTicket', width: 130, sortable: false, menuDisabled: true},
                                {header: 'Déclarant', dataIndex: 'utilisateur', flex: 1, sortable: false, menuDisabled: true}
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeTickets,
                                displayInfo: true,
                                pageSize: 20
                            }
                        }
                    ]
                }
            ]
        });
        me.callParent(arguments);
    }
});
