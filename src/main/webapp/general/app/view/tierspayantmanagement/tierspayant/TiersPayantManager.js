/* global Ext */


var url_services_transaction_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_transaction.jsp?mode=';
var url_services_data_ville = '../webservices/configmanagement/ville/ws_data.jsp';
var url_services_data_typetierspayant = '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp';
var url_services_data_typecontrat = '../webservices/configmanagement/typecontrat/ws_data.jsp';
var url_services_data_regimecaisse = '../webservices/configmanagement/regimecaisse/ws_data.jsp';
var url_services_data_risque = '../webservices/configmanagement/risque/ws_data.jsp';
var url_services_pdf_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_generate_pdf.jsp';

var Me_Workflow;
var lg_TYPE_TIERS_PAYANT_ID = "";
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.tierspayantmanagement.tierspayant.TiersPayantManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'tierspayantmanager',
    id: 'tierspayantmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.TiersPayant',
        'testextjs.view.tierspayantmanagement.tierspayant.action.add',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer',
        'testextjs.view.tierspayantmanagement.tierspayant.action.detailstierspayant'

    ],
    title: 'Gestion des Tiers-Payant',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {str_FAMILLE_ITEM}</p>',
                    {
                        formatChange: function (v) {
                            const color = v >= 0 ? 'green' : 'red';
                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                        }
                    })
        }],
    initComponent: function () {

        Me_Workflow = this;
        lg_TYPE_TIERS_PAYANT_ID = "";

        url_services_pdf_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_generate_pdf.jsp';
        let itemsPerPage = 20;

        const store = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/tierspayant/list',
                reader: {
                     type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_type_tp = new Ext.data.Store({
            model: 'testextjs.model.TypeTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typetierspayant,
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
            width: '98%',
            height: 580,
            id: 'OGrid',
            store: store,
            columns: [{
                    header: 'lg_TIERS_PAYANT_ID',
                    dataIndex: 'lg_TIERS_PAYANT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                {
                    header: 'Type',
                    dataIndex: 'lg_TYPE_TIERS_PAYANT_ID',
                    flex: 0.6
                },
                {
                    header: 'Code',
                    dataIndex: 'str_CODE_ORGANISME',
                    flex: 0.6

                }, {
                    header: 'Nom Abrege',
                    dataIndex: 'str_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Nom complet',
                    dataIndex: 'str_FULLNAME',
                    flex: 1.5
                },
                {
                    header: 'Plafond',
                    dataIndex: 'dbl_PLAFOND_CREDIT',
                    flex: 1,
                    align: 'right',
                    renderer: function (v) {
                        if (v === 0) {
                            return '<span style="color:blue;"> Plafond non défini </span>';
                        } else {
                            return amountformat(v);
                        }
                    }
                },
                {
                    header: 'Encours',
                    dataIndex: 'db_CONSOMMATION_MENSUELLE',
                    flex: 0.7,
                    align: 'right',
                    renderer: function (v) {
                        return amountformat(v);
                    }
                },
                {
                    header: 'Caution',
                    dataIndex: 'caution',
                    flex: 0.7,
                    align: 'right',
                    renderer: function (v) {
                        return amountformat(v);
                    }
                },

                {
                    header: 'Code.Edit',
                    dataIndex: 'lg_MODEL_FACTURE_ID',
                    flex: 0.7,
                    align: 'right'
                }, {
                    header: 'T&eacute;l&eacute;phone',
                    dataIndex: 'str_TELEPHONE',
                    flex: 0.7
                }, {
                    header: 'Nbre.Client',
                    dataIndex: 'int_NUMBER_CLIENT',
                    flex: 0.7,
                    align: 'center'
                }, {
                    header: 'Photo',
                    dataIndex: 'str_PHOTO',
                    hidden: true,
                    flex: 0.7,
                    renderer: function (val) {
                        return '<center><img src="../resources/images/pic_customer/' + val + '" style = "width: 30px; height: 30px;"></center>';
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
                            handler: this.onEditClick
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
                            getClass: function (value, metadata, record) {
                                if (record.get('BTNDELETE')) {
                                    return 'x-display-hide';
                                } else {
                                    return 'x-hide-display';
                                }
                            },
                            handler: this.onRemoveClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    hidden: true,
                    items: [{
                            icon: 'resources/images/icons/fam/user.png',
                            tooltip: 'Modifier la photo',
                            scope: this,
                            handler: this.onEditPhotoClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/disable.png',
                            tooltip: 'Desactiver le tiers payant',
                            scope: this,
                            getClass: function (value, metadata, record) {
                                if (record.get('P_BTN_DESACTIVER_TIERS_PAYANT')) {
                                    return 'x-display-hide';
                                } else {
                                    return 'x-hide-display';
                                }
                            },
                            handler: this.onDesableClick
                        }]
                },

                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            iconCls: 'detailclients',
                            tooltip: 'Detail du tiers payant',
                            scope: this,
                            handler: this.onDetailClick
                        }]
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Cr&eacute;er',
                    scope: this,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'combobox',
                    fieldLabel: 'Type Tiers Payant',
                    name: 'lg_TYPE_TIERS_PAYANT_ID',
                    id: 'lg_TYPE_TIERS_PAYANT_ID',
                    store: store_type_tp,
                    flex: 1,
                    valueField: 'lg_TYPE_TIERS_PAYANT_ID',
                    displayField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
//                    typeAhead: true,
                    editable: false,
                    queryMode: 'remote',
                    emptyText: 'Choisir un type tiers payant ...',
                    listeners: {
                        select: function (cmp) {
                            lg_TYPE_TIERS_PAYANT_ID = cmp.getValue();
                            var search_value = Ext.getCmp('rechecher').getValue();

                            Ext.getCmp('OGrid').getStore().load({

                                params: {
                                    lg_TYPE_TIERS_PAYANT_ID: lg_TYPE_TIERS_PAYANT_ID,
                                    search_value: search_value
                                }
                            });

                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'famille',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Workflow.onRechClick();

                                }
                            });
                        }
                    }
                }, '-', {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }, '-', {
                    text: 'Imprimer',
                    id: 'P_BT_PRINT',
                    iconCls: 'printable',
                    handler: this.onPrintClick
                }, '-', {
                    text: 'Importer',
                    tooltip: 'Importer',
                    id: 'btn_import',
                    iconCls: 'importicon',
                    scope: this,
                    handler: this.onbtnimport
                }, '-',
                {
                    text: 'Exporter CSV',
                    tooltip: 'EXPORTER CSV',
                    iconCls: 'export_csv_icon',
                    scope: this,
                    handler: this.onbtnexportCsv
                }, '-',
                {
                    text: 'Exporter EXCEL',
                    tooltip: 'EXPORTER EXCEL',
                    iconCls: 'export_excel_icon',
                    scope: this,
                    handler: this.onbtnexportExcel
                }, '-', {
                    text: 'Verifier l\'importation',
                    tooltip: 'Verifier l\'importation',
                    id: 'btn_checkimport',
                    iconCls: 'check_icon',
                    scope: this,
                    handler: this.onbtncheckimport
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(),
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            lg_TYPE_TIERS_PAYANT_ID: '',
                            search_value: ''

                        };
                        var search_value = Ext.getCmp('rechecher').getValue(), lg_TYPE_TIERS_PAYANT_ID = Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID').getValue();

                        if (lg_TYPE_TIERS_PAYANT_ID == null) {
                            lg_TYPE_TIERS_PAYANT_ID = "";
                        }


                        myProxy.setExtraParam('search_value', search_value);
                        myProxy.setExtraParam('lg_TYPE_TIERS_PAYANT_ID', lg_TYPE_TIERS_PAYANT_ID);

                    }

                }
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        }),
                this.on('edit', function (editor, e) {

                    Ext.Ajax.request({
                        url: url_services_transaction_tierspayant + 'update',
                        params: {
                            lg_TIERS_PAYANT_ID: e.record.data.lg_TIERS_PAYANT_ID,
                            str_CODE_ORGANISME: e.record.data.str_CODE_ORGANISME,
                            str_NAME: e.record.data.str_NAME,
                            str_FULLNAME: e.record.data.str_FULLNAME,
                            str_ADRESSE: e.record.data.str_ADRESSE,
                            str_MOBILE: e.record.data.str_MOBILE,
                            str_TELEPHONE: e.record.data.str_TELEPHONE,
                            str_MAIL: e.record.data.str_MAIL,
                            dbl_PLAFOND_CREDIT: e.record.data.dbl_PLAFOND_CREDIT,
                            dbl_TAUX_REMBOURSEMENT: e.record.data.dbl_TAUX_REMBOURSEMENT,
                            str_NUMERO_CAISSE_OFFICIEL: e.record.data.str_NUMERO_CAISSE_OFFICIEL,
                            str_CENTRE_PAYEUR: e.record.data.str_CENTRE_PAYEUR,
                            str_CODE_REGROUPEMENT: e.record.data.str_CODE_REGROUPEMENT,
                            dbl_SEUIL_MINIMUM: e.record.data.dbl_SEUIL_MINIMUM,
                            bool_INTERDICTION: e.record.data.bool_INTERDICTION,
                            str_CODE_COMPTABLE: e.record.data.str_CODE_COMPTABLE,
                            bool_PRENUM_FACT_SUBROGATOIRE: e.record.data.bool_PRENUM_FACT_SUBROGATOIRE,
                            int_NUMERO_DECOMPTE: e.record.data.int_NUMERO_DECOMPTE,
                            str_CODE_PAIEMENT: e.record.data.str_CODE_PAIEMENT,
                            dt_DELAI_PAIEMENT: e.record.data.dt_DELAI_PAIEMENT,
                            dbl_POURCENTAGE_REMISE: e.record.data.dbl_POURCENTAGE_REMISE,
                            dbl_REMISE_FORFETAIRE: e.record.data.dbl_REMISE_FORFETAIRE,
                            str_CODE_EDIT_BORDEREAU: e.record.data.str_CODE_EDIT_BORDEREAU,
                            int_NBRE_EXEMPLAIRE_BORD: e.record.data.int_NBRE_EXEMPLAIRE_BORD,
                            int_PERIODICITE_EDIT_BORD: e.record.data.int_PERIODICITE_EDIT_BORD,
                            int_DATE_DERNIERE_EDITION: e.record.data.int_DATE_DERNIERE_EDITION,
                            str_NUMERO_IDF_ORGANISME: e.record.data.str_NUMERO_IDF_ORGANISME,
                            dbl_MONTANT_F_CLIENT: e.record.data.dbl_MONTANT_F_CLIENT,
                            dbl_BASE_REMISE: e.record.data.dbl_BASE_REMISE,
                            str_CODE_DOC_COMPTOIRE: e.record.data.str_CODE_DOC_COMPTOIRE,
                            bool_ENABLED: e.record.data.bool_ENABLED,
                            lg_VILLE_ID: e.record.data.lg_VILLE_ID,
                            lg_TYPE_TIERS_PAYANT_ID: e.record.data.lg_TYPE_TIERS_PAYANT_ID,
                            lg_TYPE_CONTRAT_ID: e.record.data.lg_TYPE_CONTRAT_ID,
                            lg_RISQUE_ID: e.record.data.lg_RISQUE_ID

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

    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onbtncheckimport: function () {
        new testextjs.view.configmanagement.famille.action.importOrder({
            odatasource: 'TABLE_TIERS_PAYANTS',
            parentview: this,
            mode: "checkimportfile",
            titre: "Verification de l'importation des differents tiers payants de l'officine"
        });
    },
    onbtnimport: function () {
        new testextjs.view.configmanagement.famille.action.importOrder({
            odatasource: 'TABLE_TIERS_PAYANTS',
            parentview: this,
            mode: "importfile",
            titre: "Importation des differents organismes de l'officine"
        });
    },
    onbtnexportCsv: function () {
        var extension = "csv";
        window.location = '../MigrationServlet?table_name=TABLE_TIERS_PAYANTS' + "&extension=" + extension;
    },
    onbtnexportExcel: function () {
        var extension = "xls";
        window.location = '../MigrationServlet?table_name=TABLE_TIERS_PAYANTS' + "&extension=" + extension;
    },

    onAddClick: function () {

        new testextjs.view.tierspayantmanagement.tierspayant.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Tiers payant"
        });
    },
    onPrintClick: function () {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_tierspayant + '?search_value=' + Ext.getCmp('rechecher').getValue() + "&lg_TYPE_TIERS_PAYANT_ID=" + lg_TYPE_TIERS_PAYANT_ID;
        testextjs.app.getController('App').onGeneratePdfFile(linkUrl);
    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_tierspayant + 'delete',
                            params: {
                                lg_TIERS_PAYANT_ID: rec.get('lg_TIERS_PAYANT_ID')
                            },
                            success: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }
                            },
                            failure: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
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
    onEditClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.tierspayantmanagement.tierspayant.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification  Tiers Payant  [" + rec.get('str_NAME') + "]"
        });
    },
    onEditPhotoClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.tierspayantmanagement.tierspayant.action.addPhoto({
            odatasource: rec.data,
            parentview: this,
            mode: "updatephoto",
            titre: "Modification photo Tiers Payant  [" + rec.get('str_NAME') + "]"
        });
    },
    onEditpwdClick: function (grid, rowIndex) {

    },
    onRechClick: function () {
        const val = Ext.getCmp('rechecher');
        let lg_TYPE = Ext.getCmp('lg_TYPE_TIERS_PAYANT_ID').getValue();

        if (lg_TYPE == null) {
            lg_TYPE = "";
        }
        this.getStore().load({
            params: {
                search_value: val.getValue(),
                lg_TYPE_TIERS_PAYANT_ID: lg_TYPE
            }
        });
    },
    onDesableClick: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        Ext.MessageBox.confirm('Message',
                "Voulez-vous d&eacute;sactiver le tiers payant " + "<br><b>" + rec.get('str_FULLNAME') + "</b>",
                function (btn) {
                    if (btn === 'yes') {
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_tierspayant + 'disable',
                            params: {
                                lg_TIERS_PAYANT_ID: rec.get('lg_TIERS_PAYANT_ID')
                            },
                            success: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === "0") {

                                    Ext.MessageBox.show({
                                        title: 'Message d\'erreur',
                                        width: 320,
                                        msg: object.errors,
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.WARNING
                                    });
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
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
                        return;
                    }
                });


    },

    onDetailClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.tierspayantmanagement.tierspayant.action.detailstierspayant({
            odatasource: rec.data,
            parentview: this,
            titre: "Detail du tiers payant : [" + rec.get('str_FULLNAME') + "]"
        });
    }

});