var url_services_data_client_displayAyantDroit = '../webservices/configmanagement/ayantdroit/ws_data.jsp';


var Oview;
var Omode;
var Me_displayAyantDroit;
var ref_add;
var LaborexWorkFlow;
var str_path_displayAyantDroit;
var itemsPerPage = 20;
var OCustomerDisplaygridpanelID;
var OFieldProduct;
var win_add_displayAyantDroit;
var OCustomer_search_display;
var OCustomer_vente_display;
var OCust_num_ss;
var OCust_str_id_ayantdroit;
var OCust_str_nom;
var OCust_str_prenom;
var OCust_str_id;
var OCust_compte_id;
var OCust_compte_solde;



Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.sm_user.dovente.action.displayAyantDroit', {
    extend: 'Ext.window.Window',
    xtype: 'displayAyantDroit',
    id: 'displayAyantDroitID',
    requires: [
        //  'Ext.selection.CellModel',
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.model.CompteClient'

    ],
    config: {
        odatasource: '',
        o2ndatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: '',
        venteTierspayant: ''
    },
    title: 'AYANT(S) DROIT CORRESPONDANT(S) A LA RECHERCHE',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {
        Me_displayAyantDroit = this;
        Me_displayAyantDroit.InitializeDisplayArticle();
        console.log(this.getVenteTierspayant(), 'venteTierspayant');

        var store_client_displayAyantDroit = LaborexWorkFlow.BuildStore('testextjs.model.AyantDroit', itemsPerPage, url_services_data_client_displayAyantDroit_final);


        var form_displayAyantDroit = new Ext.form.Panel({
            width: 1050,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            items: ['CustomerDisplaygridpanelID'],
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
                    id: 'CustomerDisplaygridpanelID',
                    store: store_client_displayAyantDroit,
                    height: 200,
                    columns: [{
                            text: 'MATRICULE/ SS',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'str_NUMERO_SECURITE_SOCIAL'
                        }, {
                            text: 'NOM',
                            flex: 1,
                            dataIndex: 'str_FIRST_NAME'
                        }, {
                            text: 'PRENOM',
                            flex: 1,
                            dataIndex: 'str_LAST_NAME'
                        }],
                    tbar: [
                        {
                            text: 'Creer',
                            scope: this,
                            iconCls: 'addicon',
                            handler: this.onAddClick
                        }, '-',
                        {
                            xtype: 'textfield',
                            id: 'rechercher_adddisplay',
                            name: 'user',
                            emptyText: 'Recherche',
                            listeners: {
                                'render': function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) {
                                            Me_displayAyantDroit.onRechClick();

                                        }
                                    });
                                }
                            }
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon',
                            handler: this.onRechClick
                        }],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store_client_displayAyantDroit,
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
        win_add_displayAyantDroit = new Ext.window.Window({
            autoShow: true,
            id: 'CustdisplayArtwinID',
            title: this.getTitre(),
            width: 500,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form_displayAyantDroit,
            buttons: [{
                    text: 'OK',
                    id: 'btn_displayAyantDroit_saveID',
                    hidden: true,
                    handler: function () {
                        win_add_displayAyantDroit.onbtnsave_addclt();
                    }
                }, {
                    text: 'Retour',
                    id: 'btn_displayAyantDroit_anulerID',
                    hidden: true,
                    handler: function () {
                        win_add_displayAyantDroit.close();
                    }
                }]

        });

        Me_displayAyantDroit.ViewLoading();

    },
    loadStore: function () {
        OCustomerDisplaygridpanelID.load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onRechClick: function () {
        var val = Ext.getCmp('rechercher_adddisplay');
        //  OCustomerDisplaygridpanelID.getStore().getProxy().url = url_services_data_client_displayAyantDroit_final;
        OCustomerDisplaygridpanelID.getStore().reload({
            params: {
                search_value: val.value
            }
        }, url_services_data_client_displayAyantDroit_final);


    },
    onAddClick: function () {

        new testextjs.view.sm_user.dovente.action.addAyant({
            odatasource: OCustomer_search_display,
            parentview: this,
            mode: "ayantdroitclientvente",
            titre: "Ajouter Ayant Droit",
            type: "ayantdroitclientvente"
        });
    },
    onSelectionChange: function (model, records) {
        var rec = records[0];
        console.log('LaborexWorkFlow', LaborexWorkFlow.venteTierspayant);
        LaborexWorkFlow.updateAyantdroit(rec); //code a jouté

        win_add_displayAyantDroit.close();

    },
    InitializeDisplayArticle: function () {
        
        // LaborexWorkFlow_displayAyantDroit
// LaborexWorkFlow_displayAyantDroit = Ext.create('testextjs.controller.LaborexWorkFlow', {});
      
        OCustomer_search_display = Me_displayAyantDroit.getOdatasource();

        url_services_data_client_displayAyantDroit_final = "../webservices/configmanagement/ayantdroit/ws_data.jsp?lg_CLIENT_ID=" + OCustomer_search_display;

        Oview = this.getParentview();
        Omode = this.getMode();

    },
    ViewLoading: function () {
        url_services_data_client_displayAyantDroit_final = url_services_data_client_displayAyantDroit;
        OCustomerDisplaygridpanelID = Ext.getCmp('CustomerDisplaygridpanelID');
        OFieldProduct = Ext.getCmp('str_NAME');
        OCust_num_ss = Ext.getCmp('str_NUMERO_SECURITE_SOCIAL');
        OCust_str_prenom = Ext.getCmp('str_FIRST_NAME');
        OCust_str_nom = Ext.getCmp('str_LAST_NAME');
        OCust_str_id = Ext.getCmp('lg_CLIENT_ID_FIND');
        OCust_compte_id = Ext.getCmp('lg_COMPTE_CLIENT_ID');
        OCust_compte_solde = Ext.getCmp('lg_SOLDE_CLT_ID');

    }
});