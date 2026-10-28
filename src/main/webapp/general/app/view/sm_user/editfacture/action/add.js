
/* global Ext, LaborexWorkFlow */
//detailfacturevente
var url_services_data_type_facture = '../webservices/sm_user/typefacture/ws_data.jsp';
var url_services_data_detail_facture = '../api/v1/order-detail/list?lg_ORDER_ID=';
var url_services_data_detail_facture_tiers_payant = '../api/v1/facture-tiers-payant/assiette';
var url_services_data_tiers_payant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';
var url_services_data_fournisseur = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_type_tierspayant = '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp';
var url_services_data_client_tierpayant_rp = '../webservices/tierspayantmanagement/tierspayant/ws_clients_data_tierspayants.jsp';
var Me;
var Omode;
var ref;
var OCltgridpanelID;
var famille_id_search;
var in_total_vente;
var int_total_formated;
var int_montant_vente;
var int_montant_achat;
var LaborexWorkFlow_facture;
var listProductSelected;
var myAppController;
var uncheckedList;
var lg_CLIENT_ID = "";
var lg_TYPE_TIERS_PAYANT_ID = "";
var groupetierspayant = [];
var lg_GROUPE_ID = 0;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

/**
 * Verifie qu'au moins un dossier est coche (ou "Tous selectionner" actif) avant de lancer une
 * generation. Compte directement les lignes cochees de la grille : plus fiable que la seule liste
 * interne, qui peut ne pas refleter l'etat affiche.
 *
 * Fonction autonome et NON methode de la vue : appelee depuis des gestionnaires de boutons, elle
 * ne doit dependre d'aucune portee (un bouton declare sans "scope" recevrait le bouton comme
 * "this" et l'appel echouerait).
 */
/*
 * Demande du 28/10 (point 11) : « Créer » ouvre la generation de facture dans une fenetre au-dessus de la liste. Le
 * retour ferme la fenetre (la liste se recharge a sa fermeture) ; ouvert autrement (sans fenetre), retour historique.
 */
function retourListeFactures(titre) {
    var vue = Ext.getCmp('addeditfactureID'), fenetre = vue ? vue.up('window') : null;
    if (fenetre) {
        fenetre.close();
        return;
    }
    testextjs.app.getController('App').onLoadNewComponent('facturemanager', titre, '');
}

function verifierSelectionDossiersAvantGeneration(grille, caseToutSelectionner) {
    if (caseToutSelectionner && caseToutSelectionner.getValue()) {
        return true;
    }
    var nbCoches = 0;
    if (grille && grille.getStore()) {
        grille.getStore().each(function (rec) {
            if (rec.get('isChecked')) {
                nbCoches++;
            }
        });
    }
    if (nbCoches === 0 && (!listProductSelected || listProductSelected.length === 0)) {
        Ext.MessageBox.alert('Information',
                'Aucun dossier n\'est coch\u00e9.<br/>Cochez au moins un dossier, ou cochez '
                + '"Tous s\u00e9lectionner" pour tout facturer, avant de g\u00e9n\u00e9rer la facture.');
        return false;
    }
    return true;
}

Ext.define('testextjs.view.sm_user.editfacture.action.add', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.Grossiste',
        'testextjs.model.OrderDetail',
        'testextjs.controller.LaborexWorkFlow',
        'Ext.ux.CheckColumn',
        'Ext.selection.CheckboxModel',
        'testextjs.model.DossierFacture',
        'testextjs.model.DataTiersPayant',
        'testextjs.model.statistics.bonsModel',
        'testextjs.model.GroupeTierspayantModel',
        'testextjs.model.GroupeModel'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
        closable: false,
        nameintern: ''
        //  headerPosition :'top'
    },
    xtype: 'addeditfacture',
    id: 'addeditfactureID',
    frame: true,
    title: 'G&eacute;n&eacute;rer une facture',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {
        groupetierspayant = [];
        Me = this;
        var itemsPerPage = 15;
        famille_id_search = "";
        in_total_vente = 0;
        int_total_formated = 0;
        lg_GROUPE_ID = 0;
        ref = this.getNameintern();
        titre = this.getTitre();
        ref = this.getNameintern();
        LaborexWorkFlow_facture = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        myAppController = Ext.create('testextjs.controller.App', {});
        url_services_data_detail_facture = '../api/v1/order-detail/list?lg_ORDER_ID=' + ref;
        var groupesStore = new Ext.data.Store({
            model: 'testextjs.model.GroupeModel',
            pageSize: 20, 
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/groupe-tierspayant/facture-data',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });


        var searchstore = Ext.create('testextjs.store.Statistics.TiersPayans');
        listProductSelected = [];
        uncheckedList = [];
        var store_type_filter = Ext.create('Ext.data.Store', {
            autoLoad: true,
            fields: ['value', 'name'],
            data: [
                {"value": "1", "name": "Sélection massive"},
                {"value": "2", "name": "Type tiers payant"},
                {"value": "5", "name": "Par tiers payant"},
                {"value": "4", "name": "Tous les tiers payant"},
                {"value": "6", "name": "Par groupes et compagnies d'assurances"},
                {"value": "7", "name": "Par Sélection de bons"}
            ]
        });

        var colunms = [
            {header: "ID", flex: 1, sortable: true, dataIndex: 'lg_PCMT_ID', hidden: true},
             {header: "CLIENT", flex: 1.5, sortable: true, dataIndex: 'CLIENT_FULLNAME'},
               {header: "DATE", flex: 1, sortable: true, dataIndex: 'DATE_VENTE'},
            {header: "REFERENCE BON", flex: 0.7, sortable: true, dataIndex: 'REFBON'},
             {header: "AMOUNT VENTE", flex: 0.7, sortable: true, dataIndex: 'AMOUNT_VENTE', renderer: amountformat, align: 'right'},
            {header: "MONTANT", flex: 0.7, sortable: true, dataIndex: 'AMOUNT', renderer: amountformat, align: 'right'},
            {header: "", flex: 0.4, dataIndex: 'isChecked', xtype: 'checkcolumn', listeners: {checkChange: this.onCheckChangeSLECT}}


        ];



       
        var colstpgrp = [
            {header: "ID", flex: 1, sortable: true, dataIndex: 'lgTIERSPAYANTID', hidden: true},
            {header: "Tiers-payant", flex: 1.5, sortable: true, dataIndex: 'str_LIB'},
            {header: "Nombre de dossiers", flex: 1.5, sortable: true, dataIndex: 'NBBONS', renderer: amountformat, align: 'right'},
            {header: "Montant", flex: 1.5, sortable: true, dataIndex: 'AMOUNT', renderer: amountformat, align: 'right'},
            {header: "", flex: 0.4, dataIndex: 'isChecked', xtype: 'checkcolumn', listeners: {checkChange: this.onGroupCheckChange}}
        ];
       
        var tpstore = new Ext.data.Store({
            model: 'testextjs.model.GroupeTierspayantModel',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/groupe-tierspayant/bons-groupe',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
       
        var storenotinSelect = new Ext.data.Store({
            model: 'testextjs.model.statistics.bonsModel',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/groupe-tierspayant/tous-bons',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        
        store_detail_tiers_payant = new Ext.data.Store({
            model: 'testextjs.model.DataTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detail_facture_tiers_payant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            listeners: {
                // la recherche de la selection massive est transmise a chaque chargement
                // (chargement initial, touche Entree et pagination)
                beforeload: function (st) {
                    var champ = Ext.getCmp('rechAssietteMassive');
                    st.getProxy().setExtraParam('search_value', champ ? (champ.getValue() || '') : '');
                }
            }
        });
        store_detail_facture_fournisseur = new Ext.data.Store({
            model: 'testextjs.model.Facture',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_detail_facture,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        store_type_tierpayant = new Ext.data.Store({
            model: 'testextjs.model.TypeTiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                // URL en dur : la globale url_services_data_type_tierspayant est redefinie par
                // d'autres ecrans selon l'ordre de chargement et ramenait l'ancienne JSP
                url: '../api/v1/reglement-facture/types-tierspayant',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });



        Ext.apply(this, {
            width: '96%',
//            cls: 'custompanel',
            fieldDefaults: {
                labelAlign: 'left',
                // labelWidth: 150,
                anchor: '100%',
                msgTarget: 'side'
            },
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 0
            },
            defaults: {
                flex: 1
            },
            id: 'panelID',
            items: [

                {
                    xtype: 'container',
                    border: false,
                    items: [{
                            xtype: 'fieldset',
                            title: 'Infos G&eacute;n&eacute;rales',
                            collapsible: true,
                            padding: '3 15 3 15',
                            defaultType: 'textfield',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    defaultType: 'textfield'
                                    ,
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Filtrer par',
                                            labelWidth: 70,
                                            name: 'MODE_SELECTION',
                                            margin: '0 15 0 0',
                                            id: 'MODE_SELECTION',
                                            store: store_type_filter,
                                            valueField: 'value',
                                            displayField: 'name',
                                            typeAhead: true,
                                            width: '50%',
                                            queryMode: 'local',
                                            emptyText: 'Filtrer par ...',
                                            listeners: {
                                                select: function () {
                                                    lg_GROUPE_ID = 0;
                                                    listProductSelected = [];
                                                    selectedrecords = [];
                                                    var value = this.getValue();
                                                    var grid = Ext.getCmp('gridpanelID');
                                                    switch (value) {
                                                        case "2":
                                                            Ext.getCmp('cmb_TYPE_TIERS_PAYANT').show();
                                                            Ext.getCmp('cmb_fact_TIERS_PAYANT').hide();
                                                            Ext.getCmp('All').hide();
                                                            if (grid.columns[4].isVisible()) {
                                                                grid.columns[4].setVisible(false);
                                                            }
                                                            Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').hide();
                                                            Ext.getCmp('detailfacturevente').getLayout().setActiveItem(0);
                                                            break;
                                                        case "1":
                                                            Ext.getCmp('cmb_TYPE_TIERS_PAYANT').hide();
                                                            Ext.getCmp('cmb_fact_TIERS_PAYANT').hide();
                                                            Ext.getCmp('All').show();
                                                            Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').hide();
                                                            grid.columns[4].setVisible(true);
                                                            Ext.getCmp('detailfacturevente').getLayout().setActiveItem(0);
                                                            break;
                                                        case "4":
                                                            Ext.getCmp('cmb_TYPE_TIERS_PAYANT').hide();
                                                            Ext.getCmp('cmb_fact_TIERS_PAYANT').hide();
                                                            Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').hide();
                                                            Ext.getCmp('All').hide();
                                                            if (grid.columns[4].isVisible()) {
                                                                grid.columns[4].setVisible(false);
                                                            }
                                                            Ext.getCmp('detailfacturevente').getLayout().setActiveItem(0);
                                                            break;
                                                        case "5":
                                                            Ext.getCmp('cmb_TYPE_TIERS_PAYANT').hide();
                                                            Ext.getCmp('cmb_fact_TIERS_PAYANT').show();
                                                            Ext.getCmp('All').hide();
                                                            if (grid.columns[4].isVisible()) {
                                                                grid.columns[4].setVisible(false);
                                                            }
                                                            Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').hide();
                                                            Ext.getCmp('detailfacturevente').getLayout().setActiveItem(0);
                                                            break;
                                                        case "6":
                                                            Ext.getCmp('cmb_TYPE_TIERS_PAYANT').hide();
                                                            Ext.getCmp('cmb_fact_TIERS_PAYANT').hide();
                                                            Ext.getCmp('All').hide();
                                                            Ext.getCmp('selectGROUPSELECT').setValue(false);
                                                            Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').clearValue();
                                                            Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').show();
                                                            break;
                                                        case "7":
                                                            Ext.getCmp('cmb_TYPE_TIERS_PAYANT').hide();
                                                            Ext.getCmp('cmb_fact_TIERS_PAYANT').clearValue();
                                                            Ext.getCmp('cmb_fact_TIERS_PAYANT').hide();
                                                            Ext.getCmp('All').hide();
                                                            Ext.getCmp('cmb_fact_TIERS_PAYANT').show();
                                                            Ext.getCmp('cmb_fact_GROUPECOMPAGNIES').hide();
                                                            Ext.getCmp('detailfacturevente').getLayout().setActiveItem(2);
                                                            Ext.getCmp('selectALLSELECT').setValue(false);

                                                            break;


                                                    }


                                                }

                                            }
                                        },
                                        {
                                            xtype: 'combobox',
                                            hidden: true,
                                            fieldLabel: 'Type tiers payant',
                                            width: '50%',
                                            name: 'cmb_TYPE_TIERS_PAYANT',
                                            margin: '0 15 0 0',
                                            labelWidth: 120,
                                            id: 'cmb_TYPE_TIERS_PAYANT',
                                            store: store_type_tierpayant,
                                            valueField: 'lg_TYPE_TIERS_PAYANT_ID',
                                            displayField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            emptyText: 'Sélection type tiers payant'
                                        },
                                        {
                                            xtype: 'combobox',
                                            hidden: true,
                                            fieldLabel: 'Tiers payant',
                                            width: '50%',
                                            margin: '0 15 0 0',
                                            labelWidth: 120,
                                            id: 'cmb_fact_TIERS_PAYANT',
                                            store: searchstore,
                                            pageSize: 20,
                                            valueField: 'lg_TIERS_PAYANT_ID',
                                            displayField: 'str_FULLNAME',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            minChars: 2,
                                            emptyText: 'Sélectionnez un tiers payant',
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
                                                select: function (fiels, e) {
                                                    if (Ext.getCmp('detailfacturevente').getLayout().getActiveItem().id === "SELECTIONGRID") {
                                                        var gridStoreSelect = Ext.getCmp('notINGridSELECT').getStore();

                                                        gridStoreSelect.load({params: {
                                                                lg_TIERS_PAYANT_ID: fiels.getValue(),
                                                                search_value: Ext.getCmp('rechercherSELECT').getValue(),
                                                                dt_start: Ext.getCmp('dt_debut').getSubmitValue(),
                                                                dt_end: Ext.getCmp('dt_fin').getSubmitValue()

                                                            }});
                                                    }
                                                }


                                            }

                                        },

                                        {
                                            xtype: 'combobox',
                                            hidden: true,
                                            fieldLabel: 'Groupes ',
                                            width: '50%',
                                            margin: '0 15 0 0',
                                            labelWidth: 100,
                                            id: 'cmb_fact_GROUPECOMPAGNIES',
                                            store: groupesStore,
                                            pageSize: 20,
                                            valueField: 'lg_GROUPE_ID',
                                            displayField: 'str_LIBELLE',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            minChars: 2,
                                            emptyText: 'Sélectionnez un Groupe',
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
                                                    listProductSelected = [];
                                                    selectedrecords = [];
                                                    lg_GROUPE_ID = field.getValue();
                                                    tpstore.load({params: {
                                                            lg_GROUPE_ID: field.getValue(),
                                                            'dt_end': Ext.getCmp('dt_fin').getSubmitValue(),
                                                            'dt_start': Ext.getCmp('dt_debut').getSubmitValue(),
                                                            search_value: Ext.getCmp('rechercherINGROUPE').getValue()
                                                        }});



                                                    Ext.getCmp('detailfacturevente').getLayout().setActiveItem(1);
                                                }


                                            }

                                        }

                                    ]
                                }]
                        }
                    ]

                },
                {
                    xtype: 'container',
                    border: false,
                    margin: '-10 0 0 0 ',
                    items: [{
                            xtype: 'fieldset',
                            //  title: 'Ajout Produit',
                            collapsible: true,
                            defaultType: 'textfield',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'fieldcontainer',
                                    // fieldLabel: 'Produit',
                                    layout: 'hbox',
                                    //combineErrors: true,
                                    defaultType: 'textfield',
                                    defaults: {
                                        // hideLabel: 'true'
                                    },
                                    items: [
                                        {
                                            xtype: 'datefield',
                                            fieldLabel: 'Du',
                                            id: 'dt_debut',
                                            labelWidth: 20,
                                            width: 200,
                                            name: 'dt_debut',
                                            submitFormat: 'Y-m-d',
                                            format: 'd/m/Y',
                                            value: new Date(),
                                            emptyText: 'Date de debut',
                                            default: new Date(),
                                            listeners: {
                                                'change': function (me) {

                                                    Ext.getCmp('dt_fin').setMinValue(me.getValue());
                                                }
                                            }
                                            // limited to the current date or prior

                                        },
                                        {
                                            xtype: 'datefield',
                                            fieldLabel: 'Au',
                                            margin: '0 0 0 15',
                                            id: 'dt_fin',
                                            name: 'dt_fin',
                                            emptyText: 'Date de fin',
                                            labelWidth: 20,
                                            width: 200,
                                            submitFormat: 'Y-m-d',
                                            format: 'd/m/Y',
                                            value: new Date(),
                                            maxValue:new Date(),
                                            listeners: {
                                                'change': function (me) {

                                                    Ext.getCmp('dt_debut').setMaxValue(me.getValue());
                                                }
                                            }
                                        }, {
                                            text: 'Rechercher',
                                            id: 'btn_add',
                                            margins: '0 0 0 15',
                                            xtype: 'button',
                                            handler: this.onbtnadd

                                        }, {
                                            xtype: 'checkbox',
                                            margins: '0 0 5 15',
                                            boxLabel: 'Tous s&eacute;lectioner',
                                            id: 'All',
                                            hidden: true,
                                            checked: false,
                                            listeners: {
                                                change: function () {
                                                    var grid = Ext.getCmp('gridpanelID');
                                                    var CODEstore = grid.getStore();
                                                    if (this.getValue()) {
                                                        for (var i = 0; i < CODEstore.getCount(); i++) {
                                                            var record = CODEstore.getAt(i);
                                                            record.set('isChecked', true);
                                                        }


                                                    } else {
                                                        CODEstore.each(function (rec, id) {
                                                            rec.set('isChecked', false);



                                                        });
                                                    }
                                                    CODEstore.commitChanges();
                                                    grid.reconfigure(CODEstore);
                                                }
                                            }
                                        }]
                                }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    id: 'detailfacturevente',
                    title: 'Gestion des bons',
                    //  hidden: true,
                    collapsible: false,

                    layout: 'card',
                    /*defaults: {
                     anchor: '100%'
                     },*/
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridpanelID',
                            store: store_detail_tiers_payant,
                            minHeight: 350,
                            tbar: [{
                                    xtype: 'textfield',
                                    id: 'rechAssietteMassive',
                                    flex: 1,
                                    emptyText: 'Rechercher un tiers payant...',
                                    enableKeyEvents: true,
                                    listeners: {
                                        specialKey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                store_detail_tiers_payant.loadPage(1);
                                            }
                                        }
                                    }
                                }, {
                                    text: 'Rechercher',
                                    iconCls: 'searchicon',
                                    handler: function () {
                                        store_detail_tiers_payant.loadPage(1);
                                    }
                                }],
                            columns: [
                                {
                                    header: 'ID tiers Payant',
                                    dataIndex: 'lg_TIERS_PAYANT_ID',
                                    hidden: true,
                                    width: 40
                                }
                                , {
                                    header: 'Tiers payant',
                                    dataIndex: 'str_FULLNAME',
                                    flex: 1
                                }
                                , {
                                    header: 'Nombre de dossiers',
                                    dataIndex: 'str_ACOUNT_DOSSIER',
                                    flex: 1
                                }, {
                                    header: 'Montant',
                                    dataIndex: 'dbl_MONTANT',
                                    renderer: amountformat,
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    xtype: 'checkcolumn',
                                    dataIndex: 'isChecked',
                                    width: 50,
                                    listeners: {
                                        checkChange: this.onCheckChange
                                    }

                                }
                            ],
                            //  selModel: selModel,
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_detail_tiers_payant,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            }
                            ,
                            dockedItems:
                                    {
                                        xtype: 'toolbar',
                                        ui: 'footer',
                                        dock: 'bottom',
                                        border: '0',
                                        items: ['->',
                                            {
                                                text: 'G&eacute;n&eacute;rer facture',
                                                id: 'btn_create_facture',
                                                iconCls: 'icon-clear-group',
                                                scope: this,
                                                hidden: false,
                                                //disabled: true,
                                                handler: this.CreateFacture
                                            }, {
                                                text: 'RETOUR',
                                                id: 'btn_cancel',
                                                iconCls: 'icon-clear-group',
                                                scope: this,
                                                hidden: false,
                                                //disabled: true,
                                                handler: this.onbtncancel
                                            }
                                        ]
                                    }

                        },
                        /*  *******************************FIN ANCIENNE FACTURATION*******************************************************************/
                        {xtype: 'panel',

                            layout: 'anchor',
                            id: 'myWizard',
                            dockedItems:
                                    {
                                        xtype: 'toolbar',
                                        ui: 'footer',
                                        dock: 'bottom',
                                        border: '0',
                                        items: ['->',

                                            {
                                                text: 'G&eacute;n&eacute;rer facture',
                                                xtype: 'button',

                                                /* iconCls: 'invoice',*/iconCls: 'icon-clear-group',
                                                tooltip: 'Générer',

                                                scope: this,
                                                handler: this.onGenerateInvoice
                                            }, {
                                                text: 'RETOUR',

                                                iconCls: 'icon-clear-group',
                                                scope: this,
                                                hidden: false,

                                                handler: this.onbtncancel
                                            }
                                        ]
                                    }
                            ,
                            items: [
                                {
                                    xtype: 'panel',
                                    border: false,
                                    layout: 'anchor',

                                    items: [

                                        {

                                            xtype: 'grid',
                                            id: 'INGridGROUPE',
                                            flex: 1,
                                            margin: '0 15 5 0',
                                            minHeight: 300,
                                            title: 'Chosissez les Tiers-payants des dossiers à facturer',

                                            stripeRows: true,

                                            store: tpstore,

                                            columns: colstpgrp,
                                            tbar: [
                                                {
                                                    xtype: 'textfield',
                                                    id: 'rechercherINGROUPE',

                                                    flex: 0.5,
                                                    emptyText: 'Rech', enableKeyEvents: true,
                                                    listeners: {

                                                        specialKey: function (field, e, options) {
                                                            if (e.getKey() === e.ENTER)
                                                            {
                                                                var storeC = Ext.getCmp('INGridGROUPE').getStore();

                                                                storeC.load({
                                                                    params: {
                                                                        lg_GROUPE_ID: lg_GROUPE_ID,

                                                                        dt_start: Ext.getCmp('dt_debut').getSubmitValue(),
                                                                        dt_end: Ext.getCmp('dt_fin').getSubmitValue(),
                                                                        search_value: field.getValue()
                                                                    }
                                                                });

                                                            }

                                                        }
                                                    }

                                                },
                                                {

                                                    xtype: 'checkbox',
                                                    margins: '0 0 5 5',
                                                    boxLabel: 'Tous S&eacute;lectionner',
                                                    id: 'selectGROUPSELECT',
                                                    checked: false,
                                                    listeners: {
                                                        change: function () {

                                                            //
                                                            var grid = Ext.getCmp('INGridGROUPE');
                                                            var CODEstore = grid.getStore();
                                                            if (this.getValue()) {
                                                                listProductSelected = [];


                                                                for (var i = 0; i < CODEstore.getCount(); i++) {
                                                                    var record = CODEstore.getAt(i);
                                                                    record.set('isChecked', true);

                                                                }


                                                            } else {
                                                                selectedrecords = [];
                                                                CODEstore.each(function (rec, id) {
                                                                    rec.set('isChecked', false);
                                                                });

                                                            }
                                                            CODEstore.commitChanges();
                                                            grid.reconfigure(CODEstore);

                                                        }
                                                    }
                                                }


                                            ],
                                            bbar: {
                                                xtype: 'pagingtoolbar',
                                                pageSize: itemsPerPage,
                                                store: tpstore,
                                                displayInfo: true
                                                ,
                                                listeners: {
                                                    beforechange: function (page, currentPage) {
                                                        var myProxy = this.store.getProxy();
                                                        myProxy.params = {
                                                            dt_start: '',
                                                            dt_end: '',
                                                            search_value: '',
                                                            lg_GROUPE_ID: ''
                                                        };
                                                        myProxy.setExtraParam('lg_GROUPE_ID', lg_GROUPE_ID);
                                                        myProxy.setExtraParam('dt_start', Ext.getCmp('dt_debut').getSubmitValue());
                                                        myProxy.setExtraParam('dt_end', Ext.getCmp('dt_fin').getSubmitValue());

                                                        myProxy.setExtraParam('search_value', Ext.getCmp('rechercherINGROUPE').getValue());

                                                    }

                                                }


                                            }
                                        }
                                    ]

                                }
                            ]


                        },

                        /* fin GROUPE ******************************************************************************/
                        {xtype: 'panel',
//                    border: false,
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            id: 'SELECTIONGRID',
                            dockedItems:
                                    {
                                        xtype: 'toolbar',
                                        ui: 'footer',
                                        dock: 'bottom',
                                        border: '0',
                                        items: ['->',

                                            {
                                                text: 'G&eacute;n&eacute;rer facture',
                                                xtype: 'button',

                                                /* iconCls: 'invoice',*/iconCls: 'icon-clear-group',
                                                tooltip: 'Générer',

                                                scope: this,
                                                handler: this.onGenerateSelectedBonsInvoice
                                            }, {
                                                text: 'RETOUR',

                                                iconCls: 'icon-clear-group',
                                                scope: this,
                                                hidden: false,
                                                //disabled: true,
                                                handler: this.onbtncancel
                                            }
                                        ]
                                    }
                            ,
                            items: [

                                {xtype: 'panel',
                                    border: false,
                                    layout: 'hbox',
                                    items: [
                                        {

                                            xtype: 'gridpanel',
                                            id: 'notINGridSELECT',
                                            minHeight: 400,
                                            flex: 2,

                                            margin: '0 5 5 0',
                                            title: 'Les bons à facturer',
                                            store: storenotinSelect,

                                            stripeRows: true,

                                            columns: colunms,
                                            tbar: [

                                                {
                                                    xtype: 'textfield',
                                                    id: 'rechercherSELECT',
                                                    name: 'rechercher',
                                                    flex: 1,

                                                    emptyText: 'Rech',
                                                    enableKeyEvents: true,
                                                    listeners: {

                                                        specialKey: function (field, e, options) {


                                                            if (e.getKey() === e.ENTER)
                                                            {
                                                                var gridStoreSelect = Ext.getCmp('notINGridSELECT').getStore();
                                                                var lg_TIERS_PAYANT_ID = Ext.getCmp('cmb_fact_TIERS_PAYANT').getValue();
                                                                if (lg_TIERS_PAYANT_ID === '' || lg_TIERS_PAYANT_ID === null) {
                                                                    lg_TIERS_PAYANT_ID = '';
                                                                }


                                                                gridStoreSelect.load({params: {
                                                                        lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID,
                                                                        search_value: Ext.getCmp('rechercherSELECT').getValue(),
                                                                        dt_start: Ext.getCmp('dt_debut').getSubmitValue(),
                                                                        dt_end: Ext.getCmp('dt_fin').getSubmitValue()

                                                                    }});

                                                            }

                                                        }
                                                    }
                                                }, '-',

                                                {

                                                    xtype: 'checkbox',
                                                    margins: '0 0 5 5',
                                                    boxLabel: 'Tous S&eacute;lectionner',
                                                    id: 'selectALLSELECT',
                                                    checked: false,
                                                    listeners: {
                                                        change: function () {

                                                            //
                                                            var grid = Ext.getCmp('notINGridSELECT');
                                                            var CODEstore = grid.getStore();
                                                            if (this.getValue()) {
                                                                listProductSelected = [];


                                                                for (var i = 0; i < CODEstore.getCount(); i++) {
                                                                    var record = CODEstore.getAt(i);
                                                                    record.set('isChecked', true);

                                                                }


                                                            } else {
                                                                selectedrecords = [];
                                                                CODEstore.each(function (rec, id) {
                                                                    rec.set('isChecked', false);
                                                                });

                                                            }
                                                            CODEstore.commitChanges();
                                                            grid.reconfigure(CODEstore);

                                                        }
                                                    }
                                                }




                                            ],
                                            bbar: {
                                                xtype: 'pagingtoolbar',
                                                pageSize: itemsPerPage,
                                                store: storenotinSelect,
                                                displayInfo: true
                                                ,
                                                listeners: {
                                                    beforechange: function (page, currentPage) {
                                                        var myProxy = this.store.getProxy();
                                                        myProxy.params = {

                                                            search_value: '',
                                                            dt_start: '',
                                                            dt_end: '',
                                                            lg_TIERS_PAYANT_ID: ''

                                                        };

                                                        var lg_TIERS_PAYANT_ID = Ext.getCmp('cmb_fact_TIERS_PAYANT').getValue();
                                                        if (lg_TIERS_PAYANT_ID === '' || lg_TIERS_PAYANT_ID === null) {
                                                            lg_TIERS_PAYANT_ID = '';
                                                        }

                                                        myProxy.setExtraParam('search_value', Ext.getCmp('rechercherSELECT').getValue());

                                                        myProxy.setExtraParam('dt_start', Ext.getCmp('dt_debut').getSubmitValue());
                                                        myProxy.setExtraParam('dt_end', Ext.getCmp('dt_fin').getSubmitValue());
                                                        myProxy.setExtraParam('lg_TIERS_PAYANT_ID', lg_TIERS_PAYANT_ID);
                                                    }

                                                }


                                            }
                                        }
                                    ]
                                }

                            ]


                        }
                        /*********************************FIN SELECTION ************************************/

                    ]

                }


            ]


        });

        this.callParent();
//        OCltgridpanelID = Ext.getCmp('gridpanelID');
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
        var grid = Ext.getCmp('gridpanelID');
        var all = Ext.getCmp('All');

        grid.getStore().on(
                "load", function () {


                    var CODEstore = grid.getStore();
                    if (listProductSelected.length > 0) {
                        var record;
                        Ext.each(listProductSelected, function (lg, index) {
                            CODEstore.each(function (r, id) {
                                record = CODEstore.findRecord('lg_TIERS_PAYANT_ID', lg);
                                if (record !== null) {

                                    record.set('isChecked', 'true');
                                }


                                // alert (r.get('lg_DOSSIER_FACTURE')) ;
                            });

                        });
                        if (record !== null) {
                            grid.reconfigure(grid.getStore());
                        }

                    }
                    if (all.getValue()) {
                        CODEstore.each(function (r, id) {
                            r.set('isChecked', 'true');

                        });

                        CODEstore.each(function (r, id) {
                            Ext.each(uncheckedList, function (lg, index) {

                                if (r.get('lg_TIERS_PAYANT_ID') === lg) {
                                    r.set('isChecked', 'false');
                                }

                            });

                            grid.reconfigure(grid.getStore());
                        });



                        grid.reconfigure(grid.getStore());
                    }

                }

        );
        var storeGR = Ext.getCmp('INGridGROUPE');
        var selectGROUPSELECT = Ext.getCmp('selectGROUPSELECT');
        storeGR.getStore().on(
                "load", function () {


                    var CODEstore = storeGR.getStore();
                    if (listProductSelected.length > 0) {
                        var record;
                        Ext.each(listProductSelected, function (lg, index) {
                            CODEstore.each(function (r, id) {
                                record = CODEstore.findRecord('lgTIERSPAYANTID', lg);
                                if (record !== null) {

                                    record.set('isChecked', true);
                                }

                            });

                        });
                        if (record !== null) {
                            grid.reconfigure(grid.getStore());
                        }

                    }

                    if (selectGROUPSELECT.getValue()) {

                        CODEstore.each(function (r, id) {

                            r.set('isChecked', true);

                        });

                        CODEstore.each(function (r, id) {
                            Ext.each(selectedrecords, function (lg, index) {

                                if (r.get('lgTIERSPAYANTID') === lg) {
                                    r.set('isChecked', false);
                                }

                            });

                            grid.reconfigure(grid.getStore());
                        });



                        grid.reconfigure(grid.getStore());
                    }

                }

        );
        /**********************************************************/

        var notINGridSELECT = Ext.getCmp('notINGridSELECT');
        var selectALLSELECT = Ext.getCmp('selectALLSELECT');




        notINGridSELECT.getStore().on(
                "load", function () {


                    var CODEstore = notINGridSELECT.getStore();
                    if (listProductSelected.length > 0) {
                        var record;
                        Ext.each(listProductSelected, function (lg, index) {
                            CODEstore.each(function (r, id) {
                                record = CODEstore.findRecord('lg_PCMT_ID', lg);
                                if (record !== null) {

                                    record.set('isChecked', true);
                                }

                            });

                        });
                        if (record !== null) {
                            grid.reconfigure(grid.getStore());
                        }

                    }

                    if (selectALLSELECT.getValue()) {

                        CODEstore.each(function (r, id) {

                            r.set('isChecked', true);

                        });

                        CODEstore.each(function (r, id) {
                            Ext.each(selectedrecords, function (lg, index) {

                                if (r.get('lg_PCMT_ID') === lg) {
                                    r.set('isChecked', false);
                                }

                            });

                            grid.reconfigure(grid.getStore());
                        });



                        grid.reconfigure(grid.getStore());
                    }

                }

        );
        /***********************************************************/

    },
    loadStore: function () {
        Ext.getCmp('gridpanelID').getStore().load({
            callback: function (records, operation, success) {

                Ext.getCmp('gridpanelID').columns[4].setVisible(false);
            }
        });
    },
    onStoreLoad: function () {
        var ObStore = Ext.getCmp('gridpanelID');
        LaborexWorkFlow.findColumnByDataIndex(ObStore, 2).setVisible(false);

    },
    onbtncancel: function () {

        var xtype = "facturemanager";
        retourListeFactures("");
    },
    onbtnadd: function () {
        var activeIndex = Ext.getCmp('detailfacturevente').getLayout().getActiveItem().id;

        if (activeIndex === "gridpanelID") {


            Me.onOldInvoiceVersion();
        } else if (activeIndex === "myWizard") {

            var val = Ext.getCmp('rechercherINGROUPE').getValue();

            var gridStore = Ext.getCmp('INGridGROUPE').getStore();


            gridStore.load({params: {
                    lg_GROUPE_ID: lg_GROUPE_ID,
                    search_value: val,
                    dt_start: Ext.getCmp('dt_debut').getSubmitValue(),
                    dt_end: Ext.getCmp('dt_fin').getSubmitValue()

                }
            });
        } else {
            var gridStoreSelect = Ext.getCmp('notINGridSELECT').getStore();
            var lg_TIERS_PAYANT_ID = Ext.getCmp('cmb_fact_TIERS_PAYANT').getValue();
            if (lg_TIERS_PAYANT_ID === '' || lg_TIERS_PAYANT_ID === null) {
                lg_TIERS_PAYANT_ID = '';
            }


            gridStoreSelect.load({params: {
                    lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID,
                    search_value: Ext.getCmp('rechercherSELECT').getValue(),
                    dt_start: Ext.getCmp('dt_debut').getSubmitValue(),
                    dt_end: Ext.getCmp('dt_fin').getSubmitValue()

                }});
        }



    },

    onGenerateInvoice: function () {
        if (Ext.getCmp('INGridGROUPE').getStore().getCount() === 0) {
            return;
        }
        // Aucun dossier coche : on n'engage pas la generation (evite de facturer par megarde
        // tout le groupe alors que l'utilisateur n'a rien choisi)
        if (!verifierSelectionDossiersAvantGeneration(Ext.getCmp('INGridGROUPE'),
                Ext.getCmp('selectGROUPSELECT'))) {
            return;
        }
        var mode = 0;
        var selectALL = Ext.getCmp('selectGROUPSELECT').getValue();
        if (selectALL) {
            if (selectedrecords.length > 0) {
                mode = 1;
            }
        } else {
            if (listProductSelected.length > 0) {
                mode = 2;
            }
        }

        var val = Ext.getCmp('rechercherINGROUPE').getValue();

        var gridStore = Ext.getCmp('INGridGROUPE').getStore();




        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: '../api/v1/groupe-tierspayant/facturation-groupe',
            method: 'POST',
            timeout: 24000000,
            params: {
                MODE_SELECTION: mode,
                lg_GROUPE_ID: lg_GROUPE_ID,
                tierspayantarray: Ext.encode(groupetierspayant),
                unselectedrecords: Ext.encode(selectedrecords),
                listProductSelected: Ext.encode(listProductSelected),
                search_value: val,
                dt_start: Ext.getCmp('dt_debut').getSubmitValue(),
                dt_end: Ext.getCmp('dt_fin').getSubmitValue()


            },
            success: function (response, options) {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.status > 0) {
                    Ext.MessageBox.alert('INFOS', object.message);
                    groupetierspayant = [];
                    selectedrecords = [];
                    listProductSelected = [];
                    Ext.MessageBox.confirm('Confirmer l\'impression',
                            'Voulez-vous imprimer ?',
                            function (choice) {

                                if (choice === 'yes') {

                                    var url = '../webservices/configmanagement/groupe/ws_allinvoice_pdf.jsp';
                                    Me.lunchPrinter(url);
                                    var xtype = "facturemanager";
                                    var alias = 'widget.' + xtype;
                                    retourListeFactures("Gestion Facturation");
                                } else {

                                    var xtype = "facturemanager";
                                    var alias = 'widget.' + xtype;
                                    retourListeFactures("Gestion Facturation");
                                }


                            });


                } else {
                    testextjs.app.getController('App').StopWaitingProcess();
                    Ext.MessageBox.alert('Error Message', "Le processus n'a pas abouti");

                }


            }, failure: function (response, options) {
                LaborexWorkFlow.StopWaitingProcess();

//                    store.rejectChanges();

            }
        });

    },
    onGenerateSelectedBonsInvoice: function () {
        var lg_TIERS_PAYANT_ID = Ext.getCmp('cmb_fact_TIERS_PAYANT').getValue();
        if (lg_TIERS_PAYANT_ID === '' || lg_TIERS_PAYANT_ID === null) {
            lg_TIERS_PAYANT_ID = '';
        }
        if (Ext.getCmp('notINGridSELECT').getStore().getCount() === 0) {
            return;
        }
        // Meme regle que la generation par groupe : au moins un bon coche
        if (!verifierSelectionDossiersAvantGeneration(Ext.getCmp('notINGridSELECT'),
                Ext.getCmp('selectALLSELECT'))) {
            return;
        }
        var mode = 0;
        var selectALL = Ext.getCmp('selectALLSELECT').getValue();
        if (selectALL) {
            if (selectedrecords.length > 0) {
                mode = 1;
            }
        } else {
            if (listProductSelected.length > 0) {
                mode = 2;
            }
        }
        var gridStore = Ext.getCmp('notINGridSELECT').getStore();
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: '../api/v1/groupe-tierspayant/facturation-bons',
            method: 'POST',
            timeout: 24000000,
            params: {
                MODE_SELECTION: mode,
                lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID,
                unselectedrecords: Ext.encode(selectedrecords),
                listProductSelected: Ext.encode(listProductSelected),
                dt_start: Ext.getCmp('dt_debut').getSubmitValue(),
                dt_end: Ext.getCmp('dt_fin').getSubmitValue()


            },
            success: function (response, options) {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.status > 0) {
                    Ext.MessageBox.alert('INFOS', object.message);

                    selectedrecords = [];
                    listProductSelected = [];
                    var code = '';
                    Ext.MessageBox.confirm('Confirmer l\'impression',
                            'Voulez-vous imprimer ?',
                            function (choice) {

                                if (choice === 'yes') {

                                    var url = '../webservices/sm_user/facturation/ws_rp_print_all_invoices.jsp?printAll=printAll&CODEREGROUPEMENT=' + code;
                                    Me.lunchPrinter(url);
                                    var xtype = "facturemanager";
                                    var alias = 'widget.' + xtype;
                                    retourListeFactures("Gestion Facturation");
                                } else {

                                    var xtype = "facturemanager";
                                    var alias = 'widget.' + xtype;
                                    retourListeFactures("Gestion Facturation");
                                }


                            });


                } else {
                    testextjs.app.getController('App').StopWaitingProcess();
                    Ext.MessageBox.alert('Error Message', "Le processus n'a pas abouti");

                }


            }, failure: function (response, options) {
                LaborexWorkFlow.StopWaitingProcess();

//                    store.rejectChanges();

            }
        });

    },
    onOldInvoiceVersion: function () {

        var internal_url = "";
        if (ref === "") {
            ref = null;
        } else if (ref === undefined) {
            ref = null;
        }


        dt_debut = Ext.Date.format(Ext.getCmp('dt_debut').getValue(), 'Y-m-d');
        dt_fin = Ext.Date.format(Ext.getCmp('dt_fin').getValue(), 'Y-m-d');
        var cmMODE_SELECTION = Ext.getCmp('MODE_SELECTION').getValue();
        var cmb_fact_TIERS_PAYANT = Ext.getCmp('cmb_fact_TIERS_PAYANT').getValue(),
                lg_TYPE_TIERS_PAYANT_ID = Ext.getCmp('cmb_TYPE_TIERS_PAYANT').getValue();
        if (lg_TYPE_TIERS_PAYANT_ID === null) {
            lg_TYPE_TIERS_PAYANT_ID = "";

        }
        if (cmb_fact_TIERS_PAYANT === null) {
            cmb_fact_TIERS_PAYANT = "";


        }
        if (cmMODE_SELECTION !== "5") {
            cmb_fact_TIERS_PAYANT = "";

        }
        if (cmMODE_SELECTION !== "2") {
            lg_TYPE_TIERS_PAYANT_ID = "";

        }

        var url_services_data_detail_facture_tiers_payant = '../api/v1/facture-tiers-payant/assiette?lg_TYPE_TIERS_PAYANT_ID=' + lg_TYPE_TIERS_PAYANT_ID + '&dt_debut=' + dt_debut + '&dt_fin=' + dt_fin + '&lg_TIERS_PAYANT=' + cmb_fact_TIERS_PAYANT;
        var OGrid = Ext.getCmp('gridpanelID');
        OGrid.getStore().getProxy().url = url_services_data_detail_facture_tiers_payant;
        OGrid.getStore().load();



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
    CreateFacture: function (val) {
        var dt_debut = Ext.Date.format(Ext.getCmp('dt_debut').getValue(), 'Y-m-d'),
                dt_fin = Ext.Date.format(Ext.getCmp('dt_fin').getValue(), 'Y-m-d'),
                MODE_SELECTION = Ext.getCmp('MODE_SELECTION').getValue(),
                cmb_fact_TIERS_PAYANT = Ext.getCmp('cmb_fact_TIERS_PAYANT').getValue(),
                lg_TYPE_TIERS_PAYANT_ID = Ext.getCmp('cmb_TYPE_TIERS_PAYANT').getValue();
        if (cmb_fact_TIERS_PAYANT === null) {
            cmb_fact_TIERS_PAYANT = "";
        }
        if (lg_TYPE_TIERS_PAYANT_ID === null) {
            lg_TYPE_TIERS_PAYANT_ID = "";

        }
        if (MODE_SELECTION !== "2") {
            lg_TYPE_TIERS_PAYANT_ID = "";
        }
        if (MODE_SELECTION !== "5") {
            cmb_fact_TIERS_PAYANT = "";
        }

        url_services_data_detail_transaction = '../api/v1/facture-tiers-payant/transaction';

        str_mode = 'create facture tiers';

        var store = Ext.getCmp('gridpanelID').getStore();
        if (store.getCount() <= 0) {

            return;
        }
        var all = Ext.getCmp('All');

        if (MODE_SELECTION === "1") {
            if (!all.getValue()) {
                if (listProductSelected.length === 0) {
                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 320,
                        msg: 'Veuillez s&eacute;lectionner au moins un dossier',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
            }
            myAppController.ShowWaitingProcess();
            Ext.Ajax.request({
                url: url_services_data_detail_transaction,
                method: 'POST',
                timeout: 24000000,
                params: {
                    MODE_SELECTION: all.getValue() ? 'ALL' : 'SELECTED',
                    dt_fin: dt_fin,
                    lg_TYPE_TIERS_PAYANT_ID: lg_TYPE_TIERS_PAYANT_ID,
                    lg_TIERS_PAYANT: cmb_fact_TIERS_PAYANT,
                    uncheckedList: Ext.encode(uncheckedList),
                    recordsToSend: Ext.encode(listProductSelected),
                    dt_debut: dt_debut,
                    mode: str_mode

                },
                success: function (response, options) {
                    listProductSelected = [];
                    myAppController.StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success === "1") {
//                    
                        Ext.MessageBox.confirm('Confirmer l\'impression',
                                'Voulez-vous imprimer ?',
                                function (choice) {

                                    if (choice === 'yes') {

                                        var url = '../webservices/sm_user/facturation/ws_rp_print_all_invoices.jsp?printAll=printAll&CODEREGROUPEMENT=';
                                        Me.lunchPrinter(url);
                                        var xtype = "facturemanager";
                                        var alias = 'widget.' + xtype;
                                        retourListeFactures("Gestion Facturation");
                                    } else {

                                        var xtype = "facturemanager";
                                        var alias = 'widget.' + xtype;
                                        retourListeFactures("Gestion Facturation");
                                    }


                                });



                    } else {
                        myAppController.StopWaitingProcess();

                    }

                    store.load();
                }, failure: function (response, options) {
                    myAppController.StopWaitingProcess();

//                    store.rejectChanges();

                }
            });
        } else {
            myAppController.ShowWaitingProcess();
            Ext.Ajax.request({
                url: url_services_data_detail_transaction,
                method: 'POST',
                timeout: 24000000,
                params: {
                    MODE_SELECTION: 'OTHERS',
                    dt_fin: dt_fin,
                    lg_TYPE_TIERS_PAYANT_ID: lg_TYPE_TIERS_PAYANT_ID,
                    lg_TIERS_PAYANT: cmb_fact_TIERS_PAYANT,
                    dt_debut: dt_debut,
                    mode: str_mode
                },
                success: function (response, options) {
                    var object = Ext.JSON.decode(response.responseText, false);

                    if (object.success === "1") {
                        Ext.MessageBox.confirm('Confirmer l\'impression',
                                'Voulez-vous imprimer ?',
                                function (choice) {
                                    if (choice === 'yes') {

                                        var url = '../webservices/sm_user/facturation/ws_rp_print_all_invoices.jsp?printAll=printAll&CODEREGROUPEMENT=';
                                        Me.lunchPrinter(url);
                                        var xtype = "facturemanager";
                                        var alias = 'widget.' + xtype;
                                        retourListeFactures("Gestion Facturation");

                                    } else {

                                        var xtype = "facturemanager";
                                        var alias = 'widget.' + xtype;
                                        retourListeFactures("Gestion Facturation");
                                    }
                                });

                    } else {
                        myAppController.StopWaitingProcess();
                        // affiche la cause reelle de l'echec (avant : echec silencieux)
                        Ext.MessageBox.show({
                            title: 'Avertissement',
                            width: 420,
                            msg: (object.errors && object.errors !== 'null')
                                    ? object.errors : 'La g&eacute;n&eacute;ration des factures a &eacute;chou&eacute;',
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.WARNING
                        });
                    }

                    store.load();
                }, failure: function (response, options) {
                    myAppController.StopWaitingProcess();
                    Ext.MessageBox.alert('Error Message', response.responseText);

                }
            });


        }



    },
    lunchPrinter: function (url) {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url;
        window.open(linkUrl);
    },
    onCheckChange: function (column, rowIndex, checked, eOpts) {

        // get index of column   
        var rec = store_detail_tiers_payant.getAt(rowIndex); // on recupere la ligne courante de la grid
        //alert(rec.get('lg_DOSSIER_FACTURE'));str_NOM
        if (checked === true) {
            listProductSelected.push(rec.get('lg_TIERS_PAYANT_ID')); //on ajoute l'index de la ligne selectionnée au tableau
            uncheckedList.unset(rec.get('lg_TIERS_PAYANT_ID'));
        } else {
            var all = Ext.getCmp('All');
            if (all.getValue()) {
                uncheckedList.push(rec.get('lg_TIERS_PAYANT_ID'));
                //all.setValue(false);
            }
            Array.prototype.unset = function (val) {
                var index = this.indexOf(val);
                if (index > -1) {
                    this.splice(index, 1);
                }
            };

            listProductSelected.unset(rec.get('lg_TIERS_PAYANT_ID'));

        }

    },
    printInfoce: function () {
        Ext.MessageBox.show({
            title: 'Infos',
            width: 320,
            msg: 'Voulez - vous imprimer',
            buttons: Ext.MessageBox.OK,
            icon: Ext.MessageBox.QUESTION,
            fn: function (buttonId) {
                if (buttonId === 'yes') {
                    Ext.Ajax.request({
                        url: url_services_data_detail_transaction,
                        params: {
                            printAll: 'printAll'
                        },
                        success: function (conn, response, options, eOpts) {

                        },
                        failure: function (conn, response, options, eOpts) {

                        }
                    });
                }
            }
        });
    },
    onCheckChangeSLECT: function (column, rowIndex, checked, eOpts) {
        Array.prototype.unset = function (val) {
            var index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            }
        };

        var rec = Ext.getCmp('notINGridSELECT').getStore().getAt(rowIndex); // on recupere la ligne courante de la grid

        if (checked === true) {
            listProductSelected.push(rec.get('lg_PCMT_ID')); //on ajoute l'index de la ligne selectionnée au tableau
            selectedrecords.unset(rec.get('lg_PCMT_ID'));
        } else {
            listProductSelected.unset(rec.get('lg_PCMT_ID'));
            selectedrecords.push(rec.get('lg_PCMT_ID'));

        }
        var storeGR = Ext.getCmp('notINGridSELECT').getStore();
        storeGR.commitChanges();
        Ext.getCmp('notINGridSELECT').reconfigure(storeGR);

    },

    onCheckChangeGroup: function (column, rowIndex, checked, eOpts) {
        Array.prototype.unset = function (val) {
            var index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            }
        };

        var rec = Ext.getCmp('notINGrid').getStore().getAt(rowIndex); // on recupere la ligne courante de la grid

        if (checked === true) {
            listProductSelected.push(rec.get('lg_PCMT_ID')); //on ajoute l'index de la ligne selectionnée au tableau
            selectedrecords.unset(rec.get('lg_PCMT_ID'));
        } else {
            listProductSelected.unset(rec.get('lg_PCMT_ID'));
            selectedrecords.push(rec.get('lg_PCMT_ID'));

        }
        var storeGR = Ext.getCmp('notINGrid').getStore();
        storeGR.commitChanges();
        Ext.getCmp('notINGrid').reconfigure(storeGR);

    },

    onGroupCheckChange: function (column, rowIndex, checked, eOpts) {
        Array.prototype.unset = function (val) {
            var index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            }
        };

        var rec = Ext.getCmp('INGridGROUPE').getStore().getAt(rowIndex); // on recupere la ligne courante de la grid

        if (checked === true) {
            listProductSelected.push(rec.get('lgTIERSPAYANTID')); //on ajoute l'index de la ligne selectionnée au tableau
            selectedrecords.unset(rec.get('lgTIERSPAYANTID'));
        } else {
            listProductSelected.unset(rec.get('lgTIERSPAYANTID'));
            selectedrecords.push(rec.get('lgTIERSPAYANTID'));

        }
        var storeGR = Ext.getCmp('INGridGROUPE').getStore();
        storeGR.commitChanges();
        Ext.getCmp('INGridGROUPE').reconfigure(storeGR); 

    }


});
