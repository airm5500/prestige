/* global Ext */

var Me_Window;
var Omode;
var ref;
var ref_final;
var famille_id_search;
var LaborexWorkFlow;
var int_montant_vente;
var int_montant_achat;
var str_STATUT;
var storerepartiteur;
var comboDefaultvalue;
var store_details_order;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.order.action.add', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.controller.LaborexWorkFlow',
        'testextjs.model.Grossiste',
        'testextjs.model.OrderDetail',
        'testextjs.view.configmanagement.famille.action.detailArticle'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
        closable: false,
        nameintern: '',
        orderRef: null,
        prixAchat: null
    },
    xtype: 'ordermanagerlist',
    id: 'ordermanagerlistID',

    title: 'Modifier les informations de la commande',
    bodyStyle: 'background-color: #E5E9EC;',
    bodyPadding: 5,
    layout: 'column',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    initComponent: function () {
        Me_Window = this;
        let itemsPerPage = 100;
        let itemsPerPageGrid = 10;
        famille_id_search = "";

        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        ref = Me_Window.getNameintern();
        if (ref === "0") {
            str_STATUT = this.getOdatasource();
        }
        ref_final = ref;
        titre = this.getTitre();
        this.prixAchat = this.getOdatasource()?.PRIX_ACHAT_TOTAL;
        this.title = titre;
        let produitStore = new Ext.data.Store({
            model: 'testextjs.model.caisse.Produit',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/vente/search',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        let store = Ext.create('testextjs.store.Search');
        comboDefaultvalue = this.getOdatasource().lg_GROSSISTE_ID;
        let store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [

                {str_TYPE_TRANSACTION: 'PRIX_VENTE_DIFF', str_desc: 'PRIX DE VENTE BL DIFFERENT DU PRIX EN MACHINE'},
                {
                    str_TYPE_TRANSACTION: 'PRIX_VENTE_PLUS_30',
                    str_desc: 'PRIX DE VENTE BL DIFFERENT DU PRIX EN MACHINE DE 30F'
                },
                {str_TYPE_TRANSACTION: 'ALL', str_desc: 'Tous'}

            ]
        });

        storerepartiteur = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/grossiste/all',

                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });

        store_details_order = new Ext.data.Store({
            model: 'testextjs.model.OrderDetail',
            pageSize: itemsPerPageGrid,
            autoLoad: false,
            proxy: {
                type: 'ajax',

                url: '../api/v1/commande/commande-en-cours-items',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 180000
            }

        });
        let int_VENTE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Valeur Vente ::',
                    labelWidth: 95,
                    name: 'int_VENTE',
                    id: 'int_VENTE',
                    fieldStyle: "color:red;font-weight:bold;font-size:1.5em",
                    margin: '0 15 0 0',
                    value: "0"
                });
        let int_ACHAT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Valeur Achat ::',
                    labelWidth: 95,
                    name: 'int_ACHAT',
                    id: 'int_ACHAT',
                    fieldStyle: "color:red;font-weight:bold;font-size:1.5em",
                    margin: '0 15 0 0',
                    value: "0"
                });

        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });
        const me = this;
        Ext.apply(me, {
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
                            layout: 'hbox',
                            combineErrors: true,
                            defaultType: 'textfield',
                            defaults: {
                                hideLabel: 'true'
                            },
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Repartiteur',
                                    allowBlank: false,
                                    name: 'Code.Rep',
                                    margin: '5 15 0 0',
                                    id: 'lgGROSSISTEID',
                                    store: storerepartiteur,
                                    valueField: 'lg_GROSSISTE_ID',
                                    displayField: 'str_LIBELLE',
                                    typeAhead: true,
                                    pageSize: 999,
                                    queryMode: 'remote',
                                    width: 450,
                                    emptyText: 'Choisir un repartiteur...',
                                    listeners: {
                                        afterrender: function (field) {
                                            field.focus(true, 50);
                                        },
                                        select: function (cmp) {

                                            if (titre === 'Modifier les informations de la commande') {
                                                Me_Window.onchangeGrossiste();
                                            } else {
                                                Ext.getCmp('str_NAME').focus(true, 100, function () {
                                                    Ext.getCmp('str_NAME').selectText(0, 1);
                                                });
                                            }

                                        }
                                    }

                                },

                                int_ACHAT,
                                int_VENTE]
                        }]
                }
                ,
                {
                    xtype: 'fieldset',
                    title: 'Ajout Produit',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'fieldcontainer',
                            fieldLabel: 'Produit',
                            layout: 'hbox',
                            combineErrors: true,
                            defaultType: 'textfield',
                            defaults: {
                                hideLabel: 'true'
                            },
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Article',
                                    // id: 'str_NAME',
                                    store: produitStore,
                                    pageSize: 10,
                                    valueField: 'lgFAMILLEID',
                                    displayField: 'strNAME',
                                    width: 600,
                                    margins: '0 10 5 10',
                                    queryMode: 'remote',
                                    autoSelect: true,
                                    typeAhead: false,
                                    typeAheadDelay: 0,
                                    forceSelection: true,
                                    enableKeyEvents: true,
                                    minChars: 3,
                                    queryCaching: false,
//                                    selectOnFocus: true,
                                    hidden: true,
                                    emptyText: 'Choisir un article par Nom ou Cip...',
//                                    triggerAction: 'all',
                                    listConfig: {
                                        loadingText: 'Recherche...',
                                        emptyText: 'Pas de données trouvées.',
                                        getInnerTpl: function () {
                                            return '<tpl for="."><tpl if="intNUMBERAVAILABLE <=0"><span style="color:#17987e;font-weight:bold;"><span style="width:100px;display:inline-block;">{intCIP}</span>{strNAME} <span style="float: right;"> ( {intPRICE} )</span></span><tpl else><span style="font-weight:bold;"><span style="width:100px;display:inline-block;">{intCIP}</span>{strNAME} <span style="float: right; "> ( {intPRICE} )</span></span></tpl></tpl>';

                                        }
                                    },
                                    listeners: {
                                        select: function (cmp) {
                                            let value = cmp.getValue();
                                            let record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné
                                            Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(record.get('lg_FAMILLE_ID'));
                                            if (value === "0" || value === "Ajouter un nouvel article") {
                                                Me_Window.onbtnaddArticle();
                                            } else {
                                                Ext.getCmp('int_QUANTITE').focus(true, 100, function () {
                                                    Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                                });
                                            }
                                            Ext.getCmp('btn_detail').enable();

                                        }
                                    }

                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Article',
                                    name: 'str_NAME',
                                    id: 'str_NAME',
                                    store: store,
                                    margins: '0 10 5 10',

                                    valueField: 'CIP',
                                    displayField: 'str_DESCRIPTION',
                                    enableKeyEvents: true,
                                    pageSize: 20,
                                    typeAhead: true,
                                    width: 600,
//                                    flex:2
                                    queryMode: 'remote',
                                    minChars: 3,
                                    emptyText: 'Choisir un article par Nom ou Cip...',
                                    listConfig: {
                                        getInnerTpl: function () {
                                            return '<tpl for="."><tpl if="int_NUMBER_AVAILABLE <=0"><span style="color:#17987e;font-weight:bold;"><span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right;"> ( {int_PAF} ) <span>&nbsp;&nbsp;&nbsp;</span>  <span style="color:red;font-weight:bold;"> ( {int_NUMBER_AVAILABLE} ) </span></span></span><tpl else><span style="font-weight:bold;"><span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right; "> ( {int_PAF} )<span>&nbsp;&nbsp;&nbsp;</span>  <span style="color:red;font-weight:bold;"> ( {int_NUMBER_AVAILABLE} ) </span></span></span></tpl></tpl>';
                                        }
                                    },
                                    listeners: {
                                        select: function (cmp) {
                                            let value = cmp.getValue();
                                            let record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné
                                            Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(record.get('lg_FAMILLE_ID'));
                                            if (value === "0" || value === "Ajouter un nouvel article") {
                                                Me_Window.onbtnaddArticle();
                                            } else {
                                                Ext.getCmp('int_QUANTITE').focus(true, 100, function () {
                                                    Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                                });
                                            }
                                            Ext.getCmp('btn_detail').enable();

                                        }
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
                                    width: 75,
                                    value: 1,
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    regex: /[0-9.]/,
                                    listeners: {
                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER) {

                                                if (Ext.getCmp('str_NAME').getValue() !== "") {

                                                    if (Ext.getCmp('int_QUANTITE').getValue() > 0) {
                                                        Me_Window.onAddNewItem();

                                                    } else {
                                                        Ext.MessageBox.alert('Error Message', 'La quantité doit être supérieure à 0 ');
                                                    }

                                                } else {
                                                    Ext.MessageBox.alert('Error Message', 'Verifiez votre selection svp');

                                                }

                                            }
                                        }
                                    }

                                },
                                {
                                    text: 'Ajouter un nouvel article',
                                    id: 'btn_add_article',
                                    margins: '0 0 0 6',
                                    hidden: true,
                                    xtype: 'button',
                                    handler: this.onbtnaddArticle
                                },
                                {
                                    text: 'Voir detail',
                                    id: 'btn_detail',
                                    margins: '0 0 0 6',
                                    xtype: 'button',
                                    handler: this.onbtndetail,
                                    disabled: true
                                }]
                        }
                    ]
                }
                ,
                {
                    xtype: 'fieldset',
                    title: 'Detail(s) Commandes',
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
                            store: store_details_order,
                            height: 370,
                            columns: [
                                {
                                    xtype: 'rownumberer',
                                    text: '#',
                                    hidden: false,
                                    width: 40,
                                    sortable: true
                                },
                                {
                                    dataIndex: 'prixDiff',
                                    text: '',
                                    width: 40,
                                    renderer: function (v, m, r) {
                                        if (v) {
                                            m.style = 'background-color:#d9534f;';
                                        }
                                        return '';
                                    }
                                },

                                {
                                    text: 'Details Suggestion Id',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_ORDERDETAIL_ID',
                                    id: 'lg_ORDERDETAIL_ID'
                                }, {
                                    text: 'Famille',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_FAMILLE_ID'
                                },

                                {
                                    text: 'CIP',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_CIP'
                                },
                                {
                                    text: 'CODE ARTICLE',
                                    flex: 1,
                                    hidden: true,
                                    sortable: true,
                                    dataIndex: 'str_CODE_ARTICLE'
                                },
                                {
                                    text: 'DESIGNATION',
                                    flex: 2.5,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_NAME'
                                },
                                {
                                    text: 'STOCK',
                                    flex: 0.5,
                                    sortable: true,
                                    renderer: function (value) {
                                        return '<span style="color:purple; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                                    dataIndex: 'lg_FAMILLE_QTE_STOCK',
                                    align: 'right'
                                },

                                {
                                    text: 'PV.MACHINE',
                                    flex: 1,
//                                    hidden: true,
                                    align: 'right',
                                    sortable: true,
                                    dataIndex: 'int_PRICE_MACHINE',
                                    renderer: function (value) {
                                        return '<span style="color:black; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    }

                                },

                                {
                                    text: 'PV IMPORT',
                                    flex: 1,
                                    sortable: true,
                                    align: 'right',
                                    dataIndex: 'lg_FAMILLE_PRIX_VENTE',
                                    renderer: function (value) {
                                        return '<span style="color:blue; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        allowBlank: false,
                                        regex: /[0-9.]/,
                                        selectOnFocus: true,
                                        hideTrigger: true


                                    }

                                },
                                {
                                    text: 'PA.MACHINE',
                                    flex: 1,
                                    align: 'right',
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_PRIX_ACHAT',
                                    renderer: function (value) {
                                        return '<span style="color:black; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    }

                                },
                                {
                                    text: 'PA.IMPORT',
                                    flex: 1,
                                    sortable: true,
                                    align: 'right',
                                    dataIndex: 'int_PAF',
                                    renderer: function (value) {
                                        return '<span style="color:blue; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        allowBlank: false,
                                        regex: /[0-9.]/,
                                        selectOnFocus: true,
                                        hideTrigger: true
                                    }
                                },
                                {
                                    text: 'PRIX TIPS',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    align: 'right',
                                    renderer: amountformat,
                                    dataIndex: 'int_PRIX_REFERENCE',
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        allowBlank: false,
                                        regex: /[0-9.]/
                                    }
                                },
                                {
                                    header: 'QTE',
                                    dataIndex: 'int_NUMBER',
                                    flex: 0.5,
                                    renderer: function (value) {
                                        return '<span style="color:green; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                                    align: 'right',
                                    editor: {
                                        minValue: 1,
                                        xtype: 'numberfield',
                                        allowBlank: false,
                                        selectOnFocus: true,
                                        maskRe: /[0-9.]/
                                    }
                                },

                                {
                                    text: 'MONTANT',
                                    flex: 1,
                                    align: 'right',
                                    renderer: amountformat,
                                    sortable: true,
                                    dataIndex: 'int_PRICE'
                                }, {
                                    header: 'LOTS',
                                    dataIndex: 'lotNums',
                                    flex: 1.1
                                },
                                {
                                    header: 'DATE DE PEREMPTION',

                                    dataIndex: 'datePeremption',
                                    flex: 1.1
                                },

                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/duplicate_3671686.png',
                                            tooltip: 'Voir lots',
                                            scope: this,
                                            handler: this.onVoirLots,
                                            getClass: function (value, metadata, record) {
                                                if (record.get('lots').length > 0) {
                                                    return 'x-display-hide'; //affiche l'icone
                                                } else {
                                                    return 'x-hide-display'; //cache l'icone
                                                }
                                            }
                                        }]
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/application_view_list.png',
                                            tooltip: 'Detail sur l\'article',
                                            scope: this,
                                            handler: this.onDetailClick
                                        }]
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/grossiste.png',
                                            tooltip: 'Gerer le code article grossiste',
                                            scope: this,
                                            handler: this.onAddGrossisteClick,
                                            getClass: function (value, metadata, record) {
                                                if (record.get('str_CODE_ARTICLE') == "") {
                                                    return 'x-display-hide'; //affiche l'icone
                                                } else {
                                                    return 'x-hide-display'; //cache l'icone
                                                }
                                            }
                                        }]
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/delete.png',
                                            tooltip: 'Supprimer',
                                            scope: this,
                                            handler: this.onRemoveClick
                                        }]
                                }
                            ],
                            tbar: [{
                                    xtype: 'textfield',
                                    id: 'rechercherDetail',
                                    name: 'rechercherDetail',
                                    emptyText: 'Recherche',
                                    flex: 1,
                                    listeners: {
                                        'render': function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me_Window.onRechClick();
                                                }
                                            });
                                        }
                                    }
                                },
                                '-', {
                                    xtype: 'combobox',
                                    name: 'str_TYPE_TRANSACTION',
                                    margins: '0 0 0 10',
                                    id: 'str_TYPE_TRANSACTION',
                                    store: store_type,
                                    valueField: 'str_TYPE_TRANSACTION',
                                    displayField: 'str_desc',
                                    typeAhead: true,
                                    queryMode: 'local',
                                    emptyText: 'Filtre article...',
                                    value: 'ALL',
                                    flex: 1,
                                    listeners: {
                                        select: function (cmp) {
                                            const value = cmp.getValue();
                                            str_TYPE_TRANSACTION = value;


                                            Me_Window.onRechClick();
                                        }
                                    }
                                }


                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPageGrid,
                                store: store_details_order,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager(),
                                listeners: {
                                    beforechange: function (page, currentPage) {

                                        const myProxy = this.store.getProxy();
                                        const val = Ext.getCmp('rechercherDetail');
                                        const filtre = Ext.getCmp('str_TYPE_TRANSACTION');

                                        myProxy.params = {
                                            query: '',
                                            filtre: 'ALL',
                                            orderId: Me_Window.getNameintern()

                                        };
                                        myProxy.setExtraParam('query', val.getValue());
                                        myProxy.setExtraParam('filtre', filtre.getValue());
                                        myProxy.setExtraParam('orderId', Me_Window.getNameintern());
                                    }

                                }

                            },
                            listeners: {
                                scope: this

                            }
                        }

                    ]

                },
                {
                    xtype: 'toolbar',
                    ui: 'footer',
                    dock: 'bottom',
                    border: '0',
                    items: ['->',
                        {
                            text: 'CREER BL',
                            id: 'btn_creerbl',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onCreateBLClick
                        },

                        {
                            text: 'Retour',
                            id: 'btn_cancel',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: false,
                            handler: this.onbtncancel
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
        if (str_STATUT === "is_Waiting") {
            Ext.getCmp('btn_save').show();
        }

        if (titre === "Modifier les informations de la commande") {
            Ext.getCmp('lgGROSSISTEID').setValue(this.getOdatasource().str_GROSSISTE_LIBELLE);
            int_montant_achat = Ext.util.Format.number(this.getOdatasource().PRIX_ACHAT_TOTAL, '0,000.');
            int_montant_vente = Ext.util.Format.number(this.getOdatasource().PRIX_VENTE_TOTAL, '0,000.');
            Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
            Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');
            str_STATUT = this.getOdatasource().str_STATUT;

        }


        Ext.getCmp('gridpanelID').on('edit', function (editor, e) {
            let qte = Number(e.record.data.int_NUMBER);
            let url = '../api/v1/commande/updateorderitem';
            testextjs.app.getController('App').ShowWaitingProcess();
            if (e.field === 'lg_FAMILLE_PRIX_VENTE') {
                url = '../api/v1/commande/orderitem-prix-vente';
            }
            Ext.Ajax.request({
                url: url,
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                params: Ext.JSON.encode({
                    id: e.record.data.lg_ORDERDETAIL_ID,
                    grossisteId: Ext.getCmp('lgGROSSISTEID').getValue(),
                    prixAchat: e.record.data.int_PAF,
                    prixVente: e.record.data.lg_FAMILLE_PRIX_VENTE,
                    stock: qte
                }),
                success: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    const object = Ext.JSON.decode(response.responseText, true);
                    if (!object.success) {
                        Ext.MessageBox.alert('Error Message', "L'opération a échoué");
                        Ext.getCmp('gridpanelID').getStore().reload();
                        return;
                    }

                    e.record.commit();
                    Ext.getCmp('gridpanelID').getStore().reload();

                    Ext.getCmp('str_NAME').focus(true, 100, function () {
                        Ext.getCmp('str_NAME').setValue("");
                        Ext.getCmp('str_NAME').selectText(0, 1);
                    });

                    Me_Window.getCommandeAmount(Me_Window.getNameintern());
                },
                failure: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        });
    },
    loadStore: function () {
        Me_Window.onRechClick();
    },

    onbtndetail: function () {

        new testextjs.view.configmanagement.famille.action.detailArticle({

            produitId: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
            parentview: this,
            mode: "detail",
            titre: "Detail sur l'article [" + Ext.getCmp('str_NAME').getValue() + "]"
        });
    },
    onchangeGrossiste: function () {
        testextjs.app.getController('App').ShowWaitingProcess();

        Ext.Ajax.request({
            url: '../api/v1/commande/change-grossiste',
            method: 'GET',
            timeout: 2400000,
            params: {
                orderId: Me_Window.getNameintern(),
                grossisteId: Ext.getCmp('lgGROSSISTEID').getValue()
            },
            success: function (response) {
                testextjs.app.getController('App').StopWaitingProcess();

                Ext.getCmp('str_NAME').focus(true, 100, function () {
                    Ext.getCmp('str_NAME').selectText(0, 1);
                });

            },
            failure: function (response) {

                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
                testextjs.app.getController('App').StopWaitingProcess();
            }
        });
    },
    onbtncancel: function () {

        testextjs.app.getController('App').onLoadNewComponentWithDataSource("i_order_manager", "", "", "");
    },

    updateCip: function (win, formulaire) {
        let me = this;
        if (formulaire.isValid()) {
            let progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/commande/cip',
                params: Ext.JSON.encode(formulaire.getValues()),
                success: function (response, options) {
                    progress.hide();
                    let result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        win.destroy();
                        me.loadStore();
                    } else {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: result.msg,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR

                        });
                    }

                },
                failure: function (response, options) {
                    win.destroy();
                    progress.hide();
                    Ext.Msg.alert("Message", 'Erreur du système ' + response.status);
                }

            });
        }
    },
    onAddGrossisteClick: function (grid, rowIndex) {
        let me = this;
        let rec = grid.getStore().getAt(rowIndex);
        let fam = rec.get('lg_FAMILLE_NAME');
        let lg_FAMILLE_ID1 = rec.get('lg_FAMILLE_ID');
        let lg_GROSSISTE_LIBELLE = rec.get('lg_GROSSISTE_LIBELLE');
        let win = Ext.create("Ext.window.Window", {
            titre: "Ajouter un code article  [" + fam + "]",
            modal: true,
            width: 500,
            height: 200,
            maximizable: false,
            defaults: {
                anchor: '100%'
            },
            items: [
                {
                    xtype: 'form',
                    region: 'center',
                    bodyPadding: 10,
                    fieldDefaults: {
                        labelAlign: 'right',
                        labelWidth: 160,
                        msgTarget: 'side',
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'fieldset',
                            title: 'Information Grossiste',
                            defaultType: 'textfield',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Grossiste',
                                    name: 'refParent',
                                    width: 400,
                                    store: storerepartiteur,
                                    valueField: 'lg_GROSSISTE_ID',
                                    displayField: 'str_LIBELLE',
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un grossiste...',
                                    value: lg_GROSSISTE_LIBELLE
                                },
                                {
                                    name: 'description',
                                    fieldLabel: 'Code article',
                                    emptyText: 'Code article',
                                    flex: 1,
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    listeners: {
                                        afterrender: function (field) {
                                            field.focus(true, 50);
                                        },
                                        specialKey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                let formulaire = field.up('form');
                                                if (formulaire.isValid()) {
                                                    me.updateCip(win, formulaire);
                                                }

                                            }
                                        }
                                    }
                                },
                                {
                                    name: 'ref',
                                    hidden: true,
                                    value: lg_FAMILLE_ID1,
                                    flex: 1,
                                    allowBlank: false
                                }
                            ]

                        }
                    ],
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'bottom',
                            ui: 'footer',
                            layout: {
                                pack: 'end',
                                type: 'hbox'
                            },
                            items: [
                                {
                                    xtype: 'button',
                                    text: 'Save',
                                    handler: function (btn) {
                                        let formulaire = btn.up("form");
                                        console.log(formulaire);
                                        if (formulaire.isValid()) {
                                            me.updateCip(win, formulaire);

                                        } else {
                                            Ext.Msg.alert('Invalid Data', 'Veuillez saissir.');
                                        }
                                    }
                                },
                                {
                                    text: "Fermer",
                                    handler: function () {
                                        win.hide();
                                    }
                                }
                            ]
                        }

                    ]
                }
            ]

        });
        win.show();


    },
    onbtnaddArticle: function () {
        new testextjs.view.configmanagement.famille.action.add2({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Creer un nouveau produit",
            type: "commande"
        });
    },
    onRemoveClick: function (grid, rowIndex) {
        let message = "Confirmer la suppresssion";
        Ext.MessageBox.confirm('Message',
                message,
                function (btn) {
                    if (btn === 'yes') {
                        const rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            method: 'DELETE',
                            url: '../api/v1/commande/item/' + rec.get('lg_ORDERDETAIL_ID'),
                            success: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                grid.getStore().reload();
                                Ext.getCmp('str_NAME').focus(true, 100, function () {
                                    Ext.getCmp('str_NAME').selectText(0, 1);
                                });
                                Me_Window.getCommandeAmount(Me_Window.getNameintern());

                            },
                            failure: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });


                    }
                });
    },

    onDetailClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.famille.action.detailArticle({
            odatasource: rec.data,
            produitId: rec.get('lg_FAMILLE_ID'),
            parentview: this,
            mode: "detail",
            titre: "Detail sur l'article [" + rec.get('str_DESCRIPTION') + "]"
        });
    },
    onVoirLots: function (grid, rowIndex) {

        const rec = grid.getStore().getAt(rowIndex);

        const achatsStore = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'numeroLot', type: 'string'},
                {name: 'datePeremption', type: 'string'},
                {name: 'quantity', type: 'int'}
            ],
            data: rec.get('lots')


        });


        const form = Ext.create('Ext.window.Window',
                {
                    xtype: 'detailLot',
                    alias: 'widget.detailLot',
                    autoShow: true,
                    height: 400,
                    width: '50%',
                    modal: true,
                    title: '<span style="font-size:14px;"> DETAILS LOTS ' + rec.get('lg_FAMILLE_NAME') + '</span>',

                    closeAction: 'hide',

                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },
                    dockedItems: [

                        {
                            xtype: 'toolbar',
                            dock: 'bottom',
                            ui: 'footer',
                            layout: {
                                pack: 'end',
                                type: 'hbox'
                            },
                            items: [

                                {
                                    xtype: 'button',
                                    itemId: 'btnCancel',
                                    text: 'Fermer',
                                    handler: function () {
                                        form.destroy();
                                    }

                                }
                            ]
                        }
                    ],
                    items: [
                        {
                            xtype: 'gridpanel',
                            store: achatsStore,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },

                            columns: [
                                {
                                    xtype: 'rownumberer',
                                    width: 50
                                },

                                {
                                    header: 'Numéro de lot',
                                    dataIndex: 'numeroLot',
                                    flex: 1,
                                    sortable: false,
                                    menuDisabled: true
                                }, {
                                    header: 'Quantité',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'quantity',
                                    align: 'right',
                                    sortable: false,
                                    menuDisabled: true,
                                    flex: 1,
                                    format: '0,000.'

                                }, {
                                    header: 'Date de péremption',
                                    dataIndex: 'datePeremption',
                                    sortable: false,
                                    menuDisabled: true,
                                    flex: 1
                                }
                            ]


                        }
                    ]
                });

    },
    onRechClick: function () {
        const me = this;
        const val = Ext.getCmp('rechercherDetail');
        const filtre = Ext.getCmp('str_TYPE_TRANSACTION');
        Ext.getCmp('gridpanelID').getStore().load({
            params: {
                query: val.getValue(),
                filtre: filtre.getValue(),
                orderId: me.getNameintern()
            }
        });
    },

    getCommandeAmount: function (id) {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/commande/amount/' + id,
            success: function (response, options) {
                const data = Ext.JSON.decode(response.responseText, true);

                me.updateAmountFields(data);

            }
        });

    },
    updateAmountFields: function (data) {
        const me = this;
        if (data) {
            int_montant_achat = Ext.util.Format.number(data.prixAchat, '0,000.');
            int_montant_vente = Ext.util.Format.number(data.prixVente, '0,000.');
            Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
            Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');
            me.orderRef = data.orderRef;
            me.prixAchat = data.prixAchat;


        }

    },
    onPdfClick: function () {
        const me = this;
        const linkUrl = '../EditionCommandeServlet?orderId=' + me.getNameintern() + '&refCommande=' + me.getOdatasource().str_REF_ORDER;
        window.open(linkUrl);
    },
    onAddNewItem: function () {
        const  me = this;
        if (Ext.getCmp('lgGROSSISTEID').getValue() === null) {
            Ext.MessageBox.alert('Error Message', 'Renseignez le Grossiste ');
        } else {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/commande/item/add',
                params: Ext.JSON.encode({
                    familleId: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                    orderId: me.getNameintern(),
                    grossisteId: Ext.getCmp('lgGROSSISTEID').getValue(),
                    statut: str_STATUT,
                    qte: Ext.getCmp('int_QUANTITE').getValue()
                }),

                success: function (response) {
                    const data = Ext.JSON.decode(response.responseText, true);
                    me.nameintern = data.orderId;

                    testextjs.app.getController('App').StopWaitingProcess();
                    me.onRechClick();
                    Ext.getCmp('int_QUANTITE').setValue(1);
                    Ext.getCmp('str_NAME').focus(true, 100, function () {
                        Ext.getCmp('str_NAME').setValue("");
                        Ext.getCmp('str_NAME').selectText(0, 1);
                        me.getCommandeAmount(data.orderId);
                    });

                },
                failure: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        }
    },
    onCreateBLClick: function () {
        const me = this;//
        const orderId = me.getOdatasource()?.lg_ORDER_ID ? me.getOdatasource().lg_ORDER_ID : me.getNameintern();
        const  montantAchat = me.getPrixAchat();
        const orderRef = me.getOdatasource()?.str_REF_ORDER ? me.getOdatasource().str_REF_ORDER : me.getOrderRef();
        new testextjs.view.commandemanagement.cmde_passees.action.add({
            idOrder: orderId,
            odatasource: orderRef,
            montantachat: montantAchat,
            parentview: this,
            mode: "create",
            titre: "Creation bon de livraison"
        });
    }
});


