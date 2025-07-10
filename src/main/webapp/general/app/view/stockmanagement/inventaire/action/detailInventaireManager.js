/* global Ext */

var url_services_pdf_fiche_inventaire = '../webservices/stockmanagement/inventaire/ws_generate_pdf.jsp';
var url_services_data_grossiste = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_famillearticle = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_zonegeo = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_data_inventaire_famille;


var Me;
var famille_id_search;
var famille_price_search;
var famille_qte_search;
var type_vente_id;
var type_reglement_id;

var str_CAISSIER;


var Omode;
var ref;
var store_inventaire_famille;


var int_monnaie;
var int_total_final;
var int_nb_famille;
var old_qte;

var int_total_formated;
var in_total_vente;
var int_total_product;
var my_view_title;

var ref_vente;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.stockmanagement.inventaire.action.detailInventaireManager', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.NatureVente',
        'testextjs.model.TypeReglement',
        'testextjs.view.configmanagement.client.ClientManager',
        'testextjs.view.sm_user.dovente.action.addtp'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
//        tools: [{type: "pin"}],
        closable: false,
        nameintern: ''
    },
    xtype: 'detailinventaireManager',
    id: 'detailinventaireManagerID',
    frame: true,
    title: 'Detail de l\'inventaire',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {


        Me = this;
        famille_id_search = "";
        famille_price_search = 0;
        famille_qte_search = 0;
//        store_inventaire_famille = "";

        int_total_final = 0;
        int_nb_famille = 0;
        old_qte = 0;

        int_monnaie = 0;
        in_total_vente = 0;
        int_total_formated = 0;
        int_total_product = 0;

        str_CAISSIER = "";

        ref_vente = "";
        type_reglement_id = "";
        //  alert("new vente" + this.getTitre());
        this.title = this.getTitre();

        my_view_title = this.title;

        ref_vente = this.getNameintern();
        if (this.getNameintern() === "0") {
            ref = this.getNameintern();
        } else {
            ref = this.getOdatasource().lg_INVENTAIRE_ID;
        }

        if (my_view_title === "by_cloturer_vente_add") {
            ref = ref_add;
            //cust_name,cust_account_id

        }

        var store_grossiste = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                     url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_famillearticle = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famillearticle,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_zonegeo = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeo,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        url_services_data_inventaire_famille = '../webservices/stockmanagement/inventaire/ws_data_inventaire_famille.jsp?lg_INVENTAIRE_ID=' + ref;
        var itemsPerPage = 20;
//        var store = new Ext.data.Store({
//            model: 'testextjs.model.Famille',
//            pageSize: itemsPerPage,
//            // autoLoad: false,
//            remoteFilter: true,
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_inventaire_famille,
//                reader: {
//                    type: 'json',
//                    root: 'results',
//                    totalProperty: 'total'
//                }
//            },
//            autoLoad: true
//
//        });




        var itemsPerPage = 20;
        store_inventaire_famille = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_inventaire_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        dt_CREATED = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Date :',
                    name: 'dt_CREATED',
                    id: 'dt_CREATED',
                    fieldStyle: "color:blue;",
                    flex: 1,
                    margin: '0 15 0 0'
                });
        lg_USER_ID = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Utilisateur :',
                    name: 'lg_USER_ID',
                    id: 'lg_USER_ID',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        str_NAME_INVENTAIRE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Libelle :',
                    name: 'str_NAME_INVENTAIRE',
                    id: 'str_NAME_INVENTAIRE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 1

                });





        str_COMMENTAIRE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Commentaire::',
                    name: 'str_COMMENTAIRE',
                    id: 'str_COMMENTAIRE',
                    fieldStyle: "color:blue;",
                    margin: '0 5 15 0',
                    value: "0"


                });
        int_TOTAL_PRICE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Total vente::',
                    name: 'int_TOTAL_PRICE',
                    id: 'int_TOTAL_PRICE',
                    renderer: amountformat,
                    fieldStyle: "color:blue; text-align:right;",
                    margin: '0 5 15 15',
                    value: "0"


                });
        int_TOTAL_PAT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Total PAT::',
                    name: 'int_TOTAL_PAT',
                    id: 'int_TOTAL_PAT',
                    renderer: amountformat,
                    fieldStyle: "color:blue; text-align:right;",
                    margin: '0 5 15 15',
                    value: "0"


                });

        int_MOY_VENTE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Total PMP::',
                    name: 'int_MOY_VENTE',
                    id: 'int_MOY_VENTE',
                    renderer: amountformat,
                    fieldStyle: "color:blue; text-align:right;",
                    margin: '0 5 15 15',
                    value: "0"


                });


        int_TOTAL_PAF = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Total PAF::',
                    name: 'int_TOTAL_PAF',
                    id: 'int_TOTAL_PAF',
                    renderer: amountformat,
                    fieldStyle: "color:blue; text-align:right;",
                    margin: '0 5 15 15',
                    value: "0"


                });


        int_TOTAL_ECART = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Total &eacute;cart::',
                    name: 'int_TOTAL_ECART',
                    id: 'int_TOTAL_ECART',
                    renderer: amountformat,
                    fieldStyle: "color:blue; text-align:right;",
                    margin: '0 5 15 15',
                    value: "0"


                });



   



        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: '98%',
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 10
            },
            defaults: {
                flex: 1
            },
            id: 'panelID',
            items: ['rech_prod', 'gridpanelID'],
            items: [
                {
                    items: [{
                            xtype: 'fieldset',
                            title: 'Infos Generales',
                            collapsible: true,
                            defaultType: 'textfield',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'fieldcontainer',
//                                    fieldLabel: 'Confrere',
                                    layout: 'hbox',
                                    combineErrors: true,
                                    defaultType: 'textfield',
                                    defaults: {
                                        hideLabel: 'true'
                                    },
                                    items: [
                                        str_NAME_INVENTAIRE,
                                        lg_USER_ID,
                                        dt_CREATED
                                    ]
                                }]
                        }
                    ]

                }, {
                    xtype: 'fieldset',
                    title: 'Liste Produit(s)',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridpanelID',
                            selType : "cellmodel",//rowModel
                            plugins: [{
                                    ptype: 'cellediting',
                                    clicksToEdit: 1
                                }],
                            store: store_inventaire_famille,
                            height: 300,
                            columns: [{
                                    text: 'lg_INVENTAIRE_FAMILLE_ID',
                                    flex: 1,
                                    hidden: true,
                                    dataIndex: 'lg_INVENTAIRE_FAMILLE_ID',
                                    id: 'lg_INVENTAIRE_FAMILLE_ID'
                                }, {
                                    text: 'lg_INVENTAIRE_ID',
                                    flex: 1,
                                    hidden: true,
                                    dataIndex: 'lg_INVENTAIRE_ID',
                                    id: 'lg_INVENTAIRE_ID'
                                }, {
                                    text: 'lg_FAMILLE_ID',
                                    flex: 1,
                                    hidden: true,
                                    dataIndex: 'lg_FAMILLE_ID',
                                    id: 'lg_FAMILLE_ID'
                                }, {
                                    text: 'CIP',
                                    flex: 0.7,
                                    sortable: true,
                                    dataIndex: 'int_CIP'
                                }, {
                                    text: 'str_NAME',
                                    flex: 0.5,
                                    hidden: true,
                                    sortable: true,
                                    dataIndex: 'str_NAME'
                                }, {
                                    text: 'Designation',
                                    flex: 1.5,
                                    sortable: true,
                                    dataIndex: 'str_DESCRIPTION'

                                }, {
                                    text: 'Prix.vente',
                                    flex: 0.7,
                                    sortable: true,
                                    dataIndex: 'int_PRICE',
                                    renderer: amountformat,
                                    align: 'right'
                                }/*, {
                                 text: 'Prix de reference',
                                 flex: 1,
                                 sortable: true,
                                 dataIndex: 'int_PRICE_REF',
                                 renderer: amountformat,
                                 align: 'right'
                                 }*/, {
                                    text: 'PAF',
                                    dataIndex: 'int_PAF',
                                    sortable: true,
                                    renderer: amountformat,
                                    align: 'right',
                                    flex: 0.5
//                                    ,
//                                    detailor: {
//                                        xtype: 'numberfield',
//                                        allowBlank: false,
//                                        regex: /[0-9.]/
//                                    }
                                }, {
                                    text: 'PAT',
                                    flex: 0.5,
                                    sortable: true,
                                    dataIndex: 'int_PAT',
                                    renderer: amountformat,
                                    align: 'right'
//                                    ,
//                                    detailor: {
//                                        xtype: 'numberfield',
//                                        allowBlank: false,
//                                        regex: /[0-9.]/
//                                    }
                                }, {
                                    text: 'Stock rayon',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_NUMBER_AVAILABLE',
                                    //renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Stock.Machine',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_TAUX_MARQUE',
                                    //renderer: amountformat,
                                    align: 'right'
                                },
                                {
                                    header: 'Ecart',
                                    dataIndex: 'int_QTE_SORTIE',
                                    flex: 0.4,
                                    align: 'right',
                                    sortable: true
                                }, {
                                    text: 'Co&ucirc;t PAF',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_S',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Co&ucirc;t PAT',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_T',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Co&ucirc;t PMP',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_MOY_VENTE',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Co&ucirc;t &eacute;cart',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_QTE_REAPPROVISIONNEMENT',
                                    renderer: amountformat,
                                    align: 'right'
                                }],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_inventaire_famille,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                            }
                        }]
                }, {
                    xtype: 'fieldset',
                    //fieldLabel: 'Espace commentaire',
                    title: 'Detail de l\'inventaire',
                    layout: 'hbox',
                    collapsible: true,
                    defaultType: 'textfield',
                    defaults: {
                        hideLabel: 'true'
                    },
                    items: [
                        /*{
                         xtype: 'textareafield',
                         grow: true,
                         name: 'str_COMMENTAIRE',
                         fieldLabel: 'Commentaire',
                         id: 'str_COMMENTAIRE',
                         anchor: '100%',
                         emptyText: 'Saisir un commentaire'
                         
                         }*/
                        str_COMMENTAIRE,
                        int_TOTAL_PRICE,
                        int_TOTAL_PAT,
                        int_TOTAL_PAF,
                        int_MOY_VENTE,
                        int_TOTAL_ECART

                    ]
                },
                ,
                        {
                            xtype: 'toolbar',
                            ui: 'footer',
                            dock: 'bottom',
                            border: '0',
                            items: ['->', {
                                    text: 'Retour',
                                    id: 'btn_back',
                                    iconCls: 'icon-clear-group',
                                    scope: this,
                                    handler: this.onbtnback
                                }, {
                                    text: 'Imprimer',
                                    id: 'btn_loturer',
                                    iconCls: 'icon-clear-group',
                                    scope: this,
                                    handler: this.onbtnprint
                                }, {
                                    text: 'Exporter TXT',
                                    id: 'btn_export_txt',
                                    iconCls: 'icon-clear-group',
                                    scope: this,
                                    handler: this.onbtnexportTxt
                                }, {
                                    text: 'Exporter CSV',
                                    id: 'btn_export_cvs',
                                    iconCls: 'icon-clear-group',
                                    scope: this,
                                    handler: this.onbtnexportCsv
                                }
                            ]
                        }]
        });
        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



        if (my_view_title === "Detail de la fiche d'inventaire") {
            Ext.getCmp('str_NAME_INVENTAIRE').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('lg_USER_ID').setValue(this.getOdatasource().lg_USER_ID);
            Ext.getCmp('dt_CREATED').setValue(this.getOdatasource().dt_CREATED);
            Ext.getCmp('str_COMMENTAIRE').setValue(this.getOdatasource().str_DESCRIPTION);
            this.title = my_view_title + " ::  " + this.getOdatasource().str_NAME;
            ref = this.getOdatasource().lg_INVENTAIRE_ID;


        }



    },
    loadStore: function () {
        Ext.getCmp('gridpanelID').getStore().load({
            callback: this.onStoreLoad
        });

    },
    onStoreLoad: function () {
        var grid = Ext.getCmp('gridpanelID');
        var int_TOTAL = 0, int_TOTAL_PAT = 0, int_TOTAL_PAF = 0, int_TOTAL_ECART = 0, int_MOY_VENTE = 0;
        this.each(function (rec) {
//                alert("lg_INVENTAIRE_FAMILLE_ID " + rec.get('lg_INVENTAIRE_FAMILLE_ID'));
            int_TOTAL += parseInt(rec.get('int_PRICE')) * parseInt(rec.get('int_NUMBER_AVAILABLE'));
            int_TOTAL_PAT += parseInt(rec.get('int_T'));
            int_TOTAL_PAF += parseInt(rec.get('int_S'));
            int_TOTAL_ECART += parseInt(rec.get('int_QTE_REAPPROVISIONNEMENT'));
            int_MOY_VENTE += parseInt(rec.get('int_MOY_VENTE'));
        });
        Ext.getCmp('int_TOTAL_PRICE').setValue(int_TOTAL);
        Ext.getCmp('int_TOTAL_PAT').setValue(int_TOTAL_PAT);
        Ext.getCmp('int_TOTAL_PAF').setValue(int_TOTAL_PAF);
        Ext.getCmp('int_TOTAL_ECART').setValue(int_TOTAL_ECART);
        Ext.getCmp('int_MOY_VENTE').setValue(int_MOY_VENTE);

        if (grid.getStore().getCount() > 0) {
            var firstRec = grid.getStore().getAt(0);
            if (firstRec.get('is_AUTHORIZE_STOCK') == false) { // cacher le champ stock machine
//                alert("entete " + grid.headerCt.getHeaderAtIndex(8).text);
                Me.findColumnByDataIndex(grid, 6).setVisible(false);
                Me.findColumnByDataIndex(grid, 6).setVisible(false);
            }
        }

    },
    onbtnback: function () {
        var xtype = "";
        xtype = "inventaire";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onbtnprint: function () {
        Me.onPdfClick();
    }, onbtnexportTxt: function () {
        var lg_GROSSISTE_ID = "%%", lg_FAMILLEARTICLE_ID = "%%", lg_ZONE_GEO_ID = "%%";
        var str_TYPEREPORT = "txt";

//        window.location = '../DownloadFileServlet?lg_INVENTAIRE_ID=' + ref + "&str_TYPEREPORT=" + str_TYPEREPORT + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&str_TYPE_ACTION=INVENTAIRE";
        window.location = '../DownloadFileServlet?lg_INVENTAIRE_ID=' + ref + "&str_TYPEREPORT=" + str_TYPEREPORT + "&str_TYPE_ACTION=INVENTAIRE";
    },
    onbtnexportCsv: function () {
        var str_TYPEREPORT = "csv";
        window.location = '../DownloadFileServlet?lg_INVENTAIRE_ID=' + ref + "&str_TYPEREPORT=" + str_TYPEREPORT + "&str_TYPE_ACTION=INVENTAIRE";
    },
    onPdfClick: function () {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_fiche_inventaire + '?lg_INVENTAIRE_ID=' + ref + "&str_NAME_FILE=final";
        //alert("Ok ca marche " + linkUrl);
        window.open(linkUrl);

//        var xtype = "";
//        xtype = "inventaire";
//        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");

 },
    findColumnByDataIndex: function (grid, columnIndex) {
        var columnFind = grid.headerCt.getHeaderAtIndex(columnIndex);
        return columnFind;
    }

});
