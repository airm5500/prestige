var url_services_data_codegestion = '../webservices/configmanagement/codegestion/ws_data.jsp';
var url_services_transaction_codegestion = '../webservices/configmanagement/codegestion/ws_transaction.jsp?mode=';
var url_services_pdf_codegestion = '../webservices/configmanagement/codegestion/ws_generate_pdf.jsp';
var url_services_xls_codegestion = '../webservices/configmanagement/codegestion/ws_generate_xls.jsp';
var Me_Workflow;

Ext.define('testextjs.view.configmanagement.codegestion.CodeGestionManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'codegestionmanager',
    id: 'codegestionmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.CodeGestion',
        'testextjs.view.configmanagement.codegestion.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion Code de Gestion',
    plain: true,
    maximizable: true,
   // tools: [{type: "pin"}],
    //closable: true,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        Me_Workflow = this;
        var store = new Ext.data.Store({
            model: 'testextjs.model.CodeGestion',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_codegestion,
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
                    header: 'lg_CODE_GESTION_ID',
                    dataIndex: 'lg_CODE_GESTION_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Code bareme',
                    dataIndex: 'str_CODE_BAREME',
                    flex: 1
                }, {
                    header: 'Nbre jours couverture stock',
                    dataIndex: 'int_JOURS_COUVERTURE_STOCK',
                    flex: 1

                }, {
                    header: 'Nbre mois historique vente',
                    dataIndex: 'int_MOIS_HISTORIQUE_VENTE',
                    flex: 1

                },
                {
                    header: 'Date butoir article',
                    dataIndex: 'int_DATE_BUTOIR_ARTICLE',
                    flex: 1
                },
                {
                    header: 'Date limite extrapolation',
                    dataIndex: 'int_DATE_LIMITE_EXTRAPOLATION',
                    flex: 1
                }, {
                    header: 'Seuil commande optimise ?',
                    dataIndex: 'bool_OPTIMISATION_SEUIL_CMDE',
                    flex: 1,
                    renderer: function (val) {
                        if (val === 'true') {
                            val = 'Active';
                        } else {
                            val = 'Desactive';
                        }
                        return val;
                    }
                }, 
                {
                    header: 'Mode Optimisation quantite',
                    dataIndex: 'lg_OPTIMISATION_QUANTITE_ID',
                    flex: 1
                }, {
                    header: 'Coefficient ponderation',
                    dataIndex: 'int_COEFFICIENT_PONDERATION',
                    flex: 1
                }, {
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
                    text: 'Export PDF',
                    hidden: true,
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler: this.onPdfClick
                }, {
                    text: 'Export XLS',
                    hidden: true,
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler: this.onXlsClick
                }, {
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'famille',
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
        }),
                this.on('edit', function (editor, e) {



                    Ext.Ajax.request({
                        url: url_services_transaction_codegestion + 'update',
                        params: {
                            lg_CODE_GESTION_ID: e.record.data.lg_CODE_GESTION_ID,
                            str_CODE_BAREME: e.record.data.str_CODE_BAREME,
                            int_JOURS_COUVERTURE_STOCK: e.record.data.int_JOURS_COUVERTURE_STOCK,
                            int_MOIS_HISTORIQUE_VENTE: e.record.data.int_MOIS_HISTORIQUE_VENTE,
                            int_DATE_BUTOIR_ARTICLE: e.record.data.int_DATE_BUTOIR_ARTICLE,
                            int_DATE_LIMITE_EXTRAPOLATION: e.record.data.int_DATE_LIMITE_EXTRAPOLATION,
                            bool_OPTIMISATION_SEUIL_CMDE: e.record.data.bool_OPTIMISATION_SEUIL_CMDE,
                            lg_OPTIMISATION_QUANTITE_ID: e.record.data.lg_OPTIMISATION_QUANTITE_ID



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
    onManageFoneClick: function (grid, rowIndex) {
       
    },
    onAddClick: function () {

        new testextjs.view.configmanagement.codegestion.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Code de gestion"
        });
    },
    onPrintClick: function () {

        
        window.print();
        body :{
            visibility:visible
        }
        print: {
            visibility:visible
        }


    },
    onPdfClick: function () {
        // alert("ref  " + ref);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_codegestion;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "codegestionmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "codegestionmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    onXlsClick: function () {
        // alert("ref  " + ref);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_xls_codegestion;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "codegestionmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "codegestionmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_codegestion + 'delete',
                            params: {
                                lg_CODE_GESTION_ID: rec.get('lg_CODE_GESTION_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_CODE_BAREME') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_CODE_BAREME') + ']', 'Suppression effectuee avec succes');
//                                    
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


    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.codegestion.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification  Code gestion  [" + rec.get('str_CODE_BAREME') + "]"
        });



    },
    onEditpwdClick: function (grid, rowIndex) {

    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_codegestion);
    }

});