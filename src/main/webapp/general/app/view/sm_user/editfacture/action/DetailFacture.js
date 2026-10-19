/* global Ext */

//var url_services ='../webservices/sm_user/menu';
var url_services_data_detail_facture_tiers_payant;
var url_services_transaction_facturation = '../webservices/sm_user/facturation/ws_transaction.jsp?mode=';
var ref;
var Odatasource;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.sm_user.editfacture.action.DetailFacture', {
    extend: 'Ext.grid.Panel',
    xtype: 'detailfacture',
    id: 'detailfactureID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.DetailFacture',
        //'testextjs.view.sms_user.facturation.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    config: {
        odatasource: '',
        parentview: '',
        nameintern: '',
        mode: '',
        titre: ''
    },
    title: 'Detail Facture',
    frame: true,
    initComponent: function () {

        ref = this.getOdatasource().lg_FACTURE_ID;
        Odatasource = this.getOdatasource();
        this.setTitle("Detail Facture  ::  " + this.getOdatasource().str_CODE_FACTURE + " De " + this.getOdatasource().str_CUSTOMER_NAME);
        //alert(ref);
        url_services_data_detail_facture_tiers_payant = '../webservices/sm_user/facturation/ws_data_detail_facture.jsp?lg_FACTURE_ID=' + ref;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.DossierFacture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detail_facture_tiers_payant,
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
                    header: 'lg_DOSSIER_FACTURE_ID',
                    dataIndex: 'lg_DOSSIER_FACTURE_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'lg_PREENREGISTREMENT_ID',
                    dataIndex: 'lg_PREENREGISTREMENT_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Nom',
                    dataIndex: 'str_NOM',
                    flex: 1

                }, {
                    header: 'Prenom',
                    dataIndex: 'str_PRENOM',
                    flex: 1

                }, {
                    header: 'Securite Sociale',
                    dataIndex: 'str_SECURITE_SOCIAL',
                    flex: 1
                }, {
                    header: 'Num Dossier',
                    dataIndex: 'str_NUM_DOSSIER',
                    flex: 1
                }, {
                    header: 'Montant',
                    dataIndex: 'dbl_MONTANT',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                }/*, {
                 header: 'Montant regle',
                 dataIndex: 'dbl_MONTANT_REGLE',
                 flex: 1
                 }, {
                 header: 'Montant Restant',
                 dataIndex: 'dbl_MONTANT_RESTANT',
                 flex: 1
                 }*/, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/grid.png',
                            tooltip: 'Detail Bon',
                            scope: this,
                            handler: this.viewdetailBon
                        }]
                }/*, {
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
                url: url_services_data_detail_facture_tiers_payant + 'update',
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
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Cr&eacute;er une facture", "0");

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_data_detail_facture_tiers_payant + 'delete',
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
    viewdetailBon: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        //var lg_PREENREGISTREMENT_ID = rec.get('lg_PREENREGISTREMENT_ID');
        // alert(lg_PREENREGISTREMENT_ID);
        var xtype = "detailbon";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWith2DataSource(xtype, "Detail Bon", ref, rec.data,Odatasource);
      //  onLoadNewComponentWith2DataSource(ComponentXtype, ComponentLabel, name_ressource, ODatatasource, ODatatasourceparent)

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
        }, url_services_data_detail_facture_tiers_payant);
    }

})