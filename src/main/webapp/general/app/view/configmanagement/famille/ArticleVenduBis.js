/* global Ext */

var Me;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

function amountformatbis(val) {
    return amountformat(val) + " F CFA";
}

Ext.define('testextjs.view.configmanagement.famille.ArticleVenduBis', {
    extend: 'Ext.grid.Panel',
    xtype: 'articlevendurecapitulatif',
    id: 'articlevendurecapitulatifID',
    requires: [
        'Ext.selection.CellModel',
        'testextjs.view.configmanagement.famille.action.detailArticleVendus',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Famille',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Liste des articles vendus r&eacute;capitulatif',
    plain: true,
    maximizable: true,
    closable: false,
    frame: true,
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    initComponent: function () {
        Me = this;
        str_TYPE_TRANSACTION = "ALL";
        var itemsPerPage = 20;
        const storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/users',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });


        var rayons = Ext.create('Ext.data.Store', {
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
        const grossiste = Ext.create('Ext.data.Store', {
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

        var store = new Ext.data.Store({
            fields: [

                {name: 'intAVOIR',
                    type: 'number'

                },
                {name: 'intPRICE',
                    type: 'number'

                },

                {name: 'intQUANTITY',
                    type: 'number'

                },
                {name: 'currentStock',
                    type: 'number'

                },

                {name: 'intCIP',
                    type: 'string'

                },
                {name: 'strNAME',
                    type: 'string'

                },
                {name: 'lgFAMILLEID',
                    type: 'string'

                }, {name: 'libelleRayon',
                    type: 'string'

                }

            ],
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/article-vendus-recap',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                },
                timeout: 240000
            }

        });

        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [{str_TYPE_TRANSACTION: 'LESS', str_desc: 'Inferieur à'}, {str_TYPE_TRANSACTION: 'MORE', str_desc: 'Superieur à'}, {str_TYPE_TRANSACTION: 'EQUAL', str_desc: 'Egal à'},
                {str_TYPE_TRANSACTION: 'LESSOREQUAL', str_desc: 'Inferieur ou egal à'}, {str_TYPE_TRANSACTION: 'MOREOREQUAL', str_desc: 'Superieur ou egal à'}, {str_TYPE_TRANSACTION: 'SEUIL',
                    str_desc: 'Seuil atteint'},
                {str_TYPE_TRANSACTION: 'ALL', str_desc: "Tous"}
            ]
        });

        var filtreAchat = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'LESS', libelle: "P.U inférieur au P.A"},
//                {id: 'EQUAL', libelle: "P.A égale au  P.U"},
//                {id: 'MORE', libelle: "P.U supérieur au P.A"},
                {id: 'TOUT', libelle: "Tous"}
            ]
        });
        var filtreStock = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'LESS', libelle: "Inférieur"},
                {id: 'EQUAL', libelle: "Egal à"},
                {id: 'MORE', libelle: "Supérieur"},
                {id: 'DIFF', libelle: "Différent"},
                {id: 'MOREOREQUAL', libelle: "Superieur ou égal"},
                {id: 'LESSOREQUAL', libelle: "Inferieur ou égal"},
                {id: 'TOUT', libelle: "Tous"}
            ]
        });



        Ext.apply(this, {
            width: '98%',

            height: Ext.getBody().getViewSize().height * 0.85,
            store: store,
            id: 'GridArticleID',
            columns: [
                {
                    xtype: 'rownumberer',
                    text: 'Num',
                    width: 45,
                    sortable: true
                },
                {
                    header: '#',
                    dataIndex: 'lgFAMILLEID',
                    hidden: true
                },
                {
                    header: 'CIP',
                    dataIndex: 'intCIP',
                    flex: 0.8
                },
                {
                    header: 'Designation',
                    dataIndex: 'strNAME',
                    flex: 2.5
                },
                {
                    header: 'Qte Vendue',
                    dataIndex: 'intQUANTITY',
                    flex: 0.6,
                    align: 'center'
                },
                {
                    header: 'Montant',
                    dataIndex: 'intPRICE',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.8
                }, {
                    header: 'Stock',
                    dataIndex: 'currentStock',
                    flex: 0.6,
                    align: 'center'
                }, {
                    header: 'Avoir',
                    dataIndex: 'intAVOIR',
                    flex: 0.6,
                    align: 'center'
                }, {
                    header: 'Emplacement',
                    dataIndex: 'libelleRayon',
                    flex: 1
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/grid.png',
                            tooltip: 'Voir le detail des produits',
                            scope: this,
                            handler: this.onDetailTransactionClick
                        }]
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
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            name: 'dt_debut',
                            id: 'dt_debut',
                            labelWidth: 15,
                            value: new Date(),
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            flex: 1,
                            listeners: {
                                'change': function (me) {

                                    Ext.getCmp('dt_fin').setMinValue(me.getValue());

                                }
                            }
                        }, '-', {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            name: 'dt_fin',
                            id: 'dt_fin',
                            labelWidth: 15,
                            flex: 1,
                            value: new Date(),
                            maxValue: new Date(),
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y',
                            listeners: {
                                'change': function (me) {

                                    Ext.getCmp('dt_debut').setMaxValue(me.getValue());

                                }
                            }
                        }, '-', {
                            xtype: 'timefield',
                            fieldLabel: 'De',
                            // margin: '0 7 0 0',
                            name: 'h_debut',
                            id: 'h_debut',
                            emptyText: 'Heure debut(HH:mm)',

                            flex: 1,
                            labelWidth: 15,
                            increment: 30,
                            //maxValue: new Date(),
                            //submitFormat: 'Y-m-d',
                            format: 'H:i'
                        }, '-', {
                            xtype: 'timefield',
                            fieldLabel: 'A',
                            name: 'h_fin',
                            id: 'h_fin',
                            emptyText: 'Heure fin(HH:mm)',

                            labelWidth: 10,
                            increment: 30,
                            flex: 1,
                            format: 'H:i'
                        }, '-', {
                            xtype: 'textfield',
                            id: 'rechecher',
                            name: 'user',
                            flex: 1.3,
                            emptyText: 'Recherche',
                            listeners: {
                                'render': function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) {
                                            Me.onRechClick();
                                        }
                                    });
                                }
                            }
                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon',
                            handler: this.onRechClick
                        }
                        , '-',
                        {
                            xtype: 'splitbutton',
                            text: 'Exporter',
                            iconCls: 'printable',
                            itemId: 'exporter',
                            menu:
                                    [
                                        {text: 'PDF',
                                            handler: function () {
                                                Me.onPdfClick();
                                            }

                                        },
                                        {text: 'EXCEL',
                                            handler: function () {
                                                Me.onExcel();
                                            }

                                        }
                                        ,
                                        {text: 'CSV',
                                            handler: function () {
                                                Me.onCsv();
                                            }

                                        }
                                    ]

                        },

                        {
                            xtype: 'splitbutton',
                            text: 'Suggerer',
                            tooltip: 'Suggerer',
                            iconCls: 'suggestionreapro',
                            scope: this,
                            menu:
                                    [
                                        {text: 'Suggerer les  quantités vendues',
                                            handler: function () {
                                                Me.onSuggereClick(false);
                                            }

                                        },
                                        {text: 'Suggerer  les quantités de réappro', handler: function () {
                                                Me.onSuggereClick(true);
                                            }}
                                    ]

                        }, '-',

                        {
                            text: 'Créer inventaire',
                            tooltip: 'Créer inventaire',
                            scope: this,
                            iconCls: 'addicon',
                            handler: this.createInventaire
                        }



                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            xtype: 'combobox',
                            fieldLabel: 'Utilisateur',
                            name: 'lg_USER_ID',
                            id: 'lg_USER_ID',
                            store: storeUser,
                            labelWidth: 60,
                            hidden: false,
                            flex: 1,
                            pageSize: 20,
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un utilisateur...',
                            listeners: {
                                select: function (cmp) {
                                    Me.onRechClick();
                                }
                            }
                        }, '-',
                        {
                            xtype: 'combobox',
                            flex: 1,
                            fieldLabel: 'Emplacements',
                            labelWidth: 90,
                            itemId: 'rayons',
                            id: 'rayons',
                            store: rayons,
                            pageSize: 99999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un emplacement',
                            listeners: {
                                select: function (cmp) {
                                    Me.onRechClick();
                                }
                            }
                        },
                        {
                            xtype: 'combobox',
                            flex: 1,
                            fieldLabel: 'Grossistes',
                            labelWidth: 90,
                            itemId: 'grossiste',
                            id: 'grossiste',
                            store: grossiste,
                            pageSize: 99999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un grossiste',
                            listeners: {
                                select: function (cmp) {
                                    Me.onRechClick();
                                }
                            }
                        },

                        '-', {
                            text: 'Imprimer par emplacement',
                            tooltip: 'imprimer',
                            iconCls: 'printable',
                            scope: this,
                            handler: this.onPdfRayon
                        }
                    ]},
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            xtype: 'combobox',
                            fieldLabel: 'Filtre seuil',
                            name: 'str_TYPE_TRANSACTION',
                            id: 'str_TYPE_TRANSACTION',
                            store: store_type,
                            valueField: 'str_TYPE_TRANSACTION',
                            displayField: 'str_desc',
                            typeAhead: true,
                            flex: 1,
                            queryMode: 'local',
                            emptyText: 'Filtre article...',
                            listeners: {
                                select: function (cmp) {
                                    Me.onRechClick();
                                }
                            }
                        }, '-',
                        {
                            xtype: 'textfield',
                            id: 'int_NUMBER',
                            name: 'int_NUMBER',
                            flex: 0.5,
                            emptyText: 'Quantite',
                            listeners: {
                                'render': function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) {
                                            Me.onRechClick();
                                        }
                                    });
                                }
                            }
                        }, '-',
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Filtre sur stock',
                            id: 'stockFiltre',
                            store: filtreStock,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            flex: 1,
                            queryMode: 'local',
                            emptyText: 'Filtre sur stock...',
                            listeners: {
                                select: function (cmp) {
                                    Me.onRechClick();
                                }
                            }
                        }, '-',
                        {
                            xtype: 'textfield',
                            id: 'stock',
                            flex: 0.5,
                            emptyText: 'Stock',
                            listeners: {
                                'render': function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) {
                                            Me.onRechClick();
                                        }
                                    });
                                }
                            }
                        }, '-',
                        {
                            xtype: 'textfield',
                            id: 'qteVendu',
                            flex: 0.5,
                            emptyText: 'Qté.Vendue',
                            listeners: {
                                'render': function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) {
                                            Me.onRechClick();
                                        }
                                    });
                                }
                            }
                        }, '-',

                        {
                            xtype: 'combobox',
                            fieldLabel: 'Filtre prix achat',
                            id: 'prixachatFiltre',
                            store: filtreAchat,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            flex: 1,
                            queryMode: 'local',
                            emptyText: 'Filtre par prix achat ...',
                            listeners: {
                                select: function (cmp) {
                                    Me.onRechClick();
                                }
                            }
                        }

                    ]}

            ],
            bbar: {
                dock: 'bottom',
                xtype: 'pagingtoolbar',
                displayInfo: true,
                flex: 2,
                pageSize: itemsPerPage,
                store: store,
                items: [{
                        xtype: 'displayfield',
                        flex: 0.7,
                        fieldLabel: 'TOTAL::',
                        fieldWidth: 70,
                        name: 'int_TOTAL',
                        id: 'int_TOTAL',
                        renderer: amountformatbis,
                        fieldStyle: "color:white;", /* mise en couleur blanche pour cacher sur l'ecran */
                        value: 0
                    }],
                listeners: {
                    beforechange: function (page, currentPage) {
                        const myProxy = this.store.getProxy();
                        myProxy.params = {
                            query: '',
                            nbre: 0,
                            dtStart: '',
                            dtEnd: '',
                            hStart: '',
                            hEnd: '',
                            user: '',
                            stock: null,
                            typeTransaction: 'ALL',
                            rayonId: '',
                            prixachatFiltre: '',
                            stockFiltre: '',
                            qteVendu: null,
                            grossisteId: ''
                        };



                        myProxy.setExtraParam('query', Ext.getCmp('rechecher').getValue());
                        myProxy.setExtraParam('nbre', (Ext.getCmp('int_NUMBER').getValue() != null ? Ext.getCmp('int_NUMBER').getValue() : 0));
                        myProxy.setExtraParam('dtStart', Ext.getCmp('dt_debut').getSubmitValue());
                        myProxy.setExtraParam('dtEnd', Ext.getCmp('dt_fin').getSubmitValue());
                        myProxy.setExtraParam('hStart', Ext.getCmp('h_debut').getSubmitValue());
                        myProxy.setExtraParam('hEnd', Ext.getCmp('h_fin').getSubmitValue());
                        myProxy.setExtraParam('typeTransaction', Ext.getCmp('str_TYPE_TRANSACTION').getValue());
                        myProxy.setExtraParam('user', Ext.getCmp('lg_USER_ID').getValue());
                        myProxy.setExtraParam('rayonId', Ext.getCmp('rayons').getValue());
                        myProxy.setExtraParam('prixachatFiltre', Ext.getCmp('prixachatFiltre').getValue());
                        myProxy.setExtraParam('stockFiltre', Ext.getCmp('stockFiltre').getValue());
                        myProxy.setExtraParam('stock', (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : null));
                        myProxy.setExtraParam('qteVendu', (Ext.getCmp('qteVendu').getValue() != null ? Ext.getCmp('qteVendu').getValue() : null));
                        myProxy.setExtraParam('grossisteId', (Ext.getCmp('grossiste').getValue() != null ? Ext.getCmp('grossiste').getValue() : null));

                    }

                }
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });

    },
    loadStore: function () {
        this.getStore().addListener('metachange', this.doMetachange, this);
        this.getStore().load();
    },
    doMetachange: function (store, meta) {
        Ext.getCmp('int_TOTAL').setValue(meta.montantTotal);

    },

    onDetailTransactionClick: function (grid, rowIndex) {
        var record = grid.getStore().getAt(rowIndex);
        var dt_debut = Ext.getCmp('dt_debut').getSubmitValue();
        var dt_fin = Ext.getCmp('dt_fin').getSubmitValue();
        var h_debut = Ext.getCmp('h_debut').getSubmitValue();
        var h_fin = Ext.getCmp('h_fin').getSubmitValue();
        var type_transaction = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
        var int_NUMBER = Ext.getCmp('int_NUMBER').getValue();

        new testextjs.view.configmanagement.famille.action.detailArticleVendus({
            //record: record.data,

            cip: record.get('intCIP'),
            produitId: record.get('lgFAMILLEID'),
            strNAME: record.get('strNAME'),
            titre: "Detail de vente de l'article " + record.get('intCIP') + " : " + record.get('strNAME'),
            dtStart: dt_debut,
            dtEnd: dt_fin,
            hStart: h_debut,
            hEnd: h_fin,
            typeTransaction: type_transaction,
            nbre: int_NUMBER,
            user: Ext.getCmp('lg_USER_ID').getValue()

        });


    },

    onRechClick: function () {
        if (new Date(Ext.getCmp('dt_debut').getSubmitValue()) > new Date(Ext.getCmp('dt_fin').getSubmitValue())) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }
        this.getStore().load({
            params: {
                dtStart: Ext.getCmp('dt_debut').getSubmitValue(),
                grossisteId: Ext.getCmp('grossiste').getValue() != null ? Ext.getCmp('grossiste').getValue() : "",
                dtEnd: Ext.getCmp('dt_fin').getSubmitValue(),
                hStart: (Ext.getCmp('h_debut').getSubmitValue() != null ? Ext.getCmp('h_debut').getSubmitValue() : ""),
                hEnd: (Ext.getCmp('h_fin').getSubmitValue() != null ? Ext.getCmp('h_fin').getSubmitValue() : ""),
                user: Ext.getCmp('lg_USER_ID').getValue() != null ? Ext.getCmp('lg_USER_ID').getValue() : "",
                query: Ext.getCmp('rechecher').getValue(),
                typeTransaction: (Ext.getCmp('str_TYPE_TRANSACTION').getValue() != null ? Ext.getCmp('str_TYPE_TRANSACTION').getValue() : "ALL"),
                nbre: (Ext.getCmp('int_NUMBER').getValue() != null ? Ext.getCmp('int_NUMBER').getValue() : 0),
                prixachatFiltre: Ext.getCmp('prixachatFiltre').getValue(),
                stock: (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : null),
                stockFiltre: Ext.getCmp('stockFiltre').getValue(),
                rayonId: Ext.getCmp('rayons').getValue() != null ? Ext.getCmp('rayons').getValue() : "",
                qteVendu: (Ext.getCmp('qteVendu').getValue() != null ? Ext.getCmp('qteVendu').getValue() : null)

            }
        });
    },

    buildLinkUrl: function () {
        let linkUrl = '?mode=ARTICLE_VENDUS_RECAP&dtStart=' + Ext.getCmp('dt_debut').getSubmitValue();
        linkUrl += "&dtEnd=" + Ext.getCmp('dt_fin').getSubmitValue() + "&hStart=" + (Ext.getCmp('h_debut').getSubmitValue() != null ? Ext.getCmp('h_debut').getSubmitValue() : "");
        linkUrl += "&hEnd=" + (Ext.getCmp('h_fin').getSubmitValue() != null ? Ext.getCmp('h_fin').getSubmitValue() : "") + "&query=" + Ext.getCmp('rechecher').getValue();
        linkUrl += "&typeTransaction=" + (Ext.getCmp('str_TYPE_TRANSACTION').getValue() != null ? Ext.getCmp('str_TYPE_TRANSACTION').getValue() : "ALL");
        linkUrl += "&nbre=" + (Ext.getCmp('int_NUMBER').getValue() != null ? Ext.getCmp('int_NUMBER').getValue() : 0) + '&prixachatFiltre=' + Ext.getCmp('prixachatFiltre').getValue();
        linkUrl += "&stock=" + (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : "") + '&stockFiltre=' + (Ext.getCmp('stockFiltre').getValue() != null ? Ext.getCmp('stockFiltre').getValue() : "");
        linkUrl += "&user=" + (Ext.getCmp('lg_USER_ID').getValue() != null ? Ext.getCmp('lg_USER_ID').getValue() : "");
        linkUrl += "&grossisteId=" + (Ext.getCmp('grossiste').getValue() != null ? Ext.getCmp('grossiste').getValue() : "");
        linkUrl += "&rayonId=" + (Ext.getCmp('rayons').getValue() != null ? Ext.getCmp('rayons').getValue() : "") + '&type=detail&qteVendu=' + (Ext.getCmp('qteVendu').getValue() != null ? Ext.getCmp('qteVendu').getValue() : "");

        return linkUrl;
    },
    onExcel: function () {
        const me = this;
        window.location = '../api/v1/ventestats/article-vendus-recap/excel' + me.buildLinkUrl();
    },
    onCsv: function () {
        const me = this;
        window.location = '../api/v1/ventestats/article-vendus-recap/csv' + me.buildLinkUrl();
    },

    onPdfClick: function () {
        const me = this;
        const linkUrl = '../SockServlet' + me.buildLinkUrl();

        window.open(linkUrl);
    },

    onPdfRayon: function () {

        let linkUrl = '../SockServlet?mode=ARTICLE_VENDUS_RECAP&dtStart=' + Ext.getCmp('dt_debut').getSubmitValue();
        linkUrl += "&dtEnd=" + Ext.getCmp('dt_fin').getSubmitValue() + "&hStart=" + (Ext.getCmp('h_debut').getSubmitValue() != null ? Ext.getCmp('h_debut').getSubmitValue() : "");
        linkUrl += "&hEnd=" + (Ext.getCmp('h_fin').getSubmitValue() != null ? Ext.getCmp('h_fin').getSubmitValue() : "") + "&query=" + Ext.getCmp('rechecher').getValue();
        linkUrl += "&typeTransaction=" + (Ext.getCmp('str_TYPE_TRANSACTION').getValue() != null ? Ext.getCmp('str_TYPE_TRANSACTION').getValue() : "ALL");
        linkUrl += "&nbre=" + (Ext.getCmp('int_NUMBER').getValue() != null ? Ext.getCmp('int_NUMBER').getValue() : 0) + '&prixachatFiltre=' + Ext.getCmp('prixachatFiltre').getValue();
        linkUrl += "&stock=" + (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : "") + '&stockFiltre=' + (Ext.getCmp('stockFiltre').getValue() != null ? Ext.getCmp('stockFiltre').getValue() : "");
        linkUrl += "&user=" + (Ext.getCmp('lg_USER_ID').getValue() != null ? Ext.getCmp('lg_USER_ID').getValue() : "");
        linkUrl += "&grossisteId=" + (Ext.getCmp('grossiste').getValue() != null ? Ext.getCmp('grossiste').getValue() : "");
        linkUrl += "&rayonId=" + (Ext.getCmp('rayons').getValue() != null ? Ext.getCmp('rayons').getValue() : "") + '&type=rayon&qteVendu=' + (Ext.getCmp('qteVendu').getValue() != null ? Ext.getCmp('qteVendu').getValue() : "");

        window.open(linkUrl);
    },
    buildDataSuggestion: function () {
        return {
            dtStart: Ext.getCmp('dt_debut').getSubmitValue(),
            prixachatFiltre: Ext.getCmp('prixachatFiltre').getValue(),
            dtEnd: Ext.getCmp('dt_fin').getSubmitValue(),
            hStart: (Ext.getCmp('h_debut').getSubmitValue() !== null ? Ext.getCmp('h_debut').getSubmitValue() : ""),
            hEnd: (Ext.getCmp('h_fin').getSubmitValue() !== null ? Ext.getCmp('h_fin').getSubmitValue() : ""),
            user: (Ext.getCmp('lg_USER_ID').getValue() !== null ? Ext.getCmp('lg_USER_ID').getValue() : ""),
            query: Ext.getCmp('rechecher').getValue(),
            typeTransaction: (Ext.getCmp('str_TYPE_TRANSACTION').getValue() !== null ? Ext.getCmp('str_TYPE_TRANSACTION').getValue() : "ALL"),
            nbre: (Ext.getCmp('int_NUMBER').getValue() !== null ? Ext.getCmp('int_NUMBER').getValue() : 0),
            stock: (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : null),
            stockFiltre: Ext.getCmp('stockFiltre').getValue(),
            rayonId: Ext.getCmp('rayons').getValue() != null ? Ext.getCmp('rayons').getValue() : "",
            grossisteId: Ext.getCmp('grossiste').getValue() != null ? Ext.getCmp('grossiste').getValue() : "",
            qteVendu: (Ext.getCmp('qteVendu').getValue() != null ? Ext.getCmp('qteVendu').getValue() : null)
        };
    },
    onSuggereClick: function (isReappro) {
        const me = this;

        const data = {
            ...me.buildDataSuggestion(),
            isReappro
        };
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/suggerer',
            method: 'GET',
            //  headers: {'Content-Type': 'application/json'},
            params: data,
            timeout: 2400000,
            success: function (response)
            {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    Ext.MessageBox.show({
                        title: 'Message',
                        width: 320,
                        msg: 'Nombre de produits en compte : ' + result.count,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.INFO

                    });
                }

            },
            failure: function (response)
            {
                progress.hide();
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 320,
                    msg: "L'opération n'a pas abouti",
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR

                });
            }
        });
    },

    createInventaire: function () {
        const me = this;

        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/create-invenatire',
            method: 'GET',
            params: me.buildDataSuggestion(),
            timeout: 2400000,
            success: function (response)
            {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                Ext.MessageBox.show({
                    title: 'Message',
                    width: 320,
                    msg: 'Nombre de produits en compte : ' + result.count,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.INFO

                });


            },
            failure: function (response)
            {
                progress.hide();
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 320,
                    msg: "L'opération n'a pas abouti",
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR

                });
            }
        });
    }

});