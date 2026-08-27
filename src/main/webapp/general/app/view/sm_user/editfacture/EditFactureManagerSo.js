/* global Ext */


var url_services_data_facturation = '../api/v1/facture-tiers-payant/list';
var url_services_data_typefacture = '../webservices/sm_user/typefacture/ws_data.jsp';
var url_services_transaction_facturation = '../api/v1/facture-tiers-payant/transaction?mode=';
var url_services_pdf_tiers_payant = '../webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp?lg_FACTURE_ID=';
var url_services_pdf_fournisseurs = '../webservices/sm_user/facturation/ws_rp_facture_fournisseur.jsp?lg_FACTURE_ID=';
var url_services_data_tiers_payant = '../webservices/tierspayantmanagement/tierspayant/ws_search_data.jsp';
var url_services_data_grossiste = "../webservices/configmanagement/grossiste/ws_data.jsp";
var Me;
var valdatedebut;
var valdatefin;
var myAppController;
var groupeStore, groupesStore;
var factureStore;
var searchstore;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.sm_user.editfacture.EditFactureManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'facturemanager',
    id: 'facturemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Facture',
        'testextjs.view.sm_user.editfacture.action.add',
        'Ext.ux.ProgressBarPager',
        'testextjs.model.GroupeModel',
        'testextjs.model.groupFactureModel',
        'testextjs.view.tierspayantmanagement.groupetierspayant.action.facturegroupe',
        'testextjs.view.tierspayantmanagement.groupetierspayant.reglementGroup'

    ],
    title: 'Gestion des facturations ',
    frame: true,
    width: "98%",
    height: 580,
    initComponent: function () {

        Me = this;
        var _this = this;
        myAppController = Ext.create('testextjs.controller.App', {});
        var itemsPerPage = 20;
        factureStore = new Ext.data.Store({
            model: 'testextjs.model.Facture',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_facturation,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        searchstore = Ext.create('testextjs.store.Statistics.TiersPayans');
        var store_typefacture = new Ext.data.Store({
            model: 'testextjs.model.TypeFacture',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typefacture,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_grossiste = new Ext.data.Store({
            model: "testextjs.model.Grossiste",
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: "ajax",
                url: url_services_data_grossiste,
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                }
            }

        });

        groupeStore = new Ext.data.Store({
            model: 'testextjs.model.groupFactureModel',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/sm_user/facturation/ws_groupeInvoices.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        groupesStore = new Ext.data.Store({
            model: 'testextjs.model.GroupeModel',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/groupe-tierspayant/list', // meme logique et memes cles JSON que la JSP historique
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        _this.store = factureStore;
        _this.columns = _this.buildDetailsColumns();
        _this.dockedItems = _this.buildDocked();
        this.callParent();



    },
    buildDocked: function () {
        return [
            {xtype: 'toolbar',
                dock: 'top',
//                padding: '8',
                items: [
                    {
                        text: 'Cr&eacute;er',
                        scope: this,
                        iconCls: 'addicon',
                        handler: this.onAddCreate
                    }, '',
                    {
                        xtype: 'combo',
                        emptyText: 'Actions',
                        labelWidth: 50,
                        flex: 1.5,
                        id: 'cmbomode',
                        valueField: 'ID',
                        displayField: 'VALUE',
                        value: 'DETAILS',
                        store: Ext.create("Ext.data.Store", {
                            fields: ["ID", "VALUE"],
                            pageSize: 20,
                            data: [{'ID': 'DETAILS', "VALUE": "Facture individuelle"},
                                {'ID': 'GROUP', "VALUE": "Facture groupée"}

                            ]
                        }),
                        listeners: {
                            select: function (cmd) {

                                var me = Me,
                                        grid = Ext.getCmp('facturemanagerID'), pagingbar = Ext.getCmp('balanceGridpagingbar'), query = cmd.getValue();

                                if (query === 'DETAILS') {
                                    Ext.getCmp('cmbfactGROUPECOMPAGNIES').hide();
                                    Ext.getCmp('lg_TIERS_PAYANT_ID').show();


                                } else {
                                    Ext.getCmp('cmbfactGROUPECOMPAGNIES').show();
                                    Ext.getCmp('lg_TIERS_PAYANT_ID').hide();

                                }
                                switch (query) {
                                    case 'DETAILS':
                                        factureStore.loadPage(1);
                                        grid.reconfigure(factureStore, me.buildDetailsColumns());
                                        pagingbar.bindStore(factureStore);
                                        break;
                                    case 'GROUP':
                                        groupeStore.loadPage(1);
                                        grid.reconfigure(groupeStore, me.buildGroupColumns());
                                        pagingbar.bindStore(groupeStore);
                                        break;

                                }

                                var val = Ext.getCmp('rechecherFacture').getValue();
                                var rechecherCode = Ext.getCmp('rechecherCode').getValue();
                                var lg_customer_id = "";

                                if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null && Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== "") {
                                    lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                                }
                                var lg_GROUPE_ID = '';
                                if (Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue() !== null && Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue() !== "") {
                                    lg_GROUPE_ID = Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue();
                                }

                                grid.getStore().load({
                                    params: {
                                        search_value: val,
                                        lg_customer_id: lg_customer_id,
                                        dt_fin: Ext.getCmp('datefin').getSubmitValue(),
                                        dt_debut: Ext.getCmp('datedebut').getSubmitValue(),
                                        lg_GROUPE_ID: lg_GROUPE_ID,
                                        CODEGROUPE: rechecherCode
//               
                                    }});

                            }
                        }

                    }
                    , '-',
                    {
                        xtype: 'textfield',
                        id: 'rechecherFacture',
                        width: 150,
                        emptyText: 'Rech',
                        listeners: {
                            specialKey: function (field, e) {

                                if (e.getKey() === e.ENTER) {

                                    var val = field.getValue();
                                    var lg_customer_id = "";
                                    var cmbfactGROUPECOMPAGNIES = '';

                                    if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null && Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== "") {
                                        lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                                    }

                                    if (Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue() !== null && Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue() !== "") {
                                        cmbfactGROUPECOMPAGNIES = Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue();
                                    }
                                    Ext.getCmp('facturemanagerID').getStore().load({
                                        params: {
                                            search_value: val,
                                            lg_customer_id: lg_customer_id,
                                            dt_fin: Ext.getCmp('datefin').getSubmitValue(),
                                            dt_debut: Ext.getCmp('datedebut').getSubmitValue(),
                                            lg_GROUPE_ID: cmbfactGROUPECOMPAGNIES
//               
                                        }
                                    });


                                }

                            }
                        }
                    }, '-',
                    {
                        xtype: 'textfield',
                        id: 'rechecherCode',
                        width: 150,
                        emptyText: 'Rech Code facture',
                        listeners: {
                            specialKey: function (field, e) {

                                if (e.getKey() === e.ENTER) {


                                    Ext.getCmp('facturemanagerID').getStore().load({
                                        params: {
                                            CODEGROUPE: field.getValue()
//               
                                        }
                                    });


                                }

                            }
                        }
                    }


                    ,
                    {
                        xtype: 'combobox',

                        margin: '0 15 0 0',

                        id: 'cmbfactGROUPECOMPAGNIES',
                        store: groupesStore,
                        pageSize: 20,
                        valueField: 'lg_GROUPE_ID',
                        displayField: 'str_LIBELLE',
                        typeAhead: true,
                        hidden: true,
                        flex: 2,
                        queryMode: 'remote',
                        minChars: 2,
                        emptyText: 'Selection un Groupe',
                        listConfig: {
                            loadingText: 'Recherche...',
                            emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                            getInnerTpl: function () {
                                return '<span>{str_LIBELLE}</span>';
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
                            select: function (field, e) {
                                var mystore = Ext.getCmp('facturemanagerID').getStore();

                                mystore.load({params: {
                                        lg_GROUPE_ID: field.getValue(),
                                        dt_fin: Ext.getCmp('datefin').getSubmitValue(),
                                        dt_debut: Ext.getCmp('datedebut').getSubmitValue(),
                                        "search_value": Ext.getCmp('rechecherFacture').getValue(),
                                        CODEGROUPE: Ext.getCmp('rechecherCode').getValue()

                                    }});




                            }


                        }

                    }
                    ,

                    {
                        xtype: 'combobox',
                        id: 'lg_TIERS_PAYANT_ID',
                        flex: 2,
                        store: searchstore,
                        pageSize: 10,
                        valueField: 'lg_TIERS_PAYANT_ID',
                        displayField: 'str_FULLNAME',
                        minChars: 2,
                        queryMode: 'remote',
                        enableKeyEvents: true,
                        emptyText: 'Selectionner tiers payant...',
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

                                Me.onRechClick();
                            }

                        }
                    }, '-', {
                        xtype: 'datefield',
                        id: 'datedebut',
                        name: 'datedebut',
                        emptyText: 'Date debut',
                        flex: 1,
                        submitFormat: 'Y-m-d',
                        maxValue: new Date(),
                        format: 'd/m/Y',
                        listeners: {
                            'change': function (me) {

                                valdatedebut = me.getSubmitValue();
                                Ext.getCmp('datefin').setMinValue(me.getValue());
                            }
                        }
                    }, {
                        xtype: 'tbseparator'
                    }, {
                        xtype: 'datefield',
                        id: 'datefin',
                        name: 'datefin',
                        emptyText: 'Date fin',
                        maxValue: new Date(),
                        submitFormat: 'Y-m-d',
                        flex: 1,
                        format: 'd/m/Y',
                        listeners: {
                            'change': function (me) {
                                valdatefin = me.getSubmitValue();
                                Ext.getCmp('datedebut').setMaxValue(me.getValue());
                            }
                        }
                    }, {
                        xtype: 'tbseparator'
                    }, {
                        text: 'rechercher',
                        tooltip: 'rechercher',
                        iconCls: 'searchicon',
                        flex: 0.8,
                        scope: this,
                        handler: this.onRechClick
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        text: 'Imprimer',
                        tooltip: 'Imprimer',
                        iconCls: 'importicon',
                        flex: 0.7,
                        scope: this,
                        handler: this.onPrint
                    }, {
                        xtype: 'tbseparator'
                    },
                    {
                        text: 'Exporter',
                        scope: this,
                        flex: 0.7,
                        iconCls: 'export_excel_icon',
                        handler: this.exportToExcel
                    }
                ]
            },
            {
                dock: 'bottom',
                xtype: 'pagingtoolbar',
                pageSize: 20,
                id: 'balanceGridpagingbar',
                store: this.store,
                displayInfo: true,
                displayMsg: 'Données affichées {0} - {1} sur {2}',
                emptyMsg: "Pas de donnée à afficher",
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            search_value: '',
                            dt_fin: '',
                            dt_debut: '',
                            lg_customer_id: '',
                            lg_GROUPE_ID: '',
                            CODEGROUPE: ''
                        };
                        var val = Ext.getCmp('rechecherFacture').getValue();
                        var lg_customer_id = "";

                        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null && Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== "") {
                            lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                        }
                        var lg_GROUPE_ID = '';
                        if (Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue() !== null && Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue() !== "") {
                            lg_GROUPE_ID = Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue();
                        }

                        var dt_debut = Ext.getCmp('datedebut').getSubmitValue();
                        var dt_fin = Ext.getCmp('datefin').getSubmitValue();
                        myProxy.setExtraParam('lg_customer_id', lg_customer_id);
                        myProxy.setExtraParam('search_value', val);
                        myProxy.setExtraParam('dt_debut', dt_debut);
                        myProxy.setExtraParam('dt_fin', dt_fin);
                        myProxy.setExtraParam('lg_GROUPE_ID', lg_GROUPE_ID);
                        myProxy.setExtraParam('CODEGROUPE', Ext.getCmp('rechecherCode').getValue());

                    }

                }
            }];
    },

    buildDetailsColumns: function () {
        return [
            {
                header: 'lg_FACTURE_ID',
                dataIndex: 'lg_FACTURE_ID',
                hidden: true,
                width: 50
            }, {
                header: 'lg_TYPE_TIERS_PAYANT_ID',
                dataIndex: 'lg_TYPE_TIERS_PAYANT_ID',
                hidden: true,
                width: 20
            }, {
                header: 'Code Facture',
                dataIndex: 'str_CODE_FACTURE',
                flex: 0.5

            }, {
                header: 'Organisme',
                dataIndex: 'str_CUSTOMER_NAME',
                flex: 1
            }, {
                header: 'P&eacute;riode',
                dataIndex: 'str_PERIODE',
                flex: 1.5

            }, {
                header: 'Nombre de Dossiers',
                dataIndex: 'int_NB_DOSSIER',
                flex: 0.5,
                align: 'right'
            }
            , {
                header: 'Montant Brut',
                dataIndex: 'MONTANTBRUT',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            }
            , {
                header: 'Montant Remise',
                dataIndex: 'MONTANTREMISE',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            }, {
                header: 'Montant Forfaitaire',
                dataIndex: 'MONTANTFORFETAIRE',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            }, {
                header: 'Montant.Net',
                dataIndex: 'dbl_MONTANT_CMDE',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            }

            , {
                header: 'Montant Pay&eacute;',
                dataIndex: 'dbl_MONTANT_PAYE',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            }, {
                header: 'Montant Restant',
                dataIndex: 'dbl_MONTANT_RESTANT',
                flex: 1,
                renderer: amountformat,
                align: 'right'
            },
            {
                header: 'Date',
                dataIndex: 'dt_CREATED',
                flex: 1

            }, {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {

                            if (rec.get('str_STATUT') !== "paid") {

                                if (!rec.get('isALLOWED')) {
                                    return 'lock';
                                } else {
                                    return 'unpaid';
                                }
                            } else {
                                return 'paid';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            if (rec.get('str_STATUT') !== "paid") {
                                if (!rec.get('isALLOWED')) {
                                    return '';
                                } else
                                {
                                    return 'Supprimer ';
                                }


                            } else {
                                return 'Sold&eacute;e ';
                            }
                        },
                        scope: this,
                        handler: this.onRemoveClick

                    }

                ]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        icon: 'resources/images/icons/fam/grid.png',
                        tooltip: 'Detail Bordereau',
                        scope: this,
                        handler: this.viewdetailFacture
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            return 'printable';
                        },
                        getTip: function (v, meta, rec) {
                            return 'Imprimer Bordereau ';
                        },
                        scope: this,
                        handler: this.onPdfClick
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            return 'excel';
                        },
                        getTip: function (v, meta, rec) {
                            return 'Imprimer au format Excel';
                        },
                        scope: this,
                        handler: this.onExel
                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            return 'word';
                        },
                        getTip: function (v, meta, rec) {
                            return 'Imprimer au format Word';
                        },
                        scope: this,
                        handler: this.onword
                    }]
            },

            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {

                            if (rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") {
                                return 'nonregle';
                            } else if (rec.get('str_STATUT') === "group") {
                                return 'groupe';
                            } else if (rec.get('str_STATUT') === 'paid') {
                                return 'regle';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            if (rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") {
                                return 'R&eacute;gler Facture';
                            } else if (rec.get('str_STATUT') === "group") {
                                return 'La facture est générée pour un groupe';
                            } else {
                                return 'Sold&eacute;e ';
                            }
                        },
                        // icon: 'resources/images/icons/fam/folder_go.png',
                        // tooltip: 'R&eacute;gler Facture',
                        scope: this,
                        handler: this.onPaidFactureClick
                    }]
            }
        ];
    },
    reconfigureBalancegrid:
            function () {

                var me = this,
                        grid = Ext.getCmp('facturemanagerID'), pagingbar = Ext.getCmp('balanceGridpagingbar'), query = Ext.getCmp('cmbomode').getValue();

                if (query === 'DETAILS') {
                    Ext.getCmp('cmbfactGROUPECOMPAGNIES').hide();
                    Ext.getCmp('lg_TIERS_PAYANT_ID').show();


                } else {
                    Ext.getCmp('cmbfactGROUPECOMPAGNIES').show();
                    Ext.getCmp('lg_TIERS_PAYANT_ID').hide();

                }
                switch (query) {
                    case 'DETAILS':
                        factureStore.loadPage(1);
                        grid.reconfigure(factureStore, me.buildDetailsColumns());
                        pagingbar.bindStore(factureStore);
                        break;
                    case 'GROUP':
                        groupeStore.loadPage(1);
                        grid.reconfigure(groupeStore, me.buildGroupColumns());
                        pagingbar.bindStore(groupeStore);
                        break;

                }

            },
    buildGroupColumns: function () {
        return [
            {
                xtype: 'rownumberer',
                text: '#',
                width: 45

            },
            {
                header: 'ID',
                dataIndex: 'lg_GROUPE_ID',
                flex: 1,
                hidden: true

            },
            {
                header: 'CODE',
                dataIndex: 'CODEFACTURE',
                flex: 0.8


            },

            {
                header: 'Libellé',
                dataIndex: 'str_LIB',
                flex: 1.5

            },
            {
                header: 'Nombre de factures',
                dataIndex: 'NBFACTURES',
                align: 'right',
                renderer: amountformat,
                flex: 1

            },
            {
                header: 'Montant',
                dataIndex: 'AMOUNT',
                align: 'right',
                renderer: amountformat,
                flex: 1

            },
            {
                header: 'Montant Payé',
                dataIndex: 'AMOUNTPAYE',
                align: 'right',
                renderer: amountformat,
                flex: 1

            },
            {
                header: 'Montant Restant',
                dataIndex: 'MONTANTRESTANT',
                align: 'right',
                renderer: amountformat,
                flex: 1

            },

            {
                header: 'Date  d\'édition',
                dataIndex: 'DATECREATION',
                flex: 1

            },

            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        iconCls: 'detailclients',
                        tooltip: 'Voir les différentes factures',
                        scope: this,
                        handler: function (grid, rowIndex) {
                            var rec = grid.getStore().getAt(rowIndex);

                            new testextjs.view.tierspayantmanagement.groupetierspayant.action.facturegroupe({
                                odatasource: rec.get('CODEFACTURE'),
                                parentview: this,

                                titre: "Les factures du groupe [" + rec.get('str_LIB') + "]"
                            });
                        }

                    }]
            },
            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
//                    hidden:true,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {

                            if (rec.get('STATUT') !== "paid") {
                                return 'nonregle';
                            } else {
                                return 'regle';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            if (rec.get('STATUT') !== "paid") {
                                return 'R&eacute;gler Facture';
                            } else {
                                return 'Sold&eacute;e ';
                            }
                        },
                        // icon: 'resources/images/icons/fam/folder_go.png',
                        // tooltip: 'R&eacute;gler Facture',
                        scope: this,
                        handler: this.onPaidGroupClick
                    }]
            },

            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {
                            return 'printable';
                        },
                        getTip: function (v, meta, rec) {
                            return 'Imprimer la facture ';
                        },
                        scope: this,
                        handler: this.onPrintGroup
                    }]
            },

            {
                xtype: 'actioncolumn',
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        getClass: function (v, meta, rec) {

                            if (rec.get('STATUT') !== "paid") {
                                return 'unpaid';
                            } else {
                                return 'paid';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            if (rec.get('STATUT') !== "paid") {
                                return 'Supprimer ';
                            } else {
                                return 'Sold&eacute;e ';
                            }
                        },
                        scope: this,
                        handler: function (grid, rowIndex) {
                            var rec = grid.getStore().getAt(rowIndex);
                            if (rec.get('STATUT') === "paid") {
                                return;
                            }
                            testextjs.app.getController('App').ShowWaitingProcess();
                            Ext.Ajax.request({
                                url: '../webservices/configmanagement/groupe/ws_transaction.jsp',
                                params: {
                                    mode: 7,
                                    CODEFACTURE: rec.get('CODEFACTURE'),
                                    lg_GROUPE_ID: rec.get('lg_GROUPE_ID')


                                },
                                success: function (response)
                                {
                                    testextjs.app.getController('App').StopWaitingProcess();

                                    var object = Ext.JSON.decode(response.responseText, false);
                                    if (object.status === 1) {
                                        grid.getStore().load();
                                        Ext.MessageBox.alert('INFO', 'Groupe Supprimé');

                                    } else {
                                        Ext.MessageBox.alert('ERROR', 'Erreur de suppression');
                                    }

                                },
                                failure: function (response)
                                {
                                    testextjs.app.getController('App').StopWaitingProcess();

                                }
                            });
                        }
                    }]
            }




        ];
    },
    onAddCreate: function () {
        var xtype = "addeditfacture";
        var alias = 'widget.' + xtype;
        //A DECOMMENTER EN CAS DE PROBLEME
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Cr&eacute;er une facture", "0");


    },
    onPaidGroupClick: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);

        if (rec.get('STATUT') !== "paid") {
            var xtype = "reglementGroupeFacture";
            var alias = 'widget.' + xtype;

            var rec = grid.getStore().getAt(rowIndex);

            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Faire un r&eacute;glement", rec.get('lg_GROUPE_ID'), rec.data);

        }
    },

    onPaidFactureClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        if (rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") {
            var xtype = "doreglementmanager";
            var alias = 'widget.' + xtype;
            //  testextjs.app.getController('App').onLoadNewComponent(xtype, "Faire un r&eacute;glement", "0");
//            var rec = grid.getStore().getAt(rowIndex);
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Faire un r&eacute;glement", rec.get('lg_FACTURE_ID'), rec.data);
        } else if (rec.get('str_STATUT') === "group") {
            var xtype = "groupeInvoices";
            var alias = 'widget.' + xtype;

            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", rec.get('CODEGROUPE'), rec.data);

        }
    },
    viewdetailFacture: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.sm_user.editfacture.action.detailTransactionTiersPayant({
            odatasource: rec.data,
            parentview: this,
            mode: "detail_transaction",
            titre: "Detail Bordereau [" + rec.get('str_CUSTOMER_NAME') + "]"
        });


    },
    viewdetailFactureOld: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);

        var typeFacture = rec.get('lg_TYPE_FACTURE_ID');

        if (typeFacture === "tiers payant") {
            var xtype = "detailfacture";
            var alias = 'widget.' + xtype;
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Detail Bordereau", rec.get('lg_FACTURE_ID'), rec.data);

        } else if (typeFacture === "fournisseur") {

            var xtype = "detailfacturefournisseur";
            var alias = 'widget.' + xtype;
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Detail Bordereau", rec.get('lg_FACTURE_ID'), rec.data);

        } else {
            alert('type facture inconnu');
        }




    },
    onRemoveClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        if (rec.get('str_STATUT') !== "paid" && rec.get('isALLOWED')) {

            Ext.MessageBox.confirm('Message',
                    'confirmez la suppresssion',
                    function (btn) {
                        if (btn == 'yes') {

                            myAppController.ShowWaitingProcess();
                            Ext.Ajax.request({
                                url: url_services_transaction_facturation + 'delete',
                                params: {
                                    lg_FACTURE_ID: rec.get('lg_FACTURE_ID'),
                                    mode: 'delete'
                                },
                                success: function (response)
                                {
                                    myAppController.StopWaitingProcess();

                                    var object = Ext.JSON.decode(response.responseText, false);
                                    if (object.success === "1") {
                                        Ext.MessageBox.alert('Infos', "La facture a &eacute;t&eacute; supprim&eacute;e");
                                    } else {
                                        Ext.MessageBox.show({
                                            title: 'Avertissement',
                                            width: 320,
                                            msg: 'Cette facture a subit un r&eacute;glement',
                                            buttons: Ext.MessageBox.OK,
                                            icon: Ext.MessageBox.WARNING
                                        });

                                    }
                                    grid.getStore().reload();
                                },
                                failure: function (response)
                                {
                                    myAppController.StopWaitingProcess();
                                    var object = Ext.JSON.decode(response.responseText, false);
                                    //  alert(object);

                                    console.log("Bug " + response.responseText);
                                    Ext.MessageBox.alert('Error Message', response.responseText);

                                }
                            });
                            return;
                        }
                    });

        }
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        //alert('edit');

        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "addeditfacture";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Edition de facture", rec.get('lg_FACTURE_ID'), rec.data);



    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecherFacture').getValue();
        var lg_customer_id = "";

        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null && Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== "") {
            lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        }
        var lg_GROUPE_ID = '';
        if (Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue() !== null && Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue() !== "") {
            lg_GROUPE_ID = Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue();
        }

        this.getStore().load({
            params: {
                search_value: val,
                lg_customer_id: lg_customer_id,
                dt_fin: Ext.getCmp('datefin').getSubmitValue(),
                dt_debut: Ext.getCmp('datedebut').getSubmitValue(),
                lg_GROUPE_ID: lg_GROUPE_ID,
                'CODEGROUPE': Ext.getCmp('rechecherCode').getValue()
//               
            }});
//        }, url_services_data_facturation);
    },
    onExel: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        var lg_FACTURE_ID = rec.get('lg_FACTURE_ID');

        window.location = '../invoiceServlet?action=exls&lg_FACTURE_ID=' + lg_FACTURE_ID;



    },
    onword: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        var lg_FACTURE_ID = rec.get('lg_FACTURE_ID');

        window.location = '../invoiceServlet?action=docx&lg_FACTURE_ID=' + lg_FACTURE_ID;



    },

    onPdfClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var typeFacture = rec.get('lg_TYPE_FACTURE_ID');
        var lg_FACTURE_ID = rec.get('lg_FACTURE_ID');
        if (typeFacture === "tiers payant") {
            var linkUrl = url_services_pdf_tiers_payant + lg_FACTURE_ID;
            window.open(linkUrl);

        } else {
            var linkUrl = url_services_pdf_fournisseurs + lg_FACTURE_ID;
            window.open(linkUrl);
        }

    },
    onPrint: function () {

        var lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue(),cmbomode= Ext.getCmp('cmbomode').getValue();
                ;
        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() === null) {
            lg_customer_id = "";
        }
        var search_value = Ext.getCmp('rechecherFacture').getValue();
        
        
       
        var linkUrl = "../webservices/sm_user/facturation/ws_data_relever_facture.jsp" + "?lg_customer_id=" + lg_customer_id + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin + "&search_value=" + search_value ;
        if(cmbomode==='GROUP'){
             var lgGROUPEID = '';
        if (Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue() !== null && Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue() !== "") {
            lgGROUPEID = Ext.getCmp('cmbfactGROUPECOMPAGNIES').getValue();
            linkUrl = "../webservices/sm_user/facturation/ws_relever_facture_groupe.jsp" + "?lg_GROUPE_ID=" + lgGROUPEID + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin ;
        }}
        
        window.open(linkUrl);



    },
    exportToExcel: function () {
        var lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue()
                ;
        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() === null) {
            lg_customer_id = "";
        }
        var search_value = Ext.getCmp('rechecherFacture').getValue();


        window.location = "../FactureDataExport?action=facture&lg_customer_id=" + lg_customer_id + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin + "&search_value=" + search_value;

    },
    onPrintGroup: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var lg_GROUPE_ID = rec.get('lg_GROUPE_ID');
        var CODEFACTURE = rec.get('CODEFACTURE');
        var linkUrl = "../webservices/configmanagement/groupe/group_invoice_pdf.jsp" + "?lg_GROUPE_ID=" + lg_GROUPE_ID + "&CODEFACTURE=" + CODEFACTURE;
        window.open(linkUrl);



    }
});