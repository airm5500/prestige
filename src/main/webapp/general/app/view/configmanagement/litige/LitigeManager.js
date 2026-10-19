/* global Ext */

var url_services_data_litige = '../webservices/configmanagement/litige/ws_data.jsp';
var url_services_data_typelitige = '../webservices/configmanagement/litige/ws_data_typelitige.jsp';
var url_services_transaction_litige = '../webservices/configmanagement/litige/ws_transaction.jsp?mode=';
var Me;
Ext.define('testextjs.view.configmanagement.litige.LitigeManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'litige',
    id: 'litigeID',
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
    title: 'Gestion des litiges',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function () {
        Me = this;
        var itemsPerPage = 20;

        var store = new Ext.data.Store({
            model: 'testextjs.model.Litige',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_litige,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_type_litige = new Ext.data.Store({
            model: 'testextjs.model.TypeLitige',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typelitige,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_type = new Ext.data.Store({
            fields: ['str_TYPE', 'str_desc'],
            data: [{str_TYPE: 'ALL', str_desc: 'Tous'}, {str_TYPE: 'MANQUANT', str_desc: 'Litiges non-abouti'}]
        });
        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });


        Ext.apply(this, {
            width: '98%',
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            id: 'GridLitigeID',
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    id: 'num_ligne',
                    dataIndex: 'num_ligne',
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: 'lg_LITIGE_ID',
                    dataIndex: 'lg_LITIGE_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Libelle',
                    dataIndex: 'str_LIBELLE',
                    flex: 1
                }, {
                    header: 'Commentaire',
                    dataIndex: 'str_COMMENTAIRE_LITIGE',
                    flex: 1
                },
                {
                    header: 'Reference',
                    dataIndex: 'str_REFERENCE',
                    flex: 1
                },
                {
                    header: 'Type litige',
                    dataIndex: 'str_TYPE_LITIGE',
                    flex: 1
                }, {
                    header: '&Eacute;tat',
                    dataIndex: 'str_ETAT_LITIGE',
                    flex: 1
                }, {
                    header: 'Date de creation',
                    dataIndex: 'str_REF_CREATED',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/application_view_list.png',
                            tooltip: 'Visualisation de la vente li&eacute;e qui a gen&eacute;re un litige',
                            scope: this,
                            handler: this.onDetailClick
                        }]
                },
//                {
//                    xtype: 'actioncolumn',
//                    width: 30,
//                    sortable: false,
//                    menuDisabled: true,
//                    items: [{
//                            icon: 'resources/images/icons/fam/paste_plain.png',
//                            tooltip: 'Editer un litige',
//                            scope: this,
//                            handler: this.onEditClick
//                        }]
//                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{

                            getClass: function (v, meta, rec) {

                                if (rec.get('str_STATUT') !== "is_Closed") {
                                    return 'unpaid';
                                } else {
                                    return 'regle';
                                }
                            },
                            getTip: function (v, meta, rec) {
                                if (rec.get('str_STATUT') !== "is_Closed") {
                                    return 'Cloturer le litige';
                                } else {
                                    return ' ';
                                }
                            },

//                            icon: 'resources/images/icons/fam/delete.png',
//                            tooltip: 'Cloturer un litige',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    text: 'Cr&eacute;er',
                    iconCls: 'addicon',
                    tooltip: 'Cr&eacute;er un litige',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'combobox',
                    name: 'lg_TYPELITIGE_ID',
                    margins: '0 0 0 10',
                    id: 'lg_TYPELITIGE_ID',
                    store: store_type_litige,
                    valueField: 'lg_TYPELITIGE_ID',
                    displayField: 'str_DESCRIPTION',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1.5,
                    emptyText: 'Type litige...',
                    listeners: {
                        select: function (cmp) {
                            Ext.getCmp('GridLitigeID').getStore().load({lg_TYPELITIGE_ID: cmp.getValue()});

                        }
                    }
                }, '-', {
                    xtype: 'combobox',
                    name: 'str_TYPE',
                    margins: '0 0 0 10',
//                    fieldLabel: 'Filtre:',
                    id: 'str_TYPE',
                    store: store_type,
                    valueField: 'str_TYPE',
                    displayField: 'str_desc',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1.5,
                    emptyText: 'Filtre litiges...',
                    listeners: {
                        select: function (cmp) {
                            Ext.getCmp('GridLitigeID').getStore().load({});
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Rech',
                    enableKeyEvents: true,
                    width: 200,
                    listeners: {
                        specialKey: function (field, e, option) {
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
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onAddClick: function () {
        new testextjs.view.configmanagement.litige.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Creer un litige"
        });
    },
    onDetailClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
//        new testextjs.view.configmanagement.litige.action.detailLitige({
        new testextjs.view.configmanagement.litige.action.detailTransactionLitige({
            odatasource: rec.data,
            parentview: this,
            mode: "detail",
            titre: "Detail du litige pour le dossier  [" + rec.get('str_FIRST_LAST_NAME') + "/" + rec.get('str_ORGANISME') + "]"
        });
    },
    onRemoveClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        if (rec.get('str_STATUT') !== "is_Closed") {
            PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {

                            Ext.Ajax.request({
                                url: url_services_transaction_litige + 'delete',
                                params: {
                                    lg_LITIGE_ID: rec.get('lg_LITIGE_ID')
                                },
                                success: function (response)
                                {
                                    var object = Ext.JSON.decode(response.responseText, false);
                                    if (object.success === 0) {
                                        Ext.MessageBox.alert('Error Message', object.errors);
                                        return;
                                    } else {
                                        Ext.MessageBox.alert('Confirmation', object.errors);
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
        }


    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        var lg_TYPELITIGE_ID = "";
        var str_TYPE = "";
//
        if (Ext.getCmp('str_TYPE').getValue() != null) {
            str_TYPE = Ext.getCmp('str_TYPE').getValue();
        }

        if (Ext.getCmp('lg_TYPELITIGE_ID').getValue() != null) {
            lg_TYPELITIGE_ID = Ext.getCmp('lg_TYPELITIGE_ID').getValue();
        }

        this.getStore().load({
            params: {
                search_value: val.value,
                lg_TYPELITIGE_ID: lg_TYPELITIGE_ID,
                str_TYPE: str_TYPE
            }
        }, url_services_data_litige);
    }

});