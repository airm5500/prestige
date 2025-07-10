/* global Ext */
var Me;

var myAppController;
var doublonsEmStore;
var doublonOFStore, store_emplacement;

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.actions.Doublons', {
    extend: 'Ext.tab.Panel',
    xtype: 'doublons',
    fullscreen: true,
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'testextjs.model.Doublons',
        'testextjs.model.Emplacemnt'
    ],
    title: 'Gestion des doublons ',
    frame: true,
    border: false,
    width: "98%",
    height: 580,
    initComponent: function () {
        Me = this;
        const _this = this;
        myAppController = Ext.create('testextjs.controller.App', {});
        doublonOFStore = new Ext.data.Store({
            model: 'testextjs.model.Doublons',
            pageSize: 40,
            proxy: {
                type: 'ajax',
                url: '../Doublons?action=officine',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        store_emplacement = new Ext.data.Store({
            model: "testextjs.model.Emplacemnt",
            pageSize: 20,
            autoLoad: true,
            proxy: {
                type: "ajax",
                url: '../webservices/ws_emplacement.jsp',
                reader: {
                    type: "json",
                    root: "data",
                    totalProperty: "total"
                }
            }

        });

        doublonsEmStore = new Ext.data.Store({
            model: 'testextjs.model.Doublons',
            pageSize: 30,
            proxy: {
                type: 'ajax',
                url: '../Doublons?action=stock',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        let cipStore = new Ext.data.Store({
            idProperty: 'id',
            fields: [
                {
                    name: 'libelle',
                    type: 'string'
                },
                {
                    name: 'cip',
                    type: 'string'
                },
                {
                    name: 'codeProduit',
                    type: 'string'
                },
                {
                    name: 'libelleGrossiste',
                    type: 'string'
                },
                {
                    name: 'dateCreation',
                    type: 'string'
                },
                {
                    name: 'dateModification',
                    type: 'string'
                },
                {
                    name: 'statut',
                    type: 'string'
                },
                {
                    name: 'prixAchat',
                    type: 'number'
                },

                {
                    name: 'prixUnitaire',
                    type: 'number'
                },
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'produitId',
                    type: 'string'
                }


            ],
            pageSize: 99999,
            autoLoad: true,
            groupField: 'produitId',
            proxy: {
                type: 'ajax',
                url: '../api/v1/maintenance/doublons-cip',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                },
                timeout: 2400000
            }
        });

        _this.items = [
            {
                xtype: 'gridpanel',
                id: 'doublonsID',
                title: 'Doublons produits',
                border: false,
                store: doublonOFStore,
                columns: _this.buildDetailsColumns(),
                dockedItems: _this.buildDocked()
            },
            {
                xtype: 'gridpanel',
                id: 'cip',
                title: 'Doublons code produit',
                border: false,
                store: cipStore,
                features: [
                    {
                        ftype: 'grouping',
                        collapsible: true,
                        groupHeaderTpl: "{[values.rows[0].data.libelle]}"

                    }],
                columns: [
                    {
                        header: 'Libélle',
                        dataIndex: 'libelle',
                        flex: 1.3
                    },
                    {
                        header: 'Code cip',
                        dataIndex: 'cip',
                        flex: 0.6
                    },
                    {
                        header: 'Code produit',
                        dataIndex: 'codeProduit',
                        flex: 0.6
                    },
                    {
                       header: 'Date de création',
                        dataIndex: 'dateCreation',
                        flex: 0.6  
                    }
                    , {
                       header: 'Date de modification',
                        dataIndex: 'dateModification',
                        flex: 0.6  
                    }
                    ,
                    {
                        header: 'Prix Achat',
                        dataIndex: 'prixAchat',
                        align: 'right',
                        renderer: amountformat,
                        flex: 0.6
                    }
                    ,
                    {
                        header: 'Prix Unitaire',
                        dataIndex: 'prixUnitaire',
                        align: 'right',
                        renderer: amountformat,
                        flex: 0.6
                    },
                    {
                        header: 'Statut',
                        dataIndex: 'statut',
                        flex: 0.5
                    },
                    {
                        header: 'Grossiste',
                        dataIndex: 'libelleGrossiste',
                        flex: 1
                    },
                    {
                        xtype: 'actioncolumn',
                        width: 30,
                        sortable: false,
                        menuDisabled: true,
                        items: [{
                                icon: 'resources/images/icons/fam/delete.png',
                                tooltip: 'Supprimer la ligne',
                                scope: this,
                                handler: this.onRemoveCip
                            }]
                    }

                ],
                dockedItems: _this.buildCipDocked(cipStore)
            }

        ];

        this.callParent();



    },
    buildDocked: function () {
        return [
            {xtype: 'toolbar',
                dock: 'top',
//                padding: '8',
                items: [

                    {
                        xtype: 'combo',
                        emptyText: 'Actions',
                        labelWidth: 50,
                        flex: 1,
                        id: 'cmbomode',
                        valueField: 'lgEMPLACEMENTID',
                        displayField: 'strNAME',

                        store: store_emplacement,
                        listeners: {
                            select: function (cmd) {

                                const me = Me;
                                let search = Ext.getCmp('rechecherDoublon').getValue(),
                                        grid = Ext.getCmp('doublonsID'), pagingbar = Ext.getCmp('balanceGridpagingbar'),
                                        query = cmd.getValue();

                                if (query === '1') {
                                    grid.reconfigure(doublonOFStore, me.buildDetailsColumns());
                                    pagingbar.bindStore(doublonOFStore);
                                } else {
                                    grid.reconfigure(doublonsEmStore, me.buildGroupColumns());
                                    pagingbar.bindStore(doublonsEmStore);
                                }

                                grid.getStore().load({
                                    params: {
                                        lgEMPLACEMENTID: this.getValue(),
                                        search: search
                                    }});

                            }
                        }

                    }, '',
                    {
                        xtype: 'textfield',
                        id: 'rechecherDoublon',
                        flex: 1,
                        emptyText: 'Rech',
                        listeners: {
                            specialKey: function (field, e) {

                                if (e.getKey() === e.ENTER) {

                                    const val = field.getValue();
                                    let cmbomode = "";
                                    if (Ext.getCmp('cmbomode').getValue() !== null && Ext.getCmp('cmbomode').getValue() !== "") {
                                        cmbomode = Ext.getCmp('cmbomode').getValue();
                                    }

                                    Ext.getCmp('doublonsID').getStore().load({
                                        params: {
                                            lgEMPLACEMENTID: cmbomode,
                                            search: val
                                        }});
                                }
                            }
                        }
                    }

                ]
            },
            {
                dock: 'bottom',
                xtype: 'pagingtoolbar',
                pageSize: 30,
                id: 'balanceGridpagingbar',
                store: this.store,
                displayInfo: true,
                displayMsg: 'Données affichées {0} - {1} sur {2}',
                emptyMsg: "Pas de donnée à afficher",
                listeners: {
                    beforechange: function (page, currentPage) {

                        let myProxy = Ext.getCmp('doublonsID').getStore().getProxy();
                        myProxy.params = {
                            lgEMPLACEMENTID: '',
                            search: ''

                        };
                        let cmbomode = '', search = Ext.getCmp('rechecherDoublon').getValue();

                        if (Ext.getCmp('cmbomode').getValue() !== null && Ext.getCmp('cmbomode').getValue() !== "") {
                            cmbomode = Ext.getCmp('cmbomode').getValue();
                        }


                        myProxy.setExtraParam('search', search);
                        myProxy.setExtraParam('lgEMPLACEMENTID', cmbomode);

                    }

                }
            }];
    },

    buildDetailsColumns: function () {
        return [
            {
                header: '#',
                dataIndex: 'lg_FAMILLE_ID',
                hidden: true,
                width: 0.3
            }, {
                header: 'CIP',
                dataIndex: 'CIP',

                flex: 1
            }, {
                header: 'Libellé',
                dataIndex: 'str_LIB',
                flex: 2

            }, {
                header: 'Prix.Achat',
                dataIndex: 'PA',
                align: 'right',
                renderer: amountformat,
                flex: 0.5
            }, {
                header: 'Prix.U',
                align: 'right',
                dataIndex: 'PU',
                renderer: amountformat,
                flex: 0.5
            }, {
                header: 'Stock',
                dataIndex: 'STOCK',
                renderer: amountformat,
                flex: 0.5,
                align: 'right'
            }
            , {
                header: 'Date.Création',
                dataIndex: 'DATECREATION',
                flex: 1

            }
            , {
                header: 'Date.dernière.entrée',
                dataIndex: 'DATEENTREE',
                flex: 1

            }, {
                header: 'Date.Vente',
                dataIndex: 'DATEVENTE',
                flex: 1

            }, {
                header: 'Date.Inventaire',
                dataIndex: 'DATEINVENTAIRE',
                flex: 1

            }
            ,
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        icon: 'resources/images/icons/fam/delete.png',
                        tooltip: 'Désactiver',
                        scope: this,
                        handler: this.onUpdate
                    }]
            }

        ];
    },
    reconfigureBalancegrid:
            function () {
                const me = this;
                let     grid = Ext.getCmp('doublonsID'), pagingbar = Ext.getCmp('balanceGridpagingbar'), query = Ext.getCmp('cmbomode').getValue();
                if (query === '1') {
                    doublonOFStore.loadPage(1);
                    grid.reconfigure(doublonOFStore, me.buildDetailsColumns());
                    pagingbar.bindStore(doublonOFStore);
                } else {
                    doublonsEmStore.loadPage(1);
                    grid.reconfigure(doublonsEmStore, me.buildGroupColumns());
                    pagingbar.bindStore(doublonsEmStore);
                }


            },
    buildGroupColumns: function () {
        return [
            {
                header: '#',
                dataIndex: 'lg_FAMILLESTOCK_ID',
                hidden: true,
                width: 0.3
            }, {
                header: 'CIP',
                dataIndex: 'CIP',

                flex: 1
            }, {
                header: 'Libellé',
                dataIndex: 'str_LIB',
                flex: 2

            }, {
                header: 'Prix.Achat',
                dataIndex: 'PA',
                align: 'right',
                renderer: amountformat,
                flex: 0.5
            }, {
                header: 'Prix.U',
                align: 'right',
                dataIndex: 'PU',
                renderer: amountformat,
                flex: 0.5
            }, {
                header: 'Stock',
                dataIndex: 'STOCK',
                renderer: amountformat,
                flex: 0.5,
                align: 'right'
            }
            , {
                header: 'Date.Création',
                dataIndex: 'DATECREATION',
                flex: 1

            }
            , {
                header: 'Date.dernière.entrée',
                dataIndex: 'DATEENTREE',
                flex: 1

            }, {
                header: 'Date.Vente',
                dataIndex: 'DATEVENTE',
                flex: 1

            }, {
                header: 'Date.Inventaire',
                dataIndex: 'DATEINVENTAIRE',
                flex: 1

            }

            ,
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        icon: 'resources/images/icons/fam/delete.png',
                        tooltip: 'Désactiver',
                        scope: this,
                        handler: this.onUpdateStock
                    }]
            }
        ];
    },

    onUpdate: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        Ext.Ajax.request({
            url: '../Doublons',
            params: {
                action: 'update',
                lg_FAMILLE_STOCK_ID: rec.get('lg_FAMILLE_ID')
            },
            success: function (response)
            {
                grid.getStore().reload();

            }

        });
    },

    onUpdateStock: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);

        Ext.Ajax.request({
            url: '../Doublons',
            params: {
                action: 'updateStock',
                lg_FAMILLE_STOCK_ID: rec.get('lg_FAMILLESTOCK_ID')
            },
            success: function (response)
            {

                grid.getStore().reload();

            },
            failure: function (response)
            {
                const object = Ext.JSON.decode(response.responseText, false);
                console.log(object);
            }

        });
    },
    buildCipDocked: function (cipStore) {
        return [
            {xtype: 'toolbar',
                dock: 'top',
                items: ['->',

                    {
                        text: 'Ajouter une contrainte à la table',

                        scope: this,
                        iconCls: 'searchicon',
                        handler: this.onAddConstraint
                    }

                ]
            },
            {
                dock: 'bottom',
                xtype: 'pagingtoolbar',
                pageSize: 999999,
                store: cipStore,
                displayInfo: true


            }];
    },
    onRemoveCip: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        Ext.Ajax.request({
            url: '../api/v1/maintenance/remove-cip/' + rec.get('id'),
            method: 'DELETE',
            success: function (response, options) {
                grid.getStore().reload();


            },
            failure: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                Ext.Msg.alert("Message", result);
            }


        });
    },
    onAddConstraint: function () {
        Ext.Ajax.request({
            url: '../api/v1/maintenance/add-cip-constraint/',
            success: function (response, options) {
                Ext.getCmp('cip').getStore().reload();
                 Ext.Msg.alert("Message", 'Opération effectuée');
            },
            failure: function (response, options) {
             
                Ext.Msg.alert("Message", response.responseText);
            }

        });
    }
});