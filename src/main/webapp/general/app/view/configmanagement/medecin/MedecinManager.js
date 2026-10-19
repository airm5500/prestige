var url_services_data_medecin = '../webservices/configmanagement/medecin/ws_data.jsp';
var url_services_transaction_medecin = '../webservices/configmanagement/medecin/ws_transaction.jsp?mode=';
var url_services_pdf_medecin = '../webservices/configmanagement/medecin/ws_generate_pdf.jsp';


Ext.define('testextjs.view.configmanagement.medecin.MedecinManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'medecinmanager',
    id: 'medecinmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Medecin',
        'testextjs.view.configmanagement.medecin.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des Medecins',
    plain: true,
    maximizable: true,
   // tools: [{type: "pin"}],
   // closable: true,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Medecin',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_medecin,
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
            columns: [
                {
                    header: 'lg_MEDECIN_ID',
                    dataIndex: 'lg_MEDECIN_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Specialite',
                    dataIndex: 'lg_SPECIALITE_ID',
                    flex: 1
                },
                {
                    header: 'Code interne',
                    dataIndex: 'str_CODE_INTERNE',
                    flex: 1
                },
                {
                    header: 'Nom',
                    dataIndex: 'str_FIRST_NAME',
                    flex: 1
                },
                {
                    header: 'Prenom',
                    dataIndex: 'str_LAST_NAME',
                    flex: 1
                },
                {
                    header: 'Telephone',
                    dataIndex: 'str_PHONE',
                    flex: 1
                },
                {
                    header: 'Adresse',
                    dataIndex: 'str_ADRESSE',
                    flex: 1
                },
                {
                    header: 'E-Mail',
                    dataIndex: 'str_MAIL',
                    flex: 1
                },
                {
                    header: 'Genre',
                    dataIndex: 'str_SEXE',
                    flex: 1
                },
                {
                    header: 'Ville',
                    dataIndex: 'lg_VILLE_ID',
                    flex: 1
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
                    text: 'Imprimer',
                    iconCls: 'resources/images/icons/fam/printer.png',
                    handler: this.onPdfClick
                }, {
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'medecin',
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

        new testextjs.view.configmanagement.medecin.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Medecin"
        });
    },
    onPrintClick: function () {

        //alert("print");
        /*Ext.ux.grid.Printer.printAutomatically = false;
         Ext.ux.grid.Printer.print(grid);*/
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
        var linkUrl = url_services_pdf_medecin;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "medecinmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "medecinmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_medecin + 'delete',
                            params: {
                                lg_MEDECIN_ID: rec.get('lg_MEDECIN_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_FIRST_NAME') + ' ' + rec.get('str_LAST_NAME') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_FIRST_NAME') + ' ' + rec.get('str_LAST_NAME') + ']', 'Suppression effectuee avec succes');
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


        new testextjs.view.configmanagement.medecin.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification  Medecin  [" + rec.get('str_FIRST_NAME') + "]"
        });



    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_medecin);
    }

});