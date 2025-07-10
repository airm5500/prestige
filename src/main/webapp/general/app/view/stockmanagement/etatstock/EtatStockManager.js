/* global Ext */

var url_services_data_etatstock_first = '../webservices/stockmanagement/stock/ws_data.jsp';
var url_services_transaction_etatstock = '../webservices/stockmanagement/stock/ws_transaction.jsp?mode=';
var url_services_data_zonegeo = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_data_grossiste = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_dci = '../webservices/configmanagement/dci/ws_data.jsp';
var url_services_data_famille_article = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var Me;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.stockmanagement.etatstock.EtatStockManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'etatstock',
    id: 'etatstockID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.FacturationClientTierspayant',
        'Ext.ux.ProgressBarPager'/*,
         'Ext.ux.grid.Printer'*/

    ],
    title: 'Etat de stock',

    frame: true,
    initComponent: function () {

        Me = this;
        var itemsPerPage = 20;
        // alert("itemsPerPage "+itemsPerPage);

        var store = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_etatstock_first,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 180000
            }

        });
        url_services_data_zonegeo = '../webservices/configmanagement/zonegeographique/ws_data.jsp';

        var store_zonegeo = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeo,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var store_grossiste = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                  url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var store_dci = new Ext.data.Store({
            model: 'testextjs.model.Dci',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_dci,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var store_famille_article = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famille_article,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var zonestore = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/stockmanagement/stock/ws_zone.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });


        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [{str_TYPE_TRANSACTION: 'LESS', str_desc: 'Inferieur a'}, {str_TYPE_TRANSACTION: 'MORE', str_desc: 'Superieur a'}, {str_TYPE_TRANSACTION: 'EQUAL', str_desc: 'Egal a'},
                {str_TYPE_TRANSACTION: 'LESSOREQUAL', str_desc: 'Inferieur ou egal a'},
                {str_TYPE_TRANSACTION: 'MOREOREQUAL', str_desc: 'Superieur ou egal a'}/*,{str_TYPE_TRANSACTION: 'SEUIL', str_desc: 'Seuil atteint'}*/]
        });


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });
        Ext.apply(this, {
            width: '98%',
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            id: 'GridEtatStockID',
            columns: [{
                    header: 'lg_FAMILLE_ID',
                    dataIndex: 'lg_FAMILLE_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 0.6
                },
                {
                    header: 'Designation',
                    dataIndex: 'str_NAME',
                    flex: 2


                },

                {
                    header: 'TVA',
                    dataIndex: 'str_CODE_TVA',
                    align: 'right',
                    flex: 0.5

                }

                , {
                    header: 'Fournisseur',
                    dataIndex: 'lg_GROSSISTE_ID',
                    flex: 1.5
                }, {
                    header: 'Seuil reappro',
                    dataIndex: 'int_STOCK_REAPROVISONEMENT',
                    flex: 0.7
                }, {
                    header: 'Prix.Vente TTC',
                    dataIndex: 'int_PRICE',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                }, {
                    header: 'Prix.Achat HT',
                    dataIndex: 'int_NUMBER_ENTREE',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                }, {
                    header: 'Code Emplacement',
                    dataIndex: 'CODEEMPLACEMENT',
                    flex: 1.5,
                    editor: {
                        xtype: 'combobox',
                        allowBlank: true,
//                        selectOnFocus: true,
                        store: zonestore,
                        valueField: 'str_CODE',
                        displayField: 'str_CODE',
                        pageSize: 10,
                        typeAhead: true,
                        minChars: 2,

                        queryMode: 'remote',

                        enableKeyEvents: true,
                        listeners: {
                            select: function (field) {
                                /* if (e.getKey() === e.ENTER) {*/

                                var grid = Ext.getCmp('GridEtatStockID');
                                var record = grid.getSelectionModel().getSelection();

                                Ext.Ajax.request({
                                    url: '../webservices/stockmanagement/stock/ws_transaction.jsp',
                                    params: {
                                        lg_FAMILLE_ID: record[0].get("lg_FAMILLE_ID"),
                                        CODEEMPLACEMENT: field.getValue()

                                    },
                                    success: function (response)
                                    {
                                        var obj = Ext.decode(response.responseText);

                                        if (obj.status === 1) {
                                            Ext.MessageBox.alert('Modification de la ligne ' + '[' + record[0].get("int_CIP") + ']', 'Modification effectu&eacute;e avec succ&egrave;s');
//                            
                                        } else {

                                            Ext.MessageBox.alert('Modification de la ligne ' + '[' + record[0].get("int_CIP") + ']', "Erreur de modification");
                                        }


                                    },
                                    failure: function (response)
                                    {

                                    }
                                });

                            }
                        }

                    }

                }, {
                    header: 'Stock',
                    dataIndex: 'int_NUMBER',
//                    renderer: amountformat,
                    align: 'right',
                    flex: 0.5,
                    renderer: function (v, m, r) {
                        var afficherStock = r.data.afficherStock;
                        if (afficherStock) {
                            return v;

                        } else {
                            return '';
                        }

                    }
                }],
            selModel: {
                selType: 'cellmodel'
            },

            tbar: [{
                    xtype: 'combobox',
                    name: 'str_TYPE_TRANSACTION',
                    margins: '0 0 0 10',
                    id: 'str_TYPE_TRANSACTION',
                    store: store_type,
                    valueField: 'str_TYPE_TRANSACTION',
                    displayField: 'str_desc',
                    typeAhead: true,
                    flex: 1,
                    queryMode: 'local',
//                    flex: 1,
                    emptyText: 'Filtre stock...',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    width: 80,
                    id: 'int_NUMBER',

                    emptyText: 'Qte.Stock',
                    enableKeyEvents: true,
                    listeners: {
                        specialKey: function (field, e, options) {
                            if (e.getKey() === e.ENTER) {
                                Me.onRechClick();
                            }
                        }
                    }


                }



                , '-', {
                    xtype: 'combobox',
                    name: 'lg_DCI_ID',
                    margins: '0 0 0 10',
                    id: 'lg_DCI_ID',
                    hidden: true,
                    store: store_dci,
                    valueField: 'lg_DCI_ID',
                    displayField: 'str_NAME',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    emptyText: 'Selectionner un DCI...',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }

                    }
                }, '-', {
                    xtype: 'combobox',
                    name: 'lg_FAMILLEARTICLE_ID',
                    margins: '0 0 0 10',
                    id: 'lg_FAMILLEARTICLE_ID',
                    store: store_famille_article,
                    valueField: 'lg_FAMILLEARTICLE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: true,
                    pageSize: itemsPerPage,
                    queryMode: 'remote',
                    flex: 1,
                    emptyText: 'Selectionner famille article...',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }
                    }
                },
                {
                    xtype: 'combobox',
                    name: 'lg_ZONE_GEO_ID',
                    margins: '0 0 0 10',
                    id: 'lg_ZONE_GEO_ID',
                    store: store_zonegeo,
                    valueField: 'lg_ZONE_GEO_ID',
                    pageSize: itemsPerPage,
                    displayField: 'str_LIBELLEE',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    emptyText: 'Sectionner zone geographique...',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }
                    }
                }, '-', {
                    xtype: 'combobox',
                    name: 'lg_GROSSISTE_ID',
                    margins: '0 0 0 10',
                    id: 'lg_GROSSISTE_ID',
                    store: store_grossiste,
                    //disabled: true,
                    valueField: 'lg_GROSSISTE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: true,
                    queryMode: 'remote',
                    pageSize: 999,
                    flex: 1,
                    emptyText: 'Sectionner fournisseur...',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }
                    }
                }, {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Rech',
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
                    iconCls: 'ventesearch',
                    handler: this.onRechClick
                },
                {
                    text: 'Imprimer',
                    tooltip: 'Imprimer',
                    iconCls: 'importicon',
                    with : 100,
                    scope: this,
                    handler: function () {
                        var val = Ext.getCmp('rechecher').getValue();
                        var lg_FAMILLEARTICLE_ID = "";
                        var lg_ZONE_GEO_ID = "";
                        var lg_GROSSISTE_ID = "";
                        var int_NUMBER = "", str_TYPE_TRANSACTION = "";
                        if (Ext.getCmp('str_TYPE_TRANSACTION').getValue() !== null) {
                            str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
                        }
                        if (Ext.getCmp('int_NUMBER').getValue() !== null) {
                            int_NUMBER = Ext.getCmp('int_NUMBER').getValue();
                        }
                        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
                            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                        }
                        if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() !== null) {
                            lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
                        }
                        if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() !== null) {
                            lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
                        }
                        var linkUrl = "../webservices/stockmanagement/stock/ws_etatstock_pdf.jsp?lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + val + "&int_NUMBER=" + int_NUMBER + "&str_TYPE_TRANSACTION=" + str_TYPE_TRANSACTION;
                        window.open(linkUrl);
                    }
                }



            ],
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
                            lg_FAMILLEARTICLE_ID: '',
                            lg_ZONE_GEO_ID: '',
                            lg_GROSSISTE_ID: '',
                            lg_DCI_ID: '',
                            int_NUMBER: '',
                            str_TYPE_TRANSACTION: ''
                        };

                        var int_NUMBER = Ext.getCmp('int_NUMBER').getValue();
                        var str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
                        var lg_DCI_ID = Ext.getCmp('lg_DCI_ID').getValue(),
                                lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                                lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue(),
                                lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue(), search_value = Ext.getCmp('rechecher').getValue();
                        myProxy.setExtraParam('lg_FAMILLEARTICLE_ID', lg_FAMILLEARTICLE_ID);
                        myProxy.setExtraParam('lg_ZONE_GEO_ID', lg_ZONE_GEO_ID);
                        myProxy.setExtraParam('lg_DCI_ID', lg_DCI_ID);
                        myProxy.setExtraParam('lg_GROSSISTE_ID', lg_GROSSISTE_ID);
                        myProxy.setExtraParam('search_value', search_value);
                        myProxy.setExtraParam('int_NUMBER', int_NUMBER);
                        myProxy.setExtraParam('str_TYPE_TRANSACTION', str_TYPE_TRANSACTION);

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
    onAssortClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.reserve.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "assort",
            titre: "Assort de l'article [" + rec.get('str_NAME') + "]"
        });
    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onAddClick: function () {

        new testextjs.view.stockmanagement.etatstock.action.editjourvente({
            odatasource: "",
            parentview: this,
            mode: "update",
            titre: "MAJ Nbre.Jour Vente"
        });
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
    onAddProductClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.etatstock.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "create",
            titre: "Ajout d'article [" + rec.get('str_NAME') + "]"
        });
    },
    onEditPhotoClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.tierspayantmanagement.tierspayant.action.addPhoto({
            odatasource: rec.data,
            parentview: this,
            mode: "updatephoto",
            titre: "Modification photo Tiers Payant  [" + rec.get('str_NAME') + "]"
        });
    },
    onEditpwdClick: function (grid, rowIndex) {

    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        var lg_FAMILLEARTICLE_ID = "";
        var lg_ZONE_GEO_ID = "";
        var lg_GROSSISTE_ID = "";
        var lg_DCI_ID = "";
        var int_NUMBER = "";
        var str_TYPE_TRANSACTION = "";
        if (Ext.getCmp('str_TYPE_TRANSACTION').getValue() !== null) {
            str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
        }
        if (Ext.getCmp('lg_DCI_ID').getValue() !== null) {
            lg_DCI_ID = Ext.getCmp('lg_DCI_ID').getValue();
        }
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        }
        if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() !== null) {
            lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
        }
        if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() !== null) {
            lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
        }
        if (Ext.getCmp('int_NUMBER').getValue() !== null) {
            int_NUMBER = Ext.getCmp('int_NUMBER').getValue();
        }
        this.getStore().load({
            params: {
                search_value: val.getValue(),
                lg_FAMILLEARTICLE_ID: lg_FAMILLEARTICLE_ID,
                lg_ZONE_GEO_ID: lg_ZONE_GEO_ID,
                lg_GROSSISTE_ID: lg_GROSSISTE_ID,
                lg_DCI_ID: lg_DCI_ID,
                int_NUMBER: int_NUMBER,
                str_TYPE_TRANSACTION: str_TYPE_TRANSACTION
            }
        });

    }

});