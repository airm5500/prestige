var url_services_data_fabriquant = '../webservices/configmanagement/fabriquant/ws_data.jsp';
var url_services_transaction_fabriquant = '../webservices/configmanagement/fabriquant/ws_transaction.jsp?mode=';
var Me_Workflow;
var url_services_pdf_fabriquant = '../webservices/configmanagement/fabriquant/ws_generate_pdf.jsp';
Ext.define('testextjs.view.configmanagement.fabriquant.FabricantManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'fabriquantmanager',
    id: 'fabriquantmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Fabriquant',
        'testextjs.view.configmanagement.fabriquant.action.add',
        'Ext.ux.ProgressBarPager'
    ],
    title: 'Gestion des Fabricants',
     plain: true,
        maximizable: true,
       // tools: [{type: "pin"}],
        closable: false,
    frame: true,
    initComponent: function() {


    Me_Workflow = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Fabriquant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_fabriquant,
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
            width: '98%',
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_FABRIQUANT_ID',
                    dataIndex: 'lg_FABRIQUANT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
                    header: 'Code',
                    dataIndex: 'str_CODE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
                    header: 'Nom',
                    dataIndex: 'str_NAME',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
                    header: 'Adresse',
                    dataIndex: 'str_ADRESSE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },{
                
                    header: 'Telephone',
                    dataIndex: 'str_TELEPHONE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
                    header: 'Commentaire',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },{
                
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
                }, '-', {
                    text: 'Imprimer',
                    id: 'P_BT_PRINT',
                    iconCls: 'printable',
                    handler: this.onPrintClick
                }, '-',
                {
                    text: 'Exporter CSV',
                    tooltip: 'EXPORTER CSV',
                    iconCls: 'export_csv_icon',
                    scope: this,
                    handler: this.onbtnexportCsv
                }, '-',
                {
                    text: 'Exporter EXCEL',
                    tooltip: 'EXPORTER EXCEL',
                    iconCls: 'export_excel_icon',
                    scope: this,
                    handler: this.onbtnexportExcel
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
                url: url_services_transaction_fabriquant + 'update',
                params: {
        
                    lg_FABRIQUANT_ID: e.record.data.lg_FABRIQUANT_ID, 
                    str_CODE: e.record.data.str_CODE,    
                    str_NAME: e.record.data.str_NAME,                   
                    str_ADRESSE: e.record.data.str_ADRESSE,
                    str_TELEPHONE: e.record.data.str_TELEPHONE,
                    str_DESCRIPTION: e.record.data.str_DESCRIPTION
                   
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
        new testextjs.view.configmanagement.fabriquant.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Fabriquant"
        });
    },
     onbtnexportCsv: function() {
        var search_value = Ext.getCmp('rechecher').getValue();
        var liste_param = "&search_value=" + search_value;
        var extension = "csv";
//        window.location = '../MigrationServlet?table_name=TABLE_GROSSISTE' + "&extension=" + extension + "&liste_param=" + liste_param; // a revoir apres
        window.location = '../MigrationServlet?table_name=TABLE_FABRIQUANT' + "&extension=" + extension;
    },
    onbtnexportExcel: function() {
        var search_value = Ext.getCmp('rechecher').getValue();
        var liste_param = "&search_value=" + search_value;
        var extension = "xls";
//        window.location = '../MigrationServlet?table_name=TABLE_GROSSISTE' + "&extension=" + extension + "&liste_param=" + liste_param; // a revoir apres
        window.location = '../MigrationServlet?table_name=TABLE_FABRIQUANT' + "&extension=" + extension;
    },
     onPrintClick: function() {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_fabriquant + '?search_value=' + Ext.getCmp('rechecher').getValue();
        testextjs.app.getController('App').onGeneratePdfFile(linkUrl);
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_fabriquant + 'delete',
                            params: {
                                lg_FABRIQUANT_ID: rec.get('lg_FABRIQUANT_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }

                            },
                            failure: function(response)
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
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.fabriquant.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Fabriquant [" + rec.get('str_NAME') + "]"
        });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_fabriquant);
    }

});