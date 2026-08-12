var url_services_data_dovente_checkdif__ = '../webservices/sm_user/diffclient/ws_data.jsp';
var url_services_data_typereglement__ = '../webservices/sm_user/typereglement/ws_data.jsp';
var url_services_data_modereglement__ = '../webservices/sm_user/modereglement/ws_data.jsp';

var url_services_data_by_dossier = '../webservices/sm_user/reglement/ws_data_by_dossier.jsp';
var url_services_data_by_dossier_final = '';
var url_services_data_famille_displayArticle = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_data_famille_displayArticle_by_dci = '../webservices/sm_user/detailsvente/ws_data_famille_dci.jsp';
var url_services_data_famille_displayArticle_final = '';
var url_services_data_famille_displayArticle_by_dci_final = '';


var Oview;
var Oform;
var Omode;
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


var int_AMOUNT_REMIS__;
var final_url_to_load = "";

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.sm_user.reglement.action.displayDossier', {
    extend: 'Ext.window.Window',
    xtype: 'displayDossier',
    id: 'displayDossierID',
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
    title: 'Liste Des Dossiers',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {
        Me_displayArt = this;
        Me_displayArt.InitializeDisplayArticle();
        Oform = Me_displayArt.getFrom();
        // alert("from  " + OFamille_search_display);

        url_services_data_by_dossier_final = url_services_data_by_dossier + "?lg_customer_id=" + OCustomer + "&lg_dossier_id=" + OFamille_search_display;
        //  url_services_data_famille_displayArticle_by_dci_final = url_services_data_famille_displayArticle_by_dci + "?search_value=" + OFamille_search_display;



        final_url_to_load = url_services_data_by_dossier_final;

        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});


        var itemsPerPage = 20;
        store_dossier_facture = new Ext.data.Store({
            model: 'testextjs.model.DossierFacture',
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
                    store: store_dossier_facture,
                    height: 400,
                    columns: [{
                            text: 'lg_DOSSIER_FACTURE_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_DOSSIER_FACTURE_ID'
                        }, {
                            text: 'Code Facture',
                            flex: 1,
                            dataIndex: 'str_NUM_DOSSIER'
                        }, {
                            text: 'Nom Client',
                            flex: 1,
                            dataIndex: 'str_NOM'
                        }, {
                            text: 'Montant',
                            flex: 1,
                            dataIndex: 'dbl_MONTANT'
                        }, {
                            text: 'Date execution',
                            flex: 1,
                            dataIndex: 'dt_CREATED'
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
        win_add_displayDossier = new Ext.window.Window({
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
        var oref_reglement = Ext.getCmp('str_ref_reglement_hidden').getValue();
        var Ocmb_CUSTOMER_ID = Ext.getCmp('cmb_CUSTOMER_ID').getValue();
        lg_DOSSIER_FACTURE_ID = rec.get('lg_DOSSIER_FACTURE_ID');
        var dbl_MONTANT = rec.get('dbl_MONTANT');
        //alert(dbl_MONTANT);
        //alert(Ocmb_CUSTOMER_ID);

        //alert(lg_DOSSIER_FACTURE_ID);
        Ext.Ajax.request({
            url: '../webservices/sm_user/reglement/ws_transaction.jsp',
            params: {
                mode: 'create',
                Nature_dossier: 'dossier',
                ref_dossier: lg_DOSSIER_FACTURE_ID,
                dbl_MONTANT: dbl_MONTANT,
                str_ORGANISME: Ocmb_CUSTOMER_ID,
                lg_DOSSIER_REGLEMENT_ID: oref_reglement
            },
            success: function (response)
            {
                // alert('success');
                var object = Ext.JSON.decode(response.responseText, false);
                //  console.log(object.str_ref);
                if (object.success == 0) {
                    win_add_displayDossier.close();
                    Ext.MessageBox.alert('Erreur', 'Impossible d\'ajouter un meme dossier');
                    return;
                } else {
                    ref = object.str_ref;
                    //alert('ref  ' + ref);
                    LaborexWorkFlow.SetComponentValue('str_ref_reglement_hidden', ref);
                    //  console.log(object);
                    //alert('Montant_total  ' + object.Montant_total);
                    // var int_total = Number(object.total);
                    // Ext.getCmp('int_Nbr_Dossier').setValue(object.results[0].int_NB_DOSSIER);

                    var OgridDetailDossier = Ext.getCmp('gridDetailDossier');
                    var url_detail_dossier = '../webservices/sm_user/reglement/ws_data_reglement_by_dossier.jsp?lg_dossier_reglement_id=' + ref;

                    LaborexWorkFlow.DoAjaxReglement(ref, url_detail_dossier);

                    OgridDetailDossier.getStore().getProxy().url = url_detail_dossier;
                    OgridDetailDossier.getStore().reload();
                    win_add_displayDossier.close();
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