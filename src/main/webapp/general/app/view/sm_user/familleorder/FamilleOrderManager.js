//var url_services ='../webservices/sm_user/institution';
var url_services_data_familleorder = '../webservices/sm_user/familleorder/ws_data.jsp';
var url_services_transaction_familleorder = '../webservices/sm_user/familleorder/ws_transaction.jsp?mode=';
var url_services_pdf_familleorder = '../webservices/sm_user/familleorder/ws_generate_pdf.jsp';

Ext.define('testextjs.view.sm_user.familleorder.FamilleOrderManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'familleorder',
    id: 'familleorderID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Familleorder',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gest.Proposition de commande',
    closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Familleorder',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_familleorder,
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
                    header: 'lg_FAMILLE_ID',
                    dataIndex: 'lg_FAMILLE_ID',
                    hidden: true,
                    flex: 1
                }, {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                }, {
                    text: 'Repartiteur',
                    flex: 1,
                    sortable: true,
                    dataIndex: 'lg_GROSSISTE_ID'
                },{
                    text: 'Ref.Cde',
                    flex: 1,
                    sortable: true,
                    dataIndex: 'lg_FAMILLE_ORDER_ID'
                }, {
                    header: 'Nbre.de.Ligne',
                    dataIndex: 'NB_DETAIL',
                    flex: 1
                }, {
                    header: 'Pos',
                    dataIndex: 'str_STATUT',
                    flex: 1
                },{
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Edit',
                            scope: this,
                            handler: this.onEditClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-',
                {
                    text: 'Imprimer',
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler: this.onPdfClick
                },
                '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'familleorder',
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
                this.on('edit', function(editor, e) {

                    Ext.Ajax.request({
                        url: url_services_transaction_familleorder + 'update',
                        params: {
                            // lg_FAMILLE_ORDER_ID: e.record.data.lg_FAMILLE_ORDER_ID,
                            lg_FAMILLE_ID: e.record.data.lg_FAMILLE_ID,
                            str_NAME: e.record.data.str_NAME,
                            int_NUMBER: e.record.data.int_NUMBER
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
    onPdfClick: function() {
        // alert("ref  " + ref);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_familleorder;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "familleorder";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "familleorder";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    onAddClick: function(grid, rowIndex) {
        var xtype = "suggerercdemanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "", "0");
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_familleorder + 'delete',
                            params: {
                                lg_FAMILLE_ORDER_ID: rec.get('lg_FAMILLE_ORDER_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_NAME') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_NAME') + ']', 'Suppression effectuee avec succes');
//                                    
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
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_familleorder);
    }

});