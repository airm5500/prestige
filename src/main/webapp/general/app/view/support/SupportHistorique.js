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

        // Recapitulatif analytique : anomalies groupees par module + type + niveau,
        // triees par total d'occurrences decroissant (tri effectue cote serveur).
        const storeRecap = Ext.create('Ext.data.Store', {
            fields: ['module', 'type', 'niveau',
                {name: 'nbAnomalies', type: 'number'},
                {name: 'totalOccurrences', type: 'number'},
                'derniereApparition'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/support/events/recap',
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

        /* Point 2 : chaque onglet de l'historique porte son export Excel. L'export reprend les
           criteres de l'onglet et TOUT son resultat, alors que la grille reste paginee. */
        const boutonExcel = function (lien) {
            return {
                xtype: 'button',
                text: 'Excel',
                itemId: 'btnExcel',
                icon: 'resources/images/icons/fam/excel_icon.png',
                tooltip: 'Exporter le r&eacute;sultat complet vers Excel',
                handler: function (btn) {
                    window.location = lien(btn);
                }
            };
        };

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
                            tbar: [boutonExcel(function () {
                                    return '../api/v1/support/demandes/export/excel';
                                })],
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
                            tbar: [boutonExcel(function () {
                                    const p = storeEvents.getProxy().extraParams || {};
                                    return '../api/v1/support/events/export/liste?'
                                            + Ext.Object.toQueryString({
                                                niveau: p.niveau || '',
                                                query: p.query || ''
                                            });
                                })],
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
                            tbar: [boutonExcel(function () {
                                    const p = storeTickets.getProxy().extraParams || {};
                                    return '../api/v1/support/tickets/export/excel?'
                                            + Ext.Object.toQueryString({statut: p.statut || ''});
                                })],
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
                        },
                        {
                            xtype: 'gridpanel',
                            title: 'Récap',
                            store: storeRecap,
                            tbar: [
                                {
                                    xtype: 'datefield',
                                    itemId: 'recapDtStart',
                                    fieldLabel: 'Du',
                                    labelWidth: 25,
                                    width: 165,
                                    format: 'd/m/Y'
                                },
                                {
                                    xtype: 'datefield',
                                    itemId: 'recapDtEnd',
                                    fieldLabel: 'Au',
                                    labelWidth: 25,
                                    width: 165,
                                    format: 'd/m/Y'
                                },
                                {
                                    xtype: 'button',
                                    text: 'Actualiser',
                                    handler: function (btn) {
                                        const tab = btn.up('gridpanel');
                                        const dtStart = tab.down('#recapDtStart').getValue();
                                        const dtEnd = tab.down('#recapDtEnd').getValue();
                                        storeRecap.getProxy().extraParams.dtStart = dtStart ? Ext.Date.format(dtStart, 'Y-m-d') : '';
                                        storeRecap.getProxy().extraParams.dtEnd = dtEnd ? Ext.Date.format(dtEnd, 'Y-m-d') : '';
                                        storeRecap.load();
                                    }
                                },
                                boutonExcel(function () {
                                    const p = storeRecap.getProxy().extraParams || {};
                                    return '../api/v1/support/events/recap/export/excel?'
                                            + Ext.Object.toQueryString({
                                                dtStart: p.dtStart || '',
                                                dtEnd: p.dtEnd || ''
                                            });
                                })
                            ],
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                            },
                            columns: [
                                {xtype: 'rownumberer', width: 40},
                                {header: 'Module', dataIndex: 'module', flex: 1.2, sortable: true, menuDisabled: true},
                                {header: 'Type', dataIndex: 'type', flex: 0.8, sortable: true, menuDisabled: true},
                                {
                                    header: 'Niveau',
                                    dataIndex: 'niveau',
                                    width: 80,
                                    sortable: true,
                                    menuDisabled: true,
                                    renderer: function (value) {
                                        const colors = {INFO: 'gray', WARN: 'orange', ERROR: 'red', FATAL: 'darkred'};
                                        return '<span style="color:' + (colors[value] || 'black')
                                                + ';font-weight:bold;">' + value + '</span>';
                                    }
                                },
                                {
                                    header: 'Anomalies distinctes',
                                    dataIndex: 'nbAnomalies',
                                    width: 130,
                                    align: 'center',
                                    sortable: true,
                                    menuDisabled: true
                                },
                                {
                                    header: 'Total occurrences',
                                    dataIndex: 'totalOccurrences',
                                    width: 125,
                                    align: 'center',
                                    sortable: true,
                                    menuDisabled: true,
                                    renderer: function (value) {
                                        return '<b>' + value + '</b>';
                                    }
                                },
                                {header: 'Dernière apparition', dataIndex: 'derniereApparition', width: 135, sortable: true, menuDisabled: true}
                            ]
                        }
                    ]
                }
            ]
        });
        me.callParent(arguments);
    }
});
