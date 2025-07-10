var url_services_data_zonegeo_famille = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_data_codeacte_famille = '../webservices/configmanagement/codeacte/ws_data.jsp';
var url_services_data_grossiste_famille = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_famaillearticle_famille = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_codegestion_famille = '../webservices/configmanagement/codegestion/ws_data.jsp';
var url_services_data_famille = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';
var url_services_data_detailsortie_famille = '../webservices/stockmanagement/suivistockvente/ws_data_detailsortie_famille.jsp';
var url_services_data_statVente_famille = '../webservices/stockmanagement/suivistockvente/ws_data_statVente_famille.jsp';
var url_services_data_perime_famille = '../webservices/stockmanagement/perime/ws_data_famille.jsp';
var url_services_data_typeetiquette = '../webservices/configmanagement/typeetiquette/ws_data.jsp';
var ws_get_famille = '../webservices/sm_user/famille/ws_get_famille.jsp';

var Oview;
var Omode;
var Me;
var ref;
var valdatedebutDetail;
var valdatefinDetail;
var valdatedebutDetailOrder;
var valdatefinDetailOrder;
var OgridpanelDetailID;
var OgridpanelOrder;
var lg_GROSSISTE_ORDER_ID;

Ext.define('testextjs.view.configmanagement.famille.action.detailArticleOther', {
    extend: 'Ext.window.Window',
    xtype: 'addfamille',
    id: 'addfamilleID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'testextjs.model.GroupeFamille',
        'testextjs.model.Grossiste',
        'testextjs.model.CodeGestion',
        'testextjs.model.CodeActe',
        'Ext.selection.CellModel',
        'Ext.grid.*'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {

        valdatedebutDetail = "";
        valdatefinDetail = "";
        valdatedebutDetailOrder = "";
        valdatefinDetailOrder = "";
        lg_GROSSISTE_ORDER_ID = "";

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;

        var itemsPerPage = 20;

        ref = this.getOdatasource();


        var store_vente = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: itemsPerPage,
//            autoLoad: false,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_detailsortie_famille + "?lg_FAMILLE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
//        alert("ref:----"+ref);
        var store_statVente = new Ext.data.Store({

            fields: [
                {type: 'int', name: 'int_YEAR'},
                {type: 'int', name: 'April'},
                {type: 'int', name: 'October'},
                {type: 'int', name: 'September'},
                {type: 'int', name: 'November'},
                {type: 'int', name: 'May'},
                {type: 'int', name: 'July'},
                {type: 'int', name: 'June'},
                {type: 'int', name: 'December'},
                {type: 'int', name: 'January'},
                 {type: 'int', name: 'February'},
                 {type: 'int', name: 'March'},
                {type: 'int', name: 'August'}
            ],
            pageSize: itemsPerPage,
//            autoLoad: false,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_statVente_famille + "?lg_FAMILLE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_order = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_perime_famille + "?lg_FAMILLE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var store_grossiste_famille = new Ext.data.Store({
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


        var store_zonegeo_famille = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeo_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_codegestion_famille = new Ext.data.Store({
            model: 'testextjs.model.CodeGestion',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_codegestion_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var store_codeacte_famille = new Ext.data.Store({
            model: 'testextjs.model.CodeActe',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_codeacte_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });




        var form = new Ext.form.Panel({
            bodyPadding: 15,
            autoScroll: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    padding: 10
                },
                defaults: {
                    flex: 1
                },
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    title: 'Infos.Generales sur l\'article',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    /*fieldLabel: 'Cip',
                                     xtype: 'textfield',
                                     maskRe: /[0-9.]/,
                                     width: 400,
                                     autoCreate: {
                                     tag: 'input',
                                     maxlength: '7'
                                     },
                                     emptyText: 'CIP',
                                     name: 'int_CIP',
                                     id: 'int_CIP'*/
                                    xtype: 'displayfield',
                                    fieldLabel: 'CIP',
//                                    labelWidth: 110,
                                    width: 400,
                                    name: 'int_CIP',
                                    id: 'int_CIP',
                                    fieldStyle: "color:blue;font-weight:bold;font-size:1.5em",
//                                    margin: '0 12 0 0',
                                    value: 0
                                },
                                {
                                    fieldLabel: 'Designation',
                                    width: 400,
                                    emptyText: 'DESIGNATION',
                                    name: 'str_DESCRIPTION',
                                    id: 'str_DESCRIPTION'
                                },
                                {
                                    fieldLabel: 'Code EAN 13',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    // maxValue: 13,
                                    emptyText: 'Code EAN 13',
                                    name: 'int_EAN13',
                                    id: 'int_EAN13'
                                }


                            ]
                        }, {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    fieldLabel: 'Emplacement',
                                    width: 400,
                                    emptyText: 'Emplacement',
                                    name: 'lg_ZONE_GEO_ID',
                                    id: 'lg_ZONE_GEO_ID'
                                },
                                {
                                    fieldLabel: 'Famille',
                                    width: 400,
                                    emptyText: 'Famille',
                                    name: 'lg_FAMILLEARTICLE_ID',
                                    id: 'lg_FAMILLEARTICLE_ID'
                                },
                                {
                                    fieldLabel: 'Code.Acte',
                                    width: 400,
                                    emptyText: 'Code.Acte',
                                    name: 'lg_CODE_ACTE_ID',
                                    id: 'lg_CODE_ACTE_ID'
                                }

                            ]
                        }, {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    /*fieldLabel: 'Prix.Vente',
                                     xtype: 'textfield',
                                     maskRe: /[0-9.]/,
                                     width: 400,
                                     // maxValue: 13,
                                     emptyText: 'PRIX VENTE',
                                     name: 'int_PRICE',
                                     id: 'int_PRICE'*/

                                    xtype: 'displayfield',
                                    fieldLabel: 'PRIX VENTE',
//                                    labelWidth: 110,
                                    width: 400,
                                    name: 'int_PRICE',
                                    id: 'int_PRICE',
                                    fieldStyle: "color:blue;font-weight:bold;font-size:1.5em",
//                                    margin: '0 12 0 0',
                                    value: 0
                                }, {
                                    /*fieldLabel: 'Prix.Achat.Facture',
                                     xtype: 'textfield',
                                     maskRe: /[0-9.]/,
                                     width: 400,
                                     maxValue: 13,
                                     emptyText: 'PRIX ACHAT FACTURE',
                                     name: 'int_PAF',
                                     id: 'int_PAF'*/

                                    xtype: 'displayfield',
                                    fieldLabel: 'PRIX ACHAT FACTURE',
//                                    labelWidth: 110,
                                    width: 400,
                                    name: 'int_PAF',
                                    id: 'int_PAF',
                                    fieldStyle: "color:blue;font-weight:bold;font-size:1.5em",
//                                    margin: '0 12 0 0',
                                    value: 0
                                }, {
                                    fieldLabel: 'Prix.Reference',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    //maxValue: 13,
                                    emptyText: 'PRIX TIPS',
                                    name: 'int_PRICE_TIPS',
                                    id: 'int_PRICE_TIPS'
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [{
                                    fieldLabel: 'Code etiquette',
                                    width: 400,
                                    emptyText: 'Code etiquette',
                                    name: 'lg_TYPEETIQUETTE_ID',
                                    id: 'lg_TYPEETIQUETTE_ID'
                                }, {
                                    fieldLabel: 'Code.Remise',
                                    width: 400,
                                    emptyText: 'Code.Remise',
                                    name: 'str_CODE_REMISE',
                                    id: 'str_CODE_REMISE'
                                }, {
                                    fieldLabel: 'Prix.Achat.Tarif',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    maxValue: 13,
                                    emptyText: 'PRIX ACHAT TARIF',
                                    name: 'int_PAT',
                                    id: 'int_PAT'
                                }]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield', margin: '0 0 5 0',
                            items: [{
                                    fieldLabel: 'Taux.Marque',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    width: 400,
                                    maxValue: 13,
                                    emptyText: 'TAUX MARQUE',
                                    name: 'int_TAUX_MARQUE',
                                    id: 'int_TAUX_MARQUE'
                                }, {
                                    fieldLabel: 'Code.Taux.Remb',
                                    width: 400,
                                    maxValue: 13,
                                    emptyText: 'TAUX REMBOURSEMENT',
                                    name: 'str_CODE_TAUX_REMBOURSEMENT',
                                    id: 'str_CODE_TAUX_REMBOURSEMENT'
                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Code Tableau',
                                    name: 'int_T',
                                    id: 'int_T',
                                    fieldStyle: "color:red;font-weight:bold;font-size:1.5em",
                                    width: 400
                                }]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield', margin: '0 0 5 0',
                            items: [
                                {
                                    fieldLabel: 'Code.Tva',
                                    width: 400,
                                    maxValue: 13,
                                    emptyText: 'TVA',
                                    name: 'str_CODE_TVA',
                                    id: 'str_CODE_TVA'
                                }, {
                                    fieldLabel: 'Quantite.Detail/Article',
                                    width: 400,
                                    //maxValue: 13,
                                    emptyText: 'Quantite.Detail/Article',
                                    name: 'int_QTEDETAIL',
                                    id: 'int_QTEDETAIL',
                                    value: 0
                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Stock',
//                                    labelWidth: 110,
                                    name: 'int_NUMBER_AVAILABLE',
                                    id: 'int_NUMBER_AVAILABLE',
                                    fieldStyle: "color:blue;font-weight:bold;font-size:1.5em",
//                                    margin: '0 12 0 0',
                                    width: 400,
                                    value: 0
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield', margin: '0 0 5 0',
                            items: [
                                {
                                    fieldLabel: 'Code.Gestion',
                                    name: 'lg_CODE_GESTION_ID',
                                    width: 400,
                                    emptyText: 'Code.Gestion',
                                    id: 'lg_CODE_GESTION_ID'
                                }, {
                                    fieldLabel: 'Seuil.Reappro',
                                    width: 400,
                                    emptyText: 'Seuil.Reappro',
                                    name: 'int_STOCK_REAPROVISONEMENT',
                                    id: 'int_STOCK_REAPROVISONEMENT'
                                }, {
                                    fieldLabel: 'Qte.Reappro',
                                    width: 400,
                                    emptyText: 'Qte.Reappro',
                                    name: 'int_QTE_REAPPROVISIONNEMENT',
                                    id: 'int_QTE_REAPPROVISIONNEMENT'
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield', margin: '0 0 5 0',
                            items: [{
                                    fieldLabel: 'Date derniere.Vente',
                                    width: 400,
                                    emptyText: 'Date derniere.Vente',
                                    name: 'dt_LAST_VENTE',
                                    id: 'dt_LAST_VENTE'
                                }, {
                                    fieldLabel: 'Date derniere.Entr&eacute;e',
                                    width: 400,
                                    emptyText: 'Date derniere.Entree',
                                    name: 'dt_LAST_ENTREE',
                                    id: 'dt_LAST_ENTREE'
                                }, {
                                    fieldLabel: 'Date dernier.Inventaire',
                                    width: 400,
                                    emptyText: 'Date dernier.Inventaire',
                                    name: 'dt_LAST_INVENTAIRE',
                                    id: 'dt_LAST_INVENTAIRE'
                                }]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    title: 'Infos.Consommations',
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
                            id: 'gridpanelDetailID',
                            margin: '0 0 5 0',
//                            plugins: [this.cellEditing],
                            store: store_vente,
                            height: 200,
                            columns: [{
                                    header: 'Date',
                                    dataIndex: 'dt_UPDATED',
                                    flex: 1
                                }, {
                                    header: 'Reference',
                                    dataIndex: 'str_CODE_TVA',
                                    flex: 1
                                }, {
                                    header: 'Quantite',
                                    dataIndex: 'int_NUMBER',
                                    flex: 1
                                },
                                {
                                    header: 'Prix Vente',
                                    dataIndex: 'int_VALUE1',
                                    align: 'right',
                                    flex: 1
                                }, {
                                    header: 'Utilisateur',
                                    dataIndex: 'lg_USER_ID',
                                    flex: 1
                                }],
                            tbar: [
                                {
                                    xtype: 'datefield',
                                    id: 'datedebutDetail',
                                    name: 'datedebutDetail',
                                    emptyText: 'Date debut',
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    flex: 0.5,
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {
                                            // alert(me.getSubmitValue());
                                            valdatedebutDetail = me.getSubmitValue();
                                            Ext.getCmp('datefinDetail').setMinValue(me.getValue());
                                            Ext.getCmp('gridpanelDetailID').getStore().getProxy().url = url_services_data_detailsortie_famille + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + valdatedebutDetail;

                                        }
                                    }
                                }, {
                                    xtype: 'datefield',
                                    id: 'datefinDetail',
                                    name: 'datefinDetail',
                                    emptyText: 'Date fin',
                                    maxValue: new Date(),
                                    submitFormat: 'Y-m-d',
                                    flex: 0.5,
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {
                                            //alert(me.getSubmitValue());
                                            valdatefinDetail = me.getSubmitValue();

                                            Ext.getCmp('datedebutDetail').setMaxValue(me.getValue());
                                            Ext.getCmp('gridpanelDetailID').getStore().getProxy().url = url_services_data_detailsortie_famille + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + valdatedebutDetail + "&datefin=" + valdatefinDetail;

                                        }
                                    }
                                }, '-', {
                                    xtype: 'textfield',
                                    id: 'rechercher',
                                    name: 'user',
                                    flex: 0.5,
                                    emptyText: 'Rech',
                                    listeners: {
                                        'render': function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me.onRechClick();

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
                                pageSize: 10,
                                store: store_vente,
                                displayInfo: true
//                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this,
//                                selectionchange: this.onSelectionChange
                            }
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: 'Infos.Commandes recues',
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
                            id: 'gridpanelOrderID',
                            margin: '0 0 5 0',
                            store: store_order,
                            height: 200,
                            columns: [{
                                    header: 'Date entree',
                                    dataIndex: 'dt_PEREMPTION',
                                    flex: 1
                                }, {
                                    header: 'Reference',
                                    dataIndex: 'int_NUM_LOT',
                                    flex: 1
                                }, {
                                    header: 'Repartiteur',
                                    dataIndex: 'lg_GROSSISTE_ID',
                                    flex: 1
                                }, {
                                    header: 'Quantite Commande',
                                    dataIndex: 'int_NUMBER',
                                    flex: 1
                                }, {
                                    header: 'Quantite livree',
                                    dataIndex: 'int_STOCK_REAPROVISONEMENT',
                                    flex: 1
                                }, {
                                    header: 'Prix d\'achat',
                                    dataIndex: 'int_VALUE2',
                                    align: 'right',
                                    flex: 1
                                }],
                            tbar: [
                                {
                                    xtype: 'datefield',
                                    id: 'datedebutDetailOrder',
                                    name: 'datedebutDetailOrder',
                                    emptyText: 'Date debut',
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    flex: 0.5,
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {
                                            // alert(me.getSubmitValue());
                                            valdatedebutDetailOrder = me.getSubmitValue();
                                            Ext.getCmp('datefinDetailOrder').setMinValue(me.getValue());
                                            Ext.getCmp('gridpanelOrderID').getStore().getProxy().url = url_services_data_perime_famille + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + valdatedebutDetailOrder;

                                        }
                                    }
                                }, {
                                    xtype: 'datefield',
                                    id: 'datefinDetailOrder',
                                    name: 'datefinDetailOrder',
                                    emptyText: 'Date fin',
                                    maxValue: new Date(),
                                    submitFormat: 'Y-m-d',
                                    flex: 0.5,
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {
                                            valdatefinDetailOrder = me.getSubmitValue();

                                            Ext.getCmp('datedebutDetailOrder').setMaxValue(me.getValue());
                                            Ext.getCmp('gridpanelOrderID').getStore().getProxy().url = url_services_data_perime_famille + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + valdatedebutDetailOrder + "&datefin=" + valdatefinDetailOrder;
                                        }
                                    }
                                }, '-', {
                                    xtype: 'textfield',
                                    id: 'rechercherOrder',
                                    name: 'rechercherOrder',
                                    flex: 0.5,
                                    emptyText: 'Rech',
                                    listeners: {
                                        'render': function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me.onRechOrderClick();

                                                }
                                            });
                                        }
                                    }
                                }, {
                                    xtype: 'combobox',
                                    name: 'lg_GROSSISTE_ORDER_ID',
                                    margins: '0 0 0 10',
                                    id: 'lg_GROSSISTE_ORDER_ID',
                                    store: store_grossiste_famille,
                                    //disabled: true,
                                    valueField: 'lg_GROSSISTE_ID',
                                    displayField: 'str_LIBELLE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    flex: 1,
                                    emptyText: 'Sectionner fournisseur...',
                                    listeners: {
                                        select: function (cmp) {
                                            lg_GROSSISTE_ORDER_ID = cmp.getValue();
                                            Ext.getCmp('gridpanelOrderID').getStore().getProxy().url = url_services_data_detailsortie_famille + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + valdatedebutDetailOrder + "&datefin=" + valdatefinDetailOrder + "&lg_GROSSISTE_ID=" + lg_GROSSISTE_ORDER_ID;
                                            Me.onRechOrderClick();

                                        }
                                    }
                                }, {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    scope: this,
                                    iconCls: 'searchicon',
                                    handler: this.onRechOrderClick
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_order,
                                displayInfo: true
                            },
                            listeners: {
                                scope: this
                            }
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: 'Infos.Ventes realis&eacute;es',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridpanelStatVenteID',
                            margin: '0 0 5 0',
                            store: store_statVente,
                            height: 200,
                            columns: [
                                {
                                    header: 'Année',
                                    dataIndex: 'int_YEAR',
                                    flex: 1
                                }, {
                                    header: 'Janvier',
                                    dataIndex: 'January',
                                    flex: 1
                                }, {
                                    header: 'Fevrier',
                                    dataIndex: 'February',
                                    flex: 1
                                }, {
                                    header: 'Mars',
                                    dataIndex: 'March',
                                    flex: 1
                                }, {
                                    header: 'Avril',
                                    dataIndex: 'April',
                                    flex: 1
                                }, {
                                    header: 'Mai',
                                    dataIndex: 'May',
                                    flex: 1
                                },
                                {
                                    header: 'Juin',
                                    dataIndex: 'June',
                                    flex: 1
                                },
                                {
                                    header: 'Juillet',
                                    dataIndex: 'July',
                                    flex: 1
                                },
                                {
                                    header: 'Ao&ucirc;t',
                                    dataIndex: 'August',
                                    flex: 1
                                },
                                {
                                    header: 'Septembre',
                                    dataIndex: 'September',
                                    flex: 1
                                },
                                {
                                    header: 'Octobre',
                                    dataIndex: 'October',
                                    flex: 1
                                },
                                {
                                    header: 'Novembre',
                                    dataIndex: 'November',
                                    flex: 1
                                },
                                {
                                    header: 'Decembre',
                                    dataIndex: 'December',
                                    flex: 1
                                }
                            ],
                            /*tbar: [
                             {
                             }],*/
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPage,
                                store: store_statVente,
                                displayInfo: true
                            },
                            listeners: {
                                scope: this
                            }
                        }]

                }

            ]


        });


        OgridpanelDetailID = Ext.getCmp('gridpanelDetailID');
        OgridpanelOrder = Ext.getCmp('gridpanelOrder');
        //Initialisation des valeur
//        if (Omode != "decondition") {
//            Ext.getCmp('infosup').hide();
//        }
        if (Omode == "decondition" || (this.getOdatasource().bool_DECONDITIONNE == 0 && this.getOdatasource().bool_DECONDITIONNE_EXIST == 1)) {
            Ext.getCmp('int_QTEDETAIL').show();
        }
        if (Omode === "update" || Omode === "decondition" || Omode === "detail") {
            Me.LoadData();

        }



        var win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            width: '90%',
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function () {
                    if (Omode != "detail") {
                        Ext.getCmp('rechecher').focus();
                    }

                }
            }
        });

    },
    onSelectionChange: function (model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
    onRechClick: function () {

        var val = Ext.getCmp('rechercher');
        if (new Date(valdatedebutDetail) > new Date(valdatefinDetail)) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }
        Ext.getCmp('gridpanelDetailID').getStore().load({
            params: {
                datedebut: valdatedebutDetail,
                datefin: valdatefinDetail,
                search_value: val.getValue()
            }
        }, url_services_data_detailsortie_famille);
    },
    onRechOrderClick: function () {
        var val = Ext.getCmp('rechercherOrder');
        Ext.getCmp('gridpanelOrderID').getStore().load({
            params: {
                search_value: val.getValue(),
                lg_FAMILLE_ID: ref,
                lg_GROSSISTE_ID: lg_GROSSISTE_ID,
                datedebut: valdatedebutDetailOrder,
                datefin: valdatefinDetailOrder
            }
        }, url_services_data_perime_famille);
    },
    LoadData: function () {

        Ext.Ajax.request({
            url: ws_get_famille,
            params: {
                lg_FAMILLE_ID: ref
            },
            success: function (response)
            {
                var object_init = Ext.JSON.decode(response.responseText, false);
                var OFamille = object_init.results[0];
//                     ref = this.getOdatasource();
                Ext.getCmp('int_NUMBER_AVAILABLE').setValue(OFamille.int_NUMBER_AVAILABLE);
                Ext.getCmp('lg_CODE_GESTION_ID').setValue(OFamille.lg_CODE_GESTION_ID);
                Ext.getCmp('int_STOCK_REAPROVISONEMENT').setValue(OFamille.int_STOCK_REAPROVISONEMENT);
                Ext.getCmp('int_QTE_REAPPROVISIONNEMENT').setValue(OFamille.int_QTE_REAPPROVISIONNEMENT);
                Ext.getCmp('str_CODE_REMISE').setValue(OFamille.str_CODE_REMISE);
                Ext.getCmp('lg_TYPEETIQUETTE_ID').setValue(OFamille.lg_TYPEETIQUETTE_ID);
                Ext.getCmp('dt_LAST_INVENTAIRE').setValue(OFamille.dt_LAST_INVENTAIRE);
                Ext.getCmp('dt_LAST_ENTREE').setValue(OFamille.dt_LAST_ENTREE);
                Ext.getCmp('dt_LAST_VENTE').setValue(OFamille.dt_LAST_VENTE);
                Ext.getCmp('str_CODE_TVA').setValue(OFamille.lg_CODE_TVA_ID);
                Ext.getCmp('int_T').setValue(OFamille.int_T);
                Ext.getCmp('str_CODE_TAUX_REMBOURSEMENT').setValue(OFamille.str_CODE_TAUX_REMBOURSEMENT);
                Ext.getCmp('lg_CODE_ACTE_ID').setValue(OFamille.lg_CODE_ACTE_ID);
                Ext.getCmp('int_TAUX_MARQUE').setValue(OFamille.int_TAUX_MARQUE);
                Ext.getCmp('int_PAF').setValue(OFamille.int_PAF);
                Ext.getCmp('int_PAT').setValue(OFamille.int_PAT);
                Ext.getCmp('int_PRICE_TIPS').setValue(OFamille.int_PRICE_TIPS);
                Ext.getCmp('int_PRICE').setValue(OFamille.int_PRICE);
                Ext.getCmp('lg_FAMILLEARTICLE_ID').setValue(OFamille.lg_FAMILLEARTICLE_ID);
                Ext.getCmp('lg_ZONE_GEO_ID').setValue(OFamille.lg_ZONE_GEO_ID);
                Ext.getCmp('str_DESCRIPTION').setValue(OFamille.str_DESCRIPTION);
                Ext.getCmp('int_CIP').setValue(OFamille.int_CIP);
                Ext.getCmp('int_QTEDETAIL').setValue(OFamille.int_NUMBERDETAIL);
                Ext.getCmp('int_EAN13').setValue(OFamille.int_EAN13);

            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });

    }
});