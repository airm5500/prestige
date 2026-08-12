var url_services_data_famille_select = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_detailsvente = '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=';
var url_services_data_typereglement = '../webservices/sm_user/typereglement/ws_data.jsp';



var url_services_data_detailsvente;
var int_TOTAL_PRODUIT;
var int_TOTAL_VENTE;
var Me;
var famille_id_search;
var famille_price_search;
var famille_qte_search;


var str_REF_VENTE;
var str_CAISSIER;
var int_NB_PROD_RECAP;
var int_TOTAL_VENTE_RECAP;
var int_AMOUNT_REMIS;

var Omode;
var ref;
var store_details;
var store_typereglement;

var int_total_final;
var int_nb_famille;
var old_qte;


var in_total_vente;
var int_total_product;


Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.preenregistrement.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addpreenregistrement',
    id: 'addpreenregistrementID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.TypeReglement'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    frame: true,
    title: 'Effectuer une vente',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {
        int_TOTAL_PRODUIT = 0;
        int_TOTAL_VENTE = 0;
        Me = this;
        famille_id_search = "";
        famille_price_search = 0;
        famille_qte_search = 0;
        store_details = "";
        store_typereglement = "";
        int_total_final = 0;
        int_nb_famille = 0;
        old_qte = 0;

        in_total_vente = 0;
        int_total_product = 0;
        str_REF_VENTE = "";
        str_CAISSIER = "";
        int_NB_PROD_RECAP = 0;
        int_TOTAL_VENTE_RECAP = 0;
        int_AMOUNT_REMIS = 0;


        //  this.setTitle("Ajout De Produit(s) Pour La Vente   ::  " + this.getOdatasource().str_REF);

        ref = this.getOdatasource().lg_PREENREGISTREMENT_ID;
        /*if (ref === undefined) {
            ref = null;
        }
        alert("ref   " + ref);*/
        url_services_data_detailsvente = '../webservices/sm_user/detailsvente/ws_data.jsp?lg_PREENREGISTREMENT_ID=' + ref;

        // url_services_data_detailsvente = '../webservices/sm_user/detailsvente/ws_data.jsp';


        //var OTUser = testextjs.app.getController('App').inituserName();
        //  alert("OTUser    "+testextjs.app.getController('App').inituserName());
        //var OTUser_Name = OTUser.get('str_FIRST_NAME') + " " + OTUser.get('str_LAST_NAME');
        // alert("OTUser_Name    "+OTUser_Name);

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famille_select,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });



        var itemsPerPage = 20;
        store_details = new Ext.data.Store({
            model: 'testextjs.model.DetailsVente',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detailsvente,
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



        str_REF_VENTE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Ref.Vente ::',
                    name: 'str_REF_VENTE',
                    id: 'str_REF_VENTE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: this.getOdatasource().str_REF

                });

        str_CAISSIER = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Caissier(e) :',
                    name: 'str_CAISSIER',
                    id: 'str_CAISSIER',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: Str_customer_name

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
                    renderer: amountformat,
                    align: 'right'

                });

        int_AMOUNT_REMIS = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Monnaie :',
                    name: 'int_AMOUNT_REMIS',
                    id: 'int_AMOUNT_REMIS',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: 0,
                    renderer: amountformat,
                    align: 'right'

                });










        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });



        var form = new Ext.form.Panel({
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
            items: ['rech_prod', 'gridpanelID'],
            items: [{
                    items: [{
                            xtype: 'fieldset',
                            title: 'Ajout Produit',
                            collapsible: true,
                            defaultType: 'textfield',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [{
                                    xtype: 'fieldcontainer',
                                    fieldLabel: 'Produit',
                                    layout: 'hbox',
                                    combineErrors: true,
                                    defaultType: 'textfield',
                                    defaults: {
                                        hideLabel: 'true'
                                    },
                                    items: [{
                                            name: 'CIP',
                                            id: 'str_CIP',
                                            fieldLabel: 'str_CIP',
                                            flex: 1,
                                            emptyText: 'CIP',
                                            maskRe: /[0-9.]/,
                                            allowBlank: false
                                        }, {
                                            name: 'EAN 13',
                                            id: 'str_EAN13',
                                            fieldLabel: 'str_EAN13',
                                            flex: 1,
                                            margins: '0 0 0 6',
                                            emptyText: 'EAN 13',
                                            maskRe: /[0-9.]/,
                                            allowBlank: false
                                        }, {
                                            xtype: 'combobox',
                                            flex: 1,
                                            margins: '0 0 0 6',
                                            fieldLabel: '',
                                            hideTrigger: true,
                                            displayField: 'str_NAME',
                                            id: 'str_NAME',
                                            minChars: 4,
                                            queryDelay: 250,
                                            store: store,
                                            queryParam: 'str_NAME',
                                            typeAhead: true,
                                            typeAheadDelay: 200,
                                            itemId: 'str_NAME',
                                            valueField: 'str_NAME',
                                            listeners: {
                                                select: function() {
                                                    Ext.getCmp('btn_add').enable();
                                                    var search_val = Ext.getCmp('str_NAME').getValue();
                                                    Me.getFamilleByName(search_val);
                                                },
                                                change: function() {
                                                    Me.onfiltercheck();
                                                    Ext.getCmp('str_CIP').setValue("");
                                                    Ext.getCmp('str_EAN13').setValue("");

                                                }

                                            }
                                        }, {
                                            text: 'Edit',
                                            margins: '0 0 0 6',
                                            //  flex: 1,
                                            xtype: 'button'
                                        }, {
                                            text: 'Ajouter',
                                            id: 'btn_add',
                                            margins: '0 0 0 6',
                                            //  flex: 1,
                                            xtype: 'button',
                                            handler: this.onbtnadd,
                                            disabled: true
                                        }]
                                }, {
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
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    id: 'gridpanelID',
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
                            text: 'Famille',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'str_FAMILLE_NAME'
                        }, {
                            text: 'CIP',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'str_CIP'
                        }, {
                            text: 'EAN',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'str_EAN13'
                        }, {
                            text: 'Prix',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'int_FAMILLE_PRICE',
                            renderer: amountformat,
                            align: 'right'
                        }, {
                            header: 'QD',
                            dataIndex: 'int_QUANTITY',
                            //  maskRe: /[0-9.]/,
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
                            dataIndex: 'int_QUANTITY_SERVED',
                            //maskRe: /[0-9.]/,
                            editor: {
                                xtype: 'numberfield',
                                allowBlank: false,
                                regex: /[0-9.]/
                            }
                        }, {
                            text: 'Remise',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'lastChange'
                        }, {
                            text: 'S',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'rating'
                        }, {
                            text: 'T',
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
                }, {
                    xtype: 'fieldset',
                    labelAlign: 'right',
                    title: 'Reglement',
                    layout: 'vbox',
                    collapsible: true,
                    defaultType: 'textfield',
                    //layout: 'anchor',
                    defaults: {
                        anchor: '40%'
                    },
                    items: [
                        str_REF_VENTE,
                        str_CAISSIER,
                        int_NB_PROD_RECAP,
                        int_TOTAL_VENTE_RECAP,
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Reglement',
                            name: 'lg_TYPE_REGLEMENT_ID',
                            id: 'lg_TYPE_REGLEMENT_ID',
                            store: store_typereglement,
                            valueField: 'lg_TYPE_REGLEMENT_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un type de reglement...'
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
                                change: function() {
                                    var int_total = Number(Ext.getCmp('int_TOTAL_VENTE_RECAP').getValue());
                                    var int_montant_recu = Number(Ext.getCmp('int_AMOUNT_RECU').getValue());
                                    var int_monnaie = Me.DisplayMonnaie(int_total, int_montant_recu);
                                    Ext.getCmp('int_AMOUNT_REMIS').setValue(int_monnaie);


                                }

                            }
                        }, int_AMOUNT_REMIS,
                        {
                            text: 'Cloturer',
                            id: 'btn_loturer',
                            margin: '15 15 15 190',
                            //  flex: 1,
                            xtype: 'button',
                            handler: this.onbtnadd
                        }
                    ]
                }]
        });


        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
 var grid = Ext.getCmp('gridpanelID');
        var all = Ext.getCmp('selectAll');

        grid.getStore().on(
                "load", function() {


                    var CODEstore = grid.getStore();
                    if (listProductSelected.length > 0) {
                        var record;
                        Ext.each(listProductSelected, function(lg, index) {
                            CODEstore.each(function(r, id) {
                                record = CODEstore.findRecord('lg_PREENREGISTREMENT_DETAIL_ID', lg);
                                if (record != null) {

                                    record.set('isChecked', 'true');
                                }


                                // alert (r.get('lg_DOSSIER_FACTURE')) ;
                            });

                        });
                        if (record != null) {
                            grid.reconfigure(grid.getStore());
                        }

                    }
                    if (all.getValue()) {
                        CODEstore.each(function(r, id) {
                            r.set('isChecked', 'true');

                        });
                        grid.reconfigure(grid.getStore());
                    }

                }

        );

        Ext.getCmp('gridpanelID').on('edit', function(editor, e) {

            var price = Number(e.record.data.int_FAMILLE_PRICE);
            var qte = Number(e.record.data.int_QUANTITY);
            var int_total_temp = Me.DisplayTotal(price, qte);
            //var totaldetail = Number(int_total_temp);



            Ext.Ajax.request({
                url: '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=create',
                params: {
                    lg_PREENREGISTREMENT_DETAIL_ID: e.record.data.lg_PREENREGISTREMENT_DETAIL_ID,
                    lg_PREENREGISTREMENT_ID: ref,
                    lg_FAMILLE_ID: e.record.data.lg_FAMILLE_ID,
                    int_QUANTITY: e.record.data.int_QUANTITY,
                    int_QUANTITY_SERVED: e.record.data.int_QUANTITY,
                    int_PRICE_DETAIL: int_total_temp
                },
                success: function(response)
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
                    Ext.getCmp('str_CIP').setValue("");
                    Ext.getCmp('str_EAN13').setValue("");
                    Ext.getCmp('str_NAME').setValue("");

                    in_total_vente = Number(object.total_vente);
                    Ext.getCmp('int_TOTAL_VENTE').setValue(in_total_vente);
                    Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(in_total_vente);

                    int_total_product = Number(object.int_total_product);
                    Ext.getCmp('int_TOTAL_PRODUIT').setValue(int_total_product + '  Produit(s)');
                    Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');

                },
                failure: function(response)
                {
                    console.log("Bug " + response.responseText);
                    alert(response.responseText);
                }
            });
        });

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 1050,
            Height: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function() {
                        win.close();
                    }
                }]
        });

    },
    
    
    
   /* loadStore: function() {
        Ext.getCmp('gridpanelID').getStore().load({
            callback: this.onStoreLoad
        });

    },*/
    onStoreLoad: function() {

    },
    checkIfGridIsEmpty: function() {
        var gridTotalCount = Ext.getCmp('gridpanelID').getStore().getTotalCount();
        return gridTotalCount;
    },
    getFamilleByName: function(str_famille_name) {

        var url_services_data_famille_select_search = url_services_data_famille_select + "?search_value=" + str_famille_name;

        Ext.Ajax.request({
            url: url_services_data_famille_select_search,
            params: {
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                var OFamille = object[0];
                var str_CIP = OFamille.str_CIP;
                var str_EAN13 = OFamille.str_EAN13;
                Ext.getCmp('str_CIP').setValue(str_CIP);
                Ext.getCmp('str_EAN13').setValue(str_EAN13);
                famille_id_search = OFamille.lg_FAMILLE_ID;
                famille_price_search = Number(OFamille.int_PRICE);
                famille_qte_search = 1;

                url_services_data_famille_select_search = url_services_data_famille_select;

            },
            failure: function(response)
            {
                console.log("Bug " + response.responseText);
                alert(response.responseText);
            }
        });

    },
    onfiltercheck: function() {
        var str_name = Ext.getCmp('str_NAME').getValue();
        var int_name_size = str_name.length;
        if (int_name_size < 4) {
            Ext.getCmp('btn_add').disable();


        }

    },
    DisplayTotal: function(int_price, int_qte) {
        var TotalAmount_final = 0;
        var TotalAmount_temp = int_qte * int_price;
        var TotalAmount = Number(TotalAmount_temp);
        TotalAmount_final = this.amountformat(TotalAmount);
        return TotalAmount_final + " CFA";
    },
    DisplayMonnaie: function(int_total, int_amount_recu) {
        var TotalMonnaie = 0;
        if (int_total <= int_amount_recu) {
            var TotalMonnaie_temp = int_amount_recu - int_total;
            TotalMonnaie = Number(TotalMonnaie_temp);
            return TotalMonnaie;
        } else {
            //  Ext.MessageBox.alert('Error Message', 'Desolez le Montant Recu ' + int_amount_recu + '  est inferieur au total de ' + int_total);
            return null;
        }
        return TotalMonnaie + " CFA";
    },
    onbtnadd: function() {
        var internal_url = "";

        Ext.Ajax.request({
            url: '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=create',
            params: {
                lg_FAMILLE_ID: famille_id_search,
                lg_PREENREGISTREMENT_ID: ref,
                lg_PREENREGISTREMENT_DETAIL_ID: null,
                int_PRICE_DETAIL: famille_price_search,
                int_QUANTITY: famille_qte_search,
                int_QUANTITY_SERVED: famille_qte_search

            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                var OGrid = Ext.getCmp('gridpanelID');
                // alert("before load");
                OGrid.getStore().reload();
                //alert("after load");
                //ref = object.lg_PREENREGISTREMENT_ID;
                // aler("ref de add  "+ref);
                Ext.getCmp('str_CIP').setValue("");
                Ext.getCmp('str_EAN13').setValue("");
                Ext.getCmp('str_NAME').setValue("");

                in_total_vente = Number(object.total_vente);
                Ext.getCmp('int_TOTAL_VENTE').setValue(in_total_vente);
                Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(in_total_vente);

                int_total_product = Number(object.int_total_product);
                Ext.getCmp('int_TOTAL_PRODUIT').setValue(int_total_product + '  Produit(s)');
                Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');
            },
            failure: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });


    },
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion',
                function(btn) {
                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_detailsvente + 'delete',
                            params: {
                                lg_PREENREGISTREMENT_DETAIL_ID: rec.get('lg_PREENREGISTREMENT_DETAIL_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();

                                in_total_vente = Number(object.total_vente);
                                Ext.getCmp('int_TOTAL_VENTE').setValue(in_total_vente);
                                Ext.getCmp('int_TOTAL_VENTE_RECAP').setValue(in_total_vente);

                                int_total_product = Number(object.int_total_product);
                                Ext.getCmp('int_TOTAL_PRODUIT').setValue(int_total_product + '  Produit(s)');
                                Ext.getCmp('int_NB_PROD_RECAP').setValue(int_total_product + '  Produit(s)');

                            },
                            failure: function(response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    },
    changeRenderer: function(val) {
        if (val > 0) {
            return '<span style="color:green;">' + val + '</span>';
        } else if (val < 0) {
            return '<span style="color:red;">' + val + '</span>';
        }
        return val;
    },
    pctChangeRenderer: function(val) {
        if (val > 0) {
            return '<span style="color:green;">' + val + '%</span>';
        } else if (val < 0) {
            return '<span style="color:red;">' + val + '%</span>';
        }
        return val;
    },
    renderRating: function(val) {
        switch (val) {
            case 0:
                return 'A';
            case 1:
                return 'B';
            case 2:
                return 'C';
        }
    },
    onSelectionChange: function(model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    }

});