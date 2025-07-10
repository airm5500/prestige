/* global Ext */


var url_services_transaction_suggerercmde = '../webservices/sm_user/suggerercde/ws_transaction.jsp?mode=';
var Me;



Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
var _myAppController;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.suggestion.Suggestion_Manager', {
    extend: 'Ext.grid.Panel',
    xtype: 'i_sugg_manager',
    id: 'i_sugg_managerID',
    frame: true,
    animCollapse: false,
    title: 'Liste Suggestion',
    plain: true,
    maximizable: true,
    closable: false,

    initComponent: function () {
        _myAppController = Ext.create('testextjs.controller.App', {});
        Me = this;

        const itemsPerPage = 18;
        const store_suggestion = new Ext.data.Store({

            fields: [
                {
                    name: 'lg_SUGGESTION_ORDER_ID',
                    type: 'string'
                },

                {
                    name: 'str_REF',
                    type: 'string'
                },

                {
                    name: 'int_NOMBRE_ARTICLES',
                    type: 'string'
                },
                {
                    name: 'lg_GROSSISTE_ID',
                    type: 'string'
                },
                {
                    name: 'int_NUMBER',
                    type: 'number'
                },
                {
                    name: 'dt_UPDATED',
                    type: 'string'
                },
                {
                    name: 'str_STATUT',
                    type: 'String'
                },

                {
                    name: 'lg_FAMILLE_PRIX_VENTE',
                    type: 'String'
                },
                {
                    name: 'lg_FAMILLE_PRIX_ACHAT',
                    type: 'string'
                },
                {
                    name: 'dt_CREATED',
                    type: 'String'
                },
                {
                    name: 'str_FAMILLE_ITEM',
                    type: 'string'
                },

                {
                    name: 'int_TOTAL_VENTE',
                    type: 'number'
                },
                {
                    name: 'int_TOTAL_ACHAT',
                    type: 'number'
                },
                {
                    name: 'int_DATE_BUTOIR_ARTICLE',
                    type: 'int'
                }
            ],
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/suggestion/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store_suggestion,
            columns: [
                {
                    header: 'lg_SUGGESTION_ORDER_ID',
                    dataIndex: 'lg_SUGGESTION_ORDER_ID',
                    hidden: true,
                    flex: 1


                },
                {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45


                },

                {
                    header: 'REF',
                    dataIndex: 'str_REF',
                    flex: 1
                },
                {
                    header: 'GROSSISTE',
                    dataIndex: 'lg_GROSSISTE_ID',
                    flex: 1
                },

                {
                    header: 'NOMBRE.LIGNE',
                    dataIndex: 'int_NOMBRE_ARTICLES',
                    flex: 1
                },
                {
                    header: 'QTE.ARTICLES',
                    dataIndex: 'int_NUMBER',
                    flex: 1
                },

                {
                    header: 'STATUT',
                    dataIndex: 'str_STATUT',
                    flex: 1,
                    renderer: function (val, m, r) {


                        if (val === 'is_Process') {
                            val = 'MANUELLE';
                        } else if (val === 'enable') {
                            val = 'COMMANDEE';
                        } else if (val === 'auto') {
                            val = 'AUTO';
                        } else if (val === 'pending') {
                            val = 'CLOTURE';
                            m.style = 'background-color:#73C774;color:#FFF;font-weight:800;';

                        }
                        return val;
                    }
                },
                {
                    header: 'DATE',
                    dataIndex: 'dt_CREATED',
                    flex: 1
                }, {
                    header: 'HEURE',
                    dataIndex: 'dt_UPDATED',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Commander',
                            scope: this,
                            handler: this.onMakeOrderClick
                        }]
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
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Imprimer une suggession',
                            scope: this,
                            handler: this.onbtnprint
                        }]
                },

                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/excel_csv.png',
                            tooltip: 'Generer le fichier CSV',
                            scope: this,
                            handler: function (grid, rowIndex) {
                                Ext.MessageBox.confirm('Message',
                                        'Voulez-vous generer le fichier CSV ?',
                                        function (btn) {
                                            if (btn === 'yes') {
                                                const rec = grid.getStore().getAt(rowIndex);
                                                window.location = '../api/v1/suggestion/csv?id=' + rec.get('lg_SUGGESTION_ORDER_ID');
                                            }
                                        });
                            }
                        }]
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Suggerer',
                    scope: this,
                    hidden: true,
                    handler: this.onAddClick
                },
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'suggestion',
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
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }

            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: itemsPerPage,
                store: store_suggestion,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



    },
    loadStore: function () {
        this.getStore();
    },

    onbtnprint: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmation de l\'impression de cette suggestion',
                function (btn) {
                    if (btn == 'yes') {
                        const rec = grid.getStore().getAt(rowIndex);
                        const lg_SUGGESTION_ORDER_ID = rec.get('lg_SUGGESTION_ORDER_ID');
                        Me.onPdfClick(lg_SUGGESTION_ORDER_ID);
                    }
                });

    },
    onPdfClick: function (lg_SUGGESTION_ORDER_ID) {

        let linkUrl = "../webservices/sm_user/suggerercde/ws_generate_pdf.jsp?lg_SUGGESTION_ORDER_ID=" + lg_SUGGESTION_ORDER_ID;
        window.open(linkUrl);
    },
    onMakeOrderClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);

        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: '../api/v1/commande/transform-order/' + rec.get('lg_SUGGESTION_ORDER_ID'),
            timeout: 24000000,
            success: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                Ext.MessageBox.alert('Confirmation', 'Opération terminée');
                grid.getStore().reload();

            },
            failure: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();

              
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
    },
    onManageDetailsClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        const xtype = "suggerercdemanager";

        Ext.Ajax.request({
            url: '../api/v1/suggestion/set-pending/' + rec.get('lg_SUGGESTION_ORDER_ID'),
            success: function (response)
            {
                testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Suggestion de commande", rec.get('lg_SUGGESTION_ORDER_ID'), rec.data);
            },
            failure: function (response)
            {
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

    },
    onAddClick: function () {
        const xtype = "suggerercdemanager";

        testextjs.app.getController('App').onLoadNewComponent(xtype, "Ajouter detail commande", "0");

    },

    onRemoveClick: function (grid, rowIndex) {

        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        const rec = grid.getStore().getAt(rowIndex);
                        _myAppController.ShowWaitingProcess();
                        Ext.Ajax.request({
                            method: 'DELETE',
                            url: '../api/v1/suggestion/suggestion/' + rec.get('lg_SUGGESTION_ORDER_ID'),
                            timeout: 2400000,

                            success: function (response)
                            {
                                _myAppController.StopWaitingProcess();
                               
                                Ext.MessageBox.alert('Confirmation', 'Opération terminée');
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                _myAppController.StopWaitingProcess();

                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });

                    }
                });


    },
    onEditClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.preenregistrement.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Suggestion  [" + rec.get('lg_SUGGESTION_ORDER_ID') + "]"
        });



    },
    onRechClick: function () {
        const val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                query: val.value
            }
        });
    }

});