var url_services_data_categorieayantdroit = '../webservices/configmanagement/categorieayantdroit/ws_data.jsp';
var url_services_transaction_categorieayantdroit = '../webservices/configmanagement/categorieayantdroit/ws_transaction.jsp?mode=';

Ext.define('testextjs.view.configmanagement.categorieayantdroit.CategorieAyantdroitManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'categorieayantdroitmanager',
    id: 'categorieayantdroitmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.CategorieAyantdroit',
        'testextjs.view.configmanagement.categorieayantdroit.action.add',
        'Ext.ux.ProgressBarPager'
 
    ],
    title: 'Gestion Categorie Ayant droit',
    plain: true,
    maximizable: true,
   // tools: [{type: "pin"}],
   // closable: true,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.CategorieAyantdroit',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_categorieayantdroit,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store,
            columns: [{
                    header: 'lg_CATEGORIE_AYANTDROIT_ID',
                    dataIndex: 'lg_CATEGORIE_AYANTDROIT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },
                {
                    header: 'Code',
                    dataIndex: 'str_CODE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Libelle',
                    dataIndex: 'str_LIBELLE_CATEGORIE_AYANTDROIT',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onEditClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }],
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
                    name: 'categorieayantdroit',
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
        }),
                this.on('edit', function (editor, e) {

                    Ext.Ajax.request({
                        url: url_services_transaction_categorieayantdroit + 'update',
                        params: {
                            lg_CATEGORIE_AYANTDROIT_ID: e.record.data.lg_CATEGORIE_AYANTDROIT_ID,
                            str_LIBELLE_CATEGORIE_AYANTDROIT: e.record.data.str_LIBELLE_CATEGORIE_AYANTDROIT
                        },
                        success: function (response)
                        {
                            console.log(response.responseText);
                            e.record.commit();
                            store.reload();
                            Ext.MessageBox.alert('Modification de ligne ' + '[' + e.record.data.str_LIBELLE_CATEGORIE_AYANTDROIT + ']', 'Creation effectuee avec succes');
                        },
                        failure: function (response)
                        {
                            console.log("Bug " + response.responseText);
                            alert(response.responseText);
                        }
                    });
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

        new testextjs.view.configmanagement.categorieayantdroit.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Categorie Ayant Droit"
        });
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.categorieayantdroit.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Categorie Ayant Droit  [" + rec.get('lg_CATEGORIE_AYANTDROIT_ID') + "]"
        });

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_categorieayantdroit + 'delete',
                            params: {
                                lg_CATEGORIE_AYANTDROIT_ID: rec.get('lg_CATEGORIE_AYANTDROIT_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_CATEGORIE_AYANTDROIT') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_CATEGORIE_AYANTDROIT') + ']', 'Suppression effectuee avec succes');
//                                    
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
        }, url_services_data_categorieayantdroit);
    }

});