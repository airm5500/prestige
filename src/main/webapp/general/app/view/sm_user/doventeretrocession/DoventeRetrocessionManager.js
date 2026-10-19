/* global Ext */

var url_services_data_famille_select_dovente = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_detailsretrocessionvente = '../webservices/sm_user/detaildretrocession/ws_transaction.jsp?mode=';
var url_services_data_typereglement = '../webservices/sm_user/typereglement/ws_data.jsp';
var url_services_data_typevente = '../webservices/configmanagement/typevente/ws_data.jsp';
var url_services_pdf_ticket_retrocession = '../webservices/sm_user/detaildretrocession/ws_generate_pdf.jsp';

var url_services_data_client_confrere = '../webservices/configmanagement/client/ws_data_other.jsp';
var url_services_data_remise = '../webservices/configmanagement/remise/ws_data.jsp';
var url_services_data_escomptesocietetranche = '../webservices/configmanagement/escomptesocietetranche/ws_data.jsp';
var url_services_data_tva = '../webservices/configmanagement/tva/ws_data.jsp';
var url_services_data_detailsventeretocession = "";
var url_services_data_famille_initial = '';

var LaborexWorkFlow;
var Me_WorkFlow;
var type_vente_id;
var type_reglement_id;

var str_REF_VENTE_DORETRO;
var str_CAISSIER;
var int_NB_PROD_RECAP;
var int_AMOUNT_REMIS_DORETRO;

var Omode;
var ref;

var int_total_product;
var my_view_title;

var ref_vente;

var isBoolT_F;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.sm_user.doventeretrocession.DoventeRetrocessionManager', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.NatureVente',
        'testextjs.model.TypeReglement',
        'testextjs.controller.LaborexWorkFlow',
        'testextjs.view.configmanagement.client.ClientManager',
        'testextjs.view.sm_user.dovente.action.addtp'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '', plain: true,
        maximizable: true,
        tools: [{type: "pin"}],
        closable: true,
        nameintern: ''
    },
    xtype: 'doventeretrocessionmanager',
    id: 'doventeretrocessionmanagerID',
    frame: true,
    title: 'Effectuer une vente', bodyPadding: 5,
    layout: 'column',
    initComponent: function () {

        Me_WorkFlow = this;
        int_total_product = 0;
        str_REF_VENTE_DORETRO = "";
        str_CAISSIER = "";
        int_AMOUNT_REMIS_DORETRO = 0;
        ref_vente = "";
        type_reglement_id = "";

        url_services_data_famille_initial = '../webservices/sm_user/famille/ws_data_initial.jsp';
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        var store_famille_dovente = LaborexWorkFlow.BuildStore('testextjs.model.Famille', itemsPerPage, url_services_data_famille_initial);
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
            ref = ref_add;             //cust_name,cust_account_id

        }




//        var url_services_data_detailsventeretocession = '../webservices/sm_user/detaildretrocession/ws_data.jsp?lg_RETROCESSION_ID=' + ref;
        url_services_data_detailsventeretocession = '../webservices/sm_user/detaildretrocession/ws_data.jsp';


        var storeclient = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_client_confrere + "?lg_TYPE_CLIENT_ID=" + 3,
//                url: url_services_data_client_confrere,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'}
            }
            //autoLoad: true

        });

        var itemsPerPage = 20;
        var store_detailsretrocession = new Ext.data.Store({
            model: 'testextjs.model.DetailsVenteRetrocession',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detailsventeretocession,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'}
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
                    totalProperty: 'total'}
            }

        });



        str_REF_VENTE_DORETRO =
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Ref.Vente ::',
                    name: 'str_REF_VENTE_DORETRO',
                    id: 'str_REF_VENTE_DORETRO',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: "0"
                            //  value: this.getOdatasource().str_REF

                };







        int_AMOUNT_REMIS_DORETRO =
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Monnaie :',
                    name: 'int_AMOUNT_REMIS_DORETRO',
                    id: 'int_AMOUNT_REMIS_DORETRO',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: 0,
                    // renderer: amountformat,
                    align: 'right'

                };



        var str_REF_CLIENT =
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


                };


        str_NAME_CLIENT =
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Name.Client ::',
                    name: 'str_NAME_CLIENT',
                    id: 'str_NAME_CLIENT',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: "0"


                };


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
                labelAlign: 'left', labelWidth: 90,
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
            }, id: 'panelID',
            // items: ['rech_prod', 'gridpanelID'],
            items: [
                {
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
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Nom pharmacien',
                                    allowBlank: false,
                                    name: 'lg_CLIENT_CONFRERE_ID',
                                    margins: '0 10 0 10',
                                    id: 'lg_CLIENT_CONFRERE_ID',
                                    store: storeclient,
                                    valueField: 'lg_CLIENT_ID',
                                    displayField: 'str_FIRST_LAST_NAME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    flex: 1,
                                    emptyText: 'Choisir un confrere...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();
                                            if (value === "0") {
                                                Me_WorkFlow.getClientForm();

                                            }
                                        }

                                    }
                                }, {
                                    name: 'int_REMISE',
                                    id: 'int_REMISE',
                                    fieldLabel: 'Remise',
                                    flex: 0.5,
                                    emptyText: 'Remise',
                                    margin: '0 10 0 0',
                                    value: 0,
                                    maskRe: /[0-9.]//*,
                                     allowBlank: false*/
                                }, {
                                    name: 'int_ESCOMPTE_SOCIETE',
                                    id: 'int_ESCOMPTE_SOCIETE',
                                    fieldLabel: 'Escompte societe',
                                    flex: 0.5,
                                    emptyText: 'Escompte societe',
                                    value: 0,
                                    maskRe: /[0-9.]//*,
                                     allowBlank: false*/
                                }]
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: 'Ajout de produits',
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
                                //                                hideLabel: 'true'
                            },
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Article',
                                    name: 'str_NAME',
                                    id: 'str_NAME',
                                    store: store_famille_dovente,
                                    margins: '0 10 5 10',
                                    enableKeyEvents: true,
                                    valueField: 'str_DESCRIPTION',
                                    pageSize: 20, //ajout la barre de pagination
                                    displayField: 'str_DESCRIPTION_PLUS',
                                    //                                            hideTrigger:true,
                                    typeAhead: true,
                                    flex: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un article par Nom ou Cip...',
                                    listConfig: {
                                        getInnerTpl: function () {
                                            return '<span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right; font-weight:600;"> ({int_PAF})</span>';
                                        }
                                    },
                                    listeners: {
                                        /*keyup: function(f, e) {
                                         
                                         if (e.getKey() == e.ENTER) {
                                         Ext.getCmp('int_QUANTITE').focus();
                                         Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                         }
                                         },*/
                                        select: function (cmp) {

                                            var value = cmp.getValue();
                                            //                                                    alert("value"+value);
                                            var record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné

                                            Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(record.get('lg_FAMILLE_ID'));
                                            Ext.getCmp('str_NAME').focus(true, 100, function () {
                                                Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                            });
                                        },
                                        /* change: function() {
                                         
                                         LaborexWorkFlow.SearchArticle('str_NAME', url_services_data_famille_initial);
                                         
                                         }, 'render': function(cmp) {
                                         
                                         }, onFocus: function() {
                                         this.callParent(arguments);
                                         this.inputEl.dom.select();
                                         }*/
                                    }
                                },
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Id produit :',
                                    name: 'lg_FAMILLE_ID_VENTE',
                                    id: 'lg_FAMILLE_ID_VENTE',
                                    labelWidth: 120,
                                    hidden: true,
                                    fieldStyle: "color:blue;",
                                    margin: '0 15 0 0'

                                },
                                {
                                    fieldLabel: 'Quantit&eacute;',
                                    emptyText: 'Quantite',
                                    name: 'int_QUANTITE',
                                    id: 'int_QUANTITE',
                                    xtype: 'numberfield',
                                    margin: '0 15 0 10',
                                    minValue: 1,
                                    width: 400,
                                    value: 1,
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    regex: /[0-9.]/,
                                    listeners: {
                                        specialKey:function(field, e, option){
                                           if (e.getKey() === e.ENTER) {
                                            ///  grid.getSelectionModel().getSelections();
                                              
                                              
                                              
                                              
                                               if (Ext.getCmp('str_NAME').getValue() != "" && Ext.getCmp('str_NAME').getValue() != "0") {
                                                        Me_WorkFlow.onbtnaddretrocession();
                                                    } else {
                                                        Ext.MessageBox.alert('Error Message', 'Verifiez votre selection svp');
                                                        return;
                                                    } 
                                           }  
                                            
                                        }
                                        
                                    }
                                }
                            ]
                        }
                    ]
                }
                , {
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
                                    flex: 1,
                                    editor: {
                                        xtype: 'numberfield',
                                        allowBlank: false,
                                        selectOnFocus: true,
                                        regex: /[0-9.]/
                                    }
                                }, {
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
                                                /*if(value) {
                                                 alert("value vrai "+value);
                                                 } else {
                                                 alert("value faux "+value);
                                                 }*/
                                                isBoolT_F = value;
                                                // alert(isBoolT_F);
                                                // Ext.getCmp('bool_T_F').setValue(isBoolT_F);
                                                //Me.ReloadData();
                                            }
                                        }
                                    }
                                }, {
                                    text: 'Remise',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_REMISE_DETAIL',
                                    renderer: amountformat,
                                    align: 'right',
                                    value: 0,
                                    editor: {
                                        xtype: 'numberfield',
                                        allowBlank: false,
                                        regex: /[0-9.]/
                                    }
                                }, {
                                    text: 'Montant',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_PRICE_DETAIL',
                                    renderer: amountformat,
                                    align: 'right'
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
                                }],
                            /*bbar: {
                             xtype: 'pagingtoolbar',
                             pageSize: 10,
                             store: store_detailsretrocession,
                             displayInfo: true,
                             plugins: new Ext.ux.ProgressBarPager()                              },*/
                            bbar: {
                                dock: 'bottom',
                                items: [{
                                        xtype: 'pagingtoolbar',
                                        displayInfo: true,
                                        flex: 2,
                                        displayMsg: 'nombre(s) de produit(s): {2}',
                                        pageSize: itemsPerPage,
                                        store: store_detailsretrocession/*, // same store GridPanel is using
                                         listeners: {
                                         beforechange: function(page, currentPage) {
                                         var myProxy = this.store.getProxy();
                                         myProxy.params = {
                                         lg_RETROCESSION_ID: ''
                                         };
                                         myProxy.setExtraParam('lg_RETROCESSION_ID', ref);
                                         }
                                         
                                         }*/
                                    },
                                    {
                                        xtype: 'tbseparator'
                                    },
                                    {
                                        xtype: 'displayfield',
                                        fieldLabel: 'TOTAL VENTE :',
                                        name: 'int_TOTAL_VENTE_DORETRO',
                                        id: 'int_TOTAL_VENTE_DORETRO',
                                        flex: 1,
                                        labelWidth: 120,
                                        fieldStyle: "color:blue;font-weight: bold;font-size: 1.3em",
                                        margin: '0 15 0 0',
                                        value: 0
                                    }
                                ]
                            },
                            listeners: {
                                scope: this,
                                //  selectionchange: this.onSelectionChange
                            }
                        }]
                }, {
                    xtype: 'fieldset',
                    title: 'Espace commentaire',
                    layout: 'hbox',
                    collapsible: true,
                    defaultType: 'textfield',
                    defaults: {
                        hideLabel: 'true'
                    },
                    items: [//
                        {
                            xtype: 'textareafield',
                            grow: true,
                            name: 'str_COMMENTAIRE',
                            fieldLabel: 'Commentaire',
                            id: 'str_COMMENTAIRE',
                            flex: 1,
                            emptyText: 'Saisir un commentaire'
                        }
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
                                                    Ext.getCmp('btn_add_clt').setText('Tiers.Payant');                     //  Ext.getCmp('typeventeID').show();
                                                    //  Ext.getCmp('reglementID').show();
                                                    Ext.getCmp('btn_loturer').disable();

                                                } else if (value === "3") {
                                                    Ext.getCmp('btn_add_clt').enable();
                                                    Ext.getCmp('btn_add_clt').setText('Client');
                                                    Ext.getCmp('lg_TYPE_REGLEMENT_ID').setValue("Especes");
                                                    var total_vente_carnet = Me_WorkFlow.onsplitovalue(Ext.getCmp('int_TOTAL_VENTE_DORETRO').getValue());
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
                            text: 'Enregistrer la retrocession',
                            id: 'btn_devis',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: false,
                            disabled: true,
                            handler: this.onbtnsaveretrocession
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
            Ext.getCmp('int_REMISE').setValue(this.getOdatasource().int_REMISE);
            Ext.getCmp('int_ESCOMPTE_SOCIETE').setValue(this.getOdatasource().int_ESCOMPTE_SOCIETE);
            Ext.getCmp('int_TOTAL_VENTE_DORETRO').setValue(this.getOdatasource().int_MONTANT_TTC);
            this.title = "Detail de la retrocession ::  " + this.getOdatasource().lg_CLIENT_ID;
            ref = this.getOdatasource().lg_RETROCESSION_ID;
            Ext.getCmp('int_CIP').disable();
            //alert("ref " + ref);
        }



        Ext.getCmp('gridpanelID').on('edit', function (editor, e) {

            var price = Number(e.record.data.int_PRICE_DETAIL);
            var qte = Number(e.record.data.int_QUANTITY);
            var int_total_temp = DisplayTotal(price, qte);
            var str_COMMENTAIRE = Ext.getCmp('str_COMMENTAIRE').getValue();
            var int_REMISE_DETAIL = Number(e.record.data.int_REMISE_DETAIL);
            Ext.Ajax.request({
                url: '../webservices/sm_user/detaildretrocession/ws_transaction.jsp?mode=update',
                params: {
                    lg_RETROCESSIONDETAIL_ID: e.record.data.lg_RETROCESSIONDETAIL_ID,
                    int_QUANTITY: e.record.data.int_QUANTITY,
                    int_PRICE_DETAIL: int_total_temp,
                    bool_T_F: isBoolT_F,
                    str_COMMENTAIRE: str_COMMENTAIRE,
                    int_REMISE_DETAIL: int_REMISE_DETAIL,
                    lg_FAMILLE_ID:e.record.data.lg_FAMILLE_ID
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
                    Ext.getCmp('gridpanelID').getStore().reload();
                    Ext.getCmp('int_TOTAL_VENTE_DORETRO').setValue(Ext.util.Format.number(object.total_vente, '0,000.') + ' CFA');
                    Ext.getCmp('str_NAME').focus();
                },
                failure: function (response)
                {
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        });

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
                odatasource: ref, nameintern: ref_vente,
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
    getClientForm: function () {
        new testextjs.view.sm_user.retrocession.action.addClient({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Client",
            type: "retrocession"
        });
    },
    DisplayMonnaie: function (int_total, int_amount_recu) {
        var TotalMonnaie = 0;

        //   Ext.getCmp('int_REEL_RESTE').setValue(int_amount_recu - int_total);
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
    onbtnsaveretrocession: function () {

        Ext.MessageBox.confirm('Message',
                'Confirmer la prise en compte de la retrocession',
                function (btn) {
                    if (btn == 'yes') {
                        var str_COMMENTAIRE = Ext.getCmp('str_COMMENTAIRE').getValue();
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_detailsretrocessionvente + 'cloturer',
                            params: {
                                lg_RETROCESSION_ID: ref,
                                int_REMISE: (Ext.getCmp('int_REMISE').getValue() != null ? Ext.getCmp('int_REMISE').getValue() : 0),
                                int_ESCOMPTE_SOCIETE: (Ext.getCmp('int_ESCOMPTE_SOCIETE').getValue() != null ? Ext.getCmp('int_ESCOMPTE_SOCIETE').getValue() : 0),
                                str_COMMENTAIRE: str_COMMENTAIRE
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                testextjs.app.getController('App').StopWaitingProcess();
                                if (object.errors_code == "0") {
                                    Ext.MessageBox.alert('Message erreur', object.errors);
                                    return;
                                }
                                Ext.MessageBox.confirm('Message',
                                        'Confirmation de l\'impression du ticket',
                                        function (btn) {
                                            if (btn == 'yes') {
                                                Me_WorkFlow.onPdfClick();
                                                return;
                                            }
                                            Me_WorkFlow.GoBack();
                                        });
                            },
                            failure: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                testextjs.app.getController('App').StopWaitingProcess();
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                });



    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmation de la suppression', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_detailsretrocessionvente + 'delete',
                            params: {
                                lg_RETROCESSIONDETAIL_ID: rec.get('lg_RETROCESSIONDETAIL_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();
                                var in_total_vente = Number(object.total_vente);

                                if (in_total_vente > 0) {
                                    Ext.getCmp('btn_devis').enable();
                                } else {
                                    Ext.getCmp('btn_devis').disable();
                                }
                                Ext.getCmp('int_TOTAL_VENTE_DORETRO').setValue(Ext.util.Format.number(object.total_vente, '0,000.') + ' CFA');

                            },
                            failure: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                    });


    },
    GoBack: function () {
        var xtype = "";
        xtype = "retrocessionmanager";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onPdfClick: function () {
        var linkUrl = url_services_pdf_ticket_retrocession + '?lg_RETROCESSION_ID=' + ref;
        window.open(linkUrl);
        Me_WorkFlow.GoBack();
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
    onbtnaddretrocession: function () {
        
        
        
        var lg_CLIENT_CONFRERE_ID = Ext.getCmp('lg_CLIENT_CONFRERE_ID').getValue();
        if (lg_CLIENT_CONFRERE_ID === "0") {
            Ext.MessageBox.alert('Erreur', 'Veuillez choisir un confrere');
            return;
        }
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: '../webservices/sm_user/detaildretrocession/ws_transaction.jsp?mode=create',
            params: {
                lg_CLIENT_CONFRERE_ID: lg_CLIENT_CONFRERE_ID,
                int_REMISE: (Ext.getCmp('int_REMISE').getValue() != null ? Ext.getCmp('int_REMISE').getValue() : 0),
                int_ESCOMPTE_SOCIETE: (Ext.getCmp('int_ESCOMPTE_SOCIETE').getValue() != null ? Ext.getCmp('int_ESCOMPTE_SOCIETE').getValue() : 0),
                lg_FAMILLE_ID: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                lg_RETROCESSION_ID: ref,
                int_QUANTITY: Ext.getCmp('int_QUANTITE').getValue(),
                int_QUANTITY_SERVED: Ext.getCmp('int_QUANTITE').getValue()
            },
            success: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    Ext.MessageBox.alert('Message erreur', object.errors, function (btn) {
                        Ext.getCmp('str_NAME').focus();
                    });
                    return;
                }
                ref = object.ref;
                var in_total_vente = Number(object.total_vente);
                if (in_total_vente > 0) {
                    Ext.getCmp('btn_devis').enable();
                } else {
                    Ext.getCmp('btn_devis').disable();
                }
                Ext.getCmp('int_TOTAL_VENTE_DORETRO').setValue(Ext.util.Format.number(object.total_vente, '0,000.') + ' CFA');
                Ext.getCmp('int_QUANTITE').setValue(1);
                Ext.getCmp('str_NAME').setValue("");
                Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue("");
                Ext.getCmp('str_NAME').focus();
                var OGridStore = Ext.getCmp('gridpanelID').getStore();
                OGridStore.getProxy().url = url_services_data_detailsventeretocession + '?lg_RETROCESSION_ID=' + ref;
                OGridStore.reload();

            },
            failure: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    }

});


function DisplayTotal(int_price, int_qte) {
    var TotalAmount_final = 0;
    var TotalAmount_temp = int_qte * int_price;
    var TotalAmount = Number(TotalAmount_temp);
    //   TotalAmount_final = this.amountformat(TotalAmount);
    return TotalAmount;
}

function onPdfClick() {
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

}


