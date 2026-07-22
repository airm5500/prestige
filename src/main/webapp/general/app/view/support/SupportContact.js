/* global Ext */

Ext.define('testextjs.view.support.SupportContact', {
    extend: 'Ext.panel.Panel',
    xtype: 'supportcontact',
    frame: true,
    title: 'Centre de Support - Me contacter',
    iconCls: 'icon-grid',
    width: '90%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    initComponent: function () {
        const me = this;

        const modules = Ext.create('Ext.data.ArrayStore', {
            data: [['VENTE'], ['CAISSE'], ['STOCK'], ['COMMANDES'], ['INVENTAIRE'], ['STATISTIQUES'],
                ['IMPRESSION'], ['TIERS-PAYANT'], ['AUTRE']],
            fields: [{name: 'module', type: 'string'}]
        });

        const urgences = Ext.create('Ext.data.ArrayStore', {
            data: [['BASSE'], ['MOYENNE'], ['HAUTE'], ['CRITIQUE']],
            fields: [{name: 'urgence', type: 'string'}]
        });

        const store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: [
                {name: 'id', type: 'string'},
                {name: 'createdAt', type: 'string'},
                {name: 'objet', type: 'string'},
                {name: 'message', type: 'string'},
                {name: 'moduleConcerne', type: 'string'},
                {name: 'urgence', type: 'string'},
                {name: 'statutEnvoi', type: 'string'},
                {name: 'erreurEnvoi', type: 'string'},
                {name: 'piecesJointes', type: 'string'},
                {name: 'creePar', type: 'string'}
            ],
            autoLoad: false,
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

        Ext.applyIf(me, {
            items: [
                {
                    xtype: 'form',
                    bodyPadding: 10,
                    items: [
                        {
                            xtype: 'fieldset',
                            collapsible: false,
                            bodyPadding: 10,
                            title: '<span style="color:blue;">Contacter le support</span>',
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'container',
                                    layout: {
                                        type: 'hbox',
                                        align: 'stretch'
                                    },
                                    defaults: {
                                        flex: 1
                                    },
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Module concerné',
                                            labelWidth: 110,
                                            name: 'moduleConcerne',
                                            store: modules,
                                            valueField: 'module',
                                            displayField: 'module',
                                            typeAhead: false,
                                            editable: false,
                                            mode: 'local',
                                            value: 'AUTRE',
                                            margin: '0 10 5 0'
                                        },
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Urgence',
                                            labelWidth: 110,
                                            name: 'urgence',
                                            store: urgences,
                                            valueField: 'urgence',
                                            displayField: 'urgence',
                                            typeAhead: false,
                                            editable: false,
                                            mode: 'local',
                                            value: 'MOYENNE',
                                            margin: '0 0 5 0'
                                        }
                                    ]
                                },
                                {
                                    xtype: 'textfield',
                                    fieldLabel: 'Objet',
                                    labelWidth: 110,
                                    name: 'objet',
                                    allowBlank: false,
                                    maxLength: 255,
                                    margin: '0 0 5 0'
                                },
                                {
                                    xtype: 'textareafield',
                                    fieldLabel: 'Message',
                                    labelWidth: 110,
                                    name: 'message',
                                    allowBlank: false,
                                    maxLength: 4000,
                                    height: 90,
                                    margin: '0 0 5 0'
                                },
                                {
                                    xtype: 'container',
                                    layout: {
                                        type: 'hbox',
                                        align: 'stretch'
                                    },
                                    defaults: {
                                        flex: 1
                                    },
                                    items: [
                                        {
                                            xtype: 'filefield',
                                            fieldLabel: 'Pièce jointe 1',
                                            labelWidth: 110,
                                            name: 'pieceJointe1',
                                            buttonText: 'Parcourir...',
                                            margin: '0 10 0 0'
                                        },
                                        {
                                            xtype: 'filefield',
                                            fieldLabel: 'Pièce jointe 2',
                                            labelWidth: 110,
                                            name: 'pieceJointe2',
                                            buttonText: 'Parcourir...'
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
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
                                    itemId: 'btnReinit',
                                    text: 'Réinitialiser'
                                },
                                {
                                    xtype: 'button',
                                    itemId: 'btnEnvoyer',
                                    text: 'Envoyer au support'
                                }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'gridpanel',
                    height: 320,
                    title: 'Mes demandes',
                    store: store,
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
                            header: 'Date',
                            dataIndex: 'createdAt',
                            width: 130,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Objet',
                            dataIndex: 'objet',
                            flex: 1.5,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Module',
                            dataIndex: 'moduleConcerne',
                            flex: 0.6,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Urgence',
                            dataIndex: 'urgence',
                            flex: 0.5,
                            sortable: false,
                            menuDisabled: true
                        },
                        {
                            header: 'Statut envoi',
                            dataIndex: 'statutEnvoi',
                            flex: 0.6,
                            sortable: false,
                            menuDisabled: true,
                            renderer: function (value) {
                                if (value === 'ENVOYEE') {
                                    return '<span style="color:green;font-weight:bold;">Envoyée</span>';
                                }
                                if (value === 'ECHOUEE') {
                                    return '<span style="color:red;font-weight:bold;">Échouée</span>';
                                }
                                return '<span style="color:orange;font-weight:bold;">En cours</span>';
                            }
                        },
                        {
                            header: 'Utilisateur',
                            dataIndex: 'creePar',
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
                                    icon: 'resources/images/icons/fam/page_white_edit.png',
                                    tooltip: 'Voir le détail',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('voir', view, rowIndex, colIndex, item, e, record, row);
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
