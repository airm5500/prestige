//var url_services_data_famille_select_order = '../webservices/sm_user/famille/ws_data_jdbc.jsp';
//var url_services_transaction_order = '../webservices/commandemanagement/order/ws_transaction.jsp?mode=';
var url_services_data_type_facture = '../webservices/sm_user/typefacture/ws_data.jsp';
var url_services_data_detail_facture = '../api/v1/order-detail/list?lg_ORDER_ID=';

url_services_data_detail_facture_tiers_payant = '../api/v1/facture-tiers-payant/assiette';
var url_services_data_tiers_payant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';
var url_services_data_fournisseur = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_type_tierspayant = '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp';
var url_services_data_nature_vente_dovente = '../webservices/configmanagement/naturevente/ws_data.jsp';
var url_services_data_typereglement_dovente = '../webservices/sm_user/typereglement/ws_data.jsp';
var url_services_data_modereglement_dovente = '../webservices/sm_user/modereglement/ws_data.jsp';
var Me;
var Omode;
var ref;
var famille_id_search;
var in_total_vente;
var int_total_formated;
var int_montant_vente;
var int_montant_achat;
var LaborexWorkFlow;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.diffclient.action.BuyDiffere', {
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
        'testextjs.model.DossierFacture'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        // frame: true,
//        plain: true,
       // maximizable: true,
       // closable: true,
        nameintern: ''
    },
    xtype: 'buydifferemanager',
    id: 'buydifferemanagerID',
    frame: true,
    title: 'Regler difere',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {

        var url_services_data_diffclient = '../webservices/sm_user/diffclient/ws_data.jsp';

        Me = this;
        var itemsPerPage = 20;
        famille_id_search = "";
        in_total_vente = 0;
        int_total_formated = 0;
        ref = this.getNameintern();
        titre = this.getTitre();
        ref = this.getNameintern();
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        url_services_data_detail_facture = '../api/v1/order-detail/list?lg_ORDER_ID=' + ref;


        var store_modereglement = LaborexWorkFlow.BuildStore('testextjs.model.ModeReglement', itemsPerPage, url_services_data_modereglement_dovente);
        var store_typereglement = LaborexWorkFlow.BuildStore('testextjs.model.TypeReglement', itemsPerPage, url_services_data_typereglement_dovente);




        var store_client = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_client,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        store_detail_tiers_payant = new Ext.data.Store({
            model: 'testextjs.model.Differes',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_diffclient,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }



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


        store_type_tierpayant = new Ext.data.Store({
            model: 'testextjs.model.TypeTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
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
                    fieldLabel: 'Nombre de Differe ::',
                    labelWidth: 140,
                    name: 'int_Nbr_Dossier',
                    id: 'int_Nbr_Dossier',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: "0"
                });
        var int_MONTANT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Net a payer ::',
                    labelWidth: 95,
                    name: 'int_MONTANT',
                    id: 'int_MONTANT',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
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
                padding: 0
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
                                    layout: 'hbox',
                                    combineErrors: true,
                                    defaultType: 'textfield',
                                    defaults: {
                                        //hideLabel: 'true'
                                    },
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Client :',
                                            //allowBlank: false,
                                            labelWidth: 90,
                                            name: 'lg_COMPTE_CLIENT_ID',
                                            margins: '0 0 0 10',
                                            id: 'lg_COMPTE_CLIENT_ID',
                                            store: store_client,
                                            //disabled: true,
                                            valueField: 'lg_COMPTE_CLIENT_ID',
                                            displayField: 'str_FIRST_LAST_NAME',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            // flex: 1,
                                            emptyText: 'Sélectionner client...',
                                            listeners: {
                                                select: function (cmp) {
                                                    var value = cmp.getValue();
                                                    customer_id = value;
                                                    var OGrid = Ext.getCmp('gridDetailDiffere');
                                                    // var url_services_data_diffclient = '../webservices/sm_user/diffclient/ws_data.jsp';
                                                    var url_services_data_diffclient = "../webservices/sm_user/diffclient/ws_data.jsp?str_BENEFICIAIRE=" + customer_id + "&lg_TYPE_ECART_MVT=1&str_task=" + str_task_diff;
                                                    OGrid.getStore().getProxy().url = url_services_data_diffclient;
                                                    OGrid.getStore().reload();
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'datefield',
                                            fieldLabel: 'Date Reglement',
                                            id: 'datedebut',
                                            labelWidth: 130,
                                            name: 'datedebut',
                                            emptyText: 'Date debut',
                                            submitFormat: 'Y-m-d',
                                            maxValue: new Date(),
                                            format: 'd/m/Y'
                                                    //margin: '0 40 0 0'

                                        }]
                                }]
                        }
                    ]

                },
                {
                    items: [{
                            xtype: 'fieldset',
                            title: 'Information Differe',
                            collapsible: true,
                            layout: 'hbox',
                            defaultType: 'textfield',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                int_MONTANT,
                                int_NBR_DOSSIER

                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    id: 'detaildiffere',
                    title: 'Detail(s) des differes',
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
                            id: 'gridDetailDiffere',
                            //  plugins: [this.cellEditing],

                            store: store_detail_tiers_payant,
                            height: 250,
                            columns: [
                                {
                                    header: 'lg_ECART_MVT_ID',
                                    dataIndex: 'lg_ECART_MVT_ID',
                                    hidden: true,
                                    flex: 1,
                                    editor: {
                                        allowBlank: false
                                    }
                                }, {
                                    header: 'Code client',
                                    dataIndex: 'str_CODE_CLIENT',
                                    flex: 1/*,
                                     editor: {
                                     allowBlank: false
                                     }*/
                                }, {
                                    header: 'Nom prenom',
                                    dataIndex: 'str_BENEFICIAIRE',
                                    flex: 1/*,
                                     editor: {
                                     allowBlank: false
                                     }*/
                                }, {
                                    header: 'Date Vente',
                                    dataIndex: 'dt_CREATED',
                                    flex: 1
                                }, {
                                    header: 'Numero ordre',
                                    // dataIndex: 'dt_CREATED',
                                    flex: 1/*,
                                     }, {
                                     header: 'Code Operateur',
                                     dataIndex: 'dt_CREATED',
                                     flex: 1/*,
                                     editor: {
                                     allowBlank: false
                                     }*/
                                }, {
                                    header: 'Commentaire Differe',
                                    //dataIndex: 'dt_CREATED',
                                    flex: 1
                                }, {
                                    header: 'Montant Differe',
                                    dataIndex: 'int_AMOUNT',
                                    flex: 1,
                                    renderer: amountformat,
                                    align: 'right'
                                            /*,
                                             editor: {
                                             allowBlank: false
                                             }*/
                                }
                            ],
                            //  selModel: selModel,
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_detail_tiers_payant,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this,
                                selectionchange: this.onSelectionChange
                            }
                        }
                        , {
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
                                            fieldLabel: 'Type.Reglement',
                                            name: 'lg_TYPE_REGLEMENT_ID',
                                            flex: 1,
                                            id: 'lg_TYPE_REGLEMENT_ID',
                                            store: store_typereglement,
                                            value: 'Especes',
                                            valueField: 'lg_TYPE_REGLEMENT_ID',
                                            displayField: 'str_NAME',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            allowBlank: false,
                                            emptyText: 'Choisir un type de reglement...',
                                            listeners: {
                                                select: function (cmp) {
                                                    LaborexWorkFlow.RedirectUrl('lg_TYPE_REGLEMENT_ID', 'lg_MODE_REGLEMENT_ID', my_url);
                                                    LaborexWorkFlow.FindComponentToHideDisplay('lg_TYPE_REGLEMENT_ID', 'str_LIEU', 'str_BANQUE', 'str_NOM', 'int_TAUX_CHANGE', 'str_CODE_MONNAIE');
                                                    LaborexWorkFlow.ManageComponentLigth('lg_TYPE_REGLEMENT_ID', 'lg_MODE_REGLEMENT_ID', '1', 'Especes', 'hide');
                                                    // LaborexWorkFlow.ManageComponentLigth('lg_TYPE_REGLEMENT_ID', 'lg_MODE_REGLEMENT_ID', '4', 'Differe', 'hide');
                                                    LaborexWorkFlow.ManageComponentLigth('lg_TYPE_REGLEMENT_ID', 'lg_MODE_REGLEMENT_ID', '2', 'Cheques', 'show');
                                                    LaborexWorkFlow.ManageComponentLigth('lg_TYPE_REGLEMENT_ID', 'lg_MODE_REGLEMENT_ID', '3', 'Carte Bancaire', 'show');
                                                    LaborexWorkFlow.ManageComponentLigth('lg_TYPE_REGLEMENT_ID', 'lg_MODE_REGLEMENT_ID', '5', 'Devise', 'show');

                                                }

                                            }


                                        },
                                        {
                                            xtype: 'combobox',
                                            labelWidth: 120,
                                            fieldLabel: 'Mode.Reglement',
                                            name: 'lg_MODE_REGLEMENT_ID',
                                            id: 'lg_MODE_REGLEMENT_ID',
                                            flex: 1,
                                            store: store_modereglement,
                                            //  value: 'Cash',
                                            valueField: 'lg_MODE_REGLEMENT_ID',
                                            displayField: 'str_NAME',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            allowBlank: false,
                                            emptyText: 'Choisir un mode de reglement...'

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
                                            allowBlank: false
                                        },
                                        {
                                            xtype: 'textfield',
                                            name: 'str_BANQUE',
                                            id: 'str_BANQUE',
                                            fieldLabel: 'Banque',
                                            hidden: true,
                                            flex: 1,
                                            allowBlank: false
                                        },
                                        {
                                            xtype: 'textfield',
                                            name: 'str_LIEU',
                                            id: 'str_LIEU',
                                            fieldLabel: 'Lieu',
                                            hidden: true,
                                            flex: 1,
                                            allowBlank: false
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
                                            flex: 1,
                                            allowBlank: false
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
                                            minValue: 0,
                                            allowBlank: false
                                        }]},
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            name: 'int_AMOUNT_RECU',
                                            id: 'int_AMOUNT_RECU',
                                            fieldLabel: 'Montant Recu',
                                            flex: 1,
                                            emptyText: 'Montant Recu',
                                            maskRe: /[0-9.]/,
                                            minValue: 0,
                                            allowBlank: false,
                                            listeners: {
                                                change: function () {

                                                    var int_total = 0;
                                                    var in_total_vente_monnaie = 0;
                                                    var in_total_vente_monnaie_temp = 0;
                                                    var int_monnaie_monnaie = 0;
                                                    in_total_vente_monnaie_temp = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_TOTAL_VENTE').getValue(), " ");
                                                    var in_total_vente_monnaie_temp_final = LaborexWorkFlow.amountdeformat(in_total_vente_monnaie_temp);
                                                    in_total_vente_monnaie = Number(in_total_vente_monnaie_temp_final);

                                                    var int_montant_recu = (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()));
                                                    int_monnaie_monnaie = Number(LaborexWorkFlow.DisplayMonnaie(in_total_vente_monnaie, int_montant_recu));
                                                    Ext.getCmp('int_AMOUNT_REMIS').setValue(int_monnaie_monnaie + ' CFA');
                                                    var int_amount_restant = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
                                                    var int_amount_restant_final = 0;
                                                    int_amount_restant_final = Number(int_amount_restant);
                                                    if (int_montant_recu >= in_total_vente_monnaie) {
                                                        Ext.getCmp('btn_loturer').enable();
                                                    } else {
                                                        Ext.getCmp('btn_loturer').disable();
                                                    }


                                                }

                                            }
                                        }, {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Monnaie :',
                                            name: 'int_AMOUNT_REMIS',
                                            id: 'int_AMOUNT_REMIS',
                                            fieldStyle: "color:blue;",
                                            margin: '0 15 0 0',
                                            value: 0 + " CFA",
                                            align: 'right'
                                        }, {
                                            xtype: 'hiddenfield',
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
                            border: '0',
                            items: ['->',
                                {
                                    text: 'Regler Differer',
                                    id: 'btn_create_facture',
                                    iconCls: 'icon-clear-group',
                                    scope: this,
                                    hidden: false,
                                    //disabled: true,
                                    handler: this.CreateFacture
                                }, {
                                    text: 'Annuler',
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


    },
    loadStore: function () {
        Ext.getCmp('gridpanelID').getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {

    },
    onbtncancel: function () {

        var xtype = "diffmanager";
        testextjs.app.getController('App').onLoadNewComponent(xtype, "", "");
    },
    checkIfGridIsEmpty: function () {
        var gridTotalCount = Ext.getCmp('gridpanelID').getStore().getTotalCount();
        return gridTotalCount;
    },
    setTitleFrame: function (str_data) {
        /*this.title = this.title + " :: Ref " + str_data;
         ref = str_data;
         url_services_data_detail_facture = '../api/v1/order-detail/list?lg_ORDER_ID=' + ref;
         var OGrid = Ext.getCmp('gridpanelID');
         url_services_data_detail_facture = '../api/v1/order-detail/list?lg_ORDER_ID=' + ref;
         OGrid.getStore().getProxy().url = url_services_data_detail_facture;
         OGrid.getStore().reload();*/
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
    DisplayAmount: function () {
        alert('amount');
    },
    onbtnadd: function () {
        var internal_url = "";
        if (ref === "") {
            ref = null;
        } else if (ref === undefined) {
            ref = null;
        }

        /*   if (Ext.getCmp('cmb_CUSTOMER_ID').getValue() === null) {
         
         Ext.MessageBox.alert('Error Message', 'Renseignez le Destinateur ');
         } else  {*/

        /*  alert(Ext.getCmp('cmb_CUSTOMER_ID').getValue());
         alert(Ext.getCmp('lg_TYPE_FACTURE_ID').getValue());
         alert(Ext.getCmp('dt_debut').getValue());
         alert(Ext.getCmp('dt_fin').getValue());*/
        dt_debut = Ext.Date.format(Ext.getCmp('dt_debut').getValue(), 'Y-m-d');
        dt_fin = Ext.Date.format(Ext.getCmp('dt_fin').getValue(), 'Y-m-d');
        type_facture = Ext.getCmp('lg_TYPE_FACTURE_ID').getValue();
        str_CUSTOMER = Ext.getCmp('cmb_CUSTOMER_ID').getValue();
        if (type_facture == "1") {
            url_services_data_detail_facture_tiers_payant = '../api/v1/facture-tiers-payant/assiette?lg_customer_id=' + str_CUSTOMER + '&lg_type_facture=' + type_facture + '&dt_debut=' + dt_debut + '&dt_fin=' + dt_fin;
            var OGrid = Ext.getCmp('gridpanelID');
            OGrid.getStore().getProxy().url = url_services_data_detail_facture_tiers_payant;
            OGrid.getStore().reload();




            Ext.Ajax.request({
                url: '../api/v1/facture-tiers-payant/assiette',
                params: {
                    dt_debut: dt_debut,
                    dt_fin: dt_fin,
                    type_facture: type_facture,
                    str_CUSTOMER: str_CUSTOMER

                },
                success: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    //  console.log(object);
                    //alert('Montant_total  ' + object.Montant_total);
                    // var int_total = Number(object.total);
                    Ext.getCmp('int_Nbr_Dossier').setValue(object.results[0].int_NB_DOSSIER);
                    Ext.getCmp('int_MONTANT').setValue(object.Montant_total);
                },
                failure: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });




        } else {
            url_services_data_detail_facture = '../webservices/sm_user/facturation/ws_data_detail_fournisseur.jsp?lg_customer_id=' + str_CUSTOMER + '&lg_type_facture=' + type_facture + '&dt_debut=' + dt_debut + '&dt_fin=' + dt_fin;
            var OGrid = Ext.getCmp('gridpanelFournisseurID');
            OGrid.getStore().getProxy().url = url_services_data_detail_facture;
            OGrid.getStore().reload();
        }


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
    changeRenderer: function (val) {
        if (val > 0) {
            return '<span style="color:green;">' + val + '</span>';
        } else if (val < 0) {
            return '<span style="color:red;">' + val + '</span>';
        }
        return val;
    },
    pctChangeRenderer: function (val) {
        if (val > 0) {
            return '<span style="color:green;">' + val + '%</span>';
        } else if (val < 0) {
            return '<span style="color:red;">' + val + '%</span>';
        }
        return val;
    },
    renderRating: function (val) {
        switch (val) {
            case 0:
                return 'A';
            case 1:
                return 'B';
            case 2:
                return 'C';
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
    CreateFacture: function (val) {
        dt_debut = Ext.Date.format(Ext.getCmp('dt_debut').getValue(), 'Y-m-d');
        dt_fin = Ext.Date.format(Ext.getCmp('dt_fin').getValue(), 'Y-m-d');
        type_facture = Ext.getCmp('lg_TYPE_FACTURE_ID').getValue();
        str_CUSTOMER = Ext.getCmp('cmb_CUSTOMER_ID').getValue();
        url_services_data_detail_transaction = '../webservices/sm_user/facturation/ws_transaction.jsp';

        if (type_facture == 1) {
            str_mode = 'create facture tiers';
        } else {
            str_mode = 'create facture fournisseur';
        }

        Ext.Ajax.request({
            url: url_services_data_detail_transaction,
            params: {
                lg_customer_id: str_CUSTOMER,
                lg_type_facture: type_facture,
                dt_fin: dt_fin,
                dt_debut: dt_debut,
                mode: str_mode

            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == 0) {
                    Ext.MessageBox.alert('Error Message', 'impossible de creer la facture');
                    return;
                }
                if (object.success == 1) {
                    var xtype = "facturemanager";
                    testextjs.app.getController('App').onLoadNewComponent(xtype, "", "");
                }
                //Oview.getStore().reload();

            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

    },
});


