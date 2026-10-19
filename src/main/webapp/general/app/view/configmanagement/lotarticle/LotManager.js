var url_services_data_lotarticle = '../webservices/configmanagement/lotarticle/ws_data.jsp';
var url_services_transaction_lotarticle = '../webservices/configmanagement/lotarticle/ws_transaction.jsp?mode=';


Ext.define('testextjs.view.configmanagement.lotarticle.LotManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'lotfamillemanager',
    id: 'lotfamillemanagerID',
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
    title: 'Gestion des Lots d\'article',
    closable: true,
    frame: true,
    initComponent: function () {



        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Lot',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_lotarticle,
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
            width: 950,
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            id: 'GridlotID',
            columns: [{
                    header: 'lg_LOT_ID',
                    dataIndex: 'lg_LOT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Description',
                    dataIndex: 'str_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false 
                     }*/
                }, {
                    header: 'Article',
                    dataIndex: 'lg_FAMILLE_ID',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Quantite',
                    dataIndex: 'int_QUANTITE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Quantite total.famille',
                    dataIndex: 'int_QUANTITE_FAMILLE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Quantite article/lot',
                    dataIndex: 'int_QUANTITE_FAMILLE_BYLOT',
//                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }



                }, {
                    header: 'Date peromption',
                    dataIndex: 'dt_PEROMPTION',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                },
                /* {
                 xtype: 'actioncolumn',
                 width: 30,
                 sortable: false,
                 menuDisabled: true,
                 items: [{
                 icon: 'resources/images/icons/fam/delete.png',
                 tooltip: 'Supprimer',
                 scope: this,
                 handler: this.onRemoveClick
                 }]
                 },*/],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
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
        });


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onAddClick: function () {
        new testextjs.view.stockmanagement.etatstock.action.add({
//        new testextjs.view.configmanagement.lotarticle.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Entree de stock"
        });
    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_lotarticle + 'delete',
                            params: {
                                lg_LOT_ID: rec.get('lg_LOT_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });


    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_lotarticle);
    }

})