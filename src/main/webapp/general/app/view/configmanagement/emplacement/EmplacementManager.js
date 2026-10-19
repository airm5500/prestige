/* global Ext, valheight */

var url_services_data_emplacement = '../webservices/configmanagement/emplacement/ws_data.jsp';
var url_services_transaction_emplacement = '../webservices/configmanagement/emplacement/ws_transaction.jsp?mode=';
var Me_Workflow;


Ext.define('testextjs.view.configmanagement.emplacement.EmplacementManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'emplacement',
    id: 'emplacementID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion Emplacement',
    closable: true,
    frame: true,
    initComponent: function () {
        Me_Workflow = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Emplacement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_emplacement,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_EMPLACEMENT_ID',
                    dataIndex: 'lg_EMPLACEMENT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'str_NAME',
                    dataIndex: 'str_NAME',
                    hidden: true,
                    flex: 1

                }, {
                    header: 'Designation',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1

                }, {
                    header: 'Localite',
                    dataIndex: 'str_LOCALITE',
                    flex: 1
                }, {
                    header: 'Nom',
                    dataIndex: 'str_FIRST_NAME',
                    flex: 1
                }, {
                    header: 'Prenom(s)',
                    dataIndex: 'str_LAST_NAME',
                    flex: 1
                }, {
                    header: 'Telephone',
                    dataIndex: 'str_PHONE',
                    flex: 1
                }, {
                    header: 'Type d&eacute;p&ocirc;t',
                    dataIndex: 'lg_TYPEDEPOT_ID',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Mettre a jour un emplacement',
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
                            tooltip: 'Supprimer un emplacement',
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
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Workflow.onRechClick();

                                }
                            });
                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(),
                listeners: {
                    beforechange: function(page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            search_value: ''
                        };
                        var search_value = Ext.getCmp('rechecher').getValue();
                        myProxy.setExtraParam('search_value', search_value);
                    }

                }
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });


//        this.on('edit', function (editor, e) {
//
//            Ext.Ajax.request({
//                url: url_services_transaction_emplacement + 'update',
//                params: {
//                    lg_EMPLACEMENT_ID: e.record.data.lg_EMPLACEMENT_ID,
//                    str_NAME: e.record.data.str_NAME,
//                    str_CODE: e.record.data.str_CODE
//
//                },
//                success: function (response)
//                {
//                    console.log(response.responseText);
//                    e.record.commit();
//                    store.reload();
//                },
//                failure: function (response)
//                {
//                    console.log("Bug " + response.responseText);
//                    alert(response.responseText);
//                }
//            });
//        });


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });

    },
    onStoreLoad: function () {
    },
    onAddClick: function () {

        new testextjs.view.configmanagement.emplacement.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter un nouvel emplacement",
            type: "emplacementmanager"
        });
    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_emplacement + 'delete',
                            params: {
                                lg_EMPLACEMENT_ID: rec.get('lg_EMPLACEMENT_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }

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
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.emplacement.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Emplacement  [" + rec.get('str_NAME') + "]"
        });
    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_emplacement);
    }

});