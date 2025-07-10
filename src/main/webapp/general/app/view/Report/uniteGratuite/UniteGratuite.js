/* global Ext */


var Me;
var view_title;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.Report.uniteGratuite.UniteGratuite', {
    extend: 'Ext.grid.Panel',
    xtype: 'ugmanager',
    id: 'ugmanagerID',
    title: 'Unités gratuites',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.UG',
        'testextjs.model.Grossiste'
    ],
    frame: true,
    initComponent: function () {
        var searchstore = Ext.create('testextjs.store.Statistics.Grossistes');
        Me = this;
        var store = Ext.create('testextjs.store.Statistics.UgStore');
        store.on({
            'load': {
                fn: function (store, records, success, eOpts) {
                    Ext.getCmp('TOTALMONTANTUG').setValue(0);

                    Ext.getCmp('QTEUGPERIODE').setValue(0);
                    Ext.getCmp('MONTANTUGPERIODE').setValue(0);

                    Ext.each(records, function (record, index, records) {
                        if (index > 0) {
                            return;
                        }
                        Ext.getCmp('TOTALMONTANTUG').setValue(record.get('TOTALAMONT'));
                        Ext.getCmp('QTEUGPERIODE').setValue(record.get('TOTALQTYINI'));
                        Ext.getCmp('MONTANTUGPERIODE').setValue(record.get('TOTALAMONTINI'));

                    }

                    , this);

                },
                scope: this
            }
        });




        Ext.apply(this, {
            width: '98%',
//            cls: 'custompanel',
            // height:Ext.getBody().getViewSize().height*0.85,
            minHeight: 570,
            maxHeight: 570,
            cls: 'custompanel',
            id: 'Grid_UG_ID',
            features: [
                {
                    ftype: 'groupingsummary',
//                   
                    showSummaryRow: true
                }],

            store: store,
            columns: [{
                    header: 'GROSSISTE',
                    dataIndex: 'GROSSISTE',
                    flex: 1/*,
                     summaryType: "count",
                     summaryRenderer: function (value) {
                     return "<b>Nombre de produits </b><span style='color:blue;font-weight:600;'>" + value + "</span>";
                     
                     }*/

                },
                {
                    header: 'BL',
                    dataIndex: 'BLREF',
                    flex: 1

                }


                , {
                    header: 'CIP',
                    dataIndex: 'CIP',

                    flex: 1
                }
                , {
                    header: 'LIBELLE PRODUIT',
                    dataIndex: 'NAME',
                    flex: 2

                }
                ,
                {
                    header: 'QTE.UG',
                    dataIndex: 'QTYINI',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1/*,
                     summaryType: "sum",
                     summaryRenderer: function (value) {
                     return "<span style='color:blue;font-weight:600;'>" + Ext.util.Format.number(Ext.Number.toFixed(value, 0), '0,000.') + "</span> ";
                     }*/
                }


                /* , {
                 header: 'QTE.DISPO',
                 dataIndex: 'QTY',
                 renderer: amountformat,
                 align: 'right',
                 flex: 1
                 }*/
                , {
                    header: 'PRIX.U',
                    dataIndex: 'PRIXVENTE',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1

                }, {
                    header: 'PRIX.A',
                    dataIndex: 'PRIXACHAT',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1

                }
                , {
                    header: 'MONTANT ACHAT',
                    dataIndex: 'VALEURVENTE',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1/*,
                     summaryType: "sum",
                     summaryRenderer: function (value) {
                     return "<span style='color:blue;font-weight:600;'>" + Ext.util.Format.number(Ext.Number.toFixed(value, 0), '0,000.') + " FCFA</span> ";
                     }*/


                }, {
                    header: 'MONTANT VENTE',
                    dataIndex: 'VALEURQTYINI',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1


                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    xtype: 'textfield',
                    id: 'UG_search',

                    width: 150,
                    emptyText: 'Rech',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {

                                    var UG_search = Ext.getCmp('UG_search').getValue();
                                    var OGrid = Ext.getCmp('Grid_UG_ID'), lgGrossiste = '';

                                    var dt_fin = '', dt_debut = '';
                                    if (Ext.getCmp('lg_GROSSISTE_ID_CB').getValue() != null && Ext.getCmp('lg_GROSSISTE_ID_CB').getValue() != "") {
                                        lgGrossiste = Ext.getCmp('lg_GROSSISTE_ID_CB').getValue();
                                    }

                                    if (Ext.getCmp('datefin').getSubmitValue() != null && Ext.getCmp('datefin').getSubmitValue() != "") {
                                        dt_fin = Ext.getCmp('datefin').getSubmitValue();
                                    }


                                    if (Ext.getCmp('datedebut').getSubmitValue() != null && Ext.getCmp('datedebut').getSubmitValue() != "") {
                                        dt_debut = Ext.getCmp('datedebut').getSubmitValue();
                                    }
                                    OGrid.getStore().load({
                                        params: {
                                            lgGrossiste: lgGrossiste,
                                            dt_end_vente: dt_fin,
                                            dt_start_vente: dt_debut,
                                            search_value: UG_search

                                        }
                                    });



                                }
                            });
                        }
                    }
                }, {
                    xtype: 'combobox',
                   
                    margins: '0 0 0 10',
                    id: 'lg_GROSSISTE_ID_CB',
                   
                    store: searchstore,
                    //disabled: true,
                    valueField: 'lg_GROSSISTE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: false,
                    queryMode: 'remote',
                    pageSize: 999,
                    minChars: 2,
                    flex: 1,
                    enableKeyEvents: true,
                    emptyText: 'Sectionner un Grossiste...',
                    listeners: {
                        keypress: function (field, e) {

                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                if (field.getValue().length <= 2) {
                                    field.getStore().load();
                                }
                                // alert(e.BACKSPACE);
                            }

                        },
                        select: function (cmp) {
                            var value = cmp.getValue();

                            var OGrid = Ext.getCmp('Grid_UG_ID');
                            var dt_fin = '', dt_debut = '';
                            if (Ext.getCmp('datefin').getSubmitValue() !== null && Ext.getCmp('datefin').getSubmitValue() !== "") {
                                dt_fin = Ext.getCmp('datefin').getSubmitValue();
                            }

                            if (Ext.getCmp('datedebut').getSubmitValue() !== null && Ext.getCmp('datedebut').getSubmitValue() !== "") {
                                dt_debut = Ext.getCmp('datedebut').getSubmitValue();
                            }
                            OGrid.getStore().load({
                                params: {
                                    lgGrossiste: this.getValue(),
                                    dt_end_vente: dt_fin,
                                    dt_start_vente: dt_debut,
                                    search_value: Ext.getCmp('UG_search').getValue()

                                }
                            });


                        },

                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {

                            valdatedebut = me.getSubmitValue();
                            Ext.getCmp('datefin').setMinValue(this.getValue());

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
                            Ext.getCmp('datedebut').setMaxValue(this.getValue());

                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechDifClick
                }
                , {
                    text: 'Imprimer',
                    tooltip: 'Imprimer',
                    iconCls: 'importicon',
                    scope: this,

                    handler: this.onPdfClick
                }


            ],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true,
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            dt_start_vente: '',
                            dt_end_vente: '',
                            search_value: '',
                            lgGrossiste: ''
                        };
                        var search_value = Ext.getCmp('UG_search').getValue();


                        myProxy.setExtraParam('dt_start_vente', Ext.getCmp('datedebut').getSubmitValue());
                        myProxy.setExtraParam('dt_end_vente', Ext.getCmp('datefin').getSubmitValue());
                        myProxy.setExtraParam('search_value', search_value);
                        myProxy.setExtraParam('lgGrossiste', Ext.getCmp('lg_GROSSISTE_ID_CB').getValue());

                    }

                },

                items: [
                    {
                        xtype: 'displayfield',
                        fieldLabel: 'QTE.UG',
                        labelWidth: 70,
                        id: 'QTEUGPERIODE',
                        fieldStyle: "color:blue;font-weight:800;",
                        margin: '0 10 0 10',
                        renderer: function (value) {
                            return Ext.util.Format.number(value, '0,000') + " ";
                        }
                    },
                    /* {
                     xtype: 'displayfield',
                     fieldLabel: 'QTE.UG.DISPO',
                     labelWidth: 100,
                     id: 'TOTALQTEUG',
                     fieldStyle: "color:blue;font-weight:800;",
                     margin: '0 10 0 10',
                     renderer: function (value) {
                     return Ext.util.Format.number(value, '0,000') + " ";
                     }
                     },*/
                    {
                        xtype: 'displayfield',
                        fieldLabel: 'MONTANT.UG.ACHAT',
                        labelWidth: 135,
                        id: 'TOTALMONTANTUG',
                        fieldStyle: "color:blue;font-weight:800;",
                        margin: '0 10 0 10',
                        renderer: function (value) {
                            return Ext.util.Format.number(value, '0,000') + " F";
                        }
                    }, {
                        xtype: 'displayfield',
                        fieldLabel: 'MONTANT.UG.VENTE',
                        labelWidth: 150,
                        id: 'MONTANTUGPERIODE',
                        fieldStyle: "color:blue;font-weight:800;",
                        margin: '0 10 0 10',
                        renderer: function (value) {
                            return Ext.util.Format.number(value, '0,000') + " F";
                        }
                    }


                ]
            }


        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },

    onRechDifClick: function () {
        var lg_TIERS_PAYANT_ID = Ext.getCmp('lg_GROSSISTE_ID_CB').getValue();
        if (lg_TIERS_PAYANT_ID == '') {
            Ext.MessageBox.alert('Message ', "Veuillez choisir un Grossiste");
            return;
        }
        var grid = Ext.getCmp('Grid_UG_ID');
        var dt_fin = '', dt_debut = '';
        if (Ext.getCmp('datefin').getSubmitValue() != null && Ext.getCmp('datefin').getSubmitValue() != "") {
            dt_fin = Ext.getCmp('datefin').getSubmitValue();
        }

        if (Ext.getCmp('datedebut').getSubmitValue() != null && Ext.getCmp('datedebut').getSubmitValue() != "") {
            dt_debut = Ext.getCmp('datedebut').getSubmitValue();
        }

        grid.getStore().load({
            params: {
                lgGrossiste: lg_TIERS_PAYANT_ID,
                dt_end_vente: dt_fin,
                dt_start_vente: dt_debut,
                search_value: Ext.getCmp('UG_search').getValue()
            }
        });
    },

    onPdfClick: function () {

        var lg_TIERS_PAYANT_ID = Ext.getCmp('lg_GROSSISTE_ID_CB').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue()
                ;
        if (lg_TIERS_PAYANT_ID === null) {
            lg_TIERS_PAYANT_ID = '';
        }
        var linkUrl = "../webservices/Report/uniteGratuite/ws_generate_pdf.jsp" + "?lgGrossiste=" + lg_TIERS_PAYANT_ID + "&dt_start_vente=" + dt_debut + "&dt_end_vente=" + dt_fin;
        window.open(linkUrl);



    }
});