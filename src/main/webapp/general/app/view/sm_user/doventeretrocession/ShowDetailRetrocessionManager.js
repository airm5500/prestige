var url_services_data_famille_select_dovente = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_detailsretrocessionvente = '../webservices/sm_user/detaildretrocession/ws_transaction.jsp?mode=';
var url_services_data_typereglement = '../webservices/sm_user/typereglement/ws_data.jsp';
var url_services_data_typevente = '../webservices/configmanagement/typevente/ws_data.jsp';
var url_services_pdf_ticket_retrocession = '../webservices/sm_user/detaildretrocession/ws_generate_pdf.jsp';

var url_services_data_client_other = '../webservices/configmanagement/client/ws_data_other.jsp';
var url_services_data_remise = '../webservices/configmanagement/remise/ws_data.jsp';
var url_services_data_escompte = '../webservices/configmanagement/escomptesociete/ws_data.jsp';
var url_services_data_tva = '../webservices/configmanagement/tva/ws_data.jsp';

var lg_NATURE_VENTE_ID;
var url_services_data_detailsventeretocession;
var int_TOTAL_PRODUIT;
var int_TOTAL_VENTE;
//
var Me_WorkFlow;
var famille_id_search;
var famille_price_search;
var famille_qte_search;
var type_vente_id;
var type_reglement_id;

var str_REF_VENTE_RETRO;
var str_CAISSIER;
var int_NB_PROD_RECAP;
var int_TOTAL_VENTE_RECAP;
var int_AMOUNT_REMIS_RETRO;

var Omode;
var ref;
var store_detailsretrocession;
var store_typereglement;

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


Ext.define('testextjs.view.sm_user.doventeretrocession.ShowDetailRetrocessionManager', {
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
    xtype: 'showdetailretrocessionmanager',
    id: 'showdetailretrocessionmanagerID',
    frame: true,
    title: 'Effectuer une vente',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {

        int_TOTAL_PRODUIT = 0;
        int_TOTAL_VENTE = 0;
        Me_WorkFlow = this;
        famille_id_search = "";
        famille_price_search = 0;
        famille_qte_search = 0;
        store_detailsretrocession = "";
        store_typereglement = "";
        int_total_final = 0;
        int_nb_famille = 0;
        old_qte = 0;

        int_monnaie = 0;
        in_total_vente = 0;
        int_total_formated = 0;
        int_total_product = 0;
        str_REF_VENTE_RETRO = "";
        str_CAISSIER = "";
        int_NB_PROD_RECAP = 0;
        int_TOTAL_VENTE_RECAP = 0;
        int_AMOUNT_REMIS_RETRO = 0;
        ref_vente = "";
        type_reglement_id = "";
        //  alert("new vente" + this.getTitre());
        this.title = this.getTitre();

        my_view_title = this.title;

        ref_vente = this.getNameintern();
        if (this.getNameintern() === "0") {
            ref = this.getNameintern();
        } else {
            ref = this.getOdatasource().lg_RETROCESSION_ID;
        }

        if (my_view_title === "by_cloturer_vente_add") {
            ref = ref_add;
            //cust_name,cust_account_id

        }






        //url_services_data_detailsventeretocession = '../webservices/sm_user/detailsvente/ws_data.jsp?lg_RETROCESSION_ID=' + ref;
        url_services_data_detailsventeretocession = '../webservices/sm_user/detaildretrocession/ws_data.jsp?lg_RETROCESSION_ID=' + ref;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            // autoLoad: false,
            remoteFilter: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_famille_select_dovente,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });


        var storeclient = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_client_other + "?lg_TYPE_CLIENT_ID=" + 3,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });

        var storeremise = new Ext.data.Store({
            model: 'testextjs.model.Remise',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_remise,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });

        var storeescompte = new Ext.data.Store({
            model: 'testextjs.model.EscompteSociete',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_escompte,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });

        var storetva = new Ext.data.Store({
            model: 'testextjs.model.Tva',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tva,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });


        var itemsPerPage = 20;
        store_detailsretrocession = new Ext.data.Store({
            model: 'testextjs.model.DetailsVenteRetrocession',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detailsventeretocession,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });






        store_typereglement = new Ext.data.Store({
            model: 'testextjs.model.TypeReglement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typereglement,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        store_typevente = new Ext.data.Store({
            model: 'testextjs.model.TypeVente',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typevente,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });








        int_TOTAL_PRODUIT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Total.Produit :',
                    name: 'int_TOTAL_PRODUIT',
                    id: 'int_TOTAL_PRODUIT',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: 0

                });
        int_ESCOMPTE_SOCIETE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Escompte societe :',
                    name: 'int_ESCOMPTE_SOCIETE',
                    id: 'int_ESCOMPTE_SOCIETE',
                    fieldStyle: "color:blue;",
                    flex: 1,
                    margin: '0 15 0 0'
                });
        int_REMISE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Remise :',
                    name: 'int_REMISE',
                    id: 'int_REMISE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 0.7

                });

        lg_CLIENT_CONFRERE_ID = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    //fieldLabel: 'Confere :',
                    name: 'lg_CLIENT_CONFRERE_ID',
                    id: 'lg_CLIENT_CONFRERE_ID',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    flex: 1

                });

        int_TOTAL_VENTE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Total.Vente :',
                    name: 'int_TOTAL_VENTE',
                    id: 'int_TOTAL_VENTE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: 0,
                    // renderer: amountformat,
                    align: 'right'

                });


//        var int_REEL_RESTE = new Ext.form.field.Hidden(
//                {
//                    xtype: 'hiddenfield',
//                    name: 'int_REEL_RESTE',
//                    id: 'int_REEL_RESTE',
//                    value: 0
//                });



        str_REF_VENTE_RETRO = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Ref.Vente ::',
                    name: 'str_REF_VENTE_RETRO',
                    id: 'str_REF_VENTE_RETRO',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: ref
                            //  value: this.getOdatasource().str_REF

                });





        int_NB_PROD_RECAP = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Total.Produit :',
                    name: 'int_NB_PROD_RECAP',
                    id: 'int_NB_PROD_RECAP',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0'

                });

        int_TOTAL_VENTE_RECAP = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Total.Vente :',
                    name: 'int_TOTAL_VENTE_RECAP',
                    id: 'int_TOTAL_VENTE_RECAP',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: 0,
                    // renderer: amountformat,
                    align: 'right'

                });

        int_AMOUNT_REMIS_RETRO = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Monnaie :',
                    name: 'int_AMOUNT_REMIS_RETRO',
                    id: 'int_AMOUNT_REMIS_RETRO',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: 0,
                    // renderer: amountformat,
                    align: 'right'

                });



        str_REF_CLIENT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Ref.Client ::',
                    name: 'str_REF_CLIENT',
                    id: 'str_REF_CLIENT',
                    hidden: true,
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: "0"


                });


        str_NAME_CLIENT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Name.Client ::',
                    name: 'str_NAME_CLIENT',
                    id: 'str_NAME_CLIENT',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: "0"


                });

        str_COMMENTAIRE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Commentaire ::',
                    name: 'str_COMMENTAIRE',
                    id: 'str_COMMENTAIRE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 15 0',
                    value: "0"


                });


        keywordStore = Ext.create('Ext.data.SimpleStore', {
            fields: ['id', 'name'],
            data: [[1, 'mr'], [2, 'mr(yes)'], [3, 'mr(no)'], [4, 'example'], [5, 'example(yes)'], [6, 'example(no)'], [7, 'sample'], [8, 'sample(yes)'], [9, 'sample(no)'], [10, 'mrs'], [11, 'mrs(yes)'], [12, 'mrs(no)']]
        });




        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: '98%',
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 150,
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
       //     items: ['rech_prod', 'gridpanelID'],
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
                                    fieldLabel: 'Confrere',
                                    layout: 'hbox',
                                    combineErrors: true,
                                    defaultType: 'textfield',
                                    defaults: {
                                        hideLabel: 'true'
                                    },
                                    items: [
                                        lg_CLIENT_CONFRERE_ID, 
                                        int_REMISE,
                                        int_ESCOMPTE_SOCIETE
                                    ]
                                }]
                        }
                    ]

                },
                {
                    items: [{
                            xtype: 'fieldset',
                            title: 'Detail Produit',
                            collapsible: true,
                            defaultType: 'textfield',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [{
                                    xtype: 'container',
                                    layout: 'hbox',
                                    defaultType: 'textfield',
                                    margin: '0 0 5 0',
                                    items: [
                                        int_TOTAL_PRODUIT,
                                        int_TOTAL_VENTE
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
                            plugins: [this.cellEditing],
                            store: store_detailsretrocession,
                            height: 200,
                            columns: [{
                                    text: 'Details Vente Id',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_RETROCESSIONDETAIL_ID',
                                    id: 'lg_RETROCESSIONDETAIL_ID'
                                }, {
                                    text: 'Famille',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_FAMILLE_ID'
                                }, {
                                    xtype: 'rownumberer',
                                    text: 'Ligne',
                                    width: 45,
                                    sortable: true/*,
                                     locked: true*/
                                }, {
                                    text: 'CIP',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_CIP'
                                }, {
                                    text: 'EAN',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_EAN13'
                                }, {
                                    text: 'Designation',
                                    flex: 2,
                                    sortable: true,
                                    dataIndex: 'str_FAMILLE_NAME'
                                }, {
                                    header: 'QD',
                                    dataIndex: 'int_QUANTITY',
                                    flex: 1/*,
                                     editor: {
                                     xtype: 'numberfield',
                                     allowBlank: false,
                                     regex: /[0-9.]/
                                     }*/
                                }/*, {
                                 text: 'QS',
                                 flex: 1,
                                 sortable: true,
                                 dataIndex: 'int_QUANTITY_SERVED'
                                 }*/, {
                                    text: 'PAF',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_PAF',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'PAT',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_PAT',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    header: 'T ou F',
                                    dataIndex: 'bool_T_F',
                                    flex: 1,
                                    editor: {
                                        xtype: 'radiogroup',
                                        columns: 3,
                                        flex: 1,
                                        //style: 'float: right !important;',
                                        defaults: {
                                            name: 'bool_T_F'
                                        },
                                        items: [{
                                                inputValue: false,
                                                width: 40,
                                                boxLabel: 'T'
                                            }, {
                                                inputValue: true,
                                                width: 40,
                                                boxLabel: 'F'

                                            }],
                                        listeners: {
                                            change: function (field, newValue, oldValue) {
                                                var value = newValue.bool_T_F;
                                                if (value) {
                                                    alert("value vrai " + value);
                                                } else {
                                                    alert("value faux " + value);
                                                }

                                                /*if (Ext.isArray(value)) {
                                                 return;
                                                 }
                                                 if (value == 'offline') {
                                                 // do something
                                                 }*/
                                            }
                                        }
                                    }
                                }/*, {
                                 text: 'S',
                                 flex: 1,
                                 sortable: true,
                                 dataIndex: 'int_S'
                                 }, {
                                 text: 'T',
                                 flex: 1,
                                 sortable: true,
                                 dataIndex: 'int_T'
                                 
                                 
                                 }*/, {
                                    text: 'Montant',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_PRICE_DETAIL',
                                    renderer: amountformat,
                                    align: 'right'
                                }/*, {
                                 xtype: 'checkcolumn',
                                 header: 'Choix',
                                 dataIndex: 'is_select',
                                 name: 'is_select',
                                 id: 'is_select',
                                 flex: 0.5,
                                 stopSelection: false/*,
                                 listeners: {
                                 checkChange: this.onCheckChange
                                 }
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
                                 }*/],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_detailsretrocession,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this,
                                selectionchange: this.onSelectionChange
                            }
                        }]
                }, {
                    xtype: 'fieldset',
                    //fieldLabel: 'Espace commentaire',
                    title: 'Espace commentaire',
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
                        str_COMMENTAIRE
                    ]
                }, {
                    xtype: 'fieldset',
                    labelAlign: 'right',
                    title: 'Type.Vente',
                    id: 'typeventeID',
                    hidden: true,
                    layout: 'vbox',
                    collapsible: true,
                    defaultType: 'textfield',
                    //layout: 'anchor',
                    defaults: {
                        anchor: '40%'
                    },
                    items: [{
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 10 0',
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Type.Vente',
                                    name: 'lg_TYPE_VENTE_ID',
                                    id: 'lg_TYPE_VENTE_ID',
                                    store: store_typevente,
                                    valueField: 'lg_TYPE_VENTE_ID',
                                    displayField: 'str_NAME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    allowBlank: false,
                                    emptyText: 'Choisir un type de vente...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();
                                            if (value === "1") {
                                                Ext.getCmp('btn_add_clt').disable();
                                                Ext.getCmp('reglementID').show();
                                            } else {
                                                if (value === "2") {
                                                    Ext.getCmp('btn_add_clt').enable();
                                                    Ext.getCmp('btn_add_clt').setText('Tiers.Payant');
                                                    //  Ext.getCmp('typeventeID').show();
                                                    //  Ext.getCmp('reglementID').show();
                                                    Ext.getCmp('btn_loturer').disable();

                                                } else if (value === "3") {
                                                    Ext.getCmp('btn_add_clt').enable();
                                                    Ext.getCmp('btn_add_clt').setText('Client');
                                                    Ext.getCmp('lg_TYPE_REGLEMENT_ID').setValue("Especes");
                                                    var total_vente_carnet = Me_WorkFlow.onsplitovalue(Ext.getCmp('int_TOTAL_VENTE').getValue());
                                                    Ext.getCmp('int_AMOUNT_RECU').setValue(total_vente_carnet);
                                                    Ext.getCmp('typeventeID').show();
                                                    Ext.getCmp('reglementID').hide();
                                                    Ext.getCmp('btn_loturer').show();
                                                    Ext.getCmp('btn_loturer').enable();
                                                }

                                            }
                                        }

                                    }
                                },
                                {
                                    text: 'Client',
                                    id: 'btn_add_clt',
                                    margins: '0 0 0 6',
                                    xtype: 'button',
                                    handler: this.onbtnaddclt,
                                    disabled: true
                                },
                                str_REF_CLIENT,
                                str_NAME_CLIENT
                            ]
                        }]
                },
                {
                    xtype: 'fieldset',
                    labelAlign: 'right',
                    title: 'Reglement',
                    id: 'reglementID',
                    hidden: true,
                    layout: 'vbox',
                    collapsible: true,
                    defaultType: 'textfield',
                    //layout: 'anchor',
                    defaults: {
                        anchor: '40%'
                    },
                    items: [
                        str_REF_VENTE_RETRO,
                        //   str_CAISSIER,
                        int_NB_PROD_RECAP,
                        int_TOTAL_VENTE_RECAP,
                         {
                    xtype: 'hiddenfield',
                    name: 'int_REEL_RESTE',
                    id: 'int_REEL_RESTE',
                    value: 0
                },
//                      
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Reglement',
                                    name: 'lg_TYPE_REGLEMENT_ID',
                                    id: 'lg_TYPE_REGLEMENT_ID',
                                    store: store_typereglement,
                                    valueField: 'lg_TYPE_REGLEMENT_ID',
                                    displayField: 'str_NAME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    allowBlank: false,
                                    emptyText: 'Choisir un type de reglement...'

                                }
                            ]
                        },
                        {
                            name: 'int_AMOUNT_RECU',
                            id: 'int_AMOUNT_RECU',
                            fieldLabel: 'Montant Recu',
                            flex: 1,
                            emptyText: 'Montant Recu',
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            listeners: {
                                change: function () {

                                    var int_total = in_total_vente;
                                    var int_montant_recu = (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()));
                                    int_monnaie = Number(Me_WorkFlow.DisplayMonnaie(int_total, int_montant_recu));//Ext.util.Format.number(Number(Me_WorkFlow.DisplayMonnaie(int_total, int_montant_recu)), '0,000.');
                                    Ext.getCmp('int_AMOUNT_REMIS_RETRO').setValue(int_monnaie + ' CFA');
                                    if (Ext.getCmp('int_REEL_RESTE').getValue() < 0) {
                                        Ext.getCmp('btn_loturer').disable();
                                    } else {
                                        Ext.getCmp('btn_loturer').enable();
                                    }


                                }

                            }
                        }, int_AMOUNT_REMIS_RETRO
                    ]
                },
                {
                    xtype: 'toolbar',
                    ui: 'footer',
                    dock: 'bottom',
                    border: '0',
                    items: ['->', {
                            text: 'Annuler',
                            id: 'btn_back',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onbtnback
                        }, {
                            text: 'Imprimer',
                            id: 'btn_devis',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: false,
//                     disabled: true,
                            handler: this.onbtnprint
                        }, {
                            text: 'Cloturer',
                            id: 'btn_loturer',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: true,
                            disabled: true,
                            handler: this.onbtncloturer
                        }]
                }]
        });
        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });

        if (my_view_title === "by_cloturer_vente") {
            Ext.getCmp('reglementID').show();
            Ext.getCmp('typeventeID').show();
            Ext.getCmp('btn_loturer').show();
            Ext.getCmp('btn_devis').show();
        }


        if (my_view_title === "by_detail_retrocession") {
            Ext.getCmp('lg_CLIENT_CONFRERE_ID').setValue(this.getOdatasource().lg_CLIENT_ID);
            Ext.getCmp('int_REMISE').setValue(this.getOdatasource().int_REMISE + "%");
            Ext.getCmp('int_ESCOMPTE_SOCIETE').setValue(this.getOdatasource().int_ESCOMPTE_SOCIETE + "%");
            Ext.getCmp('int_TOTAL_VENTE').setValue(this.getOdatasource().int_MONTANT_TTC);
            Ext.getCmp('int_TOTAL_PRODUIT').setValue(this.getOdatasource().int_TOTAL_PRODUIT);
            Ext.getCmp('str_COMMENTAIRE').setValue(this.getOdatasource().str_COMMENTAIRE);
            this.title = "Detail de la retrocession ::  " + this.getOdatasource().lg_CLIENT_ID;
            ref = this.getOdatasource().lg_RETROCESSION_ID;
            //Ext.getCmp('int_CIP').disable();
            //alert("ref " + ref);
        }



        /* Ext.getCmp('gridpanelID').on('edit', function (editor, e) {
         
         var price = Number(e.record.data.int_PRICE_DETAIL);
         var qte = Number(e.record.data.int_QUANTITY);
         var int_total_temp = Me_WorkFlow.DisplayTotal(price, qte);
         //var totaldetail = Number(int_total_temp);
         
         // alert("price "+price + " qte " + qte + " int_total_temp " + int_total_temp + " lg_RETROCESSIONDETAIL_ID " + e.record.data.lg_RETROCESSIONDETAIL_ID + " ref "+ref + " int_QUANTITY " +e.record.data.int_QUANTITY + " lg_FAMILLE_ID "+e.record.data.lg_FAMILLE_ID);
         
         Ext.Ajax.request({
         url: '../webservices/sm_user/detaildretrocession/ws_transaction.jsp?mode=update',
         params: {
         lg_RETROCESSIONDETAIL_ID: e.record.data.lg_RETROCESSIONDETAIL_ID,
         lg_RETROCESSION_ID: ref,
         lg_FAMILLE_ID: e.record.data.lg_FAMILLE_ID,
         int_QUANTITY: e.record.data.int_QUANTITY,
         int_PRICE_DETAIL: int_total_temp
         },
         success: function (response)
         {
         var object = Ext.JSON.decode(response.responseText, false);
         if (object.success === 0) {
         Ext.MessageBox.alert('Error Message', object.errors);
         return;
         }
         // console.log(response.responseText);
         e.record.commit();
         var OGrid = Ext.getCmp('gridpanelID');
         OGrid.getStore().reload();
         Ext.getCmp('int_CIP').setValue("");
         Ext.getCmp('int_EAN13').setValue("");
         Ext.getCmp('str_NAME').setValue("");
         
         
         in_total_vente = Number(object.total_vente);
         int_total_formated = Ext.util.Format.number(in_total_vente, '0,000.');
         Ext.getCmp('int_TOTAL_VENTE').setValue(int_total_formated + '  CFA');
         Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(int_total_formated + '  CFA');
         
         int_total_product = Number(object.int_total_product);
         Ext.getCmp('int_TOTAL_PRODUIT').setValue(int_total_product + '  Produit(s)');
         Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');
         
         },
         failure: function (response)
         {
         console.log("Bug " + response.responseText);
         Ext.MessageBox.alert('Error Message', response.responseText);
         }
         });
         });
         */





        if (ref === "0") {
        } else {
            Ext.Ajax.request({
                url: '../webservices/sm_user/detailsvente/ws_init_data.jsp?mode=init',
                params: {
                    lg_RETROCESSION_ID: ref
                },
                success: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    ref = object.ref;


                    var OGrid = Ext.getCmp('gridpanelID');
                    OGrid.getStore().reload();
                    Ext.getCmp('int_CIP').setValue("");
                    Ext.getCmp('int_EAN13').setValue("");
                    Ext.getCmp('str_NAME').setValue("");

                    in_total_vente = Number(object.total_vente);
                    if (in_total_vente > 0) {
                        Ext.getCmp('btn_devis').enable();
                    } else {
                        Ext.getCmp('btn_devis').disable();
                    }

                    int_total_formated = Ext.util.Format.number(in_total_vente, '0,000.');
                    Ext.getCmp('int_TOTAL_VENTE').setValue(int_total_formated + '  CFA');
                    Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(int_total_formated + '  CFA');

                    int_total_product = Number(object.int_total_product);
                    Ext.getCmp('int_TOTAL_PRODUIT').setValue(int_total_product + '  Produit(s)');
                    Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');
                    Ext.getCmp('str_MEDECIN').setValue(object.str_MEDECIN);
                    Ext.getCmp('lg_NATURE_VENTE_ID').setValue(object.lg_NATURE_VENTE_ID);
                },
                failure: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });

        }



    },
    loadStore: function () {
        Ext.getCmp('gridpanelID').getStore().load({
            callback: this.onStoreLoad
        });

    },
    onStoreLoad: function () {

    },
    onbtnaddclt: function () {
        var mybtntitle = Ext.getCmp('btn_add_clt').getText();
        if (mybtntitle === "Client") {
            new testextjs.view.sm_user.dovente.action.addclt({
                obtntext: mybtntitle,
                odatasource: ref,
                nameintern: ref_vente,
                parentview: this,
                mode: "create",
                titre: "Ajouter Client"
            });
        } else if (mybtntitle === "Tiers.Payant") {
            new testextjs.view.sm_user.dovente.action.addtp({
                obtntext: mybtntitle,
                odatasource: ref,
                nameintern: ref_vente,
                parentview: this,
                mode: "create",
                titre: "Ajouter Tiers.Payant"
            });
        }




    },
    checkIfGridIsEmpty: function () {
        var gridTotalCount = Ext.getCmp('gridpanelID').getStore().getTotalCount();
        return gridTotalCount;
    },
    onValidatePreVenteClick: function () {
        var xtype = "";
        if (my_view_title === "by_cloturer_vente") {
            xtype = "cloturerventemanager";
        } else {

            xtype = "preenregistrementmanager";
        }
        // alert("xtype  " + xtype);
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");

    },
    getFamilleByName: function (str_famille_name) {
        //   alert("1");
        var url_services_data_famille_select_dovente_search = url_services_data_famille_select_dovente + "?search_value=" + str_famille_name;
        //  alert("url_services_data_famille_select_dovente_search   " + url_services_data_famille_select_dovente_search);
        Ext.Ajax.request({
            url: url_services_data_famille_select_dovente_search,
            params: {
            },
            success: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                var OFamille = object.results[0];
                //alert("OFamille length "+OFamille.length + " int_CIP "+OFamille.int_CIP + " int_EAN13 "+OFamille.int_EAN13);
                var int_CIP = OFamille.int_CIP;
                var int_EAN13 = OFamille.int_EAN13;
                Ext.getCmp('int_CIP').setValue(int_CIP);
                Ext.getCmp('int_EAN13').setValue(int_EAN13);




                //Stock



                famille_id_search = OFamille.lg_FAMILLE_ID;
                famille_price_search = Number(OFamille.int_PRICE);
                famille_qte_search = 1;

                url_services_data_famille_select_dovente_search = url_services_data_famille_select_dovente;

            },
            failure: function (response)
            {
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });

    },
    setTitleFrame: function (str_data) {
        this.title = this.title + " :: Ref " + str_data;
        ref = str_data;
        //url_services_data_detailsventeretocession = '../webservices/sm_user/detailsvente/ws_data.jsp?lg_RETROCESSION_ID=' + ref;
        var OGrid = Ext.getCmp('gridpanelID');
        url_services_data_detailsventeretocession = '../webservices/sm_user/detaildretrocession/ws_data.jsp?lg_RETROCESSION_ID=' + ref;
        OGrid.getStore().getProxy().url = url_services_data_detailsventeretocession;
        OGrid.getStore().reload();


    },
    getFamilleByCip: function (str_famille_cip) {
        var url_services_data_famille_select_dovente_search = url_services_data_famille_select_dovente + "?search_cip=" + str_famille_cip;
        Ext.Ajax.request({
            url: url_services_data_famille_select_dovente_search,
            params: {
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);

                var OFamille = object.results[0];
                //alert("OFamille length "+OFamille.length + " int_CIP "+OFamille.int_CIP + " int_EAN13 "+OFamille.int_EAN13);
                var str_NAME = OFamille.str_NAME;
                var int_EAN13 = OFamille.int_EAN13;

                Ext.getCmp('str_NAME').setValue(str_NAME);
                Ext.getCmp('int_EAN13').setValue(int_EAN13);
                famille_id_search = OFamille.lg_FAMILLE_ID;
                //famille_price_search = Number(OFamille.int_PRICE);
                famille_qte_search = 1;

                url_services_data_famille_select_dovente_search = url_services_data_famille_select_dovente;

            },
            failure: function (response)
            {

                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });

    },
    onfiltercheck: function () {
        var str_name = Ext.getCmp('str_NAME').getValue();
        var int_name_size = str_name.length;
        if (int_name_size < 4) {
            Ext.getCmp('btn_add').disable();


        }

    },
    getClientForm: function () {
        new testextjs.view.configmanagement.client.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Client"
        });
    },
    DisplayTotal: function (int_price, int_qte) {
        var TotalAmount_final = 0;
        var TotalAmount_temp = int_qte * int_price;
        var TotalAmount = Number(TotalAmount_temp);
        //   TotalAmount_final = this.amountformat(TotalAmount);
        return TotalAmount;
    },
    DisplayMonnaie: function (int_total, int_amount_recu) {
        var TotalMonnaie = 0;

        Ext.getCmp('int_REEL_RESTE').setValue(int_amount_recu - int_total);
        if (int_total <= int_amount_recu) {
            var TotalMonnaie_temp = int_amount_recu - int_total;
            TotalMonnaie = Number(TotalMonnaie_temp);
            return TotalMonnaie;
        } else {
            return null;
        }
        return TotalMonnaie;
    },
    onbtnback: function () {
        var xtype = "";
        xtype = "retrocessionmanager";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onbtnadd: function () {
        var internal_url = "";

        var int_REMISE = Ext.getCmp('int_REMISE').getValue();
        var lg_CLIENT_CONFRERE_ID = Ext.getCmp('lg_CLIENT_CONFRERE_ID').getValue();
        var int_ESCOMPTE_SOCIETE = Ext.getCmp('int_ESCOMPTE_SOCIETE').getValue();

        if (lg_CLIENT_CONFRERE_ID === "0") {
            Ext.MessageBox.alert('Erreur', 'Veuillez choisir un confrere');
            return;
        }
//        var lg_TVA_ID = Ext.getCmp('lg_TVA_ID').getValue();
        //alert(int_REMISE + " " + lg_CLIENT_CONFRERE_ID + " " + lg_ESCOMPTE_SOCIETE_ID + " famille_id_search " + " famille_qte_search " + famille_qte_search + " " + ref);

        Ext.Ajax.request({
            url: '../webservices/sm_user/detaildretrocession/ws_transaction.jsp?mode=create',
            params: {
                lg_CLIENT_CONFRERE_ID: lg_CLIENT_CONFRERE_ID,
                int_REMISE: int_REMISE,
                int_ESCOMPTE_SOCIETE: int_ESCOMPTE_SOCIETE,
//                lg_TVA_ID: lg_TVA_ID,
                lg_FAMILLE_ID: famille_id_search,
                lg_RETROCESSION_ID: ref,
                lg_RETROCESSIONDETAIL_ID: null,
                int_QUANTITY: famille_qte_search,
                int_QUANTITY_SERVED: famille_qte_search

            },
            success: function (response)
            {

                // alert(response.responseText);
                var object = Ext.JSON.decode(response.responseText, false);

                //Mise a jour de la new ref de la prevente
                ref = object.ref;
                Me_WorkFlow.setTitleFrame(object.ref);



                Ext.getCmp('str_REF_VENTE_RETRO').setValue(object.ref);
                var OGrid = Ext.getCmp('gridpanelID');
                OGrid.getStore().reload();
                //Ext.getCmp('int_CIP').setValue("");
                Ext.getCmp('int_EAN13').setValue("");
                Ext.getCmp('str_NAME').setValue("");


                in_total_vente = Number(object.total_vente);
                //alert(in_total_vente)
                if (in_total_vente > 0) {
                    Ext.getCmp('btn_devis').enable();
                } else {
                    Ext.getCmp('btn_devis').disable();
                }


                int_total_formated = Ext.util.Format.number(in_total_vente, '0,000.');
                Ext.getCmp('int_TOTAL_VENTE').setValue(int_total_formated + '  CFA');
                Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(int_total_formated + '  CFA');

                int_total_product = Number(object.int_total_product);
                Ext.getCmp('int_TOTAL_PRODUIT').setValue(int_total_product + '  Produit(s)');
                Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');



            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });


    },
    onbtncloturer: function () {

        var internal_url = "";
        var task = "";

        if (Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue() === null) {
            Ext.MessageBox.alert('Selectionnez un type de reglement');
            return;
        }

        if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === null) {
            Ext.MessageBox.alert('Selectionnez un type de vente');
            return;
        }


        if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "3") {
            if (str_REF_CLIENT.getValue() === "0") {
                Ext.MessageBox.alert('Selectionnez un client');
                return;
            }
        }

        if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "CARNET") {
            type_vente_id = "3";
        } else if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "ASSURANCE_MUTUELLE") {
            type_vente_id = "2";
        } else {

            type_vente_id = "1";
        }


        /* if (Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue() === "Especes") {
         type_reglement_id = "1";
         } else if (Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue() === "Cheques") {
         type_reglement_id = "2";
         }*/

        //   Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue();
        //  alert(Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue());

        // alert("type_reglement_id  " + type_reglement_id);

        Ext.Ajax.request({
            url: '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=cloturer',
            params: {
                int_TOTAL_VENTE_RECAP: in_total_vente,
                lg_RETROCESSION_ID: ref,
                lg_TYPE_REGLEMENT_ID: Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue(),
                int_AMOUNT_RECU: Number(Ext.getCmp('int_AMOUNT_RECU').getValue().replace(".", "")),
                int_AMOUNT_REMIS_RETRO: int_monnaie,
                lg_COMPTE_CLIENT_ID: cust_account_id,
                lg_TYPE_VENTE_ID: type_vente_id
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);



                var OGrid = Ext.getCmp('gridpanelID');
                OGrid.getStore().reload();
                //Ext.getCmp('int_CIP').setValue("");
                Ext.getCmp('int_EAN13').setValue("");
                Ext.getCmp('str_NAME').setValue("");

                in_total_vente = Number(object.total_vente);
                Ext.getCmp('int_TOTAL_VENTE').setValue(0);
                Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(0);

                int_total_product = Number(object.int_total_product);
                Ext.getCmp('int_TOTAL_PRODUIT').setValue(0 + '  Produit(s)');
                Ext.getCmp('int_NB_PROD_RECAP').setValue(0 + '  Produit(s)');



                Ext.MessageBox.confirm('Message',
                        'confirm l impression du ticket',
                        function (btn) {
                            if (btn === 'yes') {

                                Me_WorkFlow.onPdfClick();

                                return;
                            } else {
                                var xtype = "";
                                if (my_view_title === "by_cloturer_vente") {
                                    xtype = "ventemanager";
                                    testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
                                } else {
                                    xtype = "preenregistrementmanager";
                                    testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
                                }

                            }
                        });


                if (object.errors_code === "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return null;
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
    onbtnprint: function () {
        Ext.MessageBox.confirm('Message',
                'Confirmation de l\'impression du ticket',
                function (btn) {
                    if (btn == 'yes') {
                        //    alert("Imprimer le ticket");
                        Me_WorkFlow.onPdfClick();
                        return;
                    }
                });

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmation de la suppression', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        //alert(url_services_transaction_detailsretrocessionvente + 'delete');

                        Ext.Ajax.request({
                            url: url_services_transaction_detailsretrocessionvente + 'delete',
                            params: {
                                lg_RETROCESSIONDETAIL_ID: rec.get('lg_RETROCESSIONDETAIL_ID'),
                                lg_RETROCESSION_ID: ref
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                }
                                grid.getStore().reload();

                                in_total_vente = Number(object.total_vente);

                                if (in_total_vente > 0) {
                                    Ext.getCmp('btn_devis').enable();
                                } else {
                                    Ext.getCmp('btn_devis').disable();
                                }

                                int_total_formated = Ext.util.Format.number(in_total_vente, '0,000.');
                                Ext.getCmp('int_TOTAL_VENTE').setValue(int_total_formated + '  CFA');
                                Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(int_total_formated + '  CFA');

                                int_total_product = Number(object.int_total_product);
                                Ext.getCmp('int_TOTAL_PRODUIT').setValue(int_total_product + '  Produit(s)');
                                Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');

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
    onPdfClick: function () {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_ticket_retrocession + '?lg_RETROCESSION_ID=' + ref;
        //alert("Ok ca marche " + linkUrl);
        window.open(linkUrl);

        var xtype = "";
        xtype = "retrocessionmanager";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");

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

    }

});


/*function dysplayclt_infos(ref_clt, name_clt) {
 Ext.getCmp('str_REF_CLIENT').setValue(ref_clt);
 Ext.getCmp('str_NAME_CLIENT').setValue(name_clt);
 // Ext.getCmp('int_AMOUNT_RECU').disable();
 }*/

