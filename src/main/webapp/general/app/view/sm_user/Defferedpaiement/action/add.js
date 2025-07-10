/* global Ext */
var url_services_data_modereglement_dovente = '../webservices/sm_user/modereglement/ws_data.jsp';
var Me;
var net = 0;
var checkedList;
var my_url;
var listProductSelected;
var LaborexWorkFlow;
var myAppController;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.sm_user.Defferedpaiement.action.add', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Client',
        'testextjs.model.DefferedPayment',
        'testextjs.controller.LaborexWorkFlow',
        'Ext.ux.CheckColumn',
        'Ext.selection.CheckboxModel',
        'testextjs.controller.App'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
        nameintern: ''
    },
    xtype: 'editderredpayment',
    id: 'editderredpaymentID',
    frame: true,
    title: 'R&egrave;glement de Diff&eacute;r&eacute;',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {



        Me = this;
        listProductSelected = [];
        checkedList = [];
        var itemsPerPage = 20;

        ref = this.getNameintern();

        net = 0;
        titre = this.getTitre();
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        myAppController = Ext.create('testextjs.controller.App', {});
        my_url = '../webservices/sm_user/modereglement/ws_data.jsp';
        var store_modereglement = LaborexWorkFlow.BuildStore('testextjs.model.ModeReglement', itemsPerPage, url_services_data_modereglement_dovente);



        var store_typereglement = new Ext.data.Store({
            model: 'testextjs.model.TypeReglement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/sm_user/reglement/ws_mode_reglemnt.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });
        var store_detail_deffered = new Ext.data.Store({
            model: 'testextjs.model.DefferedPayment',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/sm_user/defferredpayment/ws_payment_data.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }

        });


        var clientsStore = new Ext.data.Store({
            model: 'testextjs.model.Client',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/sm_user/defferredpayment/ws_defferedclients.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            }
        });


        var store_type_paiement = Ext.create('Ext.data.Store', {
            autoLoad: true,
            fields: ['lg_NATURE_PAIEMENT_diff_ID', 'str_LIBELLE_NATURE_PAIEMENT'],
            data: [
                {"lg_NATURE_PAIEMENT_diff_ID": "1", "str_LIBELLE_NATURE_PAIEMENT": "Partiel"},
                {"lg_NATURE_PAIEMENT_diff_ID": "2", "str_LIBELLE_NATURE_PAIEMENT": "Total"}
            ]
        });


        var int_NBR_DOSSIER = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Dossiers Restants',
                    labelWidth: 120,
                    id: 'int_Nbr_Dossier_diff',
                    fieldStyle: "color:blue;font-weight:800;",
                    margin: '0 5 0 0',
                    value: 0
                });
        var int_MONTANT_REGLEMENT_diff = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Net &agrave payer ::',
                    id: 'int_MONTANT_REGLEMENT_diff',
                    fieldStyle: "color:blue;font-weight:800;",
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    listeners: {
                        change: function () {
                            var int_AMOUNT_RECU = Ext.getCmp('int_AMOUNT_RECU').getValue();
                            if (int_AMOUNT_RECU !== "") {
                                var int_total = 0;
                                var in_total_vente_monnaie = 0;
                                var in_total_vente_monnaie_temp = 0;
                                var int_monnaie_monnaie = 0;
                                var int_amount_restant = 0;
                                in_total_vente_monnaie_temp = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_MONTANT_REGLEMENT_diff').getValue(), " ");
                                var in_total_vente_monnaie_temp_final = LaborexWorkFlow.amountdeformat(in_total_vente_monnaie_temp);
                                in_total_vente_monnaie = Number(in_total_vente_monnaie_temp_final);
                                var int_montant_recu = (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()));
                                int_monnaie_monnaie = Number(LaborexWorkFlow.DisplayMonnaie(in_total_vente_monnaie, int_montant_recu));
                                int_amount_restant = Number(LaborexWorkFlow.DisplayAmountRestant(in_total_vente_monnaie, int_montant_recu));
                                Ext.getCmp('int_AMOUNT_REMIS').setValue(int_monnaie_monnaie + ' CFA');
                                Ext.getCmp('int_REEL_RESTE').setValue(int_amount_restant + ' CFA');
                                var int_amount_restant = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
                                var int_amount_restant_final = 0;
                                int_amount_restant_final = Number(int_amount_restant);
                            }

                        }},
                    margin: '0 15 0 0',
                    value: "0"
                });


        Ext.apply(this, {
            width: '98%',
            height: 580,
            cls: 'custompanel',
            fieldDefaults: {
                labelAlign: 'left',
//                labelWidth: 120,
                anchor: '100%'

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
            // items: ['gridpanelID'],
            items: [
                {
                    xtype: 'fieldset',
                    title: '<span style="color:blue;">Infos Client</span>',
                    collapsible: true,
                    flex: 0.4,
                    margin: '-10 0 0 1',
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        hideLabel: 'true'
                    },
                    items: [
                        {
                            xtype: 'fieldcontainer',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Client:',
                                    labelWidth: 35,
                                    margins: '0 5 0 5',
                                    id: 'diff_CLIENT_ID',
                                    store: clientsStore,
                                    valueField: 'lg_CLIENT_ID',
                                    displayField: 'str_FIRST_LAST_NAME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    minChars: 2,
                                    flex: 2,
                                    pageSize: 20,
                                    emptyText: 'Selectionner le client',
                                    listeners: {
                                        select: function (field, e, options) {

                                            var
                                                    combo = this,
                                                    value = combo.getValue(),
                                                    combostore = combo.getStore(),
                                                    record = combostore.findRecord('lg_CLIENT_ID', value);

                                            if (record !== null) {
                                                Ext.getCmp('diff_MATRICULE').setValue(record.get('str_NUMERO_SECURITE_SOCIAL'));
                                                Ext.getCmp('diff_adresse').setValue(record.get('str_ADRESSE'));
                                                var grid = Ext.getCmp('griddeffereddetails');
                                                var dbl_MONTANT_RESTANT = 0, int_MONTANT_REGLEMENT = 0, TOTAL_AMOUNT = 0, int_Nbr_Dossier = 0;
                                                grid.getStore().load({
                                                    scope: this,
                                                    params: {
                                                        lg_CLIENT_ID: value,
                                                        dt_start: Ext.getCmp('dt_debut_diff').getSubmitValue(),
                                                        dt_end: Ext.getCmp('dt_fin_diff').getSubmitValue()
                                                    },
                                                    callback: function (records) {
                                                        TOTAL_AMOUNT = records[0].get('TOTAL_AMOUNT'), int_Nbr_Dossier = records[0].get('int_Nbr_Dossier');
                                                        Ext.each(records, function (record, index, records) {
                                                            dbl_MONTANT_RESTANT += Number(record.get("dbl_MONTANT_RESTANT"));
                                                            int_MONTANT_REGLEMENT += Number(record.get("int_MONTANT_REGLEMENT"));
                                                        });
                                                        Ext.getCmp('TOTAL_AMOUNT_diff').setValue(Number(TOTAL_AMOUNT));
                                                        Ext.getCmp('int_Nbr_Dossier_diff').setValue(Number(int_Nbr_Dossier));
                                                        Ext.getCmp('dbl_MONTANT_RESTANT_diff').setValue(dbl_MONTANT_RESTANT);
                                                        Ext.getCmp('int_MONTANT_REGLEMENT_diff').setValue(dbl_MONTANT_RESTANT);

                                                    }
                                                });




                                            }

                                        }
                                    }
                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Matricule',
                                    fieldStyle: "color:blue;font-weight:800;",
                                    margin: '0 15 0 5',
                                    labelWidth: 55,
                                    flex: 1,
                                    id: 'diff_MATRICULE'
                                }
                                , {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Adresse',
                                    labelWidth: 55,
                                    flex: 1,
                                    fieldStyle: "color:blue;font-weight:800;",
                                    margin: '0 10 0 5',
                                    id: 'diff_adresse'
                                }, {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    id: 'dt_debut_diff',
                                    labelWidth: 20,
                                    flex: 1,
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y',
                                    emptyText: 'Date de debut',
                                    default: new Date(),
                                    listeners: {
                                        'change': function (me) {

                                            Ext.getCmp('dt_fin_diff').setMinValue(me.getValue());
                                        }
                                    }


                                }, {
                                    xtype: 'datefield',
                                    fieldLabel: 'Au',
                                    margin: '0 0 0 5',
                                    id: 'dt_fin_diff',
                                    emptyText: 'Date de fin',
                                    labelWidth: 20,
                                    flex: 1,
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y',
                                    default: new Date(),
                                    listeners: {
                                        'change': function (me) {

                                            Ext.getCmp('dt_debut_diff').setMaxValue(me.getValue());
                                        }
                                    }
                                }, {
                                    text: 'Rechercher',
                                    id: 'diff_btn_add',
                                    margins: '0 10 0 5',
                                    xtype: 'button',
                                    handler: function () {
                                        var grid = Ext.getCmp('griddeffereddetails');
                                        var dbl_MONTANT_RESTANT = 0, int_MONTANT_REGLEMENT = 0, TOTAL_AMOUNT = 0, int_Nbr_Dossier = 0;
                                        grid.getStore().load({
                                            scope: this,
                                            params: {
                                                lg_CLIENT_ID: Ext.getCmp('diff_CLIENT_ID').getValue(),
                                                dt_start: Ext.getCmp('dt_debut_diff').getSubmitValue(),
                                                dt_end: Ext.getCmp('dt_fin_diff').getSubmitValue()
                                            },
                                            callback: function (records) {
                                                TOTAL_AMOUNT = records[0].get('TOTAL_AMOUNT'), int_Nbr_Dossier = records[0].get('int_Nbr_Dossier');
                                                Ext.each(records, function (record, index, records) {
                                                    dbl_MONTANT_RESTANT += Number(record.get("dbl_MONTANT_RESTANT"));
                                                    int_MONTANT_REGLEMENT += Number(record.get("int_MONTANT_REGLEMENT"));
                                                });
                                                Ext.getCmp('TOTAL_AMOUNT_diff').setValue(Number(TOTAL_AMOUNT));
                                                Ext.getCmp('int_Nbr_Dossier_diff').setValue(Number(int_Nbr_Dossier));
                                                Ext.getCmp('dbl_MONTANT_RESTANT_diff').setValue(dbl_MONTANT_RESTANT);
                                                Ext.getCmp('int_MONTANT_REGLEMENT_diff').setValue(dbl_MONTANT_RESTANT);

                                            }
                                        });

                                    }

                                }

                            ]
                        }]
                }, {
                    xtype: 'fieldset',
                    id: 'fieldset_information_organisme',
                    title: '<span style="color:blue;">Critères se recherche</span>',
                    collapsible: true,
                    layout: 'hbox',
                    flex: 0.4,
                    margin: '1 0 0 1',
//                    bodyPadding: 10,
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type Paiement :',
                            labelWidth: 100,
                            margins: '0 0 0 10',
                            id: 'lg_NATURE_PAIEMENT_diff',
                            store: store_type_paiement,
                            valueField: 'lg_NATURE_PAIEMENT_diff_ID',
                            displayField: 'str_LIBELLE_NATURE_PAIEMENT',
                            typeAhead: true,
                            queryMode: 'remote',
                            // flex: 1,
                            emptyText: 'Selectionner ',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();
                                    var grid = Ext.getCmp('griddeffereddetails');

                                    if (value === "1") {

                                        grid.columns[7].setVisible(true);
                                        Ext.getCmp('selectALL').show();
                                        Ext.getCmp('int_MONTANT_REGLEMENT_diff').setValue(0);
                                    } else {
                                        Ext.getCmp('selectALL').hide();
                                        if (grid.columns[7].isVisible()) {
                                            grid.columns[7].setVisible(false);
                                        }
                                        Ext.getCmp('int_MONTANT_REGLEMENT_diff').setValue(Ext.getCmp('dbl_MONTANT_RESTANT_diff').getValue());
                                    }
                                    customer_id = value;

                                }
                            }
                        }



                        , {
                            xtype: 'datefield',
                            fieldLabel: 'Date R&egrave;glement',
                            id: 'dt_reglement_diff',
                            labelWidth: 130,
                            name: 'dt_reglement_diff',
                            emptyText: 'Date reglement',
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            margin: '0 0 0 15'

                        },
                        {
                            xtype: 'hiddenfield',
                            name: 'str_ref_reglement_hidden_diff',
                            id: 'str_ref_reglement_hidden_diff',
                            value: '0'
                        }

                    ]
                },
                {
                    xtype: 'fieldset',
                    id: 'fieldset_information_reglement',
                    title: '<span style="color:blue;">Information R&egrave;glement</span>',
                    collapsible: true,
                    layout: 'hbox',
                    flex: 0.4,
                    margin: '1 0 0 1',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'Montant Total',
                            margin: '0 5',
                            id: 'TOTAL_AMOUNT_diff',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;"
                        },
                        int_MONTANT_REGLEMENT_diff,

                        {
                            xtype: 'displayfield',
                            fieldLabel: 'Montant Restant',
                            labelWidth: 100,
                            margin: '0 5',
                            name: 'dbl_MONTANT_RESTANT_diff',
                            id: 'dbl_MONTANT_RESTANT_diff',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.') + " FCFA";
                            },
                            fieldStyle: "color:blue;font-weight:800;"
                        },
                        int_NBR_DOSSIER

                                , {
                                    hidden: true,
                                    xtype: 'checkbox',
                                    margins: '0 0 5 5',
                                    boxLabel: 'Tous S&eacute;lectionner',
                                    id: 'selectALL',
                                    checked: false,
                                    listeners: {
                                        change: function () {

                                            //
                                            var grid = Ext.getCmp('griddeffereddetails');
                                            var CODEstore = grid.getStore();
                                            if (this.getValue()) {
                                                if (listProductSelected.length > 0) {
                                                    listProductSelected = [];
                                                }
                                                net = Ext.getCmp('dbl_MONTANT_RESTANT_diff').getValue();

                                                Ext.getCmp('int_MONTANT_REGLEMENT_diff').setValue(Ext.getCmp('dbl_MONTANT_RESTANT_diff').getValue());

                                                for (var i = 0; i < CODEstore.getCount(); i++) {
                                                    var record = CODEstore.getAt(i);
                                                    record.set('isChecked', true);
                                                }


                                            } else {
                                                net = 0;
                                                Ext.getCmp('int_MONTANT_REGLEMENT_diff').setValue(0);

                                                CODEstore.each(function (rec, id) {
                                                    rec.set('isChecked', false);
                                                });

                                            }
                                            CODEstore.commitChanges();
                                            grid.reconfigure(CODEstore);

                                        }
                                    }
                                }

                    ]
                },
                {
                    xtype: 'fieldset',
                    id: 'detaildiffere',
                    title: '<span style="color:blue;">Detail(s) des r&eacute;glements</span>',
                    collapsible: true,
                    flex: 2.5,
                    margin: '1 0 0 1',
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'grid',
                            id: 'griddeffereddetails',
                            store: store_detail_deffered,
                            height: 180,
                            columns: [
                                {
                                    text: 'id',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    align: 'right',
                                    dataIndex: 'lg_PREENREGISTREMENT_COMPTE_CLIENT_ID'
                                }, {
                                    text: 'R&eacute;f&eacute;rence.Bon',
                                    flex: 1,
                                    dataIndex: 'REFBON'
                                },
                                {
                                    text: 'Date Vente',
                                    flex: 1,
                                    dataIndex: 'DATEVENTE'
                                },
                                {
                                    text: 'Heure Vente',
                                    flex: 1,
                                    dataIndex: 'HEUREVENTE'

                                },
                                {
                                    text: 'Montant Vente',
                                    flex: 1,
                                    dataIndex: 'MONTANTVENTE',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Montant Pay&eacute;',
                                    flex: 1,
                                    dataIndex: 'int_MONTANT_REGLEMENT',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Montant Restant',
                                    flex: 1,
                                    dataIndex: 'dbl_MONTANT_RESTANT',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: '',
                                    width: 50,
                                    hidden: true,
                                    dataIndex: 'isChecked',
                                    xtype: 'checkcolumn',
                                    listeners: {
                                        checkChange: this.onCheckChange
                                    }

                                }

                            ],
                            //  selModel: selModel,
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_detail_deffered,
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
                            title: '<span style="color:blue;">REGLEMENT</span>',
                            id: 'reglementID',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            collapsible: true,
                            defaultType: 'textfield',
                            items: [
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            labelWidth: 120,
                                            fieldLabel: 'Type.R&egrave;glement',
                                            name: 'lg_TYPE_REGLEMENT_ID',
                                            width: '50%',
                                            id: 'lg_TYPE_REGLEMENT_ID',
                                            store: store_typereglement,
                                            value: 'Especes',
                                            valueField: 'lg_TYPE_REGLEMENT_ID',
                                            displayField: 'str_NAME',
                                            typeAhead: true,
                                            queryMode: 'remote',
                                            emptyText: 'Choisir un type de reglement...',
                                            listeners: {
                                                select: function (cmp) {
                                                    LaborexWorkFlow.FindComponentToHideDisplay('lg_TYPE_REGLEMENT_ID', 'str_LIEU', 'str_BANQUE', 'str_NOM', 'int_TAUX_CHANGE', 'str_CODE_MONNAIE');
                                                    var value = this.getValue();

                                                    var combolg_MODE_REGLEMENT_ID = Ext.getCmp('lg_MODE_REGLEMENT_ID');

                                                    combolg_MODE_REGLEMENT_ID.clearValue();

                                                    combolg_MODE_REGLEMENT_ID.store.load({
                                                        params: {'lg_TYPE_REGLEMENT_ID': value},
                                                        callback: function (records) {
                                                            if (value !== "2") {
                                                                combolg_MODE_REGLEMENT_ID.setValue(records[0].get('lg_MODE_REGLEMENT_ID'));
                                                            }
                                                        }
                                                    });
                                                    if (value === "2") {
                                                        combolg_MODE_REGLEMENT_ID.enable();
                                                        combolg_MODE_REGLEMENT_ID.show();
                                                    } else {
                                                        combolg_MODE_REGLEMENT_ID.hide();

                                                    }


                                                    if (value === "2" || value === "3") {

                                                        Ext.getCmp('str_LIEU').setFieldLabel("Lieu:");
                                                    }
                                                    if (value !== "1") {
                                                        Ext.getCmp('int_AMOUNT_RECU').setValue(LaborexWorkFlow.amountdeformat(Ext.getCmp('int_MONTANT_REGLEMENT_diff').getValue()));
                                                        Ext.getCmp('int_AMOUNT_RECU').setDisabled(true);
                                                    } else {
                                                        Ext.getCmp('int_AMOUNT_RECU').enable();
                                                        Ext.getCmp('int_AMOUNT_RECU').setValue("");
                                                    }
                                                }

                                            }
                                        },
                                        {
                                            xtype: 'combobox',
                                            labelWidth: 120,
                                            fieldLabel: 'Mode.R&egrave;glement',
                                            id: 'lg_MODE_REGLEMENT_ID',
                                            flex: 1,
                                            hidden: true,
                                            store: store_modereglement,
                                            valueField: 'lg_MODE_REGLEMENT_ID',
                                            displayField: 'str_NAME',
                                            typeAhead: true,
                                            queryMode: 'local',
                                            emptyText: 'Choisir un mode de reglement...',
                                            listeners: {
                                                select: function () {
                                                    Ext.getCmp('str_NOM').focus(true, 100, function () {
//                                                        this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                                                    });

                                                }
                                            }

                                        }]}, {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            name: 'str_NOM',
                                            id: 'str_NOM',
                                            fieldLabel: 'Nom',
                                            hidden: true,
                                            flex: 2

                                        },
                                        {
                                            xtype: 'textfield',
                                            name: 'str_BANQUE',
                                            id: 'str_BANQUE',
                                            fieldLabel: 'Banque',
                                            hidden: true,
                                            flex: 1

                                        },
                                        {
                                            xtype: 'textfield',
                                            name: 'str_LIEU',
                                            id: 'str_LIEU',
                                            fieldLabel: 'Lieu',
                                            hidden: true,
                                            flex: 1

                                        }]}, {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            id: 'str_CODE_MONNAIE',
                                            fieldLabel: 'Code.Monnaie',
                                            hidden: true,
                                            value: "Fr",
                                            flex: 1

                                        },
                                        {
                                            xtype: 'textfield',
                                            id: 'int_TAUX_CHANGE',
                                            fieldLabel: 'Taux.Change',
                                            hidden: true,
                                            flex: 1,
                                            value: 0,
                                            maskRe: /[0-9.]/,
                                            minValue: 0

                                        }]},
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'numberfield',
                                            name: 'int_AMOUNT_RECU',
                                            id: 'int_AMOUNT_RECU',
                                            enableKeyEvents: true,
                                            hideTrigger: true,
                                            fieldLabel: 'Montant Re&ccedil;u',
                                            flex: 1,
                                            emptyText: 'Montant Recu',
                                            minValue: 5,
                                            allowDecimals: false,
                                            listeners: {
                                                change: function () {

                                                    var int_total = 0;
                                                    var in_total_vente_monnaie = 0;
                                                    var in_total_vente_monnaie_temp = 0;
                                                    var int_monnaie_monnaie = 0;
                                                    var int_amount_restant = 0;
                                                    in_total_vente_monnaie_temp = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_MONTANT_REGLEMENT_diff').getValue(), " ");
                                                    var in_total_vente_monnaie_temp_final = LaborexWorkFlow.amountdeformat(in_total_vente_monnaie_temp);
                                                    in_total_vente_monnaie = Number(in_total_vente_monnaie_temp_final);

                                                    var int_montant_recu = (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()));
                                                    int_monnaie_monnaie = Number(LaborexWorkFlow.DisplayMonnaie(in_total_vente_monnaie, int_montant_recu));
                                                    int_amount_restant = Number(LaborexWorkFlow.DisplayAmountRestant(in_total_vente_monnaie, int_montant_recu));
                                                    Ext.getCmp('int_AMOUNT_REMIS').setValue(int_monnaie_monnaie + ' CFA');
                                                    Ext.getCmp('int_REEL_RESTE').setValue(int_amount_restant + ' CFA');
                                                    var int_amount_restant = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
                                                    var int_amount_restant_final = 0;
                                                    int_amount_restant_final = Number(int_amount_restant);

                                                },
                                                specialKey: this.onTextFieldSpecialKey
                                            }


                                        }, {
                                            xtype: 'displayfield',
                                            flex: 1,
                                            fieldLabel: 'Monnaie :',
                                            id: 'int_AMOUNT_REMIS',
                                            fieldStyle: "color:blue;font-weight:800;",
                                            margin: '0 15 0 0',
                                            value: 0,
                                            align: 'right'
                                        }, 
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Reste a payer:',
                                            fieldStyle: "color:blue;font-weight:800;",
                                            name: 'int_REEL_RESTE',
                                            id: 'int_REEL_RESTE',
                                            value: 0
                                        }
                                    ]}
                            ]
                        },
                        {
                            xtype: 'toolbar',
                            ui: 'footer',
                            dock: 'bottom',
                            margin: '-5 0 0 0 ',
                            border: '0',
                            items: ['->',
                                {
                                    text: 'Valider le R&egrave;glement',
                                    iconCls: 'icon-clear-group',
                                    scope: this,
                                    handler: this.Doreglement
                                }, {
                                    text: 'RETOUR',
                                    iconCls: 'icon-clear-group',
                                    scope: this,
                                    hidden: false,
                                    handler: this.onbtncancel
                                }
                            ]
                        }
                    ]

                }

            ]

        });
        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



        var grid = Ext.getCmp('griddeffereddetails');
        var all = Ext.getCmp('selectALL');

        grid.getStore().on(
                "load", function () {


                    var CODEstore = grid.getStore();
                    if (listProductSelected.length > 0) {
                        var record;
                        Ext.each(listProductSelected, function (lg, index) {
                            CODEstore.each(function (r, id) {
                                record = CODEstore.findRecord('lg_PREENREGISTREMENT_COMPTE_CLIENT_ID', lg);
                                if (record !== null) {

                                    record.set('isChecked', 'true');
                                }


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
                            Ext.each(checkedList, function (lg, index) {

                                if (r.get('lg_PREENREGISTREMENT_COMPTE_CLIENT_ID') === lg) {
                                    r.set('isChecked', 'false');
                                }

                            });

                            grid.reconfigure(grid.getStore());
                        });


                        grid.reconfigure(grid.getStore());
                    }

                }

        );
        var combo = Ext.getCmp('lg_NATURE_PAIEMENT_diff');

        combo.setValue("2");
    },
    loadStore: function () {
        Ext.getCmp('griddeffereddetails').getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {

    },
    onbtncancel: function () {

        var xtype = "deferredpayment";
        testextjs.app.getController('App').onLoadNewComponent(xtype, "", "");
    },
    Doreglement: function () {

        var int_AMOUNT_RECU = Ext.getCmp('int_AMOUNT_RECU').getValue();
        var MODE_REGLEMENT = Ext.getCmp('lg_MODE_REGLEMENT_ID').getValue();

        var TYPE_REGLEMENT = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue();
        var str_LIEU = Ext.getCmp('str_LIEU').getValue();
        var str_CODE_MONNAIE = Ext.getCmp('str_CODE_MONNAIE').getValue();

        var str_BANQUE = Ext.getCmp('str_BANQUE').getValue();
        var dt_reglement_diff = Ext.Date.format(Ext.getCmp('dt_reglement_diff').getValue(), 'Y-m-d');
        var str_NOM = Ext.getCmp('str_NOM').getValue();
        var int_TAUX_CHANGE = Ext.getCmp('int_TAUX_CHANGE').getValue();

        var int_AMOUNT_REMIS = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
        var lg_NATURE_PAIEMENT_diff = Ext.getCmp('lg_NATURE_PAIEMENT_diff').getValue();
        var int_MONTANT_REGLEMENT_diff = Ext.getCmp('int_MONTANT_REGLEMENT_diff').getValue();
        if (TYPE_REGLEMENT === 'Especes') {
            MODE_REGLEMENT = 1;
        }

        if (TYPE_REGLEMENT === 'Especes' || TYPE_REGLEMENT === '1') {

            if (Ext.getCmp('int_AMOUNT_RECU').getValue() === null || Number(Ext.getCmp('int_AMOUNT_RECU').getValue()) === 0) {
                Ext.MessageBox.show({
                    title: 'Avertissement',
                    width: 320,
                    msg: 'Veuillez saisir le montant re&ccedil;u',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
                return;
            }
        }


        if (lg_NATURE_PAIEMENT_diff === "2") {
            if (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()) < Number(Ext.getCmp('dbl_MONTANT_RESTANT_diff').getValue()))
            {
                Ext.MessageBox.show({
                    title: 'Avertissement',
                    width: 320,
                    msg: 'Le montant saisi ne doit pas &ecirc;tre inf&eacute;rieur au montant total &agrave; pour le mode de paiement total',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
                return;
            }
        }

        if (lg_NATURE_PAIEMENT_diff === "1") {
            if (Number(Ext.getCmp('int_MONTANT_REGLEMENT_diff').getValue()) === 0)
            {
                Ext.MessageBox.show({
                    title: 'Avertissement',
                    width: 300,
                    msg: 'Veuillez s&eacute;lectionner au moins un dossier',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
                return;
            }
        }
        if (TYPE_REGLEMENT === "2" && MODE_REGLEMENT === null) {

            Ext.MessageBox.show({
                title: 'Avertissement',
                width: 300,
                msg: 'Veuillez s&eacute;lectionner le mode de r&egrave;glement',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
            return;
        }

        var tout = Ext.getCmp('selectALL');
        if (tout.getValue() && listProductSelected.length === 0) {
            lg_NATURE_PAIEMENT_diff = "2";
        }


        myAppController.ShowWaitingProcess();
        Ext.Ajax.request({
            url: '../webservices/sm_user/defferredpayment/ws_transaction.jsp',
            timeout: 2400000,
            params: {
                mode: 'doReglement',
                MODE_REGLEMENT: MODE_REGLEMENT,
                lg_CLIENT_ID: Ext.getCmp('diff_CLIENT_ID').getValue(),
                TYPE_REGLEMENT: TYPE_REGLEMENT,
                lg_NATURE_PAIEMENT: lg_NATURE_PAIEMENT_diff,
                str_LIEU: str_LIEU,
                str_CODE_MONNAIE: str_CODE_MONNAIE,
                str_BANQUE: str_BANQUE,
                str_NOM: str_NOM,
                NET_A_PAYER: int_MONTANT_REGLEMENT_diff,
                int_TAUX_CHANGE: int_TAUX_CHANGE,
                int_AMOUNT_REMIS: int_AMOUNT_REMIS,
                int_AMOUNT_RECU: int_AMOUNT_RECU,
                LISTDOSSIERS: Ext.encode(listProductSelected),
                checkedList: Ext.encode(checkedList),
                dt_reglement: dt_reglement_diff

            },
            success: function (response)
            {
                myAppController.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);

                if (object.errors === "1") {
                    checkedList = [];
                    listProductSelected = [];
                    Ext.Msg.confirm("Information", "Voulez-vous imprimer ?",
                            function (btn) {
                                if (btn === "yes") {
                                    Me.onPrintTicket(object.lg_DOSSIER_REGLEMENT_ID);

                                } else {
                                    var xtype = "deferredpayment";
//                                    var alias = 'widget.' + xtype;
                                    testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion des Diff&eacute;r&eacute;s", "");
                                }
                            });


                } else {
                    Ext.MessageBox.alert('Error Message', object.success);
                }
                net = 0;
                listProductSelected = [];
                checkedList = [];
            },
            failure: function (response)
            {
                myAppController.StopWaitingProcess();
                listProductSelected = [];
                checkedList = [];
                net = 0;
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }

        });

    },
    lunchPrinter: function (url) {
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: url,
            timeout: 2400000,
            success: function (response)
            {
                boxWaitingProcess.hide();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
//                    return;
                }
                var xtype = "deferredpayment";
                var alias = 'widget.' + xtype;
                testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion des Diff&eacute;r&eacute;s", "");


            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
    },
    onPrintTicket: function (id) {
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            url: '../api/v1/reglement/ticket/' + id,
            method: 'PUT',
            success: function (response)
            {
                progress.hide();


            },
            failure: function (response)
            {
                progress.hide();
                var object = Ext.JSON.decode(response.responseText, false);
            }
        });
    },
    onTextFieldSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var int_AMOUNT_RECU = Ext.getCmp('int_AMOUNT_RECU').getValue();
            var MODE_REGLEMENT = Ext.getCmp('lg_MODE_REGLEMENT_ID').getValue();

            var TYPE_REGLEMENT = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue();
            var str_LIEU = Ext.getCmp('str_LIEU').getValue();
            var str_CODE_MONNAIE = Ext.getCmp('str_CODE_MONNAIE').getValue();
            var str_BANQUE = Ext.getCmp('str_BANQUE').getValue();
            var dt_reglement_diff = Ext.Date.format(Ext.getCmp('dt_reglement_diff').getValue(), 'Y-m-d');
            var str_NOM = Ext.getCmp('str_NOM').getValue();
            var int_TAUX_CHANGE = Ext.getCmp('int_TAUX_CHANGE').getValue();
            var int_AMOUNT_REMIS = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
            var lg_NATURE_PAIEMENT_diff = Ext.getCmp('lg_NATURE_PAIEMENT_diff').getValue();
            var int_MONTANT_REGLEMENT_diff = Ext.getCmp('int_MONTANT_REGLEMENT_diff').getValue();

            var lg_CLIENT_ID = Ext.getCmp('diff_CLIENT_ID').getValue();
            if (TYPE_REGLEMENT === 'Especes') {
                MODE_REGLEMENT = 1;
            }
            if (TYPE_REGLEMENT === 'Differe') {
                Alert('veuillez changer le type de r&eacute;glement');
            }


            if (lg_NATURE_PAIEMENT_diff === "2") {
                if (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()) < Number(Ext.getCmp('dbl_MONTANT_RESTANT_diff').getValue())) {

                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 320,
                        msg: 'Le montant saisi ne doit pas &ecirc;tre inf&eacute;rieur au montant total &agrave; pour pour le mode de paiement total',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
            }

            if (lg_NATURE_PAIEMENT_diff === "1") {
                if (Number(Ext.getCmp('int_MONTANT_REGLEMENT_diff').getValue()) === 0)
                {
                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 300,
                        msg: 'Veuillez s&eacute;lectionner au moins un dossier',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
            }


            if (TYPE_REGLEMENT === "2" && MODE_REGLEMENT === null) {

                Ext.MessageBox.show({
                    title: 'Avertissement',
                    width: 300,
                    msg: 'Veuillez s&eacute;lectionner le mode de r&egrave;glement',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
                return;
            }


            if (TYPE_REGLEMENT === 'Especes' || TYPE_REGLEMENT === '1') {

                if (Ext.getCmp('int_AMOUNT_RECU').getValue() === null || Number(Ext.getCmp('int_AMOUNT_RECU').getValue()) === 0) {
                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 320,
                        msg: 'Veuillez saisir le montant reçu',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
            }
            var tout = Ext.getCmp('selectALL');
            if (tout.getValue() && listProductSelected.length === 0) {
                lg_NATURE_PAIEMENT_diff = "2";
            }
            myAppController.ShowWaitingProcess();

            Ext.Ajax.request({
                url: '../webservices/sm_user/defferredpayment/ws_transaction.jsp',
                timeout: 2400000,
                params: {
                    mode: 'doReglement',
                    MODE_REGLEMENT: MODE_REGLEMENT,
                    lg_CLIENT_ID: Ext.getCmp('diff_CLIENT_ID').getValue(),
                    TYPE_REGLEMENT: TYPE_REGLEMENT,
                    lg_NATURE_PAIEMENT: lg_NATURE_PAIEMENT_diff,
                    str_LIEU: str_LIEU,
                    str_CODE_MONNAIE: str_CODE_MONNAIE,
                    str_BANQUE: str_BANQUE, str_NOM: str_NOM,
                    NET_A_PAYER: int_MONTANT_REGLEMENT_diff,
                    int_TAUX_CHANGE: int_TAUX_CHANGE,
                    int_AMOUNT_REMIS: int_AMOUNT_REMIS,
                    int_AMOUNT_RECU: int_AMOUNT_RECU,
                    LISTDOSSIERS: Ext.encode(listProductSelected),
                    checkedList: Ext.encode(checkedList),
                    dt_reglement: dt_reglement_diff


                },
                success: function (response)
                {
                    myAppController.StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);

                    if (object.errors === "1") {
                        checkedList = [];
                        listProductSelected = [];
                        Ext.Msg.confirm("Confirme", "Voulez-vous imprimer ?",
                                function (btn) {
                                    if (btn === "yes") {
                                        Me.onPrintTicket(object.lg_DOSSIER_REGLEMENT_ID);
                                    } else {
                                        const xtype = "deferredpayment";
//                                        var alias = 'widget.' + xtype;
                                        testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion des Diff&eacute;r&eacute;s", "");
                                    }
                                });


                    } else {
                        Ext.MessageBox.alert('Error Message', object.success);
                    }
                    net = 0;
                    listProductSelected = [];
                    checkedList = [];
                },
                failure: function (response)
                {
                    myAppController.StopWaitingProcess();
                    listProductSelected = [];
                    checkedList = [];
                    net = 0;
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }

            });
        }
    },
   
    onbtnadd: function () {

    },

    onSelectionChange: function (model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
    onCheckChange: function (column, rowIndex, checked, eOpts) {
        Array.prototype.unset = function (val) {
            var index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            }
        };
        var store = Ext.getCmp('griddeffereddetails').getStore();
        var rec = store.getAt(rowIndex); // on recupere la ligne courante de la grid
        var TYPE_REGLEMENT = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue();
        if (checked === true) {

            net += Number(rec.get('dbl_MONTANT_RESTANT'));
            listProductSelected.push(rec.get('lg_PREENREGISTREMENT_COMPTE_CLIENT_ID')); //on ajoute l'index de la ligne selectionnée au tableau
            checkedList.unset(rec.get('lg_PREENREGISTREMENT_COMPTE_CLIENT_ID'));
            Ext.getCmp('int_MONTANT_REGLEMENT_diff').setValue(net);

            if (TYPE_REGLEMENT !== null && TYPE_REGLEMENT !== "1" && TYPE_REGLEMENT !== "Especes") {
                Ext.getCmp('int_AMOUNT_RECU').setValue(net);
            }

        } else {
            net = net - Number(rec.get('dbl_MONTANT_RESTANT'));

            Ext.getCmp('int_MONTANT_REGLEMENT_diff').setValue(net);
            if (TYPE_REGLEMENT !== null && TYPE_REGLEMENT !== "1") {
                Ext.getCmp('int_AMOUNT_RECU').setValue(net);
            }
            var all = Ext.getCmp('selectALL');
            if (all.getValue()) {
                checkedList.push(rec.get('lg_PREENREGISTREMENT_COMPTE_CLIENT_ID'));
                Ext.getCmp('int_MONTANT_REGLEMENT_diff').setValue(net);
                if (TYPE_REGLEMENT !== null && TYPE_REGLEMENT !== "1") {
                    Ext.getCmp('int_AMOUNT_RECU').setValue('');
                }
            }
            listProductSelected.unset(rec.get('lg_PREENREGISTREMENT_COMPTE_CLIENT_ID'));
        }

    }


});


