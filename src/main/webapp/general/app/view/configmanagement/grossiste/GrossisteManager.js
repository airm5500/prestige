var url_services_data_grossiste = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_transaction_grossiste = '../webservices/configmanagement/grossiste/ws_transaction.jsp?mode=';
var url_services_pdf_grossiste = '../webservices/configmanagement/grossiste/ws_generate_pdf.jsp';
var Me_Workflow;
Ext.define('testextjs.view.configmanagement.grossiste.GrossisteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'grossistemanager',
    id: 'grossistemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Grossiste',
        'testextjs.view.configmanagement.grossiste.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion des Grossistes',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function() {

        url_services_data_grossiste = '../webservices/configmanagement/grossiste/ws_data.jsp';
        Me_Workflow = this;

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_grossiste,
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
            id: 'gridPrincipalID',
            columns: [{
                    header: 'lg_GROSSISTE_ID',
                    dataIndex: 'lg_GROSSISTE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                },
                {
                    header: 'Code',
                    dataIndex: 'str_CODE',
                    flex: 1

                },
                {
                    header: 'Nom',
                    dataIndex: 'str_LIBELLE',
                    flex: 1

                },
                {
                    header: 'Description',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1
                }, {
                    header: 'Adresse Rue 1',
                    dataIndex: 'str_ADRESSE_RUE_1',
                    hidden: false,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
             
                {
                    header: 'Mobile',
                    dataIndex: 'str_MOBILE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Telephone',
                    dataIndex: 'str_TELEPHONE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
               
                {
                    header: 'Ville',
                    dataIndex: 'lg_VILLE_ID',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                // onManageClick
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/application_view_list.png',
                            tooltip: 'Detail Grossiste',
                            scope: this,
                            handler: this.onManageClick
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
                            tooltip: 'Supprimer un grossiste',
                            scope: this,
                            getClass: function (value, metadata, record) {
                                if (record.get('BTNDELETE')) {  
                                    return 'x-display-hide'; 
                                } else {
                                    return 'x-hide-display'; 
                                }
                            },
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
                    name: 'grossiste',
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
                url: url_services_transaction_grossiste + 'update',
                params: {
                    lg_GROSSISTE_ID: e.record.data.lg_GROSSISTE_ID,
                    str_LIBELLE: e.record.data.str_LIBELLE,
                    str_DESCRIPTION: e.record.data.str_DESCRIPTION,
                    str_ADRESSE_RUE_1: e.record.data.str_ADRESSE_RUE_1,
                    str_ADRESSE_RUE_2: e.record.data.str_ADRESSE_RUE_2,
                    str_CODE_POSTAL: e.record.data.str_CODE_POSTAL,
                    str_BUREAU_DISTRIBUTEUR: e.record.data.str_BUREAU_DISTRIBUTEUR,
                    str_MOBILE: e.record.data.str_MOBILE,
                    str_TELEPHONE: e.record.data.str_TELEPHONE,
                    int_DELAI_REGLEMENT_AUTORISE: e.record.data.int_DELAI_REGLEMENT_AUTORISE,
                    dbl_CHIFFRE_DAFFAIRE: e.record.data.dbl_CHIFFRE_DAFFAIRE,
                    lg_TYPE_REGLEMENT_ID: e.record.data.lg_TYPE_REGLEMENT_ID,
                    lg_VILLE_ID: e.record.data.lg_VILLE_ID

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
    onbtnexportCsv: function() {
        var search_value = Ext.getCmp('rechecher').getValue();
        var liste_param = "&search_value=" + search_value;
        var extension = "csv";
//        window.location = '../MigrationServlet?table_name=TABLE_GROSSISTE' + "&extension=" + extension + "&liste_param=" + liste_param; // a revoir apres
        window.location = '../MigrationServlet?table_name=TABLE_GROSSISTE' + "&extension=" + extension;
    },
    onbtnexportExcel: function() {
        var search_value = Ext.getCmp('rechecher').getValue();
        var liste_param = "&search_value=" + search_value;
        var extension = "xls";
//        window.location = '../MigrationServlet?table_name=TABLE_GROSSISTE' + "&extension=" + extension + "&liste_param=" + liste_param; // a revoir apres
        window.location = '../MigrationServlet?table_name=TABLE_GROSSISTE' + "&extension=" + extension;
    },
    onPrintClick: function() {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_grossiste + '?search_value=' + Ext.getCmp('rechecher').getValue();
        testextjs.app.getController('App').onGeneratePdfFile(linkUrl);



    },
    onAddClick: function() {

        new testextjs.view.configmanagement.grossiste.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Grossiste"
        });
    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.grossiste.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Grossiste  [" + rec.get('str_LIBELLE') + "]"
        });

    },
    onManageClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.grossiste.action.grossisteview({
            odatasource: rec.data,
            parentview: this,
            mode: "manageGrossiste",
            titre: "Mouvement Grossiste  [" + rec.get('str_LIBELLE') + "]"
        });

    },
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_grossiste + 'delete',
                            params: {
                                lg_GROSSISTE_ID: rec.get('lg_GROSSISTE_ID')
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
                    }
                });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_grossiste);
    }

});