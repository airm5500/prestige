//var url_services ='../webservices/sm_user/menu';
var url_services_data_detail_facture_fournisseur;
var url_services_transaction_facturation = '../webservices/sm_user/facturation/ws_transaction.jsp?mode=';
var ref;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.sm_user.editfacture.action.DetailFactureFournisseur', {
    extend: 'Ext.grid.Panel',
    xtype: 'detailfacturefournisseur',
    id: 'detailfacturefournisseurID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.DetailFactureFounisseur',
        //'testextjs.view.sms_user.facturation.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    title: 'Detail Facture Fournisseurs',
    frame: true,
    initComponent: function () {

        ref = this.getOdatasource().lg_FACTURE_ID;
        //alert(ref);
        url_services_data_detail_facture_fournisseur = '../webservices/sm_user/facturation/ws_data_detail_fournisseur_facture.jsp?lg_FACTURE_ID=' + ref;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.DetailFactureFounisseur',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detail_facture_fournisseur,
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
            width: "90%",
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            columns: [{
                    text: 'lg_BON_LIVRAISON_ID',
                    flex: 1,
                    sortable: true,
                    hidden: true,
                    dataIndex: 'lg_BON_LIVRAISON_ID',
                    id: 'lg_BON_LIVRAISON_ID'
                },
                {
                    text: 'Num Bon Commande',
                    flex: 1,
                    sortable: true,
                    dataIndex: 'str_REF_ORDER'
                },
                {
                    text: 'Date livraison',
                    flex: 1,
                    sortable: true,
                    dataIndex: 'dt_DATE_LIVRAISON'
                },
                {
                    text: 'Montant Bon',
                    flex: 2,
                    sortable: true,
                    dataIndex: 'int_HTTC'
                } /*{
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
                 }, {
                 xtype: 'actioncolumn',
                 width: 30,
                 sortable: false,
                 menuDisabled: true,
                 items: [{
                 icon: 'resources/images/icons/fam/delete.png',
                 tooltip: 'Delete',
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
                 icon: 'resources/images/icons/fam/folder_go.png',
                 tooltip: 'Detail Bordereau',
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
                 icon: 'resources/images/icons/fam/folder_go.png',
                 tooltip: 'Imprimer Bordereau',
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
                 icon: 'resources/images/icons/fam/folder_go.png',
                 tooltip: 'Regler Bordereau',
                 scope: this,
                 handler: this.onRemoveClick
                 }]
                 }*/],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Regler',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher_detail',
                    name: 'user',
                    emptyText: 'Rech'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }, {
                    text: 'retour',
                    tooltip: 'retour',
                    scope: this,
                    handler: this.onbtnretour
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
        })


        this.on('edit', function (editor, e) {



            Ext.Ajax.request({
                url: url_services_data_detail_facture_fournisseur + 'update',
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
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onAddClick: function () {


        var xtype = "addeditfacture";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Creer une facture", "0");

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_data_detail_facture_fournisseur + 'delete',
                            params: {
                                lg_MENU_ID: rec.get('lg_MENU_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
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
    onbtnretour: function () {

        var xtype = "facturemanager";
        testextjs.app.getController('App').onLoadNewComponent(xtype, "", "");
    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher_detail');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_detail_facture_fournisseur);
    }

})