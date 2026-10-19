var url_services_data_product = '../webservices/sm_user/famille/ws_data_initial.jsp';
var url_services_transaction_evaluationoffreprix = '../webservices/commandemanagement/evaluationoffreprix/ws_transaction.jsp?mode=';
var url_services_data_evaluationoffreprix_detail = '../webservices/commandemanagement/evaluationoffreprix/ws_data_detail.jsp';
var url_services_pdf = '../webservices/commandemanagement/evaluationoffreprix/ws_generate_pdf.jsp';
var Me_Window;
var LaborexWorkFlow;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.evaluation.action.add', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.controller.LaborexWorkFlow',
        'testextjs.model.Grossiste',
        'testextjs.model.OrderDetail'
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
    /* xtype: 'addevaluationoffreprixmanager',
     id: 'addevaluationoffreprixmanagerID',*/
    xtype: 'evaluationoffreprixmanager',
    id: 'evaluationoffreprixmanagerID',
    frame: true,
    title: 'Evaluation d\'offre de prix',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        Me_Window = this;
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        var itemsPerPage = 20, itemsPerPageGrid = 10;

        var product_store = LaborexWorkFlow.BuildStore('testextjs.model.Famille', itemsPerPage, url_services_data_product);

        var product_evaluate_store = new Ext.data.Store({
            model: 'testextjs.model.OrderDetail',
            pageSize: itemsPerPageGrid,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_evaluationoffreprix_detail,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 180000
            }

        });

        /*var int_VENTE = new Ext.form.field.Display(
         {
         xtype: 'displayfield',
         fieldLabel: 'Valeur Vente ::',
         labelWidth: 95,
         name: 'int_VENTE',
         id: 'int_VENTE',
         fieldStyle: "color:blue;font-weight:bold;font-size:1.5em",
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
         fieldStyle: "color:blue;font-weight:bold;font-size:1.5em",
         margin: '0 15 0 0',
         value: "0"
         });*/
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
            items: [
                /* {
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
                 //                                hideLabel: 'true'
                 },
                 items: [
                 {
                 fieldLabel: 'Prestaire',
                 xtype: 'textfield',
                 flex: 2,
                 emptyText: 'Prestaire',
                 name: 'str_PRESTATAIRE',
                 id: 'str_PRESTATAIRE'
                 },
                 ]
                 }]
                 }
                 ,*/
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
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Produit',
                                    name: 'str_NAME',
                                    id: 'str_NAME',
                                    store: product_store,
                                    margins: '0 10 5 10',
                                    valueField: 'str_DESCRIPTION',
                                    displayField: 'str_DESCRIPTION',
                                    enableKeyEvents: true,
                                    pageSize: itemsPerPage, //ajout la barre de pagination
                                    typeAhead: true,
                                    flex: 1,
                                    queryMode: 'remote',
                                    minChars: 3,
                                    emptyText: 'Choisir un article par Designation ou CIP...',
                                    listConfig: {
                                        getInnerTpl: function() {
                                            return '<span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right; font-weight:600;"> ({int_PAF})</span>';
                                        }
                                    },
                                    listeners: {
                                        afterrender: function (field) { // a decommenter apres les tests
                                            field.focus();
                                        },
                                        select: function(cmp) {
                                            var value = cmp.getValue();
                                            var record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné
                                            Ext.getCmp('lg_FAMILLE_ID_EVALUATE').setValue(record.get('lg_FAMILLE_ID'));
                                            Ext.getCmp('int_PAF').focus(true, 100, function() {
                                                Ext.getCmp('int_PAF').setValue(record.get('int_PAF'));
                                                Ext.getCmp('int_PAF').selectText(0, Ext.getCmp('int_PAF').getValue().length);
                                            });
                                            Ext.getCmp('btn_detail').enable();
                                        }
                                    }
                                },
                                {
                                    fieldLabel: 'Prix Achat Offre',
                                    xtype: 'textfield',
                                    maskRe: /[0-9.]/,
                                    flex: 1,
                                    emptyText: 'PRIX ACHAT OFFRE',
                                    name: 'int_PAF',
                                    id: 'int_PAF',
                                    selectOnFocus: true,
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    listeners: {
                                        specialKey: function(field, e, options) {
                                            if (e.getKey() === e.ENTER) {
                                                Ext.getCmp('int_QUANTITE').focus(true, 100, function() {
                                                    Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                                });

                                            }
                                        }
                                    }
                                },
                                {
                                    xtype: 'hiddenfield',
                                    flex: 1,
                                    name: 'lg_FAMILLE_ID_EVALUATE',
                                    id: 'lg_FAMILLE_ID_EVALUATE',
                                    value: '0'
                                }

                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    fieldLabel: 'Quantit&eacute;',
                                    emptyText: 'Quantite',
                                    name: 'int_QUANTITE',
                                    id: 'int_QUANTITE',
                                    xtype: 'numberfield',
                                    margin: '0 15 0 10',
                                    minValue: 1,
                                    flex: 2,
                                    value: 1,
                                    selectOnFocus: true,
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    regex: /[0-9.]/,
                                    listeners: {
                                        specialKey: function(field, e, options) {
                                            if (e.getKey() === e.ENTER) {
                                                Ext.getCmp('int_UG').focus(true, 100, function() {
                                                    Ext.getCmp('int_UG').selectText(0, 1);
                                                });

                                            }
                                        }
                                    }

                                },
                                {
                                    fieldLabel: 'Unit&eacute;s Gratuites',
                                    emptyText: 'Unites Gratuite',
                                    name: 'int_UG',
                                    id: 'int_UG',
                                    xtype: 'numberfield',
                                    margin: '0 15 0 10',
                                    minValue: 0,
                                    flex: 1,
                                    value: 0,
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    regex: /[0-9.]/,
                                    selectOnFocus: true,
                                },
                                {
                                    text: 'Valider',
                                    id: 'btn_detail',
                                    flex: 1,
                                    margins: '0 0 0 6',
                                    xtype: 'button',
                                    handler: this.onbtnaddToEvaluation,
                                    disabled: true
                                }

                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    title: 'Detail des produits de l\'offre de prix',
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
                            id: 'gridpanelEvaluatePriceID',
                            plugins: [this.cellEditing],
                            store: product_evaluate_store,
                            height: 370,
                            columns: [
                                {
                                    xtype: 'rownumberer',
                                    text: 'N&deg;',
                                    width: 45,
                                    sortable: true
                                },
                                {
                                    text: 'CIP',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_CIP'
                                },
                                {
                                    text: 'DESIGNATION',
                                    flex: 2.5,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_NAME'
                                },
                                {
                                    text: 'STOCK',
                                    flex: 0.7,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_QTE_STOCK'
                                }, {
                                    text: 'PRIX ACHAT FACT.',
                                    flex: 1,
                                    sortable: true,
                                    align: 'right',
                                    dataIndex: 'lg_FAMILLE_PRIX_VENTE',
                                    renderer: amountformat
                                },
                                {
                                    text: 'PRIX ACHAT OFFRE',
                                    flex: 1,
                                    sortable: true,
                                    align: 'right',
                                    dataIndex: 'lg_FAMILLE_PRIX_ACHAT',
                                    renderer: amountformat,
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        allowBlank: false,
                                        selectOnFocus: true,
                                        regex: /[0-9.]/
                                    }
                                },
                                {
                                    header: 'QTE',
                                    dataIndex: 'int_NUMBER',
                                    flex: 0.7,
                                    editor: {
                                        minValue: 1,
                                        xtype: 'numberfield',
                                        allowBlank: false,
                                        selectOnFocus: true,
                                        maskRe: /[0-9.]/
                                    }
                                },
                                {
                                    text: 'U.G',
                                    flex: 0.7,
                                    sortable: true,
                                    renderer: amountformat,
                                    dataIndex: 'int_QTE_REP_GROSSISTE',
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        allowBlank: false,
                                        selectOnFocus: true,
                                        regex: /[0-9.]/
                                    }
                                },
                                {
                                    header: 'Nbre Mois Liquid.',
                                    dataIndex: 'int_PRIX_REFERENCE',
                                    align: 'center',
                                    flex: 1
                                },
                                {
                                    text: 'MONTANT',
                                    flex: 1,
                                    renderer: amountformat,
                                    sortable: true,
                                    dataIndex: 'int_PRICE'
                                },
                                {
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
                            tbar: [{
                                    xtype: 'textfield',
                                    id: 'rechercherDetail',
                                    name: 'rechercherDetail',
                                    emptyText: 'Recherche',
                                    width: 300,
                                    listeners: {
                                        'render': function(cmp) {
                                            cmp.getEl().on('keypress', function(e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me_Window.onRechClick();
                                                }
                                            });
                                        }
                                    }
                                }
                            ],
                            bbar: {
                                dock: 'bottom',
                                items: [
                                    {
                                        xtype: 'pagingtoolbar',
                                        displayInfo: true,
                                        flex: 2,
                                        pageSize: itemsPerPage,
                                        store: product_evaluate_store, // same store GridPanel is using
                                        listeners: {
                                            beforechange: function(page, currentPage) {
                                                var myProxy = this.store.getProxy();
                                                myProxy.params = {
                                                    search_value: ''
                                                };
                                                myProxy.setExtraParam('search_value', Ext.getCmp('rechercherDetail').getValue());

                                            }

                                        }
                                    },
                                    {
                                        xtype: 'tbseparator'
                                    },
                                    {
                                        xtype: 'displayfield',
                                        fieldLabel: 'Valeur Vente ::',
                                        labelWidth: 95,
                                        flex: 1,
                                        name: 'int_VENTE',
                                        id: 'int_VENTE',
                                        hidden: true,
                                        fieldStyle: "color:blue;font-weight:bold;font-size:1.5em",
                                        margin: '0 35 0 35',
                                        value: "0"
                                    },
                                    {
                                        xtype: 'displayfield',
                                        fieldLabel: 'Valeur Achat ::',
                                        labelWidth: 95,
                                        flex: 1,
                                        name: 'int_ACHAT',
                                        id: 'int_ACHAT',
                                        fieldStyle: "color:blue;font-weight:bold;font-size:1.5em",
                                        margin: '0 15 0 0',
                                        value: "0"
                                    }
                                ]
                            },
                            listeners: {
                                scope: this,
                                //  selectionchange: this.onSelectionChange
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
                            text: 'Terminer',
                            id: 'btn_save',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onbtnclosure
                        },
                        {
                            text: 'Imprimer',
                            hidden: true,
                            iconCls: 'printable',
                            scope: this,
                            handler: this.onPdfClick
                        },
                        {
                            text: 'Retour',
                            id: 'btn_cancel',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: true,
                            //disabled: true,
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

        Ext.getCmp('gridpanelEvaluatePriceID').on('validateedit', function(editor, e) {

            var int_PRICE_OFFRE = Number(e.record.data.lg_FAMILLE_PRIX_ACHAT); //a decommenter en cas de probleme
            var int_NUMBER = e.record.data.int_NUMBER;
            var int_UG = e.record.data.int_QTE_REP_GROSSISTE;
            var plugin2 = Ext.getCmp('gridpanelEvaluatePriceID').getPlugin();


            if (e.colIdx == 5) {
                int_PRICE_OFFRE = e.value;
            } else if (e.colIdx == 6) {
                int_NUMBER = e.value;
            } else if (e.colIdx == 7) {
                int_UG = e.value;
            }


            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: url_services_transaction_evaluationoffreprix + 'update',
                params: {
                    lg_EVALUATIONOFFREPRIX_ID: e.record.data.lg_ORDERDETAIL_ID,
                    int_NUMBER: int_NUMBER,
                    int_UG: int_UG,
                    int_PRICE: int_PRICE_OFFRE
                },
                success: function(response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors, function() {
                            if (e.colIdx == 5) {
                                e.record.data.lg_FAMILLE_PRIX_ACHAT = e.record.data.lg_FAMILLE_PRIX_ACHAT;
                            } else if (e.colIdx == 6) {
                                e.record.data.int_NUMBER = e.record.data.int_NUMBER;
                            } else if (e.colIdx == 7) {
                                e.record.data.int_QTE_REP_GROSSISTE = e.record.data.int_QTE_REP_GROSSISTE;
                            }
                            plugin2.startEdit(e.rowIdx, e.colIdx);
                        });
                        return;
                    }

                    e.record.commit();
                    var OGrid = Ext.getCmp('gridpanelEvaluatePriceID');
                    OGrid.getStore().reload();
                    /*int_montant_achat = Ext.util.Format.number(object.PRIX_ACHAT_TOTAL, '0,000.');
                     int_montant_vente = Ext.util.Format.number(object.PRIX_VENTE_TOTAL, '0,000.');
                     Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');*/
                    Ext.getCmp('int_ACHAT').setValue(Ext.util.Format.number(object.PRIX_ACHAT_TOTAL, '0,000.') + '  CFA');
                },
                failure: function(response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        });
    },
    onRemoveClick: function(grid, rowIndex) {

        PrestigeConfirmation.ligne('Message', "Confirmer la suppresssion", function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_evaluationoffreprix + "delete",
                            params: {
                                lg_EVALUATIONOFFREPRIX_ID: rec.get('lg_ORDERDETAIL_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }

                                /*int_montant_achat = Ext.util.Format.number(object.PRIX_ACHAT_TOTAL, '0,000.');
                                 int_montant_vente = Ext.util.Format.number(object.PRIX_VENTE_TOTAL, '0,000.');
                                 Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');*/
                                Ext.getCmp('int_ACHAT').setValue(Ext.util.Format.number(object.PRIX_ACHAT_TOTAL, '0,000.') + '  CFA');
                                grid.getStore().reload();
                                Ext.getCmp('str_NAME').focus(true, 100, function() {
                                    Ext.getCmp('str_NAME').selectText(0, 1);
                                });
                            },
                            failure: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                        return;
                    });
    },
    loadStore: function() {
        Ext.getCmp('gridpanelEvaluatePriceID').getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
        Ext.Ajax.request({
            url: url_services_transaction_evaluationoffreprix + 'init',
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "1") {
                   Ext.getCmp('int_ACHAT').setValue(Ext.util.Format.number(object.PRIX_ACHAT_TOTAL, '0,000.') + '  CFA');
                } 


            },
            failure: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
            }
        });
    },
    onSelectionChange: function(model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
    onbtnaddToEvaluation: function() {

        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: url_services_transaction_evaluationoffreprix + 'create',
            params: {
                lg_FAMILLE_ID: Ext.getCmp('lg_FAMILLE_ID_EVALUATE').getValue(),
                int_UG: Ext.getCmp('int_UG').getValue(),
                int_NUMBER: Ext.getCmp('int_QUANTITE').getValue(),
                int_PRICE: Ext.getCmp('int_PAF').getValue()

            },
            success: function(response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    var OGrid = Ext.getCmp('gridpanelEvaluatePriceID');
                    OGrid.getStore().reload();
                    Me_Window.getForm().reset();
                    Ext.getCmp('str_NAME').focus(true, 100, function() {
                        Ext.getCmp('str_NAME').selectText(0, 1);
                    });
                    
                    Ext.getCmp('btn_detail').disable();

                    Ext.getCmp('int_ACHAT').setValue(Ext.util.Format.number(object.PRIX_ACHAT_TOTAL, '0,000.') + '  CFA');
                }


            },
            failure: function(response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    onbtnclosure: function() {

        Ext.MessageBox.confirm('Message',
                'Confirmer la cl&ocirc;ture de l\'&eacute;valuation de l\'offre',
                function(btn) {
                    if (btn === 'yes') {

                        Ext.Ajax.request({
                            url: url_services_transaction_evaluationoffreprix + 'closure',
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
Me_Window.onbtncancel();
                               /* Ext.MessageBox.confirm('Message',
                                        'Imprimer le bon de commande?',
                                        function(btn) {
                                            if (btn === 'yes') {
                                                Me_Window.onPdfClick(ref);
                                                return;
                                            }
                                            Me_Window.onbtncancel();
                                        });*/
                            },
                            failure: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                });
//        this.up('window').close();
    },
    onPdfClick: function() {
        window.open(url_services_pdf);
    },
    onRechClick: function() {
        var val = Ext.getCmp('rechercherDetail');
        Ext.getCmp('gridpanelEvaluatePriceID').getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_evaluationoffreprix_detail);
    },
    onbtncancel: function() {
        testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");
    }
});
