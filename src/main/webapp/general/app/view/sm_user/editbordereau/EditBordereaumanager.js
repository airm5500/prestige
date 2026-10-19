/* global Ext */

//var url_services ='../webservices/sm_user/menu';
//var url_services_data_facturation_bordereau = '../webservices/sm_user/Bordereau/ws_data.jsp';
var url_services_reglement_data = '../webservices/sm_user/reglement/ws_reglement_data.jsp';

var url_services_transaction_facturation = '../webservices/sm_user/facturation/ws_transaction.jsp?mode=';
var Me;
var lg_MODE_REGLEMENT_ID;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.sm_user.editbordereau.EditBordereaumanager', {
    extend: 'Ext.grid.Panel',
    xtype: 'bordereaumanager',
    id: 'bordereaumanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.CheckState',
        'testextjs.view.sm_user.editbordereau.action.addBordereau',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion des Bordereaux en Edition',
    frame: true,
    initComponent: function () {


        Me = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.CheckState',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_reglement_data + '?lg_MODE_REGLEMENT_ID=CH',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
       var dt_TRANSACTION_DATE_DEBUT = new Ext.form.field.Date({
            fieldLabel: 'Du:',
            labelWidth: 20 ,
            allowBlank: false,
            format: 'd/m/Y',
            submitFormat: 'Y-m-d',
            name: 'dt_TRANSACTION_DATE_DEBUT',
            id: 'dt_TRANSACTION_DATE_DEBUT_ID',
            //minValue: new Date(),
            emptyText: 'Date début',
            listeners: {
                'change': function (me) {
                    Ext.getCmp('dt_TRANSACTION_DATE_FIN_ID').setMinValue(me.getValue());
                }
            }
        });
        
        var dt_TRANSACTION_DATE_FIN = new Ext.form.field.Date({
            fieldLabel: 'Au:',
            labelWidth: 20 ,
            allowBlank: false,
            format: 'd/m/Y',
            submitFormat: 'Y-m-d',
            name: 'dt_TRANSACTION_DATE_FIN',
            id: 'dt_TRANSACTION_DATE_FIN_ID',
            //minValue: new Date(),
            emptyText: 'Date début',
            listeners: {
                'change': function (me) {
                      Ext.getCmp('dt_TRANSACTION_DATE_DEBUT_ID').setMaxValue(me.getValue());
                      console.log("value: "+ me.getValue());
                }
            }
        });


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: "98%",
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'Numéro de chèque',
                    dataIndex: 'lg_CHECK_NUMERO',
                    hidden: true,
                    flex: 1
                }/*,
                {
                    header: 'Type de chèque',
                    dataIndex: 'str_TYPE_CHECK',
                    flex: 1

                }*/
                , {
                    header: 'Emetteur',
                    dataIndex: 'USERNAME_EMETTEUR',
                    flex: 1

                }, {
                    header: 'Opérateur',
                    dataIndex: 'USERNAME_ENCAISSEUR',
                    flex: 1
                }, {
                    header: 'Lieu',
                    dataIndex: 'str_LIEU',
                    flex: 2

                },
                {
                    header: 'Banque',
                    dataIndex: 'str_BANQUE',
                    flex: 2

                },
                {
                    header: 'Montant',
                    dataIndex: 'int_MONTANT',
                    flex: 1,
                    renderer: amountformat,
                    align: 'right'
                },
                /* {
                 header: 'Montant Regler',
                 dataIndex: 'dbl_MONTANT_PAYE',
                 flex: 1,
                 renderer: amountformat,
                 align: 'right'
                 }, {
                 header: 'Montant Restant',
                 dataIndex: 'dbl_MONTANT_RESTANT',
                 flex: 1, str_LIEU
                 renderer: amountformat,
                 align: 'right'
                 },*/
                {
                    header: 'Date de transaction',
                    dataIndex: 'dt_TRANSACTION_DATE',
                    flex: 1

                }
                ,
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Editer le réglément',
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
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Rech'
                }, {
                    xtype: 'combobox',
                    id: 'typeID',
                    name: 'Type Chèque',
                    store: new Ext.data.Store({
                        autoload: true,
                        fields: ['name', 'value'],
                        data: [{"name": "Carte Bancaire", "value": "CB"},
                            {"name": "Chèque Sur Place", "value": "CP"}, {"name": "Chèque Hors Place", "value": "CH"}]
                    }),
                    valueField: 'value',
                    displayField: 'name',
                    typeAhead: true,
                    queryMode: 'local',
                    emptyText: 'TYPE DE CHEQUE...',
                    listeners: {
                        select: function (cmp) {
                            Me.processCheckType(cmp.getValue());
                            //lg_MODE_REGLEMENT_ID = cmp.getValue();
                        }

                    }
                }, dt_TRANSACTION_DATE_DEBUT,dt_TRANSACTION_DATE_FIN, {
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
        });


        this.on('edit', function (editor, e) {



            Ext.Ajax.request({
                url: url_services_transaction_facturation + 'update',
                params: {
                    lg_MENU_ID: e.record.data.lg_MENU_ID,
                    lg_MODULE_ID: e.record.data.lg_MODULE_ID,
                    P_KEY: e.record.data.P_KEY,
                    str_DESCRIPTION: e.record.data.str_DESCRIPTION,
                    str_VALUE: e.record.data.str_VALUE,
                    str_TYPE: e.record.data.str_TYPE,
                    // str_Status:e.record.data.str_Status,
                    int_PRIORITY: e.record.data.int_PRIORITY
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
    
    processCheckType: function (type) {
        var dataGrid = Ext.getCmp('bordereaumanagerID');
        dataGrid.getStore().load({
            url: url_services_reglement_data,
            params: {
                lg_MODE_REGLEMENT_ID: type
            }
        });
    }
    ,
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onAddClick: function () {

        // alert("Créer un bordereau");
        //return;
        var xtype = "addBordereau";
        new testextjs.view.sm_user.editbordereau.action.addBordereau({
            parentview: this
        });
        var alias = 'widget.' + xtype;
//        testextjs.app.getController('App').onLoadNewComponent(xtype, "Creer un bordereau", "0");

    }, viewdetailFacture: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "detailfacture";
//        alert('xtype '+xtype);
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Detail Bordereau", rec.get('lg_FACTURE_ID'), rec.data);




    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_facturation + 'delete',
                            params: {
                                lg_MENU_ID: rec.get('lg_MENU_ID')
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
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        // alert(rec.data.str_DESCRIPTION);

        /*     new testextjs.view.sm_user.menu.action.add({
         odatasource: rec.data,
         parentview: this,
         mode: "update",
         titre: "Modification Menu [" + rec.get('str_DESCRIPTION') + "]"
         });
         */


    },
    onRechClick: function () {
        var dt_TRANSACTION_DATE_DEBUT = Ext.getCmp('dt_TRANSACTION_DATE_DEBUT_ID').getSubmitValue();
        var dt_TRANSACTION_DATE_FIN = Ext.getCmp('dt_TRANSACTION_DATE_FIN_ID').getSubmitValue();
        var dataGrid = Ext.getCmp('bordereaumanagerID');
        dataGrid.getStore().load({
            url: url_services_reglement_data,
            params: {
                mode: 'between',
                dt_TRANSACTION_DATE_DEBUT: dt_TRANSACTION_DATE_DEBUT,
                dt_TRANSACTION_DATE_FIN: dt_TRANSACTION_DATE_FIN
                
            }
       });
        

    }

});