/* global Ext */

Ext.define('testextjs.view.notification.SmsFournisseur', {
    extend: 'Ext.panel.Panel',
    xtype: 'smsfournisseur',
    frame: true,
    title: 'Fournisseurs SMS',
    iconCls: 'icon-grid',
    width: '80%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    /** Store d'un onglet : mêmes champs, seul le filtre actif/désactivé change. */
    buildStore: function (actif) {
        return Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: [
                {name: 'id', type: 'string'},
                {name: 'code', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'actif', type: 'boolean'},
                {name: 'enVigueur', type: 'boolean'},
                {name: 'dlrMode', type: 'string'},
                {name: 'dlrCallbackUrl', type: 'string'},
                {name: 'configComplete', type: 'boolean'},
                {name: 'params'}
            ],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/sms-fournisseurs',
                extraParams: {
                    actif: actif
                },
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
    },
    /** Colonnes communes aux deux onglets. */
    buildCommonColumns: function () {
        return [
            {
                xtype: 'rownumberer',
                width: 40
            },
            {
                header: 'Code',
                dataIndex: 'code',
                width: 90,
                sortable: false,
                menuDisabled: true
            },
            {
                header: 'Libellé',
                dataIndex: 'libelle',
                flex: 1,
                sortable: false,
                menuDisabled: true
            },
            {
                header: 'Suivi DLR',
                dataIndex: 'dlrMode',
                width: 110,
                align: 'center',
                sortable: false,
                menuDisabled: true,
                renderer: function (value) {
                    return value === 'CALLBACK' ? 'Callback' : 'Interrogation';
                }
            },
            {
                header: 'Configuration',
                dataIndex: 'configComplete',
                width: 110,
                align: 'center',
                sortable: false,
                menuDisabled: true,
                renderer: function (value) {
                    return value
                            ? '<span style="color:green;">Compl&egrave;te</span>'
                            : '<span style="color:#e69500;">Incompl&egrave;te</span>';
                }
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        icon: 'resources/images/icons/fam/page_white_edit.png',
                        tooltip: 'Voir / modifier',
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
                        icon: 'resources/images/icons/fam/connect.png',
                        tooltip: 'Tester la connexion (solde)',
                        handler: function (view, rowIndex, colIndex, item, e, record, row) {
                            this.fireEvent('tester', view, rowIndex, colIndex, item, e, record, row);
                        }
                    }]
            }
        ];
    },
    initComponent: function () {
        let me = this;

        const colonnesActifs = me.buildCommonColumns();
        // Après "Libellé" : badge en vigueur (position 3, après rownumberer/code/libellé)
        colonnesActifs.splice(3, 0, {
            header: 'En vigueur',
            dataIndex: 'enVigueur',
            width: 100,
            align: 'center',
            sortable: false,
            menuDisabled: true,
            renderer: function (value) {
                return value
                        ? '<span style="color:#ffffff;background-color:#5cb85c;border-radius:8px;padding:2px 8px;font-weight:bold;">En vigueur</span>'
                        : '';
            }
        });
        // Interrupteur de désactivation + action "définir en vigueur"
        colonnesActifs.push(
                {
                    header: 'Actif',
                    itemId: 'actifSwitchColumn',
                    dataIndex: 'actif',
                    width: 70,
                    sortable: false,
                    menuDisabled: true,
                    align: 'center',
                    renderer: function (value, meta) {
                        meta.tdAttr = 'data-qtip="Cliquer pour d&eacute;sactiver"';
                        meta.tdStyle = 'cursor:pointer;';
                        return '<span style="display:inline-block;width:36px;height:18px;border-radius:9px;'
                                + 'background-color:#5cb85c;position:relative;vertical-align:middle;">'
                                + '<span style="position:absolute;top:2px;right:2px;'
                                + 'width:14px;height:14px;border-radius:50%;background-color:#ffffff;"></span>'
                                + '</span>';
                    }
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/accept.png',
                            tooltip: 'D&eacute;finir comme fournisseur en vigueur',
                            handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                this.fireEvent('envigueur', view, rowIndex, colIndex, item, e, record, row);
                            }
                        }]
                });

        // Onglet des désactivés : consultation + réactivation uniquement
        const colonnesInactifs = me.buildCommonColumns();
        colonnesInactifs.push({
            xtype: 'actioncolumn',
            width: 30,
            sortable: false,
            menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/enable.png',
                    tooltip: 'R&eacute;activer ce fournisseur',
                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                        this.fireEvent('reactiver', view, rowIndex, colIndex, item, e, record, row);
                    }
                }]
        });

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
                        }, '->',
                        {
                            xtype: 'tbtext',
                            itemId: 'infoLabel',
                            text: 'Le fournisseur "en vigueur" prend en charge tous les envois de SMS.'
                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'tabpanel',
                    activeTab: 0,
                    plain: true,
                    items: [
                        {
                            xtype: 'gridpanel',
                            title: 'Fournisseurs actifs',
                            itemId: 'gridActifs',
                            store: me.buildStore(true),
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                            },
                            columns: colonnesActifs,
                            selModel: {
                                selType: 'cellmodel'
                            }
                        },
                        {
                            xtype: 'gridpanel',
                            title: 'Fournisseurs désactivés',
                            itemId: 'gridInactifs',
                            store: me.buildStore(false),
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Aucun fournisseur d&eacute;sactiv&eacute;</h1>'
                            },
                            columns: colonnesInactifs,
                            selModel: {
                                selType: 'cellmodel'
                            }
                        }
                    ]
                }]
        });
        me.callParent(arguments);
    }
});
