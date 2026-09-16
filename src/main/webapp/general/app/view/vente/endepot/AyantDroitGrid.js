/* ECRAN DUPLIQUE - « vente en depot ».
 *
 * Copie de vente/user/AyantDroitGrid.js, orientee « je suis dans le depot ».
 * L'officine a demande que l'ecran de vente de tous les jours ne soit pas touche : cet ecran est
 * donc une duplication, pas une variante. Consequence a connaitre : une correction portee sur
 * vente/user/AyantDroitGrid.js doit etre reportee ici.
 *
 * Le xtype est distinct pour que les selecteurs du controleur de l'officine ne rencontrent
 * jamais cet ecran, et inversement.
 */
/* global Ext */

Ext.define('testextjs.view.vente.endepot.AyantDroitGrid', {
    extend: 'Ext.window.Window',
    xtype: 'ayantdroiGriddepot',
    autoShow: false,
    height: 400,
    minHeight: 350,
    width: '50%',
    modal: true,
    title: 'LISTE DES AYANTS DROITS CORRESPONDANTS',
    iconCls: 'icon-grid',
    closeAction: 'destroy',
    closable: true,
    layout: {
        type: 'fit'
//        align: 'stretch'
    },
      
    initComponent: function () {
        var ayantStore = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.AyantDroit',
            autoLoad: false,
            pageSize: null,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/ayant-droits',
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
                            text: 'Nouvel ayant droit',
                            scope: this,
                            itemId: 'addBtnAyantDroit',
                           
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
                            itemId: 'btnCancelBtnAyantDroit',
                            text: 'Annuler'

                        }
                    ]
                }

            ],
            items: [{
                    xtype: 'gridpanel',
                    store: ayantStore,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [
                        {
                            text: '#',
                            width: 45,
                            dataIndex: 'lgAYANTSDROITSID',
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
                            flex: 0.8

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

                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    xtype: 'textfield',
                                    itemId: 'queryClientAyantDroit',
                                    flex: 1,
                                    height: 35,
                                    enableKeyEvents: true,
                                    emptyText: 'Taper ici pour rechercher un ayant droit'
                                }
                            ]
                        }

                    ]

                }]

        });
        me.callParent(arguments);
    }
});


