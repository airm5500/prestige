/* global Ext */

var url_services_data_diffclient = '../webservices/sm_user/diffclient/ws_data.jsp';
var url_ws_generate_reglement_pdf = '../webservices/sm_user/reglement/ws_generate_reglement_pdf.jsp';
var url_services_transaction_diffclient = '../webservices/sm_user/diffclient/ws_transaction.jsp?mode=';
var url_services_data_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_search_data.jsp';


var Me;
var view_title;
var customer_id;
var Ovalue_addclt;
var str_task_diff;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.reglement.ReglementManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'reglementmanager',
    id: 'reglementmanagerID',
    title: 'Liste Des R&eacute;glements',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Reglement',
        'testextjs.model.TiersPayant',
        'testextjs.view.sm_user.reglement.action.ReglementDetails',
        'testextjs.view.sm_user.reglement.action.DoReglement',
        'testextjs.view.sm_user.reglement.action.displayBordereau',
        'testextjs.view.sm_user.reglement.action.displayDossier',
        'Ext.ux.ProgressBarPager',
    ],
    frame: true,
    initComponent: function () {
        var url_services_data_reglement = '../webservices/sm_user/reglement/ws_data.jsp';
        var url_services_data_reglement_transact = '../webservices/sm_user/diffclient/ws_transaction.jsp?mode=';

        var searchstore = Ext.create('testextjs.store.Statistics.TiersPayans');
        Ovalue_addclt = oclient_idval;

        // alert(" *** Ovalue_addclt *** " + Ovalue_addclt);

        Me = this;
        // this.title = this.getTitre();
        view_title = this.title;

        // alert("view_title  " + view_title);
        //alert("view_title  " + view_title + "this.getOdatasource().lg_CLIENT_ID  " + this.getOdatasource().lg_CLIENT_ID);
        if (view_title === "by_addclt") {
            customer_id = Ovalue_addclt;
            str_task_diff = "VENTE";
        } else if (view_title === "by_customer") {
            customer_id = this.getOdatasource().lg_TIERS_PAYANT_ID;
            str_task_diff = "VENTE";
        } else {

        }
        // alert(" *** customer_id *** " + customer_id);

        if (customer_id === undefined) {
            customer_id = "ALL";
        }
        url_services_data_diffclient = url_services_data_diffclient + "?str_BENEFICIAIRE=" + customer_id + "&lg_TYPE_ECART_MVT=1&str_task=" + str_task_diff;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Reglement',
            pageSize: itemsPerPage,
            groupField: 'str_ORGANISME',
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_reglement,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });

        Ext.apply(this, {
            width: '98%',
//            cls: 'custompanel',
            height: valheight,
            id: 'Grid_Reglement_ID',
            features: [
                {
                    ftype: 'groupingsummary',
//                    groupHeaderTpl: "{str_ORGANISME}",
                    showSummaryRow: true
                }],
            //  plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_DOSSIER_REGLEMENT_ID',
                    dataIndex: 'lg_DOSSIER_REGLEMENT_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Organisme',
                    dataIndex: 'str_ORGANISME',
                    flex: 1.5,
                    summaryType: "count",
                    summaryRenderer: function (value) {
                        return "<b>Nombre de R&egrave;glements </b><span style='color:blue;font-weight:600;'>" + value + "</span>";

                    }

                }
                , {
                    header: 'Code Facture',
                    dataIndex: 'CODE_FACTURE',
                    flex: 1

                }


                , {
                    header: 'Mode R&eacute;glement',
                    dataIndex: 'str_MODE_REGLEMENT',
                    flex: 1

                }, {
                    header: 'Montant.Regl',
                    dataIndex: 'str_MONTANT',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1,
                    summaryType: "sum",
                    summaryRenderer: function (value) {
                        return "<b>Total </b>:  <span style='color:blue;font-weight:600;'>" + Ext.util.Format.number(Ext.Number.toFixed(value, 0), '0,000.') + "  FCFA</span> ";
                    }
                }
                , {
                    header: 'Montant.ATT',
                    dataIndex: 'MONTANT_ATT',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1

                }


                , {
                    header: 'Date r&eacute;glement',
                    dataIndex: 'dt_DATE_REGLEMENT',
                    flex: 1
                },
                {
                    header: 'Heure r&eacute;glement',
                    dataIndex: 'HEURE_REGLEMENT',
                    flex: 0.5
                },
                {
                    header: 'Op&eacute;rateur',
                    dataIndex: 'OPERATEUR',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/application_view_list.png',
                            tooltip: 'Voir le detail du reglement',
                            scope: this,
                            handler: this.onManageDetailsClick
                        }
                    ]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Re-imprimer le ticket',
                            scope: this,
                            handler: this.onPdfClickTicket

                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    text: 'Faire R&eacute;glement',
                    tooltip: 'Faire R&eacute;glement',
                    scope: this,
                    hidden: true,
                    handler: this.onDoreglement
                }, {
                    xtype: 'textfield',
                    id: 're_search',

                    width: 150,
                    emptyText: 'Rech',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {

                                    var re_search = Ext.getCmp('re_search').getValue();
                                    var OGrid = Ext.getCmp('Grid_Reglement_ID'), lg_TIERS_PAYANT_ID = '';

                                    var dt_fin = '', dt_debut = '';
                                    if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() != null && Ext.getCmp('datefin').getValue() != "") {
                                        lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                                    }

                                    if (Ext.getCmp('datefin').getSubmitValue() != null && Ext.getCmp('datefin').getSubmitValue() != "") {
                                        dt_fin = Ext.getCmp('datefin').getSubmitValue();
                                    }


                                    if (Ext.getCmp('datedebut').getSubmitValue() != null && Ext.getCmp('datedebut').getSubmitValue() != "") {
                                        dt_debut = Ext.getCmp('datedebut').getSubmitValue();
                                    }
                                    OGrid.getStore().load({
                                        params: {
                                            lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID,
                                            dt_fin: dt_fin,
                                            dt_debut: dt_debut,
                                            search_value: re_search

                                        }
                                    });
                                }
                            });
                        }
                    }
                }, {
                    xtype: 'combobox',
                    //fieldLabel: 'Tiers payant',
                    //allowBlank: false,
                    name: 'lg_TIERS_PAYANT_ID',
                    margins: '0 0 0 10',
                    id: 'lg_TIERS_PAYANT_ID',
                    //  store: store_client,
                    store: searchstore,
                    //disabled: true,
                    valueField: 'lg_TIERS_PAYANT_ID',
                    displayField: 'str_FULLNAME',
                    typeAhead: false,
                    queryMode: 'remote',
                    pageSize: 10,
                    minChars: 2,
                    flex: 1,
                    enableKeyEvents: true,
                    emptyText: 'Sectionner un tiers payant...',
                    listeners: {
                        keypress: function (field, e) {

                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                if (field.getValue().length <= 2) {
                                    field.getStore().load();
                                }
                                // alert(e.BACKSPACE);
                            }

                        },
                        select: function (cmp) {
                            var value = cmp.getValue();

                            var OGrid = Ext.getCmp('Grid_Reglement_ID');
                            var dt_fin = '', dt_debut = '';
                            if (Ext.getCmp('datefin').getSubmitValue() !== null && Ext.getCmp('datefin').getSubmitValue() !== "") {
                                dt_fin = Ext.getCmp('datefin').getSubmitValue();
                            }

                            if (Ext.getCmp('datedebut').getSubmitValue() !== null && Ext.getCmp('datedebut').getSubmitValue() !== "") {
                                dt_debut = Ext.getCmp('datedebut').getSubmitValue();
                            }
                            OGrid.getStore().load({
                                params: {
                                    lg_TIERS_PAYANT_ID: this.getValue(),
                                    dt_fin: dt_fin,
                                    dt_debut: dt_debut

                                }
                            });


                        },
                        change: function () {
                            var value = this.getValue();
                            if (value != '') {

                                Ext.getCmp('btnprintreglement').enable();
                            } else {
                                Ext.getCmp('btnprintreglement').setDisabled(true);
                            }
                        }
                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {

                            valdatedebut = me.getSubmitValue();
                            Ext.getCmp('datefin').setMinValue(this.getValue());

                        }
                    }
                }, {
                    xtype: 'datefield',
                    id: 'datefin',
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            //alert(me.getSubmitValue());
                            valdatefin = me.getSubmitValue();
                            Ext.getCmp('datedebut').setMaxValue(this.getValue());

                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechDifClick
                }
                , {
                    text: 'Imprimer',
                    tooltip: 'Imprimer',
                    iconCls: 'importicon',
                    scope: this,
                    id: 'btnprintreglement',
                    disabled: true,
                    handler: this.onPdfClick
                }, {
                    text: 'Impression groupée',
                    iconCls: 'printable',
                    tooltip: 'imprimer',
                    scope: this,
                    handler: this.onPdfPrint
                }


            ],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }


        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


        this.on('edit', function (editor, e) {



            Ext.Ajax.request({
                url: url_services_transaction_preenregistrement + 'update',
                params: {
                    lg_PREENREGISTREMENT_ID: e.record.data.lg_PREENREGISTREMENT_ID,
                    str_REF: e.record.data.str_REF,
                    lg_USER_ID: e.record.data.lg_USER_ID,
                    int_PRICE: e.record.data.int_PRICE

                },
                success: function (response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function (response)
                {
                    console.log("Bug " + response.responseText);
                    alert(response.responseText);
                }
            });
        });

        /* if (view_title === "by_customer") {
         
         } else {
         Me.onLoadCustomer();
         
         }*/
    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onManageDetailsClick: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "reglementdetails";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Les dossiers li&eacute;s au r&eacute;glement", rec.get('lg_DOSSIER_REGLEMENT_ID'), rec.data);

    }, onTransformClick: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "doventemanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Devis_en_vente", rec.get('str_REF'), rec.data);

    },
    onAddClick: function () {
        var xtype = "doventemanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "by_devis", "0");
    },
    onLoadCustomer: function () {
        var xtype = "clientmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "by_", "0");
    },
    onAddCarnetClick: function () {

        //  var rec = grid.getStore().getAt(rowIndex);
        var xtype = "doventecarnetmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Vente avec carnet", "0");
    },
    onAddAssuranceClick: function () {

        //  var rec = grid.getStore().getAt(rowIndex);
        var xtype = "doreglementmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Faire R&eacute;glement ", "0");
    },
    onDoreglement: function () {

        //  var rec = grid.getStore().getAt(rowIndex);
        var xtype = "doreglementmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Faire R&eacute;glement ", "0");
    },

    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_preenregistrement + 'delete',
                            params: {
                                mode: 'deletedetail',
                                lg_PREENREGISTREMENT_ID: rec.get('lg_PREENREGISTREMENT_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                        return;
                    }
                });
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.preenregistrement.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Preenregistrement  [" + rec.get('str_REF') + "]"
        });
    },
    onRechDifClick: function () {
        var lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        if (lg_TIERS_PAYANT_ID == '') {
            Ext.MessageBox.alert('Message ', "Veuillez choisir un tiers payant");
            return;
        }
        var grid = Ext.getCmp('Grid_Reglement_ID');
        var dt_fin = '', dt_debut = '';
        if (Ext.getCmp('datefin').getSubmitValue() != null && Ext.getCmp('datefin').getSubmitValue() != "") {
            dt_fin = Ext.getCmp('datefin').getSubmitValue();
        }

        if (Ext.getCmp('datedebut').getSubmitValue() != null && Ext.getCmp('datedebut').getSubmitValue() != "") {
            dt_debut = Ext.getCmp('datedebut').getSubmitValue();
        }

        grid.getStore().load({
            params: {
                lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID,
                dt_fin: dt_fin,
                dt_debut: dt_debut
            }
        });
    },
    onPdfClickTicket: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/facturation/ticket-facture/' + rec.get('lg_DOSSIER_REGLEMENT_ID'),
            failure: function (response)
            {
                const object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    onPdfClick: function () {
        const lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue()
                ;
        const linkUrl = url_ws_generate_reglement_pdf + "?lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin;
        window.open(linkUrl);
    },
    onPdfPrint: function () {
        let tiersPayantId = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dtEnd = Ext.getCmp('datefin').getSubmitValue(), dtStart = Ext.getCmp('datedebut').getSubmitValue();
        if (tiersPayantId == null || tiersPayantId == undefined) {
            tiersPayantId = '';
        }
        const linkUrl = '../FacturePdfServlet?dtStart=' + dtStart + "&dtEnd=" + dtEnd + "&mode=REGLEMENT_FACTURE_GROUPE" + "&tiersPayantId=" + tiersPayantId;

        window.open(linkUrl);
    }
});