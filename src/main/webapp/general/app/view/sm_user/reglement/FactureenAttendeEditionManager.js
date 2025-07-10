var url_services_data_factureententeedition = '../webservices/sm_user/journalvente/ws_facture_ententeedition.jsp';
var url_services_data_factureententeedition_generate_pdf = '../webservices/sm_user/journalvente/ws_generate_facture_attente_edition.jsp';
var url_services_data_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';

var Me;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
function amountformatbis(val) {
    return amountformat(val) + " F CFA";
}
Ext.define('testextjs.view.sm_user.reglement.FactureenAttendeEditionManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'factureenattenteedition',
    id: 'factureenattenteeditionID',
    title: 'Liste des factures en attentes d\'&eacute;dition',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Famille',
        'Ext.ux.ProgressBarPager'

    ],
    
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function() {

        Me = this;

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            groupField: 'MOUVEMENT',
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_factureententeedition,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        /*
        var storetierspayant = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tierspayant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });*/

var searchstore = Ext.create('Ext.data.Store', {
            idProperty: 'lgTIERSPAYANTID',
            fields:
                    [
                        {name: 'lgTIERSPAYANTID',
                            type: 'string'
                        },
                        {name: 'strFULLNAME',
                            type: 'string'
                        }
                  ],

            autoLoad: false,
            pageSize: 999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/client/tiers-payants',
                reader: {

                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });   

        var int_PRICE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    flex: 0.7,
                    fieldLabel: 'Total Bon::',
                    fieldWidth: 150,
                    name: 'int_PRICE',
                    id: 'int_PRICE',
                    renderer: amountformatbis,
                    fieldStyle: "color:blue;",
                    // margin: '0 5 15 15',
                    value: "0"


                });

        var int_PRICE_DETAIL = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    flex: 0.7,
                    fieldLabel: 'Total Attendu::',
                    fieldWidth: 150,
                    name: 'int_PRICE_DETAIL',
                    id: 'int_PRICE_DETAIL',
                    renderer: amountformatbis,
                    fieldStyle: "color:blue;",
                    // margin: '0 5 15 15',
                    value: "0"


                });
                
                 var int_TOTAL_FOLDER = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    flex: 0.7,
                    fieldLabel: 'Total Dossier(s)::',
                    fieldWidth: 150,
                    name: 'int_TOTAL_FOLDER',
                    id: 'int_TOTAL_FOLDER',
                    renderer: amountformat,
                    fieldStyle: "color:blue;",
                    // margin: '0 5 15 15',
                    value: "0"


                });
        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            plugins: [this.cellEditing],
            store: store,
            id: 'OGrid',
            features: [
                {
                    ftype: 'groupingsummary',
                    showSummaryRow: true
                }],
            columns: [
                /*
                 {
                 xtype: 'rownumberer',
                 text: 'Num',
                 width: 45,
                 sortable: true
                 },*/
                {
                    header: 'ORGANISME',
                    dataIndex: 'MOUVEMENT',
                    flex: 1,
                    hidden: true
                },
                {
                    header: 'No BON',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1
                },
                {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1
                },
                {
                    header: 'Heure',
                    dataIndex: 'lg_ETAT_ARTICLE_ID',
                    flex: 0.7
                },
                {
                    header: 'Client',
                    dataIndex: 'str_DESCRIPTION_PLUS',
                    flex: 2.5,
                    summaryType: "count",
                    summaryRenderer: function(value) {
                        return "<b>Nombre(s) Dossier(s) : </b><span style='color:blue;font-weight:600;'>" + value + "</span>";

                    }
                },
                {
                    header: 'Matricule',
                    dataIndex: 'lg_AJUSTEMENTDETAIL_ID',
                    flex: 1
                },
                {
                    header: 'Total Bon',
                    dataIndex: 'int_PRICE_DETAIL',
                    flex: 1,
                    align: 'right',
                    summaryType: "sum",
                    renderer: amountformat,
                    summaryRenderer: function(value) {
                        return "<span style='color:blue;font-weight:600;'>" + amountformat(parseInt(value)) + "</span> ";
                    }
                }, {
                    header: 'Montant Attendu',
                    dataIndex: 'int_QTEDETAIL',
                    flex: 1,
                    align: 'right',
                    summaryType: "sum",
                    renderer: amountformat,
                    summaryRenderer: function(value) {
                        return "<span style='color:blue;font-weight:600;'>" + amountformat(parseInt(value)) + "</span> ";
                    }
                }, /* {
                 header: 'Ecart',
                 dataIndex: 'int_NUMBERDETAIL',
                 flex: 1,
                 align: 'right',
                 summaryType: "sum",
                 summaryRenderer: function(value) {
                 return "<span style='color:blue;font-weight:600;'>" + amountformat(parseInt(value)) + "</span> ";
                 }
                 },*/

            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'datefield',
                    fieldLabel: 'Du',
                    name: 'dt_debut',
                    id: 'dt_debut_journal',
                    allowBlank: false,
                    margin: '0 10 0 0',
                    submitFormat: 'Y-m-d',
                    flex: 1,
                    labelWidth: 50,
                    maxValue: new Date(),
                    format: 'd/m/Y',
                    listeners: {
                        'change': function(me) {
                            Ext.getCmp('dt_fin_journal').setMinValue(me.getValue());
                            /*  dt_Date_Debut = me.getSubmitValue();
                             Ext.getCmp('OGrid').getStore().getProxy().url = url_services_data_factureententeedition + "?&dt_Date_Debut=" + dt_Date_Debut;
                             */
                        }
                    }
                }, {
                    xtype: 'datefield',
                    fieldLabel: 'Au',
                    name: 'dt_fin',
                    id: 'dt_fin_journal',
                    allowBlank: false,
                    labelWidth: 50,
                    flex: 1,
                    maxValue: new Date(),
                    margin: '0 9 0 0',
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function(me) {
                            /*  dt_Date_Fin = me.getSubmitValue();
                             Ext.getCmp('OGrid').getStore().getProxy().url = url_services_data_factureententeedition + "?&dt_Date_Debut=" + dt_Date_Debut + "&dt_Date_Fin=" + dt_Date_Fin;
                             */
                            Ext.getCmp('dt_debut_journal').setMaxValue(me.getValue());
                        }
                    }
                }, {
                    xtype: 'timefield',
                    fieldLabel: 'De',
                    // margin: '0 7 0 0',
                    name: 'h_debut',
                    id: 'h_debut',
                    emptyText: 'Heure debut(HH:mm)',
                    allowBlank: false,
                    flex: 1,
                    hidden: true,
                    labelWidth: 50,
                    increment: 30,
                    //maxValue: new Date(),
                    //submitFormat: 'Y-m-d',
                    format: 'H:i',
                    listeners: {
                        'change': function(me) {
                            Ext.getCmp('h_fin').setMinValue(me.getValue());
                            /*  h_debut = me.getSubmitValue();
                             Ext.getCmp('OGrid').getStore().getProxy().url = url_services_data_factureententeedition + "?&dt_Date_Debut=" + dt_Date_Debut + "&dt_Date_Fin=" + dt_Date_Fin + "&h_debut=" + h_debut;
                             */
                        }
                    }
                }, {
                    xtype: 'timefield',
                    fieldLabel: 'A',
                    name: 'h_fin',
                    id: 'h_fin',
                    emptyText: 'Heure fin(HH:mm)',
                    allowBlank: false,
                    labelWidth: 50,
                    increment: 30,
                    hidden: true,
                    flex: 1,
                    format: 'H:i',
                    // margin: '0 7 0 0',
                    listeners: {
                        'change': function(me) {
                            Ext.getCmp('h_debut').setMaxValue(me.getValue());
                            /*h_fin = me.getSubmitValue();
                             Ext.getCmp('OGrid').getStore().getProxy().url = url_services_data_factureententeedition + "?&dt_Date_Debut=" + dt_Date_Debut + "&dt_Date_Fin=" + dt_Date_Fin + "&h_debut=" + h_debut + "&h_fin=" + h_fin;
                             */
                        }
                    }
                },
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Rech',
                    flex: 1,
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                }, '-', {
                    xtype: 'combobox',
                    id: 'lg_TIERS_PAYANT_ID',
                    flex: 1,
                    store: searchstore,
                    pageSize: 10,
                    valueField: 'lgTIERSPAYANTID',
                    displayField: 'strFULLNAME',
//                    minChars: 2,
                    queryMode: 'remote',
                    enableKeyEvents: true,
                    emptyText: 'Selectionner tiers payant...',
                    listConfig: {
                        loadingText: 'Recherche...',
                        emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                        getInnerTpl: function () {
                            return '<span>{strFULLNAME}</span>';
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
                },'-', {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
                    handler: this.onRechClick
                }, {
                    text: 'Imprimer',
                    tooltip: 'imprimer',
                    scope: this,
                    iconCls: 'printable',
//                    hidden: true, //a retirer demain
                    handler: this.onPdfListVenteClick
                }
            ],
            bbar: {
                dock: 'bottom',
                items: [
                    {
                        xtype: 'pagingtoolbar',
                        displayInfo: true,
                        flex: 2,
                        pageSize: itemsPerPage,
                        store: store, // same store GridPanel is using
                        listeners: {
                            beforechange: function(page, currentPage) {
                                var myProxy = this.store.getProxy();
                                myProxy.params = {
                                    dt_Date_Debut: '',
                                    dt_Date_Fin: '',
                                    search_value: '',
                                    h_debut: '',
                                    h_fin: '',
                                    str_TYPE_VENTE: 'VO', 
                                    lg_TIERS_PAYANT_ID: ''
                                };

                                myProxy.setExtraParam('dt_Date_Debut', Ext.getCmp('dt_debut_journal').getSubmitValue());
                                myProxy.setExtraParam('dt_Date_Fin', Ext.getCmp('dt_fin_journal').getSubmitValue());
                                myProxy.setExtraParam('search_value', Ext.getCmp('rechecher').getValue());
                                myProxy.setExtraParam('h_debut', Ext.getCmp('h_debut').getSubmitValue());
                                myProxy.setExtraParam('h_fin', Ext.getCmp('h_fin').getSubmitValue());
                                myProxy.setExtraParam('lg_TIERS_PAYANT_ID', Ext.getCmp('lg_TIERS_PAYANT_ID').getValue());
                            }

                        }
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    int_PRICE,
                    int_PRICE_DETAIL,
                    int_TOTAL_FOLDER
                ]
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });

    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
        if (this.getStore().getCount() > 0) {
            var int_PRICE = 0, int_PRICE_DETAIL = 0, int_TOTAL_FOLDER = 0;

            this.getStore().each(function(rec) {
                // alert(rec.get('VENTE_NET') +" "+ rec.get('int_PRICE_REMISE') +" " + rec.get('int_PRICE'));
                int_PRICE_DETAIL = rec.get('int_NUMBER_AVAILABLE_DECONDITION');
                int_PRICE = rec.get('int_NUMBERDETAIL');
                int_TOTAL_FOLDER = rec.get('int_SEUIL_RESERVE');

            });

            Ext.getCmp('int_PRICE_DETAIL').setValue(int_PRICE_DETAIL);
            Ext.getCmp('int_PRICE').setValue(int_PRICE);
            Ext.getCmp('int_TOTAL_FOLDER').setValue(int_TOTAL_FOLDER);
        }

    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        if (new Date(Ext.getCmp('dt_debut_journal').getSubmitValue()) > new Date(Ext.getCmp('dt_fin_journal').getSubmitValue())) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }

        this.getStore().load({
            params: {
                /*   dt_Date_Debut: dt_Date_Debut,
                 dt_Date_Fin: dt_Date_Fin,
                 search_value: val.getValue(),
                 str_ACTION: str_TYPE_TRANSACTION*/

                dt_Date_Debut: Ext.getCmp('dt_debut_journal').getSubmitValue(),
                dt_Date_Fin: Ext.getCmp('dt_fin_journal').getSubmitValue(),
                search_value: val.getValue(),
                h_debut: Ext.getCmp('h_debut').getSubmitValue(),
                h_fin: Ext.getCmp('h_fin').getSubmitValue(),
                str_TYPE_VENTE: 'VO',
                lg_TIERS_PAYANT_ID: Ext.getCmp('lg_TIERS_PAYANT_ID').getValue()
            }
        }, url_services_data_modificationprix);
    },
    onPdfListVenteClick: function() {

        var search_value = Ext.getCmp('rechecher').getValue(), lg_TIERS_PAYANT_ID = "";

        if(Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() != null) {
            lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        }

        if (new Date(Ext.getCmp('dt_debut_journal').getSubmitValue()) > new Date(Ext.getCmp('dt_fin_journal').getSubmitValue())) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }
        //

        var linkUrl = url_services_data_factureententeedition_generate_pdf + '?dt_Date_Debut=' + Ext.getCmp('dt_debut_journal').getSubmitValue() + "&dt_Date_Fin=" + Ext.getCmp('dt_fin_journal').getSubmitValue() + "&search_value=" + search_value + "&lg_TIERS_PAYANT_ID="+lg_TIERS_PAYANT_ID +"&title=RELEVE DES DOSSIERS EN ATTENTE D'EDITION";
//        alert("linkUrl " + linkUrl);
        /*Me.lunchPrinter(linkUrl);*/
        

        window.open(linkUrl);

    },
});