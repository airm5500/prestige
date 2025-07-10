/* global Ext */

var url_services_data_zonegeo_famille = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_data_codeacte_famille = '../webservices/configmanagement/codeacte/ws_data.jsp';
var url_services_data_grossiste_famille = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_famaillearticle_famille = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_codegestion_famille = '../webservices/configmanagement/codegestion/ws_data.jsp';
var url_services_data_famille = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';
var url_services_data_detailsortie_famille = '../webservices/stockmanagement/suivistockvente/ws_data_mouvement_vente.jsp';
var url_services_data_statVente_famille = '../webservices/stockmanagement/suivistockvente/ws_data_statVente_famille.jsp';
var url_services_data_perime_famille = '../webservices/stockmanagement/perime/ws_data_famille.jsp';
var url_services_data_typeetiquette = '../webservices/configmanagement/typeetiquette/ws_data.jsp';

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
var lgGROSSISTEORDERID = '';

Ext.define('testextjs.view.configmanagement.famille.action.detailArticle', {
    extend: 'Ext.window.Window',
    xtype: 'addfamille',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'testextjs.model.GroupeFamille',
        'testextjs.model.Grossiste',
        'testextjs.model.CodeGestion',
        'testextjs.model.CodeActe',
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'testextjs.model.modelStatVente'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        produitId: null
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

        ref = this.getOdatasource().lg_FAMILLE_ID;



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

        var store_statVente = new Ext.data.Store({
            model: 'testextjs.model.modelStatVente',
            pageSize: itemsPerPage,
            autoLoad: true,
            sorters: [{
                    property: 'int_YEAR',
                    direction: 'ASC'
                }],
            remoteSort: false,
            sortOnLoad: true,
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
                url: '../api/v1/commande/produit/commande/' + ref,

                reader: {
                    type: 'json',
                    root: 'data',
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
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {

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
                                },

                                {
                                    fieldLabel: 'Date dernier.BL',
                                    width: 400,
                                    emptyText: 'Date dernier.BL',
                                    name: 'dt_DATE_LIVRAISON',
                                    id: 'dt_DATE_LIVRAISON'
                                },
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    defaultType: 'dis',
                                    items: [{
                                            fieldLabel: 'Seuil.Reappro',
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldStyle: "color:blue;font-weight:bold;font-size:1.3em",
                                            emptyText: 'Seuil.Reappro',
                                            name: 'int_STOCK_REAPROVISONEMENT',
                                            id: 'int_STOCK_REAPROVISONEMENT'
                                        }, {
                                            fieldLabel: 'Qte.Reappro',
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldStyle: "color:blue;font-weight:bold;font-size:1.3em",
                                            emptyText: 'Qte.Reappro',
                                            name: 'int_QTE_REAPPROVISIONNEMENT',
                                            id: 'int_QTE_REAPPROVISIONNEMENT'
                                        }]}

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
                                }
                                , {
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
                                },
                                {
                                    text: 'Imprimer',
                                    tooltip: 'imprimer',
                                    scope: this,
                                    iconCls: 'pdf',
                                    handler: function () {
                                        let
                                                dt_fin = Ext.getCmp('datefinDetail').getSubmitValue(), dt_debut = Ext.getCmp('datedebutDetail').getSubmitValue()
                                                ;

                                        const linkUrl = "../webservices/stockmanagement/suivistockvente/ws_generate_pdf.jsp" + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + dt_debut + "&datefin=" + dt_fin + "&search_value=" + Ext.getCmp('rechercher').getValue();
                                        window.open(linkUrl);
                                    }
                                }



                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_vente,
                                displayInfo: true
                            },
                            listeners: {
                                scope: this
                            }
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: 'Infos.Commandes recues',
                    collapsible: true,
                    id: 'infoconsorecu',
                    hidden: true,
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
                            columns: [
                                {
                                    header: 'Date entrée',
                                    dataIndex: 'dt_ENTREE',
                                    flex: 1
                                },
                                {
                                    header: 'Date BL',
                                    dataIndex: 'dt_PEREMPTION',
                                    flex: 1
                                },

                                {
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

                                            valdatedebutDetailOrder = me.getSubmitValue();
                                            Ext.getCmp('datefinDetailOrder').setMinValue(me.getValue());


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
                                            lgGROSSISTEORDERID = cmp.getValue();

                                            Me.onRechOrderClick();

                                        }
                                    }
                                }, {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    scope: this,
                                    iconCls: 'searchicon',
                                    handler: this.onRechOrderClick
                                },
                                {
                                    text: 'Imprimer',
                                    tooltip: 'imprimer',
                                    scope: this,
                                    iconCls: 'pdf',
                                    handler: function () {

                                        var
                                                dt_fin = Ext.getCmp('datefinDetailOrder').getSubmitValue(), dt_debut = Ext.getCmp('datedebutDetailOrder').getSubmitValue(),
                                                lgGROSSISTE = Ext.getCmp('lg_GROSSISTE_ORDER_ID').getValue();
                                        if (lgGROSSISTE === null) {
                                            lgGROSSISTE = '';
                                        }

                                        var linkUrl = "../webservices/stockmanagement/suivistockvente/ws_generate_cmde_pdf.jsp" + "?lg_FAMILLE_ID=" + ref + "&datedebut=" + dt_debut + "&datefin=" + dt_fin + "&search_value=" + Ext.getCmp('rechercherOrder').getValue() + "&lgGROSSISTE=" + lgGROSSISTE;

                                        window.open(linkUrl);
                                    }
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',

                                store: store_order,
                                displayInfo: true,
                                pageSize: itemsPerPage,

                                listeners: {
                                    beforechange: function (page, currentPage) {

                                        const myProxy = this.store.getProxy();
                                        myProxy.params = {
                                            search: null,
                                            grossisteId: null,
                                            dtStart: null,
                                            dtEnd: null

                                        };

                                        myProxy.setExtraParam('search', Ext.getCmp('rechercherOrder').getValue());

                                        myProxy.setExtraParam('dtStart', valdatedebutDetailOrder);
                                        myProxy.setExtraParam('dtEnd', valdatefinDetailOrder);
                                        myProxy.setExtraParam('grossisteId', lgGROSSISTEORDERID);

                                    }

                                }
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
                    id: 'infoventerealise',
                    defaultType: 'textfield',
                    hidden: true,
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
                                    align: 'right',
                                    flex: 1
                                }, {
                                    header: 'Février',
                                    dataIndex: 'February',
                                    align: 'right',
                                    flex: 1
                                }, {
                                    header: 'Mars',
                                    dataIndex: 'March',
                                    align: 'right',
                                    flex: 1
                                }, {
                                    header: 'Avril',
                                    dataIndex: 'April',
                                    align: 'right',
                                    flex: 1
                                }, {
                                    header: 'Mai',
                                    dataIndex: 'May',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Juin',
                                    dataIndex: 'June',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Juillet',
                                    dataIndex: 'July',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Ao&ucirc;t',
                                    dataIndex: 'August',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Septembre',
                                    dataIndex: 'September',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Octobre',
                                    dataIndex: 'October',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Novembre',
                                    dataIndex: 'November',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Décembre',
                                    dataIndex: 'December',
                                    align: 'right',
                                    flex: 1
                                }
                            ],

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

        if (Omode == "decondition" || (this.getOdatasource().bool_DECONDITIONNE == 0 && this.getOdatasource().bool_DECONDITIONNE_EXIST == 1)) {
            Ext.getCmp('int_QTEDETAIL').show();
        }
        if (Omode === "update" || Omode === "decondition" || Omode === "detail") {

            ref = this.getProduitId();
            this.loadArticle(this.getProduitId());

        }
        var win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            maximizable: true,
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
        const rec = records[0];
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
        const val = Ext.getCmp('rechercherOrder');
        Ext.getCmp('gridpanelOrderID').getStore().load({
            params: {
                search: val.getValue(),
                grossisteId: lgGROSSISTEORDERID,
                dtStart: valdatedebutDetailOrder,
                dtEnd: valdatefinDetailOrder
            }
        });
    },
    loadArticle: function (produitId) {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/produit-search/fiche',
            params: {
                produitId: produitId

            },

            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);

                const produit = result.results[0];
                me.updateCmp(produit);
            }

        });
    },

    updateCmp: function (rec) {
        Ext.getCmp('int_NUMBER_AVAILABLE').setValue(rec.int_NUMBER_AVAILABLE);
        Ext.getCmp('lg_CODE_GESTION_ID').setValue(rec.lg_CODE_GESTION_ID);
        Ext.getCmp('int_STOCK_REAPROVISONEMENT').setValue(rec.int_STOCK_REAPROVISONEMENT);
        Ext.getCmp('int_QTE_REAPPROVISIONNEMENT').setValue(rec.int_QTE_REAPPROVISIONNEMENT);
        Ext.getCmp('str_CODE_REMISE').setValue(rec.str_CODE_REMISE);
        Ext.getCmp('lg_TYPEETIQUETTE_ID').setValue(rec.lg_TYPEETIQUETTE_ID);
        Ext.getCmp('dt_LAST_INVENTAIRE').setValue(rec.dt_LAST_INVENTAIRE);
        Ext.getCmp('dt_LAST_ENTREE').setValue(rec.dt_LAST_ENTREE);
        Ext.getCmp('dt_DATE_LIVRAISON').setValue(rec.dt_DATE_LIVRAISON);
        Ext.getCmp('dt_LAST_VENTE').setValue(rec.dt_LAST_VENTE);
        Ext.getCmp('str_CODE_TVA').setValue(rec.lg_CODE_TVA_ID);
        Ext.getCmp('int_T').setValue(rec.int_T);
        Ext.getCmp('str_CODE_TAUX_REMBOURSEMENT').setValue(rec.str_CODE_TAUX_REMBOURSEMENT);
        Ext.getCmp('lg_CODE_ACTE_ID').setValue(rec.lg_CODE_ACTE_ID);
        Ext.getCmp('int_TAUX_MARQUE').setValue(rec.int_TAUX_MARQUE);
        Ext.getCmp('int_PAF').setValue(rec.int_PAF);
        Ext.getCmp('int_PAT').setValue(rec.int_PAT);
        Ext.getCmp('int_PRICE_TIPS').setValue(rec.int_PRICE_TIPS);
        Ext.getCmp('int_PRICE').setValue(rec.int_PRICE);
        Ext.getCmp('lg_FAMILLEARTICLE_ID').setValue(rec.lg_FAMILLEARTICLE_ID);
        Ext.getCmp('lg_ZONE_GEO_ID').setValue(rec.lg_ZONE_GEO_ID);
        Ext.getCmp('str_DESCRIPTION').setValue(rec.str_DESCRIPTION);
        Ext.getCmp('int_CIP').setValue(rec.int_CIP);
        Ext.getCmp('int_QTEDETAIL').setValue(rec.int_NUMBERDETAIL);
        Ext.getCmp('int_EAN13').setValue(rec.int_EAN13);
        if (rec.lg_EMPLACEMENT_ID === "1") {
            Ext.getCmp('infoconsorecu').show();
            Ext.getCmp('infoventerealise').show();
        }
    }
});