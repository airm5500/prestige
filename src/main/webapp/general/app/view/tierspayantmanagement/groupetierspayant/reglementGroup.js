/* global Ext */



var url_services_data_modereglement_dovente = '../webservices/sm_user/modereglement/ws_data.jsp';


var odatasource;
var my_url;
var Me;
var Omode;
var ref;
var net = 0;

var AMOUNT;
var str_CUSTOMER = "";
var NBFACTURES;

var str_LIB = "";
var AMOUNTPAYE;
var MONTANTRESTANT;

var in_total_vente;
var int_total_formated;
var int_montant_vente;
var int_montant_achat;
var checkedList;
var listProductSelected;
var LaborexWorkFlow;
var myAppController;
var isHide = true;
var facturesARegle = [];
var tempStore;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.tierspayantmanagement.groupetierspayant.reglementGroup', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',

        'testextjs.controller.LaborexWorkFlow',
        'Ext.ux.CheckColumn',
        'Ext.selection.CheckboxModel',

        'testextjs.controller.App',
        'testextjs.model.Facture'
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
    xtype: 'reglementGroupeFacture',
    id: 'reglementGroupeFactureID',
    frame: true,
    title: 'Faire R&eacute;glement',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {
        Me = this;
        listProductSelected = [];
        checkedList = [];
        facturesARegle = [];
        var itemsPerPage = 20;
        famille_id_search = "";
        in_total_vente = 0;
        int_total_formated = 0;
        isHide = true;
        ref = this.getNameintern();
        odatasource = this.getOdatasource();
        AMOUNT = odatasource.AMOUNT;
        NBFACTURES = odatasource.NBFACTURES;
        CODEFACTURE = this.getOdatasource().CODEFACTURE;
        NBFACTURES = odatasource.NBFACTURES;
        lg_FACTURE_ID = odatasource.lg_FACTURE_ID;
        str_LIB = odatasource.str_LIB;

        MONTANTRESTANT = odatasource.MONTANTRESTANT;
        AMOUNTPAYE = odatasource.AMOUNTPAYE;
        net = 0;
        titre = this.getTitre();
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        myAppController = Ext.create('testextjs.controller.App', {});

        my_url = '../webservices/sm_user/modereglement/ws_data.jsp';

        var store_modereglement = LaborexWorkFlow.BuildStore('testextjs.model.ModeReglement', itemsPerPage, url_services_data_modereglement_dovente);

        tempStore = Ext.create("Ext.data.Store", {
            fields: ["lg_FACTURE_ID", "MONTANTRESTANT"],
            pageSize: 200,
//            data: [],
            proxy: {
                type: "memory",
                reader: {
                    type: "array"
                }
            }


        });

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
        var store_detail_bordereau = Ext.data.Store({
            model: 'testextjs.model.Facture',
            pageSize: 15,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/groupe/ws_invoices.jsp?CODEFACTURE=' + CODEFACTURE,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });




        var store_type_paiement = Ext.create('Ext.data.Store', {
            autoLoad: true,
            fields: ['lg_NATURE_PAIEMENT_ID', 'str_LIBELLE_NATURE_PAIEMENT'],
            data: [
                {"lg_NATURE_PAIEMENT_ID": "1", "str_LIBELLE_NATURE_PAIEMENT": "Partiel"},
                {"lg_NATURE_PAIEMENT_ID": "2", "str_LIBELLE_NATURE_PAIEMENT": "Total"}
            ]
        });



        var int_MONTANT_REGLEMENT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Net &agrave payer :',
                    //labelWidth: 95,
                    name: 'int_MONTANT_REGLEMENT',
                    id: 'int_MONTANT_REGLEMENT',
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    fieldStyle: "color:red;font-weight:800;",
                    listeners: {
                        change: function () {
                            var int_AMOUNT_RECU = Ext.getCmp('int_AMOUNT_RECU').getValue();


                            if (int_AMOUNT_RECU !== "") {
                                var int_total = 0;
                                var in_total_vente_monnaie = 0;
                                var in_total_vente_monnaie_temp = 0;
                                var int_monnaie_monnaie = 0;
                                var int_amount_restant = 0;
                                in_total_vente_monnaie_temp = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_MONTANT_REGLEMENT').getValue(), " ");
                                var in_total_vente_monnaie_temp_final = LaborexWorkFlow.amountdeformat(in_total_vente_monnaie_temp);
                                in_total_vente_monnaie = Number(in_total_vente_monnaie_temp_final);

                                var int_montant_recu = (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()));
                                int_monnaie_monnaie = Number(LaborexWorkFlow.DisplayMonnaie(in_total_vente_monnaie, int_montant_recu));
                                int_amount_restant = Number(LaborexWorkFlow.DisplayAmountRestant(in_total_vente_monnaie, int_montant_recu));
                                Ext.getCmp('int_AMOUNT_REMIS').setValue(amountformat(int_monnaie_monnaie) + ' CFA');
                                Ext.getCmp('int_REEL_RESTE').setValue(amountformat(int_amount_restant) + ' CFA');
                                var int_amount_restant = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
                                var int_amount_restant_final = 0;
                                int_amount_restant_final = Number(int_amount_restant);
                            }




                        }},
                    margin: '0 15 0 0',
                    value: "0"
                });

        Ext.apply(this, {
            width: '96%',
            minHeight: 580,
//            cls: 'custompanel',

            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 120,
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
            items: [
                {
                    xtype: 'fieldset',
                    id: 'fieldset_information_organisme',
                    title: 'Information R&eacute;glement',
                    collapsible: false,
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
                            //allowBlank: false,
                            labelWidth: 100,
                            name: 'lg_NATURE_PAIEMENT',
                            margins: '0 0 0 10',
                            id: 'lg_NATURE_PAIEMENT',
                            store: store_type_paiement,
                            //disabled: true,
                            valueField: 'lg_NATURE_PAIEMENT_ID',
                            displayField: 'str_LIBELLE_NATURE_PAIEMENT',
                            typeAhead: true,
                            queryMode: 'local',
                            // flex: 1,
                            emptyText: 'Selectionner ',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();
                                    var grid = Ext.getCmp('reglementGROUPID');

                                    if (value === "1") {
                                        grid.columns[8].setVisible(true);
                                        grid.columns[9].setVisible(true);
                                        Ext.getCmp('int_MONTANT_REGLEMENT').setValue(0);
                                        Ext.getCmp('selectALL').show();


                                    } else {

                                        if (grid.columns[7].isVisible()) {
                                            grid.columns[7].setVisible(false); 
                                            grid.columns[8].setVisible(false);
                                        }
                                        Ext.getCmp('int_MONTANT_REGLEMENT').setValue(Ext.getCmp('MONTANTRESTANT').getValue());
                                    }
                                    // customer_id = value;


                                }
                            }
                        }



                        , {
                            xtype: 'datefield',
                            fieldLabel: 'Date R&eacute;glement',
                            id: 'dt_reglement',
                            labelWidth: 130,
                            name: 'dt_reglement',
                            emptyText: 'Date reglement',
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y',
                            margin: '0 0 0 15'

                        },
                        {
                            xtype: 'hiddenfield',
                            name: 'str_ref_reglement_hidden',
                            id: 'str_ref_reglement_hidden',
                            value: '0'
                        }, {
                            xtype: 'displayfield',
                            fieldLabel: 'Groupe Organisme : ',
                            fieldStyle: "color:blue;font-weight:800;",
                            name: 'cmb_CUSTOMER_ID',
                            margin: '0 15 0 15',
                            id: 'cmb_CUSTOMER_ID'
                        }

                    ]
                },
                {
                    xtype: 'fieldset',
                    id: 'fieldset_information_reglement',
                    title: 'Information Facture',
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
                            fieldLabel: 'Montant Total:',
                            labelWidth: 100,
                            margin: '0 5',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            id: 'TOTAL_AMOUNT',
                            fieldStyle: "color:blue;font-weight:800;"
                        }
                        ,
                        int_MONTANT_REGLEMENT,
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'Montant Pay&eacute;:',
                            margin: '0 5',
                            name: 'AMOUNTPAYE',
                            id: 'AMOUNTPAYE',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:green;font-weight:800;"
                        }, {
                            xtype: 'displayfield',
                            fieldLabel: 'Montant Restant:',
                            margin: '0 5',
                            name: 'MONTANTRESTANT',
                            id: 'MONTANTRESTANT',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            fieldStyle: "color:blue;font-weight:800;"
                        },
                        {
                            hidden: true,
                            xtype: 'checkbox',
                            margins: '0 0 5 5',
                            boxLabel: 'Tous S&eacute;lectionner',
                            id: 'selectALL',
                            checked: false,
                            listeners: {
                                change: function () {

                                    //
                                    var grid = Ext.getCmp('reglementGROUPID');
                                    var CODEstore = grid.getStore();
                                    if (this.getValue()) {

                                        net = Ext.getCmp('MONTANTRESTANT').getValue();

                                        Ext.getCmp('int_MONTANT_REGLEMENT').setValue(Ext.getCmp('MONTANTRESTANT').getValue());


                                        for (var i = 0; i < CODEstore.getCount(); i++) {
                                            var record = CODEstore.getAt(i);
                                            record.set('isChecked', true);
                                        }


                                    } else {
                                        net = 0;
                                        Ext.getCmp('int_MONTANT_REGLEMENT').setValue(0);

//                                                 Ext.getCmp('int_AMOUNT_RECU').setValue(net);
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
                    title: 'Detail(s) des r&eacute;glements',
                    collapsible: false,
                    flex: 2.8,
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
                            id: 'reglementGROUPID',
//                          
                            plugins: [
                                {
                                    ptype: "cellediting",
                                    pluginId: 'reglementEditor',
                                    clicksToEdit: 1

                                }],

                            store: store_detail_bordereau,
                            height: 300,
                            columns: [
                                {
                                    text: '#',
                                    flex: 1,
                                    hidden: true,
                                    dataIndex: 'lg_FACTURE_ID'
                                }, {
                                    text: 'Organisme',
                                    flex: 1.5,

                                    dataIndex: 'str_CUSTOMER_NAME'
                                },
                                {
                                    text: 'P&eacute;riode',
                                    flex: 1.2,
                                    dataIndex: 'str_PERIODE'

                                }, {
                                    text: 'Num.Facture',
                                    dataIndex: 'str_CODE_FACTURE',
                                    flex: 0.8
                                }
                                ,

                                {
                                    header: 'Nbre.Dossiers',
                                    dataIndex: 'int_NB_DOSSIER',
                                    flex: 0.8,
                                    renderer: amountformat,
                                    align: 'right'
                                }
                                ,
                                {
                                    text: 'Montant',
                                    flex: 1,
                                    dataIndex: 'dbl_MONTANT_CMDE',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Montant Pay&eacute;',
                                    flex: 1,
                                    dataIndex: 'dbl_MONTANT_PAYE',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Montant Restant',
                                    flex: 1,
                                    dataIndex: 'dbl_MONTANT_RESTANT',
                                    renderer: amountformat,
                                    align: 'right'
                                },

                                {
                                    text: 'Montant Versée',
                                    flex: 1,
                                    dataIndex: 'MONTANTVERSEE',
                                    renderer: amountformat,
                                    align: 'right',
                                    editor: {

                                        xtype: 'textfield',
                                        allowBlank: false,

                                        maskRe: /[0-9.]/,
                                        selectOnFocus: true,
                                        //readOnly:true, 
                                        enableKeyEvents: true,
                                        listeners: {

                                            specialKey: function (field, e, options) {
                                                if (e.getKey() === e.ENTER)

                                                {
                                                    var grid = Ext.getCmp('reglementGROUPID');
                                                    var record = grid.getSelectionModel().getSelection();
                                                    var position = grid.getSelectionModel().getCurrentPosition();


                                                    var lg_FACTURE_ID = record[0].get("lg_FACTURE_ID");

                                                    var dbl_MONTANT_RESTANT = record[0].get('dbl_MONTANT_RESTANT');
                                                    var MONTANTVIRTUEL = record[0].get('MONTANTVIRTUEL');

                                                    var montant = this.getValue();


                                                    if (montant > 0 && (montant <= dbl_MONTANT_RESTANT)) {

                                                        if (record[0].get('isChecked')) {
                                                            net -= Number(dbl_MONTANT_RESTANT);
                                                            net += Number(montant);
                                                            Ext.getCmp('int_MONTANT_REGLEMENT').setValue(net);
                                                            var curRecord = tempStore.findRecord("lg_FACTURE_ID", lg_FACTURE_ID);

                                                            if (curRecord === null) {
                                                                tempStore.add({lg_FACTURE_ID: lg_FACTURE_ID, MONTANTRESTANT: montant});
                                                            } else {

                                                                curRecord.set('MONTANTRESTANT', montant);
                                                            }
                                                            grid.getStore().commitChanges();

                                                        } else {
                                                            Ext.MessageBox.show({
                                                                title: 'Alerte',
                                                                msg: 'Attenttion, La colonne n\'est pas sélectionnée',
                                                                buttons: Ext.MessageBox.OK,
                                                                icon: Ext.MessageBox.QUESTION,
                                                                width: 400,
                                                                fn: function (btn) {

                                                                    Ext.getCmp('reglementGROUPID').getPlugin('reglementEditor').startEditByPosition({row: Number(position.row), column: Number(position.column)});
                                                                    Ext.getCmp('reglementGROUPID').getPlugin('reglementEditor').startEdit(Number(position.row), Number(position.column));
                                                                    return false;

                                                                }
                                                            });

                                                        }



                                                    } else if (montant > dbl_MONTANT_RESTANT) {
                                                        Ext.MessageBox.show({
                                                            title: 'Alerte',
                                                            msg: 'Attenttion, Le montant saisi doit être égale au reste à payer ',
                                                            buttons: Ext.MessageBox.OK,
                                                            icon: Ext.MessageBox.QUESTION,
                                                            width: 400,
                                                            fn: function (btn) {

                                                                Ext.getCmp('reglementGROUPID').getPlugin('reglementEditor').startEditByPosition({row: Number(position.row), column: Number(position.column)});
                                                                Ext.getCmp('reglementGROUPID').getPlugin('reglementEditor').startEdit(Number(position.row), Number(position.column));
                                                                return false;

                                                            }
                                                        });
                                                    }


                                                }



                                            }
                                        }


                                    }





                                },
                                {
                                    text: '',
                                    width: 50,
                                    hidden: true,
                                    dataIndex: 'isChecked',
                                    xtype: 'checkcolumn',
                                    listeners: {
                                        checkChange: this.onCheckChange
                                    }

                                }, {
                                    text: '',
                                    flex: 1,
                                    dataIndex: 'MONTANTVIRTUEL',

                                    align: 'right',
                                    hidden: true
                                }

                            ]
                            , selModel: {
                                selType: 'cellmodel'
                            },
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 15,
                                store: store_detail_bordereau,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            }
                        },

                        {
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
                            // layout: 'anchor',
                            /*defaults: {
                             anchor: '100%'
                             },*/
                            items: [
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            labelWidth: 120,
                                            fieldLabel: 'Type.R&eacute;glement',
                                            name: 'lg_TYPE_REGLEMENT_ID',
                                            id: 'lg_TYPE_REGLEMENT_ID',
                                            store: store_typereglement,
                                            value: 'Cheques',
                                            width: '50%',
                                            valueField: 'lg_TYPE_REGLEMENT_ID',
                                            displayField: 'str_NAME',
                                            typeAhead: true,
                                            queryMode: 'remote',
//                                            allowBlank: false,
                                            emptyText: 'Choisir un type de reglement...',
                                            listeners: {
                                                select: function (cmp) {
                                                    LaborexWorkFlow.FindComponentToHideDisplay('lg_TYPE_REGLEMENT_ID', 'str_LIEU', 'str_BANQUE', 'str_NOM', 'int_TAUX_CHANGE', 'str_CODE_MONNAIE');

                                                    var value = this.getValue();
                                                    var combolg_MODE_REGLEMENT_ID = Ext.getCmp('lg_MODE_REGLEMENT_ID');
                                                    if (value !== "1") {
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
                                                            combolg_MODE_REGLEMENT_ID.setValue('2');
                                                            combolg_MODE_REGLEMENT_ID.show();
                                                        } else {
                                                            combolg_MODE_REGLEMENT_ID.hide();

                                                        }

                                                    } else {
                                                        combolg_MODE_REGLEMENT_ID.hide();
                                                    }
                                                    if (value === "2" || value === "3") {

                                                        Ext.getCmp('str_LIEU').setFieldLabel("Lieu:");
                                                    }

                                                    if (value !== "1") {
                                                        Ext.getCmp('int_AMOUNT_RECU').setValue(LaborexWorkFlow.amountdeformat(Ext.getCmp('int_MONTANT_REGLEMENT').getValue()));


                                                        //   Ext.getCmp('int_AMOUNT_RECU').setDisabled(true); //commente le 07/04/2017
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
                                            fieldLabel: 'Mode.R&eacute;glement',
                                            name: 'lg_MODE_REGLEMENT_ID',
                                            id: 'lg_MODE_REGLEMENT_ID',
                                            flex: 1,
                                            hidden: false,
                                            store: store_modereglement,
                                            valueField: 'lg_MODE_REGLEMENT_ID',
                                            value: '2',
                                            displayField: 'str_NAME',
                                            typeAhead: true,
                                            queryMode: 'local',
                                            emptyText: 'Choisir un mode de reglement...',
                                            listeners: {
                                                select: function () {
                                                    Ext.getCmp('str_NOM').focus(true, 100, function () {

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
                                            hidden: false,
                                            flex: 2
//                                            allowBlank: false
                                        },
                                        {
                                            xtype: 'textfield',
                                            name: 'str_BANQUE',
                                            id: 'str_BANQUE',
                                            fieldLabel: 'Banque',
                                            hidden: false,
                                            flex: 1
                                        },
                                        {
                                            xtype: 'textfield',
                                            name: 'str_LIEU',
                                            id: 'str_LIEU',
                                            fieldLabel: 'Lieu',
                                            hidden: false,
                                            flex: 1
//                                            allowBlank: false
                                        }]}, {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            name: 'str_CODE_MONNAIE',
                                            id: 'str_CODE_MONNAIE',
                                            fieldLabel: 'Code.Monnaie',
                                            hidden: true,
                                            value: "Fr",
                                            flex: 1
//                                            
                                        },
                                        {
                                            xtype: 'textfield',
                                            name: 'int_TAUX_CHANGE',
                                            id: 'int_TAUX_CHANGE',
                                            fieldLabel: 'Taux.Change',
                                            hidden: true,
                                            flex: 1,
                                            value: 0,
                                            maskRe: /[0-9.]/,
                                            minValue: 0
//                                          
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
                                                    in_total_vente_monnaie_temp = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_MONTANT_REGLEMENT').getValue(), " ");
                                                    var in_total_vente_monnaie_temp_final = LaborexWorkFlow.amountdeformat(in_total_vente_monnaie_temp);
                                                    in_total_vente_monnaie = Number(in_total_vente_monnaie_temp_final);

                                                    var int_montant_recu = (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()));
                                                    int_monnaie_monnaie = Number(LaborexWorkFlow.DisplayMonnaie(in_total_vente_monnaie, int_montant_recu));
                                                    int_amount_restant = Number(LaborexWorkFlow.DisplayAmountRestant(in_total_vente_monnaie, int_montant_recu));
                                                    Ext.getCmp('int_AMOUNT_REMIS').setValue(amountfarmat(int_monnaie_monnaie) + ' CFA');
                                                    Ext.getCmp('int_REEL_RESTE').setValue(amountformat(int_amount_restant) + ' CFA');
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
                                            name: 'int_AMOUNT_REMIS',
                                            id: 'int_AMOUNT_REMIS',
                                            fieldStyle: "color:blue;font-weight:800;",
                                            margin: '0 15 0 0',
                                            value: 0 + " CFA",
                                            align: 'right'
                                        }, {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Reste &agrave; payer:',
                                            fieldStyle: "color:blue;font-weight:800;",
                                            name: 'int_REEL_RESTE',
                                            id: 'int_REEL_RESTE',
                                            value: 0
                                        }]}
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
                                    text: 'R&eacute;gler La facture',
                                    id: 'btn_create_facture',
                                    iconCls: 'icon-clear-group',
                                    scope: this,

                                    handler: this.Doreglement
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
                    ]

                }

            ]

        });
        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });

        var grid = Ext.getCmp('reglementGROUPID');
        var all = Ext.getCmp('selectALL');

        grid.getStore().on(
                "load", function () {


                    var CODEstore = grid.getStore();
                    if (listProductSelected.length > 0) {
                        var record;
                        Ext.each(listProductSelected, function (lg, index) {
                            CODEstore.each(function (r, id) {
                                record = CODEstore.findRecord('lg_FACTURE_ID', lg);
                                if (record !== null) {

                                    record.set('isChecked', true);
                                }


                            });

                        });
                        if (record !== null) {
                            grid.reconfigure(grid.getStore());
                        }

                    }
                    if (all.getValue()) {
                        CODEstore.each(function (r, id) {
                            r.set('isChecked', true);

                        });
                        CODEstore.each(function (r, id) {
                            Ext.each(checkedList, function (lg, index) {

                                if (r.get('lg_FACTURE_ID') === lg) {
                                    r.set('isChecked', false);
                                }

                            });

                            grid.reconfigure(grid.getStore());
                        });


                        grid.reconfigure(grid.getStore());
                    }

                }

        );
        Ext.getCmp('int_MONTANT_REGLEMENT').setValue(MONTANTRESTANT);


        Ext.getCmp('cmb_CUSTOMER_ID').setValue(str_LIB);
        Ext.getCmp('AMOUNTPAYE').setValue(AMOUNTPAYE);
        Ext.getCmp('MONTANTRESTANT').setValue(MONTANTRESTANT);
        Ext.getCmp('TOTAL_AMOUNT').setValue(AMOUNT);


        var combo = Ext.getCmp('lg_NATURE_PAIEMENT');

        combo.setValue("2");




    },
    loadStore: function () {
        Ext.getCmp('reglementGROUPID').getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
        var grid = Ext.getCmp('reglementGROUPID');

        var naturepaiment = Ext.getCmp('lg_NATURE_PAIEMENT').getValue();
        if (grid.getStore().getCount() > 0) {
            var firstRec = grid.getStore().getAt(0);
            //  Ext.getCmp('int_Nbr_Dossier').setValue(firstRec.get('NBFACTURES_RESTANT'));

            if (naturepaiment === "2") {
                grid.columns[7].setVisible(false);
//                LaborexWorkFlow.findColumnByDataIndex(grid, 7).setVisible(false);

            }
        }
    },
    onbtncancel: function () {

        //  var xtype = "groupeInvoices";
        var xtype = "facturemanager";

        testextjs.app.getController('App').onLoadNewComponent(xtype, "", "");
    },
    checkIfGridIsEmpty: function () {
        var gridTotalCount = Ext.getCmp('reglementGROUPID').getStore().getTotalCount();
        return gridTotalCount;
    },
    Doreglement: function () {
        var mode = 0;
        var int_AMOUNT_RECU = Ext.getCmp('int_AMOUNT_RECU').getValue();
        var MODE_REGLEMENT = Ext.getCmp('lg_MODE_REGLEMENT_ID').getValue();
        var TIERS_PAYANT = Ext.getCmp('cmb_CUSTOMER_ID').getValue();
        var TYPE_REGLEMENT = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue();
        var str_LIEU = Ext.getCmp('str_LIEU').getValue();
        var str_CODE_MONNAIE = Ext.getCmp('str_CODE_MONNAIE').getValue();
        var str_BANQUE = Ext.getCmp('str_BANQUE').getValue();
        var dt_reglement = Ext.Date.format(Ext.getCmp('dt_reglement').getValue(), 'Y-m-d');
        var str_NOM = Ext.getCmp('str_NOM').getValue();
        var int_TAUX_CHANGE = Ext.getCmp('int_TAUX_CHANGE').getValue();

        var int_AMOUNT_REMIS = LaborexWorkFlow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
        var lg_NATURE_PAIEMENT = Ext.getCmp('lg_NATURE_PAIEMENT').getValue();
        var int_MONTANT_REGLEMENT = Ext.getCmp('int_MONTANT_REGLEMENT').getValue();
        if (TYPE_REGLEMENT === 'Cheques') {
            MODE_REGLEMENT = "2";
            TYPE_REGLEMENT = "2";
        }

        if (TYPE_REGLEMENT === 'Especes' || TYPE_REGLEMENT === '1') {
            MODE_REGLEMENT = "1";
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


        if (lg_NATURE_PAIEMENT === "2") {
            if (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()) < Number(Ext.getCmp('int_MONTANT_REGLEMENT').getValue()))
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

        if (lg_NATURE_PAIEMENT === "1") {
            if (listProductSelected.length > 0) {

                if (Number(Ext.getCmp('int_MONTANT_REGLEMENT').getValue()) === 0)
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
                if (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()) < Number(Ext.getCmp('int_MONTANT_REGLEMENT').getValue()))
                {
                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 300,
                        msg: 'Veuillez  saisir le montant total des factures à régler',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
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

        var tout = Ext.getCmp('selectALL').getValue();

        var myRecordToSend = [];
        if (lg_NATURE_PAIEMENT === "1") {
            if (tout) {
                if (checkedList.length > 0) {
                    mode = 1;
                }
            } else {
                if (listProductSelected.length > 0) {
                    mode = 2;
                    tempStore.each(function (record) {
                        myRecordToSend.push({'lg_FACTURE_ID': record.get('lg_FACTURE_ID'), 'montant': record.get('MONTANTRESTANT')});

                    });

                } else {
                    mode = 3;
                }
            }
        }

        myAppController.ShowWaitingProcess();
        Ext.Ajax.request({
            url: '../webservices/configmanagement/groupe/ws_reglement.jsp',
            timeout: 24000000,
            params: {
                mode: mode,

                CODEFACTURE: CODEFACTURE,
                MODE_REGLEMENT: MODE_REGLEMENT,
                TYPE_REGLEMENT: TYPE_REGLEMENT,

                str_LIEU: str_LIEU,
                str_CODE_MONNAIE: str_CODE_MONNAIE,
                str_BANQUE: str_BANQUE,
                str_NOM: str_NOM,
                NET_A_PAYER: int_MONTANT_REGLEMENT,
                int_TAUX_CHANGE: int_TAUX_CHANGE,
                int_AMOUNT_RECU: Number(Ext.getCmp('int_AMOUNT_RECU').getValue()),
                LISTDOSSIERS: Ext.encode(myRecordToSend),
                checkedList: Ext.encode(checkedList),
                dt_reglement: dt_reglement

            },
            success: function (response)
            {
                tempStore.removeAll();
                myAppController.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
//                alert(object.success);
                if (object.status === 1) {
                    checkedList = [];
                    listProductSelected = [];
                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 320,
                        msg: object.message,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING,
                        fn: function () {
//                            var xtype = "groupeInvoices";
//                            var alias = 'widget.' + xtype;
//                            testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion Factures Groupées", "");
                            var xtype = "facturemanager";
                            var alias = 'widget.' + xtype;
                            testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion Facturation", "");

                        }
                    });


                } else {
                    Ext.MessageBox.show({
                        title: 'Avertissement',
                        width: 320,
                        msg: object.message,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
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
            success: function (response)
            {
                boxWaitingProcess.hide();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
//                    return;
                }
                var xtype = "groupeInvoices";
                var alias = 'widget.' + xtype;
                testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion Factures Groupées", "");


            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
    },
    onTextFieldSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            Me.Doreglement();
        }
    },
    onfiltercheck: function () {
        var str_name = Ext.getCmp('str_NAME').getValue();
        var int_name_size = str_name.length;
        if (int_name_size < 4) {
            Ext.getCmp('btn_add').disable();
        }

    },
    DisplayTotal: function (int_price, int_qte) {
        var TotalAmount_final = 0;
        var TotalAmount_temp = int_qte * int_price;
        var TotalAmount = Number(TotalAmount_temp);
        return TotalAmount;
    },

    onsplitovalue: function (Ovalue) {

        var int_ovalue;
        var string = Ovalue.split(" ");
        int_ovalue = string[0];
        return int_ovalue;
    },
    onCheckChange: function (column, rowIndex, checked, eOpts) {
        Array.prototype.unset = function (val) {
            var index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            }
        };
        var store = Ext.getCmp('reglementGROUPID').getStore();
        var rec = store.getAt(rowIndex);
        var TYPE_REGLEMENT = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue();
        var curRecord = tempStore.findRecord("lg_FACTURE_ID", rec.get('lg_FACTURE_ID'));

        if (checked === true) {

            if (curRecord === null) {

                tempStore.add({lg_FACTURE_ID: rec.get('lg_FACTURE_ID'), MONTANTRESTANT: rec.get('MONTANTVERSEE')});
            } else {

                curRecord.set('MONTANTRESTANT', rec.get('MONTANTVERSEE'));
            }

            net += Number(rec.get('MONTANTVERSEE'));

            listProductSelected.push(rec.get('lg_FACTURE_ID'));
            checkedList.unset(rec.get('lg_FACTURE_ID'));
            Ext.getCmp('int_MONTANT_REGLEMENT').setValue(net);

            if (TYPE_REGLEMENT !== null && TYPE_REGLEMENT !== "1" && TYPE_REGLEMENT !== "Especes") {
                Ext.getCmp('int_AMOUNT_RECU').setValue(net);
            }



        } else {

            net = net - Number(rec.get('MONTANTVERSEE'));


            Ext.getCmp('int_MONTANT_REGLEMENT').setValue(net);
            if (TYPE_REGLEMENT !== null && TYPE_REGLEMENT !== "1") {
                Ext.getCmp('int_AMOUNT_RECU').setValue(net);
            }
            if (curRecord !== null) {
                var index = tempStore.findExact("lg_FACTURE_ID", rec.get('lg_FACTURE_ID'));

                tempStore.removeAt(index);
                tempStore.sync();

            }
            var all = Ext.getCmp('selectALL');

            if (all.getValue()) {

                checkedList.push(rec.get('lg_FACTURE_ID'));

                Ext.getCmp('int_MONTANT_REGLEMENT').setValue(net);
                if (TYPE_REGLEMENT !== null && TYPE_REGLEMENT !== "1") {
                    Ext.getCmp('int_AMOUNT_RECU').setValue('');
                }

            }
            listProductSelected.unset(rec.get('lg_FACTURE_ID'));


        }

    }


});


