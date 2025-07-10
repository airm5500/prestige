/* global Ext */

var url_services_data_type_facture = '../webservices/sm_user/typefacture/ws_data.jsp';
var url_services_data_detail_facture = '../webservices/commandemanagement/orderdetail/ws_data.jsp?lg_ORDER_ID=';

url_services_data_detail_facture_tiers_payant = '../webservices/sm_user/facturation/ws_data_detail_tiers_payant.jsp';
var url_services_data_tiers_payant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';

var url_services_data_type_tierspayant = '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp';
var url_services_data_nature_vente_dovente = '../webservices/configmanagement/naturevente/ws_data.jsp';
var url_services_data_modereglement_dovente = '../webservices/sm_user/modereglement/ws_data.jsp';

var url_detail_bordereau = '../webservices/sm_user/reglement/ws_data_reglement_by_bordereau.jsp?lg_dossier_reglement_id=';
var url_detail_dossier = '../webservices/sm_user/reglement/ws_data_reglement_by_bordereau.jsp?lg_dossier_reglement_id=';

var odatasource;
var my_url;
var Me;
var Omode;
var ref;
var net = 0;
var str_CODE_FACTURE;
var dbl_MONTANT_CMDE;
var str_CUSTOMER = "";
var int_NB_DOSSIER;
var lg_FACTURE_ID = "";
lg_TYPE_TIERS_PAYANT_ID = "";
str_CUSTOMER_NAME = "";
var dbl_MONTANT_PAYE;
var dbl_MONTANT_RESTANT;
var famille_id_search;
var in_total_vente;
var int_total_formated;
var int_montant_vente;
var int_montant_achat;
var checkedList;
var listProductSelected;
var LaborexWorkFlow;
var myAppController;
var isHide = true;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.sm_user.reglement.action.DoReglement', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.Grossiste',
        'testextjs.model.OrderDetail',
        'testextjs.controller.LaborexWorkFlow',
        'Ext.ux.CheckColumn',
        'Ext.selection.CheckboxModel',
        'testextjs.model.DossierFacture',
        'testextjs.model.DetailsBorderaux',
        'testextjs.controller.App'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
        //tools: [{type: "pin"}],
        // closable: true,
        nameintern: ''
    },
    xtype: 'doreglementmanager',
    id: 'doreglementmanagerID',
    frame: true,
    title: 'Faire R&eacute;glement',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {


        Me = this;
        listProductSelected = [];
        checkedList = [];
        var itemsPerPage = 20;
        famille_id_search = "";
        in_total_vente = 0;
        int_total_formated = 0;
        isHide = true;
        ref = this.getNameintern();
        odatasource = this.getOdatasource();
        dbl_MONTANT_CMDE = odatasource.dbl_MONTANT_CMDE;
        int_NB_DOSSIER = odatasource.int_NB_DOSSIER;
        str_CUSTOMER = odatasource.str_CUSTOMER;
        int_NB_DOSSIER = odatasource.int_NB_DOSSIER;
        lg_FACTURE_ID = odatasource.lg_FACTURE_ID;
        str_CUSTOMER_NAME = odatasource.str_CUSTOMER_NAME;
        lg_TYPE_TIERS_PAYANT_ID = odatasource.lg_TYPE_TIERS_PAYANT_ID;
        dbl_MONTANT_RESTANT = odatasource.dbl_MONTANT_RESTANT,
                dbl_MONTANT_PAYE = odatasource.dbl_MONTANT_PAYE,
                str_CODE_FACTURE = odatasource.str_CODE_FACTURE,
                net = 0;
        titre = this.getTitre();
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        myAppController = Ext.create('testextjs.controller.App', {});
        url_services_data_detail_facture = '../webservices/commandemanagement/orderdetail/ws_data.jsp?lg_ORDER_ID=' + ref;

        my_url = '../webservices/sm_user/modereglement/ws_data.jsp';

        var store_modereglement = LaborexWorkFlow.BuildStore('testextjs.model.ModeReglement', itemsPerPage, url_services_data_modereglement_dovente);



        store_type_tierpayant = new Ext.data.Store({
            model: 'testextjs.model.TypeTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tiers_payant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_typereglement = new Ext.data.Store({
            model: 'testextjs.model.TypeReglement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/sm_user/reglement/ws_mode_reglemnt.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });
        var store_detail_bordereau = new Ext.data.Store({
            model: 'testextjs.model.DetailsBorderaux',
            pageSize: 5,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_detail_bordereau + "&lg_FACTURE_ID=" + lg_FACTURE_ID,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        store_detail_dossier = new Ext.data.Store({
            model: 'testextjs.model.Facture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_detail_dossier,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var store_type_paiement = Ext.create('Ext.data.Store', {
            autoLoad: true,
            fields: ['lg_NATURE_PAIEMENT_ID', 'str_LIBELLE_NATURE_PAIEMENT'],
            data: [
                {"lg_NATURE_PAIEMENT_ID": "1", "str_LIBELLE_NATURE_PAIEMENT": "Partiel"},
                {"lg_NATURE_PAIEMENT_ID": "2", "str_LIBELLE_NATURE_PAIEMENT": "Total"}
            ]
        });

        store_detail_facture_fournisseur = new Ext.data.Store({
            model: 'testextjs.model.Facture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detail_facture,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_fournisseur = new Ext.data.Store({
            model: 'testextjs.model.Facture',
            pageSize: itemsPerPage,
            remoteFilter: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_tiers_payant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });
        store_type_tierpayant = new Ext.data.Store({
            model: 'testextjs.model.TypeTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_type_tierspayant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var int_NBR_DOSSIER = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Dossiers Restants ::',
                    // labelWidth: 100,
                    name: 'int_Nbr_Dossier',
                    id: 'int_Nbr_Dossier',
                    margin: '0 5 0 0',
                    value: "0",
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    fieldStyle: "color:blue;font-weight:800;"
                });
        var int_MONTANT_REGLEMENT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Net &agrave payer :',
                    //labelWidth: 95,
                    name: 'int_MONTANT_REGLEMENT',
                    id: 'int_MONTANT_REGLEMENT',
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    fieldStyle: "color:red;font-weight:800;",
                    listeners: {
                        change: function () {
                            var int_AMOUNT_RECU = Ext.getCmp('int_AMOUNT_RECU').getValue();


                            if (int_AMOUNT_RECU !== "") {
                                var int_total = 0;
                                var in_total_vente_monnaie = 0;
                                var in_total_vente_monnaie_temp = 0;
                                var int_monnaie_monnaie = 0;
                                var int_amount_restant = 0;
                                in_total_vente_monnaie_temp = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_MONTANT_REGLEMENT').getValue(), " ");
                                var in_total_vente_monnaie_temp_final = LaborexWorkFlow.amountdeformat(in_total_vente_monnaie_temp);
                                in_total_vente_monnaie = Number(in_total_vente_monnaie_temp_final);

                                var int_montant_recu = (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()));
                                int_monnaie_monnaie = Number(LaborexWorkFlow.DisplayMonnaie(in_total_vente_monnaie, int_montant_recu));
                                int_amount_restant = Number(LaborexWorkFlow.DisplayAmountRestant(in_total_vente_monnaie, int_montant_recu));
                                Ext.getCmp('int_AMOUNT_REMIS').setValue(int_monnaie_monnaie + ' CFA');
                                Ext.getCmp('int_REEL_RESTE').setValue(int_amount_restant + ' CFA');
                                var int_amount_restant = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
                                var int_amount_restant_final = 0;
                                int_amount_restant_final = Number(int_amount_restant);
                            }




                        }},
                    margin: '0 15 0 0',
                    value: "0"
                });
       
        Ext.apply(this, {
            width: '99%',
            height: 580,
            cls: 'custompanel',
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 120,
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

            items: [
                {
                    xtype: 'fieldset',
                    title: 'Infos Organisme',
                    collapsible: true,
                    flex: 0.4,
                    margin: '-10 0 0 1',
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        hideLabel: 'true'
                    },
                    items: [
                        {
                            xtype: 'fieldcontainer',
                            layout: 'hbox',
                            // combineErrors: true,
                            defaultType: 'textfield',
                            defaults: {
                                //hideLabel: 'true'
                            },
                            items: [
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Type organisme :',
                                    labelWidth: 110,
                                    fieldStyle: "color:blue;font-weight:800;",
                                    name: 'cmb_TYPE_TIERS_PAYANT',
                                    margins: '0 0 0 10',
                                    id: 'cmb_TYPE_TIERS_PAYANT'
                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Organisme : ',
                                    fieldStyle: "color:blue;font-weight:800;",
                                    name: 'cmb_CUSTOMER_ID',
                                    margin: '0 15 0 15',
                                    id: 'cmb_CUSTOMER_ID'
                                }
                                , {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Code Facture : ',
                                    fieldStyle: "color:blue;font-weight:800;",
                                    name: 'str_CODE_FACTURE',
                                    margin: '0 15 0 15',
                                    id: 'str_CODE_FACTURE'
                                }

                            ]
                        }]
                }, {
                    xtype: 'fieldset',
                    id: 'fieldset_information_organisme',
                    title: 'Information R&eacute;glement',
                    collapsible: true,
                    layout: 'hbox',
                    flex: 0.4,
                    margin: '1 0 0 1',
//                    bodyPadding: 10,
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type Paiement :',
                            //allowBlank: false,
                            labelWidth: 100,
                            name: 'lg_NATURE_PAIEMENT',
                            margins: '0 0 0 10',
                            id: 'lg_NATURE_PAIEMENT',
                            store: store_type_paiement,
                            //disabled: true,
                            valueField: 'lg_NATURE_PAIEMENT_ID',
                            displayField: 'str_LIBELLE_NATURE_PAIEMENT',
                            typeAhead: true,
                            queryMode: 'remote',
                            // flex: 1,
                            emptyText: 'Selectionner ',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();
                                    var grid = Ext.getCmp('gridDetailBordereau');
                                    if (value === "1") {
                                        grid.columns[9].setVisible(true);
                                        Ext.getCmp('selectALL').show();
                                        //  LaborexWorkFlow.findColumnByDataIndex(grid, 6).setVisible(true);
                                        Ext.getCmp('int_MONTANT_REGLEMENT').setValue(0);
                                    } else {
                                        Ext.getCmp('selectALL').hide();
                                        if (grid.columns[9].isVisible()) {
                                            grid.columns[9].setVisible(false);
                                        }
                                        Ext.getCmp('int_MONTANT_REGLEMENT').setValue(Ext.getCmp('dbl_MONTANT_RESTANT').getValue());
                                    }
                                    customer_id = value;

                                }
                            }
                        }
                        , {
                            xtype: 'datefield',
                            fieldLabel: 'Date R&eacute;glement',
                            id: 'dt_reglement',
                            labelWidth: 130,
                            name: 'dt_reglement',
                            emptyText: 'Date reglement',
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            margin: '0 0 0 15'

                        },
                        {
                            xtype: 'hiddenfield',
                            name: 'str_ref_reglement_hidden',
                            id: 'str_ref_reglement_hidden',
                            value: '0'
                        }

                    ]
                },
                {
                    xtype: 'fieldset',
                    id: 'fieldset_information_reglement',
                    title: 'Information Facture',
                    collapsible: true,
                    layout: 'hbox',
                    flex: 0.4,
                    margin: '1 0 0 1',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'Montant Total:',
                            labelWidth: 100,
                            margin: '0 5',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            id: 'TOTAL_AMOUNT',
                            fieldStyle: "color:blue;font-weight:800;"
                        }
                        ,
                        int_MONTANT_REGLEMENT,
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'Montant Pay&eacute;:',
                            margin: '0 5',
                            name: 'dbl_MONTANT_PAYE',
                            id: 'dbl_MONTANT_PAYE',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:green;font-weight:800;"
                        }, {
                            xtype: 'displayfield',
                            fieldLabel: 'Montant Restant:',
                            margin: '0 5',
                            name: 'dbl_MONTANT_RESTANT',
                            id: 'dbl_MONTANT_RESTANT',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;"
                        },
                        int_NBR_DOSSIER
                                ,

                        {
                            hidden: true,
                            xtype: 'checkbox',
                            margins: '0 0 5 5',
                            boxLabel: 'Tous S&eacute;lectionner',
                            id: 'selectALL',
                            checked: false,
                            listeners: {
                                change: function () {

                                    //
                                    var grid = Ext.getCmp('gridDetailBordereau');
                                    var CODEstore = grid.getStore();
                                    if (this.getValue()) {
                                        if (listProductSelected.length > 0) {
                                            listProductSelected = [];
                                        }
                                        net = Ext.getCmp('dbl_MONTANT_RESTANT').getValue();

                                        Ext.getCmp('int_MONTANT_REGLEMENT').setValue(Ext.getCmp('dbl_MONTANT_RESTANT').getValue());


                                        //    Ext.getCmp('int_AMOUNT_RECU').setValue(net);
                                        for (var i = 0; i < CODEstore.getCount(); i++) {
                                            var record = CODEstore.getAt(i);
                                            record.set('isChecked', true);
                                        }


                                    } else {
                                        net = 0;
                                        Ext.getCmp('int_MONTANT_REGLEMENT').setValue(0);

//                                                 Ext.getCmp('int_AMOUNT_RECU').setValue(net);
                                        CODEstore.each(function (rec, id) {
                                            rec.set('isChecked', false);
                                        });

                                    }
                                    CODEstore.commitChanges();
                                    grid.reconfigure(CODEstore);

                                }
                            }
                        }

                    ]
                },
                {
                    xtype: 'fieldset',
                    id: 'detaildiffere',
                    title: 'Detail(s) des r&eacute;glements',
                    collapsible: true,
                    flex: 2.5,
                    margin: '1 0 0 1',
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridDetailDossier',
                            hidden: true,
                            //  plugins: [this.cellEditing],

                            store: store_detail_dossier,
                            height: 150,
                            columns: [
                                {
                                    text: 'lg_DOSSIER_ID',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_DOSSIER_ID'
                                }, {
                                    text: 'Code Facture',
                                    flex: 1,
                                    align: 'right',
                                    dataIndex: 'lg_DOSSIER_ID'
                                }, {
                                    text: 'Numero Bon',
                                    flex: 1,
                                    align: 'right',
                                    dataIndex: 'str_NUM_BON'
                                }, {
                                    text: 'Nom Client',
                                    flex: 1,
                                    dataIndex: 'str_NOM'
                                }, {
                                    text: 'Montant',
                                    flex: 1,
                                    align: 'right',
                                    renderer: amountformat,
                                    dataIndex: 'dbl_MONTANT'
                                }, {
                                    text: 'Date execution',
                                    flex: 1,
                                    dataIndex: 'dt_CREATED'
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
                                }
                            ],
                            //  selModel: selModel,
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_detail_dossier,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this,
                                selectionchange: this.onSelectionChange
                            }
                        }
                        , {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridDetailBordereau',
//                            hidden: true,
                            //  plugins: [this.cellEditing],

                            store: store_detail_bordereau,
                            height: 180,
                            columns: [
                                {
                                    text: 'lg_FACTURE_DETAIL_ID',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    align: 'right',
                                    dataIndex: 'lg_FACTURE_DETAIL_ID'
                                }, {
                                    text: 'R&eacute;f&eacute;rence.Bon',
                                    flex: 1,
                                    // align: 'right',
                                    dataIndex: 'str_REF'
                                }, {
                                    text: 'Nom & Pr&eacute;nom(s)',
                                    flex: 1,
                                    dataIndex: 'CLIENT_FULL_NAME',
                                    // align: 'right'
                                }, {
                                    text: 'Num Matricule',
                                    flex: 1,
                                    dataIndex: 'CLIENT_MATRICULE',
                                    // align: 'right'
                                },
                                {
                                    text: 'Date Vente',
                                    flex: 1,
                                    dataIndex: 'dt_DATE',
                                    // align: 'right'
                                },
                                {
                                    text: 'Heure Vente',
                                    flex: 1,
                                    dataIndex: 'dt_HEURE',
                                    // align: 'right'
                                },
                                {
                                    text: 'Montant',
                                    flex: 1,
                                    dataIndex: 'Amount',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Montant Pay&eacute;',
                                    flex: 1,
                                    dataIndex: 'dbl_MONTANT_PAYE',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Montant Restant',
                                    flex: 1,
                                    dataIndex: 'dbl_MONTANT_RESTANT',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: '',
                                    width: 50,
//                                    hidden: true,
                                    dataIndex: 'isChecked',
                                    xtype: 'checkcolumn',
                                    listeners: {
                                        checkChange: this.onCheckChange
                                    }

                                }

                            ],
                            //  selModel: selModel,
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_detail_bordereau,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this,
                                selectionchange: this.onSelectionChange
                            }
                        }, {
                            xtype: 'fieldset',
                            labelAlign: 'right',
                            title: '<span style="color:blue;">REGLEMENT</span>',
                            id: 'reglementID',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            collapsible: true,
                            defaultType: 'textfield',
                            // layout: 'anchor',
                            /*defaults: {
                             anchor: '100%'
                             },*/
                            items: [
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            labelWidth: 120,
                                            fieldLabel: 'Type.R&eacute;glement',
                                            name: 'lg_TYPE_REGLEMENT_ID',
                                            id: 'lg_TYPE_REGLEMENT_ID',
                                            store: store_typereglement,
                                            value: 'Especes',
                                            width: '50%',
                                            valueField: 'lg_TYPE_REGLEMENT_ID',
                                            displayField: 'str_NAME',
                                            typeAhead: true,
                                            queryMode: 'remote',
//                                            allowBlank: false,
                                            emptyText: 'Choisir un type de reglement...',
                                            listeners: {
                                                select: function (cmp) {
                                                    LaborexWorkFlow.FindComponentToHideDisplay('lg_TYPE_REGLEMENT_ID', 'str_LIEU', 'str_BANQUE', 'str_NOM', 'int_TAUX_CHANGE', 'str_CODE_MONNAIE');

                                                    var value = this.getValue();
                                                    var combolg_MODE_REGLEMENT_ID = Ext.getCmp('lg_MODE_REGLEMENT_ID');
                                                    if (value !== "1") {
                                                        combolg_MODE_REGLEMENT_ID.clearValue();

                                                        combolg_MODE_REGLEMENT_ID.store.load({
                                                            params: {'lg_TYPE_REGLEMENT_ID': value},
                                                            callback: function (records) {
                                                                if (value !== "2") {
                                                                    combolg_MODE_REGLEMENT_ID.setValue(records[0].get('lg_MODE_REGLEMENT_ID'));
                                                                }
                                                            }
                                                        });
                                                        if (value === "2") {
                                                            combolg_MODE_REGLEMENT_ID.enable();
                                                            combolg_MODE_REGLEMENT_ID.show();
                                                        } else {
                                                            combolg_MODE_REGLEMENT_ID.hide();

                                                        }

                                                    } else {
                                                        combolg_MODE_REGLEMENT_ID.hide();
                                                    }
                                                    if (value === "2" || value === "3") {

                                                        Ext.getCmp('str_LIEU').setFieldLabel("Lieu:");
                                                    }

                                                    if (value !== "1") {
                                                        Ext.getCmp('int_AMOUNT_RECU').setValue(LaborexWorkFlow.amountdeformat(Ext.getCmp('int_MONTANT_REGLEMENT').getValue()));
                                                    } else {
                                                        Ext.getCmp('int_AMOUNT_RECU').enable();
                                                        Ext.getCmp('int_AMOUNT_RECU').setValue("");
                                                    }
                                                }

                                            }
                                        },
                                        {
                                            xtype: 'combobox',
                                            labelWidth: 120,
                                            fieldLabel: 'Mode.R&eacute;glement',
                                            name: 'lg_MODE_REGLEMENT_ID',
                                            id: 'lg_MODE_REGLEMENT_ID',
                                            flex: 1,
                                            hidden: true,
                                            store: store_modereglement,
                                            valueField: 'lg_MODE_REGLEMENT_ID',
                                            displayField: 'str_NAME',
                                            typeAhead: true,
                                            queryMode: 'local',
                                            emptyText: 'Choisir un mode de reglement...',
                                            listeners: {
                                                select: function () {
                                                    Ext.getCmp('str_NOM').focus(true, 100, function () {
                                                    });

                                                }
                                            }

                                        }]}, {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            name: 'str_NOM',
                                            id: 'str_NOM',
                                            fieldLabel: 'Nom',
                                            hidden: true,
                                            flex: 2,
//                                            allowBlank: false
                                        },
                                        {
                                            xtype: 'textfield',
                                            name: 'str_BANQUE',
                                            id: 'str_BANQUE',
                                            fieldLabel: 'Banque',
                                            hidden: true,
                                            flex: 1,
//                                            allowBlank: false
                                        },
                                        {
                                            xtype: 'textfield',
                                            name: 'str_LIEU',
                                            id: 'str_LIEU',
                                            fieldLabel: 'Lieu',
                                            hidden: true,
                                            flex: 1
                                        }]}, {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            name: 'str_CODE_MONNAIE',
                                            id: 'str_CODE_MONNAIE',
                                            fieldLabel: 'Code.Monnaie',
                                            hidden: true,
                                            value: "Fr",
                                            flex: 1
                                        },
                                        {
                                            xtype: 'textfield',
                                            name: 'int_TAUX_CHANGE',
                                            id: 'int_TAUX_CHANGE',
                                            fieldLabel: 'Taux.Change',
                                            hidden: true,
                                            flex: 1,
                                            value: 0,
                                            maskRe: /[0-9.]/,
                                            minValue: 0
//                                            allowBlank: false
                                        }]},
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'numberfield',
                                            name: 'int_AMOUNT_RECU',
                                            id: 'int_AMOUNT_RECU',
                                            enableKeyEvents: true,
                                            hideTrigger: true,
                                            fieldLabel: 'Montant Re&ccedil;u',
                                            flex: 1,
                                            emptyText: 'Montant Recu',
//                                            maskRe: /[0-9.]/,
                                            minValue: 5,
                                            allowDecimals: false,
//                                            allowBlank: false,
                                            listeners: {
                                                change: function () {

                                                    var int_total = 0;
                                                    var in_total_vente_monnaie = 0;
                                                    var in_total_vente_monnaie_temp = 0;
                                                    var int_monnaie_monnaie = 0;
                                                    var int_amount_restant = 0;
                                                    in_total_vente_monnaie_temp = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_MONTANT_REGLEMENT').getValue(), " ");
                                                    var in_total_vente_monnaie_temp_final = LaborexWorkFlow.amountdeformat(in_total_vente_monnaie_temp);
                                                    in_total_vente_monnaie = Number(in_total_vente_monnaie_temp_final);

                                                    var int_montant_recu = (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()));
                                                    int_monnaie_monnaie = Number(LaborexWorkFlow.DisplayMonnaie(in_total_vente_monnaie, int_montant_recu));
                                                    int_amount_restant = Number(LaborexWorkFlow.DisplayAmountRestant(in_total_vente_monnaie, int_montant_recu));
                                                    Ext.getCmp('int_AMOUNT_REMIS').setValue(int_monnaie_monnaie + ' CFA');
                                                    Ext.getCmp('int_REEL_RESTE').setValue(int_amount_restant + ' CFA');
                                                    var int_amount_restant = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
                                                    var int_amount_restant_final = 0;
                                                    int_amount_restant_final = Number(int_amount_restant);

                                                },
                                                specialKey: this.onTextFieldSpecialKey
                                            }


                                        }, {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Monnaie :',
                                            name: 'int_AMOUNT_REMIS',
                                            id: 'int_AMOUNT_REMIS',
                                            fieldStyle: "color:blue;font-weight:800;",
                                            margin: '0 15 0 0',
                                            value: 0 + " CFA",
                                            align: 'right'
                                        }, {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Reste &agrave; payer:',
                                            fieldStyle: "color:blue;font-weight:800;",
                                            name: 'int_REEL_RESTE',
                                            id: 'int_REEL_RESTE',
                                            value: 0
                                        }]}
                            ]
                        },
                        {
                            xtype: 'toolbar',
                            ui: 'footer',
                            dock: 'bottom',
                            margin: '-5 0 0 0 ',
                            border: '0',
                            items: ['->',
                                {
                                    text: 'R&eacute;gler la facture',
                                    id: 'btn_create_facture',
                                    iconCls: 'icon-clear-group',
                                    scope: this,
//                                    hidden: false,
//                                    disabled: true,
                                    handler: this.Doreglement
                                }, {
                                    text: 'RETOUR',
                                    id: 'btn_cancel',
                                    iconCls: 'icon-clear-group',
                                    scope: this,
                                    hidden: false,
                                    //disabled: true,
                                    handler: this.onbtncancel
                                }
                            ]
                        }
                    ]

                }

            ]

        });
        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



        var grid = Ext.getCmp('gridDetailBordereau');
        var all = Ext.getCmp('selectALL');

        grid.getStore().on(
                "load", function () {


                    var CODEstore = grid.getStore();
                    if (listProductSelected.length > 0) {
                        var record;
                        Ext.each(listProductSelected, function (lg, index) {
                            CODEstore.each(function (r, id) {
                                record = CODEstore.findRecord('lg_FACTURE_DETAIL_ID', lg);
                                if (record != null) {

                                    record.set('isChecked', 'true');
                                }


                            });

                        });
                        if (record !== null) {
                            grid.reconfigure(grid.getStore());
                        }

                    }
                    if (all.getValue()) {
                        CODEstore.each(function (r, id) {
                            r.set('isChecked', 'true');

                        });
                        CODEstore.each(function (r, id) {
                            Ext.each(checkedList, function (lg, index) {

                                if (r.get('lg_FACTURE_DETAIL_ID') === lg) {
                                    r.set('isChecked', 'false');
                                }

                            });

                            grid.reconfigure(grid.getStore());
                        });


                        grid.reconfigure(grid.getStore());
                    }

                }

        );
        // initialisation des valeurs par defaut
        Ext.getCmp('int_MONTANT_REGLEMENT').setValue(dbl_MONTANT_RESTANT);

        Ext.getCmp('cmb_TYPE_TIERS_PAYANT').setValue(lg_TYPE_TIERS_PAYANT_ID);
        Ext.getCmp('cmb_CUSTOMER_ID').setValue(str_CUSTOMER_NAME);
        Ext.getCmp('dbl_MONTANT_PAYE').setValue(dbl_MONTANT_PAYE);
        Ext.getCmp('dbl_MONTANT_RESTANT').setValue(dbl_MONTANT_RESTANT);
        Ext.getCmp('TOTAL_AMOUNT').setValue(dbl_MONTANT_CMDE);
        Ext.getCmp('str_CODE_FACTURE').setValue(str_CODE_FACTURE);

        var combo = Ext.getCmp('lg_NATURE_PAIEMENT');
//        combo.getStore().on("load", function() {
//            alert('sfsdfsdf');
        combo.setValue("2");

//    });


    },
    loadStore: function () {
        Ext.getCmp('gridDetailBordereau').getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
        var grid = Ext.getCmp('gridDetailBordereau');

        var naturepaiment = Ext.getCmp('lg_NATURE_PAIEMENT').getValue();
        if (grid.getStore().getCount() > 0) {
            var firstRec = grid.getStore().getAt(0);
            Ext.getCmp('int_Nbr_Dossier').setValue(firstRec.get('int_NB_DOSSIER_RESTANT'));

            if (naturepaiment === "2") { // cacher le champ stock machine

                LaborexWorkFlow.findColumnByDataIndex(grid, 8).setVisible(false);

            }
        }
    },
    onbtncancel: function () {

        var xtype = "facturemanager";
        testextjs.app.getController('App').onLoadNewComponent(xtype, "", "");
    },

    Doreglement: function () {

        var int_AMOUNT_RECU = Ext.getCmp('int_AMOUNT_RECU').getValue();
        var MODE_REGLEMENT = Ext.getCmp('lg_MODE_REGLEMENT_ID').getValue();
        var TIERS_PAYANT = Ext.getCmp('cmb_CUSTOMER_ID').getValue();
        var TYPE_REGLEMENT = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue();
        var str_LIEU = Ext.getCmp('str_LIEU').getValue();
        var str_CODE_MONNAIE = Ext.getCmp('str_CODE_MONNAIE').getValue();

        var str_BANQUE = Ext.getCmp('str_BANQUE').getValue();
        var dt_reglement = Ext.Date.format(Ext.getCmp('dt_reglement').getValue(), 'Y-m-d');
        var str_NOM = Ext.getCmp('str_NOM').getValue();
        var int_TAUX_CHANGE = Ext.getCmp('int_TAUX_CHANGE').getValue();

        var int_AMOUNT_REMIS = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
        var lg_NATURE_PAIEMENT = Ext.getCmp('lg_NATURE_PAIEMENT').getValue();
        var int_MONTANT_REGLEMENT = Ext.getCmp('int_MONTANT_REGLEMENT').getValue();
            var tout = Ext.getCmp('selectALL');
        if (TYPE_REGLEMENT === 'Especes') {
            MODE_REGLEMENT = 1;
        }

        if (TYPE_REGLEMENT === 'Especes' || TYPE_REGLEMENT === '1') {

            if (Ext.getCmp('int_AMOUNT_RECU').getValue() === null || Number(Ext.getCmp('int_AMOUNT_RECU').getValue()) === 0) {
                Ext.MessageBox.show({
                    title: 'Avertissement',
                    width: 320,
                    msg: 'Veuillez saisir le montant re&ccedil;u',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
                return;
            }
        }


        if (lg_NATURE_PAIEMENT === "2") {
            if (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()) < Number(Ext.getCmp('dbl_MONTANT_RESTANT').getValue()))
            {
                Ext.MessageBox.show({
                    title: 'Avertissement',
                    width: 320,
                    msg: 'Le montant saisi ne doit pas &ecirc;tre inf&eacute;rieur au montant total &agrave; pour le mode de paiement total',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
                return;
            }
        }

        if (lg_NATURE_PAIEMENT === "1") {
              if (!tout.getValue() && (listProductSelected.length === 0 && checkedList.length === 0)) {
                     Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 300,
                        msg: 'Veuillez s&eacute;lectionner au moins un dossier',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
              }
            
            
            if (listProductSelected.length > 0 || checkedList.length > 0) {
                if (Number(Ext.getCmp('int_MONTANT_REGLEMENT').getValue()) === 0)
                {
                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 300,
                        msg: 'Veuillez s&eacute;lectionner au moins un dossier',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
            }
        }
            
        if (TYPE_REGLEMENT === "2" && MODE_REGLEMENT === null) {

            Ext.MessageBox.show({
                title: 'Avertissement',
                width: 300,
                msg: 'Veuillez s&eacute;lectionner le mode de r&egrave;glement',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
            return;
        }

    
        if (tout.getValue() && listProductSelected.length === 0) {
            lg_NATURE_PAIEMENT = "2";
        }



        myAppController.ShowWaitingProcess();
        Ext.Ajax.request({
            url: '../webservices/sm_user/reglement/ws_transaction.jsp',
            timeout: 24000000,
            params: {
                mode: 'doReglement',
                str_CUSTOMER: str_CUSTOMER,
                lg_FACTURE_ID: lg_FACTURE_ID,
                MODE_REGLEMENT: MODE_REGLEMENT,
                TYPE_REGLEMENT: TYPE_REGLEMENT,
                lg_NATURE_PAIEMENT: lg_NATURE_PAIEMENT,
                str_LIEU: str_LIEU,
                str_CODE_MONNAIE: str_CODE_MONNAIE,
                str_BANQUE: str_BANQUE,
                str_NOM: str_NOM,
                NET_A_PAYER: int_MONTANT_REGLEMENT,
                int_TAUX_CHANGE: int_TAUX_CHANGE,
                int_AMOUNT_REMIS: int_AMOUNT_REMIS,
                int_AMOUNT_RECU: int_AMOUNT_RECU,
                LISTDOSSIERS: Ext.encode(listProductSelected),
                checkedList: Ext.encode(checkedList),
                dt_reglement: dt_reglement

            },
            success: function (response)
            {
                myAppController.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
//                alert(object.success);
                if (object.errors === "1") {
                    checkedList = [];
                    listProductSelected = [];
                    Ext.Msg.confirm("Information", "Voulez-vous imprimer ?",
                            function (btn) {
                                if (btn === "yes") {
                                   
                                    Me.lunchPrinter(object.lg_DOSSIER_REGLEMENT_ID);
//                                  
                                } else {
                                    var xtype = "facturemanager";
                                    var alias = 'widget.' + xtype;
                                    testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion Facturation", "");
                                }
                            });


                } else {
                    Ext.MessageBox.alert('Error Message', object.success);
                }
                net = 0;
                listProductSelected = [];
                checkedList = [];
            },
            failure: function (response)
            {
                myAppController.StopWaitingProcess();
                listProductSelected = [];
                checkedList = [];
                net = 0;
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }

        });





    },
    lunchPrinter: function (id) {
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
           method: 'GET',
            url: '../api/v1/facturation/ticket-facture/' + id,

            success: function (response)
            {
                boxWaitingProcess.hide();
                var object = Ext.JSON.decode(response.responseText, false);
                if (!object.success ) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
                var xtype = "facturemanager";
                var alias = 'widget.' + xtype;
                testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion Facturation", "");


            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
    },
    onTextFieldSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var int_AMOUNT_RECU = Ext.getCmp('int_AMOUNT_RECU').getValue();
            var MODE_REGLEMENT = Ext.getCmp('lg_MODE_REGLEMENT_ID').getValue();
            var TIERS_PAYANT = Ext.getCmp('cmb_CUSTOMER_ID').getValue();
            var TYPE_REGLEMENT = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue();
            var str_LIEU = Ext.getCmp('str_LIEU').getValue();
            var str_CODE_MONNAIE = Ext.getCmp('str_CODE_MONNAIE').getValue();
            var str_BANQUE = Ext.getCmp('str_BANQUE').getValue();
            var dt_reglement = Ext.Date.format(Ext.getCmp('dt_reglement').getValue(), 'Y-m-d');
            var str_NOM = Ext.getCmp('str_NOM').getValue();
            var int_TAUX_CHANGE = Ext.getCmp('int_TAUX_CHANGE').getValue();

            var int_AMOUNT_REMIS = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
            var lg_NATURE_PAIEMENT = Ext.getCmp('lg_NATURE_PAIEMENT').getValue();
            var int_MONTANT_REGLEMENT = Ext.getCmp('int_MONTANT_REGLEMENT').getValue();
             var tout = Ext.getCmp('selectALL');
            if (lg_NATURE_PAIEMENT === "2") {
                if (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()) < Number(Ext.getCmp('dbl_MONTANT_RESTANT').getValue())) {

                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 320,
                        msg: 'Le montant saisi ne doit pas &ecirc;tre inf&eacute;rieur au montant total &agrave; pour pour le mode de paiement total',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
            }
            if (lg_NATURE_PAIEMENT === "1") {
                if (!tout.getValue() && (listProductSelected.length === 0 && checkedList.length === 0)) {
                   Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 300,
                        msg: 'Veuillez s&eacute;lectionner au moins un dossier',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return; 
                }
                
                if (listProductSelected.length > 0 || checkedList.length > 0) {
                if (Number(Ext.getCmp('int_MONTANT_REGLEMENT').getValue()) === 0)
                {
                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 300,
                        msg: 'Veuillez s&eacute;lectionner au moins un dossier',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
            }
              
            }




            if (TYPE_REGLEMENT === 'Especes' || TYPE_REGLEMENT === '1') {
                MODE_REGLEMENT = 1;
                if (Ext.getCmp('int_AMOUNT_RECU').getValue() == null || Number(Ext.getCmp('int_AMOUNT_RECU').getValue()) === 0) {
                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 320,
                        msg: 'Veuillez saisir le montant reçu',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
            }
            if (TYPE_REGLEMENT === "2" && MODE_REGLEMENT === null) {

                Ext.MessageBox.show({
                    title: 'Avertissement',
                    width: 300,
                    msg: 'Veuillez s&eacute;lectionner le mode de r&egrave;glement',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
                return;
            }
           
            if (tout.getValue() && listProductSelected.length === 0) {
                lg_NATURE_PAIEMENT = "2";
            }

            myAppController.ShowWaitingProcess();

            Ext.Ajax.request({
                url: '../webservices/sm_user/reglement/ws_transaction.jsp',
                timeout: 24000000,
                params: {
                    mode: 'doReglement',
                    str_CUSTOMER: str_CUSTOMER,
                    lg_FACTURE_ID: lg_FACTURE_ID,
                    MODE_REGLEMENT: MODE_REGLEMENT,
                    TYPE_REGLEMENT: TYPE_REGLEMENT,
                    lg_NATURE_PAIEMENT: lg_NATURE_PAIEMENT,
                    str_LIEU: str_LIEU,
                    str_CODE_MONNAIE: str_CODE_MONNAIE,
                    str_BANQUE: str_BANQUE,
                    str_NOM: str_NOM,
                    NET_A_PAYER: int_MONTANT_REGLEMENT,
                    int_TAUX_CHANGE: int_TAUX_CHANGE,
                    int_AMOUNT_REMIS: int_AMOUNT_REMIS,
                    int_AMOUNT_RECU: int_AMOUNT_RECU,
                    LISTDOSSIERS: Ext.encode(listProductSelected),
                    checkedList: Ext.encode(checkedList),
                    dt_reglement: dt_reglement


                },
                success: function (response)
                {
                    myAppController.StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);

                    if (object.errors === "1") {
                        checkedList = [];
                        listProductSelected = [];
                        Ext.Msg.confirm("Confirme", "Voulez-vous imprimer ?",
                                function (btn) {
                                    if (btn === "yes") {
                                    
                                        Me.lunchPrinter(object.lg_DOSSIER_REGLEMENT_ID);
                                    } else {
                                        var xtype = "facturemanager";
                                        var alias = 'widget.' + xtype;
                                        testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion Facturation", "");
                                    }
                                });


                    } else {
                        Ext.MessageBox.alert('Error Message', object.success);
                    }
                    net = 0;
                    listProductSelected = [];
                    checkedList = [];
                },
                failure: function (response)
                {
                    myAppController.StopWaitingProcess();
                    listProductSelected = [];
                    checkedList = [];
                    net = 0;
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }

            });
        }
    },
    onfiltercheck: function () {
        var str_name = Ext.getCmp('str_NAME').getValue();
        var int_name_size = str_name.length;
        if (int_name_size < 4) {
            Ext.getCmp('btn_add').disable();
        }

    },
    DisplayTotal: function (int_price, int_qte) {
        var TotalAmount_final = 0;
        var TotalAmount_temp = int_qte * int_price;
        var TotalAmount = Number(TotalAmount_temp);
        return TotalAmount;
    },

    onPdfClick: function () {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_ticket + '?lg_PREENREGISTREMENT_ID=' + ref;
        window.open(linkUrl);
        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "ventemanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "preenregistrementmanager";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },


    onSelectionChange: function (model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
    onsplitovalue: function (Ovalue) {

        var int_ovalue;
        var string = Ovalue.split(" ");
        int_ovalue = string[0];
        return int_ovalue;
    },
    onRemoveClick: function (grid, rowIndex) {


        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        //lg_FACTURE_ID

                        var olg_NATURE_REGLEMENT = Ext.getCmp('lg_NATURE_REGLEMENT').getValue();
                        var dbl_MONTANT;
                        var lg_DOSSIER_ID;
                        if (olg_NATURE_REGLEMENT === "1") {
                            lg_DOSSIER_ID = rec.get('lg_DOSSIER_ID');
                            dbl_MONTANT = rec.get('dbl_MONTANT');
                        } else {
                            lg_DOSSIER_ID = rec.get('lg_FACTURE_ID');
                            dbl_MONTANT = rec.get('dbl_MONTANT_CMDE');
                        }

                        //var dbl_MONTANT = rec.get('dbl_MONTANT');
                        var oref_reglement = Ext.getCmp('str_ref_reglement_hidden').getValue();
                        var Oint_MONTANT_REGLEMENT = Ext.getCmp('int_MONTANT_REGLEMENT').getValue();
                        var OnbrDossier = Ext.getCmp('int_Nbr_Dossier').getValue();
                        //                alert(Oint_MONTANT_REGLEMENT);
                        // alert(oref_reglement);
                        Ext.Ajax.request({
                            url: '../webservices/sm_user/reglement/ws_transaction.jsp',
                            params: {
                                mode: 'deletedetail',
                                ref_dossier: lg_DOSSIER_ID,
                                ref_reglement: oref_reglement
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                var amountTotal = LaborexWorkFlow.amountdeformat(Oint_MONTANT_REGLEMENT);
                                var amountTotalrestant = amountTotal - dbl_MONTANT;
                                var amountTotal = Ext.util.Format.number(amountTotalrestant, '0,000.');
                                Ext.getCmp('int_MONTANT_REGLEMENT').setValue(amountTotal);
                                Ext.getCmp('int_Nbr_Dossier').setValue(OnbrDossier - 1);
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    },
    onCheckChange: function (column, rowIndex, checked, eOpts) {
        Array.prototype.unset = function (val) {
            var index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            }
        };
        var store = Ext.getCmp('gridDetailBordereau').getStore();
        var rec = store.getAt(rowIndex); // on recupere la ligne courante de la grid
        var TYPE_REGLEMENT = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue();
        if (checked == true) {
            net += Number(rec.get('dbl_MONTANT_RESTANT'));
            listProductSelected.push(rec.get('lg_FACTURE_DETAIL_ID')); //on ajoute l'index de la ligne selectionnée au tableau
            checkedList.unset(rec.get('lg_FACTURE_DETAIL_ID'));
            Ext.getCmp('int_MONTANT_REGLEMENT').setValue(net);

            if (TYPE_REGLEMENT !== null && TYPE_REGLEMENT !== "1" && TYPE_REGLEMENT !== "Especes") {
                Ext.getCmp('int_AMOUNT_RECU').setValue(net);
            }



        } else {

            net = net - Number(rec.get('dbl_MONTANT_RESTANT'));

            Ext.getCmp('int_MONTANT_REGLEMENT').setValue(net);
            if (TYPE_REGLEMENT !== null && TYPE_REGLEMENT !== "1") {
                Ext.getCmp('int_AMOUNT_RECU').setValue(net);
            }

            var all = Ext.getCmp('selectALL');
            if (all.getValue()) {
                checkedList.push(rec.get('lg_FACTURE_DETAIL_ID'));
                //all.setValue(false);
                Ext.getCmp('int_MONTANT_REGLEMENT').setValue(net);
                if (TYPE_REGLEMENT !== null && TYPE_REGLEMENT !== "1") {
                    Ext.getCmp('int_AMOUNT_RECU').setValue('');
                }

            }


            listProductSelected.unset(rec.get('lg_FACTURE_DETAIL_ID'));


        }

    }


});


