/* global Ext */

Ext.define('testextjs.view.devis.form.DevisClientGrid', {
    extend: 'Ext.window.Window',
    xtype: 'assuranceDevis',
    autoShow: false,
    height: 400,
    width: '60%',
    modal: true,
    title: 'CLIENT(S) CORRESPONDANT(S) A LA RECHERCHE',
    iconCls: 'icon-grid',
    closeAction: 'hide',
    closable: false,
    layout: {
        type: 'fit'
//        align: 'stretch'
    },
    initComponent: function () {
        var clientStore = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.ClientAssurance',
            autoLoad: false,
            pageSize: null,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client',
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
                            text: 'Nouveau client',
                            scope: this,
                            hidden:true,
                            itemId: 'addBtnClientAssurance',
                            iconCls: 'addicon'

                        }
                    ]
                },
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
                            itemId: 'btnCancelClient',
                            text: 'Annuler'

                        }
                    ]
                }

            ],
            items: [{
                    xtype: 'gridpanel',
                    store: clientStore,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [
                        {
                            text: '#',
                            width: 45,
                            dataIndex: 'lgCLIENTID',
                            hidden: true

                        },
                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 25,
                            sortable: true
                        },
                        {
                            text: 'Num SS',
                            flex: 0.8,
                            sortable: true,
                            dataIndex: 'strNUMEROSECURITESOCIAL'
                        },

                        {
                            text: 'Nom',
                            flex: 0.9,
                            sortable: true,
                            dataIndex: 'strFIRSTNAME'
                        },

                        {
                            header: 'Prénom(s)',
                            dataIndex: 'strLASTNAME',
                            flex: 1.5

                        },
                        {
                            header: 'Téléphone',
                            dataIndex: 'strADRESSE',
                            flex:0.8

                        },
                        {
                            header: 'RO',
                            flex: 1,
                            renderer: function (value, meta, record, colIndex, rowIndex, store, view) {
                                return record.get('tiersPayants')[0].tpFullName;
                            }

                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
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
                    },

//            selModel: {
//                selType: 'cellmodel'
//                selType: 'checkboxmodel',
//            },

                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    xtype: 'textfield',
                                    itemId: 'queryClientAssurance',
                                    flex: 1,
                                    height: 35,
                                    enableKeyEvents: true,
                                    emptyText: 'Taper ici pour rechercher un client'
                                }/*, '-',
                                 
                                 {
                                 text: 'rechercher',
                                 tooltip: 'rechercher',
                                 itemId: 'btnSearchClientAss',
                                 scope: this,
                                 iconCls: 'searchicon'
                                 }*/
                            ]
                        }

                    ]

                }]

        });
        me.callParent(arguments);
    }
});

