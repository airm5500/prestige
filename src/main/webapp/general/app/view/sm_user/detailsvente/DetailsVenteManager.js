var url_services_data_detailsvente = '../webservices/sm_user/detailsvente/ws_data.jsp';
var url_services_transaction_detailsvente = '../webservices/sm_user/detailsvente/ws_transaction.jsp';
var Me;
var Omode;
Ext.define('testextjs.view.sm_user.detailsvente.DetailsVenteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'detailsventemanager',
    id: 'detailsventemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.DetailsVente',
        //  'testextjs.view.sm_user.menu.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Details Vente',
     plain: true,
        maximizable: true,
        tools: [{type: "pin"}],
        closable: true,
    frame: true, config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        nameintern: ''
    },
    initComponent: function() {


        Oview = this.getParentview();
        Omode = this.getMode();


        this.setTitle("Details de la Vente Ref :: " + this.getOdatasource().str_REF + "  du Vendeur :: " + this.getOdatasource().lg_USER_ID);

        url_services_data_detailsvente = url_services_data_detailsvente + "?lg_PREENREGISTREMENT_ID=" + this.getOdatasource().lg_PREENREGISTREMENT_ID;

        // alert("this.getOdatasource().lg_PREENREGISTREMENT_ID  " + th().lg_PREENREGISTREMENT_IDis.getOdatasource().lg_PREENREGISTREMENT_ID);

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.DetailsVente',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detailsvente,
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
            columns: [{
                    header: 'lg_PREENREGISTREMENT_DETAIL_ID',
                    dataIndex: 'lg_PREENREGISTREMENT_DETAIL_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'PREENREGISTREMENT',
                    dataIndex: 'lg_PREENREGISTREMENT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Ref.Vente',
                    dataIndex: 'str_REF',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Famille',
                    dataIndex: 'lg_FAMILLE_ID',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Quantite',
                    dataIndex: 'int_QUANTITY',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Prix',
                    dataIndex: 'int_PRICE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }


                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/book.png',
                            tooltip: 'Gerer Produit',
                            scope: this,
                            handler: this.onEditClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Delete',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    text: 'Annuler',
                    scope: this,
                    handler: this.onRetourClick
                }, '-',
                /*{
                    text: 'Ajouter',
                    scope: this,
                    handler: this.onAddClick
                }, '-', */{
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
                pageSize: 10,
                store: store,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


        this.on('edit', function(editor, e) {



            Ext.Ajax.request({
                url: url_services_transaction_detailsvente + 'update',
                params: {
                    lg_PREENREGISTREMENT_DETAIL_ID: e.record.data.lg_PREENREGISTREMENT_DETAIL_ID,
                    lg_PREENREGISTREMENT_ID: e.record.data.lg_PREENREGISTREMENT_ID,
                    lg_FAMILLE_ID: e.record.data.lg_FAMILLE_ID,
                    int_QUANTITY: e.record.data.int_QUANTITY,
                    int_PRICE: e.record.data.int_PRICE
                },
                success: function(response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function(response)
                {
                    console.log("Bug " + response.responseText);
                    alert(response.responseText);
                }
            });
        });


    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
    },
    onAddClick: function() {
        new testextjs.view.sm_user.detailsvente.action.add({
            //    odatasource: hidden: true,,
            parentview: this,
            mode: "create",
            titre: "Ajouter Produit"
        });
    }, onRetourClick: function() {
        var xtype = "preenregistrementmanager";
        testextjs.app.getController('App').onLoadNewComponent(xtype, "", "", "");
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_detailsvente + 'delete',
                            params: {
                                lg_PREENREGISTREMENT_DETAIL_ID: rec.get('lg_PREENREGISTREMENT_DETAIL_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();
                            },
                            failure: function(response)
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
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

       // alert("edit");
        new testextjs.view.sm_user.detailsvente.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Produit [" + rec.get('lg_FAMILLE_ID') + "]"
        });



    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_detailsvente);
    }

})