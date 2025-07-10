/* global Ext */

var url_services_data_zonegeographique = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_transaction_zonegeographique = '../webservices/configmanagement/zonegeographique/ws_transaction.jsp?mode=';
var Me_Workflow;
Ext.define('testextjs.view.configmanagement.zonegeographique.ZoneGeographiqueManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'zonegeographiquemanager',
    id: 'zonegeographiquemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.ZoneGeographique',
        'testextjs.view.configmanagement.zonegeographique.action.add',
        'Ext.ux.ProgressBarPager',
        'testextjs.view.configmanagement.zonegeographique.action.basculement'

    ],
    title: 'Gestion des emplacements',
    plain: true,
    maximizable: true,
//        tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function () {

        Me_Workflow = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeographique,
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
            id: 'zonegeographiquegridID',
            enableColumnMove: true,
            plugins: [
                {
                    ptype: "rowediting",
                    clicksToEdit: 2

                }],
            store: store,
            columns: [{
                    header: 'lg_ZONE_GEO_ID',
                    dataIndex: 'lg_ZONE_GEO_ID',
                    hidden: true,
                    flex: 1,
                    sortable: false,
                    menuDisabled: true


                }, {
                    header: 'Code',
                    dataIndex: 'str_CODE',
                    sortable: false,
                    menuDisabled: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Libelle ',
                    dataIndex: 'str_LIBELLEE',
                    sortable: false,
                    menuDisabled: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }
                , 
                {
                    xtype: 'checkcolumn',
                    header: ' ',
                    dataIndex: 'bool_ACCOUNT',
                    width: 30,
                   sortable: false,
                    menuDisabled: true,
                    hidden:true,
                    listeners: {checkchange: function (scr, rowIndex, checked, eOpts) {
                            console.log(scr, rowIndex, checked);
                            var rec = Ext.getCmp('zonegeographiquegridID').getStore().getAt(rowIndex);

                            Ext.Ajax.request({
                                url: '../webservices/configmanagement/zonegeographique/ws_transaction.jsp?mode=updateCount',
                                params: {
                                    lg_ZONE_GEO_ID: rec.get("lg_ZONE_GEO_ID"),
                                    bool_ACCOUNT: checked
                                },
                                success: function (response)
                                {



                                },
                                failure: function (response)
                                {

                                }
                            });
                        }}


                }
                
                ,{
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            iconCls: 'pillsv',
                            tooltip: 'Gestion des articles de l\'emplacement',
                            scope: this,
                            handler: this.onbasculer2

                        }]
                }, {
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
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Créer',
                    scope: this,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'zonegeographique',
                    emptyText: 'Rech',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
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
                }, {
                    text: 'Importer',
                    tooltip: 'Importer',
                    id: 'btn_import',
                    iconCls: 'importicon',
                    scope: this,
                    handler: this.onbtnimport
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
                    iconCls: 'xls',
                    scope: this,
                    handler: this.onbtnexportExcel
                }, '-', {
                    text: 'Basculer',
                    tooltip: 'Selection massive',
                    iconCls: 'pills',
                    scope: this,
                    handler: this.onbasculer
                }


            ],
            listeners: {
                edit: function (src, e) {
                    var record = e.record;
                    Ext.Ajax.request({
                        url: url_services_transaction_zonegeographique + 'update',
                        params: {
                            lg_ZONE_GEO_ID: record.get("lg_ZONE_GEO_ID"),
                            str_LIBELLEE: record.get("str_LIBELLEE"),
                            str_CODE: record.get("str_CODE")
                        },
                        success: function (response)
                        {
                            var obj = Ext.decode(response.responseText);

                            if (obj.success === "1") {
                                Ext.MessageBox.alert('Modification de la ligne ' + '[' + record.get("str_CODE") + ']', 'Modification effectu&eacute;e avec succ&egrave;s');
                                e.record.commit();
                            } else {

                                Ext.MessageBox.alert('Modification de la ligne ' + '[' + record.get("str_CODE") + ']', obj.errors);
                            }


                        },
                        failure: function (response)
                        {

                        }
                    });

                }
            },
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: itemsPerPage,
                store: store,
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
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
     var grid =   Ext.getCmp('zonegeographiquegridID');
        if (grid.getStore().getCount() > 0) {
            var firstRec = grid.getStore().getAt(0);
            console.log(firstRec.get('KEYINTOACCOUNT'),grid.columns[3]);
            if(firstRec.get('KEYINTOACCOUNT'))
                 grid.columns[3].setVisible(true);
             else
                 grid.columns[3].setVisible(false);
        }
       // enableColumnHide
       
    },
    onbtnexportCsv: function () {
        var extension = "csv";
        window.location = '../MigrationServlet?table_name=TABLE_ZONE_GEOGRAPHIQUE' + "&extension=" + extension;
    },
    onbtnexportExcel: function () {
        var extension = "xls";
        window.location = '../MigrationServlet?table_name=TABLE_ZONE_GEOGRAPHIQUE' + "&extension=" + extension;
    },
    onbtnimport: function () {
        new testextjs.view.configmanagement.famille.action.importOrder({
            odatasource: 'TABLE_ZONE_GEOGRAPHIQUE',
            parentview: this,
            mode: "importfile",
            titre: "Importation des differents emplacements de l'officine"
        });
    },
    onAddClick: function () {

        new testextjs.view.configmanagement.zonegeographique.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter un emplacement"
        });
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.zonegeographique.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification de l'emplacement  [" + rec.get('str_LIBELLEE') + "]"
        });

    },
    onAssocProductClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.zonegeographique.action.changeProduitEmplacement({
            odatasource: rec.data,
            parentview: this,
            mode: "changeproduct",
            titre: "G&eacute;rer les produits de l'emplacement [" + rec.get('str_CODE') + "-" + rec.get('str_LIBELLEE') + "]"
        });



    },

    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirmer la suppression',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_zonegeographique + 'delete',
                            params: {
                                lg_ZONE_GEO_ID: rec.get('lg_ZONE_GEO_ID')
                            },
                            success: function (response)
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
                    }
                });


    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_zonegeographique);
    },
    onbasculer: function () {
        new testextjs.view.configmanagement.zonegeographique.action.basculement({
            odatasource: '',

            parentview: this,
            titre: "Gestion des emplacements"
        });
    },
    onbasculer2: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.zonegeographique.action.basculement({
            odatasource: rec.get('lg_ZONE_GEO_ID'),

            parentview: this,
            titre: "Gestion des emplacements"
        });
    }
});