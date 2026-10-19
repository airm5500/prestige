/* global Ext */

var url_services_data_preenregistrement_cloturer = '../webservices/sm_user/preenregistrement/ws_data.jsp?str_STATUT=is_Process';
var url_services_transaction_preenregistrement_cloturer = '../webservices/sm_user/preenregistrement/ws_transaction.jsp?mode=';

var Me;
var str_TYPE_TRANSACTION = "";


Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.caisse.CloturerventeManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'cloturerventemanagerxx',
    id: 'cloturerventemanagerID',
    frame: true,
//    collapsible: true,
    animCollapse: false,
    title: 'Liste Des Ventes',
    iconCls: 'icon-grid',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {str_FAMILLE_ITEM}</p>',
                    {
                        formatChange: function (v) {
                            var color = v >= 0 ? 'green' : 'red';
                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                        }
                    })
        }],
    initComponent: function () {

        url_services_data_preenregistrement_cloturer = '../webservices/sm_user/preenregistrement/ws_data.jsp?str_STATUT=is_Process';
        url_services_transaction_preenregistrement_cloturer = '../webservices/sm_user/preenregistrement/ws_transaction.jsp?mode=';

        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [{str_TYPE_TRANSACTION: 'VNO', str_desc: 'VNO'}, {str_TYPE_TRANSACTION: 'VO', str_desc: 'VO'}]
        });

        Me = this;
        str_TYPE_TRANSACTION = "";

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Preenregistrement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_preenregistrement_cloturer,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        Ext.apply(this, {
            width: '98%',
            height: valheight,
            id: 'Grid_Prevente_ID',
            //  plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_PREENREGISTREMENT_ID',
                    dataIndex: 'lg_PREENREGISTREMENT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Reference',
                    dataIndex: 'str_REF',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'MONTANT',
                    dataIndex: 'int_PRICE',
                    flex: 1,
                    renderer: amountformat,
                    align: 'right'/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 0.6,
                    align: 'center'
                }, {
                    header: 'Heure',
                    dataIndex: 'str_hour',
                    flex: 0.6,
                    align: 'center'
                }/*, {
                 header: 'Date Creation',
                 dataIndex: 'dt_CREATED',
                 flex: 1/*,
                 editor: {
                 allowBlank: false
                 }
                 }*/, {
                    header: 'Type.vente',
                    dataIndex: 'str_TYPE_VENTE',
                    flex: 0.6,
                    align: 'center'
                }, {
                    header: 'Vendeur',
                    dataIndex: 'lg_USER_ID',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
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
                            handler: this.onManageDetailsClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/trash.png',
                            tooltip: 'Mettre dans la corbeille',
                            scope: this,
                            handler: this.onTrashClick
                        }]
                }, {
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
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Nouvelle Vente',
                    scope: this,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'combobox',
                    name: 'str_TYPE_TRANSACTION',
                    margins: '0 0 0 10',
                    id: 'str_TYPE_TRANSACTION',
                    store: store_type,
                    valueField: 'str_TYPE_TRANSACTION',
                    displayField: 'str_desc',
                    editable: false,
                    queryMode: 'remote',
                    width: 450,
                    emptyText: 'Type de vente...',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                },
                {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true,
                pageSize: itemsPerPage, // same store GridPanel is using
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {

                            search_value: '',
                            str_TYPE_VENTE: ''
                        };
                        var str_TYPE_TRANSACTION = "";
                        if (Ext.getCmp('str_TYPE_TRANSACTION').getValue()) {
                            str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
                        }
                        myProxy.setExtraParam('search_value', Ext.getCmp('rechecher').getValue());
                        myProxy.setExtraParam('str_TYPE_VENTE', str_TYPE_TRANSACTION);
                    }

                }
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });


        this.on('edit', function (editor, e) {



            Ext.Ajax.request({
                url: url_services_data_preenregistrement_cloturer + 'update',
                params: {
                    lg_PREENREGISTREMENT_ID: e.record.data.lg_PREENREGISTREMENT_ID,
                    str_REF: e.record.data.str_REF,
                    lg_USER_ID: e.record.data.lg_USER_ID,
                    int_PRICE: e.record.data.int_PRICE

                },
                success: function (response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
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
    onManageDetailsClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var data = {'isEdit': true, 'record': rec.data, 'isDevis': false};
        var xtype = "doventemanager";
        testextjs.app.getController('App').onRedirectTo(xtype, data);
//        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "ECRAN DE VENTE", rec.get('lg_PREENREGISTREMENT_ID'), rec.data);

    },
    onAddClick: function () {
        var xtype = "doventemanager";
        var data = {'isEdit': false, 'record': {}};
        testextjs.app.getController('App').onRedirectTo(xtype, data);
//        testextjs.app.getController('App').onLoadNewComponent(xtype, "ECRAN DE VENTE", "0");

    },

    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_preenregistrement_cloturer + 'deleteprevente',
                            params: {
                                lg_PREENREGISTREMENT_ID: rec.get('lg_PREENREGISTREMENT_ID')
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

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });


    },
    onTrashClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex), str_STATUT = "is_Trash";
        testextjs.app.getController('App').ShowWaitingProcess();
        PrestigeConfirmation.ligne('Message', 'Confirmer l\'envoi de la pr&eacute;vente ' + rec.get('str_REF') + ' dans la corbeille', function () {

                        Ext.Ajax.request({
                            url: url_services_transaction_preenregistrement_cloturer + 'trash',
                            params: {
                                lg_PREENREGISTREMENT_ID: rec.get('lg_PREENREGISTREMENT_ID'),
                                str_STATUT: str_STATUT
                            },
                            success: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
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
        new testextjs.view.sm_user.preenregistrement.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Preenregistrement  [" + rec.get('str_REF') + "]"
        });



    },
    onRechClick: function () {
        var str_TYPE_TRANSACTION = "";
        if (str_TYPE_TRANSACTION != null) {
            str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
        }
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.getValue(),
                str_TYPE_VENTE: str_TYPE_TRANSACTION
            }
        }, url_services_data_preenregistrement_cloturer);
    }

});