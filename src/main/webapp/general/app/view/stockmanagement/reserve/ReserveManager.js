var url_services_data_reserve = '../api/v1/reserve/articles';
var url_services_transaction_reserve = '../api/v1/reserve/';
var url_services_reassort_batch = '../api/v1/reserve/reassort-batch';

var Me;
Ext.define('testextjs.view.stockmanagement.reserve.ReserveManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'reservemanager',
    id: 'reservemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des reserves',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function() {
        Me = this;
        var itemsPerPage = 20;

        var store = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_reserve,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [{str_TYPE_TRANSACTION: 'ALL', str_desc: 'Tous'}, {str_TYPE_TRANSACTION: 'REASSORT', str_desc: 'Les articles a reassortir'}]
        });

        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });


        Ext.apply(this, {
            width: '98%',
            height: valheight,
            plugins: [this.cellEditing],
            store: store,
            id: 'GridReserveID',
            columns: [{
                    header: 'lg_FAMILLE_ID',
                    dataIndex: 'lg_FAMILLE_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 1
                },
                {
                    header: 'Designation',
                    dataIndex: 'str_NAME',
                    flex: 1
                },
                {
                    header: 'Emplacement',
                    dataIndex: 'lg_ZONE_GEO_ID',
                    flex: 1
                },
                {
                    header: 'Stock Rayon',
                    dataIndex: 'int_STOCK_RAYON',
                    align: 'center',
                    flex: 1,
                    renderer: function (v, m, r) {
                        var seuil = r.get('int_SEUIL_RESERVE');
                        if (seuil > 0 && v < seuil) {
                            m.style = 'color:red; font-weight:bold; background-color:#F5BCA9;';
                        }
                        return v;
                    }
                },
                {
                    header: 'Stock Reserve',
                    dataIndex: 'int_STOCK_RESERVE',
                    align: 'center',
                    flex: 1
                },
                {
                    header: 'Seuil',
                    dataIndex: 'int_SEUIL_RESERVE',
                    align: 'center',
                    flex: 1
                },
                {
                    header: 'Suggere',
                    dataIndex: 'int_QTE_SUGGEREE',
                    align: 'center',
                    flex: 1,
                    renderer: function (v, m) {
                        if (v > 0) {
                            m.style = 'color:#6600cc; font-weight:bold;';
                            return v;
                        }
                        return '';
                    }
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/add.png',
                            tooltip: 'Faire un assort',
                            scope: this,
                            handler: this.onAssortClick,
                            getClass: function(value, metadata, record) {
                                if (record.get('int_STOCK_RAYON') > 0) {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Faire un reassort',
                            scope: this,
                            handler: this.onRemoveClick,
                            getClass: function(value, metadata, record) {
                                if (record.get('int_STOCK_RESERVE') > 0) {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [/*{
             text: 'Ajouter',
             scope: this,
             tooltip: 'Ajouter un article en reserve',
             handler: this.onAddClick
             }, */{
                    xtype: 'combobox',
                    name: 'str_TYPE_TRANSACTION',
                    margins: '0 0 0 10',
                    id: 'str_TYPE_TRANSACTION',
                    store: store_type,
                    valueField: 'str_TYPE_TRANSACTION',
                    displayField: 'str_desc',
                    typeAhead: true,
                    queryMode: 'remote',
//                    flex: 1,
                    emptyText: 'Filtre article...',
                    listeners: {
                        select: function(cmp) {
                            var value = cmp.getValue();

                            var OGrid = Ext.getCmp('GridReserveID');
                            OGrid.getStore().getProxy().url = url_services_data_reserve + "?str_TYPE_TRANSACTION=" + value;
                            OGrid.getStore().reload();
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Rech'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }, '-', {
                    text: 'Tout reassortir selon suggestions',
                    id: 'btn_reassort_batch',
                    scope: this,
                    handler: this.onReassortBatch
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
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
    },
    onReassortBatch: function() {
        var grid = Ext.getCmp('GridReserveID');
        var items = [];
        grid.getStore().each(function(rec) {
            var qte = rec.get('int_QTE_SUGGEREE');
            if (qte > 0) {
                items.push({lg_FAMILLE_ID: rec.get('lg_FAMILLE_ID'), int_QTE: qte});
            }
        });

        if (items.length === 0) {
            Ext.MessageBox.alert('Message', 'Aucun article a reassortir selon les suggestions.');
            return;
        }

        Ext.MessageBox.confirm('Message',
                'Reassortir ' + items.length + ' article(s) selon les quantites suggerees ?',
                function(btn) {
                    if (btn === 'yes') {
                        var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Traitement en cours');
                        Ext.Ajax.request({
                            method: 'POST',
                            url: url_services_reassort_batch,
                            jsonData: {items: items},
                            success: function(response) {
                                progress.hide();
                                var res = Ext.JSON.decode(response.responseText, true);
                                Ext.MessageBox.alert('Resultat',
                                        (res.traites || 0) + ' / ' + (res.total || 0) + ' reassort(s) effectue(s).');
                                grid.getStore().reload();
                            },
                            failure: function(response) {
                                progress.hide();
                                Ext.MessageBox.alert('Erreur', 'Echec du traitement par lot.');
                            }
                        });
                    }
                });
    },
    onAssortClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.stockmanagement.reserve.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "assort",
            titre: "Assort de l'article [" + rec.get('str_NAME') + "]"
        });
    },
    onAddClick: function() {
        new testextjs.view.stockmanagement.reserve.action.addToReserve({
            odatasource: "",
            parentview: this,
            mode: "assort",
            titre: "Ajouter un article dans la reserve"
        });
    },
    onRemoveClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.stockmanagement.reserve.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "reassort",
            titre: "Reassort de l'article [" + rec.get('str_NAME') + "]"
        });
    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        var str_TYPE_TRANSACTION = "ALL";

        if (Ext.getCmp('str_TYPE_TRANSACTION').getValue() == null) {
            str_TYPE_TRANSACTION = "ALL";
        } else {
            str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
        }

        this.getStore().load({
            params: {
                search_value: val.value,
                str_TYPE_TRANSACTION: str_TYPE_TRANSACTION
            }
        }, url_services_data_reserve);
    }

});