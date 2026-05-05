/* global Ext */


var Me;
var view_title;
//var mydataSource;
var codeFact = "";
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.tierspayantmanagement.groupetierspayant.groupeInvoices', {
    extend: 'Ext.grid.Panel',
    xtype: 'groupeInvoices',
    id: 'groupeInvoicesID',
    title: 'Groupe Factures',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.GroupeModel',
        'testextjs.model.groupFactureModel',
        'testextjs.view.tierspayantmanagement.groupetierspayant.action.facturegroupe',
        'testextjs.view.tierspayantmanagement.groupetierspayant.reglementGroup'

    ],
    frame: true,
    config: {
        odatasource: ''
    },
    initComponent: function () {
        var mydataSource = this.getOdatasource();
        codeFact = mydataSource.CODEGROUPE;
        var groupesInvoice = new Ext.data.Store({
            model: 'testextjs.model.groupFactureModel',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/groupe/ws_groupeInvoices.jsp?CODEGROUPE=' + codeFact,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        var groupesStore = new Ext.data.Store({
            model: 'testextjs.model.GroupeModel',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/groupe/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        Me = this;
        Ext.apply(this, {
            width: '98%',

            minHeight: 570,
            maxHeight: 570,
            cls: 'custompanel',
            id: 'invoiceGRID',

            store: groupesInvoice,
            columns:
                    [
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
                            hidden: false,
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/certication.png',
                                    tooltip: 'Certification',
                                    scope: this,
                                    handler: this.shwoChoiceModal
                                }]
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
                            menuDisabled: true,
                            items: [{
                                    getClass: function (v, meta, rec) {

                                        if (rec.get('STATUT') !== "paid") {
                                            if (rec.get('ACTION_REGLER_FACTURE')) {
                                                return 'nonregle';
                                            } else {
                                                return 'x-hide-display';
                                            }

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
                                    scope: this,
                                    handler: this.onPaidFactureClick
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
                                    handler: this.onPrint
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
                                            Ext.MessageBox.alert('INFO', 'Deja subi un reglement');
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




                    ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [

                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date début',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Du',
                    labelWidth: 20,
                    flex: 1,
                    id: 'dt_start',
                    listeners: {
                        change: function () {
                            Ext.getCmp('dt_end').setMinValue(this.getValue());
                        }
                    }

                }, {
                    xtype: 'tbseparator'
                }

                ,
                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date fin',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Au',
                    labelWidth: 20,
                    flex: 1,
                    id: 'dt_end',
                    listeners: {
                        change: function () {

                            Ext.getCmp('dt_start').setMaxValue(this.getValue());
                        }
                    }

                }, '-',

                {
                    xtype: 'combobox',

                    margin: '0 15 0 0',

                    id: 'cmb_fact_GROUPECOMPAGNIES',
                    store: groupesStore,
                    pageSize: 20,
                    valueField: 'lg_GROUPE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: true,
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
                            var mystore = Ext.getCmp('invoiceGRID').getStore();
                            mystore.getProxy().url = "../webservices/configmanagement/groupe/ws_groupeInvoices.jsp";

                            mystore.load(
                                    {params: {
                                            lg_GROUPE_ID: field.getValue(),
                                            'dt_end': Ext.getCmp('dt_end').getSubmitValue(),
                                            'dt_start': Ext.getCmp('dt_start').getSubmitValue(),
                                            "search_value": Ext.getCmp('groupeSearch').getValue()

                                        }});




                        }


                    }

                }, '-',

                {
                    xtype: 'textfield',
                    id: 'groupeSearch',

                    width: 200,
                    emptyText: 'Rechercher',
                    enableKeyEvents: true,
                    listeners: {

                        specialKey: function (field, e, options) {
                            if (e.getKey() === e.ENTER)
                            {
                                let combox = Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').getValue();
                                if (combox === '' || combox === null) {
                                    combox = '';
                                }
                                const mystore = Ext.getCmp('invoiceGRID').getStore();
                                mystore.getProxy().url = "../webservices/configmanagement/groupe/ws_groupeInvoices.jsp";

                                mystore.load({params: {
                                        lg_GROUPE_ID: combox,
                                        'dt_end': Ext.getCmp('dt_end').getSubmitValue(),
                                        'dt_start': Ext.getCmp('dt_start').getSubmitValue(),
                                        search_value: this.getValue()

                                    }});

                            }


                        }


                    }

                }, {
                    xtype: 'tbseparator'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'ventesearch',
                    width: 100,
                    scope: this,
                    handler: function () {
                        {
                            let combox = Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').getValue();
                            if (combox === '' || combox === null) {
                                combox = '';
                            }
                            codeFact = '';
                            var mystore = Ext.getCmp('invoiceGRID').getStore();
                            mystore.getProxy().url = "../webservices/configmanagement/groupe/ws_groupeInvoices.jsp";
                            mystore.load({params: {
                                    lg_GROUPE_ID: combox,
                                    'dt_end': Ext.getCmp('dt_end').getSubmitValue(),
                                    'dt_start': Ext.getCmp('dt_start').getSubmitValue(),
                                    search_value: Ext.getCmp('groupeSearch').getValue()

                                }});

                        }
                    }
                }



            ],
            bbar: {
                xtype: 'pagingtoolbar',
                store: groupesInvoice,
                dock: 'bottom',
                displayInfo: true,
                listeners: {
                    beforechange: function (page, currentPage) {
                        let myProxy = this.store.getProxy();

                        myProxy.params = {
                            dt_end: '',
                            dt_start: '',
                            lg_GROUPE_ID: '',
                            search_value: ''


                        };
                        let combox = Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').getValue();
                        if (combox === '' || combox === null) {
                            combox = '';
                        }

                        const search_value = Ext.getCmp('groupeSearch').getValue();
                        myProxy.setExtraParam('dt_start', Ext.getCmp('dt_start').getSubmitValue());
                        myProxy.setExtraParam('dt_end', Ext.getCmp('dt_end').getSubmitValue());
                        myProxy.setExtraParam('search_value', search_value);
                        myProxy.setExtraParam('lg_GROUPE_ID', combox);



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
        this.getStore().load();
    },

    onPrint: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        const lg_GROUPE_ID = rec.get('lg_GROUPE_ID');
        const CODEFACTURE = rec.get('CODEFACTURE');
        window.open("../webservices/configmanagement/groupe/group_invoice_pdf.jsp" + "?lg_GROUPE_ID=" + lg_GROUPE_ID + "&CODEFACTURE=" + CODEFACTURE);
    },
    onPaidFactureClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        if (rec.get('STATUT') !== "paid" && rec.get('ACTION_REGLER_FACTURE')) {
            const xtype = "reglementGroupeFacture";
            const alias = 'widget.' + xtype;
            const rec = grid.getStore().getAt(rowIndex);
            testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Faire un r&eacute;glement", rec.get('lg_GROUPE_ID'), rec.data);

        }
    },
    shwoChoiceModal: function (grid, rowIndex) {
        const me = this;
        const rec = grid.getStore().getAt(rowIndex);
        const choice = new Ext.data.Store({
            fields: ['code', 'libelle'],
            data: [{code: 'GROUPE_TAUX_TVA', libelle: 'Facture'},
                {code: 'PRODUIT_DETAIL', libelle: 'Produit'}]

        });

        const win = Ext.create('Ext.window.Window',
                {
                    extend: 'Ext.window.Window',
                    autoShow: true,
                    height: 200,
                    width: '40%',
                    modal: true,
                    title: 'Choix du type fe facturation',
                    closeAction: 'hide',
                    closable: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'form',
                            bodyPadding: 5,
                            modelValidation: true,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    layout: {
                                        type: 'hbox',
                                        align: 'stretch'
                                    },
                                    title: 'Type de facturation',
                                    items: [
                                        {
                                            xtype: 'combo',
                                            fieldLabel: 'Type de facturation',
                                            allowBlank: false,
                                            name: 'typeInvoice',
                                            flex: 1,
                                            valueField: 'code',
                                            displayField: 'libelle',
                                            typeAhead: true,
                                            queryMode: 'local',
                                            pageSize: 2,
                                            emptyText: 'Choisir un type...',
                                            store: choice
                                        }

                                    ]

                                }

                            ],
                            dockedItems: [
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    ui: 'footer',
                                    layout: {
                                        pack: 'end',
                                        type: 'hbox'
                                    },
                                    items: [
                                        {
                                            xtype: 'button',
                                            text: 'Valider',
                                            handler: function (btn) {
                                                const formulaire = btn.up('form');
                                                if (formulaire.isValid()) {

                                                    const formValues = formulaire.getValues();
                                                    me.certify(rec.get('ids'), formValues.typeInvoice, win);
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'button',
                                            text: 'Annuler',
                                            handler: function (btn) {
                                                win.destroy();
                                            }

                                        }
                                    ]
                                }
                            ]
                        }
                    ]

                }


        );

    },
    certify: function (ids, typeInvoice, win) {
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: '../api/v1/fne/invoices/sign-group',
            method: 'GET',
            params: {
                ids,
                typeInvoice

            },
            success: function (response)
            {
                progress.hide();
                win.destroy();
                Ext.MessageBox.alert('Info', 'Opération effectuée ');

            },
            failure: function (response)
            {
                progress.hide();
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });

    }
});