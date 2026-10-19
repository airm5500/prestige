var url_services_data_depot_other = '../webservices/configmanagement/emplacement/ws_data_other.jsp';
var url_services_data_famille_initial = '../webservices/sm_user/famille/ws_data_initial.jsp';
var url_services_data_typevente_depot = '../webservices/stockmanagement/detailsdepot/ws_data_type_vente.jsp';
var url_services_data_detailsdepot = '../webservices/stockmanagement/detailsdepot/ws_data.jsp';
var url_services_transaction_detailsdepot = '../webservices/stockmanagement/detailsdepot/ws_transaction.jsp?mode=';

var Me;
var Omode;
var ref = "0";

var ref_vente = "";
var int_monnaie = 0;
var in_total_vente = 0;


Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.stockmanagement.dodepot.action.add', {
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
        titre: 'Vente depot',
        plain: true,
        maximizable: true,
//        tools: [{type: "pin"}],
        closable: false,
        nameintern: ''
    },
    xtype: 'addventedepot',
    id: 'addventedepotID',
    frame: true,
    title: 'Effectuer une vente depot',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {

        Me = this;
        this.title = this.getTitre();

        var itemsPerPage = 20;

        //declaration des displayfields
        var lg_TYPE_VENTE_ID;

        var int_TOTAL_REMISE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield', fieldLabel: 'Remise :',
                    name: 'int_TOTAL_REMISE',
                    id: 'int_TOTAL_REMISE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 10',
                    value: 0,
                    align: 'right'

                });

        var str_REF_VENTE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Ref.Vente :: ',
                    name: 'str_REF_VENTE',
                    id: 'str_REF_VENTE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: ref_vente

                });

        var int_NB_PROD_RECAP = new Ext.form.field.Display(
                {
                    xtype: 'displayfield', //allowBlank: false,
                    fieldLabel: 'Total.Produit :',
                    name: 'int_NB_PROD_RECAP',
                    id: 'int_NB_PROD_RECAP',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: 0

                });

        var int_TOTAL_VENTE_RECAP = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Total.Vente: ',
                    name: 'int_TOTAL_VENTE_RECAP',
                    id: 'int_TOTAL_VENTE_RECAP',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: 0,
//                    renderer: amountformat,
                    align: 'right'

                });

        var int_AMOUNT_REMIS = new Ext.form.field.Display(
                {
                    xtype: 'displayfield', //allowBlank: false,
                    fieldLabel: 'Monnaie :',
                    name: 'int_AMOUNT_REMIS',
                    id: 'int_AMOUNT_REMIS',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 15',
                    value: 0,
//                    renderer: amountformat,
                    align: 'right'

                });

        var int_REEL_RESTE = new Ext.form.field.Hidden(
                {
                    xtype: 'hiddenfield',
                    name: 'int_REEL_RESTE',
                    id: 'int_REEL_RESTE',
                    value: 0
                });
        //fin declaration des displayfields




        var storedepot = new Ext.data.Store({
            model: 'testextjs.model.Emplacement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax', url: url_services_data_depot_other + "?str_TYPE=newdepot",
//                url: ,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });

        var store_famille = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famille_initial,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var store_details = new Ext.data.Store({
            model: 'testextjs.model.DetailsVente',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detailsdepot + "?lg_PREENREGISTREMENT_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_typevente = new Ext.data.Store({
            model: 'testextjs.model.TypeVente',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typevente_depot,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: 1100,
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
            items: ['rech_prod', 'gridpanelID'], items: [
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
//                            fieldLabel: 'D&eacute;p&ocirc;t',
                            layout: 'hbox',
                            combineErrors: true,
                            defaultType: 'textfield',
                            defaults: {
//                                hideLabel: 'true'
                            },
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Nom depot',
                                    allowBlank: false,
                                    name: 'lgEMPLACEMENTID',
                                    margins: '0 10 0 10',
                                    id: 'lgEMPLACEMENTID',
                                    store: storedepot,
                                    valueField: 'lg_EMPLACEMENT_ID',
                                    displayField: 'str_NAME',
                                    typeAhead: true,
                                    width: 350,
                                    queryMode: 'remote',
//                                    flex: 1,
                                    emptyText: 'Choisir un depot...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();
                                            if (value === "0") {
                                                Me.getEmplacementForm();

                                            }
                                        }

                                    }
                                },
                                int_TOTAL_REMISE,
                                {
                                    fieldLabel: 'Taux remise',
                                    emptyText: 'Taux remise',
                                    name: 'int_TAUX_REMISE',
                                    id: 'int_TAUX_REMISE',
                                    xtype: 'numberfield',
                                    value: '10',
                                    maxValue: 15,
                                    minValue: 0,
                                    //flex: 0.5,
                                    allowBlank: false,
                                    regex: /[0-9.]/
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Type depot',
                                    name: 'lg_TYPE_VENTE_ID',
                                    id: 'lg_TYPE_VENTE_ID',
                                    store: store_typevente,
                                    valueField: 'lg_TYPE_VENTE_ID',
                                    displayField: 'str_NAME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    margins: '0 5 0 10',
                                    allowBlank: false,
                                    emptyText: 'Choisir un type de vente...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();
                                            lg_TYPE_VENTE_ID = value;

                                            if (value === "5") {
                                                Ext.getCmp('int_TAUX_REMISE').setValue(0);
                                                Ext.getCmp('int_TAUX_REMISE').disable();

                                                Ext.getCmp('reglementID').show();

                                                Ext.getCmp('btn_loturer').show();
                                                Ext.getCmp('btn_loturer').enable();

                                            } else if (value === "4") {
                                                Ext.getCmp('int_TAUX_REMISE').setValue(10);
                                                Ext.getCmp('int_TAUX_REMISE').enable();

                                                Ext.getCmp('int_AMOUNT_RECU').setValue(0);
                                                Ext.getCmp('reglementID').show();
                                                Ext.getCmp('btn_loturer').show();

                                            }
                                            changetypevente(lg_TYPE_VENTE_ID);
                                        }

                                    }
                                }]
                        }
                    ]
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
                                    name: 'lgFAMILLE_ID',
                                    id: 'lg_FAMILLE_ID',
                                    store: store_famille,
                                    margins: '0 10 5 10',
                                    valueField: 'str_DESCRIPTION',
                                    pageSize: 20, //ajout la barre de pagination
                                    displayField: 'str_DESCRIPTION',
                                    typeAhead: true,
                                    width: 350,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un article...',
                                    listeners: {
                                        change: function () {
                                            onfiltercheck();
                                        }

                                    }
                                },
                                {
                                    fieldLabel: 'Quantit&eacute;',
                                    emptyText: 'Quantite',
                                    name: 'int_QUANTITE',
                                    id: 'int_QUANTITE',
                                    xtype: 'numberfield',
                                    margin: '0 15 0 10',
                                    minValue: 1,
                                    value: 1,
                                    allowBlank: false,
                                    regex: /[0-9.]/,
                                    listeners: {
                                        'render': function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    if (Ext.getCmp('lgEMPLACEMENTID').getValue() != "" && Ext.getCmp('lg_TYPE_VENTE_ID').getValue() != "" && Ext.getCmp('lg_FAMILLE_ID').getValue() != "") {
                                                        onbtnadd();
                                                    } else {
                                                        Ext.MessageBox.alert('Error Message', 'Verifiez votre selection svp');
                                                        return;
                                                    }

                                                }
                                            });
                                        }
                                    }
                                }]
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
                            margin: '0 0 5 0',
                            plugins: [this.cellEditing],
                            store: store_details,
                            height: 200,
                            columns: [{
                                    text: 'Details Vente Id',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_PREENREGISTREMENT_DETAIL_ID',
                                    id: 'lg_PREENREGISTREMENT_DETAIL_ID'
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
                                        regex: /[0-9.]/
                                    }
                                }, {
                                    text: 'QS',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_QUANTITY_SERVED'
                                }, {
                                    text: 'P.U',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_FAMILLE_PRICE',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Px.Ref',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_FAMILLE_PRICE',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'S',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_S'
                                }, {
                                    text: 'T',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_T'


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
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_details,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this,
                                selectionchange: this.onSelectionChange
                            }
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: 'Reglement',
                    id: 'reglementID',
                    hidden: true,
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
                            items: [
                                str_REF_VENTE,
                                int_NB_PROD_RECAP,
                                int_TOTAL_VENTE_RECAP
                            ]
                        },
                        {
                            xtype: 'fieldcontainer',
                            layout: 'hbox',
                            combineErrors: true,
                            defaultType: 'textfield',
                            items: [
                                int_REEL_RESTE,
                                {
                                    name: 'int_AMOUNT_RECU',
                                    id: 'int_AMOUNT_RECU',
                                    fieldLabel: 'Montant Recu',
//                                            flex: 1,
                                    emptyText: 'Montant Recu',
                                    maskRe: /[0-9.]/,
                                    allowBlank: false,
                                    value: 0,
                                    listeners: {
                                        change: function () {

                                            var int_total = 0;
                                            var int_montant_recu = (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()));

                                            int_monnaie = Number(Me.DisplayMonnaie(in_total_vente, int_montant_recu));
                                            //   alert("int_montant_recu=" + int_montant_recu + "   in_total_vente=" + in_total_vente + " Difference " + int_monnaie);



                                            Ext.getCmp('int_AMOUNT_REMIS').setValue(int_monnaie + ' CFA');
                                            if (Ext.getCmp('int_REEL_RESTE').getValue() < 0) {
                                                Ext.getCmp('btn_loturer').disable();
                                            } else {
                                                Ext.getCmp('btn_loturer').enable();
                                            }


                                        }

                                    }
                                },
                                int_AMOUNT_REMIS
//                                ,
//                                {
//                                    allowBlank: false,
//                                    xtype: 'checkbox',
//                                    fieldLabel: 'Ne pas payer au comptant',
//                                    emptyText: 'Ne pas payer au comptant',
//                                    name: 'bool_IsACCOUNT',
//                                    width: 400,
//                                    id: 'bool_IsACCOUNT',
//                                    listeners: {
//                                        change: function (checkbox, newValue, oldValue, eOpts) {
//                                            if (newValue) {
//                                                Ext.getCmp('int_AMOUNT_RECU').hide();
//                                                Ext.getCmp('int_AMOUNT_RECU').setValue(0);
//                                                Ext.getCmp('int_AMOUNT_REMIS').setValue(0);
//
//                                            } else {
//                                                Ext.getCmp('int_AMOUNT_RECU').show();
//                                                Ext.getCmp('int_AMOUNT_RECU').setValue(0);
//                                            }
//                                        }
//                                    }
//                                }
                            ]
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
                            text: 'Terminer vente',
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


        Ext.getCmp('gridpanelID').on('edit', function (editor, e) {

//            var price = Number(e.record.data.int_FAMILLE_PRICE);
//            var qte = Number(e.record.data.int_QUANTITY);
            // var int_total_temp = Me.DisplayTotal(price, qte);
            // alert("total : "+(price*qte));

            Ext.Ajax.request({
                url: '../webservices/stockmanagement/detailsdepot/ws_transaction.jsp?mode=update',
                params: {
                    lg_PREENREGISTREMENT_DETAIL_ID: e.record.data.lg_PREENREGISTREMENT_DETAIL_ID,
                    lg_PREENREGISTREMENT_ID: ref,
                    lg_FAMILLE_ID: e.record.data.lg_FAMILLE_ID,
                    int_QUANTITY: e.record.data.int_QUANTITY,
                    int_QUANTITY_SERVED: e.record.data.int_QUANTITY,
                    int_PRICE_DETAIL: e.record.data.int_FAMILLE_PRICE,
                    int_TAUX_REMISE: Ext.getCmp('int_TAUX_REMISE').getValue()
                },
                success: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success === 0) {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    }
                    e.record.commit();
                    var OGrid = Ext.getCmp('gridpanelID');

                    OGrid.getStore().getProxy().url = url_services_data_detailsdepot + '?lg_PREENREGISTREMENT_ID=' + ref;
                    OGrid.getStore().reload();

                    in_total_vente = Number(object.total_vente);
                    Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(in_total_vente + '  CFA');
                    Ext.getCmp('int_TOTAL_REMISE').setValue(object.dbl_total_remise + '  CFA');

                    int_total_product = Number(object.int_total_product);
                    Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');

                    Ext.getCmp('lg_FAMILLE_ID').setValue("");
                    Ext.getCmp('int_QUANTITE').setValue(1);

                    if (int_total_product == 0) {
                        Ext.getCmp('btn_loturer').disable();
                    } else {
                        Ext.getCmp('btn_loturer').enable();
                    }

                }, failure: function (response)
                {
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        });


    }, loadStore: function () {
        Ext.getCmp('gridpanelID').getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {

    },
    getEmplacementForm: function () {
        new testextjs.view.configmanagement.emplacement.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter nouveau depot",
            type: "depot"
        });
    },
    DisplayTotal: function (int_price, int_qte) {
        var TotalAmount_final = 0;
        var TotalAmount_temp = int_qte * int_price;
        var TotalAmount = Number(TotalAmount_temp);
        return TotalAmount;
    },
    DisplayMonnaie: function (int_total, int_amount_recu) {
        var TotalMonnaie = 0;
        var TotalMonnaie_temp = 0;
        Ext.getCmp('int_REEL_RESTE').setValue(int_amount_recu - int_total);
        if (int_total <= int_amount_recu) {
            TotalMonnaie_temp = int_amount_recu - int_total;
            TotalMonnaie = Number(TotalMonnaie_temp);
            return TotalMonnaie;
        } else {
            return null;
        }

        return TotalMonnaie;
    },
    onbtncloturer: function () {

        var internal_url = "";
        var task = "";

//        alert("in_total_vente "+ in_total_vente + " ref " + ref 
//                + " int_AMOUNT_RECU "+ Number(Ext.getCmp('int_AMOUNT_RECU').getValue().replace(".", "")) 
//                + " int_monnaie " + int_monnaie)
//        return;

        Ext.Ajax.request({
            url: '../webservices/stockmanagement/detailsdepot/ws_transaction.jsp?mode=cloturer',
            params: {
                //   int_TOTAL_VENTE_RECAP: in_total_vente,
                lg_PREENREGISTREMENT_ID: ref,
                //lg_TYPE_REGLEMENT_ID: lg_TYPE_REGLEMENT_ID,
                int_AMOUNT_RECU: Number(Ext.getCmp('int_AMOUNT_RECU').getValue().replace(".", "")),
                int_AMOUNT_REMIS: int_monnaie,
                lg_COMPTE_CLIENT_ID: Ext.getCmp('lgEMPLACEMENTID').getValue(),
                lg_TYPE_VENTE_ID: Ext.getCmp('lg_TYPE_VENTE_ID').getValue(),
                int_TAUX_REMISE: Ext.getCmp('int_TAUX_REMISE').getValue(),
                int_TOTAL_REMISE: Ext.getCmp('int_TOTAL_REMISE').getValue()/*,
                 // lg_TIERS_PAYANT_ID: tp_id*/
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);



                var OGrid = Ext.getCmp('gridpanelID');
                OGrid.getStore().reload();


                in_total_vente = Number(object.total_vente);
//                Ext.getCmp('int_TOTAL_VENTE').setValue(0);
//                Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(0);
//
//                int_total_product = Number(object.int_total_product);
//                Ext.getCmp('int_TOTAL_PRODUIT').setValue(0 + '  Produit(s)');
//                Ext.getCmp('int_NB_PROD_RECAP').setValue(0 + '  Produit(s)');



                Ext.MessageBox.confirm('Message',
                        'Confirmer l\'impression du ticket',
                        function (btn) {
                            if (btn === 'yes') {

                                Me.onPdfClick();

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
    onbtnback: function () {
        var xtype = "";
        xtype = "ventedepot";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);

                        Ext.Ajax.request({
                            url: url_services_transaction_detailsdepot + 'delete',
                            params: {
                                lg_PREENREGISTREMENT_DETAIL_ID: rec.get('lg_PREENREGISTREMENT_DETAIL_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();

                                in_total_vente = Number(object.total_vente);

                                // alert("in_total_vente "+in_total_vente);

                                Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(in_total_vente + '  CFA');
                                Ext.getCmp('int_TOTAL_REMISE').setValue(object.dbl_total_remise + '  CFA');

                                int_total_product = Number(object.int_total_product);
                                Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');

                                Ext.getCmp('lg_FAMILLE_ID').setValue("");
                                Ext.getCmp('int_QUANTITE').setValue(1);

                                if (int_total_product == 0) {
                                    Ext.getCmp('btn_loturer').disable();
                                } else {
                                    Ext.getCmp('btn_loturer').enable();
                                }

                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);

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

    }

});


function changetypevente(lg_TYPE_VENTE_ID) {

    var internal_url = "";

    Ext.Ajax.request({
        url: '../webservices/stockmanagement/detailsdepot/ws_transaction.jsp?mode=changetypevente',
        params: {
            lg_PREENREGISTREMENT_ID: ref,
            lg_TYPE_VENTE_ID: lg_TYPE_VENTE_ID,
            int_TAUX_REMISE: Ext.getCmp('int_TAUX_REMISE').getValue()
        },
        success: function (response)
        {
            var object = Ext.JSON.decode(response.responseText, false);
            if (object.success === 0) {
                Ext.MessageBox.alert('Error Message', object.errors);
                return;
            }

            in_total_vente = Number(object.total_vente);

            Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(in_total_vente + '  CFA');
            Ext.getCmp('int_TOTAL_REMISE').setValue(object.dbl_total_remise + '  CFA');

            int_total_product = Number(object.int_total_product);
            Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');

            if (int_total_product == 0) {
                Ext.getCmp('btn_loturer').disable();
            } else {
                Ext.getCmp('btn_loturer').enable();
            }


        },
        failure: function (response)
        {
            var object = Ext.JSON.decode(response.responseText, false);
            console.log("Bug " + response.responseText);
            Ext.MessageBox.alert('Error Message', response.responseText);
        }
    });

}

function onfiltercheck() {
    var lg_FAMILLE_ID = Ext.getCmp('lg_FAMILLE_ID').getValue();
    var int_name_size = lg_FAMILLE_ID.length;
    var OGrid = Ext.getCmp('lg_FAMILLE_ID');

    if (int_name_size > 3) {
        OGrid.getStore().getProxy().url = url_services_data_famille_initial + "?search_value=" + lg_FAMILLE_ID;
        OGrid.getStore().reload();
    }
}

function onbtnadd() {
    var internal_url = "";

    var nature = "3";
    var int_TAUX_REMISE = Ext.getCmp('int_TAUX_REMISE').getValue();

    if (int_TAUX_REMISE > 15) {
        Ext.MessageBox.alert('Anomalie', "Le taux de remise ne doit pas depasser 15%");
        return;
    }

    Ext.Ajax.request({
        url: url_services_transaction_detailsdepot + 'create',
        params: {
            lg_NATURE_VENTE_ID: nature,
//                lg_FAMILLE_ID: famille_id_search,
            lg_FAMILLE_ID: Ext.getCmp('lg_FAMILLE_ID').getValue(),
            lg_PREENREGISTREMENT_ID: ref,
            lg_PREENREGISTREMENT_DETAIL_ID: null,
            lg_TYPE_VENTE_ID: Ext.getCmp('lg_TYPE_VENTE_ID').getValue(),
            lgEMPLACEMENTID: Ext.getCmp('lgEMPLACEMENTID').getValue(),
//                int_PRICE_DETAIL: famille_price_search,
            int_QUANTITY: Ext.getCmp('int_QUANTITE').getValue(),
            int_QUANTITY_SERVED: Ext.getCmp('int_QUANTITE').getValue(),
            int_TAUX_REMISE: int_TAUX_REMISE

        },
        success: function (response)
        {
            var object = Ext.JSON.decode(response.responseText, false);
            if (object.errors_code == 0) {
                Ext.MessageBox.alert('Information', object.errors);
                return;
            }
            ref = object.ref;
//                alert("ref " + ref);
            //Me.setTitleFrame(object.ref);
            Ext.getCmp('str_REF_VENTE').setValue(object.ref_vente);
            var OGrid = Ext.getCmp('gridpanelID');

            OGrid.getStore().getProxy().url = url_services_data_detailsdepot + '?lg_PREENREGISTREMENT_ID=' + ref;
            OGrid.getStore().reload();

            in_total_vente = Number(object.total_vente);

            // int_total_formated = Ext.util.Format.number(in_total_vente, '0,000.');

//                Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(int_total_formated + '  CFA');
            Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(in_total_vente + '  CFA');
            Ext.getCmp('int_TOTAL_REMISE').setValue(object.dbl_total_remise + '  CFA');

            int_total_product = Number(object.int_total_product);
            Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');

            Ext.getCmp('lg_FAMILLE_ID').setValue("");
            Ext.getCmp('int_QUANTITE').setValue(1);

            if (int_total_product == 0) {
                Ext.getCmp('btn_loturer').disable();
            } else {
                Ext.getCmp('btn_loturer').enable();
            }


        },
        failure: function (response)
        {
            var object = Ext.JSON.decode(response.responseText, false);
            console.log("Bug " + response.responseText);
            Ext.MessageBox.alert('Error Message', response.responseText);
        }
    });


}
