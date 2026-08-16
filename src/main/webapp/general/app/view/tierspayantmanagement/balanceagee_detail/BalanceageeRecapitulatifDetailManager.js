// Lignes de la balance agee recapitulative, en REST. Memes methodes metier et memes cles JSON
// que la JSP ws_data_balance_agee_recapitulatifdetail.jsp qu'elle remplace.
var url_services_data_balance_agee_recapitulatifdetail = '../api/v1/balance-agee/detail/liste';
var url_services_data_tierspayant_other = '../webservices/tierspayantmanagement/tierspayant/ws_data_other.jsp';
var url_services_data_client = '../webservices/configmanagement/client/ws_data_compteclttierspayants.jsp';
// Listes deroulantes de CET ecran, en REST : memes methodes metier et memes cles JSON que les
// JSP qu'elles remplacent. Des noms propres a l'ecran, et non les variables globales ci-dessus :
// ces globales sont redeclarees par plusieurs autres fichiers, la valeur retenue dependrait donc
// de l'ordre de chargement.
var url_rest_balance_tierspayant = '../api/v1/tierspayant/combo';
var url_rest_balance_clients = '../api/v1/tierspayant/clients-combo';
var url_services_transaction_facturetierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_transaction.jsp?mode=';
var lg_TIERS_PAYANT_ID = "";
var lg_COMPTE_CLIENT_ID = "";

var valdatedebut;
var valdatefin;
var title;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.tierspayantmanagement.balanceagee_detail.BalanceageeRecapitulatifDetailManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'balanceageerecapitulatifdetail',
    id: 'balanceageerecapitulatifdetailID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.BalanceAgee',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        nameintern: ''
    },
    title: 'Gestion des balances agees detaillees',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function () {

        title = this.getTitre();
        // alert("title "+title  + " lg_TIERS_PAYANT_ID "+lg_TIERS_PAYANT_ID);
        if (title == "Balance agee detaillee") {
            lg_TIERS_PAYANT_ID = this.getNameintern();
            this.title = "Balance ag&eacute;e d&eacute;taill&eacute;e de la periode du " + this.getOdatasource().str_PERIOD;
            valdatedebut = this.getOdatasource().dt_DEBUT;
            valdatefin = this.getOdatasource().dt_FIN;


        } else {
            /* ouverture directe par le menu : on repart de filtres vierges
             * (les variables globales gardaient les valeurs de la
             * navigation precedente) */
            lg_TIERS_PAYANT_ID = "";
            lg_COMPTE_CLIENT_ID = "";
            valdatedebut = "";
            valdatefin = "";
        }



        var itemsPerPage = 20;


//        var store_type_facture = new Ext.data.Store({
//            fields: ['str_NAME_FACTURE', 'str_STATUT_FACTURE'],
//            data: [{str_NAME_FACTURE: 'Dossier en attente', str_STATUT_FACTURE: 'is_Waiting'}, {str_NAME_FACTURE: 'Dossier en cours de reglement', str_STATUT_FACTURE: 'is_Process'}, {str_NAME_FACTURE: 'Dossier regle', str_STATUT_FACTURE: 'enable'}]
//        });


        var store = new Ext.data.Store({
            model: 'testextjs.model.BalanceAgee',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_balance_agee_recapitulatifdetail + "?lg_COMPTE_CLIENT_ID=" + lg_COMPTE_CLIENT_ID
                        + "&lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID + "&datedebut=" + valdatedebut + "&datefin=" + valdatefin,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_tierspayant = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_rest_balance_tierspayant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_client = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_rest_balance_clients,
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
            width:'98%',
            height: 570,
          
            store: store,
            id: 'GridFacturationID',
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: 'lg_TIERS_PAYANT_ID',
                    dataIndex: 'lg_TIERS_PAYANT_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Tiers payants',
                    dataIndex: 'str_TIERS_PAYANT',
                    flex: 1
                },
                {
                    header: 'Nombre.Produits.Vendus',
                    dataIndex: 'int_NUMBER_PRODUCT',
                    align: 'right',
                    renderer: amountformat,  
                    flex: 1
                },
                {
                    header: 'Nombre.Dossiers',
                    dataIndex: 'int_NUMBER_TRANSACTION',
                    align: 'right',
                    renderer: amountformat,
                    flex: 1
                }, {
                    header: 'Montant',
                    dataIndex: 'int_MONTANT',
                    align: 'right',
                    renderer: amountformat,
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/grid.png',
                            tooltip: 'Voir le detail des transactions',
                            scope: this,
                            handler: this.onDetailTransactionClick
                        }]
                }/*,
                 {
                 xtype: 'actioncolumn',
                 width: 30,
                 sortable: false,
                 menuDisabled: true,
                 items: [{
                 icon: 'resources/images/icons/fam/folder_go.png',
                 tooltip: 'Envoyer le dossier en litige',
                 scope: this,
                 handler: this.onSendToLitigeClick
                 }]
                 }*/],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'combobox',
                    //fieldLabel: 'Tiers payant',
                    //allowBlank: false,
                    name: 'lg_TIERS_PAYANT_ID',
                    margins: '0 0 0 10',
                    id: 'lg_TIERS_PAYANT_ID',
                    store: store_tierspayant,
                    valueField: 'lg_TIERS_PAYANT_ID',
                    displayField: 'str_FULLNAME',
//                    typeAhead: true,
                    queryMode: 'remote',
                    pageSize: 10,
                    width: 350,
                    minChars: 2,
                    enableKeyEvents: true,
                    emptyText: 'Sectionner tiers payant...',
                    listConfig: {
                        loadingText: 'Recherche...',
                        emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                        getInnerTpl: function () {
                            return '<span>{str_FULLNAME}</span>';
                        }

                    },
                    listeners: {
                        keypress: function (field, e) {

                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                if (field.getValue().length <= 2) {
                                    field.getStore().load();
                                }

                            }

                        },
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var lg_TIERS_PAYANT_ID = value;

                            var OGrid = Ext.getCmp('GridFacturationID');
                            //  var url_services_data_balance_agee_recapitulatifdetail = '../webservices/tierspayantmanagement/tierspayant/ws_data_facturation.jsp';
                            OGrid.getStore().getProxy().url = url_services_data_balance_agee_recapitulatifdetail + "?lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID + "&datedebut=" + valdatedebut + "&datefin=" + valdatefin;
                            OGrid.getStore().reload();


                            var lg_COMPTE_CLIENT_ID = Ext.getCmp('lg_COMPTE_CLIENT_ID');
                            //lg_COMPTE_CLIENT_ID.enable();
                            lg_COMPTE_CLIENT_ID.getStore().getProxy().url = url_rest_balance_clients + "?lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID;
                            lg_COMPTE_CLIENT_ID.getStore().reload();
                        }
                    }
                }, {
                    xtype: 'combobox',
                    //fieldLabel: 'Tiers payant',
                    //allowBlank: false,
                    name: 'lg_COMPTE_CLIENT_ID',
                    margins: '0 0 0 10',
                    id: 'lg_COMPTE_CLIENT_ID',
                    store: store_client,
                    hidden: true,
                    //disabled: true,
                    valueField: 'lg_COMPTE_CLIENT_ID',
                    displayField: 'str_FIRST_LAST_NAME',
                    typeAhead: true,
                    queryMode: 'remote',
//                    flex: 1,
                    emptyText: 'Sectionner client...',
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var lg_COMPTE_CLIENT_ID = value;
                            var lg_TIERS_PAYANT_ID = "";

                            if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() == null) {
                                lg_TIERS_PAYANT_ID = "";
                            } else {
                                lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                            }

                            var OGrid = Ext.getCmp('GridFacturationID');
                            //  var url_services_data_balance_agee_recapitulatifdetail = '../webservices/tierspayantmanagement/tierspayant/ws_data_facturation.jsp';
                            OGrid.getStore().getProxy().url = url_services_data_balance_agee_recapitulatifdetail + "?lg_TIERS_PAYANT_ID=" + lg_TIERS_PAYANT_ID + "&lg_COMPTE_CLIENT_ID=" + lg_COMPTE_CLIENT_ID + "&datedebut=" + valdatedebut + "&datefin=" + valdatefin;
                            OGrid.getStore().reload();
                        }
                    }
                }, {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    format: 'd/m/Y',
                    flex: 1,
                    listeners: {
                        'change': function (me) {
                            // alert(me.getSubmitValue());
                            valdatedebut = me.getSubmitValue();
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
                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    width: 250,
                    emptyText: 'Rech',
                    enableKeyEvents: true,
                    listeners: {
                        specialKey: function (field, e, options) {
                            if (e.getKey() === e.ENTER) {

                                store.load({
                                    params: {
                                        search_value: field.getValue(),
                                        datedebut: valdatedebut,
                                        datefin: valdatefin,
                                        lg_TIERS_PAYANT_ID: Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                                        lg_COMPTE_CLIENT_ID: Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue()
                                    }


                                });
                            }
                        }


                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                /*xtype: 'pagingtoolbar',
                 store: store, // same store GridPanel is using*/
                dock: 'bottom',
                items: [
                    {
                        xtype: 'pagingtoolbar',
                        displayInfo: true,
                        flex: 1,
                        store: store // same store GridPanel is using
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        xtype: 'button',
                        text: 'Exporter CSV',
                        tooltip: 'Exporter la balance ag&eacute;e d&eacute;taill&eacute;e en CSV',
                        iconCls: 'export_csv_icon',
                        scope: this,
                        handler: this.onExportCsvClick
                    },
                    {
                        xtype: 'button',
                        text: 'Exporter EXCEL',
                        tooltip: 'Exporter la balance ag&eacute;e d&eacute;taill&eacute;e en Excel',
                        iconCls: 'export_excel_icon',
                        scope: this,
                        handler: this.onExportExcelClick
                    },
                    {
                        xtype: 'button',
                        text: 'Imprimer',
                        tooltip: 'Imprimer la balance ag&eacute;e d&eacute;taill&eacute;e',
                        iconCls: 'printable',
                        scope: this,
                        handler: this.onImprimerClick
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        xtype: 'button',
                        text: 'Retour',
                        iconCls: 'icon-clear-group',
                        scope: this,
                        handler: this.onbtnback
                    }
                ]
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })

        if (title == "Balance agee detaillee") {
            Ext.getCmp('datedebut').hide();
            Ext.getCmp('datefin').hide();
        }


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    buildExportParams: function () {
        var searchValue = Ext.getCmp('rechecher') ? Ext.getCmp('rechecher').getValue() : '';
        var tiersPayantId = Ext.getCmp('lg_TIERS_PAYANT_ID') ? Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() : '';
        return 'search_value=' + encodeURIComponent(searchValue || '')
                + '&lg_TIERS_PAYANT_ID=' + encodeURIComponent(tiersPayantId || '')
                + '&datedebut=' + (valdatedebut || '') + '&datefin=' + (valdatefin || '');
    },
    onExportCsvClick: function () {
        window.location = '../api/v1/balance-agee/detail/csv?' + this.buildExportParams();
    },
    onExportExcelClick: function () {
        window.location = '../api/v1/balance-agee/detail/excel?' + this.buildExportParams();
    },
    onImprimerClick: function () {
        window.open('../api/v1/balance-agee/detail/pdf?' + this.buildExportParams());
    },
    onbtnback: function () {
        var xtype = "";
        xtype = "balanceagee";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onPdfClick: function () {
        // alert("ref  " + ref);
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_tierspayant;
        window.open(linkUrl);

        var xtype = "";
        if (my_view_title === "Gerer Tiers Payant") {
            xtype = "facturationtierspayant";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        } else {
            xtype = "facturationtierspayant";
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
        }

    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_tierspayant + 'delete',
                            params: {
                                lg_TIERS_PAYANT_ID: rec.get('lg_TIERS_PAYANT_ID')
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
                                // alert("non ok");
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
    onDetailTransactionClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.tierspayantmanagement.balanceagee_detail.action.detailTransactionClient({
            odatasource: rec.data,
            parentview: this,
            mode: "detail_transaction",
            datefin:valdatefin,
            datedebut:valdatedebut,

            titre: "Detail transaction du tiers payant  [" + rec.get('str_TIERS_PAYANT') + "]"
        });
    },
    onSendToLitigeClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.litige.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "createlitige",
            titre: "Creation d'un litige pour le dossier  [" + rec.get('str_FIRST_NAME') + " " + rec.get('str_LAST_NAME') + "]"
        });
    },
    onEditpwdClick: function (grid, rowIndex) {

    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        var lg_TIERS_PAYANT_ID = "";
        var lg_COMPTE_CLIENT_ID = "";

        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() == null) {
            lg_TIERS_PAYANT_ID = "";
        } else {
            lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        }
        if (Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue() == null) {
            lg_COMPTE_CLIENT_ID = "";
        } else {
            lg_COMPTE_CLIENT_ID = Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue();
        }
        if (new Date(valdatedebut) > new Date(valdatefin)) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }

        this.getStore().load({
            params: {
                search_value: val.value,
                datedebut: valdatedebut,
                datefin: valdatefin,
                lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID,
                lg_COMPTE_CLIENT_ID: lg_COMPTE_CLIENT_ID
            }
        }, url_services_data_balance_agee_recapitulatifdetail);
    }

});