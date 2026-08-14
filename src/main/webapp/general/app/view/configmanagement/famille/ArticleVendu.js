/* global Ext */

var url_services_data_articlevendu = '../webservices/sm_user/famille/ws_data_article_vendu.jsp';
var url_services_data_articlevendu_generate_pdf = '../webservices/sm_user/famille/ws_generate_articlevendubroup_pdf.jsp';
var url_services_transaction_suggerercde = '../webservices/sm_user/suggerercde/ws_transaction.jsp?mode=';
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

Ext.define('testextjs.view.configmanagement.famille.ArticleVendu', {
    extend: 'Ext.grid.Panel',
    xtype: 'articlevendumanager',
    id: 'articlevendumanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Famille',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Liste des articles vendus',
    plain: true,
    maximizable: true,
    closable: false,
    frame: true,
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    initComponent: function () {

        /* 'var' volontaire : masque la variable globale Me partagee par les
         * autres ecrans (elle etait ecrasee par le dernier ecran ouvert, ce qui
         * cassait les boutons de cette vue) */
        var Me = this;
        var lg_EMPLACEMENT_ID = loadEmplacement();

        // Mise en evidence « couvert par la reserve » : ligne verte et grasse,
        // pastille sur le stock rayon (partagee avec l'ecran recapitulatif)
        if (!document.getElementById('av-reserve-css')) {
            var avCss = document.createElement('style');
            avCss.id = 'av-reserve-css';
            avCss.textContent = '.av-couvert-reserve .x-grid-cell { color:#1b7a1f !important; font-weight:bold !important; }\n'
                    + '.av-pastille { display:inline-block; width:9px; height:9px; border-radius:50%; background:#2e9b33;'
                    + ' margin-right:5px; vertical-align:middle; box-shadow:0 0 0 2px rgba(46,155,51,0.25); }';
            document.head.appendChild(avCss);
        }

        var itemsPerPage = 20;


        var storeUser = new Ext.data.Store({
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
        var store = new Ext.data.Store({
            fields: [
                {name: 'ticketNum',
                    type: 'string'

                },
                {name: 'intAVOIR',
                    type: 'number'

                },
                {name: 'intPRICE',
                    type: 'number'

                },
                {name: 'typeVente',
                    type: 'string'

                },
                {name: 'intQUANTITY',
                    type: 'number'

                },
                {name: 'currentStock',
                    type: 'number'

                },
                {name: 'stockReserve',
                    type: 'number'

                },
                {name: 'couvertParReserve',
                    type: 'boolean'

                },
                {name: 'HEURE',
                    type: 'string'

                },
                {name: 'dtCREATED',
                    type: 'string'

                },
                {name: 'operateur',
                    type: 'string'

                },
                {name: 'caissier',
                    type: 'string'

                }, {name: 'intCIP',
                    type: 'string'

                },
                {name: 'strNAME',
                    type: 'string'

                },
                {name: 'lgFAMILLEID',
                    type: 'string'

                }
            ],
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/article-vendus',
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
            height: valheight,
            store: store,
            id: 'GridArticleID',
            columns: [
                {
                    header: 'lgFAMILLEID',
                    dataIndex: 'lgFAMILLEID',
                    hidden: true,
                    flex: 1
                },
                {
                    xtype: 'rownumberer',
                    text: 'Num',
                    width: 45,
                    sortable: true
                },
                {
                    header: 'CIP',
                    dataIndex: 'intCIP',
                    flex: 0.8
                },
                {
                    header: 'Désignation',
                    dataIndex: 'strNAME',
                    flex: 2.5
                },
                {
                    header: 'Date',
                    dataIndex: 'dtCREATED',
                    flex: 0.8
                },
                {
                    header: 'Heure',
                    dataIndex: 'HEURE',
                    flex: 0.7
                },
                {
                    header: 'Qte Vd',
                    dataIndex: 'intQUANTITY',
                    flex: 0.6,
                    align: 'center'
                },
                {
                    header: 'Prix',
                    dataIndex: 'intPRICE',
                    renderer: amountformat,
                    align: 'right',
                    flex: 0.8
                }, {
                    header: 'Stock rayon',
                    dataIndex: 'currentStock',
                    flex: 0.7,
                    align: 'right',
                    renderer: function (v, meta, record) {
                        var texte = amountformat(v);
                        return record.get('couvertParReserve')
                                ? '<span class="av-pastille"></span>' + texte : texte;
                    }

                }, {
                    header: 'Stock réserve',
                    dataIndex: 'stockReserve',
                    flex: 0.7,
                    renderer: amountformat,
                    align: 'right'

                }, {
                    header: 'Ticket',
                    dataIndex: 'ticketNum',
                    flex: 1
                }, {
                    header: 'Type.Vente',
                    dataIndex: 'typeVente',
                    flex: 0.7,
                    align: 'center'
                }, {
                    header: 'Avoir',
                    dataIndex: 'intAVOIR',
                    flex: 0.6,
                    renderer: amountformat,
                    align: 'right'
                },
                {
                    header: 'Operateur',
                    dataIndex: 'caissier',
                    flex: 1
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            viewConfig: {
                // Ligne verte + grasse quand la reserve couvre le seuil du filtre
                // (uniquement quand la case « Inclure le stock reserve » est decochee)
                getRowClass: function (record) {
                    return record.get('couvertParReserve') ? 'av-couvert-reserve' : '';
                }
            },
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            name: 'dt_Date_Debut',
                            id: 'dt_Date_Debut',
                            labelWidth: 15,
                            flex: 1,
                            value: new Date(),
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            listeners: {
                                'change': function (me) {
                                    Ext.getCmp('dt_Date_Fin').setMinValue(me.getValue());
                                }
                            }
                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            name: 'dt_Date_Fin',
                            id: 'dt_Date_Fin',
                            labelWidth: 15,
                            flex: 1,
                            value: new Date(),
                            maxValue: new Date(),
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y',
                            listeners: {
                                'change': function (me) {
                                    Ext.getCmp('dt_Date_Debut').setMaxValue(me.getValue());
                                }
                            }
                        }, {
                            xtype: 'timefield',
                            fieldLabel: 'De',
                            // margin: '0 7 0 0',
                            name: 'h_debut',
                            id: 'h_debut',
                            emptyText: 'Heure debut(HH:mm)',
                            allowBlank: false,
                            flex: 1,
                            labelWidth: 15,

                            increment: 30,
                            format: 'H:i'
                        }, '-', {
                            xtype: 'timefield',
                            fieldLabel: 'A',
                            name: 'h_fin',
                            id: 'h_fin',
                            emptyText: 'Heure fin(HH:mm)',
                            allowBlank: false,
                            labelWidth: 10,
                            increment: 30,
                            flex: 1,
                            format: 'H:i'
                        }, '-',

                        {
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
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon',
                            handler: this.onRechClick
                        }, '-', {
                            text: 'Imprimer',
                            tooltip: 'imprimer',
                            iconCls: 'printable',
                            scope: this,
                            handler: this.onPdfClick
                        }, '-',
                        {
                            text: 'Suggerer',
                            tooltip: 'Suggerer',
                            iconCls: 'suggestionreapro',
                            scope: this,
                            handler: this.onSuggereClick
                        }
                    ]},
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
                            valueField: 'lg_USER_ID',
                            displayField: 'str_FIRST_LAST_NAME',
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
                        '-', {
                            text: 'Imprimer par caissier',
                            tooltip: 'imprimer',
                            iconCls: 'printable',
                            scope: this,
                            handler: this.onPdfUser
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
                        }

                        , '-',
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
                items: [
                    {
                        xtype: 'pagingtoolbar',
                        displayInfo: true,
                        flex: 2,
                        pageSize: itemsPerPage,
                        store: store, // same store GridPanel is using
                        listeners: {
                            beforechange: function (page, currentPage) {
                                var myProxy = this.store.getProxy();
                                myProxy.params = {
                                    query: '',
                                    nbre: 0,
                                    dtStart: '',
                                    dtEnd: '',
                                    hStart: '',
                                    hEnd: '',
                                    user: '',
                                    stock: 0,
                                    user: '',
                                    typeTransaction: 'ALL',
                                    rayonId: '',
                                    prixachatFiltre: '',
                                    stockFiltre: ''
                                };

                                myProxy.setExtraParam('query', Ext.getCmp('rechecher').getValue());
                                myProxy.setExtraParam('nbre', (Ext.getCmp('int_NUMBER').getValue() != null ? Ext.getCmp('int_NUMBER').getValue() : 0));
                                myProxy.setExtraParam('dtStart', Ext.getCmp('dt_Date_Debut').getSubmitValue());
                                myProxy.setExtraParam('dtEnd', Ext.getCmp('dt_Date_Fin').getSubmitValue());
                                myProxy.setExtraParam('hStart', Ext.getCmp('h_debut').getSubmitValue());
                                myProxy.setExtraParam('hEnd', Ext.getCmp('h_fin').getSubmitValue());
                                myProxy.setExtraParam('typeTransaction', Ext.getCmp('str_TYPE_TRANSACTION').getValue());
                                myProxy.setExtraParam('user', Ext.getCmp('lg_USER_ID').getValue());
                                myProxy.setExtraParam('rayonId', Ext.getCmp('rayons').getValue());
                                myProxy.setExtraParam('prixachatFiltre', Ext.getCmp('prixachatFiltre').getValue());
                                myProxy.setExtraParam('stockFiltre', Ext.getCmp('stockFiltre').getValue());
                                myProxy.setExtraParam('stock', (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : 0));
                                myProxy.setExtraParam('avecStockReserve', (Ext.getCmp('avecStockReserve') && Ext.getCmp('avecStockReserve').getValue() === false ? 'false' : 'true'));
                            }

                        }
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        xtype: 'displayfield',
                        flex: 0.7,
                        fieldLabel: 'TOTAL::',
                        fieldWidth: 70,
                        name: 'int_TOTAL',
                        id: 'int_TOTAL',
                        renderer: amountformatbis,
                        fieldStyle: "color:white;", /* mise en couleur blanche pour cacher sur l'ecran */
                        value: 0
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        // Base du filtre stock : cochee = total rayon + reserve ;
                        // decochee = rayon seul (historique) avec mise en evidence
                        // des lignes couvertes par la reserve (vert + pastille)
                        xtype: 'checkbox',
                        id: 'avecStockReserve',
                        boxLabel: 'Inclure le stock réserve',
                        checked: true,
                        margin: '0 0 0 8',
                        listeners: {
                            change: function () {
                                Me.onRechClick();
                            },
                            afterrender: function (c) {
                                c.getEl().set({'data-qtip':
                                    'Cochée : le filtre stock compare au total rayon + réserve.<br/>'
                                    + 'Décochée : au stock rayon seul (comportement historique) — les lignes '
                                    + 'dont le total dépasse le seuil du filtre sont mises en évidence en vert.'});
                            }
                        }
                    }
                ]
            },
            /* Un ecouteur afterrender rendait visible un bouton "btn_export_suggestion" sur les
             * emplacements autres que le premier. Ce bouton n'existe NULLE PART dans
             * l'application : la recherche de son identifiant ne ramene que la ligne qui
             * tentait de l'afficher, et l'historique du depot montre qu'il n'a jamais existe.
             * Ext.getCmp renvoyait donc undefined et .show() levait une erreur JavaScript a
             * l'ouverture de l'ecran - sur toutes les officines dont l'emplacement n'est pas
             * "1", c'est-a-dire des qu'il y a plusieurs emplacements. L'erreur interrompait
             * l'affichage en cours de route.
             * L'ecouteur est retire : le bouton "Suggerer" de la barre d'outils, lui, est
             * present et visible pour tout le monde, sans condition d'emplacement. */
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

    onRechClick: function () {

        if (new Date(Ext.getCmp('dt_Date_Debut').getSubmitValue()) > new Date(Ext.getCmp('dt_Date_Fin').getSubmitValue())) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }

        this.getStore().load({
            params: {
                dtStart: Ext.getCmp('dt_Date_Debut').getSubmitValue(),
                dtEnd: Ext.getCmp('dt_Date_Fin').getSubmitValue(),
                hStart: (Ext.getCmp('h_debut').getSubmitValue() != null ? Ext.getCmp('h_debut').getSubmitValue() : ""),
                hEnd: (Ext.getCmp('h_fin').getSubmitValue() != null ? Ext.getCmp('h_fin').getSubmitValue() : ""),
                user: Ext.getCmp('lg_USER_ID').getValue() != null ? Ext.getCmp('lg_USER_ID').getValue() : "",
                query: Ext.getCmp('rechecher').getValue(),
                typeTransaction: (Ext.getCmp('str_TYPE_TRANSACTION').getValue() != null ? Ext.getCmp('str_TYPE_TRANSACTION').getValue() : "ALL"),
                nbre: (Ext.getCmp('int_NUMBER').getValue() != null ? Ext.getCmp('int_NUMBER').getValue() : 0),
                prixachatFiltre: Ext.getCmp('prixachatFiltre').getValue(),
                stock: (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : 0),
                stockFiltre: Ext.getCmp('stockFiltre').getValue(),
                rayonId: Ext.getCmp('rayons').getValue() != null ? Ext.getCmp('rayons').getValue() : "",
                avecStockReserve: (Ext.getCmp('avecStockReserve') && Ext.getCmp('avecStockReserve').getValue() === false ? 'false' : 'true')

            }
        });
    },
    onPdfClick: function () {
        let linkUrl = '../SockServlet?mode=ARTICLE_VENDUS_DETAIL&dtStart=' + Ext.getCmp('dt_Date_Debut').getSubmitValue();
        linkUrl += "&dtEnd=" + Ext.getCmp('dt_Date_Fin').getSubmitValue() + "&hStart=" + (Ext.getCmp('h_debut').getSubmitValue() != null ? Ext.getCmp('h_debut').getSubmitValue() : "");
        linkUrl += "&hEnd=" + (Ext.getCmp('h_fin').getSubmitValue() != null ? Ext.getCmp('h_fin').getSubmitValue() : "") + "&query=" + Ext.getCmp('rechecher').getValue();
        linkUrl += "&typeTransaction=" + (Ext.getCmp('str_TYPE_TRANSACTION').getValue() != null ? Ext.getCmp('str_TYPE_TRANSACTION').getValue() : "ALL");
        linkUrl += "&nbre=" + (Ext.getCmp('int_NUMBER').getValue() != null ? Ext.getCmp('int_NUMBER').getValue() : 0) + '&prixachatFiltre=' + Ext.getCmp('prixachatFiltre').getValue();
        linkUrl += "&stock=" + (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : 0) + '&stockFiltre=' + (Ext.getCmp('stockFiltre').getValue() != null ? Ext.getCmp('stockFiltre').getValue() : "");
        linkUrl += "&user=" + (Ext.getCmp('lg_USER_ID').getValue() != null ? Ext.getCmp('lg_USER_ID').getValue() : "");
        linkUrl += "&rayonId=" + (Ext.getCmp('rayons').getValue() != null ? Ext.getCmp('rayons').getValue() : "") + '&type=detail' + '&avecStockReserve=' + (Ext.getCmp('avecStockReserve') && Ext.getCmp('avecStockReserve').getValue() === false ? 'false' : 'true');


        window.open(linkUrl);
    },

    onPdfUser: function () {
        let linkUrl = '../SockServlet?mode=ARTICLE_VENDUS_DETAIL&dtStart=' + Ext.getCmp('dt_Date_Debut').getSubmitValue();
        linkUrl += "&dtEnd=" + Ext.getCmp('dt_Date_Fin').getSubmitValue() + "&hStart=" + (Ext.getCmp('h_debut').getSubmitValue() != null ? Ext.getCmp('h_debut').getSubmitValue() : "");
        linkUrl += "&hEnd=" + (Ext.getCmp('h_fin').getSubmitValue() != null ? Ext.getCmp('h_fin').getSubmitValue() : "") + "&query=" + Ext.getCmp('rechecher').getValue();
        linkUrl += "&typeTransaction=" + (Ext.getCmp('str_TYPE_TRANSACTION').getValue() != null ? Ext.getCmp('str_TYPE_TRANSACTION').getValue() : "ALL");
        linkUrl += "&nbre=" + (Ext.getCmp('int_NUMBER').getValue() != null ? Ext.getCmp('int_NUMBER').getValue() : 0) + '&prixachatFiltre=' + Ext.getCmp('prixachatFiltre').getValue();
        linkUrl += "&stock=" + (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : 0) + '&stockFiltre=' + (Ext.getCmp('stockFiltre').getValue() != null ? Ext.getCmp('stockFiltre').getValue() : "");
        linkUrl += "&user=" + (Ext.getCmp('lg_USER_ID').getValue() != null ? Ext.getCmp('lg_USER_ID').getValue() : "");
        linkUrl += "&rayonId=" + (Ext.getCmp('rayons').getValue() != null ? Ext.getCmp('rayons').getValue() : "") + '&type=user' + '&avecStockReserve=' + (Ext.getCmp('avecStockReserve') && Ext.getCmp('avecStockReserve').getValue() === false ? 'false' : 'true');

        window.open(linkUrl);
    },
    onPdfRayon: function () {
        let linkUrl = '../SockServlet?mode=ARTICLE_VENDUS_DETAIL&dtStart=' + Ext.getCmp('dt_Date_Debut').getSubmitValue();
        linkUrl += "&dtEnd=" + Ext.getCmp('dt_Date_Fin').getSubmitValue() + "&hStart=" + (Ext.getCmp('h_debut').getSubmitValue() != null ? Ext.getCmp('h_debut').getSubmitValue() : "");
        linkUrl += "&hEnd=" + (Ext.getCmp('h_fin').getSubmitValue() != null ? Ext.getCmp('h_fin').getSubmitValue() : "") + "&query=" + Ext.getCmp('rechecher').getValue();
        linkUrl += "&typeTransaction=" + (Ext.getCmp('str_TYPE_TRANSACTION').getValue() != null ? Ext.getCmp('str_TYPE_TRANSACTION').getValue() : "ALL");
        linkUrl += "&nbre=" + (Ext.getCmp('int_NUMBER').getValue() != null ? Ext.getCmp('int_NUMBER').getValue() : 0) + '&prixachatFiltre=' + Ext.getCmp('prixachatFiltre').getValue();
        linkUrl += "&stock=" + (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : 0) + '&stockFiltre=' + (Ext.getCmp('stockFiltre').getValue() != null ? Ext.getCmp('stockFiltre').getValue() : "");
        linkUrl += "&user=" + (Ext.getCmp('lg_USER_ID').getValue() != null ? Ext.getCmp('lg_USER_ID').getValue() : "");
        linkUrl += "&rayonId=" + (Ext.getCmp('rayons').getValue() != null ? Ext.getCmp('rayons').getValue() : "") + '&type=rayon' + '&avecStockReserve=' + (Ext.getCmp('avecStockReserve') && Ext.getCmp('avecStockReserve').getValue() === false ? 'false' : 'true');

        window.open(linkUrl);
    },

    onSuggereClick: function () {
        let data = {
            dtStart: Ext.getCmp('dt_Date_Debut').getSubmitValue(),
            prixachatFiltre: Ext.getCmp('prixachatFiltre').getValue(),
            dtEnd: Ext.getCmp('dt_Date_Fin').getSubmitValue(),
            hStart: (Ext.getCmp('h_debut').getSubmitValue() !== null ? Ext.getCmp('h_debut').getSubmitValue() : ""),
            hEnd: (Ext.getCmp('h_fin').getSubmitValue() !== null ? Ext.getCmp('h_fin').getSubmitValue() : ""),
            user: (Ext.getCmp('lg_USER_ID').getValue() !== null ? Ext.getCmp('lg_USER_ID').getValue() : ""),
            query: Ext.getCmp('rechecher').getValue(),
            typeTransaction: (Ext.getCmp('str_TYPE_TRANSACTION').getValue() !== null ? Ext.getCmp('str_TYPE_TRANSACTION').getValue() : "ALL"),
            nbre: (Ext.getCmp('int_NUMBER').getValue() !== null ? Ext.getCmp('int_NUMBER').getValue() : 0),
            stock: (Ext.getCmp('stock').getValue() != null ? Ext.getCmp('stock').getValue() : 0),
            stockFiltre: Ext.getCmp('stockFiltre').getValue(),
            prixachatFiltre: Ext.getCmp('prixachatFiltre').getValue(),
            rayonId: Ext.getCmp('rayons').getValue() != null ? Ext.getCmp('rayons').getValue() : "",
            avecStockReserve: (Ext.getCmp('avecStockReserve') && Ext.getCmp('avecStockReserve').getValue() === false ? 'false' : 'true')
        };
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/suggerer',
            method: 'GET',
            //  headers: {'Content-Type': 'application/json'},
            params: data,
            timeout: 2400000,
            success: function (response)
            {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    var vert = 'color:green;font-weight:bold;';
                    var rouge = 'color:red;font-weight:bold;';
                    var msg = '<span style="' + vert + '">Nombre de produits suggérés : ' + result.count + '</span>';
                    if (result.ignores && result.ignores > 0) {
                        msg += '<hr style="border:none;border-top:1px solid #ccc;margin:6px 0;"/>';
                        msg += '<span style="' + rouge + '">Produits non suggérés (ignorés) : ' + result.ignores + '</span>';
                        if (result.detailIgnores && result.detailIgnores.length > 0) {
                            msg += '<br/><span style="' + rouge + '">Causes :</span>';
                            msg += '<ul style="text-align:left;margin:5px 0 0 15px;' + rouge + '">';
                            Ext.Array.each(result.detailIgnores.slice(0, 15), function (p) {
                                msg += '<li>' + (p.cip ? p.cip + ' - ' : '') + (p.nom || '') + ' (' + p.motif + ')</li>';
                            });
                            if (result.detailIgnores.length > 15) {
                                msg += '<li>... et ' + (result.detailIgnores.length - 15) + ' autre(s)</li>';
                            }
                            msg += '</ul>';
                        }
                    }
                    Ext.MessageBox.show({
                        title: 'Message',
                        width: (result.ignores && result.ignores > 0) ? 600 : 340,
                        msg: msg,
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
    }
});

function loadEmplacement() {
    return localStorage.getItem("lg_EMPLACEMENT_ID");
}