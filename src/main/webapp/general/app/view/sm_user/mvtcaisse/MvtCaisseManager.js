
var url_services_data_utilisateur = '../webservices/sm_user/utilisateur/ws_data.jsp';

var Me;


Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

function amountformatbis(val) {
    return amountformat(val) + " F CFA";
}

Ext.define('testextjs.view.sm_user.mvtcaisse.MvtCaisseManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'mvtcaissemanager',
    id: 'mvtcaissemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.view.sm_user.mvtcaisse.action.Detail',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Liste Des Mouvements De Caisse',
    closable: false,
    frame: true,
    initComponent: function () {

        const itemsPerPage = 20;
        Me = this;

        const store = Ext.create('Ext.data.Store', {
            fields: [{name: 'id', type: 'string'},
                {name: 'userAbrName', type: 'string'},
                {name: 'tiket', type: 'string'},
                {name: 'dateOpreration', type: 'string'},
                {name: 'heureOpreration', type: 'string'},
                {name: 'modeReglement', type: 'string'},
                {name: 'montant', type: 'int'},
                {name: 'typeMvtCaisse', type: 'string'},
                {name: 'numCompte', type: 'string'}

            ],
            autoLoad: false,
            pageSize: itemsPerPage,

            proxy: {
                type: 'ajax',
                url: '../api/v1/caisse/mvts-others',
                timeout: 2400000,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }

            }
        });



        const storeUser = new Ext.data.Store({
            model: 'testextjs.model.Utilisateur',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_utilisateur,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });


        Ext.apply(this, {
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top', items: [
                        {
                            text: 'Créer',
                            tooltip: 'Cr&eacute;er',
                            scope: this,
                            iconCls: 'addicon',
                            handler: this.onAddClick
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            name: 'dt_debut',
                            id: 'dt_debut_journal',
                            allowBlank: false,
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 1,
                            labelWidth: 50,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            name: 'dt_fin',
                            id: 'dt_fin_journal',
                            allowBlank: false,
                            labelWidth: 50,
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Utilisateur',
                            name: 'lg_USER_ID',
                            id: 'lg_USER_ID',
                            hidden: false,
                            store: storeUser,
                            pageSize: 20, //ajout la barre de pagination
                            valueField: 'lg_USER_ID',
                            displayField: 'str_FIRST_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            enableKeyEvents: true,
                            emptyText: 'Choisir un utilisateur...'
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon',
                            handler: this.onRechClick
                        },

                        , {
                            xtype: 'tbseparator'
                        }


                        ,
                        {
                            width: 100,
                            xtype: 'button',
                            text: 'Imprimer',
                            iconCls: 'printable',

                            handler: this.onPdfPrint

                        }
                    ]
                }],

            width: '98%',
            height: 580,
            id: 'gridmvtcaisseid',

            store: store,
            columns: [{
                    header: 'Type Mouvement',
                    dataIndex: 'typeMvtCaisse',
                    flex: 1
                }, {
                    header: 'Num&eacute;ro Comptable',
                    dataIndex: 'numCompte',
                    flex: 1
                }, {
                    header: 'Reference',
                    dataIndex: 'tiket',
                    flex: 1
                },
                {
                    header: 'Op&eacute;rateur',
                    dataIndex: 'userAbrName',
                    flex: 1
                }, {
                    header: 'Date',
                    dataIndex: 'dateOpreration',
                    flex: 0.7
                }, {
                    header: 'Heure',
                    dataIndex: 'heureOpreration',
                    flex: 0.7

                }, {
                    header: 'Mode.R&egrave;glement',
                    dataIndex: 'modeReglement',
                    flex: 1
                }, {
                    header: 'Montant',
                    dataIndex: 'montant',
                    align: 'right',
                    renderer: function (v, metaData, record) {
                        if (v < 0) {
                            metaData['style'] = 'color:red;';
                            v = Ext.util.Format.number((-1) * v, '0,000.');
                            return '-' + v;
                        } else {

                            return Ext.util.Format.number(v, '0,000.');

                        }

                    },
                    flex: 1
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
//                    hidden: true,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/paste_plain.png',
                            tooltip: 'Voir le detail',
                            scope: this,

                            handler: this.showDetail,
                            getClass: function (value, metadata, record) {
                                if (record.get('id') != "") {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }]
                }


            ],
            selModel: {
                selType: 'cellmodel'
            },

            bbar: {

                dock: 'bottom',
                items: [
                    {
                        xtype: 'pagingtoolbar',
                        displayInfo: true,
                        flex: 1,
                        pageSize: itemsPerPage,
                        store: store,
                        listeners: {
                            beforechange: function (page, currentPage) {
                                let myProxy = this.store.getProxy();

                                myProxy.params = {
                                    dtEnd: null,
                                    dtStart: null,
                                    checked: true,
                                    userId: null
                                };
                                let userId = "";
                                if (Ext.getCmp('lg_USER_ID').getValue()) {
                                    userId = Ext.getCmp('lg_USER_ID').getValue();
                                }
                                myProxy.setExtraParam('dtStart', Ext.getCmp('dt_debut_journal').getSubmitValue());
                                myProxy.setExtraParam('dtEnd', Ext.getCmp('dt_fin_journal').getSubmitValue());
                                myProxy.setExtraParam('checked', true);
                                myProxy.setExtraParam('userId', userId);
                            }

                        }

                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        xtype: 'fieldcontainer',
                        id: 'summaryCmp',
                        flex: 1,
                        layout: {type: 'hbox', align: 'center'},
                        items: []
                    }

                ]
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



    },

    loadStore: function () {
        Me.onRechClick();
       
    },
    onPdfPrint: function () {

        let userId = "";
        if (Ext.getCmp('lg_USER_ID').getValue()) {
            userId = Ext.getCmp('lg_USER_ID').getValue();
        }

        const dtStart = Ext.getCmp('dt_debut_journal').getSubmitValue();
        const dtEnd = Ext.getCmp('dt_fin_journal').getSubmitValue();

        const linkUrl = "../CaisseServlet?dtStart=" + dtStart + "&dtEnd=" + dtEnd + "&userId=" + userId + "&checked=true";
        window.open(linkUrl);


    },
    loadSummary: function () {
        let userId = "";
        if (Ext.getCmp('lg_USER_ID').getValue()) {
            userId = Ext.getCmp('lg_USER_ID').getValue();
        }

        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/caisse/mvts-others-summary',
            params: {
                dtStart: Ext.getCmp('dt_debut_journal').getSubmitValue(),
                dtEnd: Ext.getCmp('dt_fin_journal').getSubmitValue(),
                checked: true,
                userId: userId
            },
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                const data = result.data;
                Ext.getCmp('summaryCmp').removeAll();

                if (data?.modes?.length > 0) {
                    Ext.getCmp('summaryCmp').add({
                        xtype: 'displayfield',
                        flex: 1,
                        fieldLabel: 'TOTAL:',
                        labelWidth: 50,
                        renderer: amountformatbis,
                        fieldStyle: "color:blue;",
                        value: data.total
                    });

                    Ext.each(data.modes, function (it) {
                        Ext.getCmp('summaryCmp').add({
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: it.modeReglement,
                            //  labelWidth: it.modeReglement.length + 2,
                            renderer: amountformatbis,
                            fieldStyle: "color:blue;",
                            value: it.montant
                        });

                    });


                }

            }

        });

    },
    onRechClick: function () {
        let userId = "";
        if (Ext.getCmp('lg_USER_ID').getValue()) {
            userId = Ext.getCmp('lg_USER_ID').getValue();
        }
        this.getStore().load({
            params: {
                dtStart: Ext.getCmp('dt_debut_journal').getSubmitValue(),
                dtEnd: Ext.getCmp('dt_fin_journal').getSubmitValue(),
                checked: true,
                userId: userId
            }
        });
        Me.loadSummary();
    },

    onAddClick: function () {
        new testextjs.view.sm_user.mvtcaisse.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Effectuer Mouvement de Caisse"
        });
    },
    showDetail: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        Ext.create('testextjs.view.sm_user.mvtcaisse.action.Detail', {data: rec.data}).show();

    },
    modifyClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.mvtcaisse.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Mouvement  [" + rec.get('tiket') + "]"
        });
    }
});