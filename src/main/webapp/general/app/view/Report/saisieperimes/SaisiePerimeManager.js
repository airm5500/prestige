/* global Ext */

var myAppController;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.Report.saisieperimes.SaisiePerimeManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'saisieperime',
    id: 'saisieperimeID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',

        'testextjs.view.Report.saisieperimes.action.add',
        'testextjs.model.perimesModel',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion des p&eacute;rim&eacute;s ',
    frame: true,
    initComponent: function () {
        Me = this;
        myAppController = Ext.create('testextjs.controller.App', {});
        var itemsPerPage = 20;
        var store = new Ext.data.Store({

            fields: [
                {name: 'intCIP', type: 'string'},
                {name: 'operateur', type: 'string'},
                {name: 'intQUANTITY', type: 'number'},
                {name: 'dtCREATED', type: 'string'},
                {name: 'dateHeure', type: 'string'},
                {name: 'ticketNum', type: 'string'},
                {name: 'libelleGrossiste', type: 'string'},
                {name: 'strNAME', type: 'string'},
                {name: 'intPRICEUNITAIR', type: 'number'},
                {name: 'intPRICE', type: 'number'},
                {name: 'stockInitial', type: 'number'},
                {name: 'stockFinal', type: 'number'}
            ],
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/fichearticle/saisieperimes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                },
                timeout: 2400000
            }
        });


        let grossiste = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/grossiste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        let rayons = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/rayons',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        let familles = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/famillearticles',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });

        Ext.apply(this, {
            width: "98%",
            height: 580,
            /*cls: 'custompanel',*/
            cls: 'dg-card',
            features: [
                {
                    ftype: 'summary'
                }],
            store: store,
            cls: 'my-grid-header',
            id: 'saisiGrid',
            columns: [{
                    header: 'ID',
                    dataIndex: 'lg_FAMILLE_ID',
                    hidden: true

                }, {
                    header: 'CODE CIP',
                    dataIndex: 'intCIP',
                    flex: 1,
                    summaryType: "count",

                    summaryRenderer: function (value) {

                        if (value > 0) {
                            return "<b><span style='color:blue;'>TOTAL: </span></b>";
                        } else {
                            return '';
                        }
                    }

                }, {
                    header: 'Article',
                    dataIndex: 'strNAME',
                    flex: 1.5

                }, {
                    header: 'Num.Lot',
                    dataIndex: 'ticketNum',
                    flex: 1
                },
                {
                    header: 'Stock.Initial',
                    dataIndex: 'stockInitial',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.8,
                    summaryType: "sum",
                    summaryRenderer: function (value) {

                        if (value > 0) {
                            return "<b><span style='color:blue;'>" + amountformat(value) + " </span></b>";
                        } else {
                            return '';
                        }
                    }

                },

                {
                    header: 'Quantité',
                    dataIndex: 'intQUANTITY',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.8,
                    summaryType: "sum",
                    summaryRenderer: function (value) {

                        if (value > 0) {
                            return "<b><span style='color:blue;'>" + amountformat(value) + " </span></b>";
                        } else {
                            return '';
                        }
                    }

                },
                {
                    header: 'Stock.Final',
                    dataIndex: 'stockFinal',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.8,
                    summaryType: "sum",
                    summaryRenderer: function (value) {

                        if (value > 0) {
                            return "<b><span style='color:blue;'>" + amountformat(value) + " </span></b>";
                        } else {
                            return '';
                        }
                    }

                },

                {
                    header: 'Prix.U',
                    dataIndex: 'intPRICEUNITAIR',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.7

                }, {
                    header: 'Montant',
                    dataIndex: 'intPRICE',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.8,
                    summaryType: "sum",
                    summaryRenderer: function (value) {

                        if (value > 0) {
                            return "<b><span style='color:blue;'>" + amountformat(value) + " F</span></b>";
                        } else {
                            return '';
                        }
                    }

                }
                , {
                    header: 'Repartiteur',
                    dataIndex: 'libelleGrossiste',
                    flex: 1

                }
                , {
                    header: 'Date Entr&eacute;e',
                    dataIndex: 'dateHeure',
                    flex: 1

                }
                , {
                    header: 'Date p&eacute;remption',
                    dataIndex: 'dtCREATED',
                    flex: 0.8

                }, {
                    header: 'Op&eacute;rateur',
                    dataIndex: 'operateur',
                    flex: 1

                }

            ],
            selModel: {
                selType: 'cellmodel'
            },
            dockedItems: [
                {

                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            text: 'Saisir des produits',
                            scope: this,
                            iconCls: 'addicon',
                            cls: 'btn-primary',
                            handler: this.onAddCreate
                        }, '-',
                        {
                            xtype: 'datefield',
                            id: 'dt_start',
                            name: 'dt_start',
                            emptyText: 'Date debut',
//                   
                            flex: 0.6,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y',
                            listeners: {
                                'change': function (me) {

                                    valdt_start = me.getSubmitValue();
                                    Ext.getCmp('dt_end').setMinValue(me.getValue());
                                }
                            }
                        }, {
                            xtype: 'tbseparator'
                        }, {
                            xtype: 'datefield',
                            id: 'dt_end',
                            name: 'dt_end',
                            emptyText: 'Date fin',
                            value: new Date(),
                            maxValue: new Date(),
                            submitFormat: 'Y-m-d',
                            flex: 0.6,
                            format: 'd/m/Y',
                            listeners: {
                                'change': function (me) {
                                    //alert(me.getSubmitValue());
                                    valdt_end = me.getSubmitValue();
                                    Ext.getCmp('dt_start').setMaxValue(me.getValue());
                                }
                            }
                        },
                        {
                            xtype: 'combobox',
                            flex: 1.3,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            id: 'codeRayon',
                            store: rayons,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un emplacement'
                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1.2,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            id: 'codeGrossiste',
                            store: grossiste,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un grossiste'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1.3,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            id: 'codeFamile',
                            store: familles,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez une famille'
                        }
                    ]}
                ,
                {

                    xtype: 'toolbar',
                    dock: 'top',
                    items: [, '->',
                        {
                            xtype: 'textfield',
                            id: 'rechecher',
                            flex: 1,
                            emptyText: 'Taper pur rechercher'

                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            iconCls: 'searchicon',
                            cls: 'btn-primary',
                            scope: this,
                            handler: this.onRechClick
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'Imprimer',
                            tooltip: 'Imprimer',
                            iconCls: 'importicon',
                            scope: this,
                            handler: this.onPrint
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'Imprimer par groupe',
                            tooltip: 'Imprimer par groupe',
                            iconCls: 'importicon',
                            xtype: 'button',

                            menu:
                                    [{
                                            text: 'Famille',
                                            scope: this,
                                            handler: function () {
                                                this.onPrint(0);
                                            }
                                        }, {
                                            text: 'Rayon',
                                            scope: this,
                                            handler: function () {
                                                this.onPrint(1);
                                            }

                                        }, {
                                            text: 'Grossiste',
                                            scope: this,
                                            handler: function () {
                                                this.onPrint(2);
                                            }

                                        }

                                    ]


                        }


                    ]}
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 20,
                store: store,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
                ,
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            codeFamile: null,
                            codeRayon: null,
                            codeGrossiste: null,
                            query: null,
                            dtEnd: null,
                            dtStart: null
                        };
                        var query = Ext.getCmp('rechecher').getValue();


                        var dtStart = Ext.getCmp('dt_start').getSubmitValue();
                        var dtEnd = Ext.getCmp('dt_end').getSubmitValue();
                        var codeFamile = Ext.getCmp('codeFamile').getValue();
                        var codeGrossiste = Ext.getCmp('codeGrossiste').getValue();
                        var codeRayon = Ext.getCmp('codeRayon').getValue();
                        myProxy.setExtraParam('codeRayon', codeRayon);
                        myProxy.setExtraParam('codeFamile', codeFamile);
                        myProxy.setExtraParam('codeGrossiste', codeGrossiste);
                        myProxy.setExtraParam('query', query);
                        myProxy.setExtraParam('dtStart', dtStart);
                        myProxy.setExtraParam('dtEnd', dtEnd);

                    }

                }
            }
        });

        this.callParent();

    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onAddCreate: function () {
        var xtype = "addPerimer";
        var alias = 'widget.' + xtype;
        //A DECOMMENTER EN CAS DE PROBLEME
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Ajout de produits perimes", "0");


    },

    onRechClick: function () {
        let val = Ext.getCmp('rechecher').getValue();
        let dtStart = Ext.getCmp('dt_start').getSubmitValue();
        let dtEnd = Ext.getCmp('dt_end').getSubmitValue();
        let codeFamile = Ext.getCmp('codeFamile').getValue();
        let codeGrossiste = Ext.getCmp('codeGrossiste').getValue();
        let codeRayon = Ext.getCmp('codeRayon').getValue();

        this.getStore().load({
            params: {
                codeFamile: codeFamile,
                codeRayon: codeRayon,
                codeGrossiste: codeGrossiste,
                query: val,
                dtEnd: dtEnd,
                dtStart: dtStart
//               
            }
        });
    },

    onPrint: function (groupby) {
        let query = Ext.getCmp('rechecher').getValue();
        let dtStart = Ext.getCmp('dt_start').getSubmitValue();
        let dtEnd = Ext.getCmp('dt_end').getSubmitValue();
        let codeFamile = Ext.getCmp('codeFamile').getValue();
        let codeGrossiste = Ext.getCmp('codeGrossiste').getValue();
        let codeRayon = Ext.getCmp('codeRayon').getValue();

        if (codeFamile == null) {
            codeFamile = '';
        }
        if (codeRayon == null) {
            codeRayon = '';
        }
        if (codeGrossiste == null) {
            codeGrossiste = '';
        }
        let _groupby = parseInt(groupby);

        var linkUrl = '../BalancePdfServlet?mode=SAISIE_PERIMES&query=' + query
                + '&codeGrossiste=' + codeGrossiste + '&codeRayon=' + codeRayon +
                '&codeFamile=' + codeFamile + '&dtEnd=' + dtEnd + '&dtStart=' + dtStart
                + '&groupby=' + _groupby;
        window.open(linkUrl);


    }

});