

/* global Ext */
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
var Oview;
var Omode;
var Me;
var ref;
var valdatedebutDetail;
var valdatefinDetail;
var valdatedebutDetailOrder;
var valdatefinDetailOrder;
var OgridpanelID;
var OgridpanelOrder;
var lg_GROSSISTE_ORDER_ID;
var lg_TIERS_PAYANT_ID;
Ext.define('testextjs.view.tierspayantmanagement.tierspayant.action.detailstierspayant', {
    extend: 'Ext.window.Window',
    xtype: 'detailsclient',
    id: 'detailsclientID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'testextjs.model.TierspayantAccount'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {
        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        var itemsPerPage = 20;
        lg_TIERS_PAYANT_ID = this.getOdatasource().lg_TIERS_PAYANT_ID;
        var ayantdroits = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.Client',
            autoLoad: true,
            pageSize: 10,
            proxy: {
                type: 'ajax',
                url: '../webservices/tierspayantmanagement/tierspayant/ws_client.jsp?lg_TIERS_PAYANT_ID=' + this.getOdatasource().lg_TIERS_PAYANT_ID,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });


        var tierspayant = new Ext.data.Store({
            model: 'testextjs.model.TierspayantAccount',
            proxy: {
                type: 'ajax',
                url: '../webservices/tierspayantmanagement/tierspayant/ws_tierspayantaccount.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        tierspayant.load({
            params: {
                lg_TIERS_PAYANT_ID: this.getOdatasource().lg_TIERS_PAYANT_ID


            }
        });



        var tpltierps = Ext.create("Ext.XTemplate",
                '<table class="clientdata "><tr><th class="cell">Nombre de Clients</th> <th class="cell">Montant Vente</th>   <th class="cell">Montant Acompte</th></tr>',
                '<tplfor=".">',
                '<tr class ="ayantdroit"><td class="cell" style="text-align:right;">{NBLIENTS}</td><td class="cell" style="text-align:right;">{MONTANTCA}</td><td class="cell" style="text-align:right;">{ACCOUNT}</td></tr>',
                '</tpl></table>');



        var myDataviewTierspayants = Ext.create('Ext.view.View', {
            store: tierspayant, tpl: tpltierps,
            padding: 10,
            itemSelector: 'tr.ayantdroit'
//            selectedClass: 'emplSelected',
//            overClass: 'emplOver'

        });


        var form = new Ext.form.Panel({
            bodyPadding: 15,
            autoScroll: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    padding: 10
                },
                defaults: {
                    flex: 1
                }

            },
            items: [
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'vbox',
                    title: 'Infos.Generales sur l\'Organisme',
                    defaultType: 'container',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'container',
                            layout: {
                                type: 'hbox',
                                flex: 1,
                                align: 'right'
                            },

                            defaultType: 'displayfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Code Organisme',
                                    id: 'CODEORGANISME',
                                    align: 'right',
//                                    width: 100,
                                    fieldStyle: "color:blue;font-weight:300;"
//                                  
                                },
                                {
                                    fieldLabel: 'Libellé Organisme',
                                    align: 'right',
//                                    width: 110,
                                    id: 'FULNAME',
                                    fieldStyle: "color:blue;font-weight:300;"
                                },
                                {
                                    fieldLabel: 'Code Comptable',
                                    align: 'right',
//                                    width: 110,
                                    id: 'CodeComptable',
                                    fieldStyle: "color:blue;font-weight:300;"
                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Adresse',
                                    align: 'right',
                                    id: 'tiersaddresse',
                                    fieldStyle: "color:blue;font-weight:300;"
//                                  
                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Caution',
                                    align: 'right',
                                    id: 'caution',
                                    fieldStyle: "color:blue;font-weight:300;"
//                                  
                                }


                            ]
                        }
                        , {
                            xtype: 'container',
                            layout: {
                                type: 'hbox', flex: 1,
                                align: 'right'
                            },
                            defaultType: 'displayfield',
                            margin: '0 0 5 0',
                            items: [

                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Compte Contribuable',
//                                    labelWidth: 110,
//                                    width: 400,
                                    id: 'COMPTECONT',
                                    fieldStyle: "color:blue;font-weight:300;",
                                    align: 'right'
//                                  
                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Type Organisme',
//                                    labelWidth: 110,
                                    id: 'TYPETIERSPAYANTID',
                                    align: 'right',
                                    fieldStyle: "color:blue;font-weight:300;"

                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Ville',
                                    id: 'VILLE',
                                    fieldStyle: "color:blue;font-weight:300;"

                                },
                                {
                                    fieldLabel: 'Registre de Commerce',
//                                    labelWidth: 140,
                                    xtype: 'displayfield',
                                    align: 'right',
                                    id: 'REGISTRECOM',
                                    fieldStyle: "color:blue;font-weight:300;"
                                }




                            ]
                        }
                        , {
                            xtype: 'container',
                            layout: {
                                type: 'hbox',
                                align: 'right',
                                flex: 1
                            },
                            defaultType: 'displayfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Risque',
                                    id: 'RISQUE',
                                    align: 'right',
                                    flex: 1,
                                    fieldStyle: "color:blue;font-weight:300;"

                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Code Officine',
                                    id: 'CODEOFICINE',
                                    align: 'right',
                                    flex: 1,
                                    fieldStyle: "color:blue;font-weight:300;"

                                },
                                {
                                    fieldLabel: 'Regime Caisse',
                                    xtype: 'displayfield',
                                    id: 'REGIMECAISSE',
                                    align: 'right',
                                    flex: 1,
                                    fieldStyle: "color:blue;font-weight:300;"
                                }

                                , {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Num&eacute;ro  T&eacute;l&eacute;phone ',
                                    align: 'right',
//                                    labelWidth: 110,
//                                    width: 400,
                                    id: 'TEL',
                                    fieldStyle: "color:blue;font-weight:300;"

                                }



                            ]
                        }

                        , {
                            xtype: 'container',
                            layout: {
                                type: 'hbox',
                                flex: 1,
                                align: 'right'
                            },
                            defaultType: 'displayfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    fieldLabel: 'Nombre de clients',
                                    xtype: 'displayfield',
                                    id: 'intNUMBERCLIENT',
                                    align: 'right',
                                    flex: 1,
                                    fieldStyle: "color:blue;font-weight:300;"
                                }
                                ,
                                {
                                    fieldLabel: 'Pafond vente',
                                    xtype: 'displayfield',
                                    id: 'dblPLAFONDCREDIT',
                                    align: 'right',
                                    flex: 1,
                                    fieldStyle: "color:blue;font-weight:300;"
                                },

                                {
                                    fieldLabel: 'Montant par facture',
                                    xtype: 'displayfield',
                                    id: 'montantFact',
                                    align: 'right',
                                    flex: 1,
                                    fieldStyle: "color:blue;font-weight:300;"
                                }, {
                                    fieldLabel: 'Nombre de bons par facture',
                                    xtype: 'displayfield',
                                    flex: 1,
                                    id: 'nbrbons',
                                    align: 'right',
                                    labelWidth: 200,
                                    fieldStyle: "color:blue;font-weight:300;"
                                }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'hbox',
                    title: 'Informations Compl&eacute;mentaires',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'panel',
                            title: 'Liste des Clients',
                            width: '60%',
                            margin: '0 5 0 0',
                            layout: 'fit',

                            border: true,

                            items: [
                                {xtype: 'grid',
                                    id: 'gridTiers',
                                    store: ayantdroits,
                                    columns: [
                                        {
                                            header: 'Id',
                                            flex: 0.3,
                                            xtype: "rownumberer"

                                        },
                                        {
                                            text: 'Code Interne',
                                            flex: 0.6,
                                            dataIndex: 'str_CODE_INTERNE'

                                        }
                                        ,
                                        {
                                            text: 'N° S&eacute;curit&eacute;',
                                            flex: 1,
                                            dataIndex: 'str_NUMERO_SECURITE_SOCIAL'
                                        },
                                        {
                                            text: 'Nom&Pr&eacute;nom(s)',
                                            flex: 2,
                                            dataIndex: 'str_FIRST_LAST_NAME'
                                        }, {
                                            text: 'Date de naissance',
                                            flex: 1,
                                            dataIndex: 'dt_NAISSANCE'
                                        },
                                        {
                                            text: 'Sexe',
                                            flex: 0.3,
                                            dataIndex: 'str_SEXE'
                                        }




                                    ], dockedItems: [{
                                            dock: 'bottom',
                                            xtype: 'pagingtoolbar',
                                            store: ayantdroits,
                                            displayInfo: true,
                                            displayMsg: 'Données affichées {0} - {1} sur {2}',
                                            emptyMsg: "Pas de donnée à afficher"
                                        }


                                    ]


                                }



                            ],
                            dockedItems: [{
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    items: [
                                        {xtype: 'textfield',
                                            fieldLabel: 'Recherche',
                                            labelWidth: 70,
                                            id: 'search_sug',
                                            flex: 1.3,
                                            enableKeyEvents: true,
                                            listeners: {
                                                keyup: function () {
                                                    var tiresStore = Ext.getCmp('gridTiers').getStore();
                                                    var value = this.getValue();
                                                    if (value.length > 0) {

                                                        tiresStore.load({
                                                            params: {
                                                                query: this.getValue()
                                                            }
                                                        });

                                                    } else {
                                                        tiresStore.load({
                                                            params: {
                                                                lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID
                                                            }
                                                        });

                                                    }
                                                }


                                            }

                                        }


                                    ]
                                }

                            ]

                        },
                        {
                            xtype: 'panel',
                            title: 'Chiffre d\'Affaires réalisé sur l\'Organisme',
                            width: '40%',
                            frame: true,
                            border: false,
                            items: [myDataviewTierspayants],
                            dockedItems: [{
                                    xtype: 'toolbar',
                                    dock: 'top',
                                    items: [
                                        {
                                            xtype: 'datefield',
                                            format: 'd/m/Y',
                                            emptyText: 'Date debut',
                                            submitFormat: 'Y-m-d',
                                            fieldLabel: 'Du',
                                            labelWidth: 20,
                                            flex: 0.7,
                                            id: 'dt_start_tiers',
                                            listeners: {
                                                change: function () {
                                                    Ext.getCmp('dt_end_tiers').setMinValue(this.getValue());
                                                }
                                            }

                                        }, {
                                            xtype: 'tbseparator'
                                        }
                                        ,
                                        {
                                            xtype: 'datefield',
                                            format: 'd/m/Y',
                                            emptyText: 'Date debut',
                                            submitFormat: 'Y-m-d',
                                            fieldLabel: 'Au',
                                            labelWidth: 20,
                                            flex: 0.7,
                                            id: 'dt_end_tiers',
                                            listeners: {
                                                change: function () {

                                                    Ext.getCmp('dt_start_tiers').setMaxValue(this.getValue());
                                                }
                                            }

                                        }
                                    ]
                                },
                                {
                                    //  width: 100,
                                    xtype: 'button',
                                    iconCls: 'searchicon',
                                    text: 'Rechercher',
                                    listeners: {
                                        click: function () {

                                            var dt_start_vente = Ext.getCmp('dt_start_tiers').getSubmitValue();
                                            var dt_end_vente = Ext.getCmp('dt_end_tiers').getSubmitValue();


                                            tierspayant.load({
                                                params: {
                                                    dt_start_vente: dt_start_vente,
                                                    dt_end_vente: dt_end_vente,

                                                    lg_TIERS_PAYANT_ID: lg_TIERS_PAYANT_ID
                                                }
                                            });
                                        }
                                    }


                                }


                            ]
                        }


                    ]



                }



            ]


        });
        Ext.getCmp('CODEORGANISME').setValue(this.getOdatasource().str_CODE_ORGANISME);
        Ext.getCmp('FULNAME').setValue(this.getOdatasource().str_FULLNAME);
        Ext.getCmp('tiersaddresse').setValue(this.getOdatasource().str_ADRESSE);
        Ext.getCmp('caution').setValue(this.getOdatasource().caution);
        Ext.getCmp('TEL').setValue(this.getOdatasource().str_TELEPHONE);
        Ext.getCmp('TYPETIERSPAYANTID').setValue(this.getOdatasource().lg_TYPE_TIERS_PAYANT_ID);
        Ext.getCmp('VILLE').setValue(this.getOdatasource().lg_VILLE_ID);
        Ext.getCmp('CodeComptable').setValue(this.getOdatasource().str_CODE_COMPTABLE);
        Ext.getCmp('COMPTECONT').setValue(this.getOdatasource().str_COMPTE_CONTRIBUABLE);
        Ext.getCmp('REGISTRECOM').setValue(this.getOdatasource().str_REGISTRE_COMMERCE);
        Ext.getCmp('CODEOFICINE').setValue(this.getOdatasource().str_CODE_OFFICINE);
        Ext.getCmp('REGIMECAISSE').setValue(this.getOdatasource().lg_REGIMECAISSE_ID);
        Ext.getCmp('RISQUE').setValue(this.getOdatasource().lg_RISQUE_ID);
        Ext.getCmp('dblPLAFONDCREDIT').setValue((this.getOdatasource().dbl_PLAFOND_CREDIT <= 0) ? 'Non défini' : this.getOdatasource().dbl_PLAFOND_CREDIT);
        Ext.getCmp('intNUMBERCLIENT').setValue(this.getOdatasource().int_NUMBER_CLIENT);
        Ext.getCmp('nbrbons').setValue((this.getOdatasource().nbrbons <= 0) ? 'Non défini' : this.getOdatasource().nbrbons);
        Ext.getCmp('montantFact').setValue((this.getOdatasource().montantFact <= 0) ? 'Non défini' : this.getOdatasource().montantFact);
        var win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            width: '90%',
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            modal: true,
            maximizable: true,
            items: form,
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function () {
                    // Ext.getCmp('rechecher').focus();
                }
            }
        });

    }



});