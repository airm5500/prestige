/* global Ext */

var url_services_data_balance_agee_detail = '../webservices/tierspayantmanagement/tierspayant/ws_data_balance_agee_detail.jsp';
var url_services_data_tierspayant_other = '../webservices/tierspayantmanagement/tierspayant/ws_data_other.jsp';
var url_services_data_client = '../webservices/configmanagement/client/ws_data_compteclttierspayants.jsp';
var url_services_transaction_facturetierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_transaction.jsp?mode=';
var lg_TIERS_PAYANT_ID = "";
var lg_COMPTE_CLIENT_ID = "";

var valdatedebut;
var valdatefin;
var title;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.tierspayantmanagement.balanceagee_detail.BalanceageeDetailManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'balanceagee_detail',
    id: 'balanceagee_detailID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.BalanceAgee',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer',
        'testextjs.view.tierspayantmanagement.balanceagee_detail.action.BalanceAgeeDetailsClient'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        nameintern: ''
    },
    title: 'Gestion des balances agees detaillees',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function () {

        title = this.getTitre();



        var itemsPerPage = 20;

        var d = new Date();
        var month = new Array();
        month[0] = "Janvier";
        month[1] = "F&eacute;vrier";
        month[2] = "Mars";
        month[3] = "Avril";
        month[4] = "Mai";
        month[5] = "Juin";
        month[6] = "Juillet";
        month[7] = "Ao&ucirc;t";
        month[8] = "Septembre";
        month[9] = "Octobre";
        month[10] = "Novembre";
        month[11] = "D&eacute;cembre";
        var n = month[d.getMonth()],n1=month[d.getMonth()-1],n2=month[d.getMonth()-2],n3=month[d.getMonth()-3],n4=month[d.getMonth()-4],n5=month[d.getMonth()-5];

        var store = new Ext.data.Store({
            model: 'testextjs.model.BalanceAgee',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_balance_agee_detail,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_tierspayant = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tierspayant_other,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var store_client = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/tierspayantmanagement/tierspayant/ws_client.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });


      

        Ext.apply(this, {
            width: '98%',
            height: valheight,

            store: store,
            id: 'GridFacturationID',
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: 'lg_TIERS_PAYANT_ID',
                    dataIndex: 'lg_TIERS_PAYANT_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Tiers payants',
                    dataIndex: 'str_TIERS_PAYANT',
                    flex: 1.2
                },
                {
                    header: 'Nombre.Produits.Vendus',
                    dataIndex: 'int_NUMBER_PRODUCT',
                    hidden: true,
                    flex: 1
                },
                {
                    header: 'Nombre.Transaction',
                    dataIndex: 'int_NUMBER_TRANSACTION',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                }, {
                    header: 'Total (6 mois)',
//                    dataIndex: 'int_MONTANT',
                    renderer: function (val, m, r, k) {
                        var values = Number(r.get('int_VALUE1')) + Number(r.get('int_VALUE2')) + Number(r.get('int_VALUE3')) + Number(r.get('int_VALUE4')) + Number(r.get('int_VALUE5'))+ Number(r.get('int_VALUE6'));
                   return amountformat(values);
                    },
                    align: 'right',
                    flex: 1
                }, {
                    header: n,
                    dataIndex: 'int_VALUE1',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                }, {
                    header: n1,
                    dataIndex: 'int_VALUE2',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                }, {
                    header: n2,
                    dataIndex: 'int_VALUE3',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                }, {
                    header: n3,
                    dataIndex: 'int_VALUE4',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                }, {
                    header: n4,
                    dataIndex: 'int_VALUE5',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                }, {
                    header: n5,
                    dataIndex: 'int_VALUE6',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                }, {
                    header: '< 6 mois',
                    dataIndex: 'int_VALUE7',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/grid.png',
                            tooltip: 'Voir le detail des transactions',
                            scope: this,
                            handler: this.onDetailTransactionClick
                        }]
                }/*,
                 {
                 xtype: 'actioncolumn',
                 width: 30,
                 sortable: false,
                 menuDisabled: true,
                 items: [{
                 icon: 'resources/images/icons/fam/folder_go.png',
                 tooltip: 'Envoyer le dossier en litige',
                 scope: this,
                 handler: this.onSendToLitigeClick
                 }]
                 }*/],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'combobox',
                    //fieldLabel: 'Tiers payant',
                    //allowBlank: false,
                    name: 'lg_TIERS_PAYANT_ID',
                    margins: '0 0 0 10',
                    id: 'lg_TIERS_PAYANT_ID',
                    store: store_tierspayant,
                    valueField: 'lg_TIERS_PAYANT_ID',
                    displayField: 'str_FULLNAME',
                    //typeAhead: true,
                    minChars: 2,
                    queryMode: 'remote',
                    width: 350,
                    pageSize: 10,
                    enableKeyEvents: true,
                    emptyText: 'Sectionner tiers payant...',
                    listConfig: {
                        loadingText: 'Recherche...',
                        emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                        getInnerTpl: function () {
                            return '<span>{str_FULLNAME}</span>';
                        }

                    },
                    listeners: {
                        keypress: function (field, e) {

                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                if (field.getValue().length <= 2) {
                                    field.getStore().load();
                                }

                            }

                        },
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var lg_TIERS_PAYANT_ID = value;
                            var cmp_client = Ext.getCmp('lg_COMPTE_CLIENT_ID');
                            cmp_client.clearValue();
                            cmp_client.store.load({
                                params: {'lg_TIERS_PAYANT_ID': value}
                            });




                            var OGrid = Ext.getCmp('GridFacturationID');
                            var lg_COMPTE_CLIENT_ID = "";
                            if (Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue() !== null && Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue() !== undefined) {
                                lg_COMPTE_CLIENT_ID = Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue();
                            }

                            OGrid.getStore().load({
                                params: {
                                    lg_TIERS_PAYANT_ID: value,
                                    lg_COMPTE_CLIENT_ID: lg_COMPTE_CLIENT_ID,
                                    search_value: Ext.getCmp('rechecher').getValue()
                                }

                            });


                        }
                    }
                }, '-', {
                    xtype: 'combobox',
                    //fieldLabel: 'Tiers payant',
                    //allowBlank: false,
                    name: 'lg_COMPTE_CLIENT_ID',
                    margins: '0 0 0 10',
                    id: 'lg_COMPTE_CLIENT_ID',
                    store: store_client,
                    valueField: 'lg_CLIENT_ID',
                    displayField: 'str_FIRST_LAST_NAME',
                    queryMode: 'local',
                    minChars: 2,
                    width: 350,
                    pageSize: 10,
                    enableKeyEvents: true,
                    emptyText: 'Sectionner client...',
                    listConfig: {
                        loadingText: 'Recherche...',
                        emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                        getInnerTpl: function () {
                            return '<span>{str_FIRST_LAST_NAME}</span>';
                        }

                    },
                    listeners: {
                        keypress: function (field, e) {

                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                if (field.getValue().length <= 2) {
                                    field.getStore().load();
                                }

                            }

                        },
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var lg_TIERS_PAYANT_ID = "";
                            if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null && Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== undefined) {
                                lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                            }
                            var OGrid = Ext.getCmp('GridFacturationID');
                            OGrid.getStore().load({
                                params: {
                                    lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID,
                                    lg_COMPTE_CLIENT_ID: value,
                                    search_value: Ext.getCmp('rechecher').getValue()
                                }

                            });
                        }
                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    hidden: true,
                    maxValue: new Date(),
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            // alert(me.getSubmitValue());
                            valdatedebut = me.getSubmitValue();
                        }
                    }
                }, {
                    xtype: 'datefield',
                    id: 'datefin',
                    name: 'datefin',
                    hidden: true,
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            //alert(me.getSubmitValue());
                            valdatefin = me.getSubmitValue();
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Rech',
                    enableKeyEvents: true,
                    listeners: {
                        specialKey: function (field, e, options) {
                            if (e.getKey() === e.ENTER) {

                                store.load({
                                    params: {
                                        search_value: this.getValue(),
                                        lg_TIERS_PAYANT_ID: Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                                        lg_COMPTE_CLIENT_ID: Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue()
                                    }


                                });
                            }
                        }


                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true,
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            search_value: '',
                            lg_TIERS_PAYANT_ID: '',
                            lg_COMPTE_CLIENT_ID: ''
                        };
                        var val = Ext.getCmp('rechecher').getValue();
                        var lg_TIERS_PAYANT_ID = "";
                        var lg_COMPTE_CLIENT_ID = "";

                        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null) {
                            lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                        }
                        if (Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue() === null) {
                            lg_COMPTE_CLIENT_ID = Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue();
                        }
                        myProxy.setExtraParam('lg_TIERS_PAYANT_ID', lg_TIERS_PAYANT_ID);
                        myProxy.setExtraParam('lg_COMPTE_CLIENT_ID', lg_COMPTE_CLIENT_ID);
                        myProxy.setExtraParam('search_value', val);

                    }

                }
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })

        if (title == "Balance agee detaillee") {
            Ext.getCmp('datedebut').hide();
            Ext.getCmp('datefin').hide();
        }


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onbtnback: function () {
        var xtype = "";
        xtype = "balanceagee";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onPdfClick: function () {
        // alert("ref  " + ref);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_tierspayant;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "Gerer Tiers Payant") {
            xtype = "facturationtierspayant";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "facturationtierspayant";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_tierspayant + 'delete',
                            params: {
                                lg_TIERS_PAYANT_ID: rec.get('lg_TIERS_PAYANT_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                // alert("non ok");
                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    },
    onDetailTransactionClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.tierspayantmanagement.balanceagee_detail.action.BalanceAgeeDetailsClient({
            odatasource: rec.data,
            parentview: this,
            mode: "detail_transaction",
            titre: "Detail transaction du tiers payant  [" + rec.get('str_TIERS_PAYANT') + "]"
        });
    },
    onSendToLitigeClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.litige.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "createlitige",
            titre: "Creation d'un litige pour le dossier  [" + rec.get('str_FIRST_NAME') + " " + rec.get('str_LAST_NAME') + "]"
        });
    },
    onEditpwdClick: function (grid, rowIndex) {

    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        var lg_TIERS_PAYANT_ID = "";
        var lg_COMPTE_CLIENT_ID = "";

        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null) {
            lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        }
        if (Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue() === null) {
            lg_COMPTE_CLIENT_ID = Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue();
        }


        this.getStore().load({
            params: {
                search_value: val.value,
                lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID,
                lg_COMPTE_CLIENT_ID: lg_COMPTE_CLIENT_ID
            }
        });
    }

});