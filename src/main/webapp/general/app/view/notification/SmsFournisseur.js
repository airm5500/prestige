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
    initComponent: function () {
        const fournisseurStore = Ext.create('Ext.data.Store', {
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
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        let me = this;
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
                    xtype: 'gridpanel',
                    store: fournisseurStore,
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
                            // Interrupteur actif/inactif : un clic bascule l'etat.
                            header: 'Actif',
                            itemId: 'actifSwitchColumn',
                            dataIndex: 'actif',
                            width: 70,
                            sortable: false,
                            menuDisabled: true,
                            align: 'center',
                            renderer: function (value, meta) {
                                const on = (value === true);
                                meta.tdAttr = 'data-qtip="' + (on ? 'Cliquer pour d&eacute;sactiver' : 'Cliquer pour activer') + '"';
                                meta.tdStyle = 'cursor:pointer;';
                                return '<span style="display:inline-block;width:36px;height:18px;border-radius:9px;'
                                        + 'background-color:' + (on ? '#5cb85c' : '#bbbbbb') + ';position:relative;vertical-align:middle;">'
                                        + '<span style="position:absolute;top:2px;' + (on ? 'right:2px;' : 'left:2px;')
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
                                    icon: 'resources/images/icons/fam/page_white_edit.png',
                                    tooltip: 'Modifier',
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
                    }
                }]
        });
        me.callParent(arguments);
    }
});
