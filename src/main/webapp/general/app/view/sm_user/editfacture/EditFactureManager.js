/* global Ext */


var url_services_data_facturation = '../webservices/sm_user/facturation/ws_data.jsp';
var url_services_data_typefacture = '../webservices/sm_user/typefacture/ws_data.jsp';
var url_services_transaction_facturation = '../webservices/sm_user/facturation/ws_transaction.jsp?mode=';
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
        'Ext.ux.ProgressBarPager'
    ],
    title: 'Gestion des facturations ',
    frame: true,
    width: "98%",
    height: 580,
    listeners: {
        render: function (grid) {
            this.onRechClick();
        }
    },
    initComponent: function () {

        Me = this;
        var _this = this;

        myAppController = Ext.create('testextjs.controller.App', {});


        var itemsPerPage = 20;
        factureStore = new Ext.data.Store({
            model: 'testextjs.model.Facture',
            pageSize: itemsPerPage,
            autoLoad: false,
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
                    }, '-', {
                        xtype: 'datefield',
                        id: 'datedebut',
                        name: 'datedebut',
                        emptyText: 'Date debut',
                        flex: 1,
                        submitFormat: 'Y-m-d',
                        maxValue: new Date(),
                        format: 'd/m/Y',
                        value: sessionStorage.getItem('dateStart') || null,
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
                        value: sessionStorage.getItem('datefin') || null,
                        listeners: {
                            'change': function (me) {
                                valdatefin = me.getSubmitValue();
                                Ext.getCmp('datedebut').setMaxValue(me.getValue());
                            }
                        }
                    }
                    , '-',
                    {
                        xtype: 'textfield',
                        id: 'rechecherFacture',
                        width: 150,
                        value: sessionStorage.getItem('searchQuery') || '',
                        emptyText: 'Rech',
                        listeners: {
                            specialKey: function (field, e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();
                                }
                            }
                        }
                    }, '-',
                    {
                        xtype: 'textfield',
                        id: 'rechecherCode',
                        width: 150,
                        value: sessionStorage.getItem('codeGroupe') || '',
                        emptyText: 'Rech Code facture',
                        listeners: {
                            specialKey: function (field, e) {
                                if (e.getKey() === e.ENTER) {
                                    Ext.getCmp('facturemanagerID').getStore().load({
                                        params: {
                                            CODEGROUPE: field.getValue()
                                        }
                                    });

                                    sessionStorage.setItem('codeGroupe', field.getValue());


                                }
                            }
                        }
                    }
                    , '-'
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
                        value: sessionStorage.getItem('customer') || null,
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
                    }, {
                        xtype: 'tbseparator'
                    },

                    {
                        xtype: 'combobox',
                        flex: 1,
                        margin: '0 5 0 0',
                        labelWidth: 5,
                        id: 'filtreImpayes',
                        store: Ext.create('Ext.data.ArrayStore', {
                            data: [['', 'Tout'], ['impayes', 'Non réglées ou partiellement réglée'], ['payes', 'Factures réglées']],
                            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}]
                        }),

                        valueField: 'id',
                        displayField: 'libelle',
                        typeAhead: false,
                        queryMode: 'local',
                        value: '',
                        listeners: {

                            select: function (cmp) {
                                Me.onRechClick();
                            }

                        }

                    },
                    {
                        xtype: 'tbseparator'
                    }


                    , {
                        text: 'rechercher',
                        tooltip: 'rechercher',
                        iconCls: 'searchicon',

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
                        id: 'printInvoicereport',

                        scope: this,
                        handler: this.onPrint
                    },

                    {
                        xtype: 'tbseparator'
                    },
                    {
                        text: 'Exporter',
                        scope: this,

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
                        console.log('on beforechange ');
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            search_value: '',
                            dt_fin: '',
                            dt_debut: '',
                            lg_customer_id: '',
                            CODEGROUPE: '',
                            'impayes': ''
                        };
                        var val = Ext.getCmp('rechecherFacture').getValue();
                        var lg_customer_id = "";

                        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== null && Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() !== "") {
                            lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
                        }
                        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
                        if (filtreImpayes == null || filtreImpayes == undefined) {
                            filtreImpayes = '';
                        }

                        var dt_debut = Ext.getCmp('datedebut').getSubmitValue();
                        var dt_fin = Ext.getCmp('datefin').getSubmitValue();
                        myProxy.setExtraParam('lg_customer_id', lg_customer_id);
                        myProxy.setExtraParam('search_value', val);
                        myProxy.setExtraParam('dt_debut', dt_debut);
                        myProxy.setExtraParam('dt_fin', dt_fin);
                        myProxy.setExtraParam('impayes', filtreImpayes);
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
                hidden: true,
                width: 30,
                sortable: false,
                menuDisabled: true,
                items: [{
                        icon: 'resources/images/icons/certication.png',
                        tooltip: 'Certification',
                        scope: this,
                        handler: this.certify
                    }]
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

                            if ((rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") && rec.get('ACTION_REGLER_FACTURE')) {
                                return 'nonregle';
                            } else if (rec.get('str_STATUT') === "group") {
                                return 'groupe';
                            } else if (rec.get('str_STATUT') === 'paid') {
                                return 'regle';
                            } else {
                                return 'x-hide-display';
                            }
                        },
                        getTip: function (v, meta, rec) {
                            if (rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") {
                                if (rec.get('ACTION_REGLER_FACTURE')) {
                                    return 'R&eacute;gler Facture';
                                } else {
                                    return 'Vous n\êtes pas autorisé';
                                }

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
    certify: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);

        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: '../api/v1/fne/invoices/sign/' + rec.get('lg_FACTURE_ID'),
            method: 'GET',
            success: function (response)
            {
                progress.hide();
                Ext.MessageBox.alert('Info', 'Opération effectuée ');

            },
            failure: function (response)
            {
                progress.hide();
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });

    },
    onAddCreate: function () {

        testextjs.app.getController('App').onLoadNewComponent('addeditfacture', "Cr&eacute;er une facture", "0");


    },
    onPaidFactureClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        if ((rec.get('str_STATUT') === "enable" || rec.get('str_STATUT') === "is_Process") && rec.get('ACTION_REGLER_FACTURE')) {
            var xtype = "doreglementmanager";
            var alias = 'widget.' + xtype;

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

                        }
                    });

        }
    },
    onEditClick: function (grid, rowIndex) {
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
        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
        if (filtreImpayes == null || filtreImpayes == undefined) {
            filtreImpayes = '';
        }

        this.getStore().load({
            params: {
                search_value: val,
                lg_customer_id: lg_customer_id,
                dt_fin: Ext.getCmp('datefin').getSubmitValue(),
                dt_debut: Ext.getCmp('datedebut').getSubmitValue(),
                'CODEGROUPE': Ext.getCmp('rechecherCode').getValue(),
                'impayes': filtreImpayes
            }});
        sessionStorage.setItem('impayes', filtreImpayes);
        sessionStorage.setItem('customer', lg_customer_id);
        sessionStorage.setItem('searchQuery', val);
        sessionStorage.setItem('datefin', Ext.getCmp('datefin').getSubmitValue());
        sessionStorage.setItem('dateStart', Ext.getCmp('datedebut').getSubmitValue());
        sessionStorage.setItem('codeGroupe', Ext.getCmp('rechecherCode').getValue());

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
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue();
        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() === null) {
            lg_customer_id = "";
        }
        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
        if (filtreImpayes == null || filtreImpayes == undefined) {
            filtreImpayes = '';
        }
        var search_value = Ext.getCmp('rechecherFacture').getValue();
        var linkUrl = "../webservices/sm_user/facturation/ws_data_relever_facture.jsp" + "?lg_customer_id=" + lg_customer_id + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin + "&search_value=" + search_value + "&impayes=" + filtreImpayes;
        window.open(linkUrl);
    },
    exportToExcel: function () {
        var lg_customer_id = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue()
                ;
        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() === null) {
            lg_customer_id = "";
        }
        let filtreImpayes = Ext.getCmp('filtreImpayes').getValue();
        if (filtreImpayes == null || filtreImpayes == undefined) {
            filtreImpayes = '';
        }
        var search_value = Ext.getCmp('rechecherFacture').getValue();
        window.location = "../FactureDataExport?action=facture&lg_customer_id=" + lg_customer_id + "&dt_debut=" + dt_debut + "&dt_fin=" + dt_fin + "&search_value=" + search_value + "&impayes=" + filtreImpayes;

    }

});