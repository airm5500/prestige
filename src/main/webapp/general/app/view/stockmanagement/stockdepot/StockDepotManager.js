var url_services_data_stockdepot = '../webservices/stockmanagement/stockdepot/ws_data.jsp';
var url_services_transaction_stockdepot = '../webservices/stockmanagement/stockdepot/ws_transaction.jsp?mode=';
var url_services_data_famille_article = '../webservices/configmanagement/famillearticle/ws_data.jsp';

//var valdatedebut;
//var valdatefin;
Ext.define('testextjs.view.stockmanagement.stockdepot.StockDepotManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'stockdepot',  
    id: 'stockdepotID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.FacturationClientTierspayant',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Suivi de stock depot',
    plain: true,
    maximizable: true,
    tools: [{type: "pin"}],
    closable: true,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;

        var store = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_stockdepot,
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


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });


        Ext.apply(this, {
            width: 1000,
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            id: 'GridEtatStockID',
            columns: [/*{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    sortable: true/*,
                     locked: true
                },*/ {
                    header: 'lg_FAMILLE_ID',
                    dataIndex: 'lg_FAMILLE_ID',
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                },{
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 1/*,
                     editor: {
                     allowBlank: false  
                     }*/
                },
                {
                    header: 'Designation',
                    dataIndex: 'str_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                },
                {
                    header: 'Famille article',
                    dataIndex: 'lg_FAMILLEARTICLE_ID',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                },
                {
                    header: 'TVA',
                    dataIndex: 'str_CODE_TVA',
                    flex: 1

                }, {
                    header: 'Seuil reappro',
                    dataIndex: 'int_STOCK_REAPROVISONEMENT',
                    flex: 1
                }, {
                    header: 'Prix.Vente TTC',
                    dataIndex: 'int_PRICE',
                    flex: 1
                }, {
                    header: 'Prix.Achat HT',
                    dataIndex: 'int_NUMBER_ENTREE',
                    flex: 1
                }, {
                    header: 'Stock',
                    dataIndex: 'int_NUMBER',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Faire un destockage',
                            scope: this,
                            handler: this.onDestockClick
                        }]
                }/*,
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/add.png',
                            tooltip: 'Faire une entree en stock',
                            scope: this,
                            handler: this.onAddProductClick
                        }]
                }*/],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [/*{
                    xtype: 'combobox',
                    name: 'lg_FAMILLEARTICLE_ID',
                    margins: '0 0 0 10',
                    id: 'lg_FAMILLEARTICLE_ID',
                    store: store_famille_article,
                    valueField: 'lg_FAMILLEARTICLE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    emptyText: 'Selectionner famille article...',
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var OGrid = Ext.getCmp('GridEtatStockID');
                            var lg_GROSSISTE_ID = "";
                            var lg_ZONE_GEO_ID = "";

                            if (Ext.getCmp('lg_GROSSISTE_ID').getValue() == null) {
                                lg_GROSSISTE_ID = "";
                            } else {
                                lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                            }
                            if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() == null) {
                                lg_ZONE_GEO_ID = "";
                            } else {
                                lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
                            }
                            var url_services_data_stockdepot = '../webservices/stockmanagement/stock/ws_data.jsp';
                            OGrid.getStore().getProxy().url = url_services_data_stockdepot + "?lg_FAMILLEARTICLE_ID=" + value + "&lg_GROSSISTE_ID="+lg_GROSSISTE_ID+"&lg_ZONE_GEO_ID="+lg_ZONE_GEO_ID;
                            OGrid.getStore().reload();
                        }
                    }
                }, '-',*/ {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Rech'
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
                displayInfo: true
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


    },
    onDestockClick: function (grid, rowIndex) {
         var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.stockmanagement.stockdepot.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "destockage",
            titre: "Destockage de l'article [" + rec.get('str_NAME') + "]"
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
        
        new testextjs.view.stockmanagement.stockdepot.action.editjourvente({
            odatasource: "",
            parentview: this,
            mode: "update",
            titre: "MAJ Nbre.Jour Vente"
        });
    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
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
                    });


    },
    onAddProductClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.stockdepot.action.add({
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

        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_stockdepot);
    }

});