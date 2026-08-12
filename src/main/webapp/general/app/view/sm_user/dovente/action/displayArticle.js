

var url_services_data_famille_displayArticle = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_data_famille_displayArticle_by_dci = '../webservices/sm_user/detailsvente/ws_data_famille_dci.jsp';
var url_services_data_famille_displayArticle_final = '';
var url_services_data_famille_displayArticle_by_dci_final = '';


var Oview;
var Oform;
var Omode;
var Me_displayArt;
var in_total_vente__ = 0;
var int_monnaie__ = 0;
var title_debt;
var cust_total_dif_debt = 0;

var OFamille_search_display;
var OFamilleDisplaygridpanelID;
var famille_id_search_display;
var str_fam_price;

var ref_add;
var LaborexWorkFlow_displayArt;
var str_path_display;


var int_AMOUNT_REMIS__;
var final_url_to_load = "";

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.sm_user.dovente.action.displayArticle', {
    extend: 'Ext.window.Window',
    xtype: 'displayArticle',
    id: 'displayArticleID',
    requires: [
        //  'Ext.selection.CellModel',
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: '',
        from: ''
    },
    title: 'Liste Article',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {
        Me_displayArt = this;
        Me_displayArt.InitializeDisplayArticle();
        Oform = Me_displayArt.getFrom();
      //  alert("from  " + Oform);

        url_services_data_famille_displayArticle_final = url_services_data_famille_displayArticle + "?search_value=" + OFamille_search_display;
        url_services_data_famille_displayArticle_by_dci_final = url_services_data_famille_displayArticle_by_dci + "?search_value=" + OFamille_search_display;


        if (Oform === "by_dci") {
            final_url_to_load = url_services_data_famille_displayArticle_by_dci_final;

        } else {
            final_url_to_load = url_services_data_famille_displayArticle_final;
        }


        var itemsPerPage = 20;
        store_famille_displayArt = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: final_url_to_load,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }


        });



        var form_displayArt = new Ext.form.Panel({
            width: 1050,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            items: ['FamilleDisplaygridpanelID'],
            autoHeight: true,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            items: [{
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    id: 'FamilleDisplaygridpanelID',
                    store: store_famille_displayArt,
                    height: 400,
                    columns: [{
                            text: 'lg_FAMILLE_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_FAMILLE_ID'
                        }, {
                            text: 'Cip',
                            flex: 1,
                            dataIndex: 'int_CIP'
                        }, {
                            text: 'Nom',
                            flex: 1,
                            dataIndex: 'str_NAME'
                        }, {
                            text: 'Description',
                            flex: 1,
                            dataIndex: 'str_DESCRIPTION'
                        }, {
                            text: 'Prix',
                            flex: 1,
                            dataIndex: 'int_PRICE'
                        }],
                    tbar: [
                        {
                            xtype: 'textfield',
                            id: 'rechercher_adddisplay',
                            name: 'user',
                            emptyText: 'Rech'
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            handler: this.onRechClick
                        }],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store_famille_displayArt,
                        dock: 'bottom',
                        displayInfo: true
                    },
                    listeners: {
                        scope: this,
                        selectionchange: this.onSelectionChange
                    }
                }]
        });



        this.callParent();
        OFamilleDisplaygridpanelID = Ext.getCmp('FamilleDisplaygridpanelID');
        win_add_displayArt = new Ext.window.Window({
            autoShow: true,
            id: 'displayArtwinID',
            title: this.getTitre(),
            width: 850,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form_displayArt,
            buttons: [{
                    text: 'OK',
                    id: 'btn_displayArt_saveID',
                    hidden: true,
                    handler: function() {
                        Me_displayArt.onbtnsave_addclt();
                    }
                }, {
                    text: 'Annuler',
                    id: 'btn_clt_anulerID',
                    hidden: true,
                    handler: function() {
                        win_add_displayArt.close();
                    }
                }]

        });
        url_services_data_famille_displayArticle_final = url_services_data_famille_displayArticle;
        url_services_data_famille_displayArticle_by_dci_final = url_services_data_famille_displayArticle_by_dci;

    },
    onRechClick: function() {
        var val = Ext.getCmp('rechercher_adddisplay');
        var url_load_rech = "";
        if (Oform === "by_dci") {
            url_load_rech = url_services_data_famille_displayArticle_by_dci_final;

        } else {
            url_load_rech = url_services_data_famille_displayArticle_final;
        }
        OFamilleDisplaygridpanelID.getStore().getProxy().url = url_load_rech;
        OFamilleDisplaygridpanelID.getStore().reload({
            params: {
                search_value: val.value
            }
        }, url_load_rech);


    }
    ,
    onSelectionChange: function(model, records) {

        var rec = records[0];
        famille_id_search_display = rec.get('lg_FAMILLE_ID');
        var str_fam_desc = rec.get('str_DESCRIPTION');
        str_fam_price = rec.get('int_PRICE');

        LaborexWorkFlow_displayArt.ShowPopUp(famille_id_search_display, str_fam_price, 'displayArticleID', str_path_display, ref_add, "modificationqte", "QUANTITE DEMANDEE DU PRODUIT [" + str_fam_desc + "]", "from_name","str_task");
      //  win_add_displayArt.close();
        /*   var xtype = "doventemanager";
         win_add_displayArt.close();
         testextjs.app.getController('App').onLoadNewComponentWith2DataSource(xtype, "by_display_art", famille_id_search_display, ref_add, str_fam_price);
         */

    },
    InitializeDisplayArticle: function() {
        LaborexWorkFlow_displayArt = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        str_path_display = testextjs.view.sm_user.dovente.action.updateQuantity;
        Oview = this.getParentview();
        Omode = this.getMode();


        this.title = this.getTitre();
        title_debt = Me_displayArt.title;

        OFamille_search_display = Me_displayArt.getOdatasource();
        ref_add = Me_displayArt.getNameintern();

    }
});