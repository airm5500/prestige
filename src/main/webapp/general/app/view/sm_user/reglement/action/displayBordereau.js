var url_services_data_dovente_checkdif__ = '../webservices/sm_user/diffclient/ws_data.jsp';
var url_services_data_typereglement__ = '../webservices/sm_user/typereglement/ws_data.jsp';
var url_services_data_modereglement__ = '../webservices/sm_user/modereglement/ws_data.jsp';

var url_services_data_by_bordereau = '../webservices/sm_user/reglement/ws_data_by_bordereau.jsp';
var url_services_data_by_bordereau_final = '';
var url_services_data_famille_displayArticle = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_data_famille_displayArticle_by_dci = '../webservices/sm_user/detailsvente/ws_data_famille_dci.jsp';
var url_services_data_famille_displayArticle_final = '';
var url_services_data_famille_displayArticle_by_dci_final = '';


var Oview;
var Oform;
var Omode;
var ref = 0;
var Me_displayArt;
var OCustomer;
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
var LaborexWorkFlow;

var lg_FACTURE_ID;
var int_AMOUNT_REMIS__;
var final_url_to_load = "";

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}



Ext.define('testextjs.view.sm_user.reglement.action.displayBordereau', {
    extend: 'Ext.window.Window',
    xtype: 'displayBordereau',
    id: 'displayBordereauID',
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
        o2ndatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: '',
        from: ''
    },
    title: 'Liste Bordereau',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {
        Me_displayArt = this;
        Me_displayArt.InitializeDisplayArticle();
        Oform = Me_displayArt.getFrom();
        // alert("from  " + OFamille_search_display);

        url_services_data_by_bordereau_final = url_services_data_by_bordereau + "?lg_customer_id=" + OCustomer + "&lg_bordereau_id=" + OFamille_search_display;
        //  url_services_data_famille_displayArticle_by_dci_final = url_services_data_famille_displayArticle_by_dci + "?search_value=" + OFamille_search_display;



        final_url_to_load = url_services_data_by_bordereau_final;


        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});

        var itemsPerPage = 20;
        store_dossier_facture = new Ext.data.Store({
            model: 'testextjs.model.Facture',
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
            width: '98%',
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
                    store: store_dossier_facture,
                    height: 400,
                    columns: [{
                            text: 'lg_FACTURE_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_FACTURE_ID'
                        }, {
                            text: 'Code Facture',
                            flex: 1,
                            dataIndex: 'str_CODE_FACTURE'
                        }, {
                            text: 'Nombre Dossier',
                            flex: 1,
                            dataIndex: 'int_NB_DOSSIER'
                        }, {
                            text: 'Montant',
                            flex: 1,
                            dataIndex: 'dbl_MONTANT_CMDE'
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
                        store: store_dossier_facture,
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
                    handler: function () {
                        Me_displayArt.onbtnsave_addclt();
                    }
                }, {
                    text: 'Annuler',
                    id: 'btn_clt_anulerID',
                    hidden: true,
                    handler: function () {
                        win_add_displayArt.close();
                    }
                }]

        });
        url_services_data_famille_displayArticle_final = url_services_data_famille_displayArticle;
        url_services_data_famille_displayArticle_by_dci_final = url_services_data_famille_displayArticle_by_dci;

    },
    onRechClick: function () {
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
    onSelectionChange: function (model, records) {

        var rec = records[0];



        lg_FACTURE_ID = rec.get('lg_FACTURE_ID');

        // var str_fam_desc = rec.get('str_DESCRIPTION');
        str_fam_price = rec.get('int_NB_DOSSIER');
        var dbl_MONTANT = rec.get('dbl_MONTANT_CMDE');
        var Ocmb_CUSTOMER_ID = Ext.getCmp('cmb_CUSTOMER_ID').getValue();

        //  alert(famille_id_search_display);

        // LaborexWorkFlow_displayArt.ShowPopUp(famille_id_search_display, str_fam_price, 'displayArticleID', str_path_display, ref_add, "modificationqte", "QUANTITE DEMANDEE DU PRODUIT [" + str_fam_desc + "]", "from_name", "str_task");
        //  win_add_displayArt.close();
        /*   var xtype = "doventemanager";
         win_add_displayArt.close();
         testextjs.app.getController('App').onLoadNewComponentWith2DataSource(xtype, "by_display_art", famille_id_search_display, ref_add, str_fam_price);
         */
        var oref_reglement = Ext.getCmp('str_ref_reglement_hidden').getValue();
        //alert(oref_reglement);
        Ext.Ajax.request({
            url: '../webservices/sm_user/reglement/ws_transaction.jsp',
            params: {
                mode: 'create',
                Nature_dossier: 'bordereau',
                ref_dossier: lg_FACTURE_ID,
                str_ORGANISME: Ocmb_CUSTOMER_ID,
                lg_DOSSIER_REGLEMENT_ID: oref_reglement,
                dbl_MONTANT: dbl_MONTANT
            },
            success: function (response)
            {
                // alert('success');
                var object = Ext.JSON.decode(response.responseText, false);
                //  console.log(object.str_ref);
                if (object.success == 0) {
                    win_add_displayArt.close();
                    Ext.MessageBox.alert('Erreur', 'Impossible d\'ajouter une meme facture');
                    return;
                } else {
                    ref = object.str_ref;
                    //alert('ref  ' + ref);
                    LaborexWorkFlow.SetComponentValue('str_ref_reglement_hidden', ref);
                    var OgridDetailBordereau = Ext.getCmp('gridDetailBordereau');
                    var url_detail_bordereau = '../webservices/sm_user/reglement/ws_data_reglement_by_bordereau.jsp?lg_dossier_reglement_id=' + ref;

                    LaborexWorkFlow.DoAjaxReglement(ref, url_detail_bordereau);

                    OgridDetailBordereau.getStore().getProxy().url = url_detail_bordereau;
                    OgridDetailBordereau.getStore().reload();
                    win_add_displayArt.close();

                }


            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });





    },
    InitializeDisplayArticle: function () {
        LaborexWorkFlow_displayArt = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        str_path_display = testextjs.view.sm_user.dovente.action.updateQuantity;
        Oview = this.getParentview();
        Omode = this.getMode();


        this.title = this.getTitre();
        title_debt = Me_displayArt.title;

        OFamille_search_display = Me_displayArt.getOdatasource();
        OCustomer = Me_displayArt.getO2ndatasource();

        //alert('OFamille_search_display  ' + OFamille_search_display);
        //alert('OCustomer  ' + OCustomer);
        ref_add = Me_displayArt.getNameintern();

    }
});