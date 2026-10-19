//var url_services_data_typestock_famille = '../webservices/stockmanagement/stock/ws_data.jsp';
var url_services_data_famille_select_dovente = '../webservices/sm_user/famille/ws_data_jdbc.jsp';
var url_services_data_detailsretourdepot = '../webservices/stockmanagement/retourdepot/ws_data_detail.jsp';
var url_services_transaction_retourdepot = '../webservices/stockmanagement/retourdepot/ws_transaction.jsp?mode=';
var url_services_pdf_fiche_retourdepot = '../webservices/stockmanagement/retourdepot/ws_generate_pdf.jsp';
var Me;
var Omode;
var ref = "0";
//
var ref_vente = "";
var int_monnaie = 0;
var in_total_vente = 0;
var LaborexWorkFlow;
var store_famille_dovente = null;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

function amountformatbis(val) {
    return amountformat(val) + " F CFA";
}

Ext.define('testextjs.view.stockmanagement.retourdepot.action.add', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: 'Ajustement d\'articles',
        plain: true,
        maximizable: true,
//        tools: [{type: "pin"}],
        closable: false,
        nameintern: ''
    },
    xtype: 'addretourdepot',
    id: 'addretourdepotID',
    frame: true,
    title: 'Retour d\'articles d\'un depot',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        Me = this;
        this.title = this.getTitre();
        ref = this.getNameintern();
        var itemsPerPage = 20;
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        store_famille_dovente = LaborexWorkFlow.BuildStore('testextjs.model.Famille', itemsPerPage, url_services_data_famille_select_dovente);

        var store_details = new Ext.data.Store({
            model: 'testextjs.model.DetailsAjustement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detailsretourdepot + "?lg_RETOURDEPOT_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var int_TOTAL_PRODUCT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    flex: 0.7,
                    fieldLabel: 'Nombre de produits total::',
                    fieldWidth: 300,
                    name: 'int_TOTAL_PRODUCT',
                    id: 'int_TOTAL_PRODUCT',
//                    renderer: amountformatbis,
                    fieldStyle: "color:blue;",
                    value: "0"


                });

        var int_TOTAL_AMOUNT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    flex: 0.7,
                    fieldLabel: 'Montant Total::',
                    fieldWidth: 300,
                    name: 'int_TOTAL_AMOUNT',
                    id: 'int_TOTAL_AMOUNT',
//                    renderer: amountformatbis,
                    fieldStyle: "color:blue;",
                    // margin: '0 5 15 15',
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
            // items: ['rech_prod', 'gridpanelID'], 
            items: [
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
//                                    enableKeyEvents: true,
                                    valueField: 'str_DESCRIPTION',
                                    pageSize: 20, //ajout la barre de pagination
                                    displayField: 'str_DESCRIPTION',
                                    typeAhead: true,
//                                    width: 450,
                                    flex: 2,
                                    minChars: 5,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un article par Nom ou Cip...',
                                    listConfig: {
                                        getInnerTpl: function() {
                                            return '<span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right; font-weight:600;"> ({int_NUMBER_AVAILABLE})</span>';
                                        }
                                    },
                                    listeners: {
                                        afterrender: function(field) { // a decommenter apres les tests
                                            field.focus();
                                            field.setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;'); //cas plusieurs attribut
                                        },
                                        keypress: function(field, e) {
                                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {
                                                /*if (field.getValue().length === 1) {
                                                 field.getStore().load();
                                                 }*/
                                            }
                                        },
                                        select: function(cmp) {
                                            var value = cmp.getValue();
                                            var record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné

                                            Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(record.get('lg_FAMILLE_ID'));
                                            cmp.setFieldStyle('border: 1px solid #C0C0C0; background: #FFFFFF;');
                                            //LaborexWorkFlow.DoAjaxGetStockArticle(record);

                                            Ext.getCmp('int_QUANTITE').focus(true, 100, function() {
                                                Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                            });
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
                                    regex: /[0-9.]/,
                                    enableKeyEvents: true,
                                    listeners: {
                                        specialKey: function(field, e, options) {
                                            if (e.getKey() === e.ENTER) {
                                                if (Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue() !== "" && Ext.getCmp('int_QUANTITE').getValue() > 0) {
                                                    Me.onbtnadd();

                                                } else {
                                                    // Ext.MessageBox.alert('Error Message', 'Verifiez votre saisie svp', funt);
                                                    Ext.MessageBox.show({
                                                        title: 'Message d\'erreur',
                                                        width: 320,
                                                        msg: "Verifiez votre saisie svp",
                                                        buttons: Ext.MessageBox.OK,
                                                        icon: Ext.MessageBox.WARNING,
                                                        fn: function(buttonId) {
                                                            if (buttonId === "ok") {
                                                                Ext.getCmp('int_QUANTITE').focus(false, 100, function() {
                                                                    this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                                                                });
                                                            }
                                                        }


                                                    });

                                                }
                                            }

                                        }
                                    },
                                }
                            ]
                        }
                    ]
                },
                {
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
                            margin: '0 0 10 0',
                            plugins: [this.cellEditing],
                            store: store_details,
                            height: 300,
                            columns: [{
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
                                    hidden: true,
                                    dataIndex: 'int_EAN13'
                                }, {
                                    text: 'Designation',
                                    flex: 2,
                                    sortable: true,
                                    dataIndex: 'str_FAMILLE_NAME'
                                }, {
                                    header: 'Quantit&eacute;',
                                    dataIndex: 'int_QUANTITY',
                                    flex: 1,MaskRe: /[0-9.]/,
                                    minValue: 1,
                                    editor: {
                                        xtype: 'numberfield',
                                        allowBlank: true,
                                        minValue: 1,
                                        maskRe: /[0-9.]/,
                                        selectOnFocus: true,
                                        hideTrigger: true
                                    }
                                }, {
                                    text: 'P.U',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_S',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'PAT',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_FAMILLE_PRICE',
                                    renderer: amountformat,
                                    align: 'center'
                                }, {
                                    text: 'Stock avant Retour.',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_QUANTITY_SERVED',
                                    renderer: amountformat,
                                    align: 'center'
                                }, {
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
                            tbar: [
                                int_TOTAL_PRODUCT, int_TOTAL_AMOUNT
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPage,
                                store: store_details,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this,
                                // selectionchange: this.onSelectionChange
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
                            flex: 1,
                            margin: '0 0 5 0',
                            id: 'str_COMMENTAIRE',
                            //anchor: '100%',
                            emptyText: 'Saisir un commentaire'
                        }
                    ]
                },
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
                            text: 'Terminer',
                            id: 'btn_loturer',
                            iconCls: 'icon-clear-group',
                            scope: this,
//                            hidden: true,
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

        if (ref == "0") {
            Ext.getCmp('str_COMMENTAIRE').setValue(this.getOdatasource().str_REPONSE_FRS);
        } else {
            Ext.getCmp('int_TOTAL_AMOUNT').setValue(this.getOdatasource().int_TOTAL_AMOUNT);
            Ext.getCmp('int_TOTAL_PRODUCT').setValue(this.getOdatasource().int_TOTAL_PRODUCT);
        }
        Ext.getCmp('gridpanelID').on('edit', function(editor, e) {
            //var int_QUANTITY_OLD = e.record.data.int_QUANTITY;
            /*  Ext.MessageBox.alert('Error Message', object.errors,
                 function() {
                 e.record.data.int_QUANTITY = e.record.data.int_QUANTITY;
                 plugin2.startEdit(e.rowIdx, e.colIdx);
                 });*/
           /* if (e.value < 1) {
                
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 320,
                    msg: "Verifiez votre saisie une quantit&eacute; sup&eacute;rieur &agrave; 0",
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function(buttonId) {
                        if (buttonId === "ok") {
                            e.record.data.int_QUANTITY = e.record.data.int_QUANTITY;
                            plugin2.startEdit(e.rowIdx, e.colIdx);
                        }
                    }


                });

            }*/

//            var plugin2 = Ext.getCmp('gridpanelID').getPlugin();
            Ext.Ajax.request({
                url: '../webservices/stockmanagement/retourdepot/ws_transaction.jsp?mode=update',
                params: {
                    lg_RETOURDEPOTDETAIL_ID: e.record.data.lg_AJUSTEMENTDETAIL_ID,
                    lg_RETOURDEPOT_ID: ref,
                    lg_FAMILLE_ID: e.record.data.lg_FAMILLE_ID,
                    int_QUANTITY: e.record.data.int_QUANTITY
                },
                success: function(response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    }
                    e.record.commit();
                    var OGrid = Ext.getCmp('gridpanelID');
                    OGrid.getStore().getProxy().url = url_services_data_detailsretourdepot + '?lg_RETOURDEPOT_ID=' + ref;
                    OGrid.getStore().reload();

                    Ext.getCmp('int_TOTAL_AMOUNT').setValue(object.int_TOTAL_AMOUNT);
                    Ext.getCmp('int_TOTAL_PRODUCT').setValue(object.int_TOTAL_PRODUCT);

                    Ext.getCmp('str_NAME').setValue("");
                    Ext.getCmp('int_QUANTITE').setValue(1);
                    /*if (OGrid.getStore().getCount() == 0) {
                     Ext.getCmp('btn_loturer').disable();
                     } else {
                     Ext.getCmp('btn_loturer').enable();
                     }*/

                }, failure: function(response)
                {
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        });
    },
    loadStore: function() {
        Ext.getCmp('gridpanelID').getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
        var OGrid = Ext.getCmp('gridpanelID');
        // alert("Nombre d'element " + OGrid.getStore().getCount());
        if (OGrid.getStore().getCount() > 0) {
            Ext.getCmp('btn_loturer').enable();
        } else {
            Ext.getCmp('btn_loturer').disable();
        }
    },
    onbtncloturer: function(button) {

        var internal_url = "";
        var str_COMMENTAIRE = "";
        if (Ext.getCmp('str_COMMENTAIRE').getValue() != null) {
            str_COMMENTAIRE = Ext.getCmp('str_COMMENTAIRE').getValue();
        }
        Ext.MessageBox.confirm('Message',
//                'Confirmer la cl&ocirc;ture du retour d&eacute;p&ocirct. Le stock de ces produits sera d&eacute;cr&eacute;ment&eacute;',
'Confirmer la cl&ocirc;ture du retour d&eacute;p&ocirct.',
                function(btn) {
                    if (btn === 'yes') {
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_retourdepot + "cloturer",
                            params: {
                                lg_RETOURDEPOT_ID: ref,
                                str_DESCRIPTION: str_COMMENTAIRE

                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.errors_code == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.confirm('Message',
                                            'Confirmer l\'impression',
                                            function(btn) {
                                                if (btn === 'yes') {
                                                    Me.onPdfAjustementClick();
                                                    return;
                                                } else {
                                                    Me.onbtnback();
                                                }
                                            });
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
                    }
                });
    },
    onbtnback: function() {
        var xtype = "";
        xtype = "retourdepot";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion de la ligne', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_retourdepot + 'deleteDetail',
                            params: {
                                lg_RETOURDEPOTDETAIL_ID: rec.get('lg_AJUSTEMENTDETAIL_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                Ext.getCmp('int_TOTAL_AMOUNT').setValue(object.int_TOTAL_AMOUNT);
                                Ext.getCmp('int_TOTAL_PRODUCT').setValue(object.int_TOTAL_PRODUCT);

                                grid.getStore().reload();
                                /*  if (grid.getStore().getCount() == 0) {
                                 Ext.getCmp('btn_loturer').disable();
                                 } else {
                                 Ext.getCmp('btn_loturer').enable();
                                 }*/

                            },
                            failure: function(response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                        return;
                    });
    },
    onPdfAjustementClick: function() {

        var linkUrl = url_services_pdf_fiche_retourdepot + '?lg_RETOURDEPOT_ID=' + ref;
        window.open(linkUrl);
        Me.onbtnback();
    },
    onSelectionChange: function(model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
    onbtnadd: function() {
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: url_services_transaction_retourdepot + 'create',
            params: {
                lg_FAMILLE_ID: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                lg_RETOURDEPOT_ID: ref,
                int_QUANTITY: Ext.getCmp('int_QUANTITE').getValue()
            },
            success: function(response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == 0) {
                    Ext.MessageBox.alert('Information', object.errors);
                    return;
                }
                ref = object.ref;
                var OGrid = Ext.getCmp('gridpanelID');
                OGrid.getStore().getProxy().url = url_services_data_detailsretourdepot + '?lg_RETOURDEPOT_ID=' + ref;
                OGrid.getStore().reload();

                Ext.getCmp('int_TOTAL_AMOUNT').setValue(object.int_TOTAL_AMOUNT);
                Ext.getCmp('int_TOTAL_PRODUCT').setValue(object.int_TOTAL_PRODUCT);


                Ext.getCmp('str_NAME').setValue("");
                Ext.getCmp('int_QUANTITE').setValue(1);
                Ext.getCmp('str_NAME').focus();
                Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                Ext.getCmp('int_QUANTITE').setFieldStyle('border: 1px solid #C0C0C0; background: #FFFFFF;');
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
//    onfiltercheck: function() {
//        var lg_FAMILLE_ID = Ext.getCmp('lg_FAMILLE_ID').getValue();
//        var int_name_size = lg_FAMILLE_ID.length;
//        var OGrid = Ext.getCmp('lg_FAMILLE_ID');
//
//        if (int_name_size > 3) {
//            OGrid.getStore().getProxy().url = url_services_data_typestock_famille + "?search_value=" + lg_FAMILLE_ID;
//            OGrid.getStore().reload();
//        }
//    }

});




