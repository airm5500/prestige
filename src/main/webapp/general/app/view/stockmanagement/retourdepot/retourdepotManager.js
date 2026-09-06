/* global Ext */

var url_services_data_retourdepot = '../webservices/stockmanagement/retourdepot/ws_data.jsp';
var url_services_transaction_retourdepot = '../webservices/stockmanagement/retourdepot/ws_transaction.jsp?mode=';
var url_services_pdf_retourdepot = '../webservices/stockmanagement/retourdepot/ws_generate_pdf.jsp';

var Me;
var valdatedebut = "";
var valdatefin = "";
//var store_retourdepot;
//var val;
var LaborexWorkFlow;
var store_famille_dovente = null;
var lg_EMPLACEMENT_ID = "";
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
var myController;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.stockmanagement.retourdepot.retourdepotManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'retourdepot',
    id: 'retourdepotID',
    frame: true,
    requires: [
        'Ext.selection.CellModel'
    ],

    title: 'Liste des retours d&eacute;p&ocirc;ts',
//    iconCls: 'icon-grid',
    plain: true,
    maximizable: true,

    closable: false,
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {str_FAMILLE_ITEM}</p>',
                    {
                        formatChange: function (v) {
                            var color = v >= 0 ? 'green' : 'red';
                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                        }
                    })
        }],
    initComponent: function () {


        Me = this;
        myController = Ext.create('testextjs.controller.App', {});
        lg_EMPLACEMENT_ID = loadEmplacement();
        var itemsPerPage = 20;

        var store_retourdepot = new Ext.data.Store({
            model: 'testextjs.model.RetourFournisseur',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_retourdepot,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 180000
            }

        });

        Ext.apply(this, {
//            width: 1200,
            width: '98%',
            height: 580,
            store: store_retourdepot,
            id: 'retourGrid',
            columns: [
                {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                },
                {
                    header: 'Ref. Retour',
                    dataIndex: 'str_REF_RETOUR_FRS',
                    flex: 1
                },
                {
                    header: 'Depot',
                    dataIndex: 'lg_BON_LIVRAISON_ID',
                    flex: 1
                },
                {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1
                },
                {
                    header: 'Heure',
                    dataIndex: 'dt_UPDATED',
                    flex: 0.5
                },
                // int_LINE
                {
                    header: 'Nombre de lignes',
                    dataIndex: 'int_LINE',
                    flex: 0.5
                },
                {
                    header: 'Op&eacute;rateur',
                    dataIndex: 'lg_USER_ID',
                    flex: 1

                },
                {
                    header: '',
                    dataIndex: 'bool_PENDING',
                    flex: 1,
                    renderer: function (v, m, r) {
                        if (r.get('bool_PENDING')) {

                            if (r.get('USEREMPLACEMENT') !== "1") {

                                return '<span style="width:100%;height:100%; background-color:#F39C12;color:#F9F9F9;font-weight:800;padding:8px;" > En Attente</span>';
                            } else {

                                return '<span style="width:100%;height:100%; background-color:#5CB85C;color:#F9F9F9;font-weight:800;border: 2px solid;border-radius: 4px;padding:8px;cursor:pointer;" >Confirmer</span>';
                            }
                        } else {
                            return '';
                        }

                    },
                    listeners: {
                        click: function () {
                            var s = Ext.getCmp('retourGrid').getSelectionModel().getSelection();
                            if (s[0].data.USEREMPLACEMENT !== "1") {
                                return false;
                            }
                            myController.ShowWaitingProcess();
                            Ext.Ajax.request({
//                                url: '../webservices/stockmanagement/retourdepot/ws_transaction.jsp',
                                url: '../api/v1/depot/validerretourdepot/' + s[0].data.lg_RETOUR_FRS_ID,
                                method: 'PUT',

//                                params: {
//                                    lg_RETOUR_FRS_ID: s[0].data.lg_RETOUR_FRS_ID,
//                                    mode: 'closeInOfficine'
//                                },
                                success: function (response)
                                {
                                    myController.StopWaitingProcess();
                                    var object = Ext.JSON.decode(response.responseText, false);
                                    if (object.success) {
                                        Ext.MessageBox.alert('Infos', "Validation effectu&eacute;e");
                                    } else {
                                        Ext.MessageBox.show({
                                            title: 'Avertissement',
                                            width: 320,
                                            msg: 'Erreur de validation du retour',
                                            buttons: Ext.MessageBox.OK,
                                            icon: Ext.MessageBox.WARNING
                                        });

                                    }
                                    Ext.getCmp('retourGrid').getStore().reload();
                                },
                                failure: function (response)
                                {
                                    myController.StopWaitingProcess();
                                    var object = Ext.JSON.decode(response.responseText, false);


                                    console.log("Bug " + response.responseText);
                                    Ext.MessageBox.alert('Error Message', response.responseText);

                                }
                            });







                        }
                    }

                },

                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onManageDetailsClick,
                            getClass: function (value, metadata, record) {
                                if (record.get('USEREMPLACEMENT') !== "1") {
                                    if (record.get('str_STATUT') == "is_Process") {  //read your condition from the record
                                        return '';
                                    } else {
                                        return 'x-hide-display'; //cache l'icone
                                    }
                                } else {
                                    return 'x-hide-display';
                                }
                            }
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
                            tooltip: 'Imprimer le retour',
                            scope: this,
                            handler: this.onPrintClick,
                            getClass: function (value, metadata, record) {
                                if (record.get('str_STATUT') == "is_Closed") {  //read your condition from the record
                                    return '';
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }
                    ]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/excel_csv.png',
                            tooltip: 'Exporter en csv un retour',
                            scope: this,
                            handler: this.onbtnexportCsv,
                            getClass: function (value, metadata, record) {

                                if (!record.get('bool_SAME_LOCATION')) {
                                    if (record.get('lg_EMPLACEMENT_ID') != "1" && record.get('str_STATUT') == "is_Closed") {  //read your condition from the record
                                        return '';
                                    } else {
                                        return 'x-hide-display'; //cache l'icone
                                    }
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }
                    ]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/excel_icon.png',
                            tooltip: 'Exporter en excel un retour',
                            scope: this,
                            handler: this.onbtnexportExcel,
                            getClass: function (value, metadata, record) {

                                if (!record.get('bool_SAME_LOCATION')) {

                                    if (record.get('lg_EMPLACEMENT_ID') != "1" && record.get('str_STATUT') == "is_Closed") {  //read your condition from the record
                                        return '';
                                    } else {
                                        return 'x-hide-display'; //cache l'icone
                                    }
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }
                    ]
                }

            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Ajouter',
                    scope: this,
                    id: 'btn_add',
                    hidden: true,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-',
                {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    flex: 0.7,
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            // alert(me.getSubmitValue());
                            valdatedebut = me.getSubmitValue();
                        }
                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datefin',
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    flex: 0.7,
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            //alert(me.getSubmitValue());
                            valdatefin = me.getSubmitValue();
                        }
                    }
                }, '-',
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'suggestion',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                },
                {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }, '-', {
                    text: 'Importer',
                    tooltip: 'Importer le retour d\'un d&eacute;p&ocirc;t',
                    id: 'btn_import',
                    iconCls: 'importicon',
                    hidden: true,
                    scope: this,
                    handler: this.onbtnimport
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: itemsPerPage,
                store: store_retourdepot,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(), // same store GridPanel is using
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            search_value: ''
                        };
                        myProxy.setExtraParam('search_value', Ext.getCmp('rechecher').getValue());
                    }

                }
            },
            listeners: {
                afterrender: function () { // a decommenter apres les tests
                    if (lg_EMPLACEMENT_ID == "1") {
                        Ext.getCmp('btn_import').show();
                    } else {
                        Ext.getCmp('btn_add').show();

                    }
                }
            }


        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });


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
        var xtype = "addretourdepot";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Modification fiche retour d&eacute;p&ocirc;t", rec.get('lg_RETOUR_FRS_ID'), rec.data);
        //alert("test"+rec.get('lg_RETOUR_FRS_ID'));
    },
    onAddClick: function () {
        var xtype = "addretourdepot";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Ajouter detail retour d&eacute;p&ocirc;t", "0");

    },
    onPrintClick: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_retourdepot + '?lg_RETOURDEPOT_ID=' + rec.get('lg_RETOUR_FRS_ID');

        window.open(linkUrl);
//        testextjs.app.getController('App').onLunchPrinter(linkUrl);
    },
    onRechClick: function () {

        if (new Date(valdatedebut) > new Date(valdatefin)) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }

        var val = Ext.getCmp('rechecher');

        this.getStore().load({
            params: {
                search_value: val.getValue(),
                datedebut: valdatedebut,
                datefin: valdatefin
            }
        }, url_services_data_retourdepot);

    },
    onbtnexportCsv: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        var liste_param = "search_value:" + rec.get('lg_RETOUR_FRS_ID');
        var extension = "csv";
        window.location = '../MigrationServlet?table_name=TABLE_RETOURDEPOT' + "&extension=" + extension + "&liste_param=" + liste_param;
    },
    onbtnexportExcel: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        var liste_param = "search_value:" + rec.get('lg_RETOUR_FRS_ID');
        var extension = "xls";
        window.location = '../MigrationServlet?table_name=TABLE_RETOURDEPOT' + "&extension=" + extension + "&liste_param=" + liste_param;
    },
    onbtnimport: function () {
        new testextjs.view.stockmanagement.dodepot.action.importOrder({
            odatasource: 'TABLE_RETOURDEPOT',
            parentview: this,
            mode: "importfile",
            titre: "Importation un retour de produits de d&eacute;p&ocirc;t"
        });
    }
});

function loadEmplacement() {
    return localStorage.getItem("lg_EMPLACEMENT_ID");
}