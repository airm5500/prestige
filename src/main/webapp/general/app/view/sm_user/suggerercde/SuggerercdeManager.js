/* global Ext */

var url_services_transaction_suggerercde = '../webservices/sm_user/suggerercde/ws_transaction.jsp?mode=';
var url_services_data_grossiste_suggerer = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_detailssuggerer = '../webservices/sm_user/suggerercde/ws_data.jsp';
var url_services_pdf_liste_suggerercde = '../webservices/sm_user/suggerercde/ws_generate_pdf.jsp';
var url_services_data_famille_select_suggestion = '../webservices/sm_user/famille/ws_data_initial.jsp';


var Me_Window;
var Omode;
var ref;
var famille_id_search;
var in_total_vente;
var int_total_formated;
var titre;
var int_montant_vente;
var LaborexWorkFlow, myAppController;
var store_famille_dovente = null;
var int_montant_achat;




Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.suggerercde.SuggerercdeManager', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.controller.LaborexWorkFlow',
        'testextjs.model.Grossiste',
        'testextjs.model.TSuggestionOrderDetails'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
        closable: false,
        nameintern: ''
    },
    xtype: 'suggerercdemanager',
    id: 'suggerercdemanagerID',
    frame: true,
    title: 'Suggerer une Commande',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {
        Me_Window = this;
        int_montant_vente = 0;
        int_montant_achat = 0;
        var itemsPerPage = 20;
        var itemsPerPageGrid = 10;
        famille_id_search = "";
        in_total_vente = 0;
        int_total_formated = 0;
        titre = this.getTitre();
        myAppController = Ext.create('testextjs.controller.App', {});
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        store_famille_dovente = LaborexWorkFlow.BuildStore('testextjs.model.Famille', itemsPerPage, url_services_data_famille_select_suggestion);
        var AppController = testextjs.app.getController('App');
        ref = this.getNameintern();
        var store = Ext.create('testextjs.store.SearchStore');
        var storerepartiteur = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_grossiste_suggerer,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_details_sugg = new Ext.data.Store({
            model: 'testextjs.model.TSuggestionOrderDetails',
            pageSize: itemsPerPageGrid,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../suggestion',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var int_BUTOIR = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Butoir ::',
                    labelWidth: 50,
                    name: 'int_DATE_BUTOIR_ARTICLE',
                    id: 'int_DATE_BUTOIR_ARTICLE',
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                    margin: '0 15 0 0',
                    value: "0"
                });
        var int_VENTE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Valeur Vente ::',
                    labelWidth: 95,
                    name: 'int_VENTE',
                    id: 'int_VENTE',
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                    margin: '0 15 0 0',
                    value: "0"
                });
        var int_ACHAT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Valeur Achat ::',
                    labelWidth: 95,
                    name: 'int_ACHAT',
                    id: 'int_ACHAT',
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                    margin: '0 15 0 0',
                    value: "0"
                });
        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });
        Ext.apply(this, {
            width: '98%',
//            height:Ext.getBody().getViewSize().height*0.85,         
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
            items: [{
                    xtype: 'fieldset',
                    title: 'Infos Generales',
                    collapsible: true,
                    defaultType: 'textfield',
                    margin: '5 0 5 0',
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
                                    margin: '0 15 0 0',
                                    id: 'lg_GROSSISTE_ID',
                                    store: storerepartiteur,
                                    valueField: 'lg_GROSSISTE_ID',
                                    displayField: 'str_LIBELLE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un repartiteur...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();

                                            if (titre === 'Suggerer une commande') {
                                                // alert("Titre 2" + titre);
                                                Me_Window.onchangeGrossiste();
                                            }

                                            if (titre == "Ajouter detail commande") {
                                                Me_Window.onIsGrossisteExist(value);
                                            }
                                        }
                                    }
                                },
                                int_BUTOIR,
                                int_ACHAT,
                                int_VENTE]
                        }]
                },
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
                                    name: 'str_NAME',
                                    id: 'str_NAME',
                                    store: store,
                                    margins: '0 10 5 10',
                                    enableKeyEvents: true,
                                    valueField: 'CIP',
                                    displayField: 'str_DESCRIPTION',
                                    pageSize: 20, //ajout la barre de pagination

//                                            hideTrigger:true,
                                    typeAhead: true,
                                    flex: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un article par Nom ou Cip...',
                                    listConfig: {
                                        loadingText: 'Recherche...',
                                        emptyText: 'Pas de données trouvées.',
                                        getInnerTpl: function () {
                                     return '<tpl for="."><tpl if="int_NUMBER_AVAILABLE <=0"><span style="color:#17987e;font-weight:bold;"><span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right;"> ( {int_PRICE} )</span></span><tpl else><span style="font-weight:bold;"><span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right; "> ( {int_PRICE} )</span></span></tpl></tpl>';
//                                            return '<span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right; font-weight:600;"> ({int_PRICE})</span><br>';
                                        }
                                    },
                                    listeners: {
                                        select: function (cmp) {
                                            //   LaborexWorkFlow.DoAjaxGetStockArticle(Ext.getCmp('str_NAME').getValue());

                                            var value = cmp.getValue();
//                                                    alert("value"+value);
                                            var record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné

                                            Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(record.get('lg_FAMILLE_ID'));
                                            if (cmp.getValue() === "0" || cmp.getValue() === "Ajouter un nouvel article") {
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
                                    width: 400,
                                    value: 1,
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    regex: /[0-9.]/,
                                    listeners: {
                                        specialKey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                if (Ext.getCmp('str_NAME').getValue() != "") {
                                                    Me_Window.onEdit();
                                                } else {
                                                    Ext.MessageBox.alert('Error Message', 'Verifiez votre selection svp');
                                                    return;
                                                }
                                            }
                                        }



                                    }
                                },
                                {
                                    text: 'Ajouter',
                                    id: 'btn_add',
                                    margins: '0 0 0 6',
                                    hidden: true,
                                    xtype: 'button',
                                    handler: this.onbtnadd,
                                    disabled: true
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
                    title: 'Liste des produits de la suggestion',
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
                            id: 'gridpanelSuggestionID',
                            plugins: [this.cellEditing],
                            store: store_details_sugg,
                            height: 370,
                            columns: [

                                {
                                    text: 'CIP',
                                    flex: 0.7,
                                    sortable: true,
                                    dataIndex: 'str_FAMILLE_CIP',
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return v;
                                    }
                                },
                                {
                                    text: 'LIBELLE',
                                    flex: 2.5,
                                    sortable: true,
                                    dataIndex: 'str_FAMILLE_NAME',
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }

                                        return v;
                                    }
                                },
                                {
                                    text: 'PRIX.VENTE',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_PRIX_VENTE',
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return amountformat(v);
                                    },

                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        selectOnFocus: true,
                                        allowBlank: false,
                                        regex: /[0-9.]/
                                    }
                                },
                                {
                                    text: 'PRIX A. TARIF',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }

                                        return amountformat(v);
                                    },
                                    dataIndex: 'lg_FAMILLE_PRIX_ACHAT',
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        allowBlank: false,
                                        selectOnFocus: true,
                                        regex: /[0-9.]/
                                    }
                                },
                                {
                                    text: 'PRIX A. FACT',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_PAF_SUGG',
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return amountformat(v);
                                    },
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        allowBlank: false,
                                        regex: /[0-9.]/
                                    }
                                },
                                {
                                    text: 'PRIX TIPS',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return amountformat(v);
                                    },
                                    dataIndex: 'int_PRIX_REFERENCE'
                                },
                                {
                                    text: 'STOCK',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_STOCK',
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return amountformat(v);
                                    }
                                },
                                {
                                    text: 'SEUIL',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_SEUIL',
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return amountformat(v);
                                    }
                                },
                                {
                                    header: 'Q.CDE',
                                    dataIndex: 'int_NUMBER',
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return amountformat(v);
                                    },
                                    flex: 1,
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        selectOnFocus: true,
                                        allowBlank: false,
                                        regex: /[0-9.]/
                                    }
                                },
                                {
//                                    header: 'MOIS EN COURS',
                                    header: AppController.getMonthToDisplay(0, currentMonth),
                                    dataIndex: 'int_VALUE0',
                                    align: 'center',
                                    flex: 1,
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return amountformat(v);
                                    }
                                },
                                {
//                                    header: 'MOIS (-1)',
                                    header: AppController.getMonthToDisplay(1, currentMonth),
                                    dataIndex: 'int_VALUE1',
                                    align: 'center',
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return amountformat(v);
                                    },
                                    flex: 0.7
                                },
                                {
//                                    header: 'MOIS (-2)',
                                    header: AppController.getMonthToDisplay(2, currentMonth),
                                    dataIndex: 'int_VALUE2',
                                    align: 'center',
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return amountformat(v);
                                    },
                                    flex: 0.7
                                },
                                {
//                                    header: 'MOIS (-3)',
                                    header: AppController.getMonthToDisplay(3, currentMonth),
                                    dataIndex: 'int_VALUE3',
                                    align: 'center',
                                    renderer: function (v, m, r) {
                                        if (r.data.STATUS === 1) {
                                            m.style = 'background-color:#73C774;';
                                        }
                                        if (r.data.STATUS === 2) {
                                            m.style = 'background-color:#5fa2dd;';
                                        }


                                        return amountformat(v);
                                    },
                                    flex: 0.7
                                },
                                /*{
                                 header: 'Q.REASSORT',
                                 dataIndex: 'int_QTE_REASSORT',
                                 flex: 1
                                 },*/
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
                                            icon: 'resources/images/icons/fam/delete.png',
                                            tooltip: 'Supprimer',
                                            scope: this,
                                            handler: this.onRemoveClick
                                        }]
                                }],
                            tbar: [{
                                    xtype: 'textfield',
                                    id: 'rechercherDetail',
                                    name: 'rechercherDetail',
                                    emptyText: 'Recherche',
                                    width: 300,
                                    listeners: {
                                        'render': function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me_Window.onRechClick();

                                                }
                                            });
                                        }
                                    }
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPageGrid,
                                store: store_details_sugg,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager(), // same store GridPanel is using
                                listeners: {
                                    beforechange: function (page, currentPage) {
                                        var myProxy = this.store.getProxy();
                                        myProxy.params = {
                                            search_value: '', lg_SUGGESTION_ORDER_ID: ''
                                        };

                                        myProxy.setExtraParam('search_value', Ext.getCmp('rechercherDetail').getValue());
                                        myProxy.setExtraParam('lg_SUGGESTION_ORDER_ID', ref);
                                    }

                                }
                            },
                            listeners: {
                                scope: this
                                        //selectionchange: this.onSelectionChange
                            }
                        }]
                },
                {
                    xtype: 'toolbar',
                    ui: 'footer',
                    dock: 'bottom',
                    border: '0',
                    items: ['->',
                        {
                            text: 'Retour',
                            id: 'btn_cancel',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: false,
                            //disabled: true,
                            handler: this.onbtncancel
                        },
                        {
                            text: 'Imprimer',
                            id: 'btn_print',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: true,
                            handler: this.onbtnprint
                        }
                    ]
                }]
        });
        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
        if (titre == "Suggerer une commande") {
            var OgridpanelSuggestionID = Ext.getCmp('gridpanelSuggestionID');
            Ext.getCmp('lg_GROSSISTE_ID').setValue(this.getOdatasource().lg_GROSSISTE_ID);
            Ext.getCmp('btn_print').show();

            int_montant_achat = Ext.util.Format.number(this.getOdatasource().int_TOTAL_ACHAT, '0,000.');
            int_montant_vente = Ext.util.Format.number(this.getOdatasource().int_TOTAL_VENTE, '0,000.');
            Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
            Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');
            Ext.getCmp('int_DATE_BUTOIR_ARTICLE').setValue(this.getOdatasource().int_DATE_BUTOIR_ARTICLE);
            // var url = '../webservices/sm_user/suggerercde/ws_data.jsp?lg_SUGGESTION_ORDER_ID=' + ref;
            var url = '../suggestion?lg_SUGGESTION_ORDER_ID=' + ref;
//             alert("url "+url);
            OgridpanelSuggestionID.getStore().getProxy().url = url;
            OgridpanelSuggestionID.getStore().load();
            //  Ext.getCmp('gridpanelSuggestionID').getStore().load();

        }

        Ext.getCmp('gridpanelSuggestionID').on('edit', function (editor, e) {


            var qte = Number(e.record.data.int_NUMBER);
            Ext.Ajax.request({
                url: url_services_transaction_suggerercde + 'update',
                params: {
                    lg_SUGGESTION_ORDER_DETAILS_ID: e.record.data.lg_SUGGESTION_ORDER_DETAILS_ID,
                    lg_SUGGESTION_ORDER_ID: ref,
                    str_STATUT: e.record.data.str_STATUT,
                    lg_FAMILLE_ID: e.record.data.lg_FAMILLE_ID,
                    lg_GROSSISTE_ID: Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                    int_NUMBER: qte,
                    int_PRIX_REFERENCE: e.record.data.int_PRIX_REFERENCE,
                    int_PAF: e.record.data.int_PAF_SUGG,
                    lg_FAMILLE_PRIX_ACHAT: e.record.data.lg_FAMILLE_PRIX_ACHAT,
                    lg_FAMILLE_PRIX_VENTE: e.record.data.lg_FAMILLE_PRIX_VENTE
                },
                success: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    }

                    e.record.commit();
                    var OGrid = Ext.getCmp('gridpanelSuggestionID');

                    int_montant_achat = Ext.util.Format.number(object.int_TOTAL_ACHAT, '0,000.');
                    int_montant_vente = Ext.util.Format.number(object.int_TOTAL_VENTE, '0,000.');
                    Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
                    Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');

                    OGrid.getStore().reload();
                    Ext.getCmp('str_NAME').setValue("");

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
//        Ext.getCmp('gridpanelSuggestionID').getStore().load({
//            callback: this.onStoreLoad
//        });
    },
    onStoreLoad: function () {
        // alert("Quantite "+Ext.getCmp('gridpanelSuggestionID').getStore().getCount());
    },
    onbtnprint: function () {
        Ext.MessageBox.confirm('Message',
                'Confirmation de l\'impression de cette suggestion',
                function (btn) {
                    if (btn == 'yes') {
                        Me_Window.onPdfClick(ref);
                        return;
                    }
                });

    },
    onPdfClick: function (lg_SUGGESTION_ORDER_ID) {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_liste_suggerercde + "?lg_SUGGESTION_ORDER_ID=" + lg_SUGGESTION_ORDER_ID;
        //  alert('linkUrl'+ linkUrl);
        window.open(linkUrl);
    },
    checkIfGridIsEmpty: function () {
        var gridTotalCount = Ext.getCmp('gridpanelSuggestionID').getStore().getTotalCount();
        return gridTotalCount;
    },
    setTitleFrame: function (str_data) {
        this.title = this.title + " :: Ref " + str_data;
        ref = str_data;
        url_services_data_detailssuggerer = '../webservices/sm_user/suggerercde/ws_data.jsp?lg_SUGGESTION_ORDER_ID=' + ref;
        var OGrid = Ext.getCmp('gridpanelSuggestionID');
        url_services_data_detailssuggerer = '../webservices/sm_user/suggerercde/ws_data.jsp?lg_SUGGESTION_ORDER_ID=' + ref;
        OGrid.getStore().getProxy().url = url_services_data_detailssuggerer;
        OGrid.getStore().reload();
    },
    onfiltercheck: function () {
        var str_name = Ext.getCmp('str_NAME').getValue();
        var int_name_size = str_name.length;
        if (int_name_size < 4) {
            Ext.getCmp('btn_add').disable();
        }

    },
    onbtnadd: function () {
        var internal_url = "";
        if (ref === "") {
            ref = null;
        } else if (ref === undefined) {
            ref = null;
        }

        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() === null) {

            Ext.MessageBox.alert('Error Message', 'Renseignez le Grossiste ', function () {
                Ext.getCmp('lg_GROSSISTE_ID').focus();
            });
        } else {

            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: url_services_transaction_suggerercde + 'create',
                params: {
//                    lg_FAMILLE_ID: Ext.getCmp('str_NAME').getValue(), ancienne bonne version
                    lg_FAMILLE_ID: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                    lg_SUGGESTION_ORDER_ID: ref,
                    lg_SUGGESTION_ORDER_DETAILS_ID: null,
                    lg_GROSSISTE_ID: Ext.getCmp('lg_GROSSISTE_ID').getValue(),
//                    int_NUMBER: 1
                    int_NUMBER: Ext.getCmp('int_QUANTITE').getValue()

                },
                success: function (response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);


                    if (object.errors_code == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        ref = object.ref;
                        Me_Window.setTitleFrame(object.ref);
                        var OGrid = Ext.getCmp('gridpanelSuggestionID');
                        OGrid.getStore().reload();
                        Ext.getCmp('str_NAME').setValue("");
                        Ext.getCmp('int_QUANTITE').setValue(1);


                        int_montant_achat = Ext.util.Format.number(object.int_TOTAL_ACHAT, '0,000.');
                        int_montant_vente = Ext.util.Format.number(object.int_TOTAL_VENTE, '0,000.');

                        Ext.getCmp('btn_detail').disable();

                        Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
                        Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');
                        Ext.getCmp('str_NAME').focus();

                    }


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

    },

    onEdit: function () {
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() === null) {

            Ext.MessageBox.alert('Error Message', 'Renseignez le Grossiste ', function () {
                Ext.getCmp('lg_GROSSISTE_ID').focus();
            });
        } else {

            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: url_services_transaction_suggerercde + 'onEdit',
                params: {
//                    lg_FAMILLE_ID: Ext.getCmp('str_NAME').getValue(), ancienne bonne version
                    lg_FAMILLE_ID: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                    lg_SUGGESTION_ORDER_ID: ref,
                    int_NUMBER: Ext.getCmp('int_QUANTITE').getValue()

                },
                success: function (response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);


                    if (object.errors_code == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        ref = object.ref;
                        Me_Window.setTitleFrame(object.ref);
                        var OGrid = Ext.getCmp('gridpanelSuggestionID');
                        OGrid.getStore().reload();
                        Ext.getCmp('str_NAME').setValue("");
                        Ext.getCmp('int_QUANTITE').setValue(1);


                        int_montant_achat = Ext.util.Format.number(object.int_TOTAL_ACHAT, '0,000.');
                        int_montant_vente = Ext.util.Format.number(object.int_TOTAL_VENTE, '0,000.');

                        Ext.getCmp('btn_detail').disable();

                        Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
                        Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');
                        Ext.getCmp('str_NAME').focus();

                    }


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

    },

    onchangeGrossiste: function () {

        var lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        var url_transaction = "../webservices/sm_user/suggerercde/ws_transaction.jsp?mode=";
        myAppController.ShowWaitingProcess();
        Ext.Ajax.request({
            url: url_transaction + 'changeGrossiste',
            timeout: 2400000,
            params: {
                lg_SUGGESTION_ORDER_ID: ref,
                lg_GROSSISTE_ID: lg_GROSSISTE_ID
            },
            success: function (response)
            {
                myAppController.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    if (object.answer_fusion == "true") {
                        Ext.MessageBox.confirm('Message', object.errors,
                                function (btn) {
                                    if (btn == 'yes') {
                                        Me_Window.doFusion(ref, lg_GROSSISTE_ID, url_transaction);
                                    }
                                });
                    } else {
                        myAppController.StopWaitingProcess();
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    }

                }

            },
            failure: function (response)
            {

                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
                myAppController.StopWaitingProcess();
            }
        });
    },
    onIsGrossisteExist: function (valeur) {
        var url_transaction = "../webservices/sm_user/suggerercde/ws_transaction.jsp?mode=";
        ref = "0";
        Ext.Ajax.request({
            url: url_transaction + 'onIsGrossisteExist',
            params: {
                lg_GROSSISTE_ID: valeur
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    ref = object.ref;
                }
                var OgridpanelSuggestionID = Ext.getCmp('gridpanelSuggestionID');
                OgridpanelSuggestionID.getStore().getProxy().url = url_services_data_detailssuggerer + "?lg_SUGGESTION_ORDER_ID=" + ref;
                OgridpanelSuggestionID.getStore().reload();
                OgridpanelSuggestionID.getStore().getProxy().url = url_services_data_detailssuggerer;
            },
            failure: function (response)
            {
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    doFusion: function (lg_SUGGESTION_ORDER_ID, lg_GROSSISTE_ID, url_transaction) {
        myAppController.ShowWaitingProcess();
        var internal_url = url_transaction + "doFusion";
        Ext.Ajax.request({
            url: internal_url,
            timeout: 2400000,
            params: {
                lg_SUGGESTION_ORDER_ID: lg_SUGGESTION_ORDER_ID,
                lg_GROSSISTE_ID: lg_GROSSISTE_ID
            },
            success: function (response)
            {
                myAppController.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    Me_Window.onbtncancel();
                }
            },
            failure: function (response)
            {
                myAppController.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    onDetailClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.famille.action.detailArticleOther({
            odatasource: rec.get('lg_FAMILLE_ID'),
            parentview: this,
            mode: "detail",
            titre: "Detail sur l'article [" + rec.get('str_FAMILLE_NAME') + "]"
        });
    },
    onbtndetail: function () {
        new testextjs.view.configmanagement.famille.action.detailArticleOther({
            odatasource: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
            parentview: this,
            mode: "detail",
            titre: "Detail sur l'article [" + Ext.getCmp('str_NAME').getValue() + "]"
        });
    },
    onbtncancel: function () {

        var xtype = "";
        xtype = "i_sugg_manager";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onRemoveClick: function (grid, rowIndex) {
      
        var mode = "delete_suggestion_order_detail";
        

        var rec = grid.getStore().getAt(rowIndex);
        Ext.Ajax.request({
            url: url_services_transaction_suggerercde + mode,
            params: {
                lg_SUGGESTION_ORDER_DETAILS_ID: rec.get('lg_SUGGESTION_ORDER_DETAILS_ID'),
                lg_SUGGESTION_ORDER_ID: ref
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
               
                if (object.int_TOTAL_ACHAT == 0) {
                    Me_Window.onbtncancel();
                    return;
                }
                grid.getStore().reload();

                int_montant_achat = Ext.util.Format.number(object.int_TOTAL_ACHAT, '0,000.');
                int_montant_vente = Ext.util.Format.number(object.int_TOTAL_VENTE, '0,000.');
                Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
                Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');
//    
            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    onSelectionChange: function (model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
    onbtnaddArticle: function () {
        new testextjs.view.configmanagement.famille.action.add2({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter un nouvel article",
            type: "commande"
        });
    },
    onRechClick: function () {
        var val = Ext.getCmp('rechercherDetail');
        Ext.getCmp('gridpanelSuggestionID').getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_detailssuggerer);
    }
});
