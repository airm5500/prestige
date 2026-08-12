/* global Ext, valheight */

var url_services_data_articlevendu = '../webservices/sm_user/famille/ws_data_article_vendu.jsp';
var url_services_data_articlevendu_generate_pdf = '../webservices/sm_user/famille/ws_generate_articlevendu_pdf.jsp';
var url_services_transaction_suggerercde = '../webservices/sm_user/suggerercde/ws_transaction.jsp?mode=';
var url_services_data_utilisateur = '../webservices/sm_user/utilisateur/ws_data.jsp';
var dt_Date_Debut;
var dt_Date_Fin;
var h_debut;
var h_fin;
var Me;
var lg_USER_ID;
var str_TYPE_TRANSACTION;
var int_NUMBER;
var record;
var lg_FAMILLE_ID;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

function amountformatbis(val) {
    return amountformat(val) + " F CFA";
}

Ext.define('testextjs.view.configmanagement.famille.action.detailArticleVendus', {
    extend: 'Ext.window.Window',
    xtype: 'detailArticleVendus',

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
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: '',
        dt_debut: '',
        dt_Date_Fin: '',
        dt_fin: '',
        h_fin: '',
        type_transaction: '',
        int_NUMBER: '',
        record: '',
        lg_FAMILLE_ID: '',
        user: ''


    },
    plain: true,
    maximizable: true,
    //tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function () {

        Me = this;
        console.log(this.dtStart);
        lg_USER_ID = this.user;
        dt_Date_Debut = this.dtStart;
        dt_Date_Fin = this.dtEnd;
        h_debut = this.hStart;
        h_fin = this.hEnd;
        int_NUMBER = this.nbre;
        str_TYPE_TRANSACTION = this.typeTransaction;
        lg_FAMILLE_ID = this.produitId;
        var itemsPerPage = 20;
        console.log(lg_FAMILLE_ID);

        console.log(dt_Date_Debut);
        console.log(dt_Date_Fin);
        console.log(int_NUMBER);
        console.log(str_TYPE_TRANSACTION);

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

        store.load({
            params: {

                dtStart: dt_Date_Debut,
                dtEnd: dt_Date_Fin,
                hStart: h_debut,
                hEnd: h_fin,
                user: lg_USER_ID,
                typeTransaction: str_TYPE_TRANSACTION,
                nbre: int_NUMBER,
                produitId: lg_FAMILLE_ID

            }
        });
        var form = new Ext.form.Panel({
            width: 1050,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            autoHeight: true,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            items: [{
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    store: store,
                    height: 400,
                    columns: [

                        {
                            xtype: 'rownumberer',
                            text: 'Num',
                            width: 45,
                            sortable: true
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
                            header: 'Stock',
                            dataIndex: 'currentStock',
                            flex: 0.6,
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
                    tbar: [
                        {
                            xtype: 'textfield',
                            id: 'rechercher',
//                           flex: 0.4,
                            width: 300,
                            emptyText: 'Rech',
                            enableKeyEvents: true,
                            listeners: {
                                specialKey: function (field, e, options) {
                                    if (e.getKey() === e.ENTER) {

                                        Me.onRechClick();
                                    }
                                }


                            }


                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            iconCls: 'searchicon',
                            scope: this,
                            handler: this.onRechClick
                        }],
                    listeners: {
                        scope: this},
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true, // same store GridPanel is using
                        listeners: {
                            beforechange: function (page, currentPage) {
                                var myProxy = this.store.getProxy();
                                myProxy.params = {
                                    produitId: lg_FAMILLE_ID,
                                    query: '',
                                    nbre: int_NUMBER,
                                    dtStart: dt_Date_Debut,
                                    dtEnd: dt_Date_Fin,
                                    hStart: h_debut,
                                    hEnd: h_fin,
                                    stock: 0,
                                    user: lg_USER_ID,
                                    typeTransaction: str_TYPE_TRANSACTION,
                                    rayonId: '',
                                    prixachatFiltre: '',
                                    stockFiltre: ''
                                };

                                myProxy.setExtraParam('query', Ext.getCmp('rechecher').getValue());
                                myProxy.setExtraParam('produitId', lg_FAMILLE_ID);
                                myProxy.setExtraParam('nbre', int_NUMBER);
                                myProxy.setExtraParam('dtStart', dt_Date_Debut);
                                myProxy.setExtraParam('dtEnd', dt_Date_Fin);
                                myProxy.setExtraParam('hStart', h_debut);
                                myProxy.setExtraParam('hEnd', h_fin);
                                myProxy.setExtraParam('typeTransaction', str_TYPE_TRANSACTION);
                                myProxy.setExtraParam('user', lg_USER_ID);
                                myProxy.setExtraParam('rayonId', '');
                                myProxy.setExtraParam('prixachatFiltre', '');
                                myProxy.setExtraParam('stockFiltre', Ext.getCmp('stockFiltre').getValue());
                                myProxy.setExtraParam('stock', 0);

                            }

                        }
                    }
                }]
        });

        this.callParent();

        var win = new Ext.window.Window({
            autoShow: true,

            title: this.getTitre(),
            width: 1200,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    loadStore: function () {
        this.getStore().load();
    },

    onRechClick: function () {
        var val = Ext.getCmp('rechecher');


        this.getStore().load({

            params: {
                dtStart: dt_Date_Debut,
                dtEnd: dt_Date_Fin,
                user: lg_USER_ID,
                query: val.getValue(),
                typeTransaction: str_TYPE_TRANSACTION,
                nbre: int_NUMBER,
                hStart: h_debut,
                hEnd: h_fin,
                stock: 0,
                produitId: lg_FAMILLE_ID,
                rayonId: '',
                prixachatFiltre: '',
                stockFiltre: ''

            }
        });
    }

});